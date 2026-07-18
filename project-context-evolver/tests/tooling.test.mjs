import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INSTALLER = join(ROOT, "tooling", "install.mjs");
const AUDITOR = join(ROOT, "scripts", "audit-context.mjs");

test("installs a minimal Codex project skill copy", async () => {
  const project = await mkdtemp(join(tmpdir(), "pce-project-"));
  const result = run(INSTALLER, ["--target", "codex", "--scope", "project", "--project-dir", project]);
  assert.equal(result.status, 0, result.stderr);

  const destination = join(project, ".agents", "skills", "project-context-evolver");
  const skill = await readFile(join(destination, "SKILL.md"), "utf8");
  assert.match(skill, /name: project-context-evolver/);
  await access(join(destination, "tooling", "install.mjs"));
  await access(join(destination, "tooling", "validate.mjs"));
  const validation = run(join(destination, "tooling", "validate.mjs"), []);
  assert.equal(validation.status, 0, validation.stderr);
  await assert.rejects(access(join(destination, "README.md")));
});

test("installs user copies for all primary hosts", async () => {
  const home = await mkdtemp(join(tmpdir(), "pce-home-"));
  const result = run(INSTALLER, ["--target", "all", "--scope", "user", "--home-dir", home]);
  assert.equal(result.status, 0, result.stderr);

  const expected = [
    [".agents", "skills"],
    [".claude", "skills"],
    [".gemini", "skills"],
    [".copilot", "skills"],
    [".cursor", "skills"]
  ];
  for (const parts of expected) {
    await access(join(home, ...parts, "project-context-evolver", "SKILL.md"));
  }
});

test("refuses overwrite unless force is explicit", async () => {
  const project = await mkdtemp(join(tmpdir(), "pce-force-"));
  const args = ["--target", "claude", "--scope", "project", "--project-dir", project];
  assert.equal(run(INSTALLER, args).status, 0);
  const refused = run(INSTALLER, args);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Destination exists/);
  assert.equal(run(INSTALLER, [...args, "--force"]).status, 0);
});

test("audits instruction files and package scripts without writing", async () => {
  const project = await mkdtemp(join(tmpdir(), "pce-audit-"));
  await mkdir(join(project, "docs"), { recursive: true });
  await mkdir(join(project, ".claude", "worktrees", "stale"), { recursive: true });
  await writeFile(join(project, "AGENTS.md"), "# AGENTS.md\n", "utf8");
  await writeFile(join(project, "docs", "architecture.md"), "# Architecture\n", "utf8");
  await writeFile(join(project, ".claude", "worktrees", "stale", "AGENTS.md"), "# Stale\n", "utf8");
  await writeFile(join(project, "package.json"), JSON.stringify({ name: "fixture", scripts: { test: "node --test" } }), "utf8");

  const result = run(AUDITOR, ["--root", project, "--format", "markdown"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /`AGENTS\.md`/);
  assert.match(result.stdout, /`docs\/architecture\.md`/);
  assert.match(result.stdout, /`test`: `node --test`/);
  assert.doesNotMatch(result.stdout, /worktrees\/stale/);
});

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}
