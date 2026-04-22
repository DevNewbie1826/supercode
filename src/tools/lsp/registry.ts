import { existsSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import type { LspServerDef } from "./types"

export const SERVERS: Record<string, LspServerDef> = {
  typescript: {
    id: "typescript",
    cmd: ["typescript-language-server", "--stdio"],
    exts: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
    hint: "npm install -g typescript-language-server typescript",
    markers: ["tsconfig.json", "jsconfig.json", "package.json"],
    priority: 40,
  },
  deno: {
    id: "deno",
    cmd: ["deno", "lsp"],
    exts: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    hint: "Install Deno from https://deno.land",
    markers: ["deno.json", "deno.jsonc"],
    priority: 60,
  },
  vue: { id: "vue", cmd: ["vue-language-server", "--stdio"], exts: [".vue"], hint: "npm install -g @vue/language-server", markers: ["package.json"], priority: 40 },
  gopls: { id: "gopls", cmd: ["gopls"], exts: [".go"], hint: "go install golang.org/x/tools/gopls@latest", markers: ["go.mod"], priority: 50 },
  rust: { id: "rust", cmd: ["rust-analyzer"], exts: [".rs"], hint: "rustup component add rust-analyzer", markers: ["Cargo.toml"], priority: 50 },
  basedpyright: { id: "basedpyright", cmd: ["basedpyright-langserver", "--stdio"], exts: [".py", ".pyi"], hint: "pip install basedpyright", markers: ["pyproject.toml", "requirements.txt"], priority: 40 },
  pyright: { id: "pyright", cmd: ["pyright-langserver", "--stdio"], exts: [".py", ".pyi"], hint: "pip install pyright", markers: ["pyproject.toml", "requirements.txt"], priority: 30 },
  ruff: { id: "ruff", cmd: ["ruff", "server"], exts: [".py", ".pyi"], hint: "pip install ruff", markers: ["pyproject.toml"], priority: 10 },
  ruby: { id: "ruby", cmd: ["ruby-lsp"], exts: [".rb", ".rake", ".gemspec", ".ru"], hint: "gem install ruby-lsp", markers: ["Gemfile"], priority: 30 },
  zls: { id: "zls", cmd: ["zls"], exts: [".zig", ".zon"], hint: "See https://github.com/zigtools/zls", markers: ["build.zig", "build.zig.zon"], priority: 40 },
  csharp: { id: "csharp", cmd: ["csharp-ls"], exts: [".cs"], hint: "dotnet tool install -g csharp-ls", markers: ["*.csproj", "*.sln"], priority: 40 },
  fsharp: { id: "fsharp", cmd: ["fsautocomplete"], exts: [".fs", ".fsi", ".fsx", ".fsscript"], hint: "dotnet tool install -g fsautocomplete", markers: ["*.fsproj", "*.sln"], priority: 40 },
  swift: { id: "swift", cmd: ["sourcekit-lsp"], exts: [".swift", ".objc", ".objcpp"], hint: "Included with Xcode or Swift toolchain", markers: ["Package.swift", ".xcodeproj"], priority: 40 },
  clangd: { id: "clangd", cmd: ["clangd", "--background-index"], exts: [".c", ".cpp", ".cc", ".cxx", ".h", ".hpp"], hint: "See https://clangd.llvm.org/installation", markers: ["compile_commands.json", "CMakeLists.txt"], priority: 50 },
  svelte: { id: "svelte", cmd: ["svelteserver", "--stdio"], exts: [".svelte"], hint: "npm install -g svelte-language-server", markers: ["package.json", "svelte.config.js"], priority: 40 },
  astro: { id: "astro", cmd: ["astro-ls", "--stdio"], exts: [".astro"], hint: "npm install -g @astrojs/language-server", markers: ["astro.config.mjs", "package.json"], priority: 40 },
  bash: { id: "bash", cmd: ["bash-language-server", "start"], exts: [".sh", ".bash", ".zsh"], hint: "npm install -g bash-language-server", markers: ["package.json"], priority: 20 },
  java: { id: "java", cmd: ["jdtls"], exts: [".java"], hint: "See https://github.com/eclipse-jdtls/eclipse.jdt.ls", markers: ["pom.xml", "build.gradle"], priority: 50 },
  yaml: { id: "yaml", cmd: ["yaml-language-server", "--stdio"], exts: [".yaml", ".yml"], hint: "npm install -g yaml-language-server", markers: ["package.json"], priority: 20 },
  lua: { id: "lua", cmd: ["lua-language-server"], exts: [".lua"], hint: "See https://github.com/LuaLS/lua-language-server", markers: [".luarc.json"], priority: 30 },
  php: { id: "php", cmd: ["intelephense", "--stdio"], exts: [".php"], hint: "npm install -g intelephense", markers: ["composer.json"], priority: 40 },
  dart: { id: "dart", cmd: ["dart", "language-server", "--lsp"], exts: [".dart"], hint: "Included with Dart SDK", markers: ["pubspec.yaml"], priority: 50 },
  terraform: { id: "terraform", cmd: ["terraform-ls", "serve"], exts: [".tf", ".tfvars"], hint: "See https://github.com/hashicorp/terraform-ls", markers: [".terraform"], priority: 40 },
  prisma: { id: "prisma", cmd: ["prisma", "language-server"], exts: [".prisma"], hint: "npm install -g prisma", markers: ["package.json"], priority: 30 },
  ocaml: { id: "ocaml", cmd: ["ocamllsp"], exts: [".ml", ".mli"], hint: "opam install ocaml-lsp-server", markers: ["dune-project", "opam"], priority: 40 },
  tex: { id: "tex", cmd: ["texlab"], exts: [".tex", ".bib"], hint: "See https://github.com/latex-lsp/texlab", markers: ["texlab.toml"], priority: 30 },
  docker: { id: "docker", cmd: ["docker-langserver", "--stdio"], exts: [".dockerfile"], hint: "npm install -g dockerfile-language-server-nodejs", markers: ["Dockerfile", "Containerfile"], priority: 50 },
  gleam: { id: "gleam", cmd: ["gleam", "lsp"], exts: [".gleam"], hint: "See https://gleam.run/getting-started/installing/", markers: ["gleam.toml"], priority: 40 },
  clojure: { id: "clojure", cmd: ["clojure-lsp", "listen"], exts: [".clj", ".cljs", ".cljc", ".edn"], hint: "See https://clojure-lsp.io/installation/", markers: ["deps.edn", "project.clj", "bb.edn"], priority: 50 },
  nix: { id: "nix", cmd: ["nixd"], exts: [".nix"], hint: "nix profile install nixpkgs#nixd", markers: ["flake.nix", "shell.nix"], priority: 40 },
  haskell: { id: "haskell", cmd: ["haskell-language-server-wrapper", "--lsp"], exts: [".hs", ".lhs"], hint: "ghcup install hls", markers: ["stack.yaml", "cabal.project"], priority: 40 },
  biome: { id: "biome", cmd: ["biome", "lsp-proxy", "--stdio"], exts: [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html"], hint: "npm install -g @biomejs/biome", markers: ["biome.json", "biome.jsonc"], priority: 20 },
  elixir: { id: "elixir", cmd: ["elixir-ls"], exts: [".ex", ".exs"], hint: "See https://github.com/elixir-lsp/elixir-ls", markers: ["mix.exs"], priority: 50 },
  kotlin: { id: "kotlin", cmd: ["kotlin-lsp"], exts: [".kt", ".kts"], hint: "See https://github.com/Kotlin/kotlin-lsp", markers: ["settings.gradle.kts", "build.gradle.kts"], priority: 40 },
}

const FILE_NAME_KEYS = new Map<string, string[]>([
  ["dockerfile", [".dockerfile"]],
  ["containerfile", [".dockerfile"]],
])

export function lspLookupKeysForPath(filePath: string): string[] {
  const ext = extname(filePath).toLowerCase()
  if (ext) return [ext]
  return FILE_NAME_KEYS.get(basename(filePath).toLowerCase()) ?? []
}

export function isCommandAvailable(command: string, root?: string): boolean {
  if (root) {
    const localBase = join(root, "node_modules", ".bin", command)
    for (const ext of process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""]) {
      if (existsSync(localBase + ext)) return true
    }
  }

  const separator = process.platform === "win32" ? ";" : ":"
  for (const dir of (process.env.PATH ?? "").split(separator).filter(Boolean)) {
    for (const ext of process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""]) {
      if (existsSync(join(dir, command + ext))) return true
    }
  }

  return false
}

function markerExists(root: string, marker: string): boolean {
  if (!marker.includes("*")) return existsSync(join(root, marker))

  try {
    const suffix = marker.replace("*", "")
    return readdirSync(root).some((entry) => entry.endsWith(suffix))
  } catch {
    return false
  }
}

export function selectServerForFile(
  filePath: string,
  root: string,
  lookupKeys = lspLookupKeysForPath(filePath),
  isAvailable = (command: string) => isCommandAvailable(command, root),
): LspServerDef | null {
  const candidates = Object.values(SERVERS)
    .filter((server) => lookupKeys.some((key) => server.exts.includes(key)))
    .filter((server) => isAvailable(server.cmd[0]))
    .map((server) => {
      let score = server.priority ?? 0
      if (server.markers?.some((marker) => markerExists(root, marker))) score += 100

      const localBase = join(root, "node_modules", ".bin", server.cmd[0])
      if (existsSync(localBase) || existsSync(`${localBase}.cmd`) || existsSync(`${localBase}.exe`)) {
        score += 40
      }

      if (lookupKeys.some((key) => server.exts[0] === key)) score += 20
      return { server, score }
    })
    .sort((left, right) => right.score - left.score || left.server.id.localeCompare(right.server.id))

  return candidates[0]?.server ?? null
}
