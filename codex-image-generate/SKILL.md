---
name: codex-image-generate
description: 在 Codex API 模式下生成或编辑图片，读取本机 auth.json 和 config.toml 的凭据及 provider base_url，查询模型接口选择图像模型，并将结果保存到本地。适用于用户希望复用 Codex API 配置生图、无需单独设置图片服务密钥的场景。
---

# Codex Image Generate

复用 Codex API 配置，通过 OpenAI Images 或 Gemini generateContent 接口生成图片。脚本自包含，不依赖 `image-generate` skill，不改写 Codex 配置，也不把密钥复制到工作区。

## 运行环境

脚本适用于 Windows、macOS 和 Linux，使用 Node.js 内置的 HTTP、文件和加密模块，无需 Python、SDK 或 npm install。TOML 解析器随 skill 附带，来源和许可证见 [scripts/vendor/smol-toml/NOTICE.md](scripts/vendor/smol-toml/NOTICE.md)。复制或安装时保留整个 skill 文件夹。

命令示例使用 Bash 的变量和续行方式；PowerShell 中可改为单行，并用 `& "C:\path\to\node.exe" "C:\path\to\codex_image_generate.mjs" ...` 调用带空格的绝对路径。不要依赖 Bash 才能运行脚本本身。

Node.js 18 的原生 fetch 不自动继承 HTTP_PROXY / HTTPS_PROXY；需要代理时使用支持环境代理的较新 Node.js 并按其文档启用，或使用配置中的可直连 API 网关。

## 使用流程

1. 从当前会话环境确定用户的工作目录：有项目时使用当前项目或工作树目录，无项目时使用当前对话的工作目录。将执行工具的 `workdir` 设为该目录，并将下列 `WORKSPACE_DIR` 替换为它的绝对路径；`SKILL_DIR` 替换为本文件所在目录的绝对路径。不要为了执行脚本切换到 skill 安装目录。需要 Node.js 18+。先检查 `node --version`；如果系统没有 Node.js，可使用 Codex 桌面提供的 `mcp__codex_app__load_workspace_dependencies` 查询自带 Node.js 的绝对路径，使用返回的可执行文件。若两者都不可用，说明需要安装 Node.js 18+，不声称零运行时依赖。
2. 首先查询模型（仅查询，不计为生图调用）：

   ```bash
   node "$SKILL_DIR/scripts/codex_image_generate.mjs" --list-models
   ```

   输出候选模型及推断的接口。筛选依据是模型 ID 和输出模态元数据；`/models` 并没有统一的生图能力字段，因此候选并不保证接口可用。需要检查所有 ID 时加 `--all-models`。不要使用 Codex 配置中的聊天模型作为默认生图模型。
3. 根据需求编写提示词。用户未指定模型时，省略 `--model`，沿用上次成功生成的选择；没有历史选择时自动发现较新的模型。不要为了举例或测试主动指定旧版模型。首次选择优先 `gpt-image-*`，其次 Gemini 图像模型，再次 DALL·E；同系列按数字版本排序（例如 2.10 高于 2.5），同版本 GPT 优先无后缀的标准 ID，而非 flare / sunburst 等别名。不同系列的版本号不可直接比较，此处“较新”是基于 ID 的启发式，不代表已核实发布日期。使用明确的本地输出路径：

   ```bash
   node "$SKILL_DIR/scripts/codex_image_generate.mjs" \
     --workspace-dir "$WORKSPACE_DIR" --output output/robot.png \
     "一只正在画画的小机器人，暖色水彩，留白背景"
   ```

   编辑图片或使用参考图：

   ```bash
   node "$SKILL_DIR/scripts/codex_image_generate.mjs" \
     --model MODEL_ID --image /absolute/path/reference.png \
     --workspace-dir "$WORKSPACE_DIR" --output output/edited.png \
     "保留主体和构图，将画面转换为水彩风格"
   ```

4. 检查脚本返回的绝对路径和成功输出中的 `Generation model ID`，必要时查看图片，然后按下方“Codex 预览”打开右侧面板。最终答复必须明确标注本次生成使用的完整模型 ID，并保留本地文件链接；可同时用 `![图片](/absolute/path/output/robot.png)` 展示结果。

## 结果中标注模型

每次生成或编辑成功，最终答复都要在图片附近写明：**生成模型：`实际模型 ID`**。例如：**生成模型：`gpt-image-2.5`**。即使模型由自动发现或历史记录选择，也必须注明，不能只在过程中或工具日志里说明。

以本次成功调用输出的 `Generation model ID` 为依据，保留版本号和别名后缀；不要从示例、默认设置或 Codex 当前聊天模型推断。该 ID 是发送给服务的模型标识，网关内部是否映射到其他底层模型不可由此确认，不擅自展开别名。脚本标准输出仍只返回图片绝对路径，模型及成功信息写入标准错误。

多张图片使用不同模型时，分别对应标注；使用同一模型时可以统一注明。调用失败时只说明尝试的模型，不声称已由它生成图片。只打开旧图片且缺少原始生成记录时，不猜测模型。

## 图片保存位置

