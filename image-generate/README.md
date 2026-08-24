# Image Generate

> A portable Agent Skill for generating and editing images through OpenAI-compatible and Gemini-compatible (Nano Banana) image APIs.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[English](#english) · [中文](#中文)

---

## English

### What it does

One skill, two API shapes, every mainstream agent host:

| Model family | Route |
| --- | --- |
| `gpt-image-2`, `gpt-image-1`, other OpenAI-compatible models | `POST {base}/images/generations` · `POST {base}/images/edits` |
| Nano Banana / Gemini image models (`gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-2.5-flash-image-preview`) | `POST {base}/v1beta/models/{model}:generateContent` |

The bundled script picks the route from the model id and accepts a `--api` override. Text-to-image and image-to-image (edit) both work on either route.

### Requirements

`bash` 3.2+ (stock macOS `/bin/bash` is supported), `curl`, and `python3`. No npm install, no SDK, no network access at install time.

### Install

Run from this directory.

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

Project scope is the safe default. Add `--force` to refresh an existing copy. Use `--mode link` only while developing the skill from a stable checkout.

#### Host paths

| Host | Project | User |
| --- | --- | --- |
| Codex | `.agents/skills/image-generate` | `~/.agents/skills/image-generate` |
| Claude Code | `.claude/skills/image-generate` | `~/.claude/skills/image-generate` |
| Gemini CLI | `.gemini/skills/image-generate` | `~/.gemini/skills/image-generate` |
| GitHub Copilot | `.github/skills/image-generate` | `~/.copilot/skills/image-generate` |
| Cursor | `.cursor/skills/image-generate` | `~/.cursor/skills/image-generate` |

For Codex builds that still discover personal skills under `$CODEX_HOME/skills`, use `--target codex-home --scope user`.

### Windows

The script is bash + curl + python3, so it needs a POSIX shell. Two supported setups:

| Setup | Notes |
| --- | --- |
| **Git Bash** (ships with Git for Windows) | Has `bash` and `curl`. Install Python separately and make sure `python3` resolves — Git Bash often exposes only `python`; run `python3 --version` to check, and add a `python3` alias or use the Python launcher if it fails. |
| **WSL** (Ubuntu or similar) | Works as-is. Note that `~` is the WSL Linux home, not your Windows profile — put the env file in the Linux home, not under `C:\Users\`. |

PowerShell and `cmd.exe` cannot run the script directly.

Skill install paths use `%USERPROFILE%` in place of `~` — e.g. `%USERPROFILE%\.claude\skills\image-generate`. The installer resolves this automatically; run it from Git Bash, WSL, or PowerShell (`node tooling/install.mjs` is plain Node and works in any shell).

**Line endings matter.** Git for Windows defaults to `core.autocrlf=true`, which rewrites `.sh` files to CRLF on checkout and makes bash fail with `set: pipefail: invalid option name`. This repo ships a `.gitattributes` that forces LF for `*.sh`, so a fresh clone is fine. If you hit it anyway (an older clone, or a file copied through a Windows editor), fix it with:

```bash
sed -i 's/\r$//' scripts/image_generate.sh
```

### Configure

Create `.env.image-generate` in the workspace where the skill runs (or export the variables):

```dotenv
IMAGE_BASE_URL=https://your-gateway.example/v1
IMAGE_API_KEY=***
IMAGE_DEFAULT_MODEL=gpt-image-2
IMAGE_NANO_BANANA_MODEL=gemini-3.1-flash-image
IMAGE_NANO_BANANA_PRO_MODEL=gemini-3-pro-image
```

`chmod 0600` it. If you keep credentials at `~/.env.image-generate` instead, the script falls back to that, so a user-scope install works from any workspace. `.env*` is git-ignored here — never commit a key.

### Use

Ask your agent in plain language:

```text
Generate a flat vector icon of a tiny robot painter, 1024x1024.

用 Nano Banana Pro 画一张电影感的机器人桌面场景。

Take input.jpg and turn it into a warm watercolor postcard, keep the subject.
```

Or call the script directly:

```bash
bash scripts/image_generate.sh --model gpt-image-2 --output out.png "A tiny cute robot painter, flat vector icon"

bash scripts/image_generate.sh --model gemini-3-pro-image --output nano.png "A cinematic banana-shaped nano robot on a desk"

bash scripts/image_generate.sh --model gpt-image-2 --image input.jpg --output edit.png "Warm watercolor postcard, keep the main subject"
```

Options: `--env FILE`, `--model`, `--api auto|openai|gemini`, `--image PATH` (repeatable), `--size WxH`, `--quality auto|low|medium|high`, `--output PATH`.

### Verify

```bash
bash -n scripts/image_generate.sh
node tooling/validate.mjs
```

### Layout

```
image-generate/
├── SKILL.md                    # the skill itself (portable frontmatter: name + description)
├── README.md
├── agents/openai.yaml          # Codex display metadata
├── references/                 # endpoint notes, cross-agent install matrix
├── scripts/image_generate.sh   # bash 3.2 + curl + python3 client
└── tooling/                    # installer and structure validator
```

---

## 中文

### 这是什么

一个可移植的 Agent Skill：让 Codex、Claude Code、Gemini CLI、GitHub Copilot、Cursor 等主流 Agent 都能调用图像生成与图像编辑接口。

| 模型 | 接口 |
| --- | --- |
| `gpt-image-2` 等 OpenAI 兼容模型 | `POST {base}/images/generations` · `POST {base}/images/edits` |
| Nano Banana / Gemini 图像模型（`gemini-3-pro-image`、`gemini-3.1-flash-image` 等） | `POST {base}/v1beta/models/{model}:generateContent` |

脚本会根据模型 ID 自动选择接口，也可以用 `--api` 强制指定。文生图和图生图（编辑）两条路径都支持。

### 依赖

`bash` 3.2 以上（macOS 自带的 `/bin/bash` 即可）、`curl`、`python3`。不需要 npm install，不需要 SDK。

### 安装

在本目录下执行：

```bash
# 安装到当前仓库，供 Codex 使用
node tooling/install.mjs --target codex --scope project

# 为当前用户安装，供 Claude Code 使用
node tooling/install.mjs --target claude --scope user

# 一次性安装到所有支持的 Agent（仓库级）
node tooling/install.mjs --target all --scope project

# 先预览目标路径，不写文件
node tooling/install.mjs --target all --scope user --dry-run
```

默认是仓库级安装，最安全。已存在时加 `--force` 覆盖；只有在本地开发这个 Skill 时才用 `--mode link`。各 Agent 的安装路径见上方 Host paths 表格。

### Windows 上使用

脚本依赖 bash + curl + python3，需要一个 POSIX shell。两种可用环境：

| 环境 | 说明 |
| --- | --- |
| **Git Bash**（随 Git for Windows 安装） | 自带 `bash` 和 `curl`。需要另外安装 Python，并确认 `python3` 命令可用 —— Git Bash 里通常只有 `python`，先运行 `python3 --version` 验证，不行就配置别名或用 Python launcher。 |
| **WSL**（Ubuntu 等） | 开箱即用。注意此时 `~` 指 WSL 内的 Linux 家目录，不是 Windows 用户目录 —— 凭据文件要放在 Linux 家目录下，而不是 `C:\Users\` 里。 |

PowerShell 和 `cmd.exe` 无法直接运行该脚本。

Skill 安装路径把 `~` 换成 `%USERPROFILE%`，例如 `%USERPROFILE%\.claude\skills\image-generate`。安装器会自动处理；`node tooling/install.mjs` 是纯 Node 脚本，在任何 shell 里都能跑。

**注意换行符。** Git for Windows 默认 `core.autocrlf=true`，checkout 时会把 `.sh` 改成 CRLF，导致 bash 直接报 `set: pipefail: invalid option name`。本仓库已通过 `.gitattributes` 强制 `*.sh` 使用 LF，全新克隆不会有问题。若仍然遇到（旧克隆，或经 Windows 编辑器复制过的文件），执行：

```bash
sed -i 's/\r$//' scripts/image_generate.sh
```

### 配置

在运行 Skill 的工作目录创建 `.env.image-generate`（或直接导出环境变量）：

```dotenv
IMAGE_BASE_URL=https://your-gateway.example/v1
IMAGE_API_KEY=***
IMAGE_DEFAULT_MODEL=gpt-image-2
IMAGE_NANO_BANANA_MODEL=gemini-3.1-flash-image
IMAGE_NANO_BANANA_PRO_MODEL=gemini-3-pro-image
```

建议 `chmod 0600`。也可以把凭据放在 `~/.env.image-generate`，脚本会自动回退到该路径，这样用户级安装在任何工作目录下都能用。仓库已忽略 `.env*`，请勿提交密钥。

### 使用

直接对 Agent 说：

```text
画一张扁平风格的机器人画家图标，1024x1024。

用 Nano Banana Pro 生成一张电影感的桌面机器人场景。

把 input.jpg 改成暖色水彩明信片风格，保留主体。
```

也可以直接调脚本：

```bash
bash scripts/image_generate.sh --model gpt-image-2 --output out.png "扁平风格的机器人画家图标"

bash scripts/image_generate.sh --model gemini-3-pro-image --output nano.png "电影感的香蕉形纳米机器人"

bash scripts/image_generate.sh --model gpt-image-2 --image input.jpg --output edit.png "改成暖色水彩明信片，保留主体"
```

### 校验

```bash
bash -n scripts/image_generate.sh
node tooling/validate.mjs
```

---

## License

MIT — see [LICENSE](LICENSE).
