CLANG = clang
CC = gcc
ARCH_INCLUDES = -I/usr/include/$(shell gcc -print-multiarch)
LIBS = -lbpf -lelf

all: xdp_firewall.bpf.o loader

%.bpf.o: %.bpf.c
	$(CLANG) -target bpf $(ARCH_INCLUDES) -O2 -g -c $< -o $@

loader: loader.c
	$(CC) -O2 -g $< -o $@ $(LIBS)

clean:
	rm -f *.o loader

