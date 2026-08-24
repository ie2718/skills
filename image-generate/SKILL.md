---
name: image-generate
description: Generate and edit images through OpenAI-compatible endpoints (`/images/generations`, `/images/edits`) or Gemini-compatible CLIProxyAPI endpoints (`generateContent`), covering gpt-image models and Nano Banana / Gemini image models. Use when the user asks to generate, create, draw, or render an image, produce an illustration, icon, poster, logo, cover art, or product shot, edit or restyle an existing picture (image-to-image), or batch-render visual assets from prompts. Triggers include "generate an image", "make me a picture", "edit this photo", "画一张图", "生成图片", "帮我做张配图", "用 Nano Banana 生成", "改一下这张图". Do not use for building slide decks or for local models without an HTTP endpoint.
---

# Image Generate

Turn a text prompt (and optionally one or more input images) into an image file, using whichever image API the workspace is configured against.

## Endpoint facts

- **OpenAI-compatible** models (`gpt-image-2`, `gpt-image-1`, …):
  - text-to-image: `POST {IMAGE_BASE_URL}/images/generations`, JSON body with `model`, `prompt`, `size`, `quality`, `response_format`
  - image-to-image / edit: `POST {IMAGE_BASE_URL}/images/edits`, multipart form with the same fields plus one or more `image` files
- **Gemini-compatible** models (Nano Banana: `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-2.5-flash-image-preview`, …) go through CLIProxyAPI's Gemini route, **not** OpenAI's `/images/*`:
  - `POST {IMAGE_BASE_URL without /v1}/v1beta/models/{model}:generateContent`
  - request `generationConfig.responseModalities = ["IMAGE", "TEXT"]`
  - the image comes back as `candidates[].content.parts[].inlineData.data` (base64)
  - input images are sent as `inlineData` parts, so the same route covers image-to-image
- `scripts/image_generate.sh` picks the route from the model id (`gemini-*image*` → Gemini) and `--api openai|gemini` overrides that.
- Never print, echo, or paste `IMAGE_API_KEY`, and never commit the env file.

## Setup

Credentials come from a dotenv file (default `.env.image-generate` in the working directory; override with `--env FILE` or `IMAGE_ENV_FILE`) or from the process environment. If neither is present, ask the user for the base URL and key, or read them from the configured provider credentials — resolve any `${ENV_VAR}` references through the current process environment rather than hardcoding values.

```dotenv
IMAGE_BASE_URL=https://example.invalid/v1
IMAGE_API_KEY=***
IMAGE_DEFAULT_MODEL=gpt-image-2
IMAGE_NANO_BANANA_MODEL=gemini-3.1-flash-image
IMAGE_NANO_BANANA_PRO_MODEL=gemini-3-pro-image
```

After writing the file, `chmod 0600` it and confirm it is git-ignored (`.env.image-*` is ignored by this skill's `.gitignore`).

## Commands

Run these from the **user's workspace** — that is the directory `.env.image-generate` is resolved against
(with `$HOME/.env.image-generate` as a fallback). Every block below is self-contained: replace `SKILL_DIR` with
the absolute path of the directory containing this `SKILL.md` before running it.

Text-to-image:

```bash
SKILL_DIR=/absolute/path/to/image-generate   # directory containing this SKILL.md
bash "$SKILL_DIR/scripts/image_generate.sh" \
  --model gpt-image-2 \
  --output /tmp/image-generate-gpt.png \
  "A tiny cute robot painter holding a brush, flat vector icon"
```

Image-to-image / edit:

```bash
SKILL_DIR=/absolute/path/to/image-generate   # directory containing this SKILL.md
bash "$SKILL_DIR/scripts/image_generate.sh" \
  --model gpt-image-2 \
  --image input.jpg \
  --output /tmp/image-generate-edit.png \
  "Turn this into a warm watercolor postcard, keep the main subject"
```

Nano Banana / Gemini image model (routed to `generateContent` automatically):

```bash
SKILL_DIR=/absolute/path/to/image-generate   # directory containing this SKILL.md
bash "$SKILL_DIR/scripts/image_generate.sh" \
  --model gemini-3-pro-image \
  --output /tmp/image-generate-nano-banana.png \
  "A cinematic banana-shaped nano robot on a desk"
```

Multiple reference images, with the route forced:

```bash
SKILL_DIR=/absolute/path/to/image-generate   # directory containing this SKILL.md
bash "$SKILL_DIR/scripts/image_generate.sh" \
  --api gemini \
  --model gemini-3.1-flash-image \
  --image ref-style.png --image ref-subject.png \
  --output /tmp/image-generate-blend.png \
  "Combine the subject with the reference style, studio lighting"
```

Options: `--env FILE`, `--model`, `--api auto|openai|gemini`, `--image PATH` (repeatable), `--size WxH`, `--quality auto|low|medium|high`, `--output PATH`. `--size` and `--quality` apply to the OpenAI route only; the Gemini route ignores them. `IMAGE_ENV_FILE` overrides the default env-file path. Requires `bash`, `curl`, and `python3`.

## Workflow

1. Confirm the target model and whether the request is text-to-image or an edit.
2. Check that credentials resolve (env file or process environment); set them up if missing.
3. Write a concrete prompt — subject, composition, style, lighting, palette, and any text to render in the image.
4. Run the script with an explicit `--output` path.
5. Verify the file exists and is non-empty, then show it to the user (or reference the path). Hosts that support media attachment can attach it directly.

## Troubleshooting

- **Gemini request rejected** — verify the endpoint exposes `/v1beta/models/{model}:generateContent` and that the model is reachable through the connected provider. Never send `gemini-*image*` models to `/images/*`.
- **`missing IMAGE_BASE_URL` / `missing IMAGE_API_KEY`** — no env file was found and the variables are not exported. Pass `--env` or export them.
- **HTTP 400 or any failed request** — the script prints the gateway's own response body to stderr under `--- response body ---`; read that message first. A 400 on an OpenAI-compatible edit usually means the model lacks the image-capability flag `/images/edits` requires. See [references/image-endpoint-notes.md](references/image-endpoint-notes.md).
- **`env file not found`** — `--env` was given a path that does not exist. The default path is only used when it exists; an explicit one must.
- **`unbound variable` or array errors** — the script is written for bash 3.2 (stock macOS `/bin/bash`); if you edit it, re-check with `bash -n scripts/image_generate.sh`.

## Verification

- `bash -n scripts/image_generate.sh` after any edit.
- `node tooling/validate.mjs` to check skill structure and portability rules.
- One small text-to-image request, confirming the output file exists with non-zero size.

## References

- [references/image-endpoint-notes.md](references/image-endpoint-notes.md) — observed gateway behavior for the image endpoints.
- [references/cross-agent-compatibility.md](references/cross-agent-compatibility.md) — install paths and portability rules per agent host.
