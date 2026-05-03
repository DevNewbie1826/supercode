/**
 * T0 — Skill directory / filesystem inventory tests
 *
 * Asserts:
 *   - Old skill directory is absent after T3
 *   - New skill directory is present after T3
 *   - No active registration, export, or generated index references the old skill name
 *
 * Expected RED until T3 completes.
 */

import { describe, expect, it } from "bun:test"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = join(import.meta.dir, "..", "..")
const srcRoot = join(repoRoot, "src")
const skillsDir = join(srcRoot, "skills")

const OLD_SKILL_DIR = join(skillsDir, "orchestrator-mediated-research")
const NEW_SKILL_DIR = join(skillsDir, "research-delegation")

function readRequiredInventoryFile(path: string): string {
  expect(existsSync(path), `known inventory file is missing: ${path}`).toBe(true)
  return readFileSync(path, "utf-8")
}

describe("Skill directory inventory", () => {
  it("old skill directory 'orchestrator-mediated-research' does NOT exist", () => {
    expect(
      existsSync(OLD_SKILL_DIR),
      `old skill directory still exists: ${OLD_SKILL_DIR}`,
    ).toBe(false)
  })

  it("new skill directory 'research-delegation' exists", () => {
    expect(
      existsSync(NEW_SKILL_DIR),
      `new skill directory missing: ${NEW_SKILL_DIR}`,
    ).toBe(true)
  })

  it("new skill SKILL.md exists inside research-delegation/", () => {
    const skillMd = join(NEW_SKILL_DIR, "SKILL.md")
    expect(existsSync(skillMd), `${skillMd} should exist`).toBe(true)
  })

  it("old skill SKILL.md does NOT exist", () => {
    const skillMd = join(OLD_SKILL_DIR, "SKILL.md")
    expect(existsSync(skillMd), `${skillMd} should not exist`).toBe(false)
  })
})

describe("Active skill list: no old skill, has new skill", () => {
  it("skills directory listing does not contain 'orchestrator-mediated-research'", () => {
    const entries = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    expect(
      entries,
      "skills directory still contains old skill",
    ).not.toContain("orchestrator-mediated-research")
  })

  it("skills directory listing contains 'research-delegation'", () => {
    const entries = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    expect(
      entries,
      "skills directory missing new skill",
    ).toContain("research-delegation")
  })
})

describe("Skill bootstrap content: skill list accuracy", () => {
  const bootstrapPath = join(
    srcRoot,
    "hooks",
    "skill-bootstrap",
    "skill-bootstrap.md",
  )

  it("skill-bootstrap.md does not list 'orchestrator-mediated-research' as a shared utility skill", () => {
    const content = readRequiredInventoryFile(bootstrapPath)
    expect(
      content,
      "skill-bootstrap.md still references old skill",
    ).not.toContain("orchestrator-mediated-research")
  })

  it("skill-bootstrap.md lists 'research-delegation' as a shared utility skill", () => {
    const content = readRequiredInventoryFile(bootstrapPath)
    expect(
      content,
      "skill-bootstrap.md missing new skill reference",
    ).toContain("research-delegation")
  })
})
