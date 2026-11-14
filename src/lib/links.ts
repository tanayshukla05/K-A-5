/**
 * Links directory for the LINKS page.
 *
 * To add a link, append one entry to the array below — the page, its
 * numbering, and the count update automatically:
 *
 *   { label: 'My Website', url: 'https://example.com', note: 'optional note' }
 *
 * `note` is optional. Rows are numbered in array order (LINK 01, 02, …).
 * Every row opens in a new tab.
 */

export type ArchiveLink = {
  label: string
  url: string
  note?: string
  /** Which artifact material this row is rendered as — see .artifact--* in globals.css. */
  variant?: 'seal' | 'stencil' | 'terminal' | 'tactical'
}

export const LINKS: ArchiveLink[] = [
  {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/tanay-shukla-23198a334/',
    note: 'Pandit Tanay Shukla Ji Maharaj',
    variant: 'seal',
  },
  {
    label: 'Play IGI',
    url: 'https://playigi.com/',
    note: 'Project I.G.I. in the browser',
    variant: 'stencil',
  },
  {
    label: 'GitHub',
    url: 'https://github.com/tanayshukla05',
    note: 'tanayshukla05',
    variant: 'terminal',
  },
  {
    label: 'RCWS v5',
    url: 'https://github.com/wildcard1719/RCWS_v5',
    note: '3D-printed remote weapon system — STEP files + design handbook',
    variant: 'tactical',
  },
]
