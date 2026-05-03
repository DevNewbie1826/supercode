// T0 - Prompt / skill / doc stale-reference QA harness
//
// Inventory categories covered:
//   1. Agent prompts          - src/agents/prompt-text/ (all .md)
//   2. Workflow skills        - src/skills/ (all SKILL.md)
//   3. README docs            - README.md, README.ko.md
//   4. Registration code      - src/hooks/skill-bootstrap/skill-bootstrap.md,
//                                src/hooks/todo-continuation-enforcer/constants.ts
//   5. Tests / fixtures       - none found referencing old skill
//   6. Generated / static indexes - none found
//   7. Package exports        - none found
//
// These tests are expected to FAIL (RED) until T3/T4/T5/T6 complete the migration.
// After migration, every assertion should pass (GREEN).

import { describe, expect, it } from "bun:test"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = join(import.meta.dir, "..", "..")
const srcRoot = join(repoRoot, "src")

function readRequiredText(relPath: string): string {
  const abs = join(repoRoot, relPath)
  expect(existsSync(abs), `required inventory file is missing: ${relPath}`).toBe(true)
  return readFileSync(abs, "utf-8")
}

function promptFiles(): string[] {
  const dir = join(srcRoot, "agents", "prompt-text")
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => `src/agents/prompt-text/${f}`)
}

function skillFiles(): string[] {
  const dir = join(srcRoot, "skills")
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const skillMd = join(dir, d.name, "SKILL.md")
      return existsSync(skillMd) ? `src/skills/${d.name}/SKILL.md` : ""
    })
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Stale-reference patterns
// ---------------------------------------------------------------------------

/** The old skill name that must be removed from all active references. */
const STALE_SKILL = "orchestrator-mediated-research"

/** XML handoff tag that must be removed from active prompts/skills. */
const STALE_HANDOFF = "<needs_research>"

/** The new skill name that must be present where research delegation is referenced. */
const NEW_SKILL = "research-delegation"

// ---------------------------------------------------------------------------
// 1. Agent prompts — stale references
// ---------------------------------------------------------------------------

