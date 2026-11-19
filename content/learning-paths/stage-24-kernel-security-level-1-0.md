# Stage 24: Kernel Security Level 1.0 — Hardcoded Secret Recovery

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Kernel Exploitation |
| **Level** | 1.0 |
| **Estimated Time** | — |
| **Category** | Kernel Exploitation / Static Analysis |
| **Platform** | Linux x86-64 |
| **Binary** | `/challenge/babykernel_level1.0.ko` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/babykernel_level1.0.ko` is a Linux kernel module, not a userspace ELF binary. It registers a
pseudo-device that exposes a custom file interface at `/proc/pwncollege`, supports read and write operations,
compares submitted input against an embedded password, and only releases the protected flag through the
device state.

The module lives inside the pwn.college challenge VM. A SUID-style interaction is not needed in the userspace
sense — the module runs in kernel context — but the authentication gate is still enforced by module logic.

| Attribute | Details |
|-----------|---------|
| Platform | pwn.college |
| Challenge | Kernel Security Level 1.0 |
| Module | `babykernel_level1.0.ko` |
| Operating System | Ubuntu 20.04.6 LTS |
| Kernel | Linux 5.4.0 |
| Architecture | x86_64 |
| Primary vulnerability | Embedded secret in read-only data |
| Primary technique | Static ELF analysis of a kernel module |

## Initial Reconnaissance

The module file was located at:

```bash
/challenge/babykernel_level1.0.ko
```

Since `.ko` files are Linux kernel modules, they cannot be executed like normal userspace binaries. The module
had to be analyzed with ELF tools instead of direct execution.

The challenge VM was started and connected to:

```bash
vm start
vm connect
```

Available kernel symbols were inspected:

```bash
cat /proc/kallsyms | grep -i challenge
```

Important functions identified:

```text
device_open
device_write
device_read
device_release
init_module
cleanup_module
```

These functions revealed the module's basic structure and authentication workflow.

### Inspecting embedded strings

```bash
strings -a /challenge/babykernel_level1.0.ko
```

Relevant strings included:

```text
device_state
device_read
device_write
_copy_from_user
_copy_to_user
strncmp
filp_open
kernel_read
/flag
```

### Extracting the password

The read-only string section was inspected with readelf:

```bash
readelf -p .rodata.str1.1 /challenge/babykernel_level1.0.ko
```

Relevant output:

```text
gkklnaumhysmwksq
invalid password
password:
device error: unknown state
/flag
```

The embedded password was:

```text
gkklnaumhysmwksq
```

This eliminated the need for password guessing or brute force.

## Static Analysis

The module strings confirmed the presence of an authentication state, a `/flag` target, and the comparison
helpers used by the device write path.

### Reverse engineering `device_write`

The function was disassembled with:

```bash
objdump -dr -M intel --disassemble=device_write /challenge/babykernel_level1.0.ko
```

The interesting instructions were:

```asm title="device-write-disasm.asm" keys="6,8,11,12,13"
cmp    r12,0x10
mov    edx,0x10
mov    rsi,rbp
cmovbe rdx,r12
mov    rdi,rsp
call   _copy_from_user

mov    edx,0x10
call   strncmp

test   eax,eax
sete   al
inc    eax

mov    BYTE PTR [rip+0x0],al
```

#### Key instructions

- `cmp r12, 0x10` — the module limits the submitted input length to 16 bytes.
- `cmovbe rdx, r12` — the smaller of the submitted count and 16 is used as the copy length.
- `call _copy_from_user` — the userspace buffer is copied into kernel memory.
- `call strncmp` — the copied bytes are compared against the embedded password.
- `test eax, eax` / `sete al` / `inc eax` — a successful comparison produces the value that the module stores.

#### Reading the state transition

The instructions `sete` and `inc` indicate that a successful comparison sets the stored state to `2`, while an
unsuccessful comparison sets it to `1`.

The state byte written through the module is therefore the authentication outcome:

| Comparison result | State stored | Meaning |
|---|---|---|
| `strncmp(...) == 0` | `2` | Authenticated / unlocked |
| `strncmp(...) != 0` | `1` | Rejected / locked |

```c title="babykernel-level1.0-state.c" keys="11,19,21,22"
/* Conceptual reconstruction of device_write — the original module source
 * was not captured for this run; this mirrors the disassembly. */
#define STATE_UNKNOWN  0
#define STATE_LOCKED    1
#define STATE_UNLOCKED 2

int device_write(struct file *file, const char __user *buf,
                 size_t count, struct file *file_data)
{
    char password[16];
    int copied = min(count, sizeof(password) - 1);

    if (_copy_from_user(password, buf, copied) != copied) {
        return -EINVAL;
    }

    password[copied] = '\0';

    device_state = (strncmp(password, DEVICE_PASSWORD, sizeof(password)) == 0)
        ? STATE_UNLOCKED
        : STATE_LOCKED;

    return 0;
}
```

## Exploitation

The first attempt to access `/proc/pwncollege` from the host environment failed because the interface existed
inside the challenge VM, not the host filesystem.

After connecting to the VM, the recovered password was submitted:

```bash
vm connect
```

Inside the VM:

```bash
printf 'gkklnaumhysmwksq' > /proc/pwncollege
```

Then the protected flag was read through the device interface:

```bash
dd if=/proc/pwncollege bs=256 count=1 status=none
```

## Successful Result

The device returned the flag, and the module accepted the submitted password.

The published page redacts the live flag value:

```text
pwn.college{...}
```

**Flag:**

```text
pwn.college{...}
```

The success message confirms that the module transitioned its internal state and released the protected
resource through the `/proc/pwncollege` interface.

## Root Cause and Security Analysis

The challenge demonstrated how sensitive authentication information can be exposed through static analysis of a
compiled kernel module.

The password was embedded directly in the module's read-only data section. An attacker with access to the module
binary could recover it without interacting with the authentication mechanism repeatedly.

Important security observations:

- Hardcoded secrets in compiled binaries are recoverable.
- Kernel modules can be reverse-engineered using standard ELF analysis tools.
- `strings` and `readelf` can reveal sensitive embedded data.
- Disassembly can expose authentication logic and internal state transitions.
- Kernel interfaces must carefully validate and handle userspace input.

## Tools Used

- `strings`
- `readelf`
- `objdump`
- `/proc/kallsyms`
- Linux VM environment
- Shell utilities: `printf`, `dd`

## Key Takeaways

1. Linux kernel modules are ELF relocatable objects, not ordinary executable programs.
2. Kernel module symbols can reveal internal implementation details.
3. Static analysis can recover embedded authentication secrets.
4. Disassembly helps reconstruct authentication logic and state transitions.
5. `/proc` interfaces can expose custom kernel functionality to userspace.

## Conclusion

Successfully completed pwn.college Kernel Security Level 1.0 by reverse-engineering the provided kernel module.

The password was recovered from the `.rodata.str1.1` section using `readelf`. I then analyzed `device_write` to
understand its 16-byte comparison logic and state transition.

The module accepted the password and returned the challenge flag.

**Challenge completed successfully.**
