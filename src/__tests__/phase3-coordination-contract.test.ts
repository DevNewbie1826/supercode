/**
 * T03 — Phase 3-1 Skill Markdown Contract Tests
 *
 * These tests read prompt/skill markdown files and assert required Phase 3-1
 * coordination foundation concepts. They are expected to FAIL (RED) until T04
 * adds the corresponding content to the skill markdown files.
 *
 * Design notes:
 *   - Follows the existing markdown contract-test style from phase2-artifact-state-contract.test.ts.
 *   - Imports canonical schemas from the helper module for enum/status consistency.
 *   - Assertions check required concepts with representative terms, not exact
 *     wording snapshots.
 *   - Required concepts are enforced individually; a match for one required
 *     idea must not satisfy another.
 *   - Where possible, assertions require concepts to appear in the same
 *     semantic section or paragraph to avoid scattered incidental-word matches.
 *   - Canonical enum/status assertions are centralized in plan/execute reference
 *     sections; other skills reference them semantically without repeating every value.
 *   - Canonical section extractors use narrow heading patterns (e.g.
 *     "Phase 3-1 Coordination Reference") to avoid false-positive matches
 *     on unrelated Phase 3 workflow headings like "Phase 3: Planner Draft".
 *   - Stage-specific assertions target the relevant skill file directly.
 *   - Each describe block maps to one Phase 3-1 requirement area from the spec/plan.
 */

import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Import canonical schemas for enum/status consistency assertions
import {
  MailboxMessageTypeSchema,
  MailboxStatusSchema,
  OwnershipModeSchema,
  OwnershipStatusSchema,
  OwnershipTargetTypeSchema,
  AllowedOperationSchema,
  SecurityTriggerCategorySchema,
  AttributionMethodSchema,
  OwnershipCoverageStatusSchema,
} from "../hooks/workflow-coordination-artifacts"

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

/** Extract all sections matching a heading pattern. */
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

function expectSemanticCluster(content: string, patterns: RequiredPattern[], context: string): void {
  const matchingParagraph = paragraphs(content).find((paragraph) =>
    patterns.every(({ pattern }) => pattern.test(paragraph)),
  )

  expect(
    matchingParagraph,
    `${context} must contain all required concepts in one coherent paragraph: ${patterns
      .map(({ name }) => name)
      .join(", ")}`,
  ).toBeDefined()
}

/**
 * Asserts that `text` does NOT contain positive implementation/enabled
 * language for a given concept outside of explicitly negative contexts
 * (deferred, excluded, out of scope, not implemented, not part, Phase 3-2).
 */
function assertNotImplementedOrEnabled(
  text: string,
  conceptPattern: RegExp,
  conceptName: string,
): void {
  // Find all occurrences of the concept
  const flags = conceptPattern.flags.includes("g") ? conceptPattern.flags : conceptPattern.flags + "g"
  const globalPattern = new RegExp(conceptPattern.source, flags)
  let m: RegExpExecArray | null
  const positiveHits: string[] = []

  while ((m = globalPattern.exec(text)) !== null) {
    // Extract a context window around the match
    const start = Math.max(0, m.index - 200)
    const end = Math.min(text.length, m.index + m[0].length + 200)
    const context = text.slice(start, end).toLowerCase()

    // Check if the surrounding context contains negative/deferred language
    const isNegative = /deferred|excluded|out.of.scope|not.implement|not.part|phase\s*3.2|future.*candid|non.goal|do.not|must.not|outside|beyond/i.test(context)
    if (!isNegative) {
      positiveHits.push(`...${context.slice(Math.max(0, m.index - start - 50), Math.min(context.length, m.index - start + m[0].length + 50))}...`)
    }
  }

  expect(
    positiveHits,
    `'${conceptName}' must only appear in deferred/excluded/negative contexts, but found positive implementation language`,
  ).toHaveLength(0)
}

// ---------------------------------------------------------------------------
// Skill file paths and content
// ---------------------------------------------------------------------------

const SPEC_SKILL_PATH = "src/skills/spec/SKILL.md"
const PLAN_SKILL_PATH = "src/skills/plan/SKILL.md"
const PRE_EXECUTE_ALIGNMENT_SKILL_PATH = "src/skills/pre-execute-alignment/SKILL.md"
const EXECUTE_SKILL_PATH = "src/skills/execute/SKILL.md"
const FINAL_REVIEW_SKILL_PATH = "src/skills/final-review/SKILL.md"

// Original-case content for section extraction
const specSkillRaw = readRequiredText(SPEC_SKILL_PATH)
const planSkillRaw = readRequiredText(PLAN_SKILL_PATH)
const preExecuteAlignmentSkillRaw = readRequiredText(PRE_EXECUTE_ALIGNMENT_SKILL_PATH)
const executeSkillRaw = readRequiredText(EXECUTE_SKILL_PATH)
const finalReviewSkillRaw = readRequiredText(FINAL_REVIEW_SKILL_PATH)

// Lowercased content for pattern matching
const specSkill = specSkillRaw.toLowerCase()
const planSkill = planSkillRaw.toLowerCase()
const preExecuteAlignmentSkill = preExecuteAlignmentSkillRaw.toLowerCase()
const executeSkill = executeSkillRaw.toLowerCase()
const finalReviewSkill = finalReviewSkillRaw.toLowerCase()

// Combined skill content for cross-skill checks
const phase3SkillsLower = [
  specSkill,
  planSkill,
  preExecuteAlignmentSkill,
  executeSkill,
  finalReviewSkill,
].join("\n\n---\n\n")

const phase3SkillsRaw = [
  specSkillRaw,
  planSkillRaw,
  preExecuteAlignmentSkillRaw,
  executeSkillRaw,
  finalReviewSkillRaw,
].join("\n\n---\n\n")

// ---------------------------------------------------------------------------
// Helper: canonical enum values from schema
// ---------------------------------------------------------------------------

const mailboxMessageTypes = MailboxMessageTypeSchema.options
const mailboxStatuses = MailboxStatusSchema.options
const ownershipModes = OwnershipModeSchema.options
const ownershipStatuses = OwnershipStatusSchema.options
const allowedOperations = AllowedOperationSchema.options
const securityTriggerCategories = SecurityTriggerCategorySchema.options
const attributionMethods = AttributionMethodSchema.options
const ownershipCoverageStatuses = OwnershipCoverageStatusSchema.options

