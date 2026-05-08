/**
 * Phase 3-1 Coordination Artifacts — Pure Zod schemas, types, path helpers,
 * and validation wrappers.
 *
 * Machine-checkable schemas for mailbox messages (mailbox.jsonl), ownership
 * registry (ownership.json), ownership evidence, security trigger evidence,
 * and global path-coverage helpers.
 *
 * Pure helpers only: no filesystem I/O, no shell execution, no runtime
 * dependency on workflow tools. Uses exact repo-relative path equality.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Mailbox message enums
// ---------------------------------------------------------------------------

/** Canonical mailbox message type values. */
export const MailboxMessageTypeSchema = z.enum([
  "research_request",
  "research_response",
  "executor_handoff",
  "reviewer_finding",
  "blocker",
  "route_back_reason",
  "final_review_evidence_gap",
  "status_update",
])
export type MailboxMessageType = z.infer<typeof MailboxMessageTypeSchema>

/** Canonical mailbox message status values. */
export const MailboxStatusSchema = z.enum([
  "open",
  "acknowledged",
  "resolved",
  "blocked",
  "superseded",
])
export type MailboxStatus = z.infer<typeof MailboxStatusSchema>

// ---------------------------------------------------------------------------
// Ownership enums
// ---------------------------------------------------------------------------

/** Canonical ownership mode values. */
export const OwnershipModeSchema = z.enum([
  "exclusive_write",
  "shared_append",
  "orchestrator_owned",
  "sequenced_write",
  "read_only",
])
export type OwnershipMode = z.infer<typeof OwnershipModeSchema>

/** Canonical ownership entry status values. */
export const OwnershipStatusSchema = z.enum([
  "active",
  "released",
  "blocked",
  "violated",
])
export type OwnershipStatus = z.infer<typeof OwnershipStatusSchema>

/** Canonical ownership target type. Phase 3-1 supports `path` only. */
export const OwnershipTargetTypeSchema = z.enum(["path"])
export type OwnershipTargetType = z.infer<typeof OwnershipTargetTypeSchema>

/** Canonical allowed operation values. */
export const AllowedOperationSchema = z.enum([
  "read",
  "write",
  "append",
  "create",
  "delete",
  "rename",
])
export type AllowedOperation = z.infer<typeof AllowedOperationSchema>

// ---------------------------------------------------------------------------
// Path constraint helpers (pure string validation)
// ---------------------------------------------------------------------------

/**
 * Validates that a path is a repo-relative string with no leading `/`,
 * no drive/root prefix, no `..` segment, and no empty path segments.
 */
function isValidRepoRelativePath(path: string): boolean {
  // Reject empty
  if (!path || path.length === 0) return false

  // Reject leading /
  if (path.startsWith("/")) return false

  // Reject any backslash — repo-relative paths use forward slashes only
  if (path.includes("\\")) return false

  // Reject drive/root prefix (e.g. C:\ or C:foo)
  if (/^[A-Za-z]:/.test(path)) return false

  // Reject .. segments
  const segments = path.split("/")
  if (segments.some((s) => s === "..")) return false

  // Reject empty segments (double slashes)
  if (segments.some((s) => s === "")) return false

  return true
}

/**
 * Checks whether an owner_task_id looks like a task id (T00–T99 style).
 * Used to enforce that write-capable modes require task-id owners unless
 * orchestrator provenance is documented.
 */
function isTaskId(ownerTaskId: string): boolean {
  return /^T\d{2,}$/.test(ownerTaskId)
}

/**
 * Checks whether an owner_task_id is a valid actor: either a task-like id
 * (T00–T99) or the literal "orchestrator".
 */
function isValidActor(ownerTaskId: string): boolean {
  return isTaskId(ownerTaskId) || ownerTaskId === "orchestrator"
}

// ---------------------------------------------------------------------------
// Mode/operation/actor invariant validation
// ---------------------------------------------------------------------------

/**
 * Validates that allowed_operations are consistent with the ownership mode.
 * Returns true if valid, false if invalid.
 */
