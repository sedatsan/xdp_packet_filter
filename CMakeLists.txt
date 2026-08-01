cmake_minimum_required(VERSION 3.14)
project(xdp_packet_filter VERSION 1.0.0 LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

add_compile_options(-Wall -Wextra -Wpedantic -Werror)

find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBBPF REQUIRED libbpf)
pkg_check_modules(LIBELF REQUIRED libelf)

# BPF program (compiled with clang)
find_program(CLANG_EXE clang REQUIRED)
add_custom_command(
    OUTPUT xdp_firewall.bpf.o
    COMMAND ${CLANG_EXE} -target bpf -O2 -g -c ${CMAKE_CURRENT_SOURCE_DIR}/src/xdp_firewall.bpf.c -o ${CMAKE_CURRENT_BINARY_DIR}/xdp_firewall.bpf.o
    DEPENDS src/xdp_firewall.bpf.c
    COMMENT "Compiling BPF program"
)
add_custom_target(bpf_prog ALL DEPENDS xdp_firewall.bpf.o)

# Loader program
add_executable(xdp_loader src/loader.c)
target_include_directories(xdp_loader PRIVATE ${LIBBPF_INCLUDE_DIRS} ${LIBELF_INCLUDE_DIRS})
target_link_options(xdp_loader PRIVATE ${LIBBPF_LDFLAGS} ${LIBELF_LDFLAGS})
target_link_libraries(xdp_loader PRIVATE ${LIBBPF_LIBRARIES} ${LIBELF_LIBRARIES})
add_dependencies(xdp_loader bpf_prog)