// ---------------------------------------------------------------------------
// Narrow canonical section heading patterns (Finding 5)
//
// These must NOT match unrelated headings like "Phase 3: Planner Draft" or
// "Phase 3: Task Loop" in the existing skill docs. They target the dedicated
// Phase 3-1 coordination reference sections T04 will add.
// ---------------------------------------------------------------------------

/** Heading pattern for the canonical plan/SKILL.md Phase 3-1 coordination reference section. */
const PLAN_COORDINATION_HEADING = /Phase 3-1 Coordination Reference|Phase 3-1 coordination reference/i

/** Heading pattern for the canonical execute/SKILL.md Phase 3-1 execution ownership reference section. */
const EXECUTE_COORDINATION_HEADING = /Phase 3-1 Execution Ownership Reference|Phase 3-1 execution ownership reference|Phase 3-1 Ownership and Execution/i

/** Extract canonical plan coordination section content (lowercased). */
function planCoordContent(): string {
  return extractAllSections(planSkillRaw, PLAN_COORDINATION_HEADING)
    .join("\n\n")
    .toLowerCase()
}

/** Extract canonical execute coordination section content (lowercased). */
function executeCoordContent(): string {
  return extractAllSections(executeSkillRaw, EXECUTE_COORDINATION_HEADING)
    .join("\n\n")
    .toLowerCase()
}

// ---------------------------------------------------------------------------
// 1. Canonical Phase 3-1 Coordination Reference Section in plan/SKILL.md
// ---------------------------------------------------------------------------