- 所有生成图片必须保存到当前对话工作目录或当前项目内。通常使用其中的 `output/`，用户指定项目内其他目录时遵从其要求。不要保存到临时目录、下载目录、Codex 配置目录或其他项目。只有 skill 本身就是当前项目时，才可将当前 skill 仓库视为工作区。
- 显式传入 `--workspace-dir "$WORKSPACE_DIR"`，避免运行环境误把 skill 安装目录当作输出根目录。CLI 未传此参数时使用进程当前工作目录，不会猜测桌面应用当前项目，也不会以脚本所在目录为根目录。
- 省略 `--output` 时，自动保存到工作区内的 `output/codex-image-<唯一ID>.png`，方便连续生图。相对 `--output` 路径始终相对于 `--workspace-dir`；绝对路径也必须在该目录内。越界路径及指向外部的符号链接会在请求生图前被拒绝。
- 用户没有指定文件名时优先省略 `--output`。明确指定文件名时避免覆盖已有图片。预览和最终链接使用脚本返回的实际绝对路径，不额外复制图片到其他目录。

## Codex 预览

在 Codex 桌面环境中，生成成功后使用 Codex 自带的 `mcp__codex_app__open_in_codex` 打开右侧图片预览；用户要求只保存文件时跳过。此步骤由调用 skill 的 agent 完成，Node.js CLI 只负责生图和保存文件。只预览现有图片时直接使用其路径，不重新生图。

调用参数：

```json
{
  "placement": "right",
  "target": {
    "type": "file",
    "path": "/absolute/path/to/generated-image.png"
  }
}
```

`path` 必须取脚本实际返回的绝对路径（扩展名可能已修正）。这是 Codex 原生文件预览，不是自定义 Widget。工具不可用或打开失败时，仅提供 Markdown 图片和本地链接，不重试生图、不安装或调用第三方插件。只有工具成功返回后才说明已打开右侧面板。

## 记住模型与升级

选择优先级：显式 `--model MODEL_ID` > 历史成功选择 > 自动发现较新模型。

- `--latest` 忽略历史选择，重新查询并选择较新模型；不能与 `--model` 同用。用户要求升级或换用最新模型时使用它。
- 只有图片成功保存后才记录模型及实际接口；失败不会覆盖上次成功选择。显式选用旧版模型也会成为下次默认值。
- 记录位于 `${CODEX_HOME:-~/.codex}/skill-state/codex-image-generate/`，按配置路径、profile、provider 和接口地址隔离，跨工作目录复用。`--state-dir DIR` 可指定可写的保存目录；后续需沿用相同目录。
- 记录只保存模型 ID 和接口类型，不保存密钥、提示词或图片。记忆文件缺失或损坏时重新发现；无法写入时保留已生成图片并提示本次未能记忆。
- 复用历史模型时无需调用 `/models`。若它已下线或无权限，报告错误，使用 `--latest` 或显式 `--model` 重新选择；不自动重复发起生图请求。

## 配置与接口

- 默认读取 `${CODEX_HOME:-~/.codex}/auth.json` 和 `config.toml`；可用 `--codex-home`、`--auth`、`--config` 指定位置。
- 支持 `model_provider`、`model_providers.<provider>`，以及 `--profile` / 配置中的 `profile`；`--provider` 可以显式切换 provider。命令行临时配置无法从文件推断，需传入相应参数。
- `base_url` 来自选中 provider，其次配置顶层；内置 `openai` 缺省为 `https://api.openai.com/v1`。自定义 provider 缺少地址时直接报错，不猜测地址。`--base-url` 可覆盖；仅在用户明确要求切换服务时使用，因为凭据会发送到该地址。
- 密钥按顺序读取：选中 provider 的 `env_key` 所指环境变量（声明后必须存在）；`auth.json.OPENAI_API_KEY`；进程 `OPENAI_API_KEY`；provider / 顶层配置中的 `OPENAI_API_KEY`。支持值中的 `${ENV_VAR}` 引用。不会读取或复用 ChatGPT 登录 token。
- 支持 provider 的 `http_headers` / `env_http_headers`。不得输出配置文件、密钥、Authorization 或带签名的图片下载 URL。
- 查询 `GET {base_url}/models`。显式 `--model` 会跳过发现，用于网关不提供模型列表或使用自定义模型别名的情况。
- `--api auto|openai|gemini`：默认 Gemini 图像模型走 `generateContent`，其余走 `/images/generations` 或 `/images/edits`。Gemini 路径将末尾 `/v1` 替换为 `/v1beta`，保留网关前缀；可用 `--gemini-base-url` 显式指定含版本的根地址。
- OpenAI 可指定 `--size`、`--quality`；仅在显式指定时发送。GPT Image 不发送 `response_format`，DALL·E 请求 `b64_json`。Gemini 参考图通过 `inlineData` 传入，不接受这两个 OpenAI 参数。
- 支持 base64 和 URL 图片响应；下载图片不携带 API 凭据。默认保存第一张图，自动根据 PNG/JPEG/WebP 文件头修正扩展名，不覆盖已有文件；需要替换时加 `--overwrite`。

## 失败处理

没有候选模型时，先用 `--list-models --all-models` 检查别名，再依据服务文档显式选择模型和接口。模型列表接口失败时可用已知模型 ID 跳过查询。

HTTP 错误、无图片结果、下载失败都返回非零退出码。脚本不自动重试生图请求，不跨 provider 回退，避免重复计费或把提示词发往其他服务。若网关只支持聊天 / Responses 而没有图像接口，本 skill 无法使其获得生图能力；应说明缺少的服务能力。

## 验证

```bash
node --test "$SKILL_DIR/tests/image_generate.test.mjs"
```

测试使用本地模拟服务覆盖配置解析、模型发现、两种接口、图片落盘和凭据处理，不消耗真实生图额度。
