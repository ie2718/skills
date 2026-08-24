#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILL_NAME = "image-generate";
const REQUIRED = [
  "SKILL.md",
  "README.md",
  "agents/openai.yaml",
  "references",
  "scripts/image_generate.sh"
];
const errors = [];

for (const entry of REQUIRED) {
  try {
    await access(join(ROOT, entry));
  } catch {
    errors.push(`Missing required entry: ${entry}`);
  }
}

const skill = await readFile(join(ROOT, "SKILL.md"), "utf8");
const frontmatter = parseFrontmatter(skill);
if (frontmatter.name !== SKILL_NAME) errors.push(`SKILL.md name must be ${SKILL_NAME}.`);
if (!/^[a-z0-9-]+$/.test(frontmatter.name ?? "")) errors.push("SKILL.md name must be lowercase letters, digits, and hyphens.");
if (!frontmatter.description) errors.push("SKILL.md description is required.");
if ((frontmatter.description ?? "").length > 1024) errors.push("SKILL.md description must be at most 1024 characters.");
if (skill.split(/\r?\n/).length > 500) errors.push("SKILL.md must stay below 500 lines.");
for (const field of Object.keys(frontmatter)) {
  if (!["name", "description"].includes(field)) {
    errors.push(`SKILL.md frontmatter must stay portable; remove host-specific field: ${field}`);
  }
}

const textFiles = await collectFiles(ROOT, (path) => /\.(md|ya?ml|sh|mjs|json)$/.test(path));
for (const path of textFiles) {
  const text = await readFile(path, "utf8");
  const label = relative(ROOT, path);
  if (label !== "tooling/validate.mjs" && /\bTODO\b|\[TODO[:\]]/i.test(text)) {
    errors.push(`Unresolved TODO marker: ${label}`);
  }
  if (/\/(Users|home)\/[^/\s]+\//.test(text)) errors.push(`Absolute user home path found: ${label}`);
  if (label !== "tooling/validate.mjs" && /\b(sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{20,})\b/.test(text)) {
    errors.push(`Possible API key committed in ${label}`);
  }
  if (label !== "tooling/validate.mjs" && /\bimage-api\b|\bimage_api\b|project-context-evolver/.test(text)) {
    errors.push(`Stale skill identifier in ${label}`);
  }
}

await validateLinks(join(ROOT, "SKILL.md"), skill);

const openaiYaml = await readFile(join(ROOT, "agents/openai.yaml"), "utf8");
const shortDescription = openaiYaml.match(/short_description:\s*"([^"]+)"/)?.[1] ?? "";
if (shortDescription.length < 25 || shortDescription.length > 64) {
  errors.push("agents/openai.yaml short_description must be 25-64 characters.");
}
if (!openaiYaml.includes(`$${SKILL_NAME}`)) {
  errors.push(`agents/openai.yaml default_prompt must mention $${SKILL_NAME}.`);
}

const nodeScripts = await collectFiles(ROOT, (path) => path.endsWith(".mjs"));
for (const script of nodeScripts) {
  const result = spawnSync(process.execPath, ["--check", script], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`Syntax check failed for ${relative(ROOT, script)}: ${result.stderr.trim()}`);
}

const shellScripts = await collectFiles(ROOT, (path) => path.endsWith(".sh"));
if (shellScripts.length === 0) errors.push("Expected at least one shell script under scripts/.");
for (const script of shellScripts) {
  // /bin/bash is 3.2 on macOS; checking with it catches syntax that only newer bash accepts.
  const shell = process.platform === "darwin" ? "/bin/bash" : "bash";
  const result = spawnSync(shell, ["-n", script], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`Syntax check failed for ${relative(ROOT, script)}: ${result.stderr.trim()}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${SKILL_NAME} (${textFiles.length} text files, ${nodeScripts.length} node scripts, ${shellScripts.length} shell scripts).`);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    errors.push("SKILL.md must start with YAML frontmatter.");
    return {};
  }
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s/.test(line)) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function validateLinks(sourcePath, text) {
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of text.matchAll(pattern)) {
    const target = match[1].split("#")[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    try {
      await access(join(dirname(sourcePath), target));
    } catch {
      errors.push(`Broken local link in SKILL.md: ${match[1]}`);
    }
  }
}

async function collectFiles(directory, predicate) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await collectFiles(path, predicate));
    else if (entry.isFile() && predicate(path)) result.push(path);
  }
  return result;
}
