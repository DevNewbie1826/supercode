/**
 * T1 — Phase 1 Workflow Gate Hardening Contract Tests
 *
 * These tests read prompt/skill markdown files and assert required Phase 1
 * gate-hardening concepts. They are expected to FAIL (RED) until T2–T5 add
 * the corresponding contract language.
 *
 * Design notes:
 *   - Assertions check required concepts with representative terms, not exact
 *     wording snapshots.
 *   - Required concepts are enforced individually; a match for one required
 *     idea must not satisfy another.
 *   - Where possible, assertions require concepts to appear in the same
 *     semantic section or paragraph to avoid scattered incidental-word matches.
 *   - Each describe block maps to one Phase 1 success criterion from the spec.
 *
 * Generated/snapshot/convention discovery result (T1 step 3):
 *   - No generated prompt registry, snapshot files, __snapshots__ directories,
 *     or prompt index artifacts were found in the repository.
 *   - Agent definitions at src/agents/definitions/*.agent.ts load prompts
 *     directly from src/agents/prompt-text/*.md via readFileSync().trim().
 *   - No generated artifacts require updating when prompt markdown changes.
 */

import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = join(import.meta.dir, "..", "..")

function readRequiredText(relPath: string): string {
  const abs = join(repoRoot, relPath)
  expect(existsSync(abs), `required file is missing: ${relPath}`).toBe(true)
  return readFileSync(abs, "utf-8").toLowerCase()
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

const SPEC_SKILL = "src/skills/spec/SKILL.md"
const SPEC_REVIEWER = "src/agents/prompt-text/spec-reviewer-prompt.md"
const PLAN_SKILL = "src/skills/plan/SKILL.md"
const PLAN_CHECKER = "src/agents/prompt-text/plan-checker-prompt.md"
const PLAN_CHALLENGER = "src/agents/prompt-text/plan-challenger-prompt.md"
const CODE_QUALITY = "src/agents/prompt-text/code-quality-reviewer-prompt.md"
const COMPLETION_VERIFIER = "src/agents/prompt-text/completion-verifier-prompt.md"
const FINAL_REVIEWER = "src/agents/prompt-text/final-reviewer-prompt.md"
const FINAL_REVIEW_SKILL = "src/skills/final-review/SKILL.md"

const specSkill = readRequiredText(SPEC_SKILL)
const specReviewer = readRequiredText(SPEC_REVIEWER)
const planSkill = readRequiredText(PLAN_SKILL)
const planChecker = readRequiredText(PLAN_CHECKER)
const planChallenger = readRequiredText(PLAN_CHALLENGER)
const codeQuality = readRequiredText(CODE_QUALITY)
const completionVerifier = readRequiredText(COMPLETION_VERIFIER)
const finalReviewer = readRequiredText(FINAL_REVIEWER)
const finalReviewSkill = readRequiredText(FINAL_REVIEW_SKILL)

describe("SC1: Spec skill requires a fixed 0/1/2 ambiguity/readiness rubric", () => {
  const readinessSectionHeading = /readiness|ambiguity|rubric|scor/i

  it("spec SKILL.md has a dedicated readiness/rubric section", () => {
    const readinessSection = extractSection(specSkill, readinessSectionHeading)
    expectSectionExists(readinessSection, "spec readiness/rubric")
  })

  it("spec SKILL.md requires fixed numeric levels 0, 1, and 2", () => {
    expectSectionContainsAll(
      specSkill,
      readinessSectionHeading,
      [
        { name: "level 0", pattern: /\b0\b/ },
        { name: "level 1", pattern: /\b1\b/ },
        { name: "level 2", pattern: /\b2\b/ },
        { name: "fixed rubric", pattern: /fixed|rubric|score/ },
      ],
      "spec readiness/rubric",
    )
  })

  it("spec SKILL.md defines level 0 as missing or unclear", () => {
    expectSectionContainsAll(
      specSkill,
      readinessSectionHeading,
      [{ name: "0 means missing/unclear", pattern: /\b0\b\s*(?:=|:|-|—).*?(missing|unclear)/s }],
      "spec readiness/rubric level 0",
    )
  })

  it("spec SKILL.md defines level 1 as partially specified or materially uncertain", () => {
    expectSectionContainsAll(
      specSkill,
      readinessSectionHeading,
      [
        {
          name: "1 means partial/uncertain",
          pattern: /\b1\b\s*(?:=|:|-|—).*?(partial|partially specified|material uncertainty|uncertain)/s,
        },
      ],
      "spec readiness/rubric level 1",
    )
  })

  it("spec SKILL.md defines level 2 as clear enough for the next gate without guessing", () => {
    expectSectionContainsAll(
      specSkill,
      readinessSectionHeading,
      [
        {
          name: "2 means clear/ready without guessing",
          pattern: /\b2\b\s*(?:=|:|-|—).*?(clear|ready).*?(without guessing|without downstream guessing|next gate|act)/s,
        },
      ],
      "spec readiness/rubric level 2",
    )
  })

  it("spec SKILL.md requires each readiness dimension individually", () => {
    expectSectionContainsAll(
      specSkill,
      readinessSectionHeading,
      [
        { name: "intent dimension", pattern: /intent/ },
        { name: "outcome dimension", pattern: /outcome/ },
        { name: "scope dimension", pattern: /scope/ },
        { name: "constraints dimension", pattern: /constraint/ },
        { name: "success criteria dimension", pattern: /success\s+criteria/ },
        { name: "repository context when applicable", pattern: /repository\s+context|repo\s+context|repository\s+reality/ },
      ],
      "spec readiness/rubric dimensions",
    )
  })

  it("spec SKILL.md states the score is a readiness aid, not fake precision", () => {
    expectSectionContainsAll(
      specSkill,
      readinessSectionHeading,
      [
        { name: "readiness aid", pattern: /readiness\s+aid|aid.*readiness/ },
        { name: "not fake precision", pattern: /not.*fake.*precision|fake.*precision.*not|not.*estimation\s+framework/ },
      ],
      "spec readiness/rubric purpose",
    )
  })
})

describe("SC2: Spec-reviewer checks score consistency and planner-blocking uncertainty", () => {
  it("spec-reviewer checks that readiness scoring is present", () => {
    expectSemanticCluster(
      specReviewer,
      [
        { name: "readiness or ambiguity", pattern: /readiness|ambiguity/ },
        { name: "score or rubric", pattern: /score|rubric/ },
        { name: "present or missing", pattern: /present|missing|required/ },
      ],
      "spec-reviewer readiness score presence",
    )
  })

  it("spec-reviewer checks score internal consistency", () => {
    expectSemanticCluster(
      specReviewer,
      [
        { name: "score", pattern: /score|scoring|rubric/ },
        { name: "internal consistency", pattern: /internal.*consisten|consisten.*internal|align|contradict/ },
      ],
      "spec-reviewer readiness score consistency",
    )
  })

  it("spec-reviewer checks unresolved planner-blocking uncertainty", () => {
    expectSemanticCluster(
      specReviewer,
      [
        { name: "planner/planning", pattern: /planner|planning/ },
        { name: "blocking", pattern: /block|prevent|cannot proceed/ },
        { name: "uncertainty", pattern: /uncertainty|ambiguity|guess/ },
      ],
      "spec-reviewer planner-blocking uncertainty",
    )
  })

  it("spec-reviewer checks non-goals when needed to prevent scope drift", () => {
    expectSemanticCluster(
      specReviewer,
      [
        { name: "non-goals", pattern: /non.?goals?/ },
        { name: "scope drift", pattern: /scope\s+drift|drift|scope.*guess/ },
      ],
      "spec-reviewer non-goals scope control",
    )
  })

  it("spec-reviewer checks decision boundaries where autonomy or approval matters", () => {
    expectSemanticCluster(
      specReviewer,
      [
        { name: "decision boundaries", pattern: /decision\s+boundar|boundary.*decision/ },
        { name: "agent autonomy or approval", pattern: /autonom|user\s+approval|downstream.*decide|requires.*approval/ },
      ],
      "spec-reviewer decision boundaries",
    )
  })
})

describe("SC3: Spec skill requires non-goals and decision boundaries when needed", () => {
  it("spec SKILL.md requires non-goals when absence would permit scope drift or guessing", () => {
    expectSemanticCluster(
      specSkill,
      [
        { name: "non-goals", pattern: /non.?goals?/ },
        { name: "required condition", pattern: /required|must|when needed|when absence|omission/ },
        { name: "scope drift or guessing", pattern: /scope\s+drift|drift|downstream\s+guess|guessing/ },
      ],
      "spec skill non-goals conditional requirement",
    )
  })

  it("spec SKILL.md requires decision boundaries for autonomous decisions versus approval/routing", () => {
    expectSemanticCluster(
      specSkill,
      [
        { name: "decision boundaries", pattern: /decision\s+boundar|boundary.*decision/ },
        { name: "autonomous downstream decisions", pattern: /autonom|downstream.*decide|agents?.*decide/ },
        { name: "approval or routed return", pattern: /user\s+approval|approval|route|routing\s+back/ },
      ],
      "spec skill decision-boundary requirement",
    )
  })
})

describe("SC4: Plan skill and plan-checker require evidence-backed planning", () => {
  it("plan SKILL.md separately requires evidence for repository facts", () => {
    expectSemanticCluster(
      planSkill,
      [
        { name: "evidence", pattern: /evidence/ },
        { name: "repository facts", pattern: /repository\s+(facts?|reality)|repo\s+(facts?|reality)|file\s+targets?|call\s+sites?/ },
      ],
      "plan skill repository evidence",
    )
  })

  it("plan SKILL.md separately requires related-test discovery evidence", () => {
    expectSemanticCluster(
      planSkill,
      [
        { name: "evidence/discovery", pattern: /evidence|discovery|discover/ },
        { name: "related tests", pattern: /related\s+tests?|test\s+conventions?|existing\s+tests?/ },
      ],
      "plan skill related-test evidence",
    )
  })

  it("plan SKILL.md separately requires convention evidence", () => {
    expectSemanticCluster(
      planSkill,
      [
        { name: "evidence", pattern: /evidence|discover|discovery/ },
        { name: "conventions", pattern: /conventions?|patterns?/ },
      ],
      "plan skill convention evidence",
    )
  })

  it("plan SKILL.md separately requires external behavior evidence when material", () => {
    expectSemanticCluster(
      planSkill,
      [
        { name: "evidence", pattern: /evidence|constraints?|behavior/ },
        { name: "external behavior", pattern: /external\s+(behavior|constraints?)|dependency\s+behavior|api\s+behavior|library\s+behavior/ },
      ],
      "plan skill external-behavior evidence",
    )
  })

  it("plan SKILL.md requires checked scope, unchecked scope, and unresolved uncertainty", () => {
    expectAllPatterns(
      planSkill,
      [
        { name: "checked scope", pattern: /checked\s+scope/ },
        { name: "unchecked scope", pattern: /unchecked\s+scope/ },
        { name: "unresolved uncertainty", pattern: /unresolved\s+uncertainty/ },
      ],
      "plan skill evidence reporting",
    )
  })

  it("plan-checker separately blocks unsupported repository assumptions", () => {
    expectSemanticCluster(
      planChecker,
      [
        { name: "block/reject", pattern: /block|reject|fail/ },
        { name: "unsupported assumptions", pattern: /unsupported\s+assumption|assumption.*unsupported|fake\s+certainty/ },
        { name: "repository facts", pattern: /repository|repo|file\s+target|call\s+site/ },
      ],
      "plan-checker repository evidence blocker",
    )
  })

  it("plan-checker separately blocks missing related-test discovery", () => {
    expectSemanticCluster(
      planChecker,
      [
        { name: "block/reject", pattern: /block|reject|fail/ },
        { name: "missing discovery", pattern: /missing|undiscovered|unsupported/ },
        { name: "related tests", pattern: /related\s+tests?|tests?/ },
      ],
      "plan-checker related-test blocker",
    )
  })

  it("plan-checker separately blocks unsupported convention assumptions", () => {
    expectSemanticCluster(
      planChecker,
      [
        { name: "block/reject", pattern: /block|reject|fail/ },
        { name: "unsupported/missing", pattern: /unsupported|missing|without\s+evidence/ },
        { name: "conventions", pattern: /conventions?|patterns?/ },
      ],
      "plan-checker convention-evidence blocker",
    )
  })

  it("plan-checker separately blocks unsupported external API/library behavior", () => {
    expectSemanticCluster(
      planChecker,
      [
        { name: "block/reject", pattern: /block|reject|fail/ },
        { name: "unsupported", pattern: /unsupported|without\s+evidence|missing\s+evidence/ },
        { name: "external/API/library behavior", pattern: /external\s+behavior|api\s+behavior|library\s+behavior|external\s+api/ },
      ],
      "plan-checker external-behavior blocker",
    )
  })
})

describe("SC5: Plan-challenger pressure-tests evidence risk", () => {
  it("plan-challenger explicitly pressure-tests evidence risk or unsupported assumptions", () => {
    expectSemanticCluster(
      planChallenger,
      [
        { name: "evidence or support", pattern: /evidence|supported|unsupported/ },
        { name: "risk or fragility", pattern: /risk|fragil|assumption|gap/ },
        { name: "pressure/challenge", pattern: /pressure|stress|challenge|test/ },
      ],
      "plan-challenger evidence-risk pressure test",
    )
  })
})

describe("SC6: Code quality reviewer checks concrete AI-slop/comment-quality patterns", () => {
  const aiSlopPatterns: RequiredPattern[] = [
    { name: "stale TODOs", pattern: /stale\s+todos?|todos?.*stale/ },
    { name: "comments that restate obvious code", pattern: /comments?.*restate.*obvious.*code|restate.*obvious.*code/ },
    { name: "unnecessary AI-assistant prose", pattern: /unnecessary.*ai.?assistant.*prose|ai.?assistant.*prose|ai-generated\s+slop/ },
    { name: "over-explaining trivial logic", pattern: /over.?explaining?\s+trivial\s+logic|over.?explain.*trivial/ },
    { name: "unjustified abstraction layers", pattern: /unjustified\s+abstraction\s+layers?|unnecessary\s+abstraction\s+layers?/ },
    { name: "filler text not tied to maintainability", pattern: /filler\s+text.*maintainability|text.*not\s+tied\s+to\s+maintainability/ },
  ]

  for (const pattern of aiSlopPatterns) {
    it(`code-quality-reviewer checks for '${pattern.name}'`, () => {
      expectAllPatterns(codeQuality, [pattern], "code-quality-reviewer AI-slop criteria")
    })
  }

  it("code-quality-reviewer focuses on changed code and concrete maintainability impact", () => {
    expectSemanticCluster(
      codeQuality,
      [
        { name: "changed code", pattern: /changed\s+code|code\s+changes|diff/ },
        { name: "maintainability impact", pattern: /maintainability\s+impact|impact.*maintainability|concrete\s+maintainability/ },
      ],
      "code-quality-reviewer changed-code slop scope",
    )
  })
})

describe("SC7: Completion-verifier requires fresh, inspected evidence tied to spec and plan", () => {
  it("completion-verifier requires fresh verification output to be run or gathered", () => {
    expectSemanticCluster(
      completionVerifier,
      [
        { name: "fresh", pattern: /fresh/ },
        { name: "run or gathered", pattern: /run|gather|collect/ },
        { name: "verification output/evidence", pattern: /verification|evidence|output/ },
      ],
      "completion-verifier fresh verification collection",
    )
  })

  it("completion-verifier requires verification output to be inspected", () => {
    expectSemanticCluster(
      completionVerifier,
      [
        { name: "inspect", pattern: /inspect|inspected|checking|check/ },
        { name: "output or evidence", pattern: /output|evidence|results?/ },
      ],
      "completion-verifier inspection requirement",
    )
  })

  it("completion-verifier ties evidence to both the approved spec and approved plan", () => {
    expectSemanticCluster(
      completionVerifier,
      [
        { name: "evidence/verification", pattern: /evidence|verification/ },
        { name: "spec", pattern: /spec/ },
        { name: "plan", pattern: /plan/ },
        { name: "tied/mapped/aligned", pattern: /tied|mapped|aligned|against|expectations/ },
      ],
      "completion-verifier spec-and-plan evidence mapping",
    )
  })

  it("completion-verifier rejects stale claims and uninspected output", () => {
    expectAllPatterns(
      completionVerifier,
      [
        { name: "stale claims rejected", pattern: /stale\s+claims?|accept\s+stale\s+claims|stale.*evidence/ },
        { name: "uninspected output rejected", pattern: /uninspected\s+(command\s+)?output|output.*uninspected/ },
      ],
      "completion-verifier stale/uninspected rejection",
    )
  })
})

describe("SC7: Final-reviewer requires independent fresh evidence and classification", () => {
  it("final-reviewer requires independent fresh evidence inspection", () => {
    expectSemanticCluster(
      finalReviewer,
      [
        { name: "independent", pattern: /independent/ },
        { name: "fresh evidence", pattern: /fresh\s+(verification\s+)?evidence/ },
        { name: "inspect", pattern: /inspect|inspected|review|judge/ },
      ],
      "final-reviewer independent evidence inspection",
    )
  })

  it("final-reviewer ties fresh evidence to both the approved spec and approved plan", () => {
    expectSemanticCluster(
      finalReviewer,
      [
        { name: "fresh evidence", pattern: /fresh\s+(verification\s+)?evidence/ },
        { name: "spec", pattern: /spec/ },
        { name: "plan", pattern: /plan/ },
        { name: "against/satisfies/tied", pattern: /against|satisf|tied|mapped|aligned/ },
      ],
      "final-reviewer spec-and-plan evidence mapping",
    )
  })

  it("final-reviewer requires classification of baseline failures vs regressions", () => {
    expectSemanticCluster(
      finalReviewer,
      [
        { name: "baseline", pattern: /baseline/ },
        { name: "regression", pattern: /regression/ },
        { name: "classify", pattern: /classif|distinguish|separate/ },
      ],
      "final-reviewer baseline-vs-regression classification",
    )
  })

  it("final-reviewer rejects stale claims and uninspected verification", () => {
    expectAllPatterns(
      finalReviewer,
      [
        { name: "stale claims", pattern: /stale\s+verification\s+claims|stale\s+claims|claims?.*stale/ },
        { name: "uninspected verification", pattern: /uninspected\s+verification|verification.*uninspected/ },
      ],
      "final-reviewer stale/uninspected rejection",
    )
  })
})

describe("SC7: Final-review skill keeps existing fresh-evidence hard rules without forcing optional T5 changes", () => {
  it("final-review SKILL.md hard rules already require fresh evidence over stale claims", () => {
    expectSectionContainsAll(
      finalReviewSkill,
      /hard rules/i,
      [
        { name: "fresh verification evidence", pattern: /fresh\s+verification\s+evidence|fresh\s+evidence/ },
        { name: "do not trust stale results", pattern: /stale\s+verification|do not trust earlier|do not rely.*summaries/ },
      ],
      "final-review skill existing hard rules",
    )
  })

  it("final-review SKILL.md current completion standard ties completion to approved spec and plan", () => {
    expectSectionContainsAll(
      finalReviewSkill,
      /completion standard/i,
      [
        { name: "approved spec", pattern: /approved\s+spec|spec.*goal/ },
        { name: "approved plan", pattern: /approved\s+plan|satisfies\s+the\s+approved\s+plan/ },
      ],
      "final-review skill existing completion standard",
    )
  })
})
