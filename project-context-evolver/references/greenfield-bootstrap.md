# Greenfield Bootstrap

Use this reference when initializing context for a brand-new repository: empty, freshly `git init`-ed, or holding only unmodified scaffolder output. In this state the codebase cannot supply evidence, so the user's intent becomes the primary source and everything unbuilt is `Planned`.

## Evidence rules without code

1. **User intent outranks everything.** What the user states about goals, stack, and scope is the top evidence tier for a greenfield repository.
2. **Scaffolder output is real evidence.** If `create-next-app`, `cargo new`, `uv init`, or similar already ran, its manifests and scripts are current facts — read them instead of asking.
3. **Unbuilt behavior is `Planned`.** Write `Planned: REST API served by FastAPI`, not `The service exposes a REST API`.
4. **Never invent commands.** A command enters the context only after it exists and ran successfully, or with an explicit `Planned` marker naming the intended tool.
5. **Do not pad.** A day-0 context system is legitimately small. Empty template sections are worse than absent sections.

## Intake checklist

Ask only for items the user has not already stated, in **one bounded round**. If the user declines or answers partially, apply the noted default and mark the fact `Needs confirmation` rather than blocking.

| # | Item | Why it matters | Default if unanswered |
| --- | --- | --- | --- |
| 1 | Product goal and target users | Anchors scope and non-goals | Summarize the user's own words; mark `Needs confirmation` |
| 2 | v1 scope and explicit non-goals | Prevents scope drift in every later session | Non-goals `Unknown` |
| 3 | Language, runtime, framework | Fixes the stack decision record | `Undecided` — record as an open decision |
| 4 | Package manager and test/lint/build tooling | Sources the commands section | `Planned` with the ecosystem default named |
| 5 | Storage, external services, model/agent backends | Defines data and integration boundaries | `None yet` |
| 6 | Security/data constraints (secrets, local-only data, licensing) | Seeds the rules section with real constraints | Standard rules only |
| 7 | Agent hosts to support (Claude Code, Codex, Gemini CLI, Copilot, Cursor) | Decides which adapter files, if any, to create | `AGENTS.md` only |
| 8 | Documentation language | Context files should match the team's working language | Language of the user's request |

Do not ask about anything discoverable from files that already exist. Do not ask more than these items unless the user's answers surface a genuine conflict.

## Day-0 bundle

Create exactly:

```text
AGENTS.md            # scope, planned stack, verified-or-Planned commands, rules, flip trigger
README.md            # human-facing: what this is, status, how to start once it runs
docs/decisions.md    # one entry: the initial stack decision and its rationale
```

Defer until their trigger fires:

- `docs/architecture.md` — first real module boundary exists
- `docs/context-index.md` — several documents compete for authority
- `PLANS.md` — a multi-session implementation plan is approved
- `docs/development-log.md` — first milestone worth explaining beyond git history
- Host adapter files — the host does not load `AGENTS.md` natively **and** host-specific guidance exists

## Seeding rules

- In `AGENTS.md`, keep a visible **Status** line near the top, e.g. `Status: greenfield — no application code yet; Planned facts below await verification.` Remove it at the first flip.
- Seed `docs/decisions.md` with the stack choice even when it feels obvious. Six months later, "why pnpm + Fastify" is exactly the rationale a future agent needs. Use `Status: Proposed` if the user marked the stack tentative.
- Write the flip trigger into the context-evolution section of `AGENTS.md`: *when the first working code, manifest, CI pipeline, or test suite lands, verify or correct every `Planned` fact in this file.*
- If scaffolding exists, run the install command and the cheapest verification (lint, typecheck, or smoke test) before documenting them as current. Report what ran and what stayed `Planned`.

## First refresh contract

The bootstrap is complete only as a seed. The first Refresh after real code lands must:

1. Re-run discovery (step 2 of the main workflow) — it now has files to read.
2. Flip or correct every `Planned` and `Needs confirmation` fact.
3. Remove the greenfield status line.
4. Add `docs/architecture.md` if module boundaries emerged.
5. Report any intake answer that the implementation contradicted, and update the decision log if the stack changed.
