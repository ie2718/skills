"""Offline integration tests; no real credentials or paid generation calls."""
import base64
from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/codex_image_generate.py"
SPEC = importlib.util.spec_from_file_location("client", SCRIPT)
client = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(client)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=")


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.calls = []
        self.mode = "base64"
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                self.handle_request()

            def do_POST(self):
                self.handle_request()

            def handle_request(self):
                body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
                owner.calls.append((self.path, dict(self.headers), body))
                if self.path.endswith("/models"):
                    result = {"data": [{"id": "chat-model"}, {"id": "gpt-image-1"},
                                       {"id": "gemini-test-image"}, {"id": "gpt-image-2"}]}
                elif self.path == "/download":
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(PNG)
                    return
                elif owner.mode == "redirect":
                    self.send_response(302)
                    self.send_header("Location", owner.base + "/download")
                    self.end_headers()
                    return
                elif owner.mode == "error":
                    self.send_response(401)
                    self.end_headers()
                    self.wfile.write(b'fake-secret should not be logged')
                    return
                elif owner.mode == "empty":
                    result = {"data": []}
                elif self.path.endswith(":generateContent"):
                    result = {"candidates": [{"content": {"parts": [
                        {"inlineData": {"data": base64.b64encode(PNG).decode()}}]}}]}
                elif owner.mode == "url":
                    result = {"data": [{"url": owner.base + "/download"}]}
                else:
                    result = {"data": [{"b64_json": base64.b64encode(PNG).decode()}]}
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.base = f"http://127.0.0.1:{self.server.server_port}"
        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.write_config()
        (self.root / "auth.json").write_text(json.dumps({"OPENAI_API_KEY": "fake-secret"}))

    def write_config(self, extra=""):
        (self.root / "config.toml").write_text(
            'model_provider = "proxy"\nmodel = "chat-model"\n'
            f'[model_providers.proxy]\nbase_url = "{self.base}/prefix/v1"\n' + extra)

    def run_cli(self, *args, env=None):
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch.dict(os.environ, env or {}, clear=True), patch.object(
            client.sys, "argv", [str(SCRIPT), "--codex-home", str(self.root), "--workspace-dir", str(self.root), *args]
        ), redirect_stdout(stdout), redirect_stderr(stderr):
            code = client.main()
        self.assertNotIn("fake-secret", stdout.getvalue() + stderr.getvalue())
        return code, stdout.getvalue(), stderr.getvalue()

    def generate(self, *args):
        return self.run_cli("--output", str(self.root / "result.png"), *args, "test prompt")

    def test_discover_generate_and_save(self):
        code, stdout, stderr = self.generate()
        self.assertEqual(code, 0, stderr)
        self.assertEqual(Path(stdout.strip()).read_bytes(), PNG)
        self.assertEqual(self.calls[0][0], "/prefix/v1/models")
        route, headers, raw = self.calls[1]
        self.assertEqual(route, "/prefix/v1/images/generations")
        self.assertEqual(headers["Authorization"], "Bearer fake-secret")
        body = json.loads(raw)
        self.assertEqual(body["model"], "gpt-image-2")
        self.assertNotIn("response_format", body)
        self.assertNotIn("quality", body)

    def test_listing_filters_chat_model(self):
        code, stdout, _ = self.run_cli("--list-models")
        self.assertEqual(code, 0)
        self.assertEqual(len(json.loads(stdout)), 3)
        code, stdout, _ = self.run_cli("--list-models", "--all-models")
        self.assertEqual(len(json.loads(stdout)), 4)

    def test_url_download_does_not_forward_credentials(self):
        self.mode = "url"
        self.write_config('[model_providers.proxy.http_headers]\nX-Api-Key="private-header"\n')
        code, _, stderr = self.generate("--model", "custom-image-alias")
        self.assertEqual(code, 0, stderr)
        self.assertEqual(self.calls[-1][0], "/download")
        self.assertNotIn("Authorization", self.calls[-1][1])
        self.assertNotIn("X-Api-Key", self.calls[-1][1])
        self.assertEqual(len(self.calls), 2)

    def test_edit_multipart_and_dalle_format(self):
        ref = self.root / "ref.png"
        ref.write_bytes(PNG)
        code, _, stderr = self.generate("--model", "dall-e-2", "--image", str(ref), "--image", str(ref))
        self.assertEqual(code, 0, stderr)
        route, headers, body = self.calls[0]
        self.assertEqual(route, "/prefix/v1/images/edits")
        self.assertIn("multipart/form-data", headers["Content-Type"])
        self.assertEqual(body.count(b'name="image[]"'), 2)
        self.assertIn(b"b64_json", body)
        self.assertIn(PNG, body)

    def test_gemini_reference_route_preserves_prefix(self):
        ref = self.root / "ref.png"
        ref.write_bytes(PNG)
        code, _, stderr = self.generate("--model", "gemini-test-image", "--image", str(ref))
        self.assertEqual(code, 0, stderr)
        self.assertEqual(self.calls[0][0], "/prefix/v1beta/models/gemini-test-image:generateContent")
        payload = json.loads(self.calls[0][2])
        self.assertEqual(payload["contents"][0]["parts"][1]["inlineData"]["mimeType"], "image/png")

    def test_profile_env_key_and_headers(self):
        self.write_config('[profiles.alt]\nmodel_provider="second"\n'
                          '[model_providers.second]\nbase_url="${TEST_BASE}/v1"\nenv_key="TEST_KEY"\n'
                          '[model_providers.second.http_headers]\nX-Client="codex"\n'
                          '[model_providers.second.env_http_headers]\nX-Tenant="TEST_TENANT"\n')
        code, _, stderr = self.run_cli("--profile", "alt", "--list-models", env={
            "TEST_BASE": self.base, "TEST_KEY": "profile-secret", "TEST_TENANT": "tenant-a"})
        self.assertEqual(code, 0, stderr)
        self.assertEqual(self.calls[0][0], "/v1/models")
        self.assertEqual(self.calls[0][1]["Authorization"], "Bearer profile-secret")
        self.assertEqual(self.calls[0][1]["X-Tenant"], "tenant-a")

    def test_missing_env_key_does_not_fall_back_to_auth(self):
        self.write_config('env_key="UNSET_KEY"\n')
        code, _, _ = self.run_cli("--list-models")
        self.assertEqual(code, 1)
        self.assertEqual(self.calls, [])

    def test_config_key_and_codex_home(self):
        (self.root / "auth.json").unlink()
        self.write_config('OPENAI_API_KEY="fake-secret"\n')
        args = client.parser().parse_args([])
        with patch.dict(os.environ, {"CODEX_HOME": str(self.root)}, clear=True):
            base, headers = client.read_config(args)
        self.assertEqual(base, self.base + "/prefix/v1")
        self.assertEqual(headers["Authorization"], "Bearer fake-secret")

    def test_errors_are_redacted_and_not_retried(self):
        self.mode = "error"
        code, _, stderr = self.generate("--model", "gpt-image-2")
        self.assertEqual(code, 1)
        self.assertIn("HTTP 401", stderr)
        self.assertEqual(len(self.calls), 1)
        self.assertFalse((self.root / "result.png").exists())

    def test_api_redirect_is_rejected(self):
        self.mode = "redirect"
        code, _, stderr = self.generate("--model", "gpt-image-2")
        self.assertEqual(code, 1)
        self.assertIn("HTTP 302", stderr)
        self.assertEqual(len(self.calls), 1)

    def test_empty_response_fails_without_file(self):
        self.mode = "empty"
        code, _, _ = self.generate("--model", "gpt-image-2")
        self.assertEqual(code, 1)
        self.assertFalse((self.root / "result.png").exists())

    def test_existing_output_stops_before_paid_request(self):
        (self.root / "result.png").write_bytes(PNG)
        code, _, _ = self.generate()
        self.assertEqual(code, 1)
        self.assertEqual(self.calls, [])

    def test_image_validation_and_suffix(self):
        with self.assertRaises(client.Failure):
            client.save_image(self.root / "bad.png", b"<html>Error</html>", False)
        output = client.save_image(self.root / "valid.jpg", PNG, False)
        self.assertEqual(output.suffix, ".png")
        self.assertEqual(output.read_bytes(), PNG)

    def test_no_candidates_does_not_choose_chat_model(self):
        with self.assertRaises(client.Failure):
            client.choose_model([{"id": "chat-model"}])

    def test_output_modality_metadata_and_null_fields(self):
        self.assertTrue(client.image_candidate({"id": "custom", "architecture": {"output_modalities": ["image"]}}))
        self.assertFalse(client.image_candidate({"id": "chat", "output_modalities": None}))

    def test_configured_http_endpoint_is_supported(self):
        self.assertEqual(client.validate_url("http://gateway.example/v1"), "http://gateway.example/v1")
        with self.assertRaises(client.Failure):
            client.validate_url("file:///tmp/private")

    def test_chatgpt_tokens_are_not_used_as_api_keys(self):
        (self.root / "auth.json").write_text(json.dumps({"tokens": {"access_token": "not-an-api-key"}}))
        code, _, stderr = self.run_cli("--list-models")
        self.assertEqual(code, 1)
        self.assertIn("No OPENAI_API_KEY", stderr)
        self.assertEqual(self.calls, [])

    def test_newest_numeric_version_and_canonical_alias(self):
        items = [{"id": model} for model in ["gpt-image-2", "gpt-image-2.5-sunburst",
                 "gpt-image-2.5", "gpt-image-2.5-flare", "gemini-3.1-flash-image"]]
        self.assertEqual(client.choose_model(items), "gpt-image-2.5")
        items += [{"id": "gpt-image-2.10"}, {"id": "gpt-image-2.9"}]
        self.assertEqual(client.choose_model(items), "gpt-image-2.10")

    def test_default_output_stays_in_workspace_and_is_unique(self):
        code, stdout, stderr = self.run_cli("--model", "gpt-image-2", "test prompt")
        self.assertEqual(code, 0, stderr)
        first = Path(stdout.strip())
        self.assertEqual(first.parent, self.root.resolve() / "output")
        self.assertEqual(first.read_bytes(), PNG)
        code, stdout, stderr = self.run_cli("--model", "gpt-image-2", "test prompt")
        self.assertEqual(code, 0, stderr)
        self.assertNotEqual(first, Path(stdout.strip()))

    def test_relative_output_uses_workspace_not_script_directory(self):
        code, stdout, stderr = self.run_cli("--model", "gpt-image-2", "--output", "images/panda.png", "test prompt")
        self.assertEqual(code, 0, stderr)
        self.assertEqual(Path(stdout.strip()), self.root.resolve() / "images/panda.png")

    def test_external_outputs_rejected_before_api_request(self):
        for target in ["../outside.png", str(self.root.parent / "outside.png")]:
            code, _, stderr = self.run_cli("--output", target, "test prompt")
            self.assertEqual(code, 1)
            self.assertIn("inside the current conversation/project", stderr)
        self.assertEqual(self.calls, [])

    def test_symlink_escape_including_corrected_extension_is_rejected(self):
        (self.root / "external").symlink_to(self.root.parent, target_is_directory=True)
        (self.root / "picture.jpg").symlink_to(self.root.parent / "outside.jpg")
        for target in ["external/picture.png", "picture.png"]:
            code, _, stderr = self.run_cli("--output", target, "test prompt")
            self.assertEqual(code, 1)
            self.assertIn("inside the current conversation/project", stderr)
        self.assertEqual(self.calls, [])

    def test_remember_explicit_choice_and_latest_overrides_it(self):
        code, _, stderr = self.generate("--model", "gpt-image-1")
        self.assertEqual(code, 0, stderr)
        self.calls.clear()
        code, _, stderr = self.generate("--overwrite")
        self.assertEqual(code, 0, stderr)
        self.assertEqual(len(self.calls), 1)  # No discovery when reusing memory.
        self.assertEqual(json.loads(self.calls[0][2])["model"], "gpt-image-1")
        self.calls.clear()
        code, _, stderr = self.generate("--latest", "--overwrite")
        self.assertEqual(code, 0, stderr)
        self.assertEqual(self.calls[0][0], "/prefix/v1/models")
        self.assertEqual(json.loads(self.calls[1][2])["model"], "gpt-image-2")
        state = next((self.root / "skill-state/codex-image-generate").glob("*.json"))
        self.assertEqual(json.loads(state.read_text()), {"model": "gpt-image-2", "api": "openai"})

    def test_failed_generation_preserves_successful_choice(self):
        self.assertEqual(self.generate("--model", "gpt-image-1")[0], 0)
        self.mode = "error"
        self.assertEqual(self.generate("--model", "gpt-image-2", "--overwrite")[0], 1)
        self.mode = "base64"
        self.calls.clear()
        self.assertEqual(self.generate("--overwrite")[0], 0)
        self.assertEqual(json.loads(self.calls[0][2])["model"], "gpt-image-1")

    def test_custom_alias_remembers_api_route(self):
        self.assertEqual(self.generate("--model", "custom-alias", "--api", "gemini")[0], 0)
        self.calls.clear()
        self.assertEqual(self.generate("--overwrite")[0], 0)
        self.assertEqual(self.calls[0][0], "/prefix/v1beta/models/custom-alias:generateContent")

    def test_preference_isolated_by_endpoint_and_corrupt_state_recovers(self):
        self.assertEqual(self.generate("--model", "gpt-image-1")[0], 0)
        state = next((self.root / "skill-state/codex-image-generate").glob("*.json"))
        state.write_text("corrupt")
        self.calls.clear()
        self.assertEqual(self.generate("--overwrite")[0], 0)
        self.assertEqual(self.calls[0][0], "/prefix/v1/models")
        self.calls.clear()
        self.assertEqual(self.generate("--base-url", self.base + "/other/v1", "--overwrite")[0], 0)
        self.assertEqual(self.calls[0][0], "/other/v1/models")

    def test_unwritable_preference_does_not_fail_generation(self):
        state_dir = self.root / "not-a-directory"
        state_dir.write_text("file")
        code, stdout, stderr = self.generate("--model", "gpt-image-2", "--state-dir", str(state_dir))
        self.assertEqual(code, 0, stderr)
        self.assertEqual(Path(stdout.strip()).read_bytes(), PNG)
        self.assertIn("preference could not be saved", stderr)


if __name__ == "__main__":
    unittest.main()
