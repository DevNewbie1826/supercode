/**
 * T01/T06 — Workflow Artifact Schema / Path Helper Tests
 *
 * These tests define the expected contract for `src/hooks/workflow-artifacts.ts`.
 *
 * Coverage:
 *   - Artifact path helpers
 *   - State schema (state.json canonical keys & narrow status values)
 *   - Ledger schema (ledger.jsonl event types, canonical keys, JSONL suitability)
 *   - Verification schema (verification/<task_id>.json keys, statuses)
 *   - evidence.md section validator
 *   - Malformed record rejection
 *   - T06: Helper–skill contract alignment (canonical fields, event types)
 *   - T06: Pure helper verification (no filesystem I/O)
 *   - T06: Negative Phase 3/4 artifact path exclusion
 *
 * All tests use fixtures / in-memory sample data. No disk I/O on mutable
 * current-work artifacts.
 */

import { describe, expect, it } from "bun:test"

// These imports will fail until T02 creates the helper module.
import {
  artifactDir,
  evidencePath,
  statePath,
  ledgerPath,
  verificationPath,
  validateState,
  validateLedgerEvent,
  validateVerificationRecord,
  validateEvidenceSections,
  WorkflowStateSchema,
  LedgerEventSchema,
  VerificationRecordSchema,
  TaskStatusSchema,
  VerificationRecordStatusSchema,
  CommandResultStatusSchema,
} from "../hooks/workflow-artifacts"

// ---------------------------------------------------------------------------
// Fixtures — in-memory sample data
// ---------------------------------------------------------------------------

const WORK_ID = "20260507-test-work-item"

const VALID_STATE = {
  work_id: WORK_ID,
  active_stage: "execute",
  active_gate_or_status: "executing",
  active_task: "T02",
  completed_tasks: [
    {
      task_id: "T00",
      status: "completed",
      verification_record_status: "pre_adoption_unavailable",
    },
    {
      task_id: "T01",
      status: "completed",
      verification_record_status: "verified",
    },
  ],
  blockers: [],
  next_route: "final-review",
  last_updated: "2026-05-07T12:00:00Z",
}

const VALID_LEDGER_EVENT = {
  timestamp: "2026-05-07T12:00:00Z",
  event_type: "task_completed",
  stage: "execute",
  task_id: "T02",
  summary: "Helper module implemented",
  artifact_refs: ["src/hooks/workflow-artifacts.ts"],
}

const VALID_LEDGER_EVENT_NO_TASK = {
  timestamp: "2026-05-07T11:00:00Z",
  event_type: "stage_transition",
  stage: "plan",
  summary: "Transitioned from plan to execute",
  artifact_refs: ["docs/supercode/test/plan.md"],
}

const VALID_VERIFICATION = {
  task_id: "T02",
  status: "completed",
  commands: [
    {
      name: "bun test src/__tests__/workflow-artifacts.test.ts",
      result_status: "pass",
      summary: "All helper tests pass",
      timestamp: "2026-05-07T12:30:00Z",
    },
  ],
  results: [
    {
      name: "bun test src/__tests__/workflow-artifacts.test.ts",
      result_status: "pass",
      summary: "All helper tests pass",
      timestamp: "2026-05-07T12:30:00Z",
    },
  ],
  executor_evidence: "Implemented pure Zod schemas and path helpers",
  reviewer_outcomes: null,
  diagnostics_status: {
    status: "pass",
    summary: "No blocking diagnostics",
  },
  unresolved_concerns: [],
  record_status: "verified",
}

const VALID_EVIDENCE_MD = `# Evidence Packet

## Internal Evidence

- \`src/skills/spec/SKILL.md\` defines the spec artifact path.
- \`src/skills/plan/SKILL.md\` defines plan artifact path.

## External Evidence

- Phase 2 is inspired by prior research on durable context snapshots.

## Checked Scope

- Workflow skill files, todo state utilities, package scripts.

## Unchecked Scope

- Every agent prompt file, all implementation utilities outside todo hooks.

## Unresolved Uncertainty

- None at this time.
`

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

