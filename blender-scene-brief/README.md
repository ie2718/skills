# Blender Scene Brief

> A portable Agent Skill that turns "I want this place as a 3D scene" into a complete Blender production brief — the long-horizon prompt another agent executes, plus a styled HTML page of the same document.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[English](#english) · [中文](#中文)

---

## English

### What it does

You describe a place. The skill produces a brief detailed enough that an agent with Blender and
a long budget can build the scene from it alone — and be graded against it afterwards.

| Artifact | Purpose |
| --- | --- |
| `<slug>_brief.md` | The pasteable prompt. This is the deliverable. |
| `<slug>_brief.html` | The same brief as a styled, printable page for sharing or review. |

Each brief carries: the runtime it assumes · the role framing and autonomy rules · environment
discovery and checkpointing · a five-step build order · an evidence-based render-review loop
with a domain critic roster · a weighted 100-point rubric with derived pass gates · cold-start
validation · and an eleven-part scene brief covering objective, zones, adjacency, asset
families with hard counts, construction, materials, lighting, lived-in storytelling, the
numbered final camera set, technical organisation, critical failures, and deliverables.

### Why a renderer instead of a template

A brief this long contradicts itself easily. The camera count appears in four places, the
critic count in three, the zone count in two, and every rubric gate is a function of its
points. So the model authors a **scene spec** — the part no script can invent — and
`scripts/render-brief.mjs` derives everything else and refuses to write a brief that disagrees
with itself:

- rubric points must sum to exactly 100, and each gate is `points × 0.85` rounded up
- camera files must number `01…NN` with no gaps, duplicates, or missing hero
- zones 8–14, cameras 12–18, critics 5–7, plus per-list minimums
- no leftover placeholder markers (`{{…}}`, `<PLACEHOLDER>`, unfilled stubs) anywhere

### Requirements

Node 18+. No install step, no dependencies, no network access.

### Install

Run from this directory.

```bash
# Install for Claude Code in the current repository.
node tooling/install.mjs --target claude --scope project

# Install for Codex for the current user.
node tooling/install.mjs --target codex --scope user

# Install project-scoped copies for all supported hosts.
node tooling/install.mjs --target all --scope project
```

Targets: `codex` · `claude` · `gemini` · `copilot` · `cursor` · `codex-home` · `all`.
Options: `--scope project|user`, `--mode copy|link`, `--force`, `--dry-run`.

### Use

Just ask, in either language:

- "把这个咖啡馆场景做成 blender 模型"
- "Write me a Blender production brief for an abandoned signal box"
- "生成一个地铁站的 3D 场景提示词"

Or render a spec you already have:

```bash
node scripts/render-brief.mjs my-scene.json --out-dir out
```

Try the shipped example:

```bash
npm run example
```

### Scope

The skill stops at the brief. It does not run Blender, write `bpy` scripts, or edit `.blend`
files — hand the Markdown to a session that has Blender available.

### Layout

```text
blender-scene-brief/
├── SKILL.md                  # the skill itself
├── scripts/render-brief.mjs  # spec -> Markdown + HTML, with consistency enforcement
├── references/               # derivation rules, archetype library, spec schema
├── assets/examples/          # one complete worked spec
└── tooling/                  # validate.mjs, install.mjs
```

### Validate

```bash
npm run validate
```

Checks the skill's structure and metadata, renders the shipped example end to end, verifies
every derived gate and cross-reference, and confirms a deliberately broken spec is rejected
without writing output.

---

## 中文

### 这个技能做什么

你描述一个场景，它输出一份足够详细的 **Blender 生产提示词（production brief）**——详细到另一个
带 Blender、有长时间预算的 agent 可以只凭它把整个场景搭出来，并在事后按同一份文档打分。

| 产物 | 用途 |
| --- | --- |
| `<slug>_brief.md` | 可直接粘贴的提示词，这是主交付物 |
| `<slug>_brief.html` | 同一份 brief 的排版页面，便于分享、评审、打印 |

每份 brief 包含：运行环境假设 · 角色设定与自主决策规则 · 环境探测与断点续跑 · 五步构建顺序 ·
基于渲染图证据的评审循环与领域评审员名单 · 加权 100 分评分表及自动推导的及格线 · 冷启动验收 ·
以及十一节场景正文：目标、分区、动线邻接、带**硬性数量**的资产族、构造细节、材质、灯光、
生活痕迹、编号最终相机集、技术组织、致命失败项、交付清单。

### 为什么用渲染器而不是模板

这么长的文档极容易自相矛盾：相机数量出现在四个位置，评审员数量三处，分区数量两处，而每一条
评分及格线都是分值的函数。所以由模型撰写 **场景 spec**（脚本发明不出来的那部分），再由
`scripts/render-brief.mjs` 推导其余内容，并拒绝输出任何自相矛盾的 brief：

- 评分必须精确加总为 100，每条及格线由 `分值 × 0.85` 向上取整推导
- 相机文件必须从 `01…NN` 连续编号，不能缺号、重号或没有 hero
- 分区 8–14、相机 12–18、评审员 5–7，各列表另有下限
- 任何位置都不允许残留占位符（`{{…}}`、`<PLACEHOLDER>`、未填写的存根）

### 环境要求

Node 18+。无需安装依赖，无需联网。

### 安装

在本目录下执行。

```bash
# 在当前仓库为 Claude Code 安装
node tooling/install.mjs --target claude --scope project

# 为当前用户安装到 Codex
node tooling/install.mjs --target codex --scope user

# 为所有支持的宿主安装项目级副本
node tooling/install.mjs --target all --scope project
```

支持的 target：`codex` · `claude` · `gemini` · `copilot` · `cursor` · `codex-home` · `all`。
可选项：`--scope project|user`、`--mode copy|link`、`--force`、`--dry-run`。

### 用法

直接说就行：

- 「把这个咖啡馆场景做成 blender 模型」
- 「生成一个地铁站的 3D 场景提示词」
- "Write me a Blender production brief for an abandoned signal box"

也可以直接渲染已有的 spec：

```bash
node scripts/render-brief.mjs my-scene.json --out-dir out
```

跑一下自带的示例：

```bash
npm run example
```

### 边界

本技能只负责产出 brief，不运行 Blender、不写 `bpy` 脚本、不改 `.blend`。把生成的 Markdown
交给一个装了 Blender 的会话去执行即可。

### 校验

```bash
npm run validate
```

会检查技能结构与元数据，端到端渲染自带示例，核对每一条推导出的及格线与交叉引用，并确认一份
故意写坏的 spec 会被拒绝且不产生任何输出文件。

---

MIT © blender-scene-brief contributors
