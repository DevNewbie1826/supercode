/**
 * T01 — Phase 3 Coordination Helper Contract Tests
 *
 * These tests define the expected contract for
 * `src/hooks/workflow-coordination-artifacts.ts`.
 *
 * Coverage:
 *   - Mailbox path helper
 *   - Ownership path helper
 *   - Mailbox message schema (all canonical fields, message_type, status)
 *   - Ownership registry schema (work_id, entries, all canonical fields)
 *   - Ownership modes and mode/operation/actor invariants
 *   - Ownership target_type (path only; glob deferred)
 *   - Path constraints (no absolute, no .., no empty segments)
 *   - Shared ownership representation (shared_append, orchestrator)
 *   - Append-only bootstrap creation representation
 *   - Orchestrator ownership representation
 *   - OwnershipEvidenceSchema (per-task verification record evidence)
 *   - Omitted-evidence failure detection
 *   - Global ownership path-coverage helper
 *   - SecurityTriggerEvidenceSchema and SecurityTriggerCategorySchema
 *   - Full VerificationRecordSchema fixture with passthrough Phase 3 fields
 *   - Source-text purity assertion (no fs/shell/runtime imports)
 *
 * All tests use fixtures / in-memory sample data. No disk I/O on mutable
 * current-work artifacts.
 */

import { describe, expect, it } from "bun:test"

// These imports will fail until T02 creates the helper module.
import {
  mailboxPath,
  ownershipPath,
  validateMailboxMessage,
  validateOwnershipRegistry,
  validateOwnershipEntry,
  validateOwnershipEvidence,
  validateSecurityTriggerEvidence,
  findUnownedChangedFiles,
  findOmittedOwnershipEntries,
  MailboxMessageSchema,
  MailboxMessageTypeSchema,
  MailboxStatusSchema,
  OwnershipModeSchema,
  OwnershipStatusSchema,
  OwnershipTargetTypeSchema,
  AllowedOperationSchema,
  OwnershipEntrySchema,
  OwnershipRegistrySchema,
  OwnershipEvidenceSchema,
  SecurityTriggerCategorySchema,
  SecurityTriggerEvidenceSchema,
  AttributionMethodSchema,
  OwnershipCoverageStatusSchema,
} from "../hooks/workflow-coordination-artifacts"

// Re-import VerificationRecordSchema from Phase 2 helper for passthrough test
import { validateVerificationRecord } from "../hooks/workflow-artifacts"

// ---------------------------------------------------------------------------
// Fixtures — in-memory sample data
// ---------------------------------------------------------------------------

const WORK_ID = "20260508-test-phase3-work"

// --- Valid mailbox message fixture ---

const VALID_MAILBOX_MESSAGE = {
  message_id: "msg-test-001",
  thread_id: "thread-test-001",
  timestamp: "2026-05-08T10:00:00Z",
  sender: "orchestrator",
  recipient: "T01",
  message_type: "executor_handoff" as const,
  stage: "execute",
  task_id: "T01",
  summary: "Handoff from orchestrator to T01 for helper contract tests",
  artifact_refs: [
    "docs/supercode/20260508-test-phase3-work/ownership.json",
    "docs/supercode/20260508-test-phase3-work/plan.md",
  ],
  status: "open" as const,
}

const VALID_MAILBOX_MESSAGE_NULL_TASK = {
  ...VALID_MAILBOX_MESSAGE,
  message_id: "msg-test-002",
  task_id: null,
  summary: "Mailbox message without specific task",
}

// --- Valid ownership entry fixture ---

const VALID_OWNERSHIP_ENTRY = {
  entry_id: "own-test-entry-001",
  target: "src/hooks/workflow-coordination-artifacts.ts",
  target_type: "path",
  owner_task_id: "T01",
  mode: "exclusive_write",
  status: "active",
  allowed_operations: ["read", "write", "create"],
  policy_summary: "T01 creates helper contract tests.",
  conflict_notes: [] as string[],
  blocker_refs: [] as string[],
}

// --- Valid ownership registry fixture ---

const VALID_OWNERSHIP_REGISTRY = {
  work_id: WORK_ID,
  entries: [VALID_OWNERSHIP_ENTRY],
}

// --- Valid ownership evidence fixture ---

const VALID_OWNERSHIP_EVIDENCE = {
  task_start_changed_files: [
    "docs/supercode/20260508-test-phase3-work/ownership.json",
  ],
  task_end_changed_files: [
    "docs/supercode/20260508-test-phase3-work/ownership.json",
    "src/__tests__/workflow-coordination-artifacts.test.ts",
  ],
  task_local_changed_files: [
    "src/__tests__/workflow-coordination-artifacts.test.ts",
  ],
  preexisting_changed_files_touched: [] as string[],
  attribution_method: "executor_edit_log",
  attribution_limitations: [] as string[],
  actual_changed_files_source: "git diff --name-only",
  actual_changed_files: [
    "src/__tests__/workflow-coordination-artifacts.test.ts",
  ],
  changed_files: [
    {
      path: "src/__tests__/workflow-coordination-artifacts.test.ts",
      operation: "create",
      ownership_entry_id: "own-T01-helper-test",
      coverage_status: "covered",
    },
  ],
  notes: [] as string[],
}

// --- Valid security trigger evidence fixture ---

const VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED = {
  triggered_categories: [] as string[],
  decision: "not_triggered",
  evidence_refs: [] as string[],
  notes: ["T01 creates test fixtures only; no security-sensitive surface."],
}

