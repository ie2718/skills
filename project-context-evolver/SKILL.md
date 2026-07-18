---
name: project-context-evolver
description: Initialize, audit, refresh, and continuously evolve durable repository context for coding agents, including AGENTS.md, CLAUDE.md, GEMINI.md, Copilot instructions, PLANS.md, and docs such as architecture, decisions, context indexes, and development logs. Use when initializing a brand-new (day-0) project or bootstrapping an existing repository for Codex, Claude Code, Gemini CLI, GitHub Copilot, Cursor, or another Agent Skills-compatible host; syncing PRDs, roadmaps, architecture, code, and package scripts into agent guidance; resolving stale or conflicting project instructions; or recording durable context after meaningful changes. Trigger intents include "initialize project context", "set up AGENTS.md / CLAUDE.md", "新项目初始化", "初始化项目上下文". Do not use for ordinary coding when project guidance is unaffected.
---

# Project Context Evolver

Build a small, evidence-backed project context system that future coding agents can trust. Keep the context accurate, portable, and cheaper to read than the source material it summarizes.

## Operating principles

1. **Evidence over aspiration.** Ground commands, paths, boundaries, and behavior in current files. Label planned behavior as planned.
2. **One fact, one owner.** Keep a canonical home for each fact and make Agent-specific files thin adapters instead of synchronized copies.
3. **Progressive disclosure.** Put always-needed rules in the primary instruction file and move detailed architecture, decisions, plans, and history into linked docs.
4. **Preserve strong human guidance.** Edit existing sections before replacing them. Do not weaken safety, approval, testing, or ownership rules without explicit authority.
5. **Minimize the system.** Create only files that have a clear reader, responsibility, and update trigger.
6. **Expose uncertainty.** Write `Unknown`, `Planned`, or `Needs verification` instead of inventing certainty.
7. **Keep changes reviewable.** Prefer focused edits, concise sections, and an explicit verification trail.

## Workflow

### 1. Classify the task

Choose one mode before editing:

- **Bootstrap (greenfield):** the repository is empty or holds only fresh scaffolding. The user's stated intent is the primary evidence; follow the greenfield path below and read [references/greenfield-bootstrap.md](references/greenfield-bootstrap.md).
- **Bootstrap (existing code):** create the smallest useful context system for an established repository that lacks one.
- **Refresh:** update existing context after code, architecture, commands, or scope changed.
- **Audit:** report stale, duplicated, conflicting, or missing guidance without changing files unless asked.
- **Post-change sync:** update only the durable context affected by the completed implementation.
- **Cross-agent adaptation:** add or repair thin host-specific entry files while preserving one canonical fact layer.

Do not expand an audit or explanation request into file edits unless the user also asked for changes.

#### Greenfield path

When the repository has no meaningful code yet, discovery cannot replace intent. Instead:

1. Collect what the user has already stated: product goal, users, v1 scope, stack, tooling, non-goals, and target agent hosts.
2. Ask for the missing intake items in **one bounded round** using the checklist in [references/greenfield-bootstrap.md](references/greenfield-bootstrap.md). Never drip-feed questions across turns.
3. Record every behavior that does not exist yet as `Planned`. Record commands only if scaffolding created them and they run; otherwise write `Planned` with the intended tool.
4. Create the day-0 bundle from step 4 and seed `docs/decisions.md` with the initial stack decision and its rationale.
5. State the flip trigger in the primary instruction file: when the first working code, manifest, or CI lands, `Planned` facts must be verified or corrected.

Then continue at step 4. Steps 2 and 3 apply as soon as the repository has real files to discover.

### 2. Discover the instruction hierarchy

Start at the working directory and repository root. Inspect, when present:

