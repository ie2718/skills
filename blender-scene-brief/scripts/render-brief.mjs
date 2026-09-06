#!/usr/bin/env node

// Renders a scene spec (JSON) into a Blender production brief: Markdown (the pasteable
// prompt) and a styled HTML page. Every cross-reference — camera count, zone count,
// critic count, rubric gates — is derived from the spec here, so the two artifacts can
// never disagree with each other or with themselves.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const RANGES = {
  zones: [8, 14],
  cameras: [12, 18],
  critics: [5, 7],
  rubric: [5, 8]
};
const MINIMUMS = {
  roles: 3,
  asset_families: 6,
  adjacency: 3,
  construction: 3,
  palette: 5,
  storytelling: 3,
  failures: 8,
  escalation: 3
};
const REVIEW_CYCLES = 4;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();

  const raw = await readFile(options.spec, "utf8");
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${basename(options.spec)} is not valid JSON: ${error.message}`);
  }

  const errors = validate(spec, options);
  if (errors.length > 0) {
    console.error(`Spec rejected — ${errors.length} problem${errors.length === 1 ? "" : "s"} in ${options.spec}:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  const model = buildModel(spec);
  const outDir = resolve(options.outDir);
  await mkdir(outDir, { recursive: true });
  const written = [];

  if (options.format === "md" || options.format === "both") {
    const path = join(outDir, `${spec.slug}_brief.md`);
    await writeFile(path, renderMarkdown(model), "utf8");
    written.push(path);
  }
  if (options.format === "html" || options.format === "both") {
    const path = join(outDir, `${spec.slug}_brief.html`);
    await writeFile(path, renderHtml(model), "utf8");
    written.push(path);
  }

  if (!options.quiet) {
    console.log(
      `${spec.slug}: ${model.zones.length} zones · ${model.assetFamilies.length} asset families · ` +
      `${model.cameras.length} cameras · ${model.critics.length} critics · rubric ${model.rubricTotal}/100`
    );
    for (const path of written) console.log(`wrote ${path}`);
  }
}

/* ------------------------------------------------------------------ args */

function parseArgs(args) {
  const options = { spec: null, outDir: ".", format: "both", quiet: false, help: false, strict: true };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out-dir") options.outDir = requireValue(args, ++index, arg);
    else if (arg === "--format") options.format = requireValue(args, ++index, arg);
    else if (arg === "--quiet") options.quiet = true;
    else if (arg === "--draft") options.strict = false;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else if (options.spec === null) options.spec = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!options.help && !options.spec) throw new Error("Pass the path to a scene spec JSON file. See --help.");
  if (!["md", "html", "both"].includes(options.format)) throw new Error("--format must be md, html, or both.");
  return options;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function printHelp() {
  console.log(`Blender scene brief renderer

Usage:
  node scripts/render-brief.mjs <spec.json> [options]

Options:
  --out-dir <path>       Where to write the brief (default: current directory)
  --format md|html|both  Which artifacts to write (default: both)
  --draft                Relax count ranges; structural invariants still enforced
  --quiet                Suppress the summary line
  --help                 Show this help

Writes <slug>_brief.md and <slug>_brief.html.`);
}

/* -------------------------------------------------------------- validate */

function validate(spec, options) {
  const errors = [];
  const strict = options.strict !== false;

  const fail = (message) => errors.push(message);
  const text = (value, label, min = 1) => {
    if (typeof value !== "string" || value.trim().length < min) fail(`${label} must be a non-empty string.`);
  };
  const list = (value, label, min) => {
    if (!Array.isArray(value)) return fail(`${label} must be an array.`), false;
    if (strict && value.length < min) fail(`${label} needs at least ${min} entries (has ${value.length}).`);
    value.forEach((entry, index) => {
      if (typeof entry !== "string" || entry.trim() === "") fail(`${label}[${index}] must be a non-empty string.`);
    });
    return true;
  };
  const pairs = (value, label, [min, max]) => {
    if (!Array.isArray(value)) return fail(`${label} must be an array.`), false;
    if (strict && (value.length < min || value.length > max)) {
      fail(`${label} must hold ${min}-${max} entries (has ${value.length}).`);
    }
    value.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return fail(`${label}[${index}] must be an object.`);
      text(entry.name, `${label}[${index}].name`);
      text(entry.body, `${label}[${index}].body`, 20);
    });
    return true;
  };

  text(spec.slug, "slug");
  if (typeof spec.slug === "string" && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(spec.slug)) {
    fail("slug must be kebab-case: lowercase letters, digits, single hyphens.");
  }
  text(spec.title, "title");
  text(spec.subtitle, "subtitle", 40);

  if (!spec.meta || typeof spec.meta !== "object") fail("meta must be an object.");
  else {
    text(spec.meta.engine, "meta.engine");
    text(spec.meta.scope, "meta.scope");
  }

  if (!spec.runtime || typeof spec.runtime !== "object") fail("runtime must be an object.");
  else for (const key of ["compute", "dcc", "harness", "starting_assets", "budget"]) {
    text(spec.runtime[key], `runtime.${key}`);
  }

  list(spec.roles, "roles", MINIMUMS.roles);

  if (!spec.objective || typeof spec.objective !== "object") fail("objective must be an object.");
  else {
    list(spec.objective.paragraphs, "objective.paragraphs", 2);
    if (!spec.objective.callout || typeof spec.objective.callout !== "object") {
      fail("objective.callout must be an object with label and body.");
    } else {
      text(spec.objective.callout.label, "objective.callout.label");
      text(spec.objective.callout.body, "objective.callout.body", 30);
    }
    list(spec.objective.avoid, "objective.avoid", 4);
  }

  pairs(spec.zones, "zones", RANGES.zones);
  list(spec.adjacency, "adjacency", MINIMUMS.adjacency);
  pairs(spec.asset_families, "asset_families", [MINIMUMS.asset_families, 99]);
  list(spec.construction, "construction", MINIMUMS.construction);
  list(spec.palette, "palette", MINIMUMS.palette);

  if (!spec.lighting || typeof spec.lighting !== "object") fail("lighting must be an object.");
  else {
    text(spec.lighting.time, "lighting.time");
    text(spec.lighting.exterior, "lighting.exterior", 30);
    text(spec.lighting.direction, "lighting.direction", 30);
  }

  list(spec.storytelling, "storytelling", MINIMUMS.storytelling);
  list(spec.failures, "failures", MINIMUMS.failures);
  list(spec.escalation, "escalation", MINIMUMS.escalation);
  pairs(spec.critics, "critics", RANGES.critics);

  validateCameras(spec, fail, strict);
  validateRubric(spec, fail, strict);
  validatePlaceholders(spec, fail);

  return errors;
}

