#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

const IGNORED_DIRECTORIES = new Set([
  ".git", ".cache", ".next", ".turbo", ".vite", "build", "coverage", "dist",
  "node_modules", "out", "target", "vendor"
]);
const IGNORED_PATH_PREFIXES = [".agents/worktrees", ".claude/worktrees", ".codex/worktrees"];
const INSTRUCTION_FILES = new Set([
  "AGENTS.md", "AGENTS.override.md", "CLAUDE.md", "GEMINI.md", "copilot-instructions.md"
]);
const CONTEXT_FILES = new Set([
  "PLANS.md", "README.md", "architecture.md", "context-index.md", "decisions.md",
  "development-log.md", "prd.md", "roadmap.md", "task-template.md"
]);
const MANIFEST_FILES = new Set([
  "Cargo.toml", "Makefile", "package.json", "pnpm-workspace.yaml", "pyproject.toml",
  "requirements.txt", "tsconfig.json", "turbo.json", "vite.config.ts", "vite.config.js"
]);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const inventory = await audit(options.root, options.maxDepth);
  console.log(options.format === "json" ? JSON.stringify(inventory, null, 2) : renderMarkdown(inventory));
}

function parseArgs(args) {
  const options = { root: process.cwd(), format: "markdown", maxDepth: 6, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--root") options.root = requireValue(args, ++index, arg);
    else if (arg === "--format") options.format = requireValue(args, ++index, arg);
    else if (arg === "--max-depth") options.maxDepth = Number(requireValue(args, ++index, arg));
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!new Set(["markdown", "json"]).has(options.format)) {
    throw new Error("--format must be markdown or json.");
  }
  if (!Number.isInteger(options.maxDepth) || options.maxDepth < 1 || options.maxDepth > 20) {
    throw new Error("--max-depth must be an integer between 1 and 20.");
  }
  options.root = resolve(options.root);
  return options;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

async function audit(root, maxDepth) {
  const files = [];
  await walk(root, root, 0, maxDepth, files);
  files.sort();

  const instructions = files.filter((path) => INSTRUCTION_FILES.has(basename(path)));
  const context = files.filter((path) => CONTEXT_FILES.has(basename(path)));
  const manifests = files.filter((path) => MANIFEST_FILES.has(basename(path)));
  const skills = files.filter((path) => basename(path) === "SKILL.md");
  const packages = await readPackageScripts(root, manifests.filter((path) => basename(path) === "package.json"));
  const signals = [];

  if (!instructions.some((path) => basename(path) === "AGENTS.md")) {
    signals.push("No AGENTS.md was discovered within the scan depth.");
  }
  if (context.length >= 4 && !context.some((path) => basename(path) === "context-index.md")) {
    signals.push("Several context documents exist but no docs/context-index.md was discovered.");
  }
  if (packages.length > 0 && packages.every((pkg) => Object.keys(pkg.scripts).length === 0)) {
    signals.push("Package manifests were found, but none expose runnable scripts.");
  }

  return { root, maxDepth, instructions, context, manifests, skills, packages, signals };
}

async function walk(root, directory, depth, maxDepth, files) {
  if (depth > maxDepth || files.length >= 10000) return;
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "EACCES" || error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    const portable = toPortable(relative(root, absolute));
    if (entry.isDirectory() && IGNORED_PATH_PREFIXES.some((prefix) => portable === prefix || portable.startsWith(`${prefix}/`))) {
      continue;
    }
    if (entry.isDirectory()) await walk(root, absolute, depth + 1, maxDepth, files);
    else if (entry.isFile()) files.push(portable);
  }
}

async function readPackageScripts(root, packagePaths) {
  const packages = [];
  for (const path of packagePaths) {
    try {
      const value = JSON.parse(await readFile(join(root, path), "utf8"));
      packages.push({ path, name: typeof value.name === "string" ? value.name : undefined, scripts: value.scripts ?? {} });
    } catch (error) {
      packages.push({ path, scripts: {}, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return packages;
}

function renderMarkdown(inventory) {
  const sections = [
    "# Project Context Audit",
    "",
    `Root: \`${inventory.root}\``,
    `Scan depth: ${inventory.maxDepth}`,
    "",
    renderList("Agent instruction files", inventory.instructions),
    renderList("Durable context candidates", inventory.context),
    renderList("Manifests and build files", inventory.manifests),
    renderList("Agent Skills", inventory.skills),
    renderPackages(inventory.packages),
    renderList("Signals", inventory.signals)
  ];
  return sections.filter(Boolean).join("\n");
}

function renderList(title, values) {
  const items = values.length ? values.map((value) => `- \`${value}\``) : ["- None discovered"];
  return [`## ${title}`, "", ...items].join("\n");
}

function renderPackages(packages) {
  const lines = ["## Package scripts", ""];
  if (packages.length === 0) return [...lines, "- None discovered"].join("\n");
  for (const pkg of packages) {
    lines.push(`### \`${pkg.path}\`${pkg.name ? ` (${pkg.name})` : ""}`, "");
    if (pkg.error) lines.push(`- Parse error: ${pkg.error}`);
    else if (Object.keys(pkg.scripts).length === 0) lines.push("- No scripts");
    else for (const [name, command] of Object.entries(pkg.scripts)) lines.push(`- \`${name}\`: \`${command}\``);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function toPortable(path) {
  return path.split(sep).join("/");
}

function printHelp() {
  console.log(`Audit project context without modifying files.

Usage:
  node scripts/audit-context.mjs [options]

Options:
  --root <path>        Repository root (default: current directory)
  --format <format>    markdown or json (default: markdown)
  --max-depth <n>      Directory scan depth, 1-20 (default: 6)
  --help               Show this help
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
