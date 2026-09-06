#!/usr/bin/env node

import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKILL_NAME = "blender-scene-brief";
const EXAMPLE = "assets/examples/arch-motorcycle-workshop.json";
const REQUIRED = [
  "SKILL.md",
  "README.md",
  "agents/openai.yaml",
  "references/brief-anatomy.md",
  "references/scene-archetypes.md",
  "references/spec-schema.md",
  "scripts/render-brief.mjs",
  EXAMPLE
];
// These files define or document the placeholder markers, so they legitimately contain them.
const PLACEHOLDER_SCAN_EXEMPT = new Set(["tooling/validate.mjs", "scripts/render-brief.mjs", "references/spec-schema.md"]);
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

const textFiles = await collectFiles(ROOT, (path) => /\.(md|ya?ml|mjs|json)$/.test(path));
for (const path of textFiles) {
  const text = await readFile(path, "utf8");
  const label = relative(ROOT, path);
  if (!PLACEHOLDER_SCAN_EXEMPT.has(label) && /\bTODO\b|\bTBD\b|\[TODO[:\]]/.test(text)) {
    errors.push(`Unresolved placeholder marker: ${label}`);
  }
  if (/\/(Users|home)\/[^/\s]+\//.test(text)) errors.push(`Absolute user home path found: ${label}`);
  if (label !== "tooling/validate.mjs" && /\b(sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{20,})\b/.test(text)) {
    errors.push(`Possible API key committed in ${label}`);
  }
  if (label !== "tooling/validate.mjs" && /\bimage-generate\b|\bproject-context-evolver\b|\bnano-banana-pptx\b/.test(text)) {
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

await checkRenderer();
await checkRejection();

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${SKILL_NAME} (${textFiles.length} text files, ${nodeScripts.length} node scripts, renderer round-trip OK).`);
}

/* --------------------------------------------------------------- helpers */

// Renders the shipped example end to end and checks the invariants the brief depends on:
// gates derived from points, and one camera count reported consistently everywhere.
async function checkRenderer() {
  const dir = await mkdtemp(join(tmpdir(), "blender-scene-brief-"));
  try {
    const result = spawnSync(process.execPath, [join(ROOT, "scripts/render-brief.mjs"), join(ROOT, EXAMPLE), "--out-dir", dir, "--quiet"], { encoding: "utf8" });
    if (result.status !== 0) {
      errors.push(`Renderer rejected the shipped example: ${(result.stderr || result.stdout).trim()}`);
      return;
    }

    const spec = JSON.parse(await readFile(join(ROOT, EXAMPLE), "utf8"));
    const markdown = await readFile(join(dir, `${spec.slug}_brief.md`), "utf8");
    const html = await readFile(join(dir, `${spec.slug}_brief.html`), "utf8");

    const total = spec.rubric.reduce((sum, row) => sum + row.points, 0);
    if (total !== 100) errors.push(`Example rubric sums to ${total}, not 100.`);
    for (const row of spec.rubric) {
      const gate = (Math.ceil(row.points * 0.85 * 10 - 1e-9) / 10).toFixed(1);
      if (!markdown.includes(`| ${row.points} | ${gate} |`)) {
        errors.push(`Rendered gate for "${row.dimension}" (${row.points} points) is not ${gate}.`);
      }
    }

    const count = spec.cameras.length;
    const last = String(count).padStart(2, "0");
    for (const [label, needle] of [
      ["meta grid", `${count} cameras + contact sheet`],
      ["deliverables tree", `final image set 01–${last}`],
      ["footer", `${count} final renders`],
      ["critic footer", `${spec.critics.length} critics`]
    ]) {
      if (!markdown.includes(needle)) errors.push(`Markdown ${label} does not report ${count} cameras / ${spec.critics.length} critics.`);
      if (!html.includes(needle.replace(/&/g, "&amp;"))) errors.push(`HTML ${label} does not report ${count} cameras / ${spec.critics.length} critics.`);
    }

    const cameraLines = (markdown.match(/^\d{2}\. `\d{2}_/gm) ?? []).length;
    if (cameraLines !== count) errors.push(`Markdown lists ${cameraLines} camera rows for ${count} cameras.`);
    if (!markdown.includes(`\`${spec.slug}\``)) errors.push("Markdown footer is missing the slug.");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// A spec with a broken rubric must be refused, not silently rendered.
async function checkRejection() {
  const dir = await mkdtemp(join(tmpdir(), "blender-scene-brief-bad-"));
  try {
    const spec = JSON.parse(await readFile(join(ROOT, EXAMPLE), "utf8"));
    spec.rubric[0].points += 3;
    const specPath = join(dir, "broken.json");
    await writeFile(specPath, JSON.stringify(spec), "utf8");
    const result = spawnSync(process.execPath, [join(ROOT, "scripts/render-brief.mjs"), specPath, "--out-dir", dir, "--quiet"], { encoding: "utf8" });
    if (result.status === 0) errors.push("Renderer accepted a rubric that does not sum to 100.");
    else if (!/sum to exactly 100/.test(result.stderr)) errors.push("Renderer rejected the broken rubric without explaining why.");
    const written = await readdir(dir);
    if (written.some((name) => name.endsWith("_brief.md") || name.endsWith("_brief.html"))) {
      errors.push("Renderer wrote output for a spec it rejected.");
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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
