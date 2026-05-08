/**
 * T05 — Current-Work Phase 3 Coordination Artifact Validation (Opt-In)
 *
 * This test file loads real Phase 3 coordination artifacts from disk for a
 * specific WORK_ID and validates them using helper exports from
 * `src/hooks/workflow-coordination-artifacts.ts` (Phase 3) and
 * `src/hooks/workflow-artifacts.ts` (Phase 2).
 *
 * It MUST skip when WORK_ID is unset so that normal `bun test` remains
 * stable and does not depend on mutable current-work docs artifacts.
 * Helper modules are imported dynamically only when WORK_ID is set.
 *
 * Run with:
 *   WORK_ID=20260508-phase3-coordination-foundation-d7f4 bun test src/__tests__/workflow-coordination-artifacts-current-work.test.ts
 *
 * When WORK_ID is unset:
 *   - Helper modules are never imported (dynamic import guarded).
 *   - All tests report as skipped.
 */

import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const WORK_ID = process.env.WORK_ID

const repoRoot = join(import.meta.dir, "..", "..")
const docsDir = WORK_ID ? join(repoRoot, "docs", "supercode", WORK_ID) : ""

// Dynamic helper loaders — only called when WORK_ID is set.
async function loadPhase2Helpers() {
  return await import("../hooks/workflow-artifacts") as typeof import("../hooks/workflow-artifacts")
}

async function loadPhase3Helpers() {
  return await import("../hooks/workflow-coordination-artifacts") as typeof import("../hooks/workflow-coordination-artifacts")
}

// When WORK_ID is unset, use describe.skip so nothing executes.
// When WORK_ID is set, use describe so tests run (and may RED if artifacts don't validate).
const describeOptIn = WORK_ID ? describe : describe.skip

// Required verification records that must exist and validate by final T06 completion.
const REQUIRED_VERIFICATION_TASKS = ["T00", "T01", "T02", "T03", "T04", "T05", "T06"]

// Canonical strict-completion matrix statuses.
const MATRIX_STATUSES = ["pending", "satisfied", "blocked", "not_applicable"]

// The exact 11 approved spec success criteria that must appear as matrix rows.
// Each entry is the numbered prefix that appears in the plan.md table.
const APPROVED_CRITERIA_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

// ---------------------------------------------------------------------------
// Ownership coverage expectations for key artifacts
// ---------------------------------------------------------------------------

interface OwnershipExpectation {
  target: string
  /** If set, check that at least one active entry exists with this mode for this target. */
  expectedMode?: string
  /** If set, check that at least one entry has this owner for this target. */
  expectedOwner?: string
  /** If set, check that entries matching mode/owner have these allowed operations (as superset). */
  expectedOps?: string[]
  /** If set, check that the bootstrap creation entry (if any) is released. */
  bootstrapReleased?: boolean
}

