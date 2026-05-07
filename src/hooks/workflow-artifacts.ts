/**
 * Phase 2 Artifact / State — Pure Zod schemas, types, and path helpers.
 *
 * Machine-checkable schemas for workflow state (state.json), ledger events
 * (ledger.jsonl), task verification records (verification/<task_id>.json),
 * and evidence.md section validation.
 *
 * Pure helpers only: no filesystem I/O, no todowrite runtime dependency.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Narrow status enums
// ---------------------------------------------------------------------------

/** Task lifecycle status values used in state.json completed_tasks and verification records. */
export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "skipped",
])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

/** Verification record provenance / status for completed_tasks entries and task records. */
export const VerificationRecordStatusSchema = z.enum([
  "verified",
  "pending",
  "not_applicable",
  "pre_adoption_unavailable",
  "failed",
])
export type VerificationRecordStatus = z.infer<
  typeof VerificationRecordStatusSchema
>

/** Command / result entry status values within verification records. */
export const CommandResultStatusSchema = z.enum([
  "pass",
  "fail",
  "not_run",
  "not_applicable",
])
export type CommandResultStatus = z.infer<typeof CommandResultStatusSchema>

// ---------------------------------------------------------------------------
// Completed task entry (within state.json completed_tasks)
// ---------------------------------------------------------------------------

const CompletedTaskEntrySchema = z.object({
  task_id: z.string().min(1),
  status: TaskStatusSchema,
  verification_record_status: VerificationRecordStatusSchema,
})

// ---------------------------------------------------------------------------
// Blocker entry (within state.json blockers)
// ---------------------------------------------------------------------------

const BlockerEntrySchema = z.object({
  summary: z.string().min(1),
  route_or_status: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Workflow state schema (state.json)
// ---------------------------------------------------------------------------

export const WorkflowStateSchema = z
  .object({
    work_id: z.string().min(1),
    active_stage: z.string().min(1),
    active_gate_or_status: z.string().min(1),
    active_task: z.union([z.string().min(1), z.null()]),
    completed_tasks: z.array(CompletedTaskEntrySchema),
    blockers: z.array(BlockerEntrySchema),
    next_route: z.string().min(1),
    last_updated: z.string().min(1),
  })
  .passthrough()

export type WorkflowState = z.infer<typeof WorkflowStateSchema>

// ---------------------------------------------------------------------------
// Ledger event schema (ledger.jsonl — one JSON object per line)
// ---------------------------------------------------------------------------

export const LedgerEventSchema = z
  .object({
    timestamp: z.string().min(1),
    event_type: z.string().min(1),
    stage: z.string().min(1),
    task_id: z.union([z.string().min(1), z.null()]).optional(),
    summary: z.string().min(1),
    artifact_refs: z.array(z.string().min(1)).min(1),
  })
  .passthrough()

export type LedgerEvent = z.infer<typeof LedgerEventSchema>

// ---------------------------------------------------------------------------
// Command / result entry (within verification/<task_id>.json)
// ---------------------------------------------------------------------------

const CommandResultEntrySchema = z.object({
  name: z.string().min(1),
  result_status: CommandResultStatusSchema,
  summary: z.string().min(1),
  timestamp: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Diagnostics status (within verification/<task_id>.json)
// ---------------------------------------------------------------------------

const DiagnosticsStatusSchema = z
  .object({
    status: z.string().min(1),
    summary: z.string().min(1),
  })
  .passthrough()

// ---------------------------------------------------------------------------
// Task verification record schema (verification/<task_id>.json)
// ---------------------------------------------------------------------------

export const VerificationRecordSchema = z
  .object({
    task_id: z.string().min(1),
    status: TaskStatusSchema,
    commands: z.array(CommandResultEntrySchema),
    results: z.array(CommandResultEntrySchema),
    executor_evidence: z.string().min(1),
    reviewer_outcomes: z.union([
      z.null(),
      z.string(),
      z.array(z.unknown()),
    ]),
    diagnostics_status: DiagnosticsStatusSchema,
    unresolved_concerns: z.array(z.unknown()),
    record_status: VerificationRecordStatusSchema,
  })
  .passthrough()

export type VerificationRecord = z.infer<typeof VerificationRecordSchema>

// ---------------------------------------------------------------------------
// Path helpers — pure string builders, no filesystem I/O
// ---------------------------------------------------------------------------

/** Returns `docs/supercode/<workId>/`. */
export function artifactDir(workId: string): string {
  return `docs/supercode/${workId}`
}

/** Returns `docs/supercode/<workId>/evidence.md`. */
export function evidencePath(workId: string): string {
  return `docs/supercode/${workId}/evidence.md`
}

/** Returns `docs/supercode/<workId>/state.json`. */
export function statePath(workId: string): string {
  return `docs/supercode/${workId}/state.json`
}

/** Returns `docs/supercode/<workId>/ledger.jsonl`. */
export function ledgerPath(workId: string): string {
  return `docs/supercode/${workId}/ledger.jsonl`
}

/** Returns `docs/supercode/<workId>/verification/<taskId>.json`. */
export function verificationPath(workId: string, taskId: string): string {
  return `docs/supercode/${workId}/verification/${taskId}.json`
}

// ---------------------------------------------------------------------------
// Validation helpers — thin wrappers around schema.safeParse
// ---------------------------------------------------------------------------

/** Validate a workflow state object against the state.json schema. */
export function validateState(data: unknown) {
  return WorkflowStateSchema.safeParse(data)
}

/** Validate a ledger event object against the ledger.jsonl event schema. */
export function validateLedgerEvent(data: unknown) {
  return LedgerEventSchema.safeParse(data)
}

/** Validate a task verification record against the verification/<task_id>.json schema. */
export function validateVerificationRecord(data: unknown) {
  return VerificationRecordSchema.safeParse(data)
}

// ---------------------------------------------------------------------------
// evidence.md section validator — pure markdown text analysis
// ---------------------------------------------------------------------------

const REQUIRED_EVIDENCE_SECTIONS = [
  "internal evidence",
  "external evidence",
  "checked scope",
  "unchecked scope",
  "unresolved uncertainty",
] as const

/**
 * Validate that markdown text contains all required evidence.md sections.
 *
 * Required sections (case-insensitive):
 *   - Internal Evidence
 *   - External Evidence
 *   - Checked Scope
 *   - Unchecked Scope
 *   - Unresolved Uncertainty
 *
 * Pure — no filesystem I/O.
 */
export function validateEvidenceSections(
  markdown: string,
): { success: boolean; error?: string; data?: string } {
  if (!markdown || markdown.trim().length === 0) {
    return { success: false, error: "evidence.md is empty" }
  }

  const lower = markdown.toLowerCase()
  const missing: string[] = []

  for (const section of REQUIRED_EVIDENCE_SECTIONS) {
    // Match "## <section>" as a markdown heading, not as a bare substring.
    // This prevents "checked scope" from matching inside "## unchecked scope".
    const heading = `## ${section}`
    if (!lower.includes(heading)) {
      missing.push(section)
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required sections: ${missing.join(", ")}`,
    }
  }

  return { success: true, data: markdown }
}
