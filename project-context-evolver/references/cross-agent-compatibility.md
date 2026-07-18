# Cross-Agent Compatibility

This project uses one Agent Skills-compatible source directory. Installation copies or links that directory into each host's discovery location.

## Support matrix

| Target | Project scope | User scope | Invocation |
| --- | --- | --- | --- |
| Codex | `.agents/skills/project-context-evolver` | `~/.agents/skills/project-context-evolver` | `$project-context-evolver` or skill picker |
| Claude Code | `.claude/skills/project-context-evolver` | `~/.claude/skills/project-context-evolver` | automatic match or `/project-context-evolver` |
| Gemini CLI | `.gemini/skills/project-context-evolver` | `~/.gemini/skills/project-context-evolver` | automatic activation or `/skills` management |
| GitHub Copilot | `.github/skills/project-context-evolver` | `~/.copilot/skills/project-context-evolver` | automatic match or `/project-context-evolver` where supported |
| Cursor | `.cursor/skills/project-context-evolver` | `~/.cursor/skills/project-context-evolver` | automatic match or slash-command menu |

Codex installations that still expose personal skills under `$CODEX_HOME/skills` can use the installer's `codex-home` compatibility target. Do not install both `codex` and `codex-home` unless the local Codex build requires it; duplicate skill names can appear twice.

## Installer

From the skill source directory:

```bash
# Safe default: install into the current repository.
node tooling/install.mjs --target codex --scope project

# Personal install across all repositories for one host.
node tooling/install.mjs --target claude --scope user

# Install project copies for all primary hosts.
node tooling/install.mjs --target all --scope project

# Preview paths without writing.
node tooling/install.mjs --target all --scope user --dry-run

# Refresh an existing install.
node tooling/install.mjs --target codex --scope user --force
```

Use `--mode link` only when developing the Skill from a stable local checkout. Copy mode is more portable and is the default.

## Portability rules

- Keep required frontmatter to `name` and `description`.
- Use relative links from `SKILL.md` to bundled resources.
- Do not depend on host-specific tool names in the core workflow.
- Describe the operation first, then give portable shell examples.
- Do not use Claude-only dynamic injection syntax in the shared `SKILL.md`.
- Do not assume every host supports the same optional frontmatter fields.
- Avoid pre-approving shell tools. Let the host's normal permission model apply.
- Keep `SKILL.md` below 500 lines and move detailed material into one-level references.

## Agent context files are not Skill install files

Installing this Skill teaches an agent how to create or evolve project context. It does not automatically add `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or Copilot instructions to the target repository. The agent creates or updates those only when the user requests it and repository evidence supports the change.

## Official references

- Agent Skills specification: <https://agentskills.io/specification>
- Codex skills: <https://learn.chatgpt.com/docs/build-skills>
- Claude Code skills: <https://code.claude.com/docs/en/skills>
- Gemini CLI skills: <https://geminicli.com/docs/cli/skills/>
- GitHub Copilot agent skills: <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills>
- Cursor Agent Skills: <https://cursor.com/docs/context/skills>
