# Project Context Evolver

An open, portable Agent Skill for turning a repository's PRD, architecture, code, scripts, tests, decisions, and development history into a small context system that future coding agents can trust.

It helps teams create and evolve files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `PLANS.md`, `docs/context-index.md`, `docs/architecture.md`, and `docs/decisions.md` without copying the same project summary everywhere.

## Why it is different

- Evidence-first: current code, manifests, CI, schemas, and tests outrank stale prose.
- Cross-agent: one Agent Skills source installs into Codex, Claude Code, Gemini CLI, GitHub Copilot, and Cursor discovery paths.
- Minimal by default: it creates only context files with a clear owner and update trigger.
- Drift-resistant: shared facts stay canonical; Agent-specific files remain thin adapters.
- Safe to inspect: no runtime dependencies, no network access, and no pre-approved shell permissions.

## Install

Run commands from this directory.

```bash
# Install for Codex in the current repository.
node tooling/install.mjs --target codex --scope project

# Install for Claude Code for the current user.
node tooling/install.mjs --target claude --scope user

# Install project-scoped copies for all supported hosts.
node tooling/install.mjs --target all --scope project

# Preview destinations first.
node tooling/install.mjs --target all --scope user --dry-run
```

Project scope is the safe default. Add `--force` to refresh an existing copy. Use `--mode link` only while developing the Skill from a stable checkout.

### Host paths

| Host | Project | User |
| --- | --- | --- |
| Codex | `.agents/skills/project-context-evolver` | `~/.agents/skills/project-context-evolver` |
| Claude Code | `.claude/skills/project-context-evolver` | `~/.claude/skills/project-context-evolver` |
| Gemini CLI | `.gemini/skills/project-context-evolver` | `~/.gemini/skills/project-context-evolver` |
| GitHub Copilot | `.github/skills/project-context-evolver` | `~/.copilot/skills/project-context-evolver` |
| Cursor | `.cursor/skills/project-context-evolver` | `~/.cursor/skills/project-context-evolver` |

For Codex installations that still discover personal Skills under `$CODEX_HOME/skills`, use `--target codex-home --scope user`. Avoid installing the same Skill in both Codex locations unless your local build requires it.

## Use

Examples:

```text
Use $project-context-evolver to initialize agent context for this brand-new project.

Use $project-context-evolver to bootstrap this repository for Codex and Claude Code.

Audit our AGENTS.md and docs/context-index.md against the actual code. Report conflicts only.

Refresh project context after this architecture change and update only the durable owners.

Create thin CLAUDE.md and GEMINI.md adapters without duplicating AGENTS.md.
```

Claude Code can also invoke `/project-context-evolver`. Other hosts may expose it through their Skill picker or slash-command UI.

## Read-only audit

The bundled inventory script lists instruction files, context docs, manifests, package scripts, and Agent Skills without modifying the repository:

```bash
node scripts/audit-context.mjs --root /path/to/project --format markdown
node scripts/audit-context.mjs --root /path/to/project --format json
```

## Project layout

```text
project-context-evolver/
├── SKILL.md
├── agents/openai.yaml
├── assets/templates/
├── references/
├── scripts/audit-context.mjs
├── tooling/install.mjs
├── tooling/validate.mjs
└── tests/tooling.test.mjs
```

`SKILL.md` contains the portable workflow. Detailed context design and host compatibility live in `references/`. Templates are scaffolds, not copy-paste defaults.

## Validate and test

Requires Node.js 18 or newer and no package installation.

```bash
npm run validate
npm test
```

Codex authors can additionally run the bundled Codex Skill validator:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py .
```

## Security

Review any third-party Skill before installing it. This repository's installer:

- defaults to project scope
- performs no network requests
- installs only runtime Skill files in copy mode
- refuses to replace an existing destination without `--force`
- does not grant shell or filesystem permissions through Skill frontmatter

The Skill itself instructs agents to preserve local changes, avoid secrets and absolute user paths, and request authority before destructive actions or permission expansion.

## 中文快速开始

这个 Skill 用于把 PRD、架构、代码、脚本、测试和决策日志整理成可持续维护的项目上下文，也支持全新空项目的第 0 天初始化（一轮意图采集 → 最小种子文件 → 代码落地后翻转验证）。推荐先按项目安装：

```bash
node tooling/install.mjs --target codex --scope project
```

然后在 Agent 中输入：

```text
使用 $project-context-evolver 初始化这个新项目的 Agent 上下文。

使用 $project-context-evolver 审计当前仓库，并生成最小且可持续维护的项目上下文体系。
```

## Standards and host documentation

- [Agent Skills specification](https://agentskills.io/specification)
- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Gemini CLI skills](https://geminicli.com/docs/cli/skills/)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
- [Cursor Agent Skills](https://cursor.com/docs/context/skills)

## License

MIT. See [LICENSE](LICENSE).