describe("Phase 3-1: plan/SKILL.md contains canonical Phase 3-1 coordination reference section", () => {
  it("plan skill has a Phase 3-1 Coordination Reference section", () => {
    const sections = extractAllSections(planSkillRaw, PLAN_COORDINATION_HEADING)
    const hasPhase3Section = sections.some((s) => s.length > 100)
    expect(
      hasPhase3Section,
      "plan/SKILL.md must have a dedicated 'Phase 3-1 Coordination Reference' section with substantive content",
    ).toBe(true)
  })

  it("plan coordination section lists all canonical mailbox message_type values", () => {
    const combined = planCoordContent()
    for (const msgType of mailboxMessageTypes) {
      expect(
        combined,
        `plan coordination section must list canonical message_type '${msgType}'`,
      ).toContain(msgType)
    }
  })

  it("plan coordination section lists all canonical mailbox status values", () => {
    const combined = planCoordContent()
    for (const status of mailboxStatuses) {
      expect(
        combined,
        `plan coordination section must list canonical mailbox status '${status}'`,
      ).toContain(status)
    }
  })

  it("plan coordination section lists all canonical ownership mode values", () => {
    const combined = planCoordContent()
    for (const mode of ownershipModes) {
      expect(
        combined,
        `plan coordination section must list canonical ownership mode '${mode}'`,
      ).toContain(mode)
    }
  })

  it("plan coordination section lists all canonical ownership status values", () => {
    const combined = planCoordContent()
    for (const status of ownershipStatuses) {
      expect(
        combined,
        `plan coordination section must list canonical ownership status '${status}'`,
      ).toContain(status)
    }
  })

  it("plan coordination section lists all canonical allowed_operation values", () => {
    const combined = planCoordContent()
    for (const op of allowedOperations) {
      expect(
        combined,
        `plan coordination section must list canonical allowed_operation '${op}'`,
      ).toContain(op)
    }
  })

  it("plan coordination section specifies target_type is path only, glob deferred", () => {
    const combined = planCoordContent()
    expect(
      combined,
      "plan coordination section must specify target_type as 'path' only",
    ).toContain("path")
    expect(
      combined,
      "plan coordination section must document glob as deferred to Phase 3-2",
    ).toMatch(/glob.*(?:deferred|phase\s*3.2|not.*support|not.*accepted)|(?:deferred|phase\s*3.2|not.*support|not.*accepted).*glob/)
  })

  it("plan coordination section documents ownership mode/operation invariant semantics", () => {
    const combined = planCoordContent()
    expect(
      combined,
      "plan coordination section must reference mode/operation invariants",
    ).toMatch(/invariant|mode.*operation|operation.*mode/)
  })

  it("plan coordination section references ownership_evidence and security_trigger_evidence", () => {
    const combined = planCoordContent()
    expect(
      combined,
      "plan coordination section must reference ownership_evidence",
    ).toMatch(/ownership_evidence/)
    expect(
      combined,
      "plan coordination section must reference security_trigger_evidence",
    ).toMatch(/security_trigger_evidence/)
  })

  it("plan coordination section lists all canonical security trigger category values", () => {
    const combined = planCoordContent()
    for (const cat of securityTriggerCategories) {
      expect(
        combined,
        `plan coordination section must list canonical security trigger category '${cat}'`,
      ).toContain(cat)
    }
  })

  it("plan coordination section lists strict-completion matrix statuses", () => {
    const combined = planCoordContent()
    const matrixStatuses = ["pending", "satisfied", "blocked", "not_applicable"]
    for (const status of matrixStatuses) {
      expect(
        combined,
        `plan coordination section must list strict-completion matrix status '${status}'`,
      ).toContain(status)
    }
  })

  it("plan coordination section lists all canonical mailbox field names", () => {
    const combined = planCoordContent()
    const mailboxFields = [
      "message_id",
      "thread_id",
      "timestamp",
      "sender",
      "recipient",
      "message_type",
      "stage",
      "task_id",
      "summary",
      "artifact_refs",
      "status",
    ]
    for (const field of mailboxFields) {
      expect(
        combined,
        `plan coordination section must list canonical mailbox field '${field}'`,
      ).toContain(field)
    }
  })

  it("plan coordination section lists all canonical ownership registry field names", () => {
    const combined = planCoordContent()
    const registryFields = ["work_id", "entries"]
    for (const field of registryFields) {
      expect(
        combined,
        `plan coordination section must list canonical ownership registry field '${field}'`,
      ).toContain(field)
    }
  })

  it("plan coordination section lists all canonical ownership entry field names", () => {
    const combined = planCoordContent()
    const entryFields = [
      "entry_id",
      "target",
      "target_type",
      "owner_task_id",
      "mode",
      "status",
      "allowed_operations",
      "policy_summary",
      "conflict_notes",
      "blocker_refs",
    ]
    for (const field of entryFields) {
      expect(
        combined,
        `plan coordination section must list canonical ownership entry field '${field}'`,
      ).toContain(field)
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Canonical Phase 3-1 Coordination Reference Section in execute/SKILL.md
// ---------------------------------------------------------------------------

describe("Phase 3-1: execute/SKILL.md contains canonical Phase 3-1 coordination reference section", () => {
  it("execute skill has a Phase 3-1 Execution Ownership Reference section", () => {
    const sections = extractAllSections(executeSkillRaw, EXECUTE_COORDINATION_HEADING)
    const hasPhase3Section = sections.some((s) => s.length > 100)
    expect(
      hasPhase3Section,
      "execute/SKILL.md must have a dedicated 'Phase 3-1 Execution Ownership Reference' section with substantive content",
    ).toBe(true)
  })

  it("execute coordination section lists all canonical ownership mode values", () => {
    const combined = executeCoordContent()
    for (const mode of ownershipModes) {
      expect(
        combined,
        `execute coordination section must list canonical ownership mode '${mode}'`,
      ).toContain(mode)
    }
  })

  it("execute coordination section lists all canonical ownership status values", () => {
    const combined = executeCoordContent()
    for (const status of ownershipStatuses) {
      expect(
        combined,
        `execute coordination section must list canonical ownership status '${status}'`,
      ).toContain(status)
    }
  })

  it("execute coordination section lists all canonical allowed_operation values", () => {
    const combined = executeCoordContent()
    for (const op of allowedOperations) {
      expect(
        combined,
        `execute coordination section must list canonical allowed_operation '${op}'`,
      ).toContain(op)
    }
  })

  it("execute coordination section documents ownership mode/operation invariant semantics", () => {
    const combined = executeCoordContent()
    expect(
      combined,
      "execute coordination section must reference mode/operation invariants",
    ).toMatch(/invariant|mode.*operation|operation.*mode/)
  })

  it("execute coordination section lists all canonical ownership registry field names", () => {
    const combined = executeCoordContent()
    const registryFields = ["work_id", "entries"]
    for (const field of registryFields) {
      expect(
        combined,
        `execute coordination section must list canonical ownership registry field '${field}'`,
      ).toContain(field)
    }
  })

  it("execute coordination section lists all canonical ownership entry field names", () => {
    const combined = executeCoordContent()
    const entryFields = [
      "entry_id",
      "target",
      "target_type",
      "owner_task_id",
      "mode",
      "status",
      "allowed_operations",
      "policy_summary",
      "conflict_notes",
      "blocker_refs",
    ]
    for (const field of entryFields) {
      expect(
        combined,
        `execute coordination section must list canonical ownership entry field '${field}'`,
      ).toContain(field)
    }
  })

  it("execute skill states ownership violations are hard workflow failures", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "ownership violation", pattern: /ownership.*violation|violation.*ownership/ },
        { name: "hard failure", pattern: /hard.*(?:fail|workflow.*fail|review.*fail|failure)|workflow.*contract.*fail/ },
      ],
      "execute skill ownership violation hard failure",
    )
  })

  it("execute skill describes all ownership_evidence field names in per-task verification records", () => {
    // Finding 1 + Finding 4: explicitly assert every canonical ownership_evidence field including notes
    expectAllPatterns(
      executeSkill,
      [
        { name: "task_start_changed_files", pattern: /task_start_changed_files/ },
        { name: "task_end_changed_files", pattern: /task_end_changed_files/ },
        { name: "task_local_changed_files", pattern: /task_local_changed_files/ },
        { name: "preexisting_changed_files_touched", pattern: /preexisting_changed_files_touched/ },
        { name: "attribution_method", pattern: /attribution_method/ },
        { name: "attribution_limitations", pattern: /attribution_limitations/ },
        { name: "actual_changed_files_source", pattern: /actual_changed_files_source/ },
        { name: "actual_changed_files", pattern: /actual_changed_files/ },
        { name: "ownership_evidence", pattern: /ownership_evidence/ },
        { name: "notes field", pattern: /ownership_evidence.*notes|notes.*ownership_evidence|evidence.*notes/ },
      ],
      "execute skill ownership_evidence field names",
    )
  })

  it("execute skill describes changed_files[] entry fields including operation", () => {
    // Finding 2: assert operation alongside path, ownership_entry_id, coverage_status
    expectAllPatterns(
      executeSkill,
      [
        { name: "changed_files path", pattern: /changed_files.*path|path.*changed_files/ },
        { name: "changed_files operation", pattern: /changed_files.*operation|operation.*changed_files/ },
        { name: "ownership_entry_id", pattern: /ownership_entry_id/ },
        { name: "coverage_status", pattern: /coverage_status/ },
      ],
      "execute skill changed_files[] entry fields",
    )
  })

  it("execute skill describes bounded security-trigger handling through existing mechanisms", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "security trigger", pattern: /security.*trigger/ },
        { name: "existing mechanisms", pattern: /existing|research|review/ },
        { name: "not new stage", pattern: /not.*(?:new|dedicated|separate).*stage|without.*new.*stage|no.*new.*stage/ },
      ],
      "execute skill security trigger bounded routing",
    )
  })

  it("execute skill states routine docs/tests/schema edits do not trigger security research", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "routine edits not triggered", pattern: /routine|docs|tests|schema/ },
        { name: "security-sensitive risk surface", pattern: /security.sensitive|risk\s+surface/ },
        { name: "not automatic trigger", pattern: /do not.*automatically|not.*automatically|unless/ },
      ],
      "execute skill security trigger boundedness",
    )
  })

  it("execute skill requires security_trigger_evidence with all canonical fields in per-task verification records", () => {
    // Finding 3: assert security_trigger_evidence required fields including notes
    expectAllPatterns(
      executeSkill,
      [
        { name: "security_trigger_evidence", pattern: /security_trigger_evidence/ },
        { name: "triggered_categories", pattern: /triggered_categories/ },
        { name: "decision field", pattern: /(?:security_trigger_evidence.*decision|decision.*security_trigger_evidence|trigger.*decision)/ },
        { name: "evidence_refs", pattern: /evidence_refs/ },
        { name: "notes", pattern: /security_trigger_evidence.*notes|notes.*security_trigger_evidence|trigger.*notes|notes.*trigger/ },
      ],
      "execute skill security_trigger_evidence fields",
    )
  })
})

