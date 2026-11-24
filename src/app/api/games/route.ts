import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import artworkByRom from '@/lib/rom-artwork.json'

export const dynamic = 'force-dynamic'

const ROM_DIRECTORY = path.join(process.cwd(), 'public', 'roms')

function displaySize(bytes: number) {
  const megabytes = bytes / (1024 * 1024)
  return `${megabytes < 1 ? megabytes * 1024 : megabytes < 10 ? megabytes.toFixed(2) : Math.round(megabytes)} ${megabytes < 1 ? 'KB' : 'MB'}`
}

export async function GET() {
  const files = await readdir(ROM_DIRECTORY, { withFileTypes: true })
  const games = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.toLowerCase().endsWith('.sfc'))
      .map(async (file) => {
        const filePath = path.join(ROM_DIRECTORY, file.name)
        const fileStats = await stat(filePath)
        const title = path.basename(file.name, path.extname(file.name))

        return {
          id: file.name,
          title,
          file: `/roms/${encodeURIComponent(file.name)}`,
          size: displaySize(fileStats.size),
          artwork: artworkByRom[file.name as keyof typeof artworkByRom] ?? null,
        }
      }),
  )

  games.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  return Response.json(games, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
