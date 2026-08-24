# Image endpoint notes

Observed from an OpenAI-compatible image gateway implementation.

## OpenAI-compatible routes

- When image generation is enabled, `/v1/images/generations` and `/v1/images/edits` are available.
- The server registers `POST /v1/images/generations` and `POST /v1/images/edits`.
- Generation JSON fields include: `prompt`, `model`, `size`, `quality`, `background`, `output_format`, `response_format`.
- Edit calls support JSON `images[].image_url` and multipart `image` / `image[]` plus an optional `mask`.
- Some OpenAI-compatible model definitions require an image-capability flag before the model is allowed on the generation/edit endpoints. A 400 on `/images/edits` for a model that works on `/images/generations` usually means that flag is missing.
- `response_format` accepts `b64_json` and `url`. The script requests `b64_json` and falls back to downloading `url` when a gateway ignores the field.

## Gemini-compatible route (CLIProxyAPI, Nano Banana)

- Path is `POST {base}/v1beta/models/{model}:generateContent`, where `{base}` is `IMAGE_BASE_URL` with a trailing `/v1` stripped. Override the version with `IMAGE_GEMINI_API_VERSION`.
- Auth is `Authorization: Bearer $IMAGE_API_KEY`, matching the OpenAI-compatible routes on the same gateway.
- The request body carries `contents[].parts[]` (a `text` part plus one `inlineData` part per input image) and `generationConfig.responseModalities = ["IMAGE", "TEXT"]`.
- The response image is `candidates[].content.parts[].inlineData.data`, base64-encoded. Some builds emit snake_case `inline_data`; the script accepts both.
- Nano Banana image models are not exposed on `/images/generations` or `/images/edits` on these gateways — sending them there returns a model-not-found or capability error.

## Model routing

| Model id pattern | Route |
| --- | --- |
| `gemini-*image*` (e.g. `gemini-3-pro-image`, `gemini-2.5-flash-image-preview`) | Gemini `generateContent` |
| everything else (e.g. `gpt-image-2`) | OpenAI `/images/generations` or `/images/edits` |

Pass `--api openai` or `--api gemini` when a gateway names its models outside these patterns.