- `AGENTS.md`, nested `AGENTS.md`, and `AGENTS.override.md`
- `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, and Agent-specific rule directories
- `README.md`, package manifests, workspace manifests, build files, CI files, and test configuration
- `docs/context-index.md`, PRDs, architecture, roadmaps, plans, decisions, and development logs
- existing `SKILL.md` files and repository-specific Agent skills
- source, test, script, and deployment directory structure

Run the bundled read-only inventory when Node.js is available:

```bash
node <skill-directory>/scripts/audit-context.mjs --root . --format markdown
```

Resolve `<skill-directory>` from the location of this `SKILL.md`. If the script cannot run, use `rg --files` and targeted reads. Exclude generated, dependency, cache, coverage, and VCS directories.

Read [references/discovery-and-conflicts.md](references/discovery-and-conflicts.md) when the repository has multiple manifests, instruction layers, or contradictory documentation.

### 3. Build a compact truth map

Before writing, capture the facts that future agents need:

| Topic | Evidence | Status | Canonical destination | Update trigger |
| --- | --- | --- | --- | --- |
| Product scope | PRD + current UI/API | Current / planned | `AGENTS.md` or PRD | Scope changes |
| Commands | package/CI scripts | Current | primary instruction file | Script changes |
| Architecture | code boundaries | Current / gap | architecture doc | Module/data-flow changes |
| Invariants | tests + explicit rules | Current | primary instruction file | Contract changes |
| Decisions | accepted rationale | Accepted / superseded | decision log | Significant choice |

Use this precedence when sources conflict:

1. Explicit user instruction for the current work
2. Current executable code, manifests, CI, schemas, and tests
3. Accepted decisions and maintained architecture docs
4. Current PRD, roadmap, and approved plans
5. Historical logs, issue notes, prototypes, and stale examples

Do not silently erase a conflict. Correct the stale owner or record the uncertainty.

### 4. Choose the smallest file set

Prefer existing equivalents. A repository does not need every possible context file.

- For a greenfield repository, start with the day-0 bundle: `AGENTS.md`, `README.md`, and `docs/decisions.md` seeded with the stack decision. Add everything else only when its trigger fires.
- Use `AGENTS.md` for durable, operational repository instructions when the host supports it.
- Use `CLAUDE.md`, `GEMINI.md`, or Copilot instructions only for host-specific loading, commands, or behavior that cannot live in the shared fact layer. Check first whether the installed host already loads `AGENTS.md` natively (recent Claude Code versions do); if it does and there is no host-specific guidance, skip the adapter entirely — a redundant adapter is a future drift bug.
- Add `docs/context-index.md` when the repository has several authoritative and historical documents.
- Add `docs/architecture.md` when module boundaries or data flow are non-trivial.
- Add `docs/decisions.md` when architectural choices need rationale and consequences.
- Add `PLANS.md` only when multi-session execution plans need a stable contract.
- Add `docs/development-log.md` only for context-changing milestones that git history alone cannot explain.
- Add nested instruction files only when a subtree has genuinely different commands, ownership, safety rules, or conventions.

Read [references/context-system.md](references/context-system.md) for file responsibilities, adaptive bundles, and cross-agent adapter guidance. Reuse the files under `assets/templates/` as starting points, never as content to copy blindly.

### 5. Write or update the context

For the primary instruction file, keep only operational knowledge:

- product purpose, current scope, and explicit non-goals
- runtime, framework, storage, and main module boundaries
- short repository map
- verified install, dev, test, typecheck, lint, build, and smoke commands
- coding, dependency, security, data, and approval rules
- workflow for non-trivial tasks
- context evolution triggers and done definition

For supporting docs:

- Separate current architecture from future plans.
- Separate accepted decisions from milestone history.
- Mark authoritative, supporting, historical, and generated sources in the context index.
- Record invariants in testable language. Example: “When feature X is disabled, existing single-user behavior is unchanged.”
- Keep adapter files thin. Link or import shared guidance where the host supports it; otherwise summarize only the host-specific entry points and point to the canonical file.

Read [references/project-patterns.md](references/project-patterns.md) when designing invariants, plan/progress separation, local data boundaries, or a context index for a growing repository.

### 6. Verify against the repository

Before finishing:

1. Re-read every changed context file.
2. Compare documented commands with manifests and CI.
3. Check paths against the current tree.
4. Confirm current and planned behavior are clearly separated.
5. Search for duplicated or contradictory rules.
6. Check that no secrets, local user data, or undocumented absolute home paths were introduced.
7. Review `git diff --check` and the focused diff.
8. Run the narrowest relevant repository checks when documentation changes depend on executable behavior.

For a docs-only change, do not claim application tests prove the prose. Report the evidence checks actually performed.

In a greenfield repository, verify each documented command by running it against the fresh scaffold when one exists (install, then the cheapest check such as lint or a smoke test). Commands that cannot run yet must carry `Planned`, never a bare imperative that looks verified.

### 7. Close the loop

Match the user's language and report:

```md
## Completed
- Files created or updated

## Key judgments
- Important evidence, conflicts, assumptions, or intentionally omitted files

## Verification
- Commands and results

## Remaining risks / next step
- Only concrete residual uncertainty or one useful next action
```

If no files changed, report the audit findings and the exact recommended owners for each correction.

## Cross-agent installation and use

This skill follows the open Agent Skills directory format. The same source can be installed for Codex, Claude Code, Gemini CLI, GitHub Copilot, Cursor, and compatible hosts.

Read [references/cross-agent-compatibility.md](references/cross-agent-compatibility.md) when installing, documenting support, or adding another host. Use the repository installer when available:

```bash
node tooling/install.mjs --target codex --scope project
node tooling/install.mjs --target claude --scope user
node tooling/install.mjs --target all --scope project
```

Installation changes only discovery location. Do not fork the Skill instructions per host unless a verified host limitation requires a small compatibility adapter.

## Context evolution triggers

Revisit durable context when work changes any of these:

- the first working code, manifest, CI pipeline, or test suite lands in a previously greenfield repository — flip every affected `Planned` fact to a verified fact or correct it
- product scope, non-goals, or user workflow
- package manager, scripts, build, test, lint, typecheck, or deployment process
- runtime, framework, dependency policy, or provider protocol
- repository layout, module ownership, API contract, schema, or storage model
- authentication, permissions, networking, secrets, destructive actions, or data exposure
- agent workflow, tool permissions, instruction hierarchy, or generated artifact boundaries
- a significant technical decision or an approved plan's status

Skip context edits for trivial formatting, isolated copy changes, and local experiments that do not affect future work.

## Avoid

- Copying the PRD into an instruction file
- Treating planned architecture as implemented
- Inventing missing commands
- Duplicating the same project summary across every Agent-specific file
- Adding nested instruction files without narrower rules
- Appending new guidance while leaving contradictory guidance in place
- Logging every commit in the development log
- Turning a context refresh into an unrelated code or architecture rewrite