const VALID_SECURITY_TRIGGER_EVIDENCE_TRIGGERED = {
  triggered_categories: ["filesystem_mutation"],
  decision: "triggered_evidence_recorded",
  evidence_refs: ["docs/supercode/test/security-review.md"],
  notes: ["Work touches filesystem mutation helper logic."],
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

describe("Phase 3 path helpers", () => {
  it("mailboxPath returns docs/supercode/<work_id>/mailbox.jsonl", () => {
    expect(mailboxPath(WORK_ID)).toBe(
      `docs/supercode/${WORK_ID}/mailbox.jsonl`,
    )
  })

  it("ownershipPath returns docs/supercode/<work_id>/ownership.json", () => {
    expect(ownershipPath(WORK_ID)).toBe(
      `docs/supercode/${WORK_ID}/ownership.json`,
    )
  })
})

// ---------------------------------------------------------------------------
// Mailbox message schema
// ---------------------------------------------------------------------------

describe("Mailbox message schema — valid fixtures", () => {
  it("accepts valid mailbox message with all canonical fields", () => {
    const result = validateMailboxMessage(VALID_MAILBOX_MESSAGE)
    expect(result.success).toBe(true)
  })

  it("accepts mailbox message with task_id set to null", () => {
    const result = validateMailboxMessage(VALID_MAILBOX_MESSAGE_NULL_TASK)
    expect(result.success).toBe(true)
  })

  // All canonical fields presence
  it("schema shape includes all canonical mailbox fields", () => {
    const shape = MailboxMessageSchema.shape
    const requiredFields = [
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
    ] as const
    for (const field of requiredFields) {
      expect(
        shape[field],
        `MailboxMessageSchema must include canonical field '${field}'`,
      ).toBeDefined()
    }
  })
})

describe("Mailbox message schema — all exact message_type values", () => {
  const MESSAGE_TYPES = [
    "research_request",
    "research_response",
    "executor_handoff",
    "reviewer_finding",
    "blocker",
    "route_back_reason",
    "final_review_evidence_gap",
    "status_update",
  ] as const

  for (const mt of MESSAGE_TYPES) {
    it(`accepts message_type '${mt}'`, () => {
      const result = validateMailboxMessage({
        ...VALID_MAILBOX_MESSAGE,
        message_type: mt,
      })
      expect(result.success, `message_type '${mt}' should be valid`).toBe(true)
    })
  }

  it("rejects invalid message_type value", () => {
    const result = validateMailboxMessage({
      ...VALID_MAILBOX_MESSAGE,
      message_type: "invalid_type",
    })
    expect(result.success).toBe(false)
  })
})

describe("Mailbox message schema — all exact status values", () => {
  const STATUSES = [
    "open",
    "acknowledged",
    "resolved",
    "blocked",
    "superseded",
  ] as const

  for (const s of STATUSES) {
    it(`accepts status '${s}'`, () => {
      const result = validateMailboxMessage({
        ...VALID_MAILBOX_MESSAGE,
        status: s,
      })
      expect(result.success, `status '${s}' should be valid`).toBe(true)
    })
  }

  it("rejects invalid status value", () => {
    const result = validateMailboxMessage({
      ...VALID_MAILBOX_MESSAGE,
      status: "invalid_status",
    })
    expect(result.success).toBe(false)
  })
})

describe("Mailbox message schema — invalid fixtures", () => {
  it("rejects message missing message_id", () => {
    const { message_id: _, ...noId } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noId)
    expect(result.success).toBe(false)
  })

  it("rejects message missing thread_id", () => {
    const { thread_id: _, ...noThread } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noThread)
    expect(result.success).toBe(false)
  })

  it("rejects message missing timestamp", () => {
    const { timestamp: _, ...noTs } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noTs)
    expect(result.success).toBe(false)
  })

  it("rejects message missing sender", () => {
    const { sender: _, ...noSender } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noSender)
    expect(result.success).toBe(false)
  })

  it("rejects message missing recipient", () => {
    const { recipient: _, ...noRecipient } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noRecipient)
    expect(result.success).toBe(false)
  })

  it("rejects message missing message_type", () => {
    const { message_type: _, ...noType } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noType)
    expect(result.success).toBe(false)
  })

  it("rejects message missing stage", () => {
    const { stage: _, ...noStage } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noStage)
    expect(result.success).toBe(false)
  })

  it("rejects message missing summary", () => {
    const { summary: _, ...noSummary } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noSummary)
    expect(result.success).toBe(false)
  })

  it("rejects message missing artifact_refs", () => {
    const { artifact_refs: _, ...noRefs } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noRefs)
    expect(result.success).toBe(false)
  })

  it("rejects message missing status", () => {
    const { status: _, ...noStatus } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noStatus)
    expect(result.success).toBe(false)
  })

  it("rejects message with empty string fields", () => {
    const result = validateMailboxMessage({
      ...VALID_MAILBOX_MESSAGE,
      message_id: "",
      thread_id: "",
      timestamp: "",
      sender: "",
      recipient: "",
      stage: "",
      summary: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects message with empty artifact_refs array", () => {
    const result = validateMailboxMessage({
      ...VALID_MAILBOX_MESSAGE,
      artifact_refs: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects message with task_id as empty string", () => {
    const result = validateMailboxMessage({
      ...VALID_MAILBOX_MESSAGE,
      task_id: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects message missing task_id (canonical field must be present even when null)", () => {
    const { task_id: _, ...noTaskId } = VALID_MAILBOX_MESSAGE
    const result = validateMailboxMessage(noTaskId)
    expect(result.success).toBe(false)
  })

  it("rejects non-object input", () => {
    const result = validateMailboxMessage("not an object")
    expect(result.success).toBe(false)
  })

  it("rejects null input", () => {
    const result = validateMailboxMessage(null)
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Ownership registry schema
// ---------------------------------------------------------------------------

describe("Ownership registry schema — valid fixtures", () => {
  it("accepts valid registry with work_id and entries", () => {
    const result = validateOwnershipRegistry(VALID_OWNERSHIP_REGISTRY)
    expect(result.success).toBe(true)
  })

  it("accepts registry with empty entries array", () => {
    const result = validateOwnershipRegistry({ work_id: WORK_ID, entries: [] })
    expect(result.success).toBe(true)
  })

  it("requires work_id", () => {
    const { work_id: _, ...noWorkId } = VALID_OWNERSHIP_REGISTRY
    const result = validateOwnershipRegistry(noWorkId)
    expect(result.success).toBe(false)
  })

  it("requires entries array", () => {
    const { entries: _, ...noEntries } = VALID_OWNERSHIP_REGISTRY
    const result = validateOwnershipRegistry(noEntries)
    expect(result.success).toBe(false)
  })

  it("rejects empty work_id", () => {
    const result = validateOwnershipRegistry({
      ...VALID_OWNERSHIP_REGISTRY,
      work_id: "",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Ownership entry schema — canonical fields
// ---------------------------------------------------------------------------

describe("Ownership entry schema — canonical fields", () => {
  it("accepts valid ownership entry with all canonical fields", () => {
    const result = validateOwnershipEntry(VALID_OWNERSHIP_ENTRY)
    expect(result.success).toBe(true)
  })

  it("schema shape includes all canonical ownership entry fields", () => {
    const shape = OwnershipEntrySchema.shape
    const requiredFields = [
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
    ] as const
    for (const field of requiredFields) {
      expect(
        shape[field],
        `OwnershipEntrySchema must include canonical field '${field}'`,
      ).toBeDefined()
    }
  })

  it("requires entry_id", () => {
    const { entry_id: _, ...noId } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noId)
    expect(result.success).toBe(false)
  })

  it("requires target", () => {
    const { target: _, ...noTarget } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noTarget)
    expect(result.success).toBe(false)
  })

  it("requires target_type", () => {
    const { target_type: _, ...noType } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noType)
    expect(result.success).toBe(false)
  })

  it("requires owner_task_id", () => {
    const { owner_task_id: _, ...noOwner } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noOwner)
    expect(result.success).toBe(false)
  })

  it("requires mode", () => {
    const { mode: _, ...noMode } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noMode)
    expect(result.success).toBe(false)
  })

  it("requires status", () => {
    const { status: _, ...noStatus } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noStatus)
    expect(result.success).toBe(false)
  })

  it("requires allowed_operations", () => {
    const { allowed_operations: _, ...noOps } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noOps)
    expect(result.success).toBe(false)
  })

  it("requires policy_summary", () => {
    const { policy_summary: _, ...noPolicy } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noPolicy)
    expect(result.success).toBe(false)
  })

  it("rejects empty allowed_operations array", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      allowed_operations: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty policy_summary", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      policy_summary: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty entry_id", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty target", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty owner_task_id", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Ownership target_type — path only; glob deferred
// ---------------------------------------------------------------------------

describe("Ownership target_type — exact value 'path' only", () => {
  it("accepts target_type 'path'", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target_type: "path",
    })
    expect(result.success).toBe(true)
  })

  it("rejects target_type 'glob' as Phase 3-2 deferred", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target_type: "glob",
    })
    expect(result.success).toBe(false)
  })

  it("rejects target_type 'directory'", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target_type: "directory",
    })
    expect(result.success).toBe(false)
  })

  it("rejects target_type 'prefix'", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target_type: "prefix",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Ownership modes
// ---------------------------------------------------------------------------

describe("Ownership modes — all exact mode values", () => {
  const MODES = [
    "exclusive_write",
    "shared_append",
    "orchestrator_owned",
    "sequenced_write",
    "read_only",
  ] as const

  for (const mode of MODES) {
    it(`OwnershipModeSchema accepts '${mode}'`, () => {
      const result = OwnershipModeSchema.safeParse(mode)
      expect(result.success, `mode '${mode}' should be valid`).toBe(true)
    })
  }

  it("rejects invalid mode value", () => {
    const result = OwnershipModeSchema.safeParse("shared_write")
    expect(result.success).toBe(false)
  })
})

describe("Ownership status values", () => {
  const STATUSES = ["active", "released", "blocked", "violated"] as const

  for (const s of STATUSES) {
    it(`OwnershipStatusSchema accepts '${s}'`, () => {
      const result = OwnershipStatusSchema.safeParse(s)
      expect(result.success, `status '${s}' should be valid`).toBe(true)
    })
  }

  it("rejects invalid status value", () => {
    const result = OwnershipStatusSchema.safeParse("deleted")
    expect(result.success).toBe(false)
  })
})

describe("AllowedOperation values", () => {
  const OPS = ["read", "write", "append", "create", "delete", "rename"] as const

  for (const op of OPS) {
    it(`AllowedOperationSchema accepts '${op}'`, () => {
      const result = AllowedOperationSchema.safeParse(op)
      expect(result.success, `operation '${op}' should be valid`).toBe(true)
    })
  }

  it("rejects invalid operation value", () => {
    const result = AllowedOperationSchema.safeParse("execute")
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Ownership mode/operation/actor invariant enforcement
// ---------------------------------------------------------------------------

describe("read_only mode invariants", () => {
  it("accepts read_only with allowed_operations exactly ['read'] and task-id owner", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "read_only",
      allowed_operations: ["read"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts read_only with owner_task_id 'orchestrator' for pre-registry provenance", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "read_only",
      allowed_operations: ["read"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects read_only with invalid non-task owner_task_id", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "not-a-task",
      mode: "read_only",
      allowed_operations: ["read"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects read_only with write operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "read_only",
      allowed_operations: ["read", "write"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects read_only with append operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "read_only",
      allowed_operations: ["read", "append"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects read_only with create operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "read_only",
      allowed_operations: ["read", "create"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects read_only with delete operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "read_only",
      allowed_operations: ["read", "delete"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects read_only with rename operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "read_only",
      allowed_operations: ["read", "rename"],
    })
    expect(result.success).toBe(false)
  })
})

describe("exclusive_write mode invariants", () => {
  it("accepts exclusive_write with read/write/create and task-id owner", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "exclusive_write",
      allowed_operations: ["read", "write", "create"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts exclusive_write with read/write/create/delete/rename", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "exclusive_write",
      allowed_operations: ["read", "write", "create", "delete", "rename"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects exclusive_write with append operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "exclusive_write",
      allowed_operations: ["read", "write", "append"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects exclusive_write with invalid non-task owner_task_id", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "not-a-task",
      mode: "exclusive_write",
      allowed_operations: ["read", "write", "create"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects exclusive_write with owner_task_id 'orchestrator' without explicit provenance in policy_summary", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "exclusive_write",
      allowed_operations: ["read", "write", "create"],
      policy_summary: "Some generic summary",
    })
    expect(result.success).toBe(false)
  })

  it("accepts exclusive_write with owner_task_id 'orchestrator' when policy_summary documents provenance", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "exclusive_write",
      allowed_operations: ["read", "write", "create"],
      policy_summary:
        "Pre-registry orchestrator provenance: bootstrap creation entry for append-only artifact before shared_append entries are active.",
    })
    expect(result.success).toBe(true)
  })
})

describe("shared_append mode invariants", () => {
  it("accepts shared_append with allowed_operations exactly ['read', 'append'] and task-id owner", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "shared_append",
      allowed_operations: ["read", "append"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts shared_append with owner_task_id 'orchestrator'", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "shared_append",
      allowed_operations: ["read", "append"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects shared_append with invalid non-task owner_task_id", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "not-a-task",
      mode: "shared_append",
      allowed_operations: ["read", "append"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects shared_append with write operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      allowed_operations: ["read", "append", "write"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects shared_append with delete operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      allowed_operations: ["read", "append", "delete"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects shared_append with create operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      allowed_operations: ["read", "append", "create"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects shared_append with rename operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      allowed_operations: ["read", "append", "rename"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects shared_append with only 'read' (must include append)", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      allowed_operations: ["read"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects shared_append with only 'append' (must include read)", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      allowed_operations: ["append"],
    })
    expect(result.success).toBe(false)
  })
})

describe("orchestrator_owned mode invariants", () => {
  it("accepts orchestrator_owned with owner_task_id 'orchestrator'", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "orchestrator_owned",
      allowed_operations: ["read", "write", "create"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts orchestrator_owned with full operation set", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "orchestrator_owned",
      allowed_operations: [
        "read",
        "write",
        "append",
        "create",
        "delete",
        "rename",
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects orchestrator_owned with non-orchestrator owner_task_id", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "orchestrator_owned",
      allowed_operations: ["read", "write"],
    })
    expect(result.success).toBe(false)
  })
})

describe("sequenced_write mode invariants", () => {
  it("accepts sequenced_write with read/write/create and task-id owner", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "sequenced_write",
      allowed_operations: ["read", "write", "create"],
    })
    expect(result.success).toBe(true)
  })

  it("accepts sequenced_write with read/write/create/delete/rename", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "sequenced_write",
      allowed_operations: ["read", "write", "create", "delete", "rename"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects sequenced_write with append operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "sequenced_write",
      allowed_operations: ["read", "write", "append"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects sequenced_write with invalid non-task owner_task_id", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "not-a-task",
      mode: "sequenced_write",
      allowed_operations: ["read", "write", "create"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects sequenced_write with owner_task_id 'orchestrator' without explicit provenance in policy_summary", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "sequenced_write",
      allowed_operations: ["read", "write", "create"],
      policy_summary: "Generic summary without provenance",
    })
    expect(result.success).toBe(false)
  })

  it("accepts sequenced_write with owner_task_id 'orchestrator' when policy_summary documents provenance", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "sequenced_write",
      allowed_operations: ["read", "write", "create"],
      policy_summary:
        "Pre-registry orchestrator provenance: serial registry bootstrap for ownership.json before T05 validation.",
    })
    expect(result.success).toBe(true)
  })

  it("documents serial-batching contract: multiple sequenced_write entries for the same target require serial batch sequencing and must not be scheduled in the same parallel batch", () => {
    // This test asserts the sequenced_write serial-batching workflow contract.
    // Phase 3-1 does not automate batch conflict preflight — that is a
    // pre-execute-alignment and final-review manual registry/batch check.
    // Both entries are individually valid but represent a serial dependency:
    // the registry must ensure T00 and T05 are never in the same parallel
    // batch for ownership.json.
    const entryT00 = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-ownership-T00",
      target: "docs/supercode/test/ownership.json",
      owner_task_id: "T00",
      mode: "sequenced_write" as const,
      allowed_operations: ["read", "write", "create"],
      policy_summary: "Serial registry lifecycle: T00 creates provisional registry.",
    }
    const entryT05 = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-ownership-T05",
      target: "docs/supercode/test/ownership.json",
      owner_task_id: "T05",
      mode: "sequenced_write" as const,
      allowed_operations: ["read", "write", "create"],
      policy_summary: "Serial registry lifecycle: T05 validates/finalizes after schemas exist.",
    }

    // Both entries are individually valid
    expect(validateOwnershipEntry(entryT00).success).toBe(true)
    expect(validateOwnershipEntry(entryT05).success).toBe(true)

    // Both entries coexist in a registry (schema does not enforce batch
    // sequencing — that is a workflow-level contract)
    const registry = {
      work_id: WORK_ID,
      entries: [entryT00, entryT05],
    }
    expect(validateOwnershipRegistry(registry).success).toBe(true)

    // Contract assertion: entries for the same target with sequenced_write
    // mode MUST be scheduled in serial batches. This is documented here and
    // enforced by pre-execute-alignment / final-review, not by the schema.
    // T00 and T05 for ownership.json must never appear in the same batch.
    expect(entryT00.target).toBe(entryT05.target)
    expect(entryT00.mode).toBe("sequenced_write")
    expect(entryT05.mode).toBe("sequenced_write")
    expect(entryT00.owner_task_id).not.toBe(entryT05.owner_task_id)
  })
})

// ---------------------------------------------------------------------------
// Shared ownership representation
// ---------------------------------------------------------------------------

describe("Shared ownership representation — multiple shared_append entries", () => {
  it("validates multiple shared_append entries for the same target with different owners", () => {
    const sharedEntry1 = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-shared-T01",
      target: "docs/supercode/test/mailbox.jsonl",
      owner_task_id: "T01",
      mode: "shared_append" as const,
      allowed_operations: ["read", "append"],
      policy_summary: "Append-only mailbox records for T01.",
    }
    const sharedEntry2 = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-shared-T02",
      target: "docs/supercode/test/mailbox.jsonl",
      owner_task_id: "T02",
      mode: "shared_append" as const,
      allowed_operations: ["read", "append"],
      policy_summary: "Append-only mailbox records for T02.",
    }
    const sharedEntryOrch = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-shared-orchestrator",
      target: "docs/supercode/test/mailbox.jsonl",
      owner_task_id: "orchestrator",
      mode: "shared_append" as const,
      allowed_operations: ["read", "append"],
      policy_summary: "Append-only mailbox records for orchestrator.",
    }

    expect(validateOwnershipEntry(sharedEntry1).success).toBe(true)
    expect(validateOwnershipEntry(sharedEntry2).success).toBe(true)
    expect(validateOwnershipEntry(sharedEntryOrch).success).toBe(true)

    // All should validate in a registry together
    const registry = {
      work_id: WORK_ID,
      entries: [sharedEntry1, sharedEntry2, sharedEntryOrch],
    }
    expect(validateOwnershipRegistry(registry).success).toBe(true)
  })

  it("shared_append entries must not include create", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      allowed_operations: ["read", "append", "create"],
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Append-only bootstrap creation representation
// ---------------------------------------------------------------------------

describe("Append-only bootstrap creation representation", () => {
  it("accepts a released exclusive_write bootstrap entry with create for append-only file", () => {
    const bootstrapEntry = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-mailbox-bootstrap-T00",
      target: "docs/supercode/test/mailbox.jsonl",
      owner_task_id: "T00",
      mode: "exclusive_write",
      status: "released",
      allowed_operations: ["read", "create", "write"],
      policy_summary:
        "Bootstrap creation entry for mailbox; released after creation.",
    }
    expect(validateOwnershipEntry(bootstrapEntry).success).toBe(true)
  })

  it("accepts active shared_append entries coexisting with a released bootstrap entry", () => {
    const bootstrapEntry = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-mailbox-bootstrap-T00",
      target: "docs/supercode/test/mailbox.jsonl",
      owner_task_id: "T00",
      mode: "exclusive_write",
      status: "released",
      allowed_operations: ["read", "create", "write"],
      policy_summary: "Bootstrap creation entry; released after creation.",
    }
    const sharedEntry = {
      ...VALID_OWNERSHIP_ENTRY,
      entry_id: "own-mailbox-T01",
      target: "docs/supercode/test/mailbox.jsonl",
      owner_task_id: "T01",
      mode: "shared_append",
      status: "active",
      allowed_operations: ["read", "append"],
      policy_summary: "Active append-only entry after bootstrap.",
    }

    const registry = {
      work_id: WORK_ID,
      entries: [bootstrapEntry, sharedEntry],
    }
    expect(validateOwnershipRegistry(registry).success).toBe(true)
  })

  it("rejects active shared_append entry with create operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "shared_append",
      status: "active",
      allowed_operations: ["read", "append", "create"],
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Orchestrator ownership representation
// ---------------------------------------------------------------------------

describe("Orchestrator ownership representation", () => {
  it("accepts orchestrator_owned with owner_task_id 'orchestrator'", () => {
    const entry = {
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "orchestrator_owned",
      allowed_operations: ["read", "write", "create"],
      policy_summary: "Orchestrator-owned workflow state artifact.",
    }
    expect(validateOwnershipEntry(entry).success).toBe(true)
  })

  it("rejects executor-owned entry using orchestrator_owned mode", () => {
    const entry = {
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "T01",
      mode: "orchestrator_owned",
      allowed_operations: ["read", "write"],
      policy_summary: "Invalid: executor cannot own orchestrator_owned.",
    }
    expect(validateOwnershipEntry(entry).success).toBe(false)
  })

  it("rejects exclusive_write with orchestrator owner without provenance", () => {
    const entry = {
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "exclusive_write",
      allowed_operations: ["read", "write", "create"],
      policy_summary: "No provenance documented here.",
    }
    expect(validateOwnershipEntry(entry).success).toBe(false)
  })

  it("rejects sequenced_write with orchestrator owner without provenance", () => {
    const entry = {
      ...VALID_OWNERSHIP_ENTRY,
      owner_task_id: "orchestrator",
      mode: "sequenced_write",
      allowed_operations: ["read", "write", "create"],
      policy_summary: "No provenance documented here either.",
    }
    expect(validateOwnershipEntry(entry).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Invalid ownership entries — path constraints
// ---------------------------------------------------------------------------

describe("Ownership entry path constraints", () => {
  it("rejects absolute path (leading /)", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "/absolute/path/to/file.ts",
    })
    expect(result.success).toBe(false)
  })

  it("rejects path containing .. segment", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "src/../other/file.ts",
    })
    expect(result.success).toBe(false)
  })

  it("rejects path with empty segments (double slashes)", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "src//file.ts",
    })
    expect(result.success).toBe(false)
  })

  it("rejects path with drive/root prefix (C:\\)", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "C:\\Users\\test\\file.ts",
    })
    expect(result.success).toBe(false)
  })

  it("rejects bare drive prefix without separator (C:secret.ts)", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "C:secret.ts",
    })
    expect(result.success).toBe(false)
  })

  it("rejects bare drive prefix alone (C:foo)", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "C:foo",
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid repo-relative path", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "src/hooks/workflow-coordination-artifacts.ts",
    })
    expect(result.success).toBe(true)
  })

  it("accepts path in docs directory", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "docs/supercode/test/ownership.json",
    })
    expect(result.success).toBe(true)
  })

  it("rejects backslash-separated path with traversal", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "src\\..\\secret.ts",
    })
    expect(result.success).toBe(false)
  })

  it("rejects backslash-separated path without traversal", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target: "src\\hooks\\file.ts",
    })
    expect(result.success).toBe(false)
  })
})