// Every minimum target listed in plan.md T05 step 7 (lines 509-532).
// Each entry checks that at least one ownership entry exists for the target
// and optionally validates mode, owner, allowed ops, and bootstrap status.
const OWNERSHIP_EXPECTATIONS: OwnershipExpectation[] = [
  // --- Append-only shared artifacts ---
  // mailbox.jsonl: shared_append with per-owner entries, bootstrap released
  {
    target: `docs/supercode/${WORK_ID}/mailbox.jsonl`,
    expectedMode: "shared_append",
    expectedOwner: "orchestrator",
    expectedOps: ["read", "append"],
  },
  {
    target: `docs/supercode/${WORK_ID}/mailbox.jsonl`,
    expectedMode: "shared_append",
    expectedOwner: "T05",
    expectedOps: ["read", "append"],
  },
  {
    target: `docs/supercode/${WORK_ID}/mailbox.jsonl`,
    bootstrapReleased: true,
  },
  // ledger.jsonl: shared_append with per-owner entries
  {
    target: `docs/supercode/${WORK_ID}/ledger.jsonl`,
    expectedMode: "shared_append",
    expectedOwner: "orchestrator",
    expectedOps: ["read", "append"],
  },
  {
    target: `docs/supercode/${WORK_ID}/ledger.jsonl`,
    expectedMode: "shared_append",
    expectedOwner: "T05",
    expectedOps: ["read", "append"],
  },
  // --- Read-only artifacts ---
  {
    target: `docs/supercode/${WORK_ID}/plan.md`,
    expectedMode: "read_only",
    expectedOps: ["read"],
  },
  {
    target: `docs/supercode/${WORK_ID}/spec.md`,
    expectedMode: "read_only",
    expectedOps: ["read"],
  },
  {
    target: `docs/supercode/${WORK_ID}/evidence.md`,
    expectedMode: "read_only",
    expectedOps: ["read"],
  },
  // --- Orchestrator-owned artifacts ---
  {
    target: `docs/supercode/${WORK_ID}/state.json`,
    expectedMode: "orchestrator_owned",
    expectedOwner: "orchestrator",
  },
  {
    target: `docs/supercode/${WORK_ID}/final-review.md`,
    expectedMode: "orchestrator_owned",
    expectedOwner: "orchestrator",
  },
  // --- Sequenced-write artifacts ---
  {
    target: `docs/supercode/${WORK_ID}/ownership.json`,
    expectedMode: "sequenced_write",
    expectedOwner: "T00",
  },
  {
    target: `docs/supercode/${WORK_ID}/ownership.json`,
    expectedMode: "sequenced_write",
    expectedOwner: "T05",
  },
  // --- Verification records: exclusive_write per task ---
  {
    target: `docs/supercode/${WORK_ID}/verification/T00.json`,
    expectedMode: "exclusive_write",
    expectedOwner: "T00",
  },
  {
    target: `docs/supercode/${WORK_ID}/verification/T01.json`,
    expectedMode: "exclusive_write",
    expectedOwner: "T01",
  },
  {
    target: `docs/supercode/${WORK_ID}/verification/T02.json`,
    expectedMode: "exclusive_write",
    expectedOwner: "T02",
  },
  {
    target: `docs/supercode/${WORK_ID}/verification/T03.json`,
    expectedMode: "exclusive_write",
    expectedOwner: "T03",
  },
  {
    target: `docs/supercode/${WORK_ID}/verification/T04.json`,
    expectedMode: "exclusive_write",
    expectedOwner: "T04",
  },
  {
    target: `docs/supercode/${WORK_ID}/verification/T05.json`,
    expectedMode: "exclusive_write",
    expectedOwner: "T05",
  },
  {
    target: `docs/supercode/${WORK_ID}/verification/T06.json`,
    expectedMode: "exclusive_write",
    expectedOwner: "T06",
  },
  // --- Source files ---
  // Helper module: exclusive_write T02
  {
    target: "src/hooks/workflow-coordination-artifacts.ts",
    expectedMode: "exclusive_write",
    expectedOwner: "T02",
  },
  // Helper contract test: sequenced_write T01 + T02
  {
    target: "src/__tests__/workflow-coordination-artifacts.test.ts",
    expectedMode: "sequenced_write",
    expectedOwner: "T01",
  },
  // Contract test: sequenced_write T03
  {
    target: "src/__tests__/phase3-coordination-contract.test.ts",
    expectedMode: "sequenced_write",
    expectedOwner: "T03",
  },
  // Current-work test: sequenced_write T05 + T06
  {
    target: "src/__tests__/workflow-coordination-artifacts-current-work.test.ts",
    expectedMode: "sequenced_write",
    expectedOwner: "T05",
  },
  {
    target: "src/__tests__/workflow-coordination-artifacts-current-work.test.ts",
    expectedMode: "sequenced_write",
    expectedOwner: "T06",
  },
  // --- Skill docs: exclusive_write T04 ---
  {
    target: "src/skills/spec/SKILL.md",
    expectedMode: "exclusive_write",
    expectedOwner: "T04",
  },
  {
    target: "src/skills/plan/SKILL.md",
    expectedMode: "exclusive_write",
    expectedOwner: "T04",
  },
  {
    target: "src/skills/pre-execute-alignment/SKILL.md",
    expectedMode: "exclusive_write",
    expectedOwner: "T04",
  },
  {
    target: "src/skills/execute/SKILL.md",
    expectedMode: "exclusive_write",
    expectedOwner: "T04",
  },
  {
    target: "src/skills/final-review/SKILL.md",
    expectedMode: "exclusive_write",
    expectedOwner: "T04",
  },
]