function validateCameras(spec, fail, strict) {
  const cameras = spec.cameras;
  if (!Array.isArray(cameras)) return fail("cameras must be an array.");
  const [min, max] = RANGES.cameras;
  if (strict && (cameras.length < min || cameras.length > max)) {
    fail(`cameras must hold ${min}-${max} entries (has ${cameras.length}).`);
  }

  const seen = new Set();
  let heroes = 0;
  cameras.forEach((camera, index) => {
    if (!camera || typeof camera !== "object") return fail(`cameras[${index}] must be an object.`);
    const expected = String(index + 1).padStart(2, "0");
    if (typeof camera.file !== "string" || !/^\d{2}_[a-z0-9]+(_[a-z0-9]+)*\.png$/.test(camera.file)) {
      fail(`cameras[${index}].file must look like ${expected}_snake_case_name.png.`);
    } else if (!camera.file.startsWith(`${expected}_`)) {
      fail(`cameras[${index}].file must start with ${expected}_ so the set numbers 01-${String(cameras.length).padStart(2, "0")} in order.`);
    }
    if (seen.has(camera.file)) fail(`cameras[${index}].file duplicates ${camera.file}.`);
    seen.add(camera.file);
    if (typeof camera.name !== "string" || camera.name.trim() === "") fail(`cameras[${index}].name must be a non-empty string.`);
    if (typeof camera.body !== "string" || camera.body.trim().length < 20) fail(`cameras[${index}].body must describe what the frame proves.`);
    if (camera.hero === true) {
      heroes += 1;
      if (typeof camera.resolution !== "string" || !/^\d{3,5}\s*[x×]\s*\d{3,5}$/.test(camera.resolution)) {
        fail(`cameras[${index}] is the hero and needs a resolution like "2560x1440".`);
      }
    }
  });
  if (heroes !== 1) fail(`Exactly one camera must carry "hero": true (found ${heroes}).`);
}

function validateRubric(spec, fail, strict) {
  const rubric = spec.rubric;
  if (!Array.isArray(rubric)) return fail("rubric must be an array.");
  const [min, max] = RANGES.rubric;
  if (strict && (rubric.length < min || rubric.length > max)) {
    fail(`rubric must hold ${min}-${max} dimensions (has ${rubric.length}).`);
  }
  let total = 0;
  rubric.forEach((row, index) => {
    if (!row || typeof row !== "object") return fail(`rubric[${index}] must be an object.`);
    if (typeof row.dimension !== "string" || row.dimension.trim() === "") fail(`rubric[${index}].dimension must be a non-empty string.`);
    if (typeof row.detail !== "string" || row.detail.trim() === "") fail(`rubric[${index}].detail must name what is being judged.`);
    if (!Number.isInteger(row.points) || row.points < 5 || row.points > 40) {
      fail(`rubric[${index}].points must be a whole number between 5 and 40.`);
    } else total += row.points;
  });
  if (total !== 100) fail(`rubric points must sum to exactly 100 (they sum to ${total}).`);
}

function validatePlaceholders(spec, fail) {
  const pattern = /\{\{|<[A-Z_]{3,}>|\bTBD\b|\bTODO\b|\bLorem ipsum\b|\bXXX\b/;
  const walk = (value, path) => {
    if (typeof value === "string") {
      if (pattern.test(value)) fail(`${path} still contains a placeholder marker.`);
      return;
    }
    if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) walk(entry, path ? `${path}.${key}` : key);
    }
  };
  walk(spec, "");
}

/* ----------------------------------------------------------------- model */