describe("Invalid ownership entries — unsupported values", () => {
  it("rejects unsupported target_type", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      target_type: "regex",
    })
    expect(result.success).toBe(false)
  })

  it("rejects unsupported mode", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      mode: "collaborative",
    })
    expect(result.success).toBe(false)
  })

  it("rejects unsupported status", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      status: "pending",
    })
    expect(result.success).toBe(false)
  })

  it("rejects unsupported operation", () => {
    const result = validateOwnershipEntry({
      ...VALID_OWNERSHIP_ENTRY,
      allowed_operations: ["read", "execute"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing owner_task_id field entirely", () => {
    const { owner_task_id: _, ...noOwner } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noOwner)
    expect(result.success).toBe(false)
  })

  it("rejects missing target field entirely", () => {
    const { target: _, ...noTarget } = VALID_OWNERSHIP_ENTRY
    const result = validateOwnershipEntry(noTarget)
    expect(result.success).toBe(false)
  })

  it("directory-prefix assumption: ownership of src/foo does not cover src/foo/bar.ts", () => {
    // This test documents the constraint that ownership entries cover
    // exact paths only. A path helper or schema cannot enforce this
    // at the per-entry level, but the global coverage check must use
    // exact string matching.
    const entry = {
      ...VALID_OWNERSHIP_ENTRY,
      target: "src/foo",
    }
    expect(validateOwnershipEntry(entry).success).toBe(true)

    // Now check that global coverage does NOT match a child path
    const registry = {
      work_id: WORK_ID,
      entries: [entry],
    }
    const changedFiles = ["src/foo/bar.ts"]
    const unowned = findUnownedChangedFiles(changedFiles, registry)
    expect(unowned).toContain("src/foo/bar.ts")
  })
})

