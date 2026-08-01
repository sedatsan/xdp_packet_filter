#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/in.h>

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, __be32);
    __type(value, __u32);
} blocklist_map SEC(".maps");

SEC("xdp")
int firewall_prog(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;
    struct ethhdr *eth = data;

    // Boundary check for Ethernet header
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    // Check if it's an IP packet
    if (eth->h_proto != __constant_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *ip = data + sizeof(*eth);

    // Boundary check for IP header
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    // Lookup the source IP in the blocklist map
    __u32 *blocked = bpf_map_lookup_elem(&blocklist_map, &ip->saddr);
    if (blocked) {
        return XDP_DROP;
    }

    return XDP_PASS;
}

char LICENSE[] SEC("license") = "GPL";