// ---------------------------------------------------------------------------
// Helpers for parsing plan.md strict-completion matrix table
// ---------------------------------------------------------------------------

/** Extract the strict-completion matrix section from plan.md content. */
function extractMatrixSection(content: string): string {
  const lower = content.toLowerCase()
  // Find the ## heading specifically
  const headingPatterns = [
    "\n## strict-completion matrix for this work",
    "\n## strict-completion matrix",
  ]
  let headingIdx = -1
  for (const pat of headingPatterns) {
    headingIdx = lower.indexOf(pat)
    if (headingIdx >= 0) break
  }
  if (headingIdx < 0) return ""

  const afterHeading = content.slice(headingIdx)
  const nextHeading = afterHeading.indexOf("\n## ", 1)
  return nextHeading > 0
    ? afterHeading.slice(0, nextHeading)
    : afterHeading
}

/** Parse markdown table rows from the matrix section. Returns non-header, non-separator rows. */
function parseMatrixTableRows(matrixSection: string): string[] {
  const lines = matrixSection.split("\n")
  return lines.filter((line) => {
    const trimmed = line.trim()
    // Table row starts and ends with |
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false
    // Skip separator row: |---|---|...
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) return false
    // Skip header row: contains "Spec success criterion"
    if (trimmed.toLowerCase().includes("spec success criterion")) return false
    return true
  })
}

/** Extract the criterion number from a matrix table row (e.g., "1." → 1). */
function extractCriterionNumber(row: string): number | null {
  // Match patterns like "| 1. " or "| 10. " at the start of the first cell
  const match = row.match(/\|\s*(\d+)\.\s/)
  return match ? parseInt(match[1]!, 10) : null
}

/** Extract the status from the last cell of a matrix table row. */
function extractRowStatus(row: string): string | null {
  const cells = row.split("|").map((c) => c.trim()).filter(Boolean)
  if (cells.length === 0) return null
  const lastCell = cells[cells.length - 1]!
  // The status is the last cell content
  const trimmed = lastCell.trim().toLowerCase()
  return MATRIX_STATUSES.includes(trimmed) ? trimmed : null
}

// ---------------------------------------------------------------------------
// Helpers for loading cached artifacts within the describe block
// ---------------------------------------------------------------------------

/** Helper to load and cache ownership.json entries once. */
function loadOwnershipEntries(): Array<Record<string, unknown>> {
  const ownershipPath = join(docsDir, "ownership.json")
  const raw = readFileSync(ownershipPath, "utf-8")
  const parsed = JSON.parse(raw)
  return parsed.entries as Array<Record<string, unknown>>
}

/** Helper to load and cache mailbox records. */
function loadMailboxRecords(): Array<Record<string, unknown>> {
  const mailboxPath = join(docsDir, "mailbox.jsonl")
  const raw = readFileSync(mailboxPath, "utf-8")
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>)
}

// ===========================================================================
// Test suite
// ===========================================================================