function buildModel(spec) {
  const dir = spec.slug.replace(/-/g, "_");
  const cameras = spec.cameras.map((camera, index) => ({
    ...camera,
    index: String(index + 1).padStart(2, "0")
  }));
  const hero = cameras.find((camera) => camera.hero === true);
  hero.resolution = normalizeResolution(hero.resolution);
  const rubric = spec.rubric.map((row) => ({ ...row, gate: gateFor(row.points) }));
  const rubricTotal = rubric.reduce((sum, row) => sum + row.points, 0);
  const last = cameras[cameras.length - 1].index;

  return {
    spec,
    dir,
    blendFile: `${dir}_final.blend`,
    zones: spec.zones,
    assetFamilies: spec.asset_families,
    cameras,
    hero,
    critics: spec.critics,
    rubric,
    rubricTotal,
    cameraRange: `01-${last}`,
    cameraRangeDash: `01–${last}`,
    baseResolution: normalizeResolution(spec.base_resolution ?? "1920x1080"),
    units: spec.units ?? "meters",
    reviewCycles: spec.review_cycles ?? REVIEW_CYCLES
  };
}

// Gates round UP to one decimal so the printed gate is never below a true 85%.
function gateFor(points) {
  return (Math.ceil(points * 0.85 * 10 - 1e-9) / 10).toFixed(1);
}

function normalizeResolution(value) {
  return value.replace(/\s*[x×]\s*/, "×");
}

/* ------------------------------------------------------ invariant blocks */
// Scaffolding that holds for any scene. Scene-specific nouns arrive only through `model`.

function taskBlock(model) {
  const roles = joinList(model.spec.roles);
  return [
    `You are the ${roles} for this project. Do the actual work in the current working directory; a plan, a tutorial, or sample code is not an acceptable answer.`,
    "Assume the user may be unreachable. Where a choice is undecided, take the conservative reversible option, record it, and continue. Do not pause for aesthetic preferences, optional downloads, or missing convenience add-ons. Stop only for credentials, a potentially destructive external action, or an ambiguity that cannot be resolved without materially changing the authorized scope. Keep working until the explicit quality gates in this brief are satisfied — not until the first file renders or the first attractive frame appears."
  ];
}

function protocolBlock(model) {
  return {
    intro: [
      `Before committing to an implementation, inspect the working directory, the Blender executable and version, the available render engines and devices, GPU and CPU capability, installed add-ons, and any assets already present. Optional add-ons and downloads must never become blockers; provide a native Blender path instead. If unrelated files are present, work inside an isolated ${model.dir}/ directory.`,
      "Maintain these working documents and milestones for the whole run:"
    ],
    tree: [
      `${model.dir}/`,
      "├── ART_DIRECTION.md   # visual language and scene-specific decisions",
      "├── SPATIAL_PLAN.md    # dimensions, adjacency, camera coverage, required zones",
      "├── ASSET_INVENTORY.md # asset families, sources, licences, status, substitutions",
      "├── TASK_STATE.md      # completed work, worst visual problems, next actions, score",
      "└── checkpoints/       # recoverable .blend milestones after every stable stage"
    ],
    outro: [
      "If context is compacted or the run resumes later, reread this brief plus ART_DIRECTION.md and TASK_STATE.md, open the newest valid checkpoint, and continue from there rather than rebuilding blind. TASK_STATE.md must always carry the last successful commands and renders, the known failures, and the current rubric score, so any later session can resume mid-flight."
    ]
  };
}

const BUILD_ORDER = [
  ["Art bible and planning set", "Turn this brief into an art bible, a measured spatial plan, an asset inventory, a material language, a fixed camera set, a technical budget, and an acceptance map."],
  ["Renderable graybox", "Build a graybox covering the whole environment — context, circulation, service zones, primary silhouettes, and every fixed camera — using real dimensions and human-scale proxies."],
  ["Immediate preview judgeset", "Render cheap preview images of the full judgeset straight away, to expose layout, scale, adjacency, and camera failures while they are still cheap to fix."],
  ["Asset family substitution", "Replace placeholders with coherent asset families: macro composition first, functional medium structure second, close manufacturing detail third. The whole scene stays renderable after every asset-family pass."],
  ["Final dressing and lighting", "Settle final material separation, environmental context, lighting hierarchy, storytelling props, and camera composition. Reserve high sample counts and expensive effects for confirmed final views."]
];

function reviewBlock(model) {
  return {
    intro: [
      `Use the complete final camera list in this brief as the fixed judgeset. Run at least ${model.reviewCycles} complete cycles of:`
    ],
    cycle: "build or change → render the fixed judgeset → inspect actual pixels and the contact sheet → diagnose → fix → rerender identical cameras",
    body: [
      "Criticism must come from the rendered images — not from code, the scene tree, viewport descriptions, or the builder's own summary. For every finding, record the camera or file evidence, the severity, the affected subsystem, the likely root cause, and an actionable correction. Repair systemic issues that affect several frames before isolated polish.",
      "If sub-agents are available, use fresh-context specialists who receive only the scene goal, the final renders, and the rubric:"
    ],
    regression: "Regression discipline. After every repair cycle, compare each camera against its preceding version and label the result improved, unchanged, or regressed. Fix or roll back material regressions. Refresh the contact sheet, TASK_STATE.md, and the score evidence after every full cycle.",
    escalation: `Structural escalation. If the score sits below the exit threshold and gains less than one point across two consecutive complete cycles, run a structural pass instead of adding props, surface noise, or decorative lights. Revisit ${joinList(model.spec.escalation)}.`
  };
}

