/**
 * T03 — Phase 2 Artifact / State Skill Contract Tests
 *
 * These tests read prompt/skill markdown files and assert required Phase 2
 * artifact lifecycle concepts. They are expected to FAIL (RED) until T04 adds
 * the corresponding lifecycle instructions to the skill markdown files.
 *
 * Design notes:
 *   - Follows the existing markdown contract-test style from phase1-gate-hardening.test.ts.
 *   - Assertions check required concepts with representative terms, not exact
 *     wording snapshots.
 *   - Required concepts are enforced individually; a match for one required
 *     idea must not satisfy another.
 *   - Where possible, assertions require concepts to appear in the same
 *     semantic section or paragraph to avoid scattered incidental-word matches.
 *   - Lifecycle tests require a dedicated lifecycle section/table/structured
 *     block in skill docs, not just scattered keyword matches.
 *   - Each describe block maps to one Phase 2 requirement area from the spec/plan.
 *   - Phase 3/4 exclusion checks verify ALL occurrences are in negative contexts.
 */

import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = join(import.meta.dir, "..", "..")

function readRequiredText(relPath: string): string {
  const abs = join(repoRoot, relPath)
  expect(existsSync(abs), `required file is missing: ${relPath}`).toBe(true)
  return readFileSync(abs, "utf-8")
}

type RequiredPattern = {
  name: string
  pattern: RegExp
}