function validateModeOperationInvariant(
  mode: string,
  allowedOperations: string[],
  ownerTaskId: string,
  policySummary: string,
): boolean {
  const ops = new Set(allowedOperations)

  switch (mode) {
    case "read_only": {
      // Must be exactly ["read"]
      if (ops.size !== 1 || !ops.has("read")) return false
      if (ops.has("write") || ops.has("append") || ops.has("create") || ops.has("delete") || ops.has("rename")) return false
      // Owner must be a valid actor (task id or orchestrator)
      if (!isValidActor(ownerTaskId)) return false
      return true
    }

    case "exclusive_write": {
      // May contain read, write, create, delete, rename. Must NOT contain append.
      if (ops.has("append")) return false
      // Check only allowed ops are present
      for (const op of ops) {
        if (!["read", "write", "create", "delete", "rename"].includes(op)) return false
      }
      // owner_task_id must be a task-like id unless orchestrator with provenance
      if (ownerTaskId === "orchestrator") {
        if (!containsProvenance(policySummary)) return false
      } else if (!isTaskId(ownerTaskId)) {
        return false
      }
      return true
    }

    case "shared_append": {
      // Must be exactly read + append
      if (ops.size !== 2 || !ops.has("read") || !ops.has("append")) return false
      // Reject create, write, delete, rename
      if (ops.has("write") || ops.has("create") || ops.has("delete") || ops.has("rename")) return false
      // Owner must be a valid actor (task id or orchestrator)
      if (!isValidActor(ownerTaskId)) return false
      return true
    }

    case "orchestrator_owned": {
      // owner_task_id must be "orchestrator"
      if (ownerTaskId !== "orchestrator") return false
      // Operations may contain any valid set
      return true
    }

    case "sequenced_write": {
      // May contain read, write, create, delete, rename. Must NOT contain append.
      if (ops.has("append")) return false
      for (const op of ops) {
        if (!["read", "write", "create", "delete", "rename"].includes(op)) return false
      }
      // owner_task_id must be a task-like id unless orchestrator with provenance
      if (ownerTaskId === "orchestrator") {
        if (!containsProvenance(policySummary)) return false
      } else if (!isTaskId(ownerTaskId)) {
        return false
      }
      return true
    }

    default:
      return false
  }
}

/**
 * Checks whether policy_summary contains provenance documentation for
 * orchestrator-owned exclusive_write or sequenced_write entries.
 */
function containsProvenance(policySummary: string): boolean {
  const lower = policySummary.toLowerCase()
  return lower.includes("pre-registry")
}

// ---------------------------------------------------------------------------
// Mailbox message schema
// ---------------------------------------------------------------------------

export const MailboxMessageSchema = z
  .object({
    message_id: z.string().min(1),
    thread_id: z.string().min(1),
    timestamp: z.string().min(1),
    sender: z.string().min(1),
    recipient: z.string().min(1),
    message_type: MailboxMessageTypeSchema,
    stage: z.string().min(1),
    task_id: z.union([z.string().min(1), z.null()]),
    summary: z.string().min(1),
    artifact_refs: z.array(z.string().min(1)).min(1),
    status: MailboxStatusSchema,
  })
  .passthrough()

export type MailboxMessage = z.infer<typeof MailboxMessageSchema>

// ---------------------------------------------------------------------------
// Ownership entry schema
// ---------------------------------------------------------------------------

export const OwnershipEntrySchema = z
  .object({
    entry_id: z.string().min(1),
    target: z.string().min(1).refine(isValidRepoRelativePath, {
      message:
        "target must be a valid repo-relative path: no leading /, no .., no empty segments, no drive/root prefix",
    }),
    target_type: OwnershipTargetTypeSchema,
    owner_task_id: z.string().min(1),
    mode: OwnershipModeSchema,
    status: OwnershipStatusSchema,
    allowed_operations: z
      .array(AllowedOperationSchema)
      .min(1)
      .refine(
        (ops) => new Set(ops).size === ops.length,
        { message: "allowed_operations must not contain duplicates" },
      ),
    policy_summary: z.string().min(1),
    conflict_notes: z.array(z.string()),
    blocker_refs: z.array(z.string()),
  })
  .refine(
    (entry) =>
      validateModeOperationInvariant(
        entry.mode,
        entry.allowed_operations,
        entry.owner_task_id,
        entry.policy_summary,
      ),
    {
      message:
        "ownership mode/operation/actor invariant violation: check allowed_operations match the mode and owner_task_id is valid for the mode",
    },
  )

export type OwnershipEntry = z.infer<typeof OwnershipEntrySchema>

// ---------------------------------------------------------------------------
// Ownership registry schema
// ---------------------------------------------------------------------------

export const OwnershipRegistrySchema = z.object({
  work_id: z.string().min(1),
  entries: z.array(OwnershipEntrySchema),
})

export type OwnershipRegistry = z.infer<typeof OwnershipRegistrySchema>

// ---------------------------------------------------------------------------
// Attribution method enum
// ---------------------------------------------------------------------------

export const AttributionMethodSchema = z.enum([
  "executor_edit_log",
  "before_after_snapshot",
  "reviewer_confirmed",
  "pre_registry_bootstrap",
  "not_applicable",
])
export type AttributionMethod = z.infer<typeof AttributionMethodSchema>

// ---------------------------------------------------------------------------
// Ownership coverage status enum
// ---------------------------------------------------------------------------

export const OwnershipCoverageStatusSchema = z.enum([
  "covered",
  "uncovered",
  "conflict",
  "not_applicable",
])
export type OwnershipCoverageStatus = z.infer<
  typeof OwnershipCoverageStatusSchema
>

// ---------------------------------------------------------------------------
// Ownership evidence schema
// ---------------------------------------------------------------------------

const ChangedFileEntrySchema = z.object({
  path: z.string().min(1).refine(isValidRepoRelativePath, {
    message: "path must be a valid repo-relative path",
  }),
  operation: AllowedOperationSchema,
  ownership_entry_id: z.union([z.string().min(1), z.null()]),
  coverage_status: OwnershipCoverageStatusSchema,
})