function exitGates(model) {
  return [
    "At least 90 / 100 overall",
    "At least 85% of the available points in every rubric dimension",
    "Zero critical visual failures",
    "Complete camera and zone coverage",
    "No material regression across the final two cycles"
  ];
}

function validationBlock(model) {
  return [
    `Before declaring completion, save every file, close the working scene, reopen ${model.blendFile} from a clean Blender invocation, and rerender at least the hero camera through the documented command. Confirm that all dependencies resolve, that no script or render error occurs, that the output dimensions are correct, and that every file in renders/final/ came from the latest scene. Refresh the contact sheet and the reports.`,
    "The final response must list the real project and render paths, the evidence-backed rubric result, and any remaining non-critical limitations, honestly."
  ];
}

function spatialIntro(model) {
  return model.spec.spatial_intro
    ?? `Use Blender units in ${model.units}. Hold human-scale clearances, credible door widths, guard heights, steps, ramps, work envelopes, equipment service zones, and accessible primary circulation. The complete scene includes all of the following connected areas:`;
}

const SPATIAL_CLOSING = "No required area may exist only as lettering on a closed door. Support spaces may be compact, but their interiors, thresholds, fixtures, and relationship to the primary areas must be legible in the scene and in the final coverage.";

const ASSET_INTRO = "Build coherent reusable asset families rather than unrelated primitives. Repetition may use linked duplicates or instances, but silhouette, orientation, wear state, accessories, and placement must vary enough to avoid copy-paste regularity.";

const ASSET_CLOSING = "Every important asset must hold up at three reading distances: a recognisable macro silhouette, functional medium-scale construction, and close-range joins, controls, hardware, fasteners, seams, gaskets, labels, edge treatment, and contact with adjacent surfaces. A thin box with a texture on it is not a substitute for visible functional structure.";

const CONSTRUCTION_CLOSING = "Walls, slabs, frames, doors, glazing, counters, roofs, platforms, curbs, rails, and built-in furniture must have credible thickness. Show how elements terminate and connect: reveals, thresholds, expansion joints, mullions, flashing, drainage, skirtings, trim, brackets, hinges, handles, anchors, access panels, and service penetrations wherever they are visible. Manufactured edges need scale-appropriate bevels; large cast, carved, eroded, or rough elements need believable edge breakup without losing their designed form.";

const MATERIAL_RULES = [
  "Use physically plausible Principled BSDF response and real-world texture scale. Directional grain, brushed finishes, poured material flow, fabric weave, erosion, wear tracking, water streaking, and every other anisotropic or directional cue must follow construction and gravity.",
  "Separate materials through base colour, roughness, normal scale, metallic response, transmission, subsurface response where justified, and edge behaviour — not through one repeated noise texture.",
  "All visible geometry needs correct transforms, smoothing, normals, UV direction, grounding, and contact shadows. The final scene has no obvious intersections, floating objects, z-fighting, inverted normals, stretched textures, implausibly razor-sharp manufactured edges, or default grey materials. Repeated distant assets use sensible instancing and level of detail without visible popping or silhouette loss in the final cameras."
];

const LIGHTING_RULES = [
  "Use a clear key / fill / practical hierarchy. Preserve highlight detail, readable dark materials, grounded shadows, and simultaneous visibility of interior and exterior context. Practical fixtures need believable emitters, housings, mounting, throw, colour temperature, and falloff. Atmospheric effects must add depth without washing out geometry or hiding incomplete work. Use AgX or the current Blender equivalent for controlled highlight roll-off and credible colour.",
  "Compose every principal view with foreground, midground, and background structure. Avoid uniformly lit catalogue views, arbitrary Dutch angles, excessively wide lenses, crushed blacks, blank white windows, or depth of field so shallow that the scene cannot be evaluated."
];

const STORY_INTRO = "The place must read as operational rather than staged. Include restrained evidence such as:";

const STORY_CLOSING = "Every prop must communicate function, recent activity, local climate, maintenance, or occupancy. Do not scatter random clutter to hide weak architecture. Use human figures only if their modelling, clothing, scale, pose, and integration improve the image; otherwise imply people through object state, lighting, traces of use, and partially completed tasks.";

const TECHNICAL_RULES = [
  "Organise architecture, structural systems, landscape or context, furnishings and machinery, small props, lighting, cameras, and render helpers into clearly named Collections.",
  "Use descriptive English object, material, image, node group, camera, and light names; the delivered file must not be dominated by Cube.001-style names.",
  "Keep repeated geometry efficient while retaining camera-visible detail.",
  "All external files must use portable relative paths or be packed into the .blend.",
  "Locally generated or baked textures belong in textures/; scene-generation and rerender utilities belong in scripts/.",
  "The delivered .blend must stay editable: preserve useful modifiers, instances, collections, camera names, and material structure rather than flattening the environment into one opaque mesh."
];