function extractSection(content: string, headingPattern: RegExp): string {
  const lines = content.split("\n")
  let startIdx = -1
  let headingLevel = 0

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(/^(#{1,6})\s+(.*)/)
    if (m && headingPattern.test(m[2]!)) {
      startIdx = i
      headingLevel = m[1]!.length
      break
    }
  }

  if (startIdx === -1) return ""

  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i]!.match(/^(#{1,6})\s+/)
    if (m && m[1]!.length <= headingLevel) {
      endIdx = i
      break
    }
  }

  return lines.slice(startIdx, endIdx).join("\n")
}

/** Extract all sections matching a heading pattern (for checking that at least one exists). */
function extractAllSections(content: string, headingPattern: RegExp): string[] {
  const lines = content.split("\n")
  const sections: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(/^(#{1,6})\s+(.*)/)
    if (m && headingPattern.test(m[2]!)) {
      const headingLevel = m[1]!.length
      let endIdx = lines.length
      for (let j = i + 1; j < lines.length; j++) {
        const m2 = lines[j]!.match(/^(#{1,6})\s+/)
        if (m2 && m2[1]!.length <= headingLevel) {
          endIdx = j
          break
        }
      }
      sections.push(lines.slice(i, endIdx).join("\n"))
    }
  }

  return sections
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function expectSectionExists(section: string, context: string): void {
  expect(section.length, `${context} section must exist`).toBeGreaterThan(0)
}

function expectAllPatterns(text: string, patterns: RequiredPattern[], context: string): void {
  for (const { name, pattern } of patterns) {
    expect(text, `${context} missing required concept '${name}'`).toMatch(pattern)
  }
}

function expectAllInOneParagraph(text: string, patterns: RequiredPattern[], context: string): void {
  const matchingParagraph = paragraphs(text).find((paragraph) =>
    patterns.every(({ pattern }) => pattern.test(paragraph)),
  )

  expect(
    matchingParagraph,
    `${context} must contain all required concepts in one coherent paragraph: ${patterns
      .map(({ name }) => name)
      .join(", ")}`,
  ).toBeDefined()
}

function expectSectionContainsAll(
  content: string,
  headingPattern: RegExp,
  patterns: RequiredPattern[],
  context: string,
): void {
  const section = extractSection(content, headingPattern)
  expectSectionExists(section, context)
  expectAllPatterns(section, patterns, context)
}

function expectSemanticCluster(content: string, patterns: RequiredPattern[], context: string): void {
  expectAllInOneParagraph(content, patterns, context)
}

/** Find all occurrences of a pattern in text and return their positions. */
function findAllOccurrences(text: string, pattern: RegExp): Array<{ match: string; index: number }> {
  const results: Array<{ match: string; index: number }> = []
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"
  const globalPattern = new RegExp(pattern.source, flags)
  let m: RegExpExecArray | null
  while ((m = globalPattern.exec(text)) !== null) {
    results.push({ match: m[0], index: m.index })
  }
  return results
}

// ---------------------------------------------------------------------------
// Skill file paths and content (read once, original case)
// ---------------------------------------------------------------------------

const SPEC_SKILL_PATH = "src/skills/spec/SKILL.md"
const WORKTREE_SKILL_PATH = "src/skills/worktree/SKILL.md"
const PLAN_SKILL_PATH = "src/skills/plan/SKILL.md"
const PRE_EXECUTE_ALIGNMENT_SKILL_PATH = "src/skills/pre-execute-alignment/SKILL.md"
const EXECUTE_SKILL_PATH = "src/skills/execute/SKILL.md"
const FINAL_REVIEW_SKILL_PATH = "src/skills/final-review/SKILL.md"
const FINISH_SKILL_PATH = "src/skills/finish/SKILL.md"
const TODO_SYNC_SKILL_PATH = "src/skills/todo-sync/SKILL.md"

// Original-case content for section extraction (headings are case-sensitive)
const specSkillRaw = readRequiredText(SPEC_SKILL_PATH)
const worktreeSkillRaw = readRequiredText(WORKTREE_SKILL_PATH)
const planSkillRaw = readRequiredText(PLAN_SKILL_PATH)
const preExecuteAlignmentSkillRaw = readRequiredText(PRE_EXECUTE_ALIGNMENT_SKILL_PATH)
const executeSkillRaw = readRequiredText(EXECUTE_SKILL_PATH)
const finalReviewSkillRaw = readRequiredText(FINAL_REVIEW_SKILL_PATH)
const finishSkillRaw = readRequiredText(FINISH_SKILL_PATH)
const todoSyncSkillRaw = readRequiredText(TODO_SYNC_SKILL_PATH)

// Lowercased content for pattern matching
const specSkill = specSkillRaw.toLowerCase()
const worktreeSkill = worktreeSkillRaw.toLowerCase()
const planSkill = planSkillRaw.toLowerCase()
const preExecuteAlignmentSkill = preExecuteAlignmentSkillRaw.toLowerCase()
const executeSkill = executeSkillRaw.toLowerCase()
const finalReviewSkill = finalReviewSkillRaw.toLowerCase()
const finishSkill = finishSkillRaw.toLowerCase()
const todoSyncSkill = todoSyncSkillRaw.toLowerCase()

// Combined skill content for cross-skill checks
const allSkillsLower = [
  specSkill,
  worktreeSkill,
  planSkill,
  preExecuteAlignmentSkill,
  executeSkill,
  finalReviewSkill,
  finishSkill,
  todoSyncSkill,
].join("\n\n---\n\n")

const allSkillsLowerNoTodoSync = [
  specSkill,
  worktreeSkill,
  planSkill,
  preExecuteAlignmentSkill,
  executeSkill,
  finalReviewSkill,
  finishSkill,
].join("\n\n---\n\n")

// Original-case combined for Phase 3/4 occurrence scanning
const allSkillsRaw = [
  specSkillRaw,
  worktreeSkillRaw,
  planSkillRaw,
  preExecuteAlignmentSkillRaw,
  executeSkillRaw,
  finalReviewSkillRaw,
  finishSkillRaw,
  todoSyncSkillRaw,
].join("\n\n---\n\n")

// ---------------------------------------------------------------------------
// 1. Dedicated Lifecycle Section / Table / Structured Block
// ---------------------------------------------------------------------------

describe("Phase 2: A dedicated lifecycle section/table/structured block exists covering all stages", () => {
  const lifecycleHeading = /lifecycle|artifact.*lifecycle|phase\s*2.*lifecycle|workflow.*artifact/i

  it("at least one skill contains a dedicated lifecycle heading or structured artifact-lifecycle block", () => {
    const allRaw = [
      specSkillRaw,
      worktreeSkillRaw,
      planSkillRaw,
      preExecuteAlignmentSkillRaw,
      executeSkillRaw,
      finalReviewSkillRaw,
      finishSkillRaw,
      todoSyncSkillRaw,
    ]
    const hasLifecycleSection = allRaw.some((content) => {
      const sections = extractAllSections(content, lifecycleHeading)
      return sections.some((section) => section.length > 50)
    })
    expect(
      hasLifecycleSection,
      "at least one skill must contain a dedicated lifecycle section (lifecycle heading with substantive content)",
    ).toBe(true)
  })

  it("the dedicated lifecycle section contains the full canonical stage chain", () => {
    const allRaw = [
      specSkillRaw,
      worktreeSkillRaw,
      planSkillRaw,
      preExecuteAlignmentSkillRaw,
      executeSkillRaw,
      finalReviewSkillRaw,
      finishSkillRaw,
      todoSyncSkillRaw,
    ]
    const lifecycleSections = allRaw.flatMap((content) =>
      extractAllSections(content, lifecycleHeading),
    )
    const combinedLifecycle = lifecycleSections.join("\n\n").toLowerCase()
    expect(
      combinedLifecycle.length,
      "lifecycle sections must have substantive content",
    ).toBeGreaterThan(50)

    const stages = [
      "spec",
      "worktree",
      "plan",
      "pre-execute-alignment",
      "execute",
      "final-review",
      "finish",
    ]
    for (const stage of stages) {
      expect(
        containsStageIdentity(combinedLifecycle, stageIdentityRegex(stage)),
        `lifecycle section stage coverage missing standalone stage '${stage}'`,
      ).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Row/Block-Scoped Lifecycle Matrix Columns Across All Stages
// ---------------------------------------------------------------------------

/**
 * Build a regex that can find candidate mentions of a canonical stage.
 */
function stageIdentityRegex(stage: string): RegExp {
  return new RegExp(`\\b${stage.replace(/-/g, ".?")}\\b`, "i")
}

/**
 * Centralized stage identity matcher.
 *
 * Scans every regex match and accepts the text only if at least one match is
 * not embedded in a hyphenated compound stage name. This prevents
 * `/\bexecute\b/` from falsely passing on `pre-execute-alignment`, while still
 * returning true when the first occurrence is hyphenated but a later standalone
 * or backticked exact stage (for example, `` `execute` ``) is present.
 */
function containsStageIdentity(text: string, stageRegex: RegExp): boolean {
  const flags = stageRegex.flags.includes("g") ? stageRegex.flags : `${stageRegex.flags}g`
  const globalStageRegex = new RegExp(stageRegex.source, flags)

  let match: RegExpExecArray | null
  while ((match = globalStageRegex.exec(text)) !== null) {
    const idx = match.index
    const end = idx + match[0].length
    const precededByHyphen = idx > 0 && text[idx - 1] === "-"
    const followedByHyphen = end < text.length && text[end] === "-"

    if (!precededByHyphen && !followedByHyphen) return true

    // Avoid infinite loops for defensive completeness if a zero-width regex is
    // accidentally passed in the future.
    if (match[0].length === 0) globalStageRegex.lastIndex++
  }

  return false
}

/**
 * Extract individual cell values from a pipe-delimited table line,
 * stripping backticks for comparison.
 */
function extractCells(line: string): string[] {
  return line
    .split("|")
    .map((c) => c.trim().replace(/`/g, ""))
    .filter(Boolean)
}

/**
 * Extract the "row" for a given stage from lifecycle content.
 *
 * A row is either:
 * - a table row (pipe-delimited line whose **cell values** match the stage), or
 * - a bullet/paragraph block bounded by blank lines that contains the stage name
 *   and at least one lifecycle keyword (artifact, state, ledger, verification).
 *
 * Matching is anchored to exact stage identity — backticked stage cells like
 * `| `execute` |` or standalone tokens — so `execute` cannot match
 * `pre-execute-alignment`.
 *
 * The returned text is the single best-matching block (row, bullet group, or
 * paragraph) for that stage so that all four lifecycle columns can be asserted
 * within the same scoped block rather than against the full lifecycle section.
 */
function extractStageBlock(lifecycleText: string, stageRegex: RegExp): string {
  const lines = lifecycleText.split("\n")

  // Strategy 1: table row — match the stage as a distinct cell value.
  // Extract each cell individually so "execute" inside "pre-execute-alignment"
  // is never accepted.
  for (const line of lines) {
    if (!line.includes("|")) continue
    if (extractCells(line).some((cell) => containsStageIdentity(cell, stageRegex))) {
      return line
    }
  }

  // Strategy 2: bullet/paragraph block — lines between blank lines that mention
  // the stage AND at least one lifecycle keyword.
  const blocks: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) { blocks.push(current.join("\n")); current = [] }
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) blocks.push(current.join("\n"))

  const lifecycleKw = /artifact|state\.json|ledger\.jsonl|evidence\.md|verification|lifecycle/i
  const best = blocks.find((b) => {
    if (!lifecycleKw.test(b)) return false
    // If the block has table rows, match on individual cells
    const tableLines = b.split("\n").filter((l) => l.includes("|"))
    if (tableLines.length > 0) {
      return tableLines.some((tl) =>
        extractCells(tl).some((cell) => containsStageIdentity(cell, stageRegex)),
      )
    }
    // Non-table block: use exact stage match to avoid hyphenated compounds
    return containsStageIdentity(b, stageRegex)
  })
  if (best) return best

  // Strategy 3: any paragraph that mentions the stage (exact match)
  const para = paragraphs(lifecycleText).find((p) => containsStageIdentity(p, stageRegex))
  return para ?? ""
}

describe("Phase 2: Lifecycle matrix enforces every required column within each stage's row/block", () => {
  const lifecycleHeading = /lifecycle|artifact.*lifecycle|phase\s*2.*lifecycle|workflow.*artifact/i
  const allRaw = [
    specSkillRaw,
    worktreeSkillRaw,
    planSkillRaw,
    preExecuteAlignmentSkillRaw,
    executeSkillRaw,
    finalReviewSkillRaw,
    finishSkillRaw,
    todoSyncSkillRaw,
  ]
  const lifecycleSections = allRaw.flatMap((content) =>
    extractAllSections(content, lifecycleHeading),
  )
  const lifecycleContent = lifecycleSections.join("\n\n").toLowerCase()

  const stageDefs: Array<{
    stage: string
    stageRegex: RegExp
    actor: RequiredPattern
    action: RequiredPattern
    ledgerEvent: RequiredPattern
    stateFields: RequiredPattern
  }> = [
    {
      stage: "spec",
      stageRegex: /\bspec\b/,
      actor: { name: "responsible actor", pattern: /orchestrator|spec.?skill|actor|responsible/ },
      action: { name: "artifact action", pattern: /create|update|materializ|initialize/ },
      ledgerEvent: { name: "minimum ledger event", pattern: /artifact.*initialized|evidence.*captured|initialized/ },
      stateFields: { name: "state fields updated", pattern: /work_id|active_stage/ },
    },
    {
      stage: "worktree",
      stageRegex: /\bworktree\b/,
      actor: { name: "responsible actor", pattern: /orchestrator|actor|responsible/ },
      action: { name: "artifact action", pattern: /preserv|carry|documentation/ },
      ledgerEvent: { name: "minimum ledger event", pattern: /stage\s+transition|gate\s+decision|transition/ },
      stateFields: { name: "state fields updated", pattern: /active_stage|active.*status|stage/ },
    },
    {
      stage: "plan",
      stageRegex: /\bplan\b/,
      actor: { name: "responsible actor", pattern: /planner|orchestrator|actor|responsible/ },
      action: { name: "artifact action", pattern: /read|update|snapshot|append/ },
      ledgerEvent: { name: "minimum ledger event", pattern: /plan.*(?:started|completed)|stage\s+transition|gate\s+decision/ },
      stateFields: { name: "state fields updated", pattern: /active_stage|blockers|next_route/ },
    },
    {
      stage: "pre-execute-alignment",
      stageRegex: /pre.?execute.?alignment/,
      actor: { name: "responsible actor", pattern: /orchestrator|alignment|actor|responsible/ },
      action: { name: "artifact action", pattern: /record|update|append/ },
      ledgerEvent: { name: "minimum ledger event", pattern: /alignment_decision|gate_decision/ },
      stateFields: { name: "state fields updated", pattern: /active_task|next_route|blockers/ },
    },
    {
      stage: "execute",
      stageRegex: /\bexecute\b/,
      actor: { name: "responsible actor", pattern: /executor|orchestrator|actor|responsible/ },
      action: { name: "artifact action", pattern: /append|write|update/ },
      ledgerEvent: { name: "minimum ledger event", pattern: /task_started|task_completed|task_blocked/ },
      stateFields: { name: "state fields updated", pattern: /completed_tasks|active_task|blockers/ },
    },
    {
      stage: "final-review",
      stageRegex: /final.?review/,
      actor: { name: "responsible actor", pattern: /reviewer|orchestrator|actor|responsible/ },
      action: { name: "artifact action", pattern: /inspect|review|read/ },
      ledgerEvent: { name: "minimum ledger event", pattern: /final_review_decision|routed_return/ },
      stateFields: { name: "state fields updated", pattern: /blockers|next_route/ },
    },
    {
      stage: "finish",
      stageRegex: /\bfinish\b/,
      actor: { name: "responsible actor", pattern: /orchestrator|finisher|actor|responsible/ },
      action: { name: "artifact action", pattern: /preserv|documentation|no.*cleanup/ },
      ledgerEvent: { name: "minimum ledger event", pattern: /finish_ready|route.*finish|finished/ },
      stateFields: { name: "state fields updated", pattern: /active_stage|next_route|last_updated/ },
    },
  ]

  for (const def of stageDefs) {
    describe(`lifecycle matrix row/block for '${def.stage}'`, () => {
      let stageBlock: string

      // Ensure the block is extracted before each test in this describe
      it(`${def.stage}: a dedicated row/block exists in lifecycle content`, () => {
        stageBlock = extractStageBlock(lifecycleContent, def.stageRegex)
        expect(
          stageBlock.length,
          `lifecycle content must contain a dedicated row/block for '${def.stage}'`,
        ).toBeGreaterThan(0)
      })

      it(`${def.stage}: responsible actor is defined within the same block`, () => {
        stageBlock = extractStageBlock(lifecycleContent, def.stageRegex)
        expect(
          stageBlock,
          `'${def.stage}' lifecycle block must contain ${def.actor.name}`,
        ).toMatch(def.actor.pattern)
      })

      it(`${def.stage}: artifact action is defined within the same block`, () => {
        stageBlock = extractStageBlock(lifecycleContent, def.stageRegex)
        expect(
          stageBlock,
          `'${def.stage}' lifecycle block must contain ${def.action.name}`,
        ).toMatch(def.action.pattern)
      })

      it(`${def.stage}: minimum ledger event is defined within the same block`, () => {
        stageBlock = extractStageBlock(lifecycleContent, def.stageRegex)
        expect(
          stageBlock,
          `'${def.stage}' lifecycle block must contain ${def.ledgerEvent.name}`,
        ).toMatch(def.ledgerEvent.pattern)
      })

      it(`${def.stage}: state fields updated are defined within the same block`, () => {
        stageBlock = extractStageBlock(lifecycleContent, def.stageRegex)
        expect(
          stageBlock,
          `'${def.stage}' lifecycle block must contain ${def.stateFields.name}`,
        ).toMatch(def.stateFields.pattern)
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 3. Per-Skill Actionable Ownership/Responsibility
// ---------------------------------------------------------------------------

describe("Phase 2: Each relevant skill has its own actionable ownership/responsibility for its stage", () => {
  const lifecycleOrArtifactHeading = /lifecycle|artifact.*lifecycle|phase\s*2.*lifecycle|workflow.*artifact|artifact.*state|phase\s*2/i

  const skillsWithStage: Array<{ name: string; content: string; contentRaw: string; stageTerm: string }> = [
    { name: "spec", content: specSkill, contentRaw: specSkillRaw, stageTerm: "spec" },
    { name: "worktree", content: worktreeSkill, contentRaw: worktreeSkillRaw, stageTerm: "worktree" },
    { name: "plan", content: planSkill, contentRaw: planSkillRaw, stageTerm: "plan" },
    { name: "pre-execute-alignment", content: preExecuteAlignmentSkill, contentRaw: preExecuteAlignmentSkillRaw, stageTerm: "pre-execute-alignment" },
    { name: "execute", content: executeSkill, contentRaw: executeSkillRaw, stageTerm: "execute" },
    { name: "final-review", content: finalReviewSkill, contentRaw: finalReviewSkillRaw, stageTerm: "final-review" },
    { name: "finish", content: finishSkill, contentRaw: finishSkillRaw, stageTerm: "finish" },
  ]

  for (const skill of skillsWithStage) {
    describe(`${skill.name} skill has stage-specific lifecycle ownership`, () => {
      it(`${skill.name} has a dedicated lifecycle/artifact section or structured lifecycle block`, () => {
        const sections = extractAllSections(skill.contentRaw, lifecycleOrArtifactHeading)
        const stageRegex = stageIdentityRegex(skill.stageTerm)
        const hasLifecycleBlock = sections.some((s) =>
          containsStageIdentity(s.toLowerCase(), stageRegex) && s.length > 50,
        )
        // Alternative: the whole file contains a structured bullet row or table row mentioning the stage alongside lifecycle concepts
        const stageLifecycleParagraph = paragraphs(skill.content).find((p) => {
          const hasStage = containsStageIdentity(p, stageRegex)
          const hasArtifactConcept = /evidence\.md|state\.json|ledger\.jsonl|verification|artifact.*lifecycle|lifecycle/.test(p)
          return hasStage && hasArtifactConcept
        })
        expect(
          hasLifecycleBlock || stageLifecycleParagraph !== undefined,
          `${skill.name} skill must have a dedicated lifecycle/artifact section or a structured block mentioning '${skill.stageTerm}' alongside lifecycle concepts`,
        ).toBe(true)
      })

      it(`${skill.name} describes when artifacts are created or updated for its stage`, () => {
        const stageRegex = stageIdentityRegex(skill.stageTerm)
        const hasActionableGuidance = paragraphs(skill.content).some((p) =>
          containsStageIdentity(p, stageRegex) &&
          /evidence\.md|state\.json|ledger\.jsonl|verification/.test(p) &&
          /create|update|write|append|read|inspect|preserv|record|initialize|materializ|snapshot/.test(p),
        )
        expect(
          hasActionableGuidance,
          `${skill.name} skill must describe when artifacts are created/updated for its stage in a structured context`,
        ).toBe(true)
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 4. Todo-Sync Complement Rule
// ---------------------------------------------------------------------------

describe("Phase 2: todo-sync says todowrite is active source, state.json is complement", () => {
  it("todo-sync states todowrite remains the active in-session todo source", () => {
    expectSemanticCluster(
      todoSyncSkill,
      [
        { name: "todowrite active", pattern: /todowrite/ },
        { name: "active or primary", pattern: /active|primary|in.?session/ },
        { name: "todo source", pattern: /todo|source|mechanism/ },
      ],
      "todo-sync todowrite is active source",
    )
  })

  it("todo-sync describes state.json as a durable snapshot/complement", () => {
    expectSemanticCluster(
      todoSyncSkill,
      [
        { name: "state.json complement", pattern: /state\.json/ },
        { name: "durable or snapshot or complement", pattern: /durable|snapshot|complement/ },
      ],
      "todo-sync state.json complement",
    )
  })

  it("todo-sync requires reporting stale/mismatched state rather than silently trusting it", () => {
    expectSemanticCluster(
      todoSyncSkill,
      [
        { name: "stale or mismatch", pattern: /stale|mismatch|outdated/ },
        { name: "report not silently trust", pattern: /report|not.*silent|deliberate|reconcil/ },
      ],
      "todo-sync stale state reporting",
    )
  })
})

// ---------------------------------------------------------------------------
// 5. Stage-Relevant Artifact Path Coverage (not boilerplate per-skill)
// ---------------------------------------------------------------------------

describe("Phase 2: Canonical artifact paths are documented with stage-relevant actionable guidance", () => {
  it("central guidance includes exact docs/supercode/<work_id>/evidence.md path", () => {
    expect(
      allSkillsLower,
      "central/canonical guidance must include exact path docs/supercode/<work_id>/evidence.md",
    ).toMatch(/docs\/supercode\/<work_id>\/evidence\.md/)
  })

  it("central guidance includes exact docs/supercode/<work_id>/state.json path", () => {
    expect(
      allSkillsLower,
      "central/canonical guidance must include exact path docs/supercode/<work_id>/state.json",
    ).toMatch(/docs\/supercode\/<work_id>\/state\.json/)
  })

  it("central guidance includes exact docs/supercode/<work_id>/ledger.jsonl path", () => {
    expect(
      allSkillsLower,
      "central/canonical guidance must include exact path docs/supercode/<work_id>/ledger.jsonl",
    ).toMatch(/docs\/supercode\/<work_id>\/ledger\.jsonl/)
  })

  it("central guidance includes exact docs/supercode/<work_id>/verification/<task_id>.json path pattern", () => {
    expect(
      allSkillsLower,
      "central/canonical guidance must include exact path docs/supercode/<work_id>/verification/<task_id>.json",
    ).toMatch(/docs\/supercode\/<work_id>\/verification\/<task_id>\.json/)
  })

  it("evidence.md path is mentioned in lifecycle context across relevant skills", () => {
    // Not every skill needs evidence.md; spec, plan, execute, final-review are the relevant ones
    const relevantSkills = [specSkill, planSkill, executeSkill, finalReviewSkill].join("\n\n---\n\n")
    expect(
      relevantSkills,
      "evidence.md path must appear in at least spec, plan, execute, or final-review skill",
    ).toMatch(/evidence\.md/)
  })

  it("state.json path is mentioned in lifecycle context across relevant skills", () => {
    const relevantSkills = [planSkill, preExecuteAlignmentSkill, executeSkill, finalReviewSkill].join("\n\n---\n\n")
    expect(
      relevantSkills,
      "state.json path must appear in at least plan, pre-execute-alignment, execute, or final-review skill",
    ).toMatch(/state\.json/)
  })

  it("ledger.jsonl path is mentioned in lifecycle context across relevant skills", () => {
    const relevantSkills = [planSkill, preExecuteAlignmentSkill, executeSkill, finalReviewSkill].join("\n\n---\n\n")
    expect(
      relevantSkills,
      "ledger.jsonl path must appear in at least plan, pre-execute-alignment, execute, or final-review skill",
    ).toMatch(/ledger\.jsonl/)
  })

  it("verification/<task_id>.json path is mentioned in lifecycle context across relevant skills", () => {
    const relevantSkills = [executeSkill, finalReviewSkill].join("\n\n---\n\n")
    expect(
      relevantSkills,
      "verification/<task_id>.json path pattern must appear in execute or final-review skill",
    ).toMatch(/verification.*task.*\.json|task.*\.json.*verification/)
  })

  // Per-skill: spec must mention evidence.md with docs/supercode/<work_id>/ path
  it("spec skill documents evidence.md with docs/supercode/<work_id>/ path pattern", () => {
    const hasPathGuidance = paragraphs(specSkill).some((p) =>
      /docs\/supercode\/<work_id>\/evidence\.md|docs\/supercode\/.*evidence\.md/.test(p),
    )
    expect(
      hasPathGuidance,
      "spec skill must document evidence.md using docs/supercode/<work_id>/... path pattern",
    ).toBe(true)
  })

  // Per-skill: plan must mention state.json with docs/supercode/<work_id>/ path
  it("plan skill documents state.json or evidence.md with docs/supercode/<work_id>/ path pattern", () => {
    const hasPathGuidance = paragraphs(planSkill).some((p) =>
      /docs\/supercode\/<work_id>\/(?:state\.json|evidence\.md|ledger\.jsonl)/.test(p) ||
      /docs\/supercode\/.*(?:state\.json|evidence\.md|ledger\.jsonl)/.test(p),
    )
    expect(
      hasPathGuidance,
      "plan skill must document at least one Phase 2 artifact using docs/supercode/<work_id>/... path pattern",
    ).toBe(true)
  })

  // Per-skill: execute must mention verification records with docs/supercode/<work_id>/ path
  it("execute skill documents verification records with docs/supercode/<work_id>/ path pattern", () => {
    const hasPathGuidance = paragraphs(executeSkill).some((p) =>
      /docs\/supercode\/<work_id>\/verification|docs\/supercode\/.*verification.*task/.test(p),
    )
    expect(
      hasPathGuidance,
      "execute skill must document verification records using docs/supercode/<work_id>/verification/... path pattern",
    ).toBe(true)
  })

  // Per-skill: execute must mention state.json or ledger.jsonl with docs/supercode/<work_id>/ path
  it("execute skill documents state.json or ledger.jsonl with docs/supercode/<work_id>/ path pattern", () => {
    const hasPathGuidance = paragraphs(executeSkill).some((p) =>
      /docs\/supercode\/<work_id>\/(?:state\.json|ledger\.jsonl)/.test(p) ||
      /docs\/supercode\/.*(?:state\.json|ledger\.jsonl)/.test(p),
    )
    expect(
      hasPathGuidance,
      "execute skill must document state.json or ledger.jsonl using docs/supercode/<work_id>/... path pattern",
    ).toBe(true)
  })

  // Per-skill: final-review must mention Phase 2 artifacts with docs/supercode/<work_id>/ path
  it("final-review skill documents Phase 2 artifacts with docs/supercode/<work_id>/ path pattern", () => {
    const hasPathGuidance = paragraphs(finalReviewSkill).some((p) =>
      /docs\/supercode\/<work_id>\/(?:evidence\.md|state\.json|ledger\.jsonl|verification)/.test(p) ||
      /docs\/supercode\/.*(?:evidence\.md|state\.json|ledger\.jsonl|verification)/.test(p),
    )
    expect(
      hasPathGuidance,
      "final-review skill must document Phase 2 artifacts using docs/supercode/<work_id>/... path pattern",
    ).toBe(true)
  })

  // Per-skill: pre-execute-alignment must mention state.json or ledger.jsonl with path
  it("pre-execute-alignment skill documents state.json or ledger.jsonl with docs/supercode/<work_id>/ path pattern", () => {
    const hasPathGuidance = paragraphs(preExecuteAlignmentSkill).some((p) =>
      /docs\/supercode\/<work_id>\/(?:state\.json|ledger\.jsonl)/.test(p) ||
      /docs\/supercode\/.*(?:state\.json|ledger\.jsonl)/.test(p),
    )
    expect(
      hasPathGuidance,
      "pre-execute-alignment skill must document state.json or ledger.jsonl using docs/supercode/<work_id>/... path pattern",
    ).toBe(true)
  })

  // Per-skill: worktree references Phase 2 artifacts in documentation-only context
  it("worktree skill references Phase 2 artifact convention in documentation-only guidance", () => {
    const hasArtifactConvention = paragraphs(worktreeSkill).some((p) =>
      /evidence\.md|state\.json|ledger\.jsonl|verification/.test(p) &&
      /artifact|convention|docs\/supercode|preserv|documentation|guidance/.test(p),
    )
    expect(
      hasArtifactConvention,
      "worktree skill must reference Phase 2 artifact convention with documentation-only guidance",
    ).toBe(true)
  })

  // Per-skill: finish has preservation/no-cleanup guidance for Phase 2 artifacts
  it("finish skill has Phase 2 artifact preservation/no-cleanup guidance", () => {
    const hasPreservation = paragraphs(finishSkill).some((p) =>
      /evidence\.md|state\.json|ledger\.jsonl|verification|artifact/.test(p) &&
      /preserv|no.*(cleanup|delet|remove)|documentation/.test(p),
    )
    expect(
      hasPreservation,
      "finish skill must have Phase 2 artifact preservation/no-cleanup guidance",
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. Canonical Field Names and Value Semantics
// ---------------------------------------------------------------------------

describe("Phase 2: Skill docs require canonical field names for state.json", () => {
  const stateJsonFields: RequiredPattern[] = [
    { name: "work_id", pattern: /\bwork_id\b/ },
    { name: "active_stage", pattern: /\bactive_stage\b/ },
    { name: "active_gate_or_status", pattern: /\bactive_gate_or_status\b/ },
    { name: "active_task", pattern: /\bactive_task\b/ },
    { name: "completed_tasks", pattern: /\bcompleted_tasks\b/ },
    { name: "blockers", pattern: /\bblockers\b/ },
    { name: "next_route", pattern: /\bnext_route\b/ },
    { name: "last_updated", pattern: /\blast_updated\b/ },
  ]

  for (const field of stateJsonFields) {
    it(`state.json canonical field '${field.name}' appears in skill docs`, () => {
      expect(
        allSkillsLowerNoTodoSync,
        `state.json canonical field '${field.name}' must appear in at least one skill doc`,
      ).toMatch(field.pattern)
    })
  }

  it("completed_tasks entries require task_id, status, and verification_record_status", () => {
    expectSemanticCluster(
      allSkillsLowerNoTodoSync,
      [
        { name: "task_id in completed_tasks", pattern: /task_id/ },
        { name: "status in completed_tasks", pattern: /status/ },
        { name: "verification_record_status provenance", pattern: /verification_record_status/ },
      ],
      "completed_tasks entry required fields",
    )
  })

  it("completed_tasks verification_record_status semantics are documented separately from verification record_status", () => {
    expectSemanticCluster(
      allSkillsLowerNoTodoSync,
      [
        { name: "completed_tasks", pattern: /completed_tasks|completed\s+tasks/ },
        { name: "verification_record_status", pattern: /verification_record_status/ },
        { name: "provenance/status meaning", pattern: /provenance|record\s+status|verified|pre_adoption_unavailable|not_applicable|failed|pending/ },
      ],
      "completed_tasks verification_record_status semantics",
    )
  })

  it("verification_record_status narrow values are documented for completed_tasks entries", () => {
    expectAllPatterns(
      allSkillsLowerNoTodoSync,
      [
        { name: "verified", pattern: /\bverified\b/ },
        { name: "pending", pattern: /\bpending\b/ },
        { name: "not_applicable", pattern: /not_applicable/ },
        { name: "pre_adoption_unavailable", pattern: /pre_adoption_unavailable/ },
        { name: "failed", pattern: /\bfailed\b/ },
      ],
      "completed_tasks verification_record_status values",
    )
  })
})

describe("Phase 2: Skill docs require canonical field names for ledger.jsonl events", () => {
  const ledgerEventFields: RequiredPattern[] = [
    { name: "timestamp", pattern: /\btimestamp\b/ },
    { name: "event_type", pattern: /\bevent_type\b/ },
    { name: "stage in event", pattern: /\bstage\b/ },
    { name: "task_id optional in event", pattern: /\btask_id\b/ },
    { name: "summary", pattern: /\bsummary\b/ },
    { name: "artifact_refs", pattern: /\bartifact_refs\b/ },
  ]

  for (const field of ledgerEventFields) {
    it(`ledger event canonical field '${field.name}' appears in skill docs`, () => {
      expect(
        allSkillsLowerNoTodoSync,
        `ledger event canonical field '${field.name}' must appear in at least one skill doc`,
      ).toMatch(field.pattern)
    })
  }

  it("minimum required event types are documented", () => {
    expectAllPatterns(
      allSkillsLowerNoTodoSync,
      [
        { name: "artifact_initialized", pattern: /artifact_initialized/ },
        { name: "evidence_captured", pattern: /evidence_captured/ },
        { name: "stage_transition", pattern: /stage_transition/ },
        { name: "gate_decision", pattern: /gate_decision/ },
        { name: "alignment_decision", pattern: /alignment_decision/ },
        { name: "task_started", pattern: /task_started/ },
        { name: "task_completed", pattern: /task_completed/ },
        { name: "task_blocked", pattern: /task_blocked/ },
        { name: "artifact_validation", pattern: /artifact_validation/ },
        { name: "final_review_decision", pattern: /final_review_decision/ },
        { name: "routed_return", pattern: /routed_return/ },
        { name: "finish_ready", pattern: /finish_ready/ },
      ],
      "minimum required ledger event types",
    )
  })
})

describe("Phase 2: Skill docs require canonical field names for verification records", () => {
  const verificationFields: RequiredPattern[] = [
    { name: "task_id", pattern: /\btask_id\b/ },
    { name: "status", pattern: /\bstatus\b/ },
    { name: "commands", pattern: /\bcommands\b/ },
    { name: "results", pattern: /\bresults\b/ },
    { name: "executor_evidence", pattern: /\bexecutor_evidence\b/ },
    { name: "reviewer_outcomes", pattern: /\breviewer_outcomes\b/ },
    { name: "diagnostics_status", pattern: /\bdiagnostics_status\b/ },
    { name: "unresolved_concerns", pattern: /\bunresolved_concerns\b/ },
    { name: "record_status", pattern: /\brecord_status\b/ },
  ]

  const executeAndReviewContent = [executeSkill, finalReviewSkill].join("\n\n---\n\n")

  for (const field of verificationFields) {
    it(`verification record canonical field '${field.name}' appears in skill docs`, () => {
      expect(
        executeAndReviewContent,
        `verification record canonical field '${field.name}' must appear in skill docs`,
      ).toMatch(field.pattern)
    })
  }

  it("reviewer_outcomes can be nullable, empty, or pending before final review", () => {
    expectSemanticCluster(
      executeAndReviewContent,
      [
        { name: "reviewer_outcomes", pattern: /reviewer_outcomes/ },
        { name: "nullable or pending before review", pattern: /nullable|null|empty|pending.*(?:before|until).*(?:review|reviewer)/ },
      ],
      "verification record reviewer_outcomes nullable before review",
    )
  })

  it("narrow status/provenance values are documented for task status", () => {
    expectAllPatterns(
      executeAndReviewContent,
      [
        { name: "pending status", pattern: /\bpending\b/ },
        { name: "in_progress status", pattern: /in_progress/ },
        { name: "completed status", pattern: /\bcompleted\b/ },
        { name: "blocked status", pattern: /\bblocked\b/ },
        { name: "skipped status", pattern: /\bskipped\b/ },
      ],
      "narrow task status values",
    )
  })

  it("narrow verification_record_status values are documented", () => {
    expectAllPatterns(
      executeAndReviewContent,
      [
        { name: "verified", pattern: /\bverified\b/ },
        { name: "not_applicable", pattern: /not_applicable/ },
        { name: "pre_adoption_unavailable", pattern: /pre_adoption_unavailable/ },
        { name: "failed", pattern: /\bfailed\b/ },
      ],
      "narrow verification_record_status values",
    )
  })

  it("record_status semantics are documented on verification records, separate from completed_tasks verification_record_status", () => {
    expectSemanticCluster(
      executeAndReviewContent,
      [
        { name: "record_status field", pattern: /record_status/ },
        { name: "verification record scope", pattern: /verification.*record|verification\/<task_id>\.json|task.*verification/ },
        { name: "provenance/status semantics", pattern: /provenance|verified|pending|not_applicable|pre_adoption_unavailable|failed/ },
      ],
      "verification record record_status semantics",
    )
  })

  it("record_status narrow values are documented for verification records", () => {
    expectAllPatterns(
      executeAndReviewContent,
      [
        { name: "verified", pattern: /\bverified\b/ },
        { name: "pending", pattern: /\bpending\b/ },
        { name: "not_applicable", pattern: /not_applicable/ },
        { name: "pre_adoption_unavailable", pattern: /pre_adoption_unavailable/ },
        { name: "failed", pattern: /\bfailed\b/ },
      ],
      "verification record record_status values",
    )
  })

  it("command/result entry status values are documented", () => {
    expectSemanticCluster(
      executeAndReviewContent,
      [
        { name: "commands or results", pattern: /commands|results/ },
        { name: "pass status", pattern: /\bpass\b/ },
        { name: "fail status", pattern: /\bfail\b/ },
        { name: "not_run status", pattern: /not_run/ },
        { name: "not_applicable status", pattern: /not_applicable/ },
      ],
      "command/result entry status values",
    )
  })
})

// ---------------------------------------------------------------------------
// 7. evidence.md Section Validation
// ---------------------------------------------------------------------------

describe("Phase 2: evidence.md section validation is documented in skill lifecycle", () => {
  const relevantSkills = [specSkill, executeSkill, finalReviewSkill].join("\n\n---\n\n")

  it("evidence.md requires internal evidence section", () => {
    expectSemanticCluster(
      relevantSkills,
      [
        { name: "evidence.md", pattern: /evidence\.md/ },
        { name: "internal evidence", pattern: /internal\s+evidence/ },
        { name: "required section", pattern: /required|section|must\s+(include|contain|have)/ },
      ],
      "evidence.md internal evidence section",
    )
  })

  it("evidence.md requires external evidence section", () => {
    expectSemanticCluster(
      relevantSkills,
      [
        { name: "evidence.md", pattern: /evidence\.md/ },
        { name: "external evidence", pattern: /external\s+evidence/ },
        { name: "required section", pattern: /required|section|must\s+(include|contain|have)/ },
      ],
      "evidence.md external evidence section",
    )
  })

  it("evidence.md requires checked scope section", () => {
    expectSemanticCluster(
      relevantSkills,
      [
        { name: "evidence.md", pattern: /evidence\.md/ },
        { name: "checked scope", pattern: /checked\s+scope/ },
        { name: "required section", pattern: /required|section|must\s+(include|contain|have)/ },
      ],
      "evidence.md checked scope section",
    )
  })

  it("evidence.md requires unchecked scope section", () => {
    expectSemanticCluster(
      relevantSkills,
      [
        { name: "evidence.md", pattern: /evidence\.md/ },
        { name: "unchecked scope", pattern: /unchecked\s+scope/ },
        { name: "required section", pattern: /required|section|must\s+(include|contain|have)/ },
      ],
      "evidence.md unchecked scope section",
    )
  })

  it("evidence.md requires unresolved uncertainty section", () => {
    expectSemanticCluster(
      relevantSkills,
      [
        { name: "evidence.md", pattern: /evidence\.md/ },
        { name: "unresolved uncertainty", pattern: /unresolved\s+uncertainty/ },
        { name: "required section", pattern: /required|section|must\s+(include|contain|have)/ },
      ],
      "evidence.md unresolved uncertainty section",
    )
  })
})

// ---------------------------------------------------------------------------
// 8. Append-Only Ledger Behavior
// ---------------------------------------------------------------------------

describe("Phase 2: Append-only ledger behavior is documented across skills", () => {
  it("ledger must be append-only: one JSON object per line", () => {
    expectSemanticCluster(
      allSkillsLowerNoTodoSync,
      [
        { name: "append-only", pattern: /append.?only/ },
        { name: "one JSON object per line", pattern: /one\s+json\s+object\s+per\s+line|jsonl/ },
      ],
      "append-only ledger one JSON per line",
    )
  })

  it("ledger must not rewrite or reorder historical lines during normal progress", () => {
    expectSemanticCluster(
      allSkillsLowerNoTodoSync,
      [
        { name: "no rewrite", pattern: /do not.*rewrite|not.*rewrite|no.*rewrite/ },
        { name: "no reorder", pattern: /do not.*reorder|not.*reorder|no.*reorder/ },
        { name: "historical lines preserved", pattern: /historical|history|normal.*progress/ },
      ],
      "append-only ledger no rewrite history",
    )
  })
})

// ---------------------------------------------------------------------------
// 9. Verification Ownership
// ---------------------------------------------------------------------------

describe("Phase 2: Verification ownership — executor writes, reviewer reads", () => {
  it("execute skill describes executor-owned verification record writing", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "executor-owned write", pattern: /executor.*(?:write|create|update)|write.*executor|executor.*evidence/ },
        { name: "verification record", pattern: /verification.*(?:record|task.*json)/ },
      ],
      "execute skill executor-owned verification writing",
    )
  })

  it("final-review skill describes reviewer-owned outcome — reviewer_outcomes", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "reviewer outcomes", pattern: /reviewer_outcomes|reviewer.*outcome/ },
        { name: "nullable before review", pattern: /nullable|null|empty|pending.*before|before.*review/ },
      ],
      "final-review skill reviewer-owned outcomes",
    )
  })

  it("execute skill separates executor evidence from reviewer outcomes", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "executor evidence", pattern: /executor_evidence|executor.*evidence/ },
        { name: "reviewer outcomes separate", pattern: /reviewer_outcomes|reviewer.*outcome/ },
        { name: "separation of ownership", pattern: /nullable|null|empty|pending|separate|before.*review/ },
      ],
      "execute skill evidence/outcome ownership separation",
    )
  })
})

// ---------------------------------------------------------------------------
// 10. Stage-Chain Preservation with Negative Guard
// ---------------------------------------------------------------------------

/**
 * The canonical allowlist of public workflow stages. No other stage name may
 * appear as a peer in an explicit stage-chain list/section in skill docs.
 */
const CANONICAL_STAGES = [
  "spec",
  "worktree",
  "plan",
  "pre-execute-alignment",
  "execute",
  "final-review",
  "finish",
]

/**
 * Extract only the narrow "position in the workflow" / "stage chain" sections
 * that enumerate public stages. Avoids matching broad workflow/completion/handoff
 * sections that contain non-stage bullet items.
 */
function extractStageChainBlocks(content: string): string[] {
  const headingPattern = /position\s+in\s+the\s+workflow|stage\s+chain|public\s+workflow\s*stage/i
  return extractAllSections(content, headingPattern)
}

describe("Phase 2: Public stage chain remains unchanged — all canonical stages present", () => {
  for (const stage of CANONICAL_STAGES) {
    it(`canonical stage '${stage}' is referenced in skill docs`, () => {
      expect(
        containsStageIdentity(allSkillsLowerNoTodoSync, stageIdentityRegex(stage)),
        `public stage '${stage}' must be referenced as a standalone stage identity in skill docs`,
      ).toBe(true)
    })
  }

  it("canonical chain order is preserved: spec → worktree → plan → pre-execute-alignment → execute → final-review → finish", () => {
    const chainPattern = /spec.*worktree.*plan.*pre.?execute.?alignment.*execute.*final.?review.*finish/s
    expect(
      allSkillsLowerNoTodoSync,
      "canonical stage chain must appear in skill docs in correct order",
    ).toMatch(chainPattern)
  })
})

describe("Phase 2: No extra public workflow stage beyond the canonical allowlist", () => {
  const allRaw = [
    specSkillRaw,
    worktreeSkillRaw,
    planSkillRaw,
    preExecuteAlignmentSkillRaw,
    executeSkillRaw,
    finalReviewSkillRaw,
    finishSkillRaw,
    todoSyncSkillRaw,
  ]

  it("no skill document introduces a stage-chain listing containing stages outside the canonical allowlist", () => {
    const violations: string[] = []

    for (const raw of allRaw) {
      const blocks = extractStageChainBlocks(raw)
      for (const block of blocks) {
        const lower = block.toLowerCase()

        // Strategy 1: Extract arrow-connected tokens (spec → worktree → ... or spec -> worktree -> ...)
        // Split on arrow connectors and check each token
        const arrowTokens = lower.split(/\s*(?:→|->|→)\s*/)
        for (const token of arrowTokens) {
          const cleaned = token.replace(/[.\d)\-*]/g, "").trim()
          // Only check single-word or hyphenated tokens (real stage names)
          if (!cleaned || cleaned.length > 30 || cleaned.includes(" ")) continue
          const isCanonical = CANONICAL_STAGES.some((cs) => {
            return containsStageIdentity(cleaned, stageIdentityRegex(cs))
          })
          if (!isCanonical && /^[a-z][-a-z]+$/.test(cleaned)) {
            violations.push(`"${cleaned}" found as arrow-connected stage in chain block in skill doc`)
          }
        }

        // Strategy 2: Find numbered/bulleted stage items that are clearly stage names
        // Pattern: "1. `stagename`" or "- `stagename`" where the item is a single backticked word
        const stageItemPattern = /(?:^|\n)\s*(?:\d+[.)]\s*|[-*]\s*)`([^`]+)`/g
        let m: RegExpExecArray | null
        while ((m = stageItemPattern.exec(block)) !== null) {
          const candidate = m[1]!.trim().toLowerCase()
          const isCanonical = CANONICAL_STAGES.some((cs) => {
            return containsStageIdentity(candidate, stageIdentityRegex(cs))
          })
          if (!isCanonical && /^[a-z][-a-z]+$/.test(candidate)) {
            violations.push(`"${candidate}" found as numbered/bulleted stage in chain block`)
          }
        }
      }
    }

    expect(
      violations,
      `No extra public stages allowed beyond: ${CANONICAL_STAGES.join(", ")}. Violations: ${violations.join("; ")}`,
    ).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 11. Phase 3/4 Exclusions — All Occurrences in Non-Goal/Negative Contexts
// ---------------------------------------------------------------------------

describe("Phase 2: Phase 3/4 terms appear only in non-goal/exclusion/negative contexts", () => {
  const phase34Terms: Array<{ name: string; pattern: RegExp }> = [
    { name: "mailbox", pattern: /\bmailbox\b/gi },
    { name: "file ownership registry", pattern: /file\s+ownership\s+registry/gi },
    { name: "per-worker worktree", pattern: /per.?worker\s+worktree/gi },
    { name: "embedded MCP", pattern: /embedded\s+mcp/gi },
    { name: "hierarchical AGENTS.md", pattern: /hierarchical\s+agents\.md/gi },
    { name: "wiki", pattern: /\bwiki\b/gi },
    { name: "ultragoal", pattern: /\bultragoal\b/gi },
  ]

  const contextWindow = 300

  for (const term of phase34Terms) {
    it(`Phase 3/4 term '${term.name}' — every occurrence is in non-goal/exclusion/negative context`, () => {
      const occurrences = findAllOccurrences(allSkillsRaw, term.pattern)

      // If the term doesn't appear at all, that's acceptable (no violation)
      if (occurrences.length === 0) return

      for (let i = 0; i < occurrences.length; i++) {
        const occ = occurrences[i]!
        const start = Math.max(0, occ.index - contextWindow)
        const end = Math.min(allSkillsRaw.length, occ.index + occ.match.length + contextWindow)
        const surrounding = allSkillsRaw.slice(start, end).toLowerCase()

        const isNegated = /not|no|non.?goal|out\s+of\s+scope|exclud|must\s+not|do\s+not|without|absence/.test(
          surrounding,
        )
        expect(
          isNegated,
          `Phase 3/4 term '${term.name}' occurrence ${i + 1}/${occurrences.length} at offset ${occ.index} must be in a non-goal/exclusion/negative context`,
        ).toBe(true)
      }
    })
  }
})

// ---------------------------------------------------------------------------
// 12. T06: Machine-Checkable Fields and Structured Lifecycle Requirements
// ---------------------------------------------------------------------------

describe("T06: Skill contract wording requires machine-checkable fields and structured lifecycle", () => {
  it("skill docs reference structured lifecycle sections, not loose keyword prose", () => {
    // The lifecycle section must be a dedicated section/table with structured
    // content, not just scattered mentions of lifecycle keywords
    const lifecycleHeading = /lifecycle|artifact.*lifecycle|phase\s*2.*lifecycle|workflow.*artifact/i
    const allRaw = [
      specSkillRaw,
      worktreeSkillRaw,
      planSkillRaw,
      preExecuteAlignmentSkillRaw,
      executeSkillRaw,
      finalReviewSkillRaw,
      finishSkillRaw,
      todoSyncSkillRaw,
    ]
    const lifecycleSections = allRaw.flatMap((content) =>
      extractAllSections(content, lifecycleHeading),
    )
    const combined = lifecycleSections.join("\n\n")
    expect(
      combined.length,
      "lifecycle sections must exist and have substantive content",
    ).toBeGreaterThan(100)

    // Must contain table-like or structured block content (pipes, bullets, or numbered rows)
    const hasStructure = /\|.*\|/.test(combined) || /^\s*[-*]\s+/m.test(combined) || /^\s*\d+[.)]\s+/m.test(combined)
    expect(
      hasStructure,
      "lifecycle content must use structured format (table, bullets, or numbered rows)",
    ).toBe(true)
  })

  it("skill docs require machine-checkable canonical JSON keys with snake_case", () => {
    // Skill docs must reference the exact snake_case canonical keys that the
    // helper schemas validate, not just human-readable aliases
    const canonicalFields = [
      "work_id",
      "active_stage",
      "active_gate_or_status",
      "completed_tasks",
      "verification_record_status",
      "record_status",
      "executor_evidence",
      "reviewer_outcomes",
      "diagnostics_status",
      "unresolved_concerns",
      "event_type",
      "artifact_refs",
    ]

    for (const field of canonicalFields) {
      expect(
        allSkillsLower,
        `skill docs must reference canonical snake_case field '${field}'`,
      ).toMatch(new RegExp(field.replace(/_/g, "_")))
    }
  })

  it("skill docs require reviewer_outcomes to be nullable/empty/pending before reviewer action", () => {
    // This is a machine-checkable requirement: reviewer_outcomes field must
    // be explicitly documented as nullable/empty/pending before final review
    const executeAndReview = [executeSkill, finalReviewSkill].join("\n\n")
    expect(
      executeAndReview,
    ).toMatch(/reviewer_outcomes.*(?:null|empty|pending)/)
  })

  it("skill docs reference verification_record_status provenance for completed_tasks entries", () => {
    // Machine-checkable: verification_record_status provenance field must be
    // documented for distinguishing historical vs current tasks
    expect(allSkillsLowerNoTodoSync).toMatch(/verification_record_status/)
  })

  it("skill docs reference record_status provenance on verification records", () => {
    // Machine-checkable: record_status on verification records must be documented
    const executeAndReview = [executeSkill, finalReviewSkill].join("\n\n")
    expect(executeAndReview).toMatch(/record_status/)
  })
})

// ---------------------------------------------------------------------------
// 13. T06: Negative Phase 3/4 Artifact Creation in Test/Helper Context
// ---------------------------------------------------------------------------

describe("T06: No test fixture or helper path creates Phase 3/4 artifact directories", () => {
  const phase34Paths = [
    "mailbox",
    "ownership",
    "per-worker",
    "wiki",
    "ultragoal",
    "agents-hierarchy",
    "mcp-embedded",
  ]

  it("skill docs do not document Phase 3/4 artifact directory creation", () => {
    // Check that skill docs only describe Phase 2 artifact directories
    const artifactDirPatterns = [
      /docs\/supercode\/<work_id>\/mailbox/,
      /docs\/supercode\/<work_id>\/ownership/,
      /docs\/supercode\/<work_id>\/per-worker/,
      /docs\/supercode\/<work_id>\/wiki/,
      /docs\/supercode\/<work_id>\/ultragoal/,
    ]

    for (const pattern of artifactDirPatterns) {
      expect(
        allSkillsLower,
        `skill docs must not document Phase 3/4 artifact directory matching ${pattern}`,
      ).not.toMatch(pattern)
    }
  })

  it("skill docs limit artifact directory to Phase 2 artifact types only", () => {
    // The only documented artifact directories under docs/supercode/<work_id>/
    // should be: evidence.md, state.json, ledger.jsonl, verification/, spec.md,
    // plan.md, and final-review.md
    for (const forbidden of phase34Paths) {
      const pattern = new RegExp(
        `docs/supercode/<work_id>/${forbidden}`,
      )
      expect(
        allSkillsLower,
        `skill docs must not reference Phase 3/4 path 'docs/supercode/<work_id>/${forbidden}'`,
      ).not.toMatch(pattern)
    }
  })
})
