# Context System Design

Use this reference to choose files and assign one durable owner to each kind of project truth.

## Adaptive bundles

### Day-0 greenfield repository

Create exactly:

```text
AGENTS.md            # planned scope, stack, commands with Planned markers, flip trigger
README.md            # human-facing seed with an explicit status line
docs/decisions.md    # the initial stack decision and rationale
```

Everything else waits for its trigger. See [greenfield-bootstrap.md](greenfield-bootstrap.md) for intake, seeding, and the first-refresh contract.

### Small repository

Create or maintain only:

```text
AGENTS.md
README.md
```

Add an Agent-specific entry file only when that host does not load `AGENTS.md` or needs unique guidance.

### Growing product repository

Use:

```text
AGENTS.md
PLANS.md                  # only for long-running implementation plans
docs/context-index.md
docs/architecture.md
docs/decisions.md
docs/development-log.md   # milestones, not commit history
```

### Monorepo

Keep a root instruction file and add nested files only where rules differ:

```text
AGENTS.md
apps/web/AGENTS.md
services/api/AGENTS.md
packages/shared/AGENTS.md
```

Do not repeat root rules in nested files. State only overrides and local commands.

## File responsibilities

### Primary instruction file

Owns the information an agent needs during most tasks:

- one-paragraph project overview
- current scope and non-goals
- main architecture boundaries
- short repository map
- verified commands
- coding, security, dependency, and approval rules
- task workflow, context update triggers, and done definition

Keep it operational. Link to detail instead of embedding long product or architecture prose.

### `docs/context-index.md`

Owns knowledge routing:

- which sources are authoritative
- which are supporting or historical
- the fast onboarding path
- what changes require which docs to be updated

Create it when a new agent cannot tell which of several docs to trust.

### `docs/architecture.md`

Owns the current human-readable system model:

- modules and responsibilities
- request/data/event flow
- storage and security boundaries
- implemented status and known gaps

Do not mix an aspirational target architecture into current module descriptions. Link approved plans separately.

### `docs/decisions.md`

Owns rationale that should survive implementation details:

```md
## YYYY-MM-DD: Decision title

Status: Proposed | Accepted | Superseded

Context:
- Why a choice was required

Decision:
- What was chosen

Consequences:
- Benefits, costs, constraints, and follow-up
```

Do not record routine implementation details.

### `PLANS.md`

Owns the contract for multi-phase or multi-session work:

- objective and non-goals
- phases and acceptance criteria
- assumptions and risks
- progress markers and stop conditions

Keep detailed initiative plans in `docs/plans/` when the repository needs several concurrent plans.

### `docs/development-log.md`

Owns concise context-changing milestones:

```md
## YYYY-MM-DD

### Changed
- Durable change

### Why it matters
- User or future-agent impact

### Follow-up
- Remaining work, if any
```

Do not duplicate git history or list line-by-line edits.

## Cross-agent adapters

Treat project facts as a shared layer and Agent files as entry points.

### `AGENTS.md`

Prefer this as the canonical operational file when the repository uses Codex or other AGENTS.md-aware tools.

### `CLAUDE.md`

Before creating this file, check whether the installed Claude Code version already loads `AGENTS.md` natively — recent versions do. If it does and there is no Claude-specific guidance, do not create `CLAUDE.md` at all. Otherwise keep only Claude Code-specific behavior here: reference the canonical file and add Claude-specific commands, permission cautions, or navigation.

### `GEMINI.md`

Keep Gemini CLI-specific loading or tool guidance here. Avoid copying the entire primary instruction file.

### `.github/copilot-instructions.md`

Keep Copilot-specific entry guidance here. Project Agent Skills can also live in `.agents/skills` or `.github/skills`.

### Adapter rule

If two files contain the same paragraph, identify the canonical owner and shorten the other file. Exact duplication is a future drift bug.

## Template use

The files under `assets/templates/` are scaffolds. Before using one:

1. Remove irrelevant sections.
2. Replace every placeholder with evidence.
3. Mark unknown commands explicitly.
4. Preserve stronger existing human rules.
5. Verify all paths and commands after adaptation.