function deliverablesBlock(model) {
  return {
    intro: `Place the project in a dedicated directory named ${model.dir}/ and provide at minimum:`,
    tree: [
      `${model.dir}/`,
      `├── ${model.blendFile}   # the final editable Blender scene`,
      "├── README.md            # structure, version, controls, dependencies, rerender command",
      "├── scripts/             # scene-generation and rerender utilities",
      "├── textures/            # locally generated or baked textures, if used",
      `├── renders/final/       # the complete numbered final image set ${model.cameraRangeDash}`,
      "└── renders/contact_sheet.jpg  # readable overview of every final image"
    ],
    outro: "The final .blend and render set must be portable and self-contained, with no missing images, fonts, caches, libraries, or absolute-path dependencies. The contact sheet must make coverage, visual consistency, and overall quality easy to assess at a glance."
  };
}

function cameraClosing(model) {
  return `These images must collectively prove that every required zone is complete, not merely repeat the hero angle. The hero render ${model.hero.file} must be at least ${model.hero.resolution}. Every other final render should normally be at least ${model.baseResolution}. All images must be actual Blender final renders, never viewport captures, and must show the final scene rather than an obsolete preview.`;
}

/* -------------------------------------------------------------- markdown */

function renderMarkdown(model) {
  const s = model.spec;
  const protocol = protocolBlock(model);
  const review = reviewBlock(model);
  const deliverables = deliverablesBlock(model);
  const out = [];
  const push = (...lines) => out.push(...lines);

  push(`# ${s.title} — Blender Production Brief`, "", `> ${s.subtitle}`, "");
  push("| | |", "| --- | --- |");
  push(`| Task ID | \`${s.slug}\` |`);
  push(`| Engine | ${s.meta.engine} |`);
  push(`| Scope | ${s.meta.scope} |`);
  push(`| Final renders | ${model.cameras.length} cameras + contact sheet |`, "");

  push("## 00 / RUNTIME — Implementation Environment", "");
  push("| | |", "| --- | --- |");
  push(`| Compute | ${s.runtime.compute} |`);
  push(`| DCC | ${s.runtime.dcc} |`);
  push(`| Harness | ${s.runtime.harness} |`);
  push(`| Starting assets | ${s.runtime.starting_assets} |`);
  push(`| Budget · autonomy | ${s.runtime.budget} |`, "");

  push("## 01 / TASK", "");
  push(...paras(taskBlock(model)));

  push("## 02 / PROTOCOL — Environment Discovery and Recoverability", "");
  push(...paras(protocol.intro));
  push("```text", ...protocol.tree, "```", "");
  push(...paras(protocol.outro));

  push("## 03 / BUILD ORDER — Required Build Order", "");
  BUILD_ORDER.forEach(([title, body], index) => push(`${index + 1}. **${title}.** ${body}`));
  push("");

  push("## 04 / REVIEW LOOP — Fixed Judgeset and Evidence-Based Review", "");
  push(...paras(review.intro));
  push(`> ${review.cycle}`, "");
  push(...paras(review.body));
  model.critics.forEach((critic, index) => push(`${index + 1}. **${critic.name}.** ${critic.body}`));
  push("");
  push(...paras([review.regression, review.escalation]));

  push("## 05 / RUBRIC — Scene-Specific 100-Point Rubric", "");
  push("| Dimension | Points | Gate ≥85% |", "| --- | ---: | ---: |");
  for (const row of model.rubric) {
    push(`| **${row.dimension}** — ${row.detail} | ${row.points} | ${row.gate} |`);
  }
  push(`| **Total** | ${model.rubricTotal} | exit ≥ 90 |`, "");
  push("**Exit gates — all mandatory**", "");
  for (const gate of exitGates(model)) push(`- ${gate}`);
  push("");

  push("## 06 / VALIDATION — Cold-Start Completion Validation", "");
  push(...paras(validationBlock(model)));

  push(`## 07 / BRIEF — Blender Production Brief: ${s.title}`, "");

  push("### 1. Project objective", "");
  push(...paras(s.objective.paragraphs));
  push(`> **${s.objective.callout.label}** — ${s.objective.callout.body}`, "");
  push("**Avoid these interpretations and shortcuts**", "");
  for (const item of s.objective.avoid) push(`- ${item}`);
  push("");

  push("### 2. Spatial scope, adjacency, and circulation", "");
  push(...paras([spatialIntro(model)]));
  model.zones.forEach((zone, index) => push(`${String(index + 1).padStart(2, "0")}. **${zone.name}** — ${zone.body}`));
  push("", "The spatial organisation must obey these relationships:", "");
  for (const rule of s.adjacency) push(`- ${rule}`);
  push("", SPATIAL_CLOSING, "");

  push("### 3. Scene-specific asset families and minimum content", "");
  push(ASSET_INTRO, "");
  for (const family of model.assetFamilies) push(`- **${family.name}:** ${family.body}`);
  push("", ASSET_CLOSING, "");

  push("### 4. Architectural and construction detail", "");
  for (const item of s.construction) push(`- ${item}`);
  push("", CONSTRUCTION_CLOSING, "");

  push("### 5. Materials and surface language", "");
  push("The principal palette is:", "");
  for (const item of s.palette) push(`- ${item}`);
  push("");
  push(...paras([...(s.material_notes ?? []), ...MATERIAL_RULES]));

  push("### 6. Environmental context and lighting", "");
  push(...paras([
    `Set the scene at ${s.lighting.time}. ${s.lighting.exterior}`,
    `Lighting direction: ${s.lighting.direction}`,
    ...(s.lighting.notes ?? []),
    ...LIGHTING_RULES
  ]));

  push("### 7. Lived-in storytelling", "");
  push(STORY_INTRO, "");
  for (const item of s.storytelling) push(`- ${item}`);
  push("", STORY_CLOSING, "");

  push("### 8. Final camera and render set", "");
  push("Create fixed, clearly named Blender cameras matching these files in `renders/final/`:", "");
  for (const camera of model.cameras) {
    const hero = camera.hero ? ` _(hero — minimum ${camera.resolution})_` : "";
    push(`${camera.index}. \`${camera.file}\` — **${camera.name}.**${hero} ${camera.body}`);
  }
  push("", cameraClosing(model), "");

  push("### 9. Technical organisation and portability", "");
  for (const item of TECHNICAL_RULES) push(`- ${item}`);
  push("");

  push("### 10. Critical visual failures", "");
  push("These conditions make the final artifact unacceptable:", "");
  for (const item of s.failures) push(`- ${item}`);
  push("");

  push("### 11. Required project deliverables", "");
  push(deliverables.intro, "");
  push("```text", ...deliverables.tree, "```", "");
  push(deliverables.outro, "");

  push("---", "");
  push(`\`${s.slug}\` · 1 mission brief · ${model.reviewCycles}+ review cycles · ${model.critics.length} critics · ${model.cameras.length} final renders`, "");

  return out.join("\n");
}