// ---------------------------------------------------------------------------
// OwnershipEvidenceSchema
// ---------------------------------------------------------------------------

describe("OwnershipEvidenceSchema — valid fixtures", () => {
  it("accepts valid ownership evidence with all canonical fields", () => {
    const result = validateOwnershipEvidence(VALID_OWNERSHIP_EVIDENCE)
    expect(result.success).toBe(true)
  })

  it("schema shape includes all canonical ownership_evidence fields", () => {
    const shape = OwnershipEvidenceSchema.shape
    const requiredFields = [
      "task_start_changed_files",
      "task_end_changed_files",
      "task_local_changed_files",
      "preexisting_changed_files_touched",
      "attribution_method",
      "attribution_limitations",
      "actual_changed_files_source",
      "actual_changed_files",
      "changed_files",
      "notes",
    ] as const
    for (const field of requiredFields) {
      expect(
        shape[field],
        `OwnershipEvidenceSchema must include canonical field '${field}'`,
      ).toBeDefined()
    }
  })

  it("accepts pre_registry_bootstrap attribution method", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      attribution_method: "pre_registry_bootstrap",
    })
    expect(result.success).toBe(true)
  })

  it("accepts all valid attribution_method values", () => {
    const methods = [
      "executor_edit_log",
      "before_after_snapshot",
      "reviewer_confirmed",
      "pre_registry_bootstrap",
      "not_applicable",
    ] as const
    for (const method of methods) {
      const result = AttributionMethodSchema.safeParse(method)
      expect(
        result.success,
        `attribution_method '${method}' should be valid`,
      ).toBe(true)
    }
  })

  it("rejects invalid attribution_method", () => {
    const result = AttributionMethodSchema.safeParse("magic_detection")
    expect(result.success).toBe(false)
  })
})

