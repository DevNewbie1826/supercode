// T1 — Research budget discipline prompt contract
//
// Scoped files (these tests read ONLY these three):
//   - src/skills/research-delegation/SKILL.md
//   - src/agents/prompt-text/explorer-prompt.md
//   - src/agents/prompt-text/librarian-prompt.md
//
// These tests are expected to FAIL (RED) until T2–T4 update the prompt/skill
// markdown. After prompt updates, every assertion should pass (GREEN).
//
// Design notes:
//   - Assertions check for coherent budget contract sections/clusters, not
//     scattered accidental word co-occurrence across distant sections.
//   - Where a dimension must be present, ALL required dimensions are asserted
//     individually — not any one.
//   - Negative guards block "advisory/soft" budget weakening language in all
//     three scoped files.
//   - Section-scoped extraction prevents cross-section accidental matches.
//   - The standard budget report fields must appear as a coherent grouped
//     contract, not as isolated words scattered across different sections.

import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = join(import.meta.dir, "..", "..")

/** Read a required file, failing immediately if it does not exist. */
function readRequiredText(relPath: string): string {
  const abs = join(repoRoot, relPath)
  expect(existsSync(abs), `required file is missing: ${relPath}`).toBe(true)
  return readFileSync(abs, "utf-8")
}

/**
 * Extract the first section whose heading matches `headingPattern`.
 * Returns the heading line plus everything up to (but not including) the
 * next same-level or higher heading, or end-of-string.
 */
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

  return lines.slice(startIdx, endIdx).join("\n").toLowerCase()
}

/**
 * Assert that `text` contains all `requiredPatterns` within a single coherent
 * paragraph (block of non-blank lines). Each pattern must match the SAME
 * paragraph. Throws on failure with a diagnostic message.
 */
function expectAllInOneParagraph(
  text: string,
  requiredPatterns: RegExp[],
  context: string,
): void {
  const paragraphs = text.split(/\n\s*\n/)
  for (const para of paragraphs) {
    if (requiredPatterns.every((p) => p.test(para))) {
      return
    }
  }
  const lines = [
    `${context}`,
    `  No single paragraph contains all required patterns:`,
  ]
  for (const p of requiredPatterns) {
    const matchingParas = paragraphs
      .map((para, idx) => (p.test(para) ? idx : -1))
      .filter((i) => i >= 0)
    lines.push(
      `  • ${p}: found in paragraph(s) ${matchingParas.length > 0 ? matchingParas.join(", ") : "(none)"}`,
    )
  }
  expect(false, lines.join("\n")).toBe(true)
}

/**
 * Assert that `text` does NOT match any of the given advisory/weakening
 * patterns for budget language. Used as a negative guard to block soft-budget
 * wording.
 */
function expectNoAdvisoryBudgetWording(text: string, context: string): void {
  const advisoryPatterns = [
    /budget\s+(is\s+)?(advisory|optional|suggest|soft|best\s+effort|can\s+be\s+exceeded|may\s+be\s+exceeded)/,
    /exceed.*budget.*acceptable|acceptable.*exceed.*budget/,
    /budget\s+(?:can|may|should|will)\s+be\s+expand|can\s+expand.*budget.*after|expand.*budget.*after.*(?:acceptable|fine|ok)/,
    /soft\s+budget|budget\s+guidance|budget\s+hint|budget\s+as\s+guidance/,
  ]
  for (const p of advisoryPatterns) {
    expect(
      text,
      `${context} must not contain advisory/soft budget wording (matched ${p})`,
    ).not.toMatch(p)
  }
}

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------

const SKILL_REL = "src/skills/research-delegation/SKILL.md"
const EXPLORER_REL = "src/agents/prompt-text/explorer-prompt.md"
const LIBRARIAN_REL = "src/agents/prompt-text/librarian-prompt.md"