const EvidencePathSchema = z.string().min(1).refine(isValidRepoRelativePath, {
  message: "evidence path must be a valid repo-relative path",
})

export const OwnershipEvidenceSchema = z.object({
  task_start_changed_files: z.array(EvidencePathSchema),
  task_end_changed_files: z.array(EvidencePathSchema),
  task_local_changed_files: z.array(EvidencePathSchema),
  preexisting_changed_files_touched: z.array(EvidencePathSchema),
  attribution_method: AttributionMethodSchema,
  attribution_limitations: z.array(z.string()),
  actual_changed_files_source: z.string().min(1),
  actual_changed_files: z.array(EvidencePathSchema),
  changed_files: z.array(ChangedFileEntrySchema),
  notes: z.array(z.string()),
})

export type OwnershipEvidence = z.infer<typeof OwnershipEvidenceSchema>

// ---------------------------------------------------------------------------
// Security trigger enums and schema
// ---------------------------------------------------------------------------

export const SecurityTriggerCategorySchema = z.enum([
  "authentication_authorization",
  "secrets_credentials_env_tokens",
  "filesystem_mutation",
  "shell_command_execution",
  "git_operation",
  "network_external_api",
  "dependency_install_update",
  "sandbox_worktree_permission_path",
  "generated_untrusted_input",
])
export type SecurityTriggerCategory = z.infer<
  typeof SecurityTriggerCategorySchema
>

/** Security trigger decision values. */
const SecurityTriggerDecisionSchema = z.enum([
  "not_triggered",
  "triggered_evidence_recorded",
  "route_back_required",
])

export const SecurityTriggerEvidenceSchema = z.object({
  triggered_categories: z.array(SecurityTriggerCategorySchema),
  decision: SecurityTriggerDecisionSchema,
  evidence_refs: z.array(z.string()),
  notes: z.array(z.string()),
})

export type SecurityTriggerEvidence = z.infer<
  typeof SecurityTriggerEvidenceSchema
>

// ---------------------------------------------------------------------------
// Path helpers — pure string builders, no filesystem I/O
// ---------------------------------------------------------------------------

/** Returns `docs/supercode/<workId>/mailbox.jsonl`. */
export function mailboxPath(workId: string): string {
  return `docs/supercode/${workId}/mailbox.jsonl`
}

/** Returns `docs/supercode/<workId>/ownership.json`. */
export function ownershipPath(workId: string): string {
  return `docs/supercode/${workId}/ownership.json`
}

// ---------------------------------------------------------------------------
// Validation helpers — thin wrappers around schema.safeParse
// ---------------------------------------------------------------------------

/** Validate a mailbox message against the MailboxMessageSchema. */
export function validateMailboxMessage(data: unknown) {
  return MailboxMessageSchema.safeParse(data)
}

/** Validate an ownership registry against the OwnershipRegistrySchema. */
export function validateOwnershipRegistry(data: unknown) {
  return OwnershipRegistrySchema.safeParse(data)
}

/** Validate a single ownership entry against the OwnershipEntrySchema. */
export function validateOwnershipEntry(data: unknown) {
  return OwnershipEntrySchema.safeParse(data)
}

/** Validate ownership evidence against the OwnershipEvidenceSchema. */
export function validateOwnershipEvidence(data: unknown) {
  return OwnershipEvidenceSchema.safeParse(data)
}

/** Validate security trigger evidence against the SecurityTriggerEvidenceSchema. */
export function validateSecurityTriggerEvidence(data: unknown) {
  return SecurityTriggerEvidenceSchema.safeParse(data)
}

// ---------------------------------------------------------------------------
// Global ownership path-coverage helper
// ---------------------------------------------------------------------------

/**
 * Given a whole-work-item changed-file path list and an ownership registry,
 * returns the subset of changed-file paths that are NOT covered by any active
 * ownership entry's exact target path.
 *
 * Pure: no filesystem I/O, no glob expansion, no directory prefix expansion,
 * no task attribution, no operation checking.
 *
 * Uses exact string equality on repo-relative paths. Only considers entries
 * with status "active". Released/blocked/violated entries are skipped.
 */
export function findUnownedChangedFiles(
  changedFiles: string[],
  registry: { entries: Array<{ target: string; status: string }> },
): string[] {
  const activeTargets = new Set(
    registry.entries
      .filter((e) => e.status === "active")
      .map((e) => e.target),
  )

  return changedFiles.filter((f) => !activeTargets.has(f))
}

// ---------------------------------------------------------------------------
// Omitted-evidence helper
// ---------------------------------------------------------------------------

/**
 * Given a list of file paths that should be covered (e.g.
 * task_local_changed_files or preexisting_changed_files_touched) and a list
 * of paths that are covered (e.g. changed_files[].path), returns the subset
 * of requiredPaths that are missing from coveredPaths.
 *
 * Pure: no filesystem I/O, no git access.
 */
export function findOmittedOwnershipEntries(
  requiredPaths: string[],
  coveredPaths: string[],
): string[] {
  const covered = new Set(coveredPaths)
  return requiredPaths.filter((p) => !covered.has(p))
}
