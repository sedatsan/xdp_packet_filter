# XDP Packet Filter

> **Project Summary:**  
> An eBPF/XDP firewall demonstrating kernel-level packet inspection in restricted C. It drops malicious IPv4 traffic at the network driver level (before the TCP/IP stack) based on an eBPF Hash Map. It includes a `libbpf` userspace loader that exposes a Unix Domain Socket to dynamically inject IPs into the blocklist, bypassing traditional iptables overhead.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Getting Started](#getting-started)
3. [Usage](#usage)

## System Architecture

```mermaid
graph TD
    A((Incoming Packet)) --> B[Network Driver]
    B --> C{XDP eBPF Program}
    C -->|Blocked IP| D[XDP_DROP]
    C -->|Allowed IP| E[XDP_PASS]
    E --> F[Linux Network Stack]
    G((Userspace Loader)) -->|libbpf map updates| C
```

## Getting Started

### Prerequisites
- Clang (for compiling BPF object)
- `libbpf-dev` and `libelf-dev`
- CMake >= 3.14

### Build Instructions
```bash
mkdir build && cd build
cmake ..
cmake --build .
```

## Usage
Attach the XDP firewall to an interface (requires root):
```bash
sudo ./xdp_loader eth0
```
Then issue commands via the Unix socket (`/tmp/xdp_firewall.sock`) to dynamically block IPs.