// ---------------------------------------------------------------------------
// 3. Mailbox Lifecycle Responsibilities — Stage-Specific Assertions (Finding 6)
// ---------------------------------------------------------------------------

describe("Phase 3-1: Mailbox lifecycle responsibilities with durable artifact paths", () => {
  it("plan/SKILL.md references durable mailbox.jsonl path docs/supercode/<work_id>/mailbox.jsonl", () => {
    expect(
      planSkill,
      "plan skill must reference durable mailbox path docs/supercode/<work_id>/mailbox.jsonl",
    ).toMatch(/docs\/supercode\/<work_id>\/mailbox\.jsonl/)
  })

  it("execute/SKILL.md references durable mailbox.jsonl path", () => {
    expect(
      executeSkill,
      "execute skill must reference durable mailbox path docs/supercode/<work_id>/mailbox.jsonl",
    ).toMatch(/docs\/supercode\/<work_id>\/mailbox\.jsonl/)
  })

  it("final-review/SKILL.md references durable mailbox.jsonl path", () => {
    expect(
      finalReviewSkill,
      "final-review skill must reference durable mailbox path docs/supercode/<work_id>/mailbox.jsonl",
    ).toMatch(/docs\/supercode\/<work_id>\/mailbox\.jsonl/)
  })

  it("execute skill describes mailbox as append-only orchestrator-mediated durable records", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "mailbox", pattern: /mailbox/ },
        { name: "append-only", pattern: /append.?only/ },
        { name: "orchestrator-mediated or durable", pattern: /orchestrator.*mediat|durable|mediat.*orchestrator/ },
      ],
      "execute skill mailbox append-only orchestrator-mediated",
    )
  })

  it("skill docs state mailbox is not free agent chat and not message broker", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "not free agent chat", pattern: /not.*free.*agent.*chat|no.*free.*agent.*chat|free.*agent.*chat.*not/ },
        { name: "not message broker", pattern: /not.*(?:message|msg).*broker|no.*(?:message|msg).*broker|broker.*not/ },
      ],
      "mailbox not free agent chat or broker",
    )
  })

  it("plan coordination section references canonical mailbox field names: message_id, thread_id", () => {
    const combined = planCoordContent()
    expect(
      combined,
      "canonical plan coordination section must reference message_id",
    ).toMatch(/message_id/)
    expect(
      combined,
      "canonical plan coordination section must reference thread_id",
    ).toMatch(/thread_id/)
    expect(
      combined,
      "canonical plan coordination section must reference resolution by follow-up thread_id status",
    ).toMatch(/thread_id.*status|status.*thread_id|resolv.*thread_id|thread_id.*resolv/)
  })

  it("execute skill mentions mailbox handoff and status_update message types", () => {
    expect(
      executeSkill,
      "execute skill must reference executor_handoff or handoff message type",
    ).toMatch(/executor_handoff|handoff/)
    expect(
      executeSkill,
      "execute skill must reference status_update message type",
    ).toContain("status_update")
  })
})

// ---------------------------------------------------------------------------
// 4. Ownership Registry Responsibilities — Stage-Specific (Finding 6)
// ---------------------------------------------------------------------------

describe("Phase 3-1: Ownership registry responsibilities with durable artifact paths", () => {
  it("plan/SKILL.md references durable ownership.json path docs/supercode/<work_id>/ownership.json", () => {
    expect(
      planSkill,
      "plan skill must reference durable ownership path docs/supercode/<work_id>/ownership.json",
    ).toMatch(/docs\/supercode\/<work_id>\/ownership\.json/)
  })

  it("execute/SKILL.md references durable ownership.json path", () => {
    expect(
      executeSkill,
      "execute skill must reference durable ownership path docs/supercode/<work_id>/ownership.json",
    ).toMatch(/docs\/supercode\/<work_id>\/ownership\.json/)
  })

  it("pre-execute-alignment/SKILL.md references durable ownership.json path", () => {
    expect(
      preExecuteAlignmentSkill,
      "pre-execute-alignment skill must reference durable ownership path docs/supercode/<work_id>/ownership.json",
    ).toMatch(/docs\/supercode\/<work_id>\/ownership\.json/)
  })

  it("final-review/SKILL.md references durable ownership.json path", () => {
    expect(
      finalReviewSkill,
      "final-review skill must reference durable ownership path docs/supercode/<work_id>/ownership.json",
    ).toMatch(/docs\/supercode\/<work_id>\/ownership\.json/)
  })

  it("execute skill describes exact repo-relative path matching only with glob deferred", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "exact path matching", pattern: /exact.*(?:repo.relative|path)|repo.relative.*path|path.*match/ },
        { name: "glob deferred or not supported", pattern: /glob.*(?:deferred|not.*support|not.*accepted|phase\s*3.2)|(?:deferred|not.*support|not.*accepted|phase\s*3.2).*glob/ },
      ],
      "execute skill exact repo-relative path matching with glob deferred",
    )
  })

  it("execute skill describes hard workflow failure for ownership violations", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "ownership violation", pattern: /ownership.*violation|violation.*ownership/ },
        { name: "hard workflow failure", pattern: /hard.*(?:fail|workflow.*fail|review.*fail|failure)|workflow.*fail/ },
      ],
      "execute skill ownership hard workflow failure",
    )
  })

  it("execute skill describes manual per-task ownership_evidence in verification records", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "ownership_evidence", pattern: /ownership_evidence/ },
        { name: "verification record path", pattern: /verification.*<task_id>|verification\/<task_id>|task_id.*json/ },
      ],
      "execute skill ownership_evidence in verification records",
    )
  })

  it("execute skill describes task-local attribution fields including preexisting_changed_files_touched", () => {
    expectAllPatterns(
      executeSkill,
      [
        { name: "task_local_changed_files", pattern: /task_local_changed_files/ },
        { name: "preexisting_changed_files_touched", pattern: /preexisting_changed_files_touched/ },
        { name: "attribution_method", pattern: /attribution_method/ },
        { name: "attribution_limitations", pattern: /attribution_limitations/ },
      ],
      "execute skill task-local attribution fields",
    )
  })

  it("execute skill describes failure on omitted task-local or preexisting-touched evidence", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "omitted or missing evidence", pattern: /omit|missing|uncovered|not.*cover/ },
        { name: "task-local or preexisting", pattern: /task_local|preexisting_changed_files_touched/ },
        { name: "failure or blocker", pattern: /fail|blocker|route.back/ },
      ],
      "execute skill failure on omitted task-local evidence",
    )
  })

  it("final-review skill describes global path-coverage comparison", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "global changed files", pattern: /global.*changed|changed.*file.*global|whole.work.*item.*changed/ },
        { name: "ownership target paths", pattern: /ownership.*target|target.*ownership|union.*target/ },
        { name: "unowned or path-coverage", pattern: /unowned|path.coverage|not.*covered/ },
      ],
      "final-review global path-coverage comparison",
    )
  })

  it("pre-execute-alignment skill describes conflict-sensitive batching with ownership", () => {
    expectSemanticCluster(
      preExecuteAlignmentSkill,
      [
        { name: "ownership", pattern: /ownership/ },
        { name: "conflict or batching", pattern: /conflict|batch|serial|parallel.*safe/ },
      ],
      "pre-execute-alignment conflict-sensitive batching",
    )
  })

  it("pre-execute-alignment skill assigns ownership entries per task before execution", () => {
    expectSemanticCluster(
      preExecuteAlignmentSkill,
      [
        { name: "assign ownership", pattern: /assign.*ownership|ownership.*assign|ownership.*entri/ },
        { name: "per task", pattern: /per.task|each.*task|task.*before.*execut/ },
      ],
      "pre-execute-alignment assigns ownership entries per task",
    )
  })

  it("pre-execute-alignment skill uses canonical executor_handoff mailbox message_type", () => {
    expectSemanticCluster(
      preExecuteAlignmentSkill,
      [
        { name: "mailbox", pattern: /mailbox/ },
        { name: "message_type", pattern: /message_type/ },
        { name: "executor_handoff", pattern: /executor_handoff/ },
      ],
      "pre-execute-alignment canonical mailbox handoff message_type",
    )

    expect(
      preExecuteAlignmentSkill,
      "pre-execute-alignment must not introduce non-canonical mailbox message_type values",
    ).not.toMatch(/plan_to_execute_handoff/)
  })
})