function paras(items) {
  const out = [];
  for (const item of items) out.push(item, "");
  return out;
}

function joinList(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/* ------------------------------------------------------------------ html */

function renderHtml(model) {
  const s = model.spec;
  const protocol = protocolBlock(model);
  const review = reviewBlock(model);
  const deliverables = deliverablesBlock(model);
  const e = escapeHtml;

  const specRow = (key, value) => `      <tr><th>${e(key)}</th><td>${e(value)}</td></tr>`;
  const metaItem = (key, value, mono = false) =>
    `      <div class="item"><div class="k">${e(key)}</div><div class="v${mono ? " mono" : ""}">${e(value)}</div></div>`;
  const rounds = (entries, label) => entries.map((entry, index) => `
    <div class="round">
      <div class="round-marker"><span class="n">${String(index + 1).padStart(2, "0")}</span><span class="c">${e(label)}</span></div>
      <div class="round-body"><span class="round-title">${e(entry.name)}</span> ${e(entry.body)}</div>
    </div>`).join("");
  const numGrid = (entries) => `    <div class="num-grid">${entries.map((entry, index) => `
      <div class="num-item"><span class="num">${String(index + 1).padStart(2, "0")}</span><div class="t">${entry.head}<span class="desc">${entry.desc}</span></div></div>`).join("")}
    </div>`;
  const ul = (items) => `    <ul>${items.map((item) => `<li>${e(item)}</li>`).join("")}</ul>`;
  const ps = (items) => items.map((item) => `      <p>${e(item)}</p>`).join("\n");
  const section = (num, kicker, title, body) => `
  <section>
    <div class="section-head"><span class="section-num">${e(num)} / ${e(kicker)}</span>${title ? `<h2 class="section-title">${e(title)}</h2>` : ""}</div>
${body}
  </section>`;

  const zoneGrid = numGrid(model.zones.map((zone) => ({ head: e(zone.name), desc: e(zone.body) })));
  const cameraGrid = numGrid(model.cameras.map((camera) => ({
    head: `<span class="file">${e(camera.file)}</span>${e(camera.name)}${camera.hero ? ` <span class="pill">hero · ${e(camera.resolution)}</span>` : ""}`,
    desc: e(camera.body)
  })));

  const rubricRows = model.rubric.map((row) => `      <tr>
        <td class="dim"><strong>${e(row.dimension)}</strong><span class="mute">${e(row.detail)}</span></td>
        <td class="pts">${row.points}</td>
        <td class="gate">${row.gate}</td>
      </tr>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${e(s.slug)} — Prompt</title>
<style>
${STYLESHEET}
</style>
</head>
<body>
<div class="page">

  <div class="meta-top">
    <span class="dot"></span>
    <span>Prompt Specification</span>
    <span class="pill">Blender</span>
    <span class="pill">${e(s.meta.engine.split("·").pop().trim())}</span>
    <span class="pill good">production brief</span>
  </div>

  <h1 class="title">${e(s.title)}</h1>
  <p class="subtitle">${e(s.subtitle)}</p>

  <div class="meta-grid">
${metaItem("Task ID", s.slug, true)}
${metaItem("Engine", s.meta.engine)}
${metaItem("Scope", s.meta.scope)}
${metaItem("Final renders", `${model.cameras.length} cameras + contact sheet`)}
  </div>
${section("00", "RUNTIME", "Implementation Environment", `    <table class="spec-table">
${specRow("Compute", s.runtime.compute)}
${specRow("DCC", s.runtime.dcc)}
${specRow("Harness", s.runtime.harness)}
${specRow("Starting assets", s.runtime.starting_assets)}
${specRow("Budget · autonomy", s.runtime.budget)}
    </table>`)}
${section("01", "TASK", "", `    <div class="task-frame">
${ps(taskBlock(model))}
    </div>`)}
${section("02", "PROTOCOL", "Environment Discovery and Recoverability", `    <div class="prd">
${ps(protocol.intro)}
      <div class="file-tree">${e(protocol.tree.join("\n"))}</div>
${ps(protocol.outro)}
    </div>`)}
${section("03", "BUILD ORDER", "Required Build Order", rounds(BUILD_ORDER.map(([name, body]) => ({ name, body })), "Step"))}
${section("04", "REVIEW LOOP", "Fixed Judgeset and Evidence-Based Review", `    <div class="prd">
${ps(review.intro)}
      <div class="cycle">${e(review.cycle)}</div>
${ps(review.body)}
    </div>
${rounds(model.critics, "Critic")}
    <div class="prd">
${ps([review.regression, review.escalation])}
    </div>`)}
${section("05", "RUBRIC", "Scene-Specific 100-Point Rubric", `    <table class="rubric">
      <tr><th>Dimension</th><th class="pts">Points</th><th class="gate">Gate ≥85%</th></tr>
${rubricRows}
      <tr class="total"><td class="dim"><strong>Total</strong></td><td class="pts">${model.rubricTotal}</td><td class="gate">exit ≥ 90</td></tr>
    </table>
    <div class="gates">
      <div class="label">Exit Gates — all mandatory</div>
${ul(exitGates(model))}
    </div>`)}
${section("06", "VALIDATION", "Cold-Start Completion Validation", `    <div class="prd">
${ps(validationBlock(model))}
    </div>`)}
${section("07", "BRIEF", "", `    <div class="prd">
      <h3>Blender Production Brief — ${e(s.title)}</h3>

      <h3>1. Project objective</h3>
${ps(s.objective.paragraphs)}
      <div class="callout"><div class="label">${e(s.objective.callout.label)}</div><p>${e(s.objective.callout.body)}</p></div>
      <div class="avoid">
        <div class="label">Avoid these interpretations and shortcuts</div>
${ul(s.objective.avoid)}
      </div>

      <h3>2. Spatial scope, adjacency, and circulation</h3>
      <p>${e(spatialIntro(model))}</p>
${zoneGrid}
      <p class="lead">The spatial organisation must obey these relationships:</p>
${ul(s.adjacency)}
      <p>${e(SPATIAL_CLOSING)}</p>

      <h3>3. Scene-specific asset families and minimum content</h3>
      <p>${e(ASSET_INTRO)}</p>
      <ul>${model.assetFamilies.map((family) => `<li><strong>${e(family.name)}:</strong> ${e(family.body)}</li>`).join("")}</ul>
      <p>${e(ASSET_CLOSING)}</p>

      <h3>4. Architectural and construction detail</h3>
${ul(s.construction)}
      <p>${e(CONSTRUCTION_CLOSING)}</p>

      <h3>5. Materials and surface language</h3>
      <p class="lead">The principal palette is:</p>
${ul(s.palette)}
${ps([...(s.material_notes ?? []), ...MATERIAL_RULES])}

      <h3>6. Environmental context and lighting</h3>
${ps([`Set the scene at ${s.lighting.time}. ${s.lighting.exterior}`, `Lighting direction: ${s.lighting.direction}`, ...(s.lighting.notes ?? []), ...LIGHTING_RULES])}

      <h3>7. Lived-in storytelling</h3>
      <p>${e(STORY_INTRO)}</p>
${ul(s.storytelling)}
      <p>${e(STORY_CLOSING)}</p>

      <h3>8. Final camera and render set</h3>
      <p>Create fixed, clearly named Blender cameras matching these files in <code>renders/final/</code>:</p>
${cameraGrid}
      <p>${e(cameraClosing(model))}</p>

      <h3>9. Technical organisation and portability</h3>
${ul(TECHNICAL_RULES)}

      <h3>10. Critical visual failures</h3>
      <p>These conditions make the final artifact unacceptable:</p>
${ul(s.failures)}

      <h3>11. Required project deliverables</h3>
      <p>${e(deliverables.intro)}</p>
      <div class="file-tree">${e(deliverables.tree.join("\n"))}</div>
      <p>${e(deliverables.outro)}</p>
    </div>`)}

  <footer>
    <span>${e(s.slug)}</span>
    <span>1 mission brief · ${model.reviewCycles}+ review cycles · ${model.critics.length} critics · ${model.cameras.length} final renders</span>
  </footer>

</div>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLESHEET = `  :root {
    --ink: #0a0a0a; --ink-soft: #404040; --ink-mute: #6b6b6b; --ink-faint: #9a9a9a;
    --line: #e5e5e5; --line-soft: #efefef; --paper: #ffffff; --tint: #fafafa;
    --tint-warm: #fbf9f5; --code-bg: #f6f6f4;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Helvetica Neue", Arial, sans-serif;
    background: var(--paper); color: var(--ink); font-size: 15px; line-height: 1.65; letter-spacing: -0.003em;
  }
  .page { max-width: 880px; margin: 0 auto; padding: 72px 48px 120px; }

  .meta-top { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--ink-mute);
    letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 28px; flex-wrap: wrap; }
  .meta-top .dot { width: 6px; height: 6px; background: var(--ink); border-radius: 50%; }
  .pill { border: 1px solid var(--line); padding: 3px 10px; border-radius: 100px; font-size: 11px;
    color: var(--ink-soft); text-transform: none; letter-spacing: 0; white-space: nowrap; }
  .pill.good { border-color: var(--ink); background: var(--ink); color: var(--paper); }

  h1.title { font-size: 38px; line-height: 1.15; font-weight: 600; letter-spacing: -0.022em; margin-bottom: 14px; }
  .subtitle { color: var(--ink-mute); font-size: 15px; max-width: 680px; margin-bottom: 40px; }

  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; padding: 20px 0;
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin-bottom: 64px; }
  .meta-grid .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-bottom: 4px; }
  .meta-grid .v { font-size: 14px; font-weight: 500; }
  .meta-grid .v.mono { font-family: "SF Mono", "JetBrains Mono", Menlo, monospace; font-size: 13px; }

  section { margin-bottom: 56px; }
  .section-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
  .section-num { font-family: "SF Mono", "JetBrains Mono", Menlo, monospace; font-size: 12px; color: var(--ink-faint); letter-spacing: 0.05em; }
  h2.section-title { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; }

  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }
  th, td { text-align: left; vertical-align: top; padding: 12px 14px 12px 0; border-bottom: 1px solid var(--line-soft); font-size: 14px; }
  .spec-table th { width: 170px; color: var(--ink-mute); font-weight: 500; }

  .task-frame { border-left: 2px solid var(--ink); padding: 4px 0 4px 22px; }
  .task-frame p + p, .prd p + p { margin-top: 14px; }

  .prd { color: var(--ink-soft); }
  .prd h3 { color: var(--ink); font-size: 17px; font-weight: 600; margin: 34px 0 12px; letter-spacing: -0.01em; }
  .prd h3:first-child { margin-top: 0; font-size: 19px; }
  .prd ul, .gates ul, .avoid ul { margin: 10px 0 14px; padding-left: 20px; }
  .prd li, .gates li, .avoid li { margin-bottom: 6px; }
  .prd .lead { margin-top: 16px; }
  code { font-family: "SF Mono", "JetBrains Mono", Menlo, monospace; font-size: 13px; background: var(--code-bg); padding: 1px 5px; border-radius: 4px; }

  .file-tree { font-family: "SF Mono", "JetBrains Mono", Menlo, monospace; font-size: 12.5px; line-height: 1.7;
    background: var(--code-bg); border: 1px solid var(--line); border-radius: 8px; padding: 16px 18px;
    margin: 14px 0; white-space: pre; overflow-x: auto; color: var(--ink-soft); }

  .round { display: flex; gap: 18px; padding: 16px 0; border-bottom: 1px solid var(--line-soft); }
  .round-marker { flex: 0 0 62px; }
  .round-marker .n { display: block; font-family: "SF Mono", Menlo, monospace; font-size: 16px; font-weight: 600; }
  .round-marker .c { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.09em; color: var(--ink-faint); }
  .round-body { color: var(--ink-soft); }
  .round-title { color: var(--ink); font-weight: 600; }

  .cycle { font-family: "SF Mono", "JetBrains Mono", Menlo, monospace; font-size: 12.5px; line-height: 1.7;
    background: var(--tint); border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px; margin: 14px 0; color: var(--ink); }

  .num-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 28px; margin: 16px 0 20px; }
  .num-item { display: flex; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line-soft); }
  .num-item .num { font-family: "SF Mono", Menlo, monospace; font-size: 11px; color: var(--ink-faint); padding-top: 3px; }
  .num-item .t { color: var(--ink); font-weight: 600; font-size: 14px; }
  .num-item .desc { display: block; color: var(--ink-mute); font-weight: 400; font-size: 13.5px; margin-top: 2px; }
  .num-item .file { display: block; font-family: "SF Mono", Menlo, monospace; font-size: 12px; color: var(--ink-faint); font-weight: 400; }

  .rubric .dim { width: 62%; }
  .rubric .mute { display: block; color: var(--ink-mute); font-size: 13px; font-weight: 400; margin-top: 2px; }
  .rubric .pts, .rubric .gate { text-align: right; width: 19%; font-family: "SF Mono", Menlo, monospace; font-size: 13px; }
  .rubric th { color: var(--ink-mute); font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  .rubric .total td { border-bottom: none; border-top: 1px solid var(--ink); font-weight: 600; }

  .gates, .avoid, .callout { border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; margin: 18px 0; }
  .gates { background: var(--tint); }
  .avoid { background: var(--tint-warm); }
  .callout { border-left: 2px solid var(--ink); border-radius: 0 10px 10px 0; background: var(--tint); }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.09em; color: var(--ink-faint); margin-bottom: 8px; }
  .gates ul, .avoid ul { margin-bottom: 0; }

  footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12px;
    color: var(--ink-faint); border-top: 1px solid var(--line); padding-top: 20px; letter-spacing: 0.02em; }

  @media (max-width: 720px) {
    .page { padding: 40px 22px 80px; }
    h1.title { font-size: 29px; }
    .meta-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .num-grid { grid-template-columns: 1fr; }
    .spec-table th { width: 120px; }
    footer { flex-direction: column; gap: 6px; }
  }

  @media print {
    .page { max-width: none; padding: 0; }
    section { break-inside: auto; }
    .round, .num-item, .callout, .gates, .avoid, .file-tree { break-inside: avoid; }
  }`;
