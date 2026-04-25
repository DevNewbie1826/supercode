# supercode

[English README](./README.md)

Supercode는 체계적인 개발 워크플로를 하나의 설치 가능한 모듈로 패키징하는 OpenCode 플러그인입니다. 스테이지 게이트 기반 에이전트, 워크플로 스킬, AST/LSP 인식 도구, 그리고 작은 기본 MCP 서피스를 번들하여 OpenCode 세션이 저장소 로컬 코드에서 계획, 실행, 리뷰, 검증을 조율할 수 있도록 합니다.

## 구조

```text
.
├─ src/
│  ├─ index.ts
│  ├─ agents/
│  │  ├─ definitions/
│  │  ├─ prompt-text/
│  │  └─ registry.ts
│  ├─ hooks/
│  ├─ mcp/
│  ├─ skills/
│  │  ├─ execute/
│  │  ├─ plan/
│  │  ├─ spec/
│  │  └─ todo-sync/
│  ├─ tools/
│  │  ├─ ast/
│  │  ├─ current-time/
│  │  ├─ lsp/
│  │  └─ index.ts
│  └─ __tests__/
├─ docs/
│  ├─ supercode/
│  └─ superpowers/
├─ tsconfig.json
└─ package.json
```

## OpenCode에 설치

이 패키지를 `opencode.json`에 추가하세요:

```json
{
  "plugin": [
    "supercode@git+https://github.com/DevNewbie1826/supercode.git"
  ]
}
```

설정 업데이트 후 OpenCode를 재시작하세요.

## 플러그인 기능

`src/index.ts`는 `SupercodePlugin`을 내보냅니다. 플러그인은 다음을 등록합니다:

1. `src/config-handler.ts`의 `config` 훅
2. `src/tools/index.ts`의 공개 도구 레지스트리
3. `src/hooks/`의 이벤트 및 도구 훅
4. 스킬 부트스트랩 동작을 위한 채팅 메시지 트랜스폼

config 훅은 지원되는 사용자 설정을 보존하면서 내장 MCP 기본값, 내장 에이전트 항목, 패키지된 스킬 경로를 주입합니다.

## 공개 도구

플러그인은 다음 공개 도구 이름을 내보냅니다:

- `ast_grep_search`
- `ast_grep_replace`
- `current_time`
- `lsp_diagnostics`
- `lsp_find_references`
- `lsp_goto_definition`
- `lsp_prepare_rename`
- `lsp_rename`
- `lsp_symbols`

도구 레지스트리는 `src/tools/index.ts`에 정의되어 있습니다.

## 내장 에이전트

Supercode는 다음 내장 에이전트를 번들합니다:

- `code-quality-reviewer`
- `code-spec-reviewer`
- `completion-verifier`
- `executor`
- `explorer`
- `final-reviewer`
- `librarian`
- `orchestrator`
- `plan-challenger`
- `plan-checker`
- `planner`
- `spec-reviewer`
- `systematic-debugger`
- `task-compliance-checker`

정의는 `src/agents/definitions/*.agent.ts`에 위치하며 내장 에이전트 레지스트리에 의해 로드됩니다.

제공되는 세트는 기본 `orchestrator`, `executor`, `explorer`, `librarian`과 같은 구현 및 리서치 헬퍼, 그리고 `planner`, `plan-checker`, `plan-challenger`, `spec-reviewer`, `code-spec-reviewer`, `code-quality-reviewer`, `task-compliance-checker`, `completion-verifier`, `final-reviewer`, `systematic-debugger`와 같은 스테이지 게이트 기반 리뷰 및 검증 에이전트를 중심으로 구성됩니다.

주요 내장 기본값:

- `orchestrator`
  - `mode: "primary"`
  - 기본 색상: `#6A5CFF`
  - 기본 온도: `0.2`
  - 기본 권한:
    - `question: allow`
    - `apply_patch: deny`
- 나머지 번들 에이전트는 `mode: "subagent"`로 등록됩니다

플러그인은 내장 에이전트를 `config.agent`에 병합합니다. 내장 정의에서 플러그인 소유 필드를 작성하고 기존 항목에 이미 존재하는 관련 없는 사용자 정의 필드를 보존합니다.

## 내장 스킬

Supercode는 다음 내장 스킬을 번들합니다:

- `execute`
- `final-review`
- `finish`
- `orchestrator-mediated-research`
- `plan`
- `playwright-cli`
- `pre-execute-alignment`
- `spec`
- `systematic-debugging`
- `test-driven-development`
- `todo-sync`
- `worktree`

플러그인은 해당 경로를 확인할 수 있는 경우 패키지된 `src/skills` 디렉토리를 `config.skills.paths`에 추가합니다.

규칙:

- 기존 사용자 `skills.paths` 항목은 보존됩니다
- 중복 경로는 두 번 추가되지 않습니다
- 패키지 및 복사된 플러그인 레이아웃 모두 스킬 경로 리졸버에 의해 지원됩니다