const skillMd = readRequiredText(SKILL_REL).toLowerCase()
const explorerMd = readRequiredText(EXPLORER_REL).toLowerCase()
const librarianMd = readRequiredText(LIBRARIAN_REL).toLowerCase()

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Research budget discipline prompt contract", () => {
  // ========================================================================
  // 1. Binding budget — not advisory / soft / optional (all 3 files)
  // ========================================================================

  describe("binding budget — not advisory / soft / optional", () => {
    it("SKILL.md budget rules section declares budget as binding", () => {
      const section = extractSection(skillMd, /budget rules/i)
      expect(section.length, "budget rules section must exist").toBeGreaterThan(0)
      expect(
        section,
        "budget rules section must contain 'binding' (not just 'explicit' or 'set')",
      ).toMatch(/binding/)
    })

    it("SKILL.md explicitly rejects advisory/soft budget wording", () => {
      const section = extractSection(skillMd, /budget rules/i)
      expect(section.length, "budget rules section must exist").toBeGreaterThan(0)
      expect(
        section,
        "must say budget is not advisory/optional/suggestion",
      ).toMatch(/not\s+(advisory|optional|a\s+suggestion|a\s+target|soft)|never\s+exceed|must\s+not\s+exceed/)
    })

    it("explorer prompt has no advisory/soft budget wording", () => {
      expectNoAdvisoryBudgetWording(explorerMd, "explorer prompt")
    })

    it("librarian prompt has no advisory/soft budget wording", () => {
      expectNoAdvisoryBudgetWording(librarianMd, "librarian prompt")
    })

    it("SKILL.md has no advisory/soft budget wording", () => {
      expectNoAdvisoryBudgetWording(skillMd, "SKILL.md")
    })
  })

  // ========================================================================
  // 2. Stop-before-exceeding
  // ========================================================================

  describe("stop-before-exceeding", () => {
    it("SKILL.md mandates stopping before exceeding budget", () => {
      const section = extractSection(skillMd, /budget rules/i)
      expect(section.length, "budget rules section must exist").toBeGreaterThan(0)
      expect(
        section,
        "must say 'stop before exceeding' or equivalent",
      ).toMatch(/stop\s+before|before\s+exceed|must\s+not\s+exceed|never\s+exceed/)
    })
  })

  // ========================================================================
  // 3. Additional budget needed as explicit return state
  // ========================================================================

  describe("additional budget needed as explicit return state", () => {
    it("SKILL.md defines 'additional budget needed' as returnable outcome", () => {
      const outputSection = extractSection(skillMd, /output expectations/i)
      const stopSection = extractSection(skillMd, /stop rules/i)
      const combined = outputSection + "\n" + stopSection
      expect(combined.length, "output expectations or stop rules section must exist").toBeGreaterThan(0)
      expect(
        combined,
        "must define 'additional budget needed' as a returnable outcome",
      ).toMatch(/additional_budget_needed|additional\s+budget\s+needed|budget\s+needed|request\s+.*additional\s+budget|insufficient\s+budget/)
    })
  })

  // ========================================================================
  // 4. Standard budget dimensions in delegation contract
  // ========================================================================

  describe("standard budget dimensions in delegation contract", () => {
    const contractSection = extractSection(skillMd, /delegation contract/i)

    it("delegation contract section exists", () => {
      expect(contractSection.length, "delegation contract section must exist").toBeGreaterThan(0)
    })

    it("contract BUDGET field specifies max_files or max files dimension", () => {
      expect(contractSection.length).toBeGreaterThan(0)
      expect(
        contractSection,
        "delegation contract must specify 'max_files' or 'max files'",
      ).toMatch(/max_files|max\s+files/)
    })

    it("contract BUDGET field specifies max_searches or max searches dimension", () => {
      expect(contractSection.length).toBeGreaterThan(0)
      expect(
        contractSection,
        "delegation contract must specify 'max_searches' or 'max searches'",
      ).toMatch(/max_searches|max\s+searches/)
    })

    it("contract BUDGET field specifies max_sources or max references dimension", () => {
      expect(contractSection.length).toBeGreaterThan(0)
      expect(
        contractSection,
        "delegation contract must specify 'max_sources' or 'max references'",
      ).toMatch(/max_sources|max\s+sources|max_references|max\s+references/)
    })
  })

  // ========================================================================
  // 5. Explorer budget dimensions
  // ========================================================================

  describe("explorer budget dimensions", () => {
    const boundedSection = extractSection(explorerMd, /bounded retrieval/i)
    const constraintsSection = extractSection(explorerMd, /constraints/i)
    const candidate = boundedSection.length > 0 ? boundedSection : constraintsSection

    it("has a bounded-retrieval or constraints section", () => {
      expect(candidate.length, "bounded retrieval or constraints section must exist").toBeGreaterThan(0)
    })

    it("covers file reads / file-count dimension", () => {
      expect(candidate.length).toBeGreaterThan(0)
      expect(candidate, "explorer must budget file reads").toMatch(/file\s+read|max\s+files|file\s+count|files?\s*[:=]/)
    })

    it("covers searches / search-patterns dimension", () => {
      expect(candidate.length).toBeGreaterThan(0)
      expect(candidate, "explorer must budget searches/search patterns").toMatch(/search\s+pattern|max\s+searches|search\s+count|searches?\s*[:=]/)
    })

    it("covers tool calls / calls dimension", () => {
      expect(candidate.length).toBeGreaterThan(0)
      expect(candidate, "explorer must budget tool calls").toMatch(/tool\s+call|max\s+calls|call\s+count|calls?\s*[:=]/)
    })

    it("covers returned matches / evidence dimension", () => {
      expect(candidate.length).toBeGreaterThan(0)
      expect(candidate, "explorer must budget returned matches/evidence").toMatch(/returned\s+match|max\s+match|result\s+count|matches?\s*[:=]|evidence\s+limit|evidence\s+bullet/)
    })

    it("covers call-site samples where referenced", () => {
      // call-site samples are an explorer-specific internal budget dimension
      const fullLower = explorerMd
      expect(
        fullLower,
        "explorer prompt must mention call-site samples in a budget context",
      ).toMatch(/call.?[sS]ite.*budget|budget.*call.?[sS]ite|call.?[sS]ite.*sample/)
    })
  })

  // ========================================================================
  // 6. Librarian budget dimensions
  // ========================================================================

  describe("librarian budget dimensions", () => {
    const phase0Section = extractSection(librarianMd, /phase 0/i)
    // Look for the "default budget" area or general budget section
    const fullLower = librarianMd

    it("phase 0 or budget section exists", () => {
      expect(phase0Section.length, "phase 0 section must exist").toBeGreaterThan(0)
    })

    it("covers documentation/source searches dimension", () => {
      expect(fullLower, "librarian must budget documentation/source searches").toMatch(
        /documentation.*search|max\s+searches|source\s+search.*budget|searches?\s+count/,
      )
    })

    it("covers fetched pages / source files / sources dimension", () => {
      expect(fullLower, "librarian must budget fetched pages/source files").toMatch(
        /fetched.*(page|source|file)|max\s+(pages|sources|files)|page\s+count|source\s+file.*budget/,
      )
    })

    it("covers GitHub issue/PR/release lookups dimension", () => {
      expect(fullLower, "librarian must budget GitHub issue/PR/release lookups").toMatch(
        /issue.*lookup|pr.*lookup|release.*lookup|github.*budget|lookups?\s*[:=]/,
      )
    })

    it("covers clones / source reads dimension", () => {
      expect(fullLower, "librarian must budget clones/source reads").toMatch(
        /clone.*budget|budget.*clone|max\s+clone|clone\s+count|source\s+read.*budget/,
      )
    })

    it("covers tool calls / calls dimension", () => {
      expect(fullLower, "librarian must budget tool calls").toMatch(
        /tool\s+call.*budget|budget.*tool\s+call|max\s+calls|call\s+count|calls?\s*[:=]/,
      )
    })
  })

  // ========================================================================
  // 7. Standard budget report fields — coherent grouped contract
  // ========================================================================

  describe("standard budget report fields (coherent grouped contract)", () => {
    // The standard budget report must appear as a coherent group, not as
    // scattered fields. Check the output/result section of each file for
    // all six required fields together.

    const requiredFields = [
      { name: "calls_used", pattern: /calls_used|calls\s+used/ },
      { name: "files_or_sources_used", pattern: /files_or_sources_used|files\s+or\s+sources?\s+used|sources?\s+used/ },
      { name: "budget_limit", pattern: /budget_limit|budget\s+limit/ },
      { name: "budget_followed", pattern: /budget_followed|budget\s+followed/ },
      { name: "if_exceeded", pattern: /if_exceeded|if\s+exceeded/ },
      { name: "additional_budget_needed", pattern: /additional_budget_needed|additional\s+budget\s+needed/ },
    ]

    describe("SKILL.md output expectations section contains all six fields", () => {
      const outputSection = extractSection(skillMd, /output expectations/i)

      for (const field of requiredFields) {
        it(`contains '${field.name}' field`, () => {
          expect(outputSection.length, "output expectations section must exist").toBeGreaterThan(0)
          expect(
            outputSection,
            `output expectations must contain '${field.name}' as a grouped budget report field`,
          ).toMatch(field.pattern)
        })
      }
    })

    describe("explorer prompt contains all six budget report fields in a coherent section", () => {
      // Check structured results section or a budget-report-specific section
      const resultsSection = extractSection(explorerMd, /structured results|budget report|budget\b/i)

      for (const field of requiredFields) {
        it(`contains '${field.name}' field`, () => {
          expect(
            resultsSection.length,
            "explorer must have a structured results or budget report section with budget fields",
          ).toBeGreaterThan(0)
          expect(
            resultsSection,
            `explorer budget report section must contain '${field.name}'`,
          ).toMatch(field.pattern)
        })
      }
    })

    describe("librarian prompt contains all six budget report fields in a coherent section", () => {
      // Check evidence synthesis / mandatory citation / output section
      const synthesisSection = extractSection(librarianMd, /evidence synthesis|budget report|budget\b/i)

      for (const field of requiredFields) {
        it(`contains '${field.name}' field`, () => {
          expect(
            synthesisSection.length,
            "librarian must have an evidence synthesis or budget report section with budget fields",
          ).toBeGreaterThan(0)
          expect(
            synthesisSection,
            `librarian budget report section must contain '${field.name}'`,
          ).toMatch(field.pattern)
        })
      }
    })
  })

  // ========================================================================
  // 8. Three distinct outcome cases
  // ========================================================================

  describe("three distinct budget outcome cases", () => {
    it("SKILL.md enumerates all three outcomes within a single coherent section", () => {
      let candidate = extractSection(skillMd, /budget outcome|outcome.*budget/i)
      if (candidate.length === 0) {
        candidate = extractSection(skillMd, /budget rules/i)
      }

      expect(
        candidate.length,
        "must have a budget outcomes or budget rules section enumerating all three outcomes",
      ).toBeGreaterThan(0)

      // Case 1: within-budget success
      expect(
        candidate,
        "must contain 'budget sufficient' / 'budget followed: true' outcome",
      ).toMatch(/budget\s+sufficient|sufficient\s+budget|budget_followed.*true|within.budget.*success/)

      // Case 2: insufficient-budget stop (budget followed but more needed)
      expect(
        candidate,
        "must contain 'budget exhausted' / 'insufficient' / 'additional budget needed' outcome",
      ).toMatch(/budget\s+exhausted|insufficient.*budget|budget_followed.*true.*additional/)

      // Case 3: scope blocker / scope wrong
      expect(
        candidate,
        "must contain 'scope blocker' outcome",
      ).toMatch(/scope\s+blocker/)
    })

    it("SKILL.md distinguishes budget-insufficient stop from budget violation", () => {
      const combined = extractSection(skillMd, /budget rules/i) + "\n" +
        extractSection(skillMd, /stop rules/i) + "\n" +
        extractSection(skillMd, /output expectations/i)
      expect(combined.length).toBeGreaterThan(0)

      // Budget-insufficient stop is acceptable (budget_followed: true)
      expect(
        combined,
        "must describe insufficient-budget stop as acceptable (budget_followed true, additional budget needed)",
      ).toMatch(/insufficient.*budget|additional\s+budget\s+needed/)

      // Actual violation is NOT acceptable (budget_followed: false)
      expect(
        combined,
        "must describe budget violation with budget_followed false or equivalent",
      ).toMatch(/budget_followed.*false|budget\s+violation|violat.*budget/)
    })
  })

  // ========================================================================
  // 9. budget_followed: false / violation wording
  // ========================================================================

  describe("budget_followed: false / violation wording", () => {
    it("SKILL.md output expectations includes budget_followed: false for violations", () => {
      const outputSection = extractSection(skillMd, /output expectations/i)
      expect(outputSection.length, "output expectations section must exist").toBeGreaterThan(0)
      expect(
        outputSection,
        "must include 'budget_followed: false' or violation wording in output contract",
      ).toMatch(/budget_followed.*false|budget\s+followed.*false|violat/)
    })

    it("explorer prompt includes budget_followed: false or violation wording", () => {
      const resultsSection = extractSection(explorerMd, /structured results|failure conditions|budget/i)
      const candidate = resultsSection.length > 0
        ? resultsSection
        : extractSection(explorerMd, /failure conditions/i)
      expect(candidate.length, "explorer must have results or failure section").toBeGreaterThan(0)
      expect(
        candidate,
        "explorer must include 'budget_followed: false' or budget violation wording",
      ).toMatch(/budget_followed.*false|budget\s+followed.*false|budget\s+violation|violat.*budget/)
    })

    it("librarian prompt includes budget_followed: false or violation wording", () => {
      const synthesisSection = extractSection(librarianMd, /evidence synthesis|budget|communication/i)
      expect(synthesisSection.length, "librarian must have output-related section").toBeGreaterThan(0)
      expect(
        synthesisSection,
        "librarian must include 'budget_followed: false' or budget violation wording",
      ).toMatch(/budget_followed.*false|budget\s+followed.*false|budget\s+violation|violat.*budget/)
    })
  })

  // ========================================================================
  // 10. Contradictory imperative reconciliation — SKILL.md
  // ========================================================================

  describe("contradictory imperative reconciliation", () => {
    it("SKILL.md states budget overrides completeness when they conflict", () => {
      const budgetRulesSection = extractSection(skillMd, /budget rules/i)
      const stopRulesSection = extractSection(skillMd, /stop rules/i)
      const combined = budgetRulesSection + "\n" + stopRulesSection
      expect(combined.length).toBeGreaterThan(0)
      expect(
        combined,
        "must state budget overrides/takes-precedence-over completeness",
      ).toMatch(
        /budget\s+(overrides?|takes\s+precedence|wins\s+over|supersedes|priority\s+over)\s+complet|complet.*conflict.*budget|budget.*conflict.*complet|when\s+budget\s+and\s+complet.*conflict/,
      )
    })

    // --- Explorer reconciliation ---

    it("explorer subordinates parallelism/flooding to binding budget", () => {
      // The explorer currently says "Flood with parallel calls" — this must
      // be reconciled so parallelism applies only within budget.
      const parallelSection = extractSection(explorerMd, /parallel/i)
      const toolSection = extractSection(explorerMd, /tool strategy/i)
      const candidate = parallelSection.length > 0 ? parallelSection : toolSection
      expect(candidate.length, "parallel or tool strategy section must exist").toBeGreaterThan(0)

      // Must say parallelism is within budget / conditional on budget
      expect(
        candidate,
        "explorer parallelism/flooding must be explicitly subordinate to budget",
      ).toMatch(/within\s+budget|budget.*(limit|binding|bound)|parallel.*budget|budget.*parallel/)
    })

    it("explorer completeness and failure are scoped to budget", () => {
      const successSection = extractSection(explorerMd, /success criteria/i)
      expect(successSection.length, "success criteria section must exist").toBeGreaterThan(0)

      // Completeness and budget must be in the same paragraph
      expectAllInOneParagraph(
        successSection,
        [/complet/, /budget/],
        "explorer success criteria must tie completeness to budget in one paragraph",
      )
    })

    it("explorer treats insufficient-budget stop as acceptable result, not failure", () => {
      // The prompt must state that stopping with checked/unchecked scope and
      // additional_budget_needed is valid, not a failure, when budget is insufficient.
      const failureSection = extractSection(explorerMd, /failure conditions/i)
      const boundedSection = extractSection(explorerMd, /bounded retrieval/i)
      const combined = failureSection + "\n" + boundedSection
      expect(combined.length).toBeGreaterThan(0)

      expect(
        combined,
        "explorer must state that insufficient-budget stop with additional_budget_needed is acceptable, not failure",
      ).toMatch(
        /insufficient.*budget.*not.*fail|budget.*insufficient.*acceptable|additional.*budget.*not.*fail|acceptable.*budget.*insuffic/,
      )
    })

    // --- Librarian reconciliation ---

    it("librarian subordinates mandatory discovery/comprehensive-flow to binding budget", () => {
      // The librarian currently has "MANDATORY FIRST STEP" for classification
      // and "ALL tools" for TYPE D. These must be conditional on remaining budget.
      const phase0Section = extractSection(librarianMd, /phase 0/i)
      const phase1Section = extractSection(librarianMd, /phase 1|comprehensive/i)
      const candidate = phase0Section.length > 0 ? phase0Section : phase1Section
      expect(candidate.length, "phase 0 or phase 1 section must exist").toBeGreaterThan(0)

      expect(
        candidate,
        "librarian mandatory discovery/comprehensive flow must be conditional on remaining budget",
      ).toMatch(
        /remaining\s+budget|budget.*(remain|limit|insuffic|bind)|within\s+budget|if\s+budget.*allow|budget.*allow/,
      )
    })

    it("librarian failure-recovery broadening is conditional on budget", () => {
      const recoverySection = extractSection(librarianMd, /failure recovery/i)
      expect(recoverySection.length, "failure recovery section must exist").toBeGreaterThan(0)

      expect(
        recoverySection,
        "librarian failure-recovery broadening must be conditional on budget",
      ).toMatch(/budget|within.*budget|remaining.*budget/)
    })
  })

  // ========================================================================
  // 11. Explorer failure budget-scoping
  // ========================================================================

  describe("explorer failure budget-scoping", () => {
    it("explorer failure conditions list budget overrun as explicit failure", () => {
      const failureSection = extractSection(explorerMd, /failure conditions/i)
      expect(failureSection.length, "failure conditions section must exist").toBeGreaterThan(0)
      expect(
        failureSection,
        "failure conditions must list 'budget overrun', 'budget violation', or 'exceeded budget'",
      ).toMatch(/budget\s*(overrun|violation|exceed|overreach)|overran.*budget|exceeded\s+budget/)
    })
  })

  // ========================================================================
  // 12. Librarian metadata / current_time / tool-call accounting
  // ========================================================================

  describe("librarian metadata and tool-call budget accounting", () => {
    it("current_time call counts toward calls_used / call budget (not toward source/file budgets)", () => {
      // Check the date awareness section for explicit call-budget accounting
      const dateSection = extractSection(librarianMd, /date awareness/i)
      expect(dateSection.length, "date awareness section must exist").toBeGreaterThan(0)

      // current_time and budget/calls_used must be in the same paragraph
      expectAllInOneParagraph(
        dateSection,
        [/current_time/, /budget|calls?_used/],
        "librarian date awareness must mention current_time and budget/calls_used in the same paragraph",
      )
    })

    it("current_time counts toward call budget, NOT toward source/file budgets", () => {
      // Must explicitly state the separation: calls_used yes, files_or_sources_used no
      const dateSection = extractSection(librarianMd, /date awareness/i)
      const phase0Section = extractSection(librarianMd, /phase 0/i)
      const combined = dateSection + "\n" + phase0Section
      expect(combined.length).toBeGreaterThan(0)

      expect(
        combined,
        "must state current_time counts toward calls_used but NOT files_or_sources_used or source/file budgets",
      ).toMatch(
        /current_time.*calls?_used|calls?_used.*current_time|current_time.*call.*budget|call.*budget.*current_time/,
      )
    })

    it("non-tool request classification does NOT count toward budget", () => {
      // The plan says: non-tool request classification does not count.
      // Must have explicit wording that classification/categorization alone
      // is not budget-consuming.
      const phase0Section = extractSection(librarianMd, /phase 0/i)
      expect(phase0Section.length, "phase 0 section must exist").toBeGreaterThan(0)

      expect(
        phase0Section,
        "must state that request classification/categorization itself does not consume budget",
      ).toMatch(
        /classif.*does\s+not.*budget|classif.*not\s+count|categoriz.*not.*budget|classif.*free|non.tool.*not.*budget|does\s+not\s+count.*budget.*classif/,
      )
    })

    it("if required metadata consumes too much call budget, librarian stops rather than continue", () => {
      const phase0Section = extractSection(librarianMd, /phase 0/i)
      const dateSection = extractSection(librarianMd, /date awareness/i)
      const combined = phase0Section + "\n" + dateSection
      expect(combined.length).toBeGreaterThan(0)

      expect(
        combined,
        "must state that if required metadata consumes too much call budget, librarian must stop",
      ).toMatch(
        /metadata.*consum.*budget|insuffic.*call.*budget|metadata.*budget.*stop|remaining.*insuffic|call.*budget.*insuffic/,
      )
    })
  })
})
