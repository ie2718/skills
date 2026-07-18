# Discovery and Conflict Resolution

Use this reference for complex repositories, stale documentation, or multiple instruction layers.

## Bounded discovery

Prefer fast, targeted commands:

```bash
pwd
git status --short
rg --files -uu \
  -g '!node_modules' -g '!.git' -g '!dist' -g '!build' \
  -g '!coverage' -g '!.next' -g '!.cache'
rg -n '"(dev|test|lint|typecheck|build|smoke)"' package.json '**/package.json'
rg -n '^#|Status:|Decision:|Consequences:' docs AGENTS.md CLAUDE.md GEMINI.md
```

Inspect the source tree at two or three levels before writing a repository map. Avoid dumping generated or dependency trees into context.

## Instruction hierarchy

Record the effective hierarchy before editing:

1. User instruction for the current task
2. System or organization policy exposed by the host
3. Root project instructions
4. Nested instructions applying to the edited subtree
5. Tool-specific adapters and skills

Do not assume one host reads another host's instruction file. Treat shared facts and loading mechanisms separately.

## Evidence matrix

For every important statement, identify its evidence class:

| Evidence | Good for | Common failure |
| --- | --- | --- |
| package/CI scripts | runnable commands | README copied an old command |
| tests and schemas | behavioral invariants | tests cover only a subset |
| current source | module boundaries and behavior | dead code looks current |
| accepted decision | rationale and constraints | implementation later diverged |
| architecture doc | navigation and intended boundaries | status is stale |
| PRD/roadmap | product intent and future scope | planned work described as shipped |
| development log | chronology and handoff | not authoritative for current behavior |

## Conflict procedure

When two sources disagree:

1. State the conflict in working notes.
2. Check executable evidence: manifests, code, schemas, tests, and current routes.
3. Determine which file owns the fact.
4. Update that owner and shorten or correct dependent summaries.
5. If evidence remains ambiguous, mark it `Needs verification` and report the exact question.

Examples:

- README says `npm run lint`, but no script exists: document lint as unknown; do not invent it.
- PRD describes cloud accounts, but code and current scope are local-only: keep cloud behavior under future plans.
- Root and nested instruction files disagree: apply the narrower file only within its subtree, then remove accidental duplication.
- An accepted decision conflicts with current code: describe current behavior in architecture and flag the decision as superseded or implementation drift.

## Preserve local changes

Before edits:

- inspect `git status --short`
- treat existing changes as user-owned
- avoid formatting unrelated sections
- do not overwrite a human-authored rule merely to match a template

After edits:

- run `git diff --check`
- review the focused diff
- search for stale duplicate phrases
- list checks that were skipped and why

## Security and privacy pass

Search changed files for:

- API keys, tokens, credentials, and copied environment values
- absolute user home paths
- internal service URLs or private hostnames that should not be public
- destructive commands without confirmation requirements
- instructions that broaden filesystem, network, or tool permissions
- project facts copied into global personal memory guidance

Context files are highly trusted input. Keep them free of secrets and hidden privilege escalation.
