/**
 * Entry grouping — distinguishes CTF walkthrough entries (the pwn.college
 * binary-exploitation, race-condition, and kernel-exploitation series) from
 * the learning-path stages.
 *
 * CTF entries carry a CTF category in their metadata table; learning-path
 * stages do not. This module is imported by both the server content loader
 * (for stable ordering) and client pages (for menu filtering), so it must
 * stay free of server-only imports.
 */

import type { ArchiveEntry } from '@/lib/types'

export function isCtfEntry(e: Pick<ArchiveEntry, 'category'>): boolean {
  return /binary exploitation|race condition|kernel exploitation/i.test(e.category)
}

/**
 * Sub-menus inside the pwn.college tab. The first segment of each entry's
 * Category row selects the topic, so a new race-condition writeup only needs
 * "Race Condition" in its metadata table to appear under the right sub-tab.
 */
export type CtfTopic = 'binary-exploitation' | 'race-condition' | 'kernel-exploitation'

export function ctfTopicOf(e: Pick<ArchiveEntry, 'category'>): CtfTopic {
  const c = e.category.toLowerCase()
  if (/kernel exploitation/.test(c)) return 'kernel-exploitation'
  if (/race condition/.test(c)) return 'race-condition'
  return 'binary-exploitation'
}

/**
 * CTF source tabs — the CTF Walkthroughs menu splits its entries by
 * origin. The origin is read from the entry's Module Name metadata row
 * (e.g. "Pwn.College — Binary Exploitation" vs "HackTheBox — <box>"),
 * the same field that already documents where a challenge came from.
 * Everything currently published is pwn.college, so unmatched module
 * names default there; publishing a HackTheBox writeup just needs
 * "HackTheBox" in its Module Name row.
 */
export type CtfSource = 'pwn-college' | 'hackthebox'

export function ctfSourceOf(e: Pick<ArchiveEntry, 'moduleName'>): CtfSource {
  const m = e.moduleName.toLowerCase()
  if (m.includes('hackthebox') || m.includes('hack the box')) return 'hackthebox'
  return 'pwn-college'
}