describe("Artifact path helpers", () => {
  it("artifactDir returns docs/supercode/<work_id>/", () => {
    expect(artifactDir(WORK_ID)).toBe(`docs/supercode/${WORK_ID}`)
  })

  it("evidencePath returns docs/supercode/<work_id>/evidence.md", () => {
    expect(evidencePath(WORK_ID)).toBe(`docs/supercode/${WORK_ID}/evidence.md`)
  })

  it("statePath returns docs/supercode/<work_id>/state.json", () => {
    expect(statePath(WORK_ID)).toBe(`docs/supercode/${WORK_ID}/state.json`)
  })

  it("ledgerPath returns docs/supercode/<work_id>/ledger.jsonl", () => {
    expect(ledgerPath(WORK_ID)).toBe(`docs/supercode/${WORK_ID}/ledger.jsonl`)
  })

  it("verificationPath returns docs/supercode/<work_id>/verification/<task_id>.json", () => {
    expect(verificationPath(WORK_ID, "T02")).toBe(
      `docs/supercode/${WORK_ID}/verification/T02.json`,
    )
  })
})

// ---------------------------------------------------------------------------
// State schema
// ---------------------------------------------------------------------------

describe("State schema validation", () => {
  it("accepts valid state with all canonical keys", () => {
    const result = validateState(VALID_STATE)
    expect(result.success).toBe(true)
  })

  it("requires work_id", () => {
    const { work_id: _, ...noWorkId } = VALID_STATE
    const result = validateState(noWorkId)
    expect(result.success).toBe(false)
  })

  it("requires active_stage", () => {
    const { active_stage: _, ...noStage } = VALID_STATE
    const result = validateState(noStage)
    expect(result.success).toBe(false)
  })

  it("requires active_gate_or_status", () => {
    const { active_gate_or_status: _, ...noGate } = VALID_STATE
    const result = validateState(noGate)
    expect(result.success).toBe(false)
  })

  it("allows active_task to be null", () => {
    const result = validateState({ ...VALID_STATE, active_task: null })
    expect(result.success).toBe(true)
  })

  it("rejects active_task when set to empty string", () => {
    const result = validateState({ ...VALID_STATE, active_task: "" })
    expect(result.success).toBe(false)
  })

  it("rejects state without active_task key (key is required even when value is null)", () => {
    const { active_task: _, ...noActiveTask } = VALID_STATE
    const result = validateState(noActiveTask)
    expect(result.success).toBe(false)
  })

  it("requires completed_tasks array", () => {
    const { completed_tasks: _, ...noCompleted } = VALID_STATE
    const result = validateState(noCompleted)
    expect(result.success).toBe(false)
  })

  it("requires completed_tasks entries to have task_id, status, verification_record_status", () => {
    const result = validateState({
      ...VALID_STATE,
      completed_tasks: [{ task_id: "T00" }],
    })
    expect(result.success).toBe(false)
  })

  it("requires blockers array", () => {
    const { blockers: _, ...noBlockers } = VALID_STATE
    const result = validateState(noBlockers)
    expect(result.success).toBe(false)
  })

  it("requires blocker entries to have summary and route_or_status", () => {
    const result = validateState({
      ...VALID_STATE,
      blockers: [{ summary: "Missing dependency" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts blocker entries with summary and route_or_status", () => {
    const result = validateState({
      ...VALID_STATE,
      blockers: [
        { summary: "Missing dependency", route_or_status: "blocked" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("requires next_route", () => {
    const { next_route: _, ...noRoute } = VALID_STATE
    const result = validateState(noRoute)
    expect(result.success).toBe(false)
  })

  it("requires last_updated", () => {
    const { last_updated: _, ...noTimestamp } = VALID_STATE
    const result = validateState(noTimestamp)
    expect(result.success).toBe(false)
  })

  // Narrow status values

  it("rejects invalid task status values", () => {
    const result = validateState({
      ...VALID_STATE,
      completed_tasks: [
        {
          task_id: "T00",
          status: "unknown_status",
          verification_record_status: "verified",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid task status values: pending, in_progress, completed, blocked, skipped", () => {
    const validStatuses = [
      "pending",
      "in_progress",
      "completed",
      "blocked",
      "skipped",
    ] as const
    for (const status of validStatuses) {
      const result = validateState({
        ...VALID_STATE,
        completed_tasks: [
          { task_id: "T00", status, verification_record_status: "verified" },
        ],
      })
      expect(result.success, `status '${status}' should be valid`).toBe(true)
    }
  })

  it("rejects invalid verification_record_status values", () => {
    const result = validateState({
      ...VALID_STATE,
      completed_tasks: [
        {
          task_id: "T00",
          status: "completed",
          verification_record_status: "imaginary_status",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid verification_record_status values: verified, pending, not_applicable, pre_adoption_unavailable, failed", () => {
    const validStatuses = [
      "verified",
      "pending",
      "not_applicable",
      "pre_adoption_unavailable",
      "failed",
    ] as const
    for (const vrs of validStatuses) {
      const result = validateState({
        ...VALID_STATE,
        completed_tasks: [
          { task_id: "T00", status: "completed", verification_record_status: vrs },
        ],
      })
      expect(
        result.success,
        `verification_record_status '${vrs}' should be valid`,
      ).toBe(true)
    }
  })

  it("rejects empty string for active_gate_or_status", () => {
    const result = validateState({
      ...VALID_STATE,
      active_gate_or_status: "",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Ledger schema
// ---------------------------------------------------------------------------

describe("Ledger event schema validation", () => {
  it("accepts valid ledger event with all canonical keys", () => {
    const result = validateLedgerEvent(VALID_LEDGER_EVENT)
    expect(result.success).toBe(true)
  })

  it("accepts valid ledger event without task_id", () => {
    const result = validateLedgerEvent(VALID_LEDGER_EVENT_NO_TASK)
    expect(result.success).toBe(true)
  })

  it("requires timestamp", () => {
    const { timestamp: _, ...noTimestamp } = VALID_LEDGER_EVENT
    const result = validateLedgerEvent(noTimestamp)
    expect(result.success).toBe(false)
  })

  it("requires event_type", () => {
    const { event_type: _, ...noEventType } = VALID_LEDGER_EVENT
    const result = validateLedgerEvent(noEventType)
    expect(result.success).toBe(false)
  })

  it("requires stage", () => {
    const { stage: _, ...noStage } = VALID_LEDGER_EVENT
    const result = validateLedgerEvent(noStage)
    expect(result.success).toBe(false)
  })

  it("requires summary", () => {
    const { summary: _, ...noSummary } = VALID_LEDGER_EVENT
    const result = validateLedgerEvent(noSummary)
    expect(result.success).toBe(false)
  })

  it("requires artifact_refs array", () => {
    const { artifact_refs: _, ...noRefs } = VALID_LEDGER_EVENT
    const result = validateLedgerEvent(noRefs)
    expect(result.success).toBe(false)
  })

  it("rejects empty artifact_refs array", () => {
    const result = validateLedgerEvent({
      ...VALID_LEDGER_EVENT,
      artifact_refs: [],
    })
    expect(result.success).toBe(false)
  })

  it("allows task_id to be null", () => {
    const result = validateLedgerEvent({ ...VALID_LEDGER_EVENT, task_id: null })
    expect(result.success).toBe(true)
  })

  it("allows task_id to be omitted", () => {
    const { task_id: _, ...withoutTask } = VALID_LEDGER_EVENT
    const result = validateLedgerEvent(withoutTask)
    expect(result.success).toBe(true)
  })

  it("rejects task_id when set to empty string", () => {
    const result = validateLedgerEvent({ ...VALID_LEDGER_EVENT, task_id: "" })
    expect(result.success).toBe(false)
  })

  // Minimum required event_type values

  const REQUIRED_EVENT_TYPES = [
    "artifact_initialized",
    "evidence_captured",
    "stage_transition",
    "gate_decision",
    "alignment_decision",
    "task_started",
    "task_completed",
    "task_blocked",
    "artifact_validation",
    "final_review_decision",
    "routed_return",
    "finish_ready",
  ] as const

  for (const eventType of REQUIRED_EVENT_TYPES) {
    it(`accepts minimum required event_type '${eventType}'`, () => {
      const result = validateLedgerEvent({
        ...VALID_LEDGER_EVENT,
        event_type: eventType,
      })
      expect(
        result.success,
        `event_type '${eventType}' should be valid`,
      ).toBe(true)
    })
  }

  it("allows additional event_type strings for future extensibility", () => {
    // Plan states: "The schema may allow additional strings for future
    // workflow events, but tests must cover these minimum required event
    // types." The required types are validated in the loop above. This
    // test confirms the schema does not reject unrecognized event_type
    // values, preserving extensibility.
    const result = validateLedgerEvent({
      ...VALID_LEDGER_EVENT,
      event_type: "custom_future_event",
    })
    expect(result.success).toBe(true)
  })

  it("produces JSON-serializable output suitable for JSONL append", () => {
    const serialized = JSON.stringify(VALID_LEDGER_EVENT)
    const parsed = JSON.parse(serialized)
    const result = validateLedgerEvent(parsed)
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Verification schema
// ---------------------------------------------------------------------------

describe("Verification record schema validation", () => {
  it("accepts valid verification record with all canonical keys", () => {
    const result = validateVerificationRecord(VALID_VERIFICATION)
    expect(result.success).toBe(true)
  })

  it("requires task_id", () => {
    const { task_id: _, ...noTaskId } = VALID_VERIFICATION
    const result = validateVerificationRecord(noTaskId)
    expect(result.success).toBe(false)
  })

  it("requires status", () => {
    const { status: _, ...noStatus } = VALID_VERIFICATION
    const result = validateVerificationRecord(noStatus)
    expect(result.success).toBe(false)
  })

  it("requires commands array", () => {
    const { commands: _, ...noCommands } = VALID_VERIFICATION
    const result = validateVerificationRecord(noCommands)
    expect(result.success).toBe(false)
  })

  it("requires command entries to have name, result_status, summary", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      commands: [{ name: "bun test" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts command entries with name, result_status, summary, and optional timestamp", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      commands: [
        { name: "bun test", result_status: "pass", summary: "Passed" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid command result_status values", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      commands: [
        {
          name: "bun test",
          result_status: "bad_status",
          summary: "Bad",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid command result_status values: pass, fail, not_run, not_applicable", () => {
    const validStatuses = ["pass", "fail", "not_run", "not_applicable"] as const
    for (const rs of validStatuses) {
      const result = validateVerificationRecord({
        ...VALID_VERIFICATION,
        commands: [
          { name: "bun test", result_status: rs, summary: "Test" },
        ],
      })
      expect(result.success, `command result_status '${rs}' should be valid`).toBe(true)
    }
  })

  it("requires results array", () => {
    const { results: _, ...noResults } = VALID_VERIFICATION
    const result = validateVerificationRecord(noResults)
    expect(result.success).toBe(false)
  })

  // --- results entry structure (mirrors commands entry coverage) ---

  it("requires results entries to have name, result_status, summary", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      results: [{ name: "bun test" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts results entries with name, result_status, summary, and optional timestamp", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      results: [
        { name: "bun test", result_status: "pass", summary: "All tests passed" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("accepts results entries with name, result_status, summary, and timestamp", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      results: [
        {
          name: "bun test",
          result_status: "pass",
          summary: "All tests passed",
          timestamp: "2026-05-07T13:00:00Z",
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid results entry result_status values", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      results: [
        {
          name: "bun test",
          result_status: "bad_result_status",
          summary: "Bad",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid results entry result_status values: pass, fail, not_run, not_applicable", () => {
    const validStatuses = ["pass", "fail", "not_run", "not_applicable"] as const
    for (const rs of validStatuses) {
      const result = validateVerificationRecord({
        ...VALID_VERIFICATION,
        results: [
          { name: "bun test", result_status: rs, summary: "Test result" },
        ],
      })
      expect(result.success, `results result_status '${rs}' should be valid`).toBe(true)
    }
  })

  it("rejects results entry missing name", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      results: [{ result_status: "pass", summary: "Missing name" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects results entry missing summary", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      results: [{ name: "bun test", result_status: "pass" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects results entry with empty name", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      results: [{ name: "", result_status: "pass", summary: "Empty name" }],
    })
    expect(result.success).toBe(false)
  })

  it("requires executor_evidence", () => {
    const { executor_evidence: _, ...noExecEvidence } = VALID_VERIFICATION
    const result = validateVerificationRecord(noExecEvidence)
    expect(result.success).toBe(false)
  })

  it("allows reviewer_outcomes to be null", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      reviewer_outcomes: null,
    })
    expect(result.success).toBe(true)
  })

  it("allows reviewer_outcomes to be an empty array", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      reviewer_outcomes: [],
    })
    expect(result.success).toBe(true)
  })

  it("allows reviewer_outcomes to be a pending-like string", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      reviewer_outcomes: "pending",
    })
    expect(result.success).toBe(true)
  })

  it("requires diagnostics_status with status and summary", () => {
    const { diagnostics_status: _, ...noDiag } = VALID_VERIFICATION
    const result = validateVerificationRecord(noDiag)
    expect(result.success).toBe(false)
  })

  it("requires diagnostics_status to have status and summary fields", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      diagnostics_status: { status: "pass" },
    })
    expect(result.success).toBe(false)
  })

  it("accepts diagnostics_status with status and summary", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      diagnostics_status: { status: "pass", summary: "Clean" },
    })
    expect(result.success).toBe(true)
  })

  it("requires unresolved_concerns array", () => {
    const { unresolved_concerns: _, ...noConcerns } = VALID_VERIFICATION
    const result = validateVerificationRecord(noConcerns)
    expect(result.success).toBe(false)
  })

  it("requires record_status", () => {
    const { record_status: _, ...noRecordStatus } = VALID_VERIFICATION
    const result = validateVerificationRecord(noRecordStatus)
    expect(result.success).toBe(false)
  })

  it("accepts all valid record_status values: verified, pending, not_applicable, pre_adoption_unavailable, failed", () => {
    const validStatuses = [
      "verified",
      "pending",
      "not_applicable",
      "pre_adoption_unavailable",
      "failed",
    ] as const
    for (const rs of validStatuses) {
      const result = validateVerificationRecord({
        ...VALID_VERIFICATION,
        record_status: rs,
      })
      expect(result.success, `record_status '${rs}' should be valid`).toBe(true)
    }
  })

  it("rejects invalid record_status values", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      record_status: "imaginary",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid task status values: pending, in_progress, completed, blocked, skipped", () => {
    const validStatuses = [
      "pending",
      "in_progress",
      "completed",
      "blocked",
      "skipped",
    ] as const
    for (const s of validStatuses) {
      const result = validateVerificationRecord({
        ...VALID_VERIFICATION,
        status: s,
      })
      expect(result.success, `task status '${s}' should be valid`).toBe(true)
    }
  })

  it("rejects invalid task status values", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      status: "unknown",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Malformed record rejection
// ---------------------------------------------------------------------------

describe("Malformed record rejection", () => {
  it("rejects state with extra unknown fields but missing required fields", () => {
    const result = validateState({
      random_field: "oops",
      another_field: 42,
    })
    expect(result.success).toBe(false)
  })

  it("rejects ledger event that is a string instead of object", () => {
    const result = validateLedgerEvent("not an object")
    expect(result.success).toBe(false)
  })

  it("rejects verification record that is null", () => {
    const result = validateVerificationRecord(null)
    expect(result.success).toBe(false)
  })

  it("rejects ledger event with empty required fields", () => {
    const result = validateLedgerEvent({
      timestamp: "",
      event_type: "",
      stage: "",
      summary: "",
      artifact_refs: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects verification record with empty task_id", () => {
    const result = validateVerificationRecord({
      ...VALID_VERIFICATION,
      task_id: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects state with numeric active_stage", () => {
    const result = validateState({
      ...VALID_STATE,
      active_stage: 42,
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// evidence.md section validator
// ---------------------------------------------------------------------------

describe("evidence.md section validator", () => {
  it("accepts evidence.md with all required sections", () => {
    const result = validateEvidenceSections(VALID_EVIDENCE_MD)
    expect(result.success).toBe(true)
  })

  it("rejects evidence.md missing Internal Evidence section", () => {
    const noInternal = VALID_EVIDENCE_MD.replace("## Internal Evidence", "## Other Section")
    const result = validateEvidenceSections(noInternal)
    expect(result.success).toBe(false)
  })

  it("rejects evidence.md missing External Evidence section", () => {
    const noExternal = VALID_EVIDENCE_MD.replace("## External Evidence", "## Other Section")
    const result = validateEvidenceSections(noExternal)
    expect(result.success).toBe(false)
  })

  it("rejects evidence.md missing Checked Scope section", () => {
    const noChecked = VALID_EVIDENCE_MD.replace("## Checked Scope", "## Other Section")
    const result = validateEvidenceSections(noChecked)
    expect(result.success).toBe(false)
  })

  it("rejects evidence.md missing Unchecked Scope section", () => {
    const noUnchecked = VALID_EVIDENCE_MD.replace("## Unchecked Scope", "## Other Section")
    const result = validateEvidenceSections(noUnchecked)
    expect(result.success).toBe(false)
  })

  it("rejects evidence.md missing Unresolved Uncertainty section", () => {
    const noUncertainty = VALID_EVIDENCE_MD.replace("## Unresolved Uncertainty", "## Other Section")
    const result = validateEvidenceSections(noUncertainty)
    expect(result.success).toBe(false)
  })

  it("rejects empty markdown", () => {
    const result = validateEvidenceSections("")
    expect(result.success).toBe(false)
  })

  it("is case-insensitive for section headings", () => {
    const lowerMd = VALID_EVIDENCE_MD.toLowerCase()
    const result = validateEvidenceSections(lowerMd)
    expect(result.success).toBe(true)
  })

  it("accepts evidence.md with additional sections beyond the required ones", () => {
    const withExtra =
      VALID_EVIDENCE_MD +
      "\n## Additional Notes\n\nSome extra context here.\n"
    const result = validateEvidenceSections(withExtra)
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// T06: Helper–Skill Contract Alignment
// ---------------------------------------------------------------------------

describe("T06: Helper schemas cover every canonical field tested in skill contracts", () => {
  it("state.json schema includes all canonical keys required by skill contracts", () => {
    const stateShape = WorkflowStateSchema.shape
    const requiredFields = [
      "work_id",
      "active_stage",
      "active_gate_or_status",
      "active_task",
      "completed_tasks",
      "blockers",
      "next_route",
      "last_updated",
    ] as const

    for (const field of requiredFields) {
      expect(
        stateShape[field],
        `WorkflowStateSchema must include canonical key '${field}'`,
      ).toBeDefined()
    }
  })

  it("state.json completed_tasks entries carry task_id, status, and verification_record_status", () => {
    // Validate that completed_tasks array elements have the three required sub-fields
    const stateWithCompletedTasks = validateState({
      ...VALID_STATE,
      completed_tasks: [
        { task_id: "T00", status: "completed", verification_record_status: "pre_adoption_unavailable" },
      ],
    })
    expect(stateWithCompletedTasks.success).toBe(true)

    // Missing any one of the three should fail
    for (const field of ["task_id", "status", "verification_record_status"] as const) {
      const entry = {
        task_id: "T00",
        status: "completed",
        verification_record_status: "verified",
      }
      const { [field]: _, ...incomplete } = entry
      const result = validateState({
        ...VALID_STATE,
        completed_tasks: [incomplete],
      })
      expect(
        result.success,
        `completed_tasks entry missing '${field}' must be rejected`,
      ).toBe(false)
    }
  })

  it("state.json blocker entries carry summary and route_or_status", () => {
    const stateWithBlockers = validateState({
      ...VALID_STATE,
      blockers: [{ summary: "Blocked by X", route_or_status: "waiting" }],
    })
    expect(stateWithBlockers.success).toBe(true)

    // Missing summary or route_or_status should fail
    const missingSummary = validateState({
      ...VALID_STATE,
      blockers: [{ route_or_status: "waiting" }],
    })
    expect(missingSummary.success).toBe(false)

    const missingRoute = validateState({
      ...VALID_STATE,
      blockers: [{ summary: "Blocked" }],
    })
    expect(missingRoute.success).toBe(false)
  })

  it("ledger.jsonl schema includes all canonical event keys required by skill contracts", () => {
    const ledgerShape = LedgerEventSchema.shape
    const requiredFields = [
      "timestamp",
      "event_type",
      "stage",
      "summary",
      "artifact_refs",
    ] as const

    for (const field of requiredFields) {
      expect(
        ledgerShape[field],
        `LedgerEventSchema must include canonical key '${field}'`,
      ).toBeDefined()
    }

    // task_id is optional but must be in the schema
    expect(
      ledgerShape.task_id,
      "LedgerEventSchema must include optional task_id",
    ).toBeDefined()
  })

  it("verification record schema includes all canonical keys required by skill contracts", () => {
    const verShape = VerificationRecordSchema.shape
    const requiredFields = [
      "task_id",
      "status",
      "commands",
      "results",
      "executor_evidence",
      "reviewer_outcomes",
      "diagnostics_status",
      "unresolved_concerns",
      "record_status",
    ] as const

    for (const field of requiredFields) {
      expect(
        verShape[field],
        `VerificationRecordSchema must include canonical key '${field}'`,
      ).toBeDefined()
    }
  })

  it("narrow task status enum matches skill-contract required values", () => {
    const expectedValues = ["pending", "in_progress", "completed", "blocked", "skipped"] as const
    for (const val of expectedValues) {
      const result = TaskStatusSchema.safeParse(val)
      expect(result.success, `TaskStatusSchema must accept '${val}'`).toBe(true)
    }

    const badResult = TaskStatusSchema.safeParse("unknown_status")
    expect(badResult.success, "TaskStatusSchema must reject unknown values").toBe(false)
  })

  it("narrow verification_record_status enum matches skill-contract required values", () => {
    const expectedValues = ["verified", "pending", "not_applicable", "pre_adoption_unavailable", "failed"] as const
    for (const val of expectedValues) {
      const result = VerificationRecordStatusSchema.safeParse(val)
      expect(result.success, `VerificationRecordStatusSchema must accept '${val}'`).toBe(true)
    }

    const badResult = VerificationRecordStatusSchema.safeParse("imaginary")
    expect(badResult.success, "VerificationRecordStatusSchema must reject unknown values").toBe(false)
  })

  it("narrow command/result status enum matches skill-contract required values", () => {
    const expectedValues = ["pass", "fail", "not_run", "not_applicable"] as const
    for (const val of expectedValues) {
      const result = CommandResultStatusSchema.safeParse(val)
      expect(result.success, `CommandResultStatusSchema must accept '${val}'`).toBe(true)
    }

    const badResult = CommandResultStatusSchema.safeParse("bad")
    expect(badResult.success, "CommandResultStatusSchema must reject unknown values").toBe(false)
  })

  it("minimum required ledger event types from skill contracts are all accepted by schema", () => {
    const requiredEventTypes = [
      "artifact_initialized",
      "evidence_captured",
      "stage_transition",
      "gate_decision",
      "alignment_decision",
      "task_started",
      "task_completed",
      "task_blocked",
      "artifact_validation",
      "final_review_decision",
      "routed_return",
      "finish_ready",
    ] as const

    for (const eventType of requiredEventTypes) {
      const result = validateLedgerEvent({
        ...VALID_LEDGER_EVENT,
        event_type: eventType,
      })
      expect(
        result.success,
        `LedgerEventSchema must accept required event_type '${eventType}'`,
      ).toBe(true)
    }
  })

  it("diagnostics_status requires both status and summary fields", () => {
    const validRecord = {
      ...VALID_VERIFICATION,
      diagnostics_status: { status: "pass", summary: "Clean" },
    }
    expect(validateVerificationRecord(validRecord).success).toBe(true)

    const missingSummary = {
      ...VALID_VERIFICATION,
      diagnostics_status: { status: "pass" },
    }
    expect(validateVerificationRecord(missingSummary).success).toBe(false)

    const missingStatus = {
      ...VALID_VERIFICATION,
      diagnostics_status: { summary: "Something" },
    }
    expect(validateVerificationRecord(missingStatus).success).toBe(false)
  })

  it("evidence.md section validator covers all sections required by skill contracts", () => {
    const requiredSections = [
      "internal evidence",
      "external evidence",
      "checked scope",
      "unchecked scope",
      "unresolved uncertainty",
    ] as const

    for (const section of requiredSections) {
      const md = `# Evidence\n## ${section.charAt(0).toUpperCase() + section.slice(1)}\nSome content here.\n`
      // Create complete evidence with all sections
      const fullMd = `# Evidence Packet

## Internal Evidence
- Item 1

## External Evidence
- Item 1

## Checked Scope
- Item 1

## Unchecked Scope
- Item 1

## Unresolved Uncertainty
- Item 1
`
      const result = validateEvidenceSections(fullMd)
      expect(result.success, `Full evidence.md should validate with all sections including '${section}'`).toBe(true)
    }

    // Removing any single required section must fail
    const sections = [
      "## Internal Evidence",
      "## External Evidence",
      "## Checked Scope",
      "## Unchecked Scope",
      "## Unresolved Uncertainty",
    ]
    for (let i = 0; i < sections.length; i++) {
      const partial = sections
        .filter((_, idx) => idx !== i)
        .map((s) => `${s}\n\n- Content\n`)
        .join("\n")
      const result = validateEvidenceSections(`# Evidence Packet\n\n${partial}`)
      expect(
        result.success,
        `Evidence missing '${sections[i]}' section must be rejected`,
      ).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// T06: Pure Helper Verification (no filesystem I/O)
// ---------------------------------------------------------------------------

describe("T06: Helper module is pure — no filesystem I/O", () => {
  it("path helpers return strings without touching the filesystem", () => {
    // Path helpers produce predictable strings; no file access needed
    const workId = "test-pure-path-work"

    expect(typeof artifactDir(workId)).toBe("string")
    expect(typeof evidencePath(workId)).toBe("string")
    expect(typeof statePath(workId)).toBe("string")
    expect(typeof ledgerPath(workId)).toBe("string")
    expect(typeof verificationPath(workId, "T99")).toBe("string")
  })

  it("schema validators accept in-memory data without file reads", () => {
    // All validators work on in-memory objects, not file paths
    expect(validateState(VALID_STATE).success).toBe(true)
    expect(validateLedgerEvent(VALID_LEDGER_EVENT).success).toBe(true)
    expect(validateVerificationRecord(VALID_VERIFICATION).success).toBe(true)
    expect(validateEvidenceSections(VALID_EVIDENCE_MD).success).toBe(true)
  })

  it("helper module source does not import filesystem modules", async () => {
    // Read the helper module source and verify no fs imports
    const fs = await import("node:fs")
    const path = await import("node:path")
    const helperSource = fs.readFileSync(
      path.join(import.meta.dir, "..", "hooks", "workflow-artifacts.ts"),
      "utf-8",
    )

    // Should not import from "node:fs" or "node:fs/promises"
    expect(helperSource).not.toMatch(/from\s+["']node:fs["']/)
    expect(helperSource).not.toMatch(/from\s+["']node:fs\/promises["']/)
    expect(helperSource).not.toMatch(/import\s+.*\bfs\b/)
    expect(helperSource).not.toMatch(/import\s+.*readFile/)
    expect(helperSource).not.toMatch(/import\s+.*writeFile/)
  })
})

// ---------------------------------------------------------------------------
// T06: Negative Phase 3/4 Artifact Path Exclusion
// ---------------------------------------------------------------------------

describe("T06: Path helpers produce only Phase 2 artifact paths — no Phase 3/4 directories", () => {
  const PHASE34_DIR_NAMES = [
    "mailbox",
    "ownership",
    "per-worker",
    "wiki",
    "ultragoal",
    "agents-hierarchy",
    "mcp-embedded",
  ]

  it("artifactDir does not produce Phase 3/4 subdirectories", () => {
    const dir = artifactDir(WORK_ID)
    for (const forbidden of PHASE34_DIR_NAMES) {
      expect(
        dir.toLowerCase(),
        `artifactDir must not contain '${forbidden}'`,
      ).not.toContain(forbidden)
    }
  })

  it("evidencePath does not produce Phase 3/4 paths", () => {
    const p = evidencePath(WORK_ID)
    for (const forbidden of PHASE34_DIR_NAMES) {
      expect(
        p.toLowerCase(),
        `evidencePath must not contain '${forbidden}'`,
      ).not.toContain(forbidden)
    }
  })

  it("statePath does not produce Phase 3/4 paths", () => {
    const p = statePath(WORK_ID)
    for (const forbidden of PHASE34_DIR_NAMES) {
      expect(
        p.toLowerCase(),
        `statePath must not contain '${forbidden}'`,
      ).not.toContain(forbidden)
    }
  })

  it("ledgerPath does not produce Phase 3/4 paths", () => {
    const p = ledgerPath(WORK_ID)
    for (const forbidden of PHASE34_DIR_NAMES) {
      expect(
        p.toLowerCase(),
        `ledgerPath must not contain '${forbidden}'`,
      ).not.toContain(forbidden)
    }
  })

  it("verificationPath does not produce Phase 3/4 paths", () => {
    const p = verificationPath(WORK_ID, "T99")
    for (const forbidden of PHASE34_DIR_NAMES) {
      expect(
        p.toLowerCase(),
        `verificationPath must not contain '${forbidden}'`,
      ).not.toContain(forbidden)
    }
  })

  it("test fixtures contain no Phase 3/4 artifact concepts", () => {
    const allFixtures = [
      JSON.stringify(VALID_STATE),
      JSON.stringify(VALID_LEDGER_EVENT),
      JSON.stringify(VALID_LEDGER_EVENT_NO_TASK),
      JSON.stringify(VALID_VERIFICATION),
      VALID_EVIDENCE_MD,
    ].join(" ")

    const phase34Terms = [
      "mailbox",
      "file ownership registry",
      "per-worker worktree",
      "embedded mcp",
      "hierarchical agents.md",
      "ultragoal",
    ]

    for (const term of phase34Terms) {
      expect(
        allFixtures.toLowerCase(),
        `Test fixtures must not contain Phase 3/4 term '${term}'`,
      ).not.toContain(term.toLowerCase())
    }
  })
})
