/**
 * T01 — Current-Work Artifact Validation (Opt-In)
 *
 * This test file loads real Phase 2 artifacts from disk for a specific
 * WORK_ID and validates them using helper exports from
 * `src/hooks/workflow-artifacts.ts`.
 *
 * It MUST skip when WORK_ID is unset so that normal `bun test` remains
 * stable and does not depend on mutable current-work docs artifacts.
 * The helper module is imported dynamically only when WORK_ID is set,
 * so this file does not fail at import time when the helper module is
 * absent and WORK_ID is unset.
 *
 * Run with:
 *   WORK_ID=20260507-phase2-artifact-state-b4c8 bun test src/__tests__/workflow-artifacts-current-work.test.ts
 *
 * When WORK_ID is unset:
 *   - The helper module is never imported (dynamic import guarded).
 *   - All tests report as skipped.
 *
 * When WORK_ID is set and the helper module does not exist yet:
 *   - Expected FAIL (RED) — T02 will implement it.
 */

import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const WORK_ID = process.env.WORK_ID

const repoRoot = join(import.meta.dir, "..", "..")
const docsDir = WORK_ID ? join(repoRoot, "docs", "supercode", WORK_ID) : ""

// Dynamic helper loader — only called when WORK_ID is set.
// Before T02, this will fail with a module-not-found error inside tests,
// which is the expected RED signal when WORK_ID is set.
async function loadHelpers() {
  return await import("../hooks/workflow-artifacts") as typeof import("../hooks/workflow-artifacts")
}

// When WORK_ID is unset, use describe.skip so nothing executes.
// When WORK_ID is set, use describe so tests run (and may RED if helper is missing).
const describeOptIn = WORK_ID ? describe : describe.skip

describeOptIn(
  `Current-work artifact validation for WORK_ID=${WORK_ID}`,
  () => {
    // Lazily load helpers once; tests share the resolved module.
    let helpers: Awaited<ReturnType<typeof loadHelpers>>

    // Load the helper module inside the active describe block so the
    // dynamic import only runs when WORK_ID is set.
    it("loads helper module", async () => {
      helpers = await loadHelpers()
      expect(helpers).toBeDefined()
    })

    it("docs directory exists", () => {
      expect(existsSync(docsDir), `docs dir must exist: ${docsDir}`).toBe(true)
    })

    // --- evidence.md ---

    it("evidence.md exists and has all required sections", () => {
      const evidencePath = join(docsDir, "evidence.md")
      expect(
        existsSync(evidencePath),
        `evidence.md must exist: ${evidencePath}`,
      ).toBe(true)

      const content = readFileSync(evidencePath, "utf-8")
      const result = helpers.validateEvidenceSections(content)
      expect(result.success, `evidence.md validation: ${!result.success && "error" in result ? result.error : ""}`).toBe(true)
    })

    // --- state.json ---

    it("state.json exists and validates against schema", () => {
      const stateFilePath = join(docsDir, "state.json")
      expect(
        existsSync(stateFilePath),
        `state.json must exist: ${stateFilePath}`,
      ).toBe(true)

      const raw = readFileSync(stateFilePath, "utf-8")
      const parsed = JSON.parse(raw)
      const result = helpers.validateState(parsed)
      expect(result.success, `state.json validation: ${!result.success && "error" in result ? result.error : ""}`).toBe(true)
    })

    it("state.json has correct work_id", () => {
      const stateFilePath = join(docsDir, "state.json")
      const raw = readFileSync(stateFilePath, "utf-8")
      const parsed = JSON.parse(raw)
      expect(parsed.work_id).toBe(WORK_ID)
    })

    // --- ledger.jsonl ---

    it("ledger.jsonl exists and every line validates", () => {
      const ledgerFilePath = join(docsDir, "ledger.jsonl")
      expect(
        existsSync(ledgerFilePath),
        `ledger.jsonl must exist: ${ledgerFilePath}`,
      ).toBe(true)

      const raw = readFileSync(ledgerFilePath, "utf-8")
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)

      expect(lines.length, "ledger.jsonl must have at least one event").toBeGreaterThan(0)

      for (let i = 0; i < lines.length; i++) {
        let parsed: unknown
        try {
          parsed = JSON.parse(lines[i]!)
        } catch {
          expect(false, `ledger.jsonl line ${i + 1}: invalid JSON`).toBe(true)
          return // unreachable but satisfies TS
        }
        const result = helpers.validateLedgerEvent(parsed)
        expect(
          result.success,
          `ledger.jsonl line ${i + 1} validation failed: ${!result.success && "error" in result ? result.error : ""}`,
        ).toBe(true)
      }
    })

    // --- verification/*.json ---

    it("verification/ directory exists", () => {
      const verificationDir = join(docsDir, "verification")
      expect(
        existsSync(verificationDir),
        `verification/ dir must exist: ${verificationDir}`,
      ).toBe(true)
    })

    it("every verification/*.json file validates against schema", () => {
      const verificationDir = join(docsDir, "verification")
      if (!existsSync(verificationDir)) return

      const files = readdirSync(verificationDir)
        .filter((f) => f.endsWith(".json"))

      // It is acceptable to have zero verification files before T05
      for (const file of files) {
        const filePath = join(verificationDir, file)
        const raw = readFileSync(filePath, "utf-8")
        const parsed = JSON.parse(raw)
        const result = helpers.validateVerificationRecord(parsed)
        expect(
          result.success,
          `${file} validation failed: ${!result.success && "error" in result ? result.error : ""}`,
        ).toBe(true)
      }
    })
  },
)