## 내장 MCP

Supercode는 기본적으로 다음 내장 MCP 서버를 등록합니다:

- `context7`
- `grep_app`
- `websearch`

`websearch`는 항상 등록됩니다. `supercode.json`에 API 키를 제공하면 Supercode가 MCP URL에 주입합니다.

기존 `config.mcp` 항목은 내장 기본값보다 높은 우선순위를 가지므로, 일반 OpenCode 설정을 통해 사용자 정의 MCP 서버를 계속 제공할 수 있습니다.

## supercode.json

Supercode는 다음 위치에서 설정을 읽습니다:

1. 로컬 `.opencode/supercode.json`
2. 전역 `~/.config/opencode/supercode.json`

로컬 설정에 지원되는 Supercode 설정이 포함된 경우 로컬 설정이 전역 설정보다 우선합니다. 로컬 설정이 없거나 지원되는 설정이 없는 경우, 전역 설정이 존재하면 사용됩니다.

내장 에이전트의 경우, Supercode는 내장 정의에서 플러그인 소유 필드(`prompt`, `description`, `mode`, 그리고 `color`, `temperature`, `permission`과 같은 내장 기본값)를 병합하면서 기존 OpenCode 에이전트 항목에 이미 존재하는 관련 없는 사용자 정의 필드를 보존합니다.

`agent.<name>.enabled`가 `false`로 설정된 경우, 출력되는 에이전트 설정은 `disable: true`를 사용합니다.

지원되는 Supercode 설정 형태:

```json
{
  "agent": {
    "executor": {
      "model": "openai/gpt-5.4",
      "variant": "medium"
    },
    "orchestrator": {
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "temperature": 0.2
    }
  },
  "mcp": {
    "websearch": {
      "apiKey": "your-exa-api-key"
    }
  }
}
```

파일이 없는 경우 `websearch`는 기본 키 없는 URL을 사용합니다.

## 결과 에이전트 설정 예시

내장 정의와 위의 로컬 오버라이드 예시를 함께 사용하면, 출력되는 설정에는 14개의 내장 에이전트가 모두 포함됩니다. 각 내장 항목에 대해 플러그인 소유 필드는 번들된 정의에서 가져오고, 제공된 경우 `model`, `variant`, `temperature`, `color`, `permission`과 같은 지원되는 `supercode.json` 값이 적용됩니다.

예시 발췌:

```json
{
  "agent": {
    "orchestrator": {
      "description": "Use as the main user-facing coordinator that drives the full Supercode workflow, delegates to skills and subagents, manages research routing, keeps todo state synced, asks all blocking user questions through the question tool, and enforces all gates.",
      "prompt": "<bundled orchestrator prompt>",
      "mode": "primary",
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "temperature": 0.2,
      "color": "#6A5CFF",
      "permission": {
        "question": "allow",
        "apply_patch": "deny"
      }
    },
    "executor": {
      "description": "Use to implement one assigned task inside the isolated worktree using todo-sync, test-driven-development, AST/LSP-aware editing, scoped code changes, and task verification.",
      "prompt": "<bundled executor prompt>",
      "mode": "subagent",
      "model": "openai/gpt-5.4",
      "variant": "medium",
      "temperature": 0.2,
      "permission": {
        "apply_patch": "deny",
        "edit": "allow",
        "todowrite": "allow"
      }
    }
  }
}
```

나머지 내장 에이전트에도 동일한 병합 패턴이 적용됩니다: `code-quality-reviewer`, `code-spec-reviewer`, `completion-verifier`, `explorer`, `final-reviewer`, `librarian`, `plan-challenger`, `plan-checker`, `planner`, `spec-reviewer`, `systematic-debugger`, `task-compliance-checker`.

## 결과 MCP 설정 예시

사용자 정의 MCP 오버라이드가 없는 경우, 플러그인은 다음을 주입합니다:

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    },
    "grep_app": {
      "type": "remote",
      "url": "https://mcp.grep.app"
    },
    "websearch": {
      "type": "remote",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

사용자 정의 항목은 계속 허용됩니다. 예를 들어, 사용자는 `sequential_thinking`이라는 이름의 MCP 항목을 제공할 수 있습니다. 이는 사용자 정의 설정 항목으로 보존되지만, 내장 기본값으로 등록되지는 않습니다.

## 로컬 설치 및 검증

의존성 설치:

```bash
bun install
```

저장소 검증 실행:

```bash
bun test
bun run typecheck
```

이 명령들은 `package.json`의 저장소 스크립트에 해당합니다.

## 커스터마이즈

- `src/tools/`에 도구를 추가하고 `src/tools/index.ts`에서 내보내기
- `src/skills/`에 내장 스킬 추가
- `src/mcp/`에 내장 MCP 정의 추가
- `src/agents/definitions/`에 `*.agent.ts` 파일 추가
- `src/index.ts`에서 플러그인 훅 확장
- 외부 워크플로가 의존하는 경우 공개 도구 이름을 안정적으로 유지
