import { lstatSync, readdirSync, statSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { SERVERS } from "./registry"

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "out", "vendor", "target"])
const DEFAULT_WORKSPACE_MARKERS = [".git", "package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle"]

export function workspaceRootMarkersForLookupKey(key: string): string[] {
  return Object.values(SERVERS)
    .filter((server) => server.exts.includes(key))
    .flatMap((server) => server.markers ?? [])
}

export function findWorkspaceRoot(from: string, preferredMarkers: string[] = []): string {
  let dir = from
  try {
    const entry = statSync(from, { throwIfNoEntry: false })
    if (entry?.isFile()) dir = dirname(from)
  } catch {}

  const startDir = dir
  const markerExists = (current: string, marker: string): boolean => {
    if (!marker.includes("*")) {
      try {
        const stat = statSync(join(current, marker))
        return stat.isFile() || stat.isDirectory()
      } catch {
        return false
      }
    }

    try {
      const suffix = marker.replace("*", "")
      return readdirSync(current).some((entry) => entry.endsWith(suffix))
    } catch {
      return false
    }
  }

  const findMarkerRoot = (markers: string[]): string | null => {
    let current = startDir
    let previous = ""
    while (current !== previous) {
      for (const marker of markers) {
        if (markerExists(current, marker)) return current
      }
      previous = current
      current = dirname(current)
    }
    return null
  }

  return findMarkerRoot(preferredMarkers) ?? findMarkerRoot(DEFAULT_WORKSPACE_MARKERS) ?? startDir
}

export function findFilesByExts(dir: string, exts: Iterable<string>, maxFiles = 500): string[] {
  const results: string[] = []
  const extSet = new Set(exts)

  const walk = (current: string): void => {
    if (results.length >= maxFiles) return
    let entries: string[] = []
    try {
      entries = readdirSync(current)
    } catch {
      return
    }

    for (const entry of entries) {
      if (results.length >= maxFiles || SKIP_DIRS.has(entry)) continue
      const full = join(current, entry)
      let stat: ReturnType<typeof statSync> | undefined
      try {
        const lst = lstatSync(full, { throwIfNoEntry: false })
        if (!lst) continue
        if (lst.isSymbolicLink()) {
          stat = statSync(full, { throwIfNoEntry: false })
          if (!stat || stat.isDirectory()) continue
        } else {
          stat = lst
        }
      } catch {
        continue
      }

      if (stat.isDirectory()) {
        walk(full)
        continue
      }

      const lowerPath = full.toLowerCase()
      const name = basename(lowerPath)
      const matches = [...extSet].some((ext) => lowerPath.endsWith(ext) || (ext === ".dockerfile" && ["dockerfile", "containerfile"].includes(name)))
      if (matches) results.push(full)
    }
  }

  walk(dir)
  return results
}
