/**
 * Entry grouping — distinguishes CTF walkthrough entries (the pwn.college
 * binary-exploitation series) from the learning-path stages.
 *
 * CTF entries carry the "Binary Exploitation" category in their metadata
 * table; learning-path stages do not. This module is imported by both the
 * server content loader (for stable ordering) and client pages (for menu
 * filtering), so it must stay free of server-only imports.
 */

import type { ArchiveEntry } from '@/lib/types'

export function isCtfEntry(e: Pick<ArchiveEntry, 'category'>): boolean {
  return /binary exploitation/i.test(e.category)
}
