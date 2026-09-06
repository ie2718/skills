#!/usr/bin/env node

import { cp, lstat, mkdir, rm, symlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_NAME = "blender-scene-brief";
const SOURCE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const RUNTIME_ENTRIES = ["SKILL.md", "README.md", "agents", "assets", "references", "scripts", "tooling"];
const PRIMARY_TARGETS = ["codex", "claude", "gemini", "copilot", "cursor"];
const TARGETS = new Set([...PRIMARY_TARGETS, "codex-home"]);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const targets = expandTargets(options.targets);
  if (targets.length === 0) {
    throw new Error("Pass --target <codex|claude|gemini|copilot|cursor|codex-home|all>.");
  }

  for (const target of targets) {
    const destinationRoot = resolveDestinationRoot(target, options);
    const destination = join(destinationRoot, SKILL_NAME);
    console.log(`${options.dryRun ? "Would install" : "Installing"} ${target} -> ${destination}`);
    if (options.dryRun) continue;
    await install(destination, options.mode, options.force);
  }
}

function parseArgs(args) {
  const options = {
    targets: [],
    scope: "project",
    mode: "copy",
    projectDir: process.cwd(),
    homeDir: homedir(),
    force: false,
    dryRun: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--target") options.targets.push(requireValue(args, ++index, arg));
    else if (arg === "--scope") options.scope = requireValue(args, ++index, arg);
    else if (arg === "--mode") options.mode = requireValue(args, ++index, arg);
    else if (arg === "--project-dir") options.projectDir = requireValue(args, ++index, arg);
    else if (arg === "--home-dir") options.homeDir = requireValue(args, ++index, arg);
    else if (arg === "--force") options.force = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!new Set(["project", "user"]).has(options.scope)) {
    throw new Error("--scope must be project or user.");
  }
  if (!new Set(["copy", "link"]).has(options.mode)) {
    throw new Error("--mode must be copy or link.");
  }
  options.projectDir = resolve(options.projectDir);
  options.homeDir = resolve(options.homeDir);
  return options;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function expandTargets(values) {
  const expanded = [];
  for (const value of values.flatMap((entry) => entry.split(","))) {
    const target = value.trim().toLowerCase();
    if (!target) continue;
    if (target === "all") expanded.push(...PRIMARY_TARGETS);
    else if (TARGETS.has(target)) expanded.push(target);
    else throw new Error(`Unsupported target: ${target}`);
  }
  return [...new Set(expanded)];
}

function resolveDestinationRoot(target, options) {
  if (target === "codex-home") {
    if (options.scope !== "user") throw new Error("codex-home supports only --scope user.");
    const configured = process.env.CODEX_HOME;
    const codexHome = configured
      ? isAbsolute(configured) ? configured : resolve(configured)
      : join(options.homeDir, ".codex");
    return join(codexHome, "skills");
  }

  const relative = options.scope === "project"
    ? {
        codex: [".agents", "skills"],
        claude: [".claude", "skills"],
        gemini: [".gemini", "skills"],
        copilot: [".github", "skills"],
        cursor: [".cursor", "skills"]
      }[target]
    : {
        codex: [".agents", "skills"],
        claude: [".claude", "skills"],
        gemini: [".gemini", "skills"],
        copilot: [".copilot", "skills"],
        cursor: [".cursor", "skills"]
      }[target];

  const base = options.scope === "project" ? options.projectDir : options.homeDir;
  return join(base, ...relative);
}

async function install(destination, mode, force) {
  const existing = await pathExists(destination);
  if (existing && !force) {
    throw new Error(`Destination exists: ${destination}. Re-run with --force to replace it.`);
  }
  if (existing) await rm(destination, { recursive: true, force: true });
  await mkdir(dirname(destination), { recursive: true });

  if (mode === "link") {
    await symlink(SOURCE_ROOT, destination, process.platform === "win32" ? "junction" : "dir");
    return;
  }

  await mkdir(destination, { recursive: true });
  for (const entry of RUNTIME_ENTRIES) {
    await cp(join(SOURCE_ROOT, entry), join(destination, entry), { recursive: true, force: true });
  }
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function printHelp() {
  console.log(`Blender Scene Brief installer

Usage:
  node tooling/install.mjs --target <target> [options]

Targets:
  codex       .agents/skills
  claude      .claude/skills
  gemini      .gemini/skills
  copilot     .github/skills (project) or ~/.copilot/skills (user)
  cursor      .cursor/skills
  codex-home  compatibility install under \${CODEX_HOME:-~/.codex}/skills
  all         codex, claude, gemini, copilot, and cursor

Options:
  --scope project|user   Install scope (default: project)
  --project-dir <path>   Project root (default: current directory)
  --home-dir <path>      User home override (useful for automation/tests)
  --mode copy|link       Install mode (default: copy)
  --force                Replace an existing destination
  --dry-run              Print destinations without writing
  --help                 Show this help
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
