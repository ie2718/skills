#!/usr/bin/env python3
"""Generate local images using Codex's API provider configuration."""
import argparse
import base64
import binascii
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib
    except ImportError:
        tomllib = None


class Failure(Exception):
    pass


def expand(value):
    def replace(match):
        name = match.group(1)
        if not os.environ.get(name):
            raise Failure(f"Missing environment variable: {name}")
        return os.environ[name]
    return re.sub(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}", replace, str(value))


def read_config(args):
    if tomllib is None:
        raise Failure("Use Python 3.11+ or install tomli for Python 3.9–3.10.")
    home = Path(args.codex_home or os.environ.get("CODEX_HOME", "~/.codex")).expanduser()
    config_path = Path(args.config).expanduser() if args.config else home / "config.toml"
    auth_path = Path(args.auth).expanduser() if args.auth else home / "auth.json"
    try:
        config = tomllib.loads(config_path.read_text()) if config_path.exists() else {}
        auth = json.loads(auth_path.read_text()) if auth_path.exists() else {}
    except (ValueError, OSError):
        raise Failure("Cannot read/parse Codex config or auth file; check format and permissions.")
    if args.config and not config_path.exists():
        raise Failure("Explicit config file does not exist.")
    if args.auth and not auth_path.exists():
        raise Failure("Explicit auth file does not exist.")
    profile = args.profile or config.get("profile")
    if profile:
        if profile not in config.get("profiles", {}):
            raise Failure(f"Unknown config profile: {profile}")
        config = {**config, **config["profiles"][profile]}
    provider_id = args.provider or config.get("model_provider", "openai")
    args.resolved_provider = provider_id
    args.resolved_profile = profile
    provider = config.get("model_providers", {}).get(provider_id, {})
    base = args.base_url or provider.get("base_url") or config.get("base_url")
    if not base and provider_id == "openai":
        base = "https://api.openai.com/v1"
    if not base:
        raise Failure(f"No base_url for provider {provider_id}.")
    if provider.get("env_key"):
        key = os.environ.get(provider["env_key"])
        if not key:
            raise Failure(f"Missing provider credential environment variable: {provider['env_key']}")
    else:
        key = (auth.get("OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
               or provider.get("OPENAI_API_KEY") or config.get("OPENAI_API_KEY"))
    if not key:
        raise Failure("No OPENAI_API_KEY found; ChatGPT login tokens are not API keys.")
    headers = {k: expand(v) for k, v in provider.get("http_headers", {}).items()}
    for header, variable in provider.get("env_http_headers", {}).items():
        if not os.environ.get(variable):
            raise Failure(f"Missing header environment variable: {variable}")
        headers[header] = os.environ[variable]
    if not any(k.lower() == "authorization" for k in headers):
        headers["Authorization"] = "Bearer " + expand(key)
    return expand(base).rstrip("/"), headers


def validate_url(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise Failure("Expected an HTTP(S) URL without embedded credentials.")
    return url


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class DownloadRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def request(url, headers=None, body=None, content_type=None, timeout=180):
    validate_url(url)
    request_headers = dict(headers or {})
    if content_type:
        request_headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=body, headers=request_headers)
    # API redirects are rejected so credentials never follow a different origin.
    opener = urllib.request.build_opener(NoRedirect() if headers else DownloadRedirect())
    try:
        with opener.open(req, timeout=timeout) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        # Raw gateway errors can echo credentials, prompts, or signed URLs.
        raise Failure(f"HTTP {error.code}; check provider endpoint, model access and request options.")
    except (urllib.error.URLError, TimeoutError, OSError):
        raise Failure("Network request failed or timed out; check connectivity and provider availability.")


def api_json(url, headers, payload=None, timeout=180, content_type=None):
    if isinstance(payload, dict):
        payload = json.dumps(payload).encode()
        content_type = "application/json"
    try:
        result = json.loads(request(url, headers, payload, content_type, timeout))
    except ValueError:
        raise Failure("Provider returned invalid JSON.")
    if not isinstance(result, dict):
        raise Failure("Provider returned an unexpected JSON structure.")
    return result


def model_route(model):
    return "gemini" if "gemini" in model.lower() and "image" in model.lower() else "openai"


def image_candidate(item):
    model = item["id"].lower()
    modalities = item.get("output_modalities") or []
    architecture = item.get("architecture") or {}
    if isinstance(architecture, dict):
        modalities = [*modalities, *(architecture.get("output_modalities") or [])]
    return ("gpt-image" in model or "dall-e" in model
            or ("gemini" in model and "image" in model)
            or "image" in modalities)


def discover(base, headers, timeout):
    response = api_json(base + "/models", headers, timeout=timeout)
    if not isinstance(response.get("data"), list):
        raise Failure("Expected an OpenAI-compatible /models data array; use --model for known IDs.")
    return [item for item in response["data"] if isinstance(item, dict) and isinstance(item.get("id"), str)]


def choose_model(items):
    candidates = [item["id"] for item in items if image_candidate(item)]
    if not candidates:
        raise Failure("No image candidates found. Inspect --list-models --all-models or supply --model.")
    def rank(model):
        name = model.lower()
        family = 3 if "gpt-image" in name else 2 if model_route(name) == "gemini" else 1
        version = re.search(r"(?:gpt-image-|gemini-|dall-e-)(\d+(?:\.\d+)*)", name)
        numbers = tuple(int(part) for part in version[1].split(".")) if version else ()
        # Numeric versions, not lexical order; prefer the unsuffixed GPT model
        # over same-version gateway aliases such as flare/sunburst.
        canonical = bool(re.fullmatch(r"gpt-image-\d+(?:\.\d+)*", name))
        return (family, numbers, canonical, name)
    return sorted(candidates, key=rank, reverse=True)[0]


def preference_path(args, base):
    home = Path(args.codex_home or os.environ.get("CODEX_HOME", "~/.codex")).expanduser()
    config = Path(args.config).expanduser() if args.config else home / "config.toml"
    identity = json.dumps([str(config.resolve()), getattr(args, "resolved_profile", args.profile),
                           getattr(args, "resolved_provider", args.provider), base, args.gemini_base_url])
    scope = hashlib.sha256(identity.encode()).hexdigest()
    directory = Path(args.state_dir).expanduser() if args.state_dir else home / "skill-state" / "codex-image-generate"
    return directory / (scope + ".json")


def load_preference(path):
    try:
        value = json.loads(path.read_text())
        if (isinstance(value, dict) and isinstance(value.get("model"), str)
                and value["model"] and value.get("api") in {"openai", "gemini"}):
            return value
    except (OSError, ValueError):
        pass
    return None


def remember_model(path, model, api):
    temporary = None
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            json.dump({"model": model, "api": api}, stream)
        temporary.replace(path)
    except OSError:
        # A persistence failure must not turn a successful paid generation into
        # a failed invocation that the caller might retry.
        print("Warning: image saved, but model preference could not be saved.", file=sys.stderr)
    finally:
        if temporary and temporary.exists():
            try:
                temporary.unlink()
            except OSError:
                pass


def select_model(args, base, headers):
    if args.model:
        return args.model
    previous = None if args.latest else load_preference(preference_path(args, base))
    if previous:
        if args.api == "auto":
            args.api = previous["api"]
        return previous["model"]
    return choose_model(discover(base, headers, args.timeout))


def image_extension(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png", "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg", "image/jpeg"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return ".webp", "image/webp"
    raise Failure("Expected a PNG, JPEG or WebP image; refusing to save non-image content.")


def input_images(paths):
    images = []
    for index, path in enumerate(paths):
        data = Path(path).expanduser().read_bytes()
        extension, mime = image_extension(data)
        images.append((f"reference-{index}{extension}", mime, data))
    return images


def multipart(fields, images):
    boundary = "codeximage" + uuid.uuid4().hex
    chunks = []
    for key, value in fields.items():
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    for filename, mime, data in images:
        field = "image[]" if len(images) > 1 else "image"
        chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + data + b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), "multipart/form-data; boundary=" + boundary


def decode_image(value):
    try:
        return base64.b64decode(value, validate=True)
    except (ValueError, TypeError, binascii.Error):
        raise Failure("Provider returned invalid base64 image data.")


def generate(args, base, headers, model, images):
    route = model_route(model) if args.api == "auto" else args.api
    if route == "gemini":
        if args.size or args.quality:
            raise Failure("--size and --quality apply only to the OpenAI route.")
        parts = [{"text": args.prompt}]
        parts += [{"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode()}}
                  for _, mime, data in images]
        gemini_base = args.gemini_base_url or re.sub(r"/(v1|v1beta)$", "", base) + "/v1beta"
        payload = {"contents": [{"role": "user", "parts": parts}],
                   "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}}
        response = api_json(gemini_base.rstrip("/") + "/models/" + urllib.parse.quote(model, safe="") + ":generateContent",
                            headers, payload, args.timeout)
        for candidate in response.get("candidates") or []:
            for part in candidate.get("content", {}).get("parts", []):
                inline = part.get("inlineData") or part.get("inline_data") or {}
                if inline.get("data"):
                    return decode_image(inline["data"])
    else:
        payload = {"model": model, "prompt": args.prompt, "n": 1}
        if args.size:
            payload["size"] = args.size
        if args.quality:
            payload["quality"] = args.quality
        if "dall-e" in model.lower():
            payload["response_format"] = "b64_json"
        if images:
            body, content_type = multipart(payload, images)
            response = api_json(base + "/images/edits", headers, body, args.timeout, content_type)
        else:
            response = api_json(base + "/images/generations", headers, payload, args.timeout)
        for item in response.get("data") or []:
            if item.get("b64_json"):
                return decode_image(item["b64_json"])
            if item.get("url"):
                return request(item["url"], timeout=args.timeout)
    raise Failure("Provider returned no image; check model capability, prompt restrictions and endpoint support.")


def workspace_output(workspace, output=None):
    root = Path(workspace).expanduser().resolve()
    if not root.is_dir():
        raise Failure("Workspace directory does not exist.")
    requested = Path(output).expanduser() if output else Path("output") / f"codex-image-{uuid.uuid4().hex[:12]}.png"
    path = (requested if requested.is_absolute() else root / requested).resolve()
    # Include possible corrected extensions, which may themselves be symlinks.
    for candidate in [path, *(path.with_suffix(ext).resolve() for ext in (".png", ".jpg", ".jpeg", ".webp"))]:
        if not candidate.is_relative_to(root):
            raise Failure("Image output must stay inside the current conversation/project workspace.")
    return path


def save_image(output, data, overwrite, workspace=None):
    extension, _ = image_extension(data)
    path = Path(output).expanduser().resolve()
    if path.suffix.lower() != extension and not (extension == ".jpg" and path.suffix.lower() == ".jpeg"):
        path = path.with_suffix(extension)
    if workspace is not None:
        path = workspace_output(workspace, path)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("wb" if overwrite else "xb") as stream:
            stream.write(data)
    except FileExistsError:
        raise Failure("Output already exists; choose a new path or pass --overwrite.")
    return path


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("prompt", nargs="?")
    for flag in ("codex-home", "config", "auth", "profile", "provider", "base-url", "gemini-base-url", "state-dir", "size", "quality"):
        result.add_argument("--" + flag)
    selection = result.add_mutually_exclusive_group()
    selection.add_argument("--model", help="Explicit model; remembered after a successful generation")
    selection.add_argument("--latest", action="store_true", help="Ignore remembered model and discover the newest candidate")
    result.add_argument("--api", choices=["auto", "openai", "gemini"], default="auto")
    result.add_argument("--image", action="append", default=[])
    result.add_argument("--workspace-dir", default=str(Path.cwd()), help="Current conversation/project directory (default: working directory)")
    result.add_argument("--output", help="Path inside workspace (default: output/codex-image-<unique-id>.png)")
    result.add_argument("--timeout", type=float, default=180)
    for flag in ("list-models", "all-models", "overwrite"):
        result.add_argument("--" + flag, action="store_true")
    return result


def main():
    arguments = parser()
    args = arguments.parse_args()
    if not args.list_models and not (args.prompt and args.prompt.strip()):
        arguments.error("provide a prompt or use --list-models")
    if args.all_models and not args.list_models:
        arguments.error("--all-models requires --list-models")
    if args.timeout <= 0:
        arguments.error("--timeout must be positive")
    try:
        base, headers = read_config(args)
        if args.list_models:
            models = discover(base, headers, args.timeout)
            print(json.dumps([{"id": item["id"], "api": model_route(item["id"]),
                               "image_candidate": image_candidate(item)} for item in models
                              if args.all_models or image_candidate(item)], ensure_ascii=False, indent=2))
            return 0
        output = workspace_output(args.workspace_dir, args.output)
        if not args.overwrite and any(output.with_suffix(ext).exists() for ext in {".png", ".jpg", ".jpeg", ".webp", output.suffix}):
            raise Failure("Output already exists; choose a new path or pass --overwrite.")
        images = input_images(args.image)
        model = select_model(args, base, headers)
        print(f"Using image model: {model}", file=sys.stderr)
        data = generate(args, base, headers, model, images)
        path = save_image(output, data, args.overwrite, args.workspace_dir)
        remember_model(preference_path(args, base), model, model_route(model) if args.api == "auto" else args.api)
        print(path)
        return 0
    except Failure as error:
        print(f"codex-image-generate: {error}", file=sys.stderr)
        return 1
    except (OSError, ValueError, TypeError, AttributeError, KeyError):
        print("codex-image-generate: Invalid config/response or unreadable/unwritable local file.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