// ---------------------------------------------------------------------------
// 5. Hyperplan-Lite Perspectives in plan/SKILL.md
// ---------------------------------------------------------------------------

describe("Phase 3-1: plan/SKILL.md includes hyperplan-lite multi-perspective challenge expectations", () => {
  it("plan skill references hyperplan-lite or multi-perspective challenge", () => {
    expect(
      planSkill,
      "plan skill must reference hyperplan-lite or multi-perspective challenge",
    ).toMatch(/hyperplan|multi.perspective.*challenge|challenge.*perspective/)
  })

  it("hyperplan-lite includes scope creep / non-goal challenge perspective", () => {
    expect(
      planSkill,
      "hyperplan-lite must include scope creep or non-goal challenge",
    ).toMatch(/scope.*creep|non.goal|scope.*challenge/)
  })

  it("hyperplan-lite includes dependency and sequencing challenge perspective", () => {
    expect(
      planSkill,
      "hyperplan-lite must include dependency or sequencing challenge",
    ).toMatch(/dependenc.*sequenc|sequenc.*dependenc|dependenc.*challenge/)
  })

  it("hyperplan-lite includes verification adequacy challenge perspective", () => {
    expect(
      planSkill,
      "hyperplan-lite must include verification adequacy challenge",
    ).toMatch(/verification.*adequacy|adequacy.*verification/)
  })

  it("hyperplan-lite includes concurrency and ownership challenge perspective", () => {
    expect(
      planSkill,
      "hyperplan-lite must include concurrency or ownership challenge",
    ).toMatch(/concurrency.*ownership|ownership.*concurrency/)
  })

  it("hyperplan-lite includes security/risk trigger challenge perspective", () => {
    expect(
      planSkill,
      "hyperplan-lite must include security/risk trigger challenge",
    ).toMatch(/security.*(?:trigger|risk)|risk.*trigger|trigger.*security/)
  })

  it("hyperplan-lite includes completion matrix challenge perspective", () => {
    expect(
      planSkill,
      "hyperplan-lite must include completion matrix challenge",
    ).toMatch(/completion.*matrix|matrix.*completion/)
  })

  it("plan skill describes recording challenge findings and resolution/acceptance", () => {
    expectSemanticCluster(
      planSkill,
      [
        { name: "challenge findings", pattern: /challenge.*finding|finding.*challenge/ },
        { name: "resolution or acceptance", pattern: /resolv|accept|acceptance/ },
      ],
      "plan skill records challenge findings and resolution",
    )
  })

  it("plan skill requires strict-completion matrix planning without a new public stage", () => {
    expectSemanticCluster(
      planSkill,
      [
        { name: "strict-completion matrix", pattern: /strict.completion|completion.*matrix/ },
        { name: "no new stage", pattern: /no.*new.*stage|not.*new.*stage|without.*new.*stage/ },
      ],
      "plan skill strict-completion matrix no new stage",
    )
  })
})

// ---------------------------------------------------------------------------
// 6. Security Trigger Categories and Bounded Routing — Stage-Specific (Finding 6)
// ---------------------------------------------------------------------------