describeOptIn(
  `Current-work Phase 3 coordination artifact validation for WORK_ID=${WORK_ID}`,
  () => {
    // Lazily load helpers once; tests share the resolved modules.
    let phase2: Awaited<ReturnType<typeof loadPhase2Helpers>>
    let phase3: Awaited<ReturnType<typeof loadPhase3Helpers>>

    it("loads Phase 2 helper module", async () => {
      phase2 = await loadPhase2Helpers()
      expect(phase2).toBeDefined()
    })

    it("loads Phase 3 coordination helper module", async () => {
      phase3 = await loadPhase3Helpers()
      expect(phase3).toBeDefined()
    })

    it("docs directory exists", () => {
      expect(existsSync(docsDir), `docs dir must exist: ${docsDir}`).toBe(true)
    })

    // =======================================================================
    // ownership.json
    // =======================================================================

    describe("ownership.json validation", () => {
      it("ownership.json exists", () => {
        const ownershipPath = join(docsDir, "ownership.json")
        expect(
          existsSync(ownershipPath),
          `ownership.json must exist: ${ownershipPath}`,
        ).toBe(true)
      })

      it("ownership.json validates against OwnershipRegistrySchema", () => {
        const ownershipPath = join(docsDir, "ownership.json")
        const raw = readFileSync(ownershipPath, "utf-8")
        const parsed = JSON.parse(raw)
        const result = phase3.validateOwnershipRegistry(parsed)
        expect(
          result.success,
          `ownership.json validation: ${!result.success && "error" in result ? JSON.stringify(result.error) : ""}`,
        ).toBe(true)
      })

      it("ownership.json has correct work_id", () => {
        const ownershipPath = join(docsDir, "ownership.json")
        const raw = readFileSync(ownershipPath, "utf-8")
        const parsed = JSON.parse(raw)
        expect(parsed.work_id).toBe(WORK_ID)
      })

      it("ownership.json entries use only target_type 'path'", () => {
        const entries = loadOwnershipEntries()
        for (const entry of entries) {
          expect(
            entry.target_type,
            `entry ${entry.entry_id} must use target_type 'path'`,
          ).toBe("path")
        }
      })

      it("ownership.json has no duplicate entry_ids", () => {
        const entries = loadOwnershipEntries()
        const ids = entries.map((e) => e.entry_id as string)
        const unique = new Set(ids)
        expect(ids.length, "entry_ids must be unique").toBe(unique.size)
      })

      // --- Table-driven ownership coverage checks (Finding 2) ---

      it("ownership.json satisfies table-driven coverage expectations for key artifacts", () => {
        const entries = loadOwnershipEntries()

        for (const exp of OWNERSHIP_EXPECTATIONS) {
          const matching = entries.filter(
            (e) => e.target === exp.target,
          )

          expect(
            matching.length,
            `Expected at least one ownership entry for target: ${exp.target}`,
          ).toBeGreaterThan(0)

          if (exp.expectedMode !== undefined) {
            const modeMatches = matching.filter(
              (e) => e.mode === exp.expectedMode,
            )
            if (exp.expectedOwner !== undefined) {
              const ownerModeMatch = modeMatches.find(
                (e) => e.owner_task_id === exp.expectedOwner,
              )
              expect(
                ownerModeMatch,
                `Expected entry with target=${exp.target}, mode=${exp.expectedMode}, owner=${exp.expectedOwner}`,
              ).toBeDefined()

              if (exp.expectedOps && ownerModeMatch) {
                const ops = ownerModeMatch.allowed_operations as string[]
                for (const requiredOp of exp.expectedOps) {
                  expect(
                    ops,
                    `Entry ${ownerModeMatch.entry_id} must include operation '${requiredOp}'`,
                  ).toContain(requiredOp)
                }
              }
            } else {
              expect(
                modeMatches.length,
                `Expected at least one entry with target=${exp.target}, mode=${exp.expectedMode}`,
              ).toBeGreaterThan(0)
            }
          }

          if (exp.bootstrapReleased) {
            // Check that any exclusive_write bootstrap creation entry for this target is released
            const bootstrapEntries = matching.filter(
              (e) =>
                (e.mode === "exclusive_write" || e.mode === "sequenced_write") &&
                (e.allowed_operations as string[]).includes("create"),
            )
            for (const be of bootstrapEntries) {
              expect(
                be.status,
                `Bootstrap entry ${be.entry_id} for ${exp.target} must be released`,
              ).toBe("released")
            }
          }
        }
      })

      it("mailbox.jsonl shared_append entries do not include 'create' in allowed_operations", () => {
        const entries = loadOwnershipEntries()
        const mailboxSharedAppend = entries.filter(
          (e) =>
            e.target === `docs/supercode/${WORK_ID}/mailbox.jsonl` &&
            e.mode === "shared_append",
        )
        for (const entry of mailboxSharedAppend) {
          const ops = entry.allowed_operations as string[]
          expect(
            ops,
            `shared_append entry ${entry.entry_id} must not include 'create'`,
          ).not.toContain("create")
        }
      })

      it("ledger.jsonl shared_append entries do not include 'create' in allowed_operations", () => {
        const entries = loadOwnershipEntries()
        const ledgerSharedAppend = entries.filter(
          (e) =>
            e.target === `docs/supercode/${WORK_ID}/ledger.jsonl` &&
            e.mode === "shared_append",
        )
        for (const entry of ledgerSharedAppend) {
          const ops = entry.allowed_operations as string[]
          expect(
            ops,
            `shared_append entry ${entry.entry_id} must not include 'create'`,
          ).not.toContain("create")
        }
      })
    })

    // =======================================================================
    // mailbox.jsonl
    // =======================================================================

    describe("mailbox.jsonl validation", () => {
      it("mailbox.jsonl exists", () => {
        const mailboxPath = join(docsDir, "mailbox.jsonl")
        expect(
          existsSync(mailboxPath),
          `mailbox.jsonl must exist: ${mailboxPath}`,
        ).toBe(true)
      })

      it("every mailbox.jsonl line validates against MailboxMessageSchema", () => {
        const records = loadMailboxRecords()

        expect(
          records.length,
          "mailbox.jsonl must have at least one record",
        ).toBeGreaterThan(0)

        for (let i = 0; i < records.length; i++) {
          const result = phase3.validateMailboxMessage(records[i])
          expect(
            result.success,
            `mailbox.jsonl line ${i + 1} validation failed: ${!result.success && "error" in result ? JSON.stringify(result.error) : ""}`,
          ).toBe(true)
        }
      })

      it("mailbox.jsonl has bootstrap status_update from orchestrator to T00", () => {
        const records = loadMailboxRecords()

        const bootstrap = records.find(
          (m) =>
            m.message_type === "status_update" &&
            m.sender === "orchestrator" &&
            m.recipient === "T00" &&
            m.status === "resolved",
        )

        expect(
          bootstrap,
          "mailbox must have bootstrap status_update from orchestrator to T00 with status resolved",
        ).toBeDefined()
      })

      it("mailbox.jsonl has executor_handoff record", () => {
        const records = loadMailboxRecords()

        const handoff = records.find(
          (m) => m.message_type === "executor_handoff",
        )

        expect(
          handoff,
          "mailbox must have at least one executor_handoff record",
        ).toBeDefined()
      })
    })

    // =======================================================================
    // verification/*.json records
    // =======================================================================

    describe("verification records validation", () => {
      it("verification/ directory exists", () => {
        const verificationDir = join(docsDir, "verification")
        expect(
          existsSync(verificationDir),
          `verification/ dir must exist: ${verificationDir}`,
        ).toBe(true)
      })

      it("required verification records T00-T06 exist and validate", () => {
        const verificationDir = join(docsDir, "verification")

        for (const taskId of REQUIRED_VERIFICATION_TASKS) {
          const filePath = join(verificationDir, `${taskId}.json`)
          expect(
            existsSync(filePath),
            `verification/${taskId}.json must exist`,
          ).toBe(true)

          const raw = readFileSync(filePath, "utf-8")
          const parsed = JSON.parse(raw)

          // Validate base Phase 2 verification record schema
          const result = phase2.validateVerificationRecord(parsed)
          expect(
            result.success,
            `verification/${taskId}.json Phase 2 validation: ${!result.success && "error" in result ? JSON.stringify(result.error) : ""}`,
          ).toBe(true)

          // Each record must include ownership_evidence
          expect(
            parsed.ownership_evidence,
            `verification/${taskId}.json must include ownership_evidence`,
          ).toBeDefined()

          // Validate ownership_evidence with Phase 3 schema
          const oeResult = phase3.validateOwnershipEvidence(parsed.ownership_evidence)
          expect(
            oeResult.success,
            `verification/${taskId}.json ownership_evidence validation: ${!oeResult.success && "error" in oeResult ? JSON.stringify(oeResult.error) : ""}`,
          ).toBe(true)

          // Each record must include security_trigger_evidence
          expect(
            parsed.security_trigger_evidence,
            `verification/${taskId}.json must include security_trigger_evidence`,
          ).toBeDefined()

          // Validate security_trigger_evidence with Phase 3 schema
          const steResult = phase3.validateSecurityTriggerEvidence(parsed.security_trigger_evidence)
          expect(
            steResult.success,
            `verification/${taskId}.json security_trigger_evidence validation: ${!steResult.success && "error" in steResult ? JSON.stringify(steResult.error) : ""}`,
          ).toBe(true)
        }
      })

      it("verification records have correct task_id values", () => {
        const verificationDir = join(docsDir, "verification")

        for (const taskId of REQUIRED_VERIFICATION_TASKS) {
          const filePath = join(verificationDir, `${taskId}.json`)
          const raw = readFileSync(filePath, "utf-8")
          const parsed = JSON.parse(raw)
          expect(
            parsed.task_id,
            `verification/${taskId}.json task_id must be ${taskId}`,
          ).toBe(taskId)
        }
      })

      it("verification records have valid statuses", () => {
        const verificationDir = join(docsDir, "verification")
        const validStatuses = ["pending", "in_progress", "completed", "blocked", "skipped"]

        for (const taskId of REQUIRED_VERIFICATION_TASKS) {
          const filePath = join(verificationDir, `${taskId}.json`)
          const raw = readFileSync(filePath, "utf-8")
          const parsed = JSON.parse(raw)
          expect(
            validStatuses,
            `verification/${taskId}.json status must be valid`,
          ).toContain(parsed.status)
        }
      })

      it("task_local_changed_files are covered in changed_files[] with no uncovered or conflict status", () => {
        const verificationDir = join(docsDir, "verification")

        for (const taskId of REQUIRED_VERIFICATION_TASKS) {
          const filePath = join(verificationDir, `${taskId}.json`)
          const raw = readFileSync(filePath, "utf-8")
          const parsed = JSON.parse(raw)
          const oe = parsed.ownership_evidence

          const coveredPaths = oe.changed_files.map(
            (cf: { path: string }) => cf.path,
          )

          // Task-local changed files must be present in changed_files[]
          const omitted = phase3.findOmittedOwnershipEntries(
            oe.task_local_changed_files,
            coveredPaths,
          )
          expect(
            omitted,
            `verification/${taskId}.json has uncovered task_local_changed_files: ${omitted.join(", ")}`,
          ).toEqual([])

          // No changed_files entry for task-local paths should be uncovered or conflict
          for (const localPath of oe.task_local_changed_files) {
            const cf = oe.changed_files.find(
              (c: { path: string }) => c.path === localPath,
            )
            if (cf) {
              expect(
                cf.coverage_status,
                `verification/${taskId}.json changed_files entry for ${localPath} must not be 'uncovered'`,
              ).not.toBe("uncovered")
              expect(
                cf.coverage_status,
                `verification/${taskId}.json changed_files entry for ${localPath} must not be 'conflict'`,
              ).not.toBe("conflict")
            }
          }
        }
      })

      it("preexisting_changed_files_touched are in changed_files[] with no uncovered or conflict status", () => {
        const verificationDir = join(docsDir, "verification")

        for (const taskId of REQUIRED_VERIFICATION_TASKS) {
          const filePath = join(verificationDir, `${taskId}.json`)
          const raw = readFileSync(filePath, "utf-8")
          const parsed = JSON.parse(raw)
          const oe = parsed.ownership_evidence

          const coveredPaths = oe.changed_files.map(
            (cf: { path: string }) => cf.path,
          )

          const omitted = phase3.findOmittedOwnershipEntries(
            oe.preexisting_changed_files_touched,
            coveredPaths,
          )
          expect(
            omitted,
            `verification/${taskId}.json has uncovered preexisting_changed_files_touched: ${omitted.join(", ")}`,
          ).toEqual([])

          // No changed_files entry for preexisting-touched paths should be uncovered or conflict
          for (const preexistingPath of oe.preexisting_changed_files_touched) {
            const cf = oe.changed_files.find(
              (c: { path: string }) => c.path === preexistingPath,
            )
            if (cf) {
              expect(
                cf.coverage_status,
                `verification/${taskId}.json changed_files entry for ${preexistingPath} must not be 'uncovered'`,
              ).not.toBe("uncovered")
              expect(
                cf.coverage_status,
                `verification/${taskId}.json changed_files entry for ${preexistingPath} must not be 'conflict'`,
              ).not.toBe("conflict")
            }
          }
        }
      })

      it("actual_changed_files are covered in changed_files[] paths", () => {
        const verificationDir = join(docsDir, "verification")

        for (const taskId of REQUIRED_VERIFICATION_TASKS) {
          const filePath = join(verificationDir, `${taskId}.json`)
          const raw = readFileSync(filePath, "utf-8")
          const parsed = JSON.parse(raw)
          const oe = parsed.ownership_evidence

          const coveredPaths = oe.changed_files.map(
            (cf: { path: string }) => cf.path,
          )

          // actual_changed_files must be a subset of changed_files[].path
          const missing = phase3.findOmittedOwnershipEntries(
            oe.actual_changed_files,
            coveredPaths,
          )
          expect(
            missing,
            `verification/${taskId}.json has actual_changed_files not in changed_files[]: ${missing.join(", ")}`,
          ).toEqual([])
        }
      })

      it("changed_files[] ownership_entry_id resolves, targets match, status is valid, and operations are allowed", () => {
        const verificationDir = join(docsDir, "verification")
        const ownershipEntries = loadOwnershipEntries()

        for (const taskId of REQUIRED_VERIFICATION_TASKS) {
          const filePath = join(verificationDir, `${taskId}.json`)
          const raw = readFileSync(filePath, "utf-8")
          const parsed = JSON.parse(raw)
          const oe = parsed.ownership_evidence

          for (const cf of oe.changed_files) {
            expect(
              cf.ownership_entry_id,
              `verification/${taskId}.json: changed_files entry for ${cf.path} must cite an ownership_entry_id; null is only valid for explicit not_applicable evidence, not task-local/current-work changed files`,
            ).not.toBeNull()
            if (cf.ownership_entry_id === null) continue

            // Find the ownership entry
            const oeEntry = ownershipEntries.find(
              (e) => e.entry_id === cf.ownership_entry_id,
            )
            expect(
              oeEntry,
              `verification/${taskId}.json: ownership_entry_id '${cf.ownership_entry_id}' for ${cf.path} must resolve to an existing ownership.json entry`,
            ).toBeDefined()
            if (!oeEntry) continue

            expect(
              oeEntry.target,
              `verification/${taskId}.json: ownership entry ${cf.ownership_entry_id} target must equal changed_files[].path`,
            ).toBe(cf.path)

            const status = oeEntry.status as string
            const allowedOps = oeEntry.allowed_operations as string[]
            const releasedBootstrapCreate =
              status === "released" &&
              (oeEntry.mode === "exclusive_write" || oeEntry.mode === "sequenced_write") &&
              allowedOps.includes("create") &&
              (cf.operation === "create" || cf.operation === "write")

            expect(
              status === "active" || releasedBootstrapCreate,
              `verification/${taskId}.json: ownership entry ${cf.ownership_entry_id} status must be active, or a valid released bootstrap creation entry for create/write evidence; got status=${status}, mode=${oeEntry.mode}, op=${cf.operation}`,
            ).toBe(true)

            expect(
              allowedOps,
              `verification/${taskId}.json: operation '${cf.operation}' on ${cf.path} must be allowed by ownership entry ${cf.ownership_entry_id}`,
            ).toContain(cf.operation)

            // Ownership compliance: the ownership entry's owner_task_id must
            // match the verification record's task_id, unless an explicit
            // exception applies (orchestrator-owned, shared_append with
            // orchestrator as permitted actor, or pre_registry_bootstrap
            // provenance for pre-T00 artifacts).
            const entryOwner = oeEntry.owner_task_id as string
            const entryMode = oeEntry.mode as string
            const ownerMatchesTask = entryOwner === taskId
            const orchestratorException =
              entryOwner === "orchestrator" &&
              (entryMode === "orchestrator_owned" || entryMode === "shared_append")
            const preRegistryException =
              entryMode === "read_only" &&
              taskId === "T00"

            expect(
              ownerMatchesTask || orchestratorException || preRegistryException,
              `verification/${taskId}.json: ownership entry ${cf.ownership_entry_id} (owner=${entryOwner}, mode=${entryMode}) must be owned by task ${taskId} or qualify for an explicit orchestrator/pre-registry exception`,
            ).toBe(true)
          }
        }
      })
    })

    // =======================================================================
    // plan.md strict-completion matrix (Finding 1: tightened)
    // =======================================================================

    describe("plan.md strict-completion matrix", () => {
      it("plan.md exists", () => {
        const planPath = join(docsDir, "plan.md")
        expect(
          existsSync(planPath),
          `plan.md must exist: ${planPath}`,
        ).toBe(true)
      })

      it("plan.md contains strict-completion matrix heading", () => {
        const planPath = join(docsDir, "plan.md")
        const content = readFileSync(planPath, "utf-8")
        const matrixSection = extractMatrixSection(content)
        expect(
          matrixSection.length,
          "plan.md must contain a non-empty strict-completion matrix section",
        ).toBeGreaterThan(0)
      })

      it("plan.md strict-completion matrix has exactly 11 rows for approved spec success criteria", () => {
        const planPath = join(docsDir, "plan.md")
        const content = readFileSync(planPath, "utf-8")
        const matrixSection = extractMatrixSection(content)
        const rows = parseMatrixTableRows(matrixSection)

        // Must have exactly 11 rows
        expect(
          rows.length,
          `strict-completion matrix must have exactly 11 rows, found ${rows.length}`,
        ).toBe(11)

        // Each row must correspond to a numbered criterion 1-11
        const foundNumbers = rows
          .map((row) => extractCriterionNumber(row))
          .filter((n): n is number => n !== null)
          .sort((a, b) => a - b)

        expect(
          foundNumbers,
          "matrix must have rows numbered 1 through 11",
        ).toEqual(APPROVED_CRITERIA_NUMBERS)
      })

      it("plan.md strict-completion matrix uses only canonical statuses", () => {
        const planPath = join(docsDir, "plan.md")
        const content = readFileSync(planPath, "utf-8")
        const matrixSection = extractMatrixSection(content)
        const rows = parseMatrixTableRows(matrixSection)

        for (const row of rows) {
          const status = extractRowStatus(row)
          const criterionNum = extractCriterionNumber(row)
          expect(
            status,
            `matrix row for criterion ${criterionNum}: status must be one of ${MATRIX_STATUSES.join(", ")}, got '${row.split("|").map((c) => c.trim()).filter(Boolean).pop()}'`,
          ).not.toBeNull()
          if (status === null) continue
          expect(
            MATRIX_STATUSES,
            `matrix row for criterion ${criterionNum}: status '${status}' must be canonical`,
          ).toContain(status)
        }
      })

      it("plan.md strict-completion matrix has no extra criteria beyond the 11 approved", () => {
        const planPath = join(docsDir, "plan.md")
        const content = readFileSync(planPath, "utf-8")
        const matrixSection = extractMatrixSection(content)
        const rows = parseMatrixTableRows(matrixSection)

        // Every row must extract a valid criterion number
        for (const row of rows) {
          const num = extractCriterionNumber(row)
          expect(
            num,
            `matrix row must have a numbered criterion: ${row.slice(0, 80)}`,
          ).not.toBeNull()
          if (num === null) continue
          expect(
            APPROVED_CRITERIA_NUMBERS,
            `matrix row criterion number ${num} must be within approved 1-11`,
          ).toContain(num)
        }
      })
    })
  },
)