describe("OwnershipEvidenceSchema — changed_files entries", () => {
  it("changed_files entries include path, operation, ownership_entry_id, coverage_status", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          path: "src/test.ts",
          operation: "create",
          ownership_entry_id: "own-test-entry",
          coverage_status: "covered",
        },
      ],
    }
    const result = validateOwnershipEvidence(evidence)
    expect(result.success).toBe(true)
  })

  it("accepts all valid coverage_status values", () => {
    const statuses = [
      "covered",
      "uncovered",
      "conflict",
      "not_applicable",
    ] as const
    for (const cs of statuses) {
      const result = OwnershipCoverageStatusSchema.safeParse(cs)
      expect(
        result.success,
        `coverage_status '${cs}' should be valid`,
      ).toBe(true)
    }
  })

  it("rejects invalid coverage_status", () => {
    const result = OwnershipCoverageStatusSchema.safeParse("partial")
    expect(result.success).toBe(false)
  })

  it("accepts changed_files entry with ownership_entry_id null (uncovered)", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          path: "src/unowned.ts",
          operation: "write",
          ownership_entry_id: null,
          coverage_status: "uncovered",
        },
      ],
    }
    const result = validateOwnershipEvidence(evidence)
    expect(result.success).toBe(true)
  })

  it("rejects changed_files entry missing path", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          operation: "write",
          ownership_entry_id: "own-entry",
          coverage_status: "covered",
        },
      ],
    }
    const result = validateOwnershipEvidence(evidence)
    expect(result.success).toBe(false)
  })

  it("rejects changed_files entry missing operation", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          path: "src/test.ts",
          ownership_entry_id: "own-entry",
          coverage_status: "covered",
        },
      ],
    }
    const result = validateOwnershipEvidence(evidence)
    expect(result.success).toBe(false)
  })

  it("rejects changed_files entry missing coverage_status", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          path: "src/test.ts",
          operation: "create",
          ownership_entry_id: "own-entry",
        },
      ],
    }
    const result = validateOwnershipEvidence(evidence)
    expect(result.success).toBe(false)
  })
})