describe("Phase 3-1: Security trigger categories with required fields and bounded routing", () => {
  it("plan coordination section lists all canonical security trigger categories", () => {
    const combined = planCoordContent()
    const categories = [
      "authentication_authorization",
      "secrets_credentials_env_tokens",
      "filesystem_mutation",
      "shell_command_execution",
      "git_operation",
      "network_external_api",
      "dependency_install_update",
      "sandbox_worktree_permission_path",
      "generated_untrusted_input",
    ]
    for (const cat of categories) {
      expect(
        combined,
        `security trigger category '${cat}' must appear in plan coordination section`,
      ).toContain(cat)
    }
  })

  it("execute skill routes security triggers through existing research/review mechanisms", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "security trigger", pattern: /security.*trigger/ },
        { name: "existing mechanisms", pattern: /existing.*(?:research|review|mechanism)|research.*review|review.*research/ },
      ],
      "execute skill security triggers through existing mechanisms",
    )
  })

  it("execute skill does not create a new public stage for security research", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "security trigger", pattern: /security.*trigger/ },
        { name: "no new stage", pattern: /not.*(?:new|dedicated).*stage|no.*new.*stage|without.*new.*stage/ },
      ],
      "execute skill no new public stage for security",
    )
  })

  it("execute skill describes security_trigger_evidence with triggered_categories, decision, evidence_refs, notes", () => {
    // Finding 3: assert all security_trigger_evidence required fields including notes
    expectAllPatterns(
      executeSkill,
      [
        { name: "triggered_categories", pattern: /triggered_categories/ },
        { name: "decision field in security context", pattern: /(?:security_trigger_evidence.*decision|trigger.*decision)/ },
        { name: "evidence_refs", pattern: /evidence_refs/ },
        { name: "notes in security trigger context", pattern: /security_trigger_evidence.*notes|trigger.*notes|notes.*security_trigger_evidence|notes.*trigger/ },
      ],
      "execute skill security_trigger_evidence required fields",
    )
  })

  it("security_trigger_evidence decision values are documented: not_triggered, triggered_evidence_recorded, route_back_required", () => {
    // Finding 3: assert all canonical decision values appear
    expectAllPatterns(
      phase3SkillsLower,
      [
        { name: "not_triggered", pattern: /not_triggered/ },
        { name: "triggered_evidence_recorded", pattern: /triggered_evidence_recorded/ },
        { name: "route_back_required", pattern: /route_back_required/ },
      ],
      "security_trigger_evidence decision values",
    )
  })
})

// ---------------------------------------------------------------------------
// 7. Security Trigger Boundedness (Negative) — Stage-Specific (Finding 6)
// ---------------------------------------------------------------------------

describe("Phase 3-1: Security trigger boundedness — routine work does not auto-trigger", () => {
  it("execute skill states routine docs/tests/schema edits do not automatically trigger security research", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "routine work", pattern: /routine|docs|tests|schema/ },
        { name: "not automatic trigger", pattern: /do not.*(?:automatic|trigger)|not.*automatic|unless.*(?:security.sensitive|risk)/ },
      ],
      "execute skill routine work does not auto-trigger",
    )
  })

  it("execute skill states test execution does not automatically trigger security research", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "test execution", pattern: /test.*execution|running.*test|bun.*test/ },
        { name: "not automatic trigger", pattern: /do not.*(?:automatic|trigger)|not.*automatic|unless/ },
      ],
      "execute skill test execution does not auto-trigger",
    )
  })

  it("execute skill states security triggers apply only when security-sensitive risk surface is affected", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "security-sensitive", pattern: /security.sensitive|security_sensitive/ },
        { name: "risk surface", pattern: /risk.*surface|surface.*risk/ },
      ],
      "execute skill security triggers only when risk surface affected",
    )
  })

  it("non-security wording changes do not automatically trigger security research", () => {
    expectSemanticCluster(
      executeSkill,
      [
        { name: "non-security wording", pattern: /non.security.*wording|wording.*change/ },
        { name: "not automatic trigger", pattern: /do not.*(?:automatic|trigger)|not.*automatic/ },
      ],
      "execute skill non-security wording changes do not auto-trigger",
    )
  })
})

// ---------------------------------------------------------------------------
// 8. Strict-Completion Matrix
// ---------------------------------------------------------------------------

describe("Phase 3-1: Strict-completion matrix documented as acceptance matrix", () => {
  it("skill docs describe strict-completion matrix tying spec criteria to plan tasks and verification evidence", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "strict-completion matrix", pattern: /strict.completion|completion.*matrix/ },
        { name: "spec success criteria", pattern: /spec.*success|success.*criterion|success.*criteria/ },
        { name: "verification evidence", pattern: /verification.*evidence|evidence.*verification/ },
      ],
      "strict-completion matrix ties spec criteria to verification evidence",
    )
  })

  it("strict-completion uses exact canonical statuses: pending, satisfied, blocked, not_applicable", () => {
    const matrixStatuses = ["pending", "satisfied", "blocked", "not_applicable"]
    for (const status of matrixStatuses) {
      expect(
        phase3SkillsLower,
        `strict-completion must include canonical status '${status}'`,
      ).toContain(status)
    }
  })

  it("skill docs forbid raw ultrawork/ulw scope expansion", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "strict-completion or completion matrix", pattern: /strict.completion|completion.*matrix/ },
        { name: "no ultrawork expansion", pattern: /not.*ultrawork|no.*ulw|ultrawork.*not|ulw.*not|forbid.*ultrawork|forbid.*ulw|scope.*expansion.*not/ },
      ],
      "strict-completion forbids raw ultrawork scope expansion",
    )
  })

  it("skill docs state matrix rows are limited to approved spec success criteria only", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "approved spec criteria only", pattern: /approved.*spec|spec.*success.*criteria.*only|limited.*spec|criteria.*only/ },
        { name: "no new criteria", pattern: /no.*new.*criteria|not.*add.*criteria|must not.*expand.*scope/ },
      ],
      "strict-completion matrix limited to approved spec criteria",
    )
  })

  it("skill docs state Phase 3-1 matrix is markdown table in plan and final-review", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "markdown table", pattern: /markdown.*table|table.*markdown/ },
        { name: "plan or final-review artifact", pattern: /plan|final.review/ },
      ],
      "strict-completion matrix as markdown table",
    )
  })

  it("skill docs state separate machine-checkable artifact is deferred to Phase 3-2", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "machine-checkable artifact deferred", pattern: /machine.checkable.*deferred|deferred.*machine.checkable|structured.*artifact.*deferred|deferred.*structured.*artifact/ },
        { name: "phase 3-2", pattern: /phase\s*3.2|3.2/ },
      ],
      "machine-checkable completion matrix artifact deferred",
    )
  })

  it("skill docs state execution must not update strict-completion statuses in plan.md after approval", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "plan.md read-only or not update", pattern: /plan\.md.*(?:read.only|not.*update)|execution.*must.*not.*update|read.only.*plan/ },
        { name: "evidence in verification or final-review", pattern: /verification.*record|final.review.*artifact/ },
      ],
      "execution must not update plan.md matrix statuses",
    )
  })
})