describe("Agent prompts: stale reference inventory", () => {
  const files = promptFiles()

  it("covers all 14 agent prompt files", () => {
    expect(files.length).toBe(14)
  })

  for (const rel of files) {
    describe(`[${rel}]`, () => {
      it("does NOT contain 'orchestrator-mediated-research' (stale skill name)", () => {
        const content = readRequiredText(rel)
        expect(
          content.toLowerCase(),
          `stale '${STALE_SKILL}' found in ${rel}`,
        ).not.toContain(STALE_SKILL)
      })

      it("does NOT contain '<needs_research>' (stale XML handoff)", () => {
        const content = readRequiredText(rel)
        expect(
          content,
          `stale '${STALE_HANDOFF}' found in ${rel}`,
        ).not.toContain(STALE_HANDOFF)
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Workflow skills — stale references
// ---------------------------------------------------------------------------

describe("Workflow skills: stale reference inventory", () => {
  const files = skillFiles()

  it("discovers at least 11 skill SKILL.md files", () => {
    expect(files.length).toBeGreaterThanOrEqual(11)
  })

  for (const rel of files) {
    describe(`[${rel}]`, () => {
      it("does NOT contain 'orchestrator-mediated-research' (stale skill name)", () => {
        const content = readRequiredText(rel)
        expect(
          content.toLowerCase(),
          `stale '${STALE_SKILL}' found in ${rel}`,
        ).not.toContain(STALE_SKILL)
      })

      it("does NOT contain '<needs_research>' (stale XML handoff)", () => {
        const content = readRequiredText(rel)
        expect(
          content,
          `stale '${STALE_HANDOFF}' found in ${rel}`,
        ).not.toContain(STALE_HANDOFF)
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 3. README docs — stale references
// ---------------------------------------------------------------------------

describe("README docs: stale reference inventory", () => {
  const readmeFiles = ["README.md", "README.ko.md"]

  for (const rel of readmeFiles) {
    describe(`[${rel}]`, () => {
      it("does NOT list 'orchestrator-mediated-research' as a built-in skill", () => {
        const content = readRequiredText(rel)
        expect(
          content,
          `stale '${STALE_SKILL}' found in ${rel}`,
        ).not.toContain(STALE_SKILL)
      })

      it("lists 'research-delegation' as a built-in skill", () => {
        const content = readRequiredText(rel)
        expect(
          content,
          `expected '${NEW_SKILL}' in ${rel} built-in skills`,
        ).toContain(NEW_SKILL)
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 4. Registration code — stale references
// ---------------------------------------------------------------------------

describe("Registration code: stale reference inventory", () => {
  const regFiles = [
    "src/hooks/skill-bootstrap/skill-bootstrap.md",
    "src/hooks/todo-continuation-enforcer/constants.ts",
  ]

  for (const rel of regFiles) {
    describe(`[${rel}]`, () => {
      it("does NOT reference 'orchestrator-mediated-research'", () => {
        const content = readRequiredText(rel)
        expect(
          content.toLowerCase(),
          `stale '${STALE_SKILL}' found in ${rel}`,
        ).not.toContain(STALE_SKILL)
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 5. Tests / fixtures — stale references
// ---------------------------------------------------------------------------

describe("Tests/fixtures: stale reference inventory", () => {
  // T0 harness files (this file and skill-inventory.test.ts) reference the
  // old skill name in assertions that check for its absence. Those are not
  // "active references" — they are migration guards. Exclude them from the
  // scan so this test does not fail on its own harness.
  const harnessFiles = new Set([
    "prompt-research-delegation.test.ts",
    "skill-inventory.test.ts",
  ])

  it("no non-harness test or fixture file under src/__tests__/ references the old skill name", () => {
    const testDir = join(srcRoot, "__tests__")
    const entries = readdirSync(testDir).filter(
      (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !harnessFiles.has(f),
    )
    const staleMatches: string[] = []
    for (const entry of entries) {
      const content = readFileSync(join(testDir, entry), "utf-8").toLowerCase()
      if (content.includes(STALE_SKILL)) {
        staleMatches.push(entry)
      }
    }
    expect(staleMatches, `non-harness test files referencing '${STALE_SKILL}'`).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 6. Generated / static indexes — stale references
// ---------------------------------------------------------------------------

describe("Generated/static indexes: stale reference inventory", () => {
  it("package.json does not reference 'orchestrator-mediated-research'", () => {
    const pkg = readRequiredText("package.json").toLowerCase()
    expect(pkg, "package.json references old skill").not.toContain(STALE_SKILL)
  })

  it("no index.ts export references the old skill by name", () => {
    const index = readRequiredText("src/index.ts").toLowerCase()
    expect(index, "src/index.ts references old skill").not.toContain(STALE_SKILL)
  })
})

// ---------------------------------------------------------------------------
// 7. Package exports — stale references
// ---------------------------------------------------------------------------

describe("Package exports: stale reference inventory", () => {
  it("no TypeScript export under src/ references the old skill directory path", () => {
    // Only src/hooks/todo-continuation-enforcer/constants.ts was found;
    // it is covered in category 4. No other TS files reference it.
    // This test documents that finding.
    const constantsContent = readRequiredText(
      "src/hooks/todo-continuation-enforcer/constants.ts",
    ).toLowerCase()
    // This will fail until constants.ts is updated
    expect(
      constantsContent,
      "constants.ts still references old skill",
    ).not.toContain(STALE_SKILL)
  })
})

// ---------------------------------------------------------------------------
// Cross-cutting: new skill presence
// ---------------------------------------------------------------------------

describe("New skill 'research-delegation' presence", () => {
  it("src/skills/research-delegation/SKILL.md exists", () => {
    const path = join(srcRoot, "skills", "research-delegation", "SKILL.md")
    expect(existsSync(path), `${path} should exist`).toBe(true)
  })

  it("research-delegation SKILL.md covers essential delegation concepts", () => {
    const path = join(srcRoot, "skills", "research-delegation", "SKILL.md")
    if (!existsSync(path)) {
      // Will fail — file doesn't exist yet
      expect.unreachable("research-delegation SKILL.md does not exist yet")
    }
    const content = readFileSync(path, "utf-8").toLowerCase()
    const requiredConcepts = [
      "explorer",
      "librarian",
      "budget",
      "stop",
      "evidence",
      "output",
      "recursive",
      "delegation",
    ]
    for (const concept of requiredConcepts) {
      expect(
        content,
        `research-delegation SKILL.md missing concept '${concept}'`,
      ).toContain(concept)
    }
  })
})

// ---------------------------------------------------------------------------
// Cross-cutting guardrails: product completeness and fresh evidence
// ---------------------------------------------------------------------------

describe("Cross-cutting prompt guardrails", () => {
  const productCompletenessPromptFiles = [
    "src/agents/prompt-text/planner-prompt.md",
    "src/agents/prompt-text/plan-checker-prompt.md",
    "src/agents/prompt-text/spec-reviewer-prompt.md",
    "src/agents/prompt-text/executor-prompt.md",
    "src/agents/prompt-text/code-quality-reviewer-prompt.md",
  ]

  const freshSessionPromptFiles = [
    "src/agents/prompt-text/spec-reviewer-prompt.md",
    "src/agents/prompt-text/plan-checker-prompt.md",
    "src/agents/prompt-text/plan-challenger-prompt.md",
    "src/agents/prompt-text/task-compliance-checker-prompt.md",
    "src/agents/prompt-text/code-spec-reviewer-prompt.md",
    "src/agents/prompt-text/code-quality-reviewer-prompt.md",
    "src/agents/prompt-text/completion-verifier-prompt.md",
    "src/agents/prompt-text/final-reviewer-prompt.md",
  ]

  it("keeps product-completeness checks conditional on user-facing/product work", () => {
    for (const rel of productCompletenessPromptFiles) {
      const content = readRequiredText(rel).toLowerCase()
      expect(content, `${rel} missing product-completeness guardrail`).toContain(
        "product-completeness",
      )
      expect(
        content,
        `${rel} must limit product completeness to user-facing/product/UI/UX work`,
      ).toMatch(/user[- ]?(facing|visible)|product|ui|ux/)
      expect(
        content,
        `${rel} must say internal/prompt/config-only work is excluded unless scoped`,
      ).toMatch(/internal.*prompt.*config.*unless scoped|prompt.*config.*internal.*unless scoped/)
    }
  })

  it("requires reviewer/checker/verifier prompts to start from fresh-session evidence", () => {
    for (const rel of freshSessionPromptFiles) {
      const content = readRequiredText(rel).toLowerCase()
      expect(content, `${rel} missing fresh-session default`).toMatch(
        /fresh[- ]session|fresh session|fresh evidence|fresh verification/,
      )
      expect(content, `${rel} must prefer current artifacts or evidence`).toMatch(
        /current artifacts|current evidence|current verification|current worktree/,
      )
      expect(content, `${rel} must forbid stale or prior reuse as proof`).toMatch(
        /stale|prior.*untrusted|do not reuse|previous.*untrusted/,
      )
    }
  })
})