describe("OwnershipEvidenceSchema — invalid fixtures", () => {
  it("rejects evidence missing task_start_changed_files", () => {
    const { task_start_changed_files: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing task_end_changed_files", () => {
    const { task_end_changed_files: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing task_local_changed_files", () => {
    const { task_local_changed_files: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing preexisting_changed_files_touched", () => {
    const { preexisting_changed_files_touched: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing attribution_method", () => {
    const { attribution_method: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing attribution_limitations", () => {
    const { attribution_limitations: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing actual_changed_files_source", () => {
    const { actual_changed_files_source: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing actual_changed_files", () => {
    const { actual_changed_files: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing changed_files", () => {
    const { changed_files: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects evidence missing notes", () => {
    const { notes: _, ...partial } = VALID_OWNERSHIP_EVIDENCE
    const result = validateOwnershipEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects null input", () => {
    const result = validateOwnershipEvidence(null)
    expect(result.success).toBe(false)
  })

  it("rejects absolute paths in ownership evidence path arrays", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      task_local_changed_files: ["/absolute/path.ts"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects parent-directory segments in ownership evidence path arrays", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      task_start_changed_files: ["src/../escape.ts"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects malformed empty path segments in actual_changed_files", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      actual_changed_files: ["src//bad.ts"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects drive-prefixed paths in preexisting_changed_files_touched", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      preexisting_changed_files_touched: ["C:\\Users\\test\\file.ts"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects bare drive-prefixed paths in evidence path arrays", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      actual_changed_files: ["C:secret.ts"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid changed_files[].path values", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          path: "src/../bad.ts",
          operation: "write",
          ownership_entry_id: "own-entry",
          coverage_status: "covered",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects bare drive prefix in changed_files[].path", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          path: "C:foo",
          operation: "write",
          ownership_entry_id: "own-entry",
          coverage_status: "covered",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects backslash-separated path in task_local_changed_files", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      task_local_changed_files: ["src\\hooks\\file.ts"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects backslash traversal in actual_changed_files", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      actual_changed_files: ["src\\..\\secret.ts"],
    })
    expect(result.success).toBe(false)
  })

  it("rejects backslash in changed_files[].path", () => {
    const result = validateOwnershipEvidence({
      ...VALID_OWNERSHIP_EVIDENCE,
      changed_files: [
        {
          path: "src\\hooks\\file.ts",
          operation: "write",
          ownership_entry_id: "own-entry",
          coverage_status: "covered",
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Omitted-evidence failure detection
// ---------------------------------------------------------------------------

describe("Omitted-evidence failure — findOmittedOwnershipEntries", () => {
  it("flags paths in task_local_changed_files missing from changed_files[].path", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      task_local_changed_files: [
        "src/__tests__/test-a.ts",
        "src/__tests__/test-b.ts",
      ],
      changed_files: [
        {
          path: "src/__tests__/test-a.ts",
          operation: "create",
          ownership_entry_id: "own-a",
          coverage_status: "covered",
        },
        // test-b.ts is omitted
      ],
    }

    const omitted = findOmittedOwnershipEntries(
      evidence.task_local_changed_files,
      evidence.changed_files.map((f: { path: string }) => f.path),
    )
    expect(omitted).toContain("src/__tests__/test-b.ts")
    expect(omitted).not.toContain("src/__tests__/test-a.ts")
  })

  it("flags paths in preexisting_changed_files_touched missing from changed_files[].path", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      preexisting_changed_files_touched: ["src/existing.ts"],
      changed_files: [
        // src/existing.ts is omitted from changed_files
      ],
    }

    const omitted = findOmittedOwnershipEntries(
      evidence.preexisting_changed_files_touched,
      evidence.changed_files.map((f: { path: string }) => f.path),
    )
    expect(omitted).toContain("src/existing.ts")
  })

  it("returns empty when all task_local files are covered", () => {
    const evidence = {
      ...VALID_OWNERSHIP_EVIDENCE,
      task_local_changed_files: ["src/test.ts"],
      changed_files: [
        {
          path: "src/test.ts",
          operation: "create",
          ownership_entry_id: "own-test",
          coverage_status: "covered",
        },
      ],
    }

    const omitted = findOmittedOwnershipEntries(
      evidence.task_local_changed_files,
      evidence.changed_files.map((f: { path: string }) => f.path),
    )
    expect(omitted).toEqual([])
  })

  it("returns empty for empty input", () => {
    const omitted = findOmittedOwnershipEntries([], [])
    expect(omitted).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Global ownership path-coverage
// ---------------------------------------------------------------------------

describe("Global ownership path-coverage — findUnownedChangedFiles", () => {
  it("flags changed-file paths not covered by any ownership target", () => {
    const registry = {
      work_id: WORK_ID,
      entries: [
        {
          ...VALID_OWNERSHIP_ENTRY,
          target: "src/hooks/helper.ts",
          status: "active",
        },
        {
          ...VALID_OWNERSHIP_ENTRY,
          entry_id: "own-other",
          target: "src/test.ts",
          status: "active",
        },
      ],
    }

    const changedFiles = [
      "src/hooks/helper.ts",
      "src/test.ts",
      "src/unowned.ts",
      "docs/unowned.md",
    ]

    const unowned = findUnownedChangedFiles(changedFiles, registry)
    expect(unowned).toContain("src/unowned.ts")
    expect(unowned).toContain("docs/unowned.md")
    expect(unowned).not.toContain("src/hooks/helper.ts")
    expect(unowned).not.toContain("src/test.ts")
  })

  it("returns empty when all changed files are owned", () => {
    const registry = {
      work_id: WORK_ID,
      entries: [
        {
          ...VALID_OWNERSHIP_ENTRY,
          target: "src/a.ts",
        },
        {
          ...VALID_OWNERSHIP_ENTRY,
          entry_id: "own-b",
          target: "src/b.ts",
        },
      ],
    }

    const changedFiles = ["src/a.ts", "src/b.ts"]
    const unowned = findUnownedChangedFiles(changedFiles, registry)
    expect(unowned).toEqual([])
  })

  it("returns all paths when registry has no entries", () => {
    const registry = { work_id: WORK_ID, entries: [] }
    const changedFiles = ["src/a.ts", "docs/b.md"]
    const unowned = findUnownedChangedFiles(changedFiles, registry)
    expect(unowned).toEqual(changedFiles)
  })

  it("does not assign task attribution — only flags unowned paths", () => {
    const registry = {
      work_id: WORK_ID,
      entries: [
        {
          ...VALID_OWNERSHIP_ENTRY,
          target: "src/a.ts",
          owner_task_id: "T01",
        },
      ],
    }
    const changedFiles = ["src/a.ts", "src/b.ts"]
    const unowned = findUnownedChangedFiles(changedFiles, registry)
    // Only path coverage, no task attribution
    expect(unowned).toEqual(["src/b.ts"])
  })

  it("uses exact string matching — no directory prefix expansion", () => {
    const registry = {
      work_id: WORK_ID,
      entries: [
        {
          ...VALID_OWNERSHIP_ENTRY,
          target: "src/foo",
        },
      ],
    }
    const changedFiles = ["src/foo", "src/foo/bar.ts"]
    const unowned = findUnownedChangedFiles(changedFiles, registry)
    // src/foo matches exactly, but src/foo/bar.ts does NOT match via prefix
    expect(unowned).toContain("src/foo/bar.ts")
    expect(unowned).not.toContain("src/foo")
  })

  it("skips released entries for path coverage", () => {
    const registry = {
      work_id: WORK_ID,
      entries: [
        {
          ...VALID_OWNERSHIP_ENTRY,
          target: "src/released.ts",
          status: "released",
        },
      ],
    }
    const changedFiles = ["src/released.ts"]
    const unowned = findUnownedChangedFiles(changedFiles, registry)
    expect(unowned).toContain("src/released.ts")
  })
})

// ---------------------------------------------------------------------------
// SecurityTriggerEvidenceSchema
// ---------------------------------------------------------------------------

describe("SecurityTriggerCategorySchema — all exact values", () => {
  const CATEGORIES = [
    "authentication_authorization",
    "secrets_credentials_env_tokens",
    "filesystem_mutation",
    "shell_command_execution",
    "git_operation",
    "network_external_api",
    "dependency_install_update",
    "sandbox_worktree_permission_path",
    "generated_untrusted_input",
  ] as const

  for (const cat of CATEGORIES) {
    it(`accepts category '${cat}'`, () => {
      const result = SecurityTriggerCategorySchema.safeParse(cat)
      expect(result.success, `category '${cat}' should be valid`).toBe(true)
    })
  }

  it("rejects invalid category value", () => {
    const result = SecurityTriggerCategorySchema.safeParse("arbitrary_risk")
    expect(result.success).toBe(false)
  })
})

describe("SecurityTriggerEvidenceSchema — valid fixtures", () => {
  it("accepts not_triggered evidence", () => {
    const result = validateSecurityTriggerEvidence(
      VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED,
    )
    expect(result.success).toBe(true)
  })

  it("accepts triggered_evidence_recorded evidence", () => {
    const result = validateSecurityTriggerEvidence(
      VALID_SECURITY_TRIGGER_EVIDENCE_TRIGGERED,
    )
    expect(result.success).toBe(true)
  })

  it("accepts route_back_required decision", () => {
    const evidence = {
      triggered_categories: ["filesystem_mutation", "shell_command_execution"],
      decision: "route_back_required",
      evidence_refs: ["docs/security-review.md"],
      notes: ["Changes affect shell execution behavior."],
    }
    const result = validateSecurityTriggerEvidence(evidence)
    expect(result.success).toBe(true)
  })

  it("rejects invalid decision value", () => {
    const evidence = {
      triggered_categories: [],
      decision: "maybe_triggered",
      evidence_refs: [],
      notes: [],
    }
    const result = validateSecurityTriggerEvidence(evidence)
    expect(result.success).toBe(false)
  })

  it("rejects missing triggered_categories", () => {
    const { triggered_categories: _, ...partial } =
      VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED
    const result = validateSecurityTriggerEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects missing decision", () => {
    const { decision: _, ...partial } =
      VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED
    const result = validateSecurityTriggerEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects missing evidence_refs", () => {
    const { evidence_refs: _, ...partial } =
      VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED
    const result = validateSecurityTriggerEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects missing notes", () => {
    const { notes: _, ...partial } =
      VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED
    const result = validateSecurityTriggerEvidence(partial)
    expect(result.success).toBe(false)
  })

  it("rejects null input", () => {
    const result = validateSecurityTriggerEvidence(null)
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Full VerificationRecordSchema passthrough with Phase 3 evidence
// ---------------------------------------------------------------------------

describe("VerificationRecordSchema passthrough with Phase 3 evidence", () => {
  const VALID_RECORD_WITH_PHASE3 = {
    task_id: "T01",
    status: "completed",
    commands: [
      {
        name: "bun test src/__tests__/workflow-coordination-artifacts.test.ts",
        result_status: "fail",
        summary: "Tests fail because helper module does not exist yet (RED)",
        timestamp: "2026-05-08T10:00:00Z",
      },
    ],
    results: [
      {
        name: "bun test src/__tests__/workflow-coordination-artifacts.test.ts",
        result_status: "fail",
        summary: "Tests fail because helper module does not exist yet (RED)",
        timestamp: "2026-05-08T10:00:00Z",
      },
    ],
    executor_evidence: "T01 created helper contract tests for Phase 3 coordination.",
    reviewer_outcomes: null,
    diagnostics_status: {
      status: "not_applicable",
      summary: "Test file imports non-existent module; import-time failure expected.",
    },
    unresolved_concerns: [],
    record_status: "pending",
    ownership_evidence: VALID_OWNERSHIP_EVIDENCE,
    security_trigger_evidence: VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED,
  }

  it("Phase 2 VerificationRecordSchema passes with passthrough Phase 3 fields", () => {
    // The base Phase 2 VerificationRecordSchema uses .passthrough(),
    // so it should accept ownership_evidence and security_trigger_evidence
    const result = validateVerificationRecord(VALID_RECORD_WITH_PHASE3)
    expect(result.success).toBe(true)
  })

  it("Phase 3 ownership_evidence validates separately with OwnershipEvidenceSchema", () => {
    const result = validateOwnershipEvidence(
      VALID_RECORD_WITH_PHASE3.ownership_evidence,
    )
    expect(result.success).toBe(true)
  })

  it("Phase 3 security_trigger_evidence validates separately with SecurityTriggerEvidenceSchema", () => {
    const result = validateSecurityTriggerEvidence(
      VALID_RECORD_WITH_PHASE3.security_trigger_evidence,
    )
    expect(result.success).toBe(true)
  })

  it("base VerificationRecordSchema passing alone is NOT sufficient — Phase 3 evidence must also validate", () => {
    // Demonstrate that an invalid ownership_evidence would pass VerificationRecordSchema
    // (because of passthrough) but fail OwnershipEvidenceSchema
    const recordWithInvalidOwnership = {
      ...VALID_RECORD_WITH_PHASE3,
      ownership_evidence: {
        // Missing required fields
        task_start_changed_files: "not_an_array",
      },
    }

    // Phase 2 schema passes (passthrough)
    const baseResult = validateVerificationRecord(recordWithInvalidOwnership)
    expect(baseResult.success).toBe(true)

    // Phase 3 schema catches the invalid evidence
    const evidenceResult = validateOwnershipEvidence(
      recordWithInvalidOwnership.ownership_evidence,
    )
    expect(evidenceResult.success).toBe(false)
  })

  it("invalid security_trigger_evidence passes base schema but fails Phase 3 schema", () => {
    const recordWithInvalidSecurity = {
      ...VALID_RECORD_WITH_PHASE3,
      security_trigger_evidence: {
        decision: "maybe_something",
      },
    }

    // Phase 2 schema passes (passthrough)
    const baseResult = validateVerificationRecord(recordWithInvalidSecurity)
    expect(baseResult.success).toBe(true)

    // Phase 3 schema catches the invalid evidence
    const secResult = validateSecurityTriggerEvidence(
      recordWithInvalidSecurity.security_trigger_evidence,
    )
    expect(secResult.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Source-text purity assertion
// ---------------------------------------------------------------------------

describe("Helper module is pure — no filesystem I/O or runtime dependencies", () => {
  it("path helpers return strings without touching the filesystem", () => {
    const workId = "test-pure-phase3"
    expect(typeof mailboxPath(workId)).toBe("string")
    expect(typeof ownershipPath(workId)).toBe("string")
  })

  it("schema validators accept in-memory data without file reads", () => {
    expect(validateMailboxMessage(VALID_MAILBOX_MESSAGE).success).toBe(true)
    expect(validateOwnershipRegistry(VALID_OWNERSHIP_REGISTRY).success).toBe(
      true,
    )
    expect(validateOwnershipEvidence(VALID_OWNERSHIP_EVIDENCE).success).toBe(
      true,
    )
    expect(
      validateSecurityTriggerEvidence(
        VALID_SECURITY_TRIGGER_EVIDENCE_NOT_TRIGGERED,
      ).success,
    ).toBe(true)
  })

  it("helper module source does not import filesystem/shell/runtime dependencies", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const helperSource = fs.readFileSync(
      path.join(
        import.meta.dir,
        "..",
        "hooks",
        "workflow-coordination-artifacts.ts",
      ),
      "utf-8",
    )

    expect(helperSource).not.toMatch(/from\s+["']node:fs["']/)
    expect(helperSource).not.toMatch(/from\s+["']node:fs\/promises["']/)
    expect(helperSource).not.toMatch(/import\s+.*\bfs\b/)
    expect(helperSource).not.toMatch(/import\s+.*readFile/)
    expect(helperSource).not.toMatch(/import\s+.*writeFile/)
    expect(helperSource).not.toMatch(/from\s+["']node:child_process["']/)
    expect(helperSource).not.toMatch(/import\s+.*child_process/)
    expect(helperSource).not.toMatch(/Bun\.\$/)
    expect(helperSource).not.toMatch(/todowrite/)
  })
})