// ---------------------------------------------------------------------------
// 9. Phase 3-2 Roadmap Preservation
// ---------------------------------------------------------------------------

describe("Phase 3-1: Phase 3-2 roadmap is preserved as deferred work", () => {
  const phase32Items: RequiredPattern[] = [
    { name: "automatic ownership validation", pattern: /automatic.*ownership.*validation|ownership.*validation.*automatic/ },
    { name: "conflict preflight", pattern: /conflict.*preflight|preflight.*conflict/ },
    { name: "mailbox routing enforcement", pattern: /mailbox.*routing.*enforcement|routing.*enforcement.*mailbox/ },
    { name: "security reviewer/research execution", pattern: /security.*(?:reviewer|research).*execution|actual.*security.*(?:reviewer|research)/ },
    { name: "multi-agent hyperplan", pattern: /multi.agent.*hyperplan|hyperplan.*multi.agent/ },
    { name: "structured completion matrix artifact", pattern: /structured.*machine.checkable.*completion.*matrix|machine.checkable.*completion.*matrix.*artifact/ },
    { name: "AI-slop cleanup gate", pattern: /ai.slop.*cleanup|cleanup.*ai.slop|ai.slop.*gate/ },
  ]

  for (const item of phase32Items) {
    it(`Phase 3-2 roadmap item '${item.name}' is documented as deferred`, () => {
      expect(
        phase3SkillsLower,
        `Phase 3-2 roadmap item '${item.name}' must be documented in skill docs`,
      ).toMatch(item.pattern)
    })
  }
})

// ---------------------------------------------------------------------------
// 10. Explicit Exclusions with Negative Language Checks (Finding 8)
// ---------------------------------------------------------------------------

describe("Phase 3-1: Explicit exclusions — not-implemented items", () => {
  const exclusions: Array<{ name: string; pattern: RegExp }> = [
    { name: "per-worker worktrees excluded", pattern: /per.worker.*worktree/ },
    { name: "OS/distributed locks excluded", pattern: /(?:os|distributed).*lock/ },
    { name: "full OMO Team Mode excluded", pattern: /full.*omo.*team.*mode|omo.*team.*mode/ },
    { name: "raw ulw excluded", pattern: /raw.*ulw|ulw.*raw/ },
    { name: "free agent chat excluded", pattern: /free.*agent.*chat/ },
    { name: "no new public workflow stage", pattern: /no.*new.*public.*workflow.*stage|not.*new.*public.*stage/ },
  ]

  for (const exclusion of exclusions) {
    it(`exclusion '${exclusion.name}' is documented`, () => {
      expect(
        phase3SkillsLower,
        `exclusion '${exclusion.name}' must be documented in skill docs`,
      ).toMatch(exclusion.pattern)
    })
  }

  it("per-worker worktrees are explicitly excluded or deferred, not implemented", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "per-worker worktrees", pattern: /per.worker.*worktree/ },
        { name: "excluded or deferred", pattern: /excluded|deferred|not.*implement|out.*scope/ },
      ],
      "per-worker worktrees excluded/deferred",
    )
    // Finding 8: also assert no positive implementation language
    assertNotImplementedOrEnabled(
      phase3SkillsLower,
      /per.worker\s+worktree/i,
      "per-worker worktrees",
    )
  })

  it("raw OMO ultrawork/ulw mode is excluded, not enabled", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "raw ultrawork/ulw", pattern: /raw.*ultrawork|raw.*ulw|ultrawork.*raw|ulw.*raw/ },
        { name: "excluded or out of scope", pattern: /excluded|out.*scope|not.*implement|not.*part/ },
      ],
      "raw ultrawork/ulw excluded",
    )
    assertNotImplementedOrEnabled(
      phase3SkillsLower,
      /raw\s*(?:ultrawork|ulw)/i,
      "raw ultrawork/ulw",
    )
  })

  it("no new public workflow stage is introduced", () => {
    expectSemanticCluster(
      phase3SkillsLower,
      [
        { name: "no new stage", pattern: /no.*new.*public.*stage|not.*new.*public.*stage|without.*new.*public.*stage/ },
        { name: "existing stages only", pattern: /existing.*stage|current.*stage/ },
      ],
      "no new public workflow stage",
    )
  })

  it("OS/distributed locks are described as not implemented, not as available features", () => {
    assertNotImplementedOrEnabled(
      phase3SkillsLower,
      /(?:os.level|distributed)\s+lock/i,
      "OS/distributed locks",
    )
  })

  it("free agent chat is described as excluded, not as supported", () => {
    assertNotImplementedOrEnabled(
      phase3SkillsLower,
      /free\s+agent\s+(?:to.\s*agent\s+)?chat/i,
      "free agent chat",
    )
  })

  it("runtime message broker is described as not implemented", () => {
    assertNotImplementedOrEnabled(
      phase3SkillsLower,
      /runtime\s+message\s+broker|message\s+broker\s+(?:infrastructure|runtime)/i,
      "runtime message broker",
    )
  })
})

// ---------------------------------------------------------------------------
// 11. Canonical Enum Consistency Between Helper Schemas and Skill Docs
// ---------------------------------------------------------------------------

