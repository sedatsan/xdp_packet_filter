#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <net/if.h>
#include <linux/if_link.h>
#include <bpf/libbpf.h>
#include <bpf/bpf.h>

#define SOCKET_PATH "/tmp/xdp_firewall.sock"
#define DEFAULT_IFNAME "lo"

static int libbpf_print_fn(enum libbpf_print_level level, const char *format, va_list args)
{
    return vfprintf(stderr, format, args);
}

void handle_client(int client_fd, int map_fd)
{
    char buffer[256];
    ssize_t n = read(client_fd, buffer, sizeof(buffer) - 1);
    if (n <= 0) return;
    buffer[n] = '\0';

    char cmd[16], ip_str[64];
    if (sscanf(buffer, "%15s %63s", cmd, ip_str) != 2) {
        const char *err = "Invalid command format. Use: BLOCK|UNBLOCK <IP>\n";
        write(client_fd, err, strlen(err));
        return;
    }

    struct in_addr addr;
    if (inet_pton(AF_INET, ip_str, &addr) != 1) {
        const char *err = "Invalid IP address.\n";
        write(client_fd, err, strlen(err));
        return;
    }

    __be32 key = addr.s_addr;
    __u32 value = 1;

    if (strcmp(cmd, "BLOCK") == 0) {
        if (bpf_map_update_elem(map_fd, &key, &value, BPF_ANY) != 0) {
            char err[128];
            snprintf(err, sizeof(err), "Failed to update map: %s\n", strerror(errno));
            write(client_fd, err, strlen(err));
        } else {
            const char *ok = "IP blocked.\n";
            write(client_fd, ok, strlen(ok));
            printf("Blocked IP: %s\n", ip_str);
        }
    } else if (strcmp(cmd, "UNBLOCK") == 0) {
        if (bpf_map_delete_elem(map_fd, &key) != 0) {
            char err[128];
            snprintf(err, sizeof(err), "Failed to delete from map: %s\n", strerror(errno));
            write(client_fd, err, strlen(err));
        } else {
            const char *ok = "IP unblocked.\n";
            write(client_fd, ok, strlen(ok));
            printf("Unblocked IP: %s\n", ip_str);
        }
    } else {
        const char *err = "Unknown command. Use: BLOCK or UNBLOCK.\n";
        write(client_fd, err, strlen(err));
    }
}

int main(int argc, char **argv)
{
    struct bpf_object *obj;
    int prog_fd, map_fd;
    const char *ifname = DEFAULT_IFNAME;
    unsigned int ifindex;

    if (argc > 1) {
        ifname = argv[1];
    }

    ifindex = if_nametoindex(ifname);
    if (ifindex == 0) {
        fprintf(stderr, "Failed to get ifindex for %s: %s\n", ifname, strerror(errno));
        return 1;
    }

    libbpf_set_print(libbpf_print_fn);

    obj = bpf_object__open_file("xdp_firewall.bpf.o", NULL);
    if (libbpf_get_error(obj)) {
        fprintf(stderr, "Failed to open BPF object\n");
        return 1;
    }

    if (bpf_object__load(obj)) {
        fprintf(stderr, "Failed to load BPF object\n");
        return 1;
    }

    struct bpf_program *prog = bpf_object__find_program_by_name(obj, "firewall_prog");
    if (!prog) {
        fprintf(stderr, "Failed to find program 'firewall_prog'\n");
        return 1;
    }

    prog_fd = bpf_program__fd(prog);
    if (prog_fd < 0) {
        fprintf(stderr, "Failed to get program FD\n");
        return 1;
    }

    map_fd = bpf_object__find_map_fd_by_name(obj, "blocklist_map");
    if (map_fd < 0) {
        fprintf(stderr, "Failed to find map 'blocklist_map'\n");
        return 1;
    }

    // Attach XDP program
    if (bpf_xdp_attach(ifindex, prog_fd, XDP_FLAGS_SKB_MODE, NULL) < 0) {
        fprintf(stderr, "Failed to attach XDP program to %s\n", ifname);
        return 1;
    }

    printf("XDP program attached to %s (index %u)\n", ifname, ifindex);

    // Setup Unix Domain Socket
    int server_fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return 1;
    }

    struct sockaddr_un sa;
    memset(&sa, 0, sizeof(sa));
    sa.sun_family = AF_UNIX;
    strncpy(sa.sun_path, SOCKET_PATH, sizeof(sa.sun_path) - 1);
    unlink(SOCKET_PATH);

    if (bind(server_fd, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
        perror("bind");
        return 1;
    }

    if (listen(server_fd, 5) < 0) {
        perror("listen");
        return 1;
    }

    printf("Listening on %s...\n", SOCKET_PATH);

    while (1) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd < 0) {
            perror("accept");
            continue;
        }
        handle_client(client_fd, map_fd);
        close(client_fd);
    }

    // Cleanup (not reached in this simple example)
    bpf_xdp_detach(ifindex, XDP_FLAGS_SKB_MODE, NULL);
    return 0;
}
