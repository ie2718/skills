#!/usr/bin/env bash
# Portable image generation / editing client for OpenAI-compatible and
# Gemini-compatible (CLIProxyAPI, Nano Banana) image endpoints.
# Requires: bash 3.2+, curl, python3.
set -euo pipefail

ENV_FILE=${IMAGE_ENV_FILE:-.env.image-generate}
ENV_FILE_EXPLICIT=0
MODEL=${IMAGE_DEFAULT_MODEL:-gpt-image-2}
SIZE=1024x1024
QUALITY=auto
OUTPUT=image-generate.png
API_MODE=auto
IMAGES=()

usage() {
  cat >&2 <<'USAGE'
usage: image_generate.sh [options] PROMPT

Options:
  --env FILE            dotenv file with credentials (default: .env.image-generate)
  --model MODEL         model id (default: $IMAGE_DEFAULT_MODEL or gpt-image-2)
  --api auto|openai|gemini
                        force the request route (default: auto, by model id)
  --image PATH          input image for edit / image-to-image; repeatable
  --size WxH            OpenAI image size (default: 1024x1024)
  --quality auto|low|medium|high
                        OpenAI quality (default: auto)
  --output OUT.png      output file path (default: image-generate.png)
  -h, --help            show this help

Environment variables (IMAGE_BASE_URL and IMAGE_API_KEY are required) may come
from the dotenv file or the current process environment.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_FILE=$2; ENV_FILE_EXPLICIT=1; shift 2 ;;
    --model) MODEL=$2; shift 2 ;;
    --api) API_MODE=$2; shift 2 ;;
    --image) IMAGES+=("$2"); shift 2 ;;
    --size) SIZE=$2; shift 2 ;;
    --quality) QUALITY=$2; shift 2 ;;
    --output) OUTPUT=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    -*) echo "unknown option: $1" >&2; usage; exit 2 ;;
    *) break ;;
  esac
done

if [[ $# -lt 1 ]]; then usage; exit 2; fi
PROMPT=$1

case "$API_MODE" in
  auto|openai|gemini) ;;
  *) echo "--api must be auto, openai, or gemini" >&2; exit 2 ;;
esac

for image_path in ${IMAGES[@]+"${IMAGES[@]}"}; do
  [[ -f "$image_path" ]] || { echo "input image not found: $image_path" >&2; exit 2; }
done

if [[ $ENV_FILE_EXPLICIT -eq 1 && ! -e "$ENV_FILE" ]]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 2
fi

# Fall back to a home-directory env file so a user-scope install works from any workspace.
if [[ $ENV_FILE_EXPLICIT -eq 0 && ! -e "$ENV_FILE" && -e "$HOME/.env.image-generate" ]]; then
  ENV_FILE=$HOME/.env.image-generate
fi

if [[ -e "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${IMAGE_BASE_URL:?missing IMAGE_BASE_URL}"
: "${IMAGE_API_KEY:?missing IMAGE_API_KEY}"
BASE=${IMAGE_BASE_URL%/}
TMP=$(mktemp)
trap 'rm -f "$TMP" "$TMP.req"' EXIT

request() {
  # Body goes to $TMP. curl --fail-with-body writes the error body to stdout,
  # which the redirect would otherwise swallow, so print it on failure.
  local status=0
  curl -sS --fail-with-body "$@" > "$TMP" || status=$?
  if [[ $status -ne 0 ]]; then
    echo "image_generate: request failed (curl exit $status)" >&2
    if [[ -s "$TMP" ]]; then
      echo "--- response body ---" >&2
      head -c 2000 "$TMP" >&2
      echo >&2
    fi
    exit 1
  fi
}

use_gemini_route() {
  case "$API_MODE" in
    gemini) return 0 ;;
    openai) return 1 ;;
  esac
  # Nano Banana / Gemini image models (gemini-3-pro-image,
  # gemini-3.1-flash-image, gemini-2.5-flash-image-preview, ...).
  [[ "$MODEL" == gemini-*image* ]]
}

if use_gemini_route; then
  # CLIProxyAPI exposes Nano Banana models through its Gemini-compatible
  # generateContent endpoint, not OpenAI's /images/* endpoints.
  GEMINI_BASE=${BASE%/v1}
  GEMINI_VERSION=${IMAGE_GEMINI_API_VERSION:-v1beta}
  python3 - "$MODEL" "$PROMPT" ${IMAGES[@]+"${IMAGES[@]}"} > "$TMP.req" <<'PY'
import base64, json, mimetypes, pathlib, sys

model, prompt, *images = sys.argv[1:]
parts = [{"text": prompt}]
for image_path in images:
    path = pathlib.Path(image_path)
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    parts.append({
        "inlineData": {
            "mimeType": mime_type,
            "data": base64.b64encode(path.read_bytes()).decode("ascii"),
        }
    })

print(json.dumps({
    "contents": [{"role": "user", "parts": parts}],
    "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
}))
PY
  request -X POST "$GEMINI_BASE/$GEMINI_VERSION/models/$MODEL:generateContent" \
    -H "Authorization: Bearer $IMAGE_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary @"$TMP.req"
  python3 - "$TMP" "$OUTPUT" <<'PY'
import base64, json, pathlib, sys

resp = json.loads(pathlib.Path(sys.argv[1]).read_text())
out = pathlib.Path(sys.argv[2]).expanduser().resolve()
out.parent.mkdir(parents=True, exist_ok=True)
for candidate in resp.get("candidates") or []:
    for part in candidate.get("content", {}).get("parts", []):
        image = part.get("inlineData") or part.get("inline_data") or {}
        if image.get("data"):
            out.write_bytes(base64.b64decode(image["data"]))
            print(out)
            raise SystemExit(0)
raise SystemExit("no inline image in Gemini response: " + json.dumps(resp)[:1000])
PY
  exit 0
elif [[ ${#IMAGES[@]} -eq 0 ]]; then
  python3 - "$MODEL" "$PROMPT" "$SIZE" "$QUALITY" > "$TMP.req" <<'PY'
import json, sys
model, prompt, size, quality = sys.argv[1:5]
print(json.dumps({"model": model, "prompt": prompt, "size": size, "quality": quality, "response_format": "b64_json"}))
PY
  request -X POST "$BASE/images/generations" \
    -H "Authorization: Bearer $IMAGE_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary @"$TMP.req"
else
  FORM=(-F "model=$MODEL" -F "prompt=$PROMPT" -F "size=$SIZE" -F "quality=$QUALITY" -F "response_format=b64_json")
  for img in "${IMAGES[@]}"; do FORM+=( -F "image=@${img}" ); done
  request -X POST "$BASE/images/edits" \
    -H "Authorization: Bearer $IMAGE_API_KEY" \
    "${FORM[@]}"
fi

python3 - "$TMP" "$OUTPUT" <<'PY'
import base64, json, pathlib, sys, urllib.request
resp = json.loads(pathlib.Path(sys.argv[1]).read_text())
out = pathlib.Path(sys.argv[2]).expanduser().resolve()
out.parent.mkdir(parents=True, exist_ok=True)
item = (resp.get("data") or [{}])[0]
if item.get("b64_json"):
    out.write_bytes(base64.b64decode(item["b64_json"]))
elif item.get("url"):
    out.write_bytes(urllib.request.urlopen(item["url"], timeout=120).read())
else:
    raise SystemExit("no image in response: " + json.dumps(resp)[:1000])
print(out)
PY