describe("Phase 3-1: Canonical enum values from helper schemas appear in skill docs", () => {
  it("all MailboxMessageType values appear in canonical plan/execute coordination sections", () => {
    const combined = planCoordContent() + "\n\n" + executeCoordContent()
    for (const msgType of mailboxMessageTypes) {
      expect(
        combined,
        `canonical message_type '${msgType}' must appear in plan or execute coordination section`,
      ).toContain(msgType)
    }
  })

  it("all OwnershipMode values appear in canonical plan/execute coordination sections", () => {
    const combined = planCoordContent() + "\n\n" + executeCoordContent()
    for (const mode of ownershipModes) {
      expect(
        combined,
        `canonical ownership mode '${mode}' must appear in plan or execute coordination section`,
      ).toContain(mode)
    }
  })

  it("all OwnershipStatus values appear in canonical plan/execute coordination sections", () => {
    const combined = planCoordContent() + "\n\n" + executeCoordContent()
    for (const status of ownershipStatuses) {
      expect(
        combined,
        `canonical ownership status '${status}' must appear in plan or execute coordination section`,
      ).toContain(status)
    }
  })

  it("all AllowedOperation values appear in canonical plan/execute coordination sections", () => {
    const combined = planCoordContent() + "\n\n" + executeCoordContent()
    for (const op of allowedOperations) {
      expect(
        combined,
        `canonical allowed operation '${op}' must appear in plan or execute coordination section`,
      ).toContain(op)
    }
  })

  it("target_type is 'path' only in canonical plan coordination section; glob is not accepted", () => {
    // Finding 7: strengthen target_type path-only and glob-deferred
    expect(OwnershipTargetTypeSchema.options).toEqual(["path"])
    const combined = planCoordContent()
    expect(
      combined,
      "canonical plan coordination section must reference 'path' as target_type",
    ).toContain("path")
    expect(
      combined,
      "canonical plan coordination section must document glob as deferred or not accepted",
    ).toMatch(/glob.*(?:deferred|phase\s*3.2|not.*support|not.*accepted)|(?:deferred|phase\s*3.2|not.*support|not.*accepted).*glob/)
  })

  it("execute coordination section documents glob matching is not supported in Phase 3-1", () => {
    const combined = executeCoordContent()
    expect(
      combined,
      "execute coordination section must reference target_type as 'path' only",
    ).toContain("path")
    expect(
      combined,
      "execute coordination section must document glob as deferred or not supported",
    ).toMatch(/glob.*(?:deferred|phase\s*3.2|not.*support|not.*accepted)|(?:deferred|phase\s*3.2|not.*support|not.*accepted).*glob/)
  })

  it("canonical plan/execute coordination sections list all attribution method enum values", () => {
    const combined = planCoordContent() + "\n\n" + executeCoordContent()
    for (const method of attributionMethods) {
      expect(
        combined,
        `canonical coordination section must list attribution method '${method}'`,
      ).toContain(method)
    }
  })

  it("canonical plan/execute coordination sections list all ownership coverage status enum values", () => {
    const combined = planCoordContent() + "\n\n" + executeCoordContent()
    for (const status of ownershipCoverageStatuses) {
      expect(
        combined,
        `canonical coordination section must list ownership coverage status '${status}'`,
      ).toContain(status)
    }
  })
})

// ---------------------------------------------------------------------------
// 12. Final-Review Phase 3 Coordination Checks — Stage-Specific (Finding 6)
// ---------------------------------------------------------------------------

describe("Phase 3-1: final-review/SKILL.md includes Phase 3 coordination checks", () => {
  it("final-review checks append-only mailbox records", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "mailbox", pattern: /mailbox/ },
        { name: "append-only records", pattern: /append.only|record/ },
      ],
      "final-review checks append-only mailbox records",
    )
  })

  it("final-review checks fresh global changed-file path evidence against ownership targets", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "global changed-file paths", pattern: /global.*changed|changed.*file.*global|whole.work.*item/ },
        { name: "ownership target paths", pattern: /ownership.*target|target.*ownership/ },
        { name: "path coverage", pattern: /path.*coverage|coverage.*path|unowned/ },
      ],
      "final-review global path-coverage against ownership",
    )
  })

  it("final-review checks ownership_evidence attribution/operation adequacy", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "ownership_evidence", pattern: /ownership_evidence/ },
        { name: "attribution or operation check", pattern: /attribution|operation|coverage_status/ },
      ],
      "final-review ownership_evidence adequacy",
    )
  })

  it("final-review checks security_trigger_evidence adequacy with triggered_categories and decision", () => {
    // Finding 3: assert security_trigger_evidence fields in final-review context
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "security_trigger_evidence", pattern: /security_trigger_evidence/ },
        { name: "triggered_categories or decision", pattern: /triggered_categories|decision/ },
        { name: "adequacy", pattern: /adequa|review|check|inspect/ },
      ],
      "final-review security_trigger_evidence adequacy",
    )
  })

  it("final-review checks strict-completion matrix evidence", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "strict-completion matrix", pattern: /strict.completion|completion.*matrix/ },
        { name: "evidence check", pattern: /evidence|check|review|verify/ },
      ],
      "final-review strict-completion matrix evidence",
    )
  })

  it("final-review fails on unowned global changed-file paths", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "unowned paths", pattern: /unowned|not.*covered|not.*owned/ },
        { name: "failure", pattern: /fail|must.*fail|review.*fail/ },
      ],
      "final-review fails on unowned changed paths",
    )
  })

  it("final-review flags read_only or orchestrator_owned changed paths without provenance", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "read_only or orchestrator_owned", pattern: /read_only|orchestrator_owned/ },
        { name: "flag or provenance", pattern: /flag|provenance|pre_registry_bootstrap/ },
      ],
      "final-review flags read_only/orchestrator_owned without provenance",
    )
  })

  it("final-review allows initial create for append-only files only with bootstrap or provenance", () => {
    expectSemanticCluster(
      finalReviewSkill,
      [
        { name: "append-only create", pattern: /append.only.*create|create.*append.only/ },
        { name: "bootstrap or provenance", pattern: /bootstrap|provenance|pre_registry/ },
      ],
      "final-review append-only create requires bootstrap",
    )
  })
})

// ---------------------------------------------------------------------------
// 13. Spec Skill Phase 3 Security/Observation Responsibilities — Stage-Specific
// ---------------------------------------------------------------------------

describe("Phase 3-1: spec/SKILL.md includes bounded security trigger identification", () => {
  it("spec skill mentions security trigger identification or risk identification", () => {
    expectSemanticCluster(
      specSkill,
      [
        { name: "security trigger", pattern: /security.*trigger|trigger.*security/ },
        { name: "identification or discovery", pattern: /identif|discover|risk/ },
      ],
      "spec skill security trigger identification",
    )
  })

  it("spec skill preserves Phase 3-2 or deferred-scope wording", () => {
    expectSemanticCluster(
      specSkill,
      [
        { name: "phase 3-2 or deferred", pattern: /phase\s*3.2|deferred|future/ },
        { name: "ownership or coordination", pattern: /ownership|coordination|mailbox/ },
      ],
      "spec skill preserves Phase 3-2 roadmap",
    )
  })
})
