# Cross-Agent Compatibility

This skill is one Agent Skills-compatible source directory. Installation copies or links that directory into each host's discovery location.

## Support matrix

| Target | Project scope | User scope | Invocation |
| --- | --- | --- | --- |
| Codex | `.agents/skills/image-generate` | `~/.agents/skills/image-generate` | `$image-generate` or skill picker |
| Claude Code | `.claude/skills/image-generate` | `~/.claude/skills/image-generate` | automatic match or `/image-generate` |
| Gemini CLI | `.gemini/skills/image-generate` | `~/.gemini/skills/image-generate` | automatic activation or `/skills` management |
| GitHub Copilot | `.github/skills/image-generate` | `~/.copilot/skills/image-generate` | automatic match or `/image-generate` where supported |
| Cursor | `.cursor/skills/image-generate` | `~/.cursor/skills/image-generate` | automatic match or slash-command menu |

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
```

Use `--mode link` only when developing the skill from a stable local checkout. Copy mode is more portable and is the default.

## Portability rules

- Keep required frontmatter to `name` and `description`. Host-specific fields such as `allowed-tools` are omitted on purpose; each host applies its own permission model to the shell call.
- The skill name is lowercase-and-hyphens (`image-generate`) and matches the directory name. Hosts that validate skill names reject other casing, and a case mismatch that works on macOS breaks on Linux and CI.
- Use relative links from `SKILL.md` to bundled resources.
- Do not depend on host-specific tool names in the core workflow. Describe the operation first, then give portable shell examples.
- Do not use Claude-only dynamic injection syntax in the shared `SKILL.md`.
- Keep `SKILL.md` below 500 lines and move detailed material into one-level references.

## Runtime portability

The bundled script targets the lowest common denominator on a developer machine:

- `bash` 3.2 (stock macOS `/bin/bash`) — no associative arrays, no `${var,,}`, and empty arrays are expanded with the `${arr[@]+"${arr[@]}"}` guard so `set -u` does not abort.
- `curl` and `python3` only. No Node, no npm install, no SDK.
- Credentials come from a dotenv file or the process environment, never from host-specific secret stores.

`tooling/` and `README.md` are packaging, not runtime: the skill works from `SKILL.md` plus `scripts/` and `references/` alone.

## Official references

- Agent Skills specification: <https://agentskills.io/specification>
- Codex skills: <https://learn.chatgpt.com/docs/build-skills>
- Claude Code skills: <https://code.claude.com/docs/en/skills>
- Gemini CLI skills: <https://geminicli.com/docs/cli/skills/>
- GitHub Copilot agent skills: <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills>
- Cursor Agent Skills: <https://cursor.com/docs/context/skills>
