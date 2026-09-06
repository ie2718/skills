---
name: blender-scene-brief
description: Turn a scene idea into a complete Blender production brief — a long-horizon prompt that another agent executes to build a photorealistic, fully editable Blender environment. Produces a pasteable Markdown prompt plus a styled HTML page, covering runtime, build order, zone-by-zone spatial plan, asset families with hard counts, materials, lighting, a numbered final camera set, a fresh-context critic roster, a weighted 100-point rubric with derived gates, critical-failure list, and deliverables tree. Use when the user wants to turn a place or scene into a Blender model or 3D environment, or asks for a scene prompt, environment brief, 3D production brief, art bible, or render checklist. Triggers include "把这个场景做成blender模型", "做一个blender场景", "blender场景提示词", "生成3D场景提示词", "写一个环境美术brief", "blender scene prompt", "blender production brief", "3D environment brief", "make this scene in Blender". Not for driving Blender itself, writing bpy scripts, or editing an existing .blend.
---

# Blender Scene Brief

This skill writes the **prompt**, not the model. The output is a production brief detailed
enough that an agent with Blender and a long budget can build the scene from it alone, and be
graded against it.

Two artifacts, always both:

- `<slug>_brief.md` — the pasteable prompt. This is the deliverable.
- `<slug>_brief.html` — a styled, printable page of the same brief, for sharing or review.

## Workflow

### 1. Pin the scene

You need four things before writing anything: **what the place is**, **how big it is**, **when
it is** (time of day, weather, season, era), and **what the defining moment inside it is**.

If the user gave you a scene in one line, you already have enough to make defensible
assumptions — make them, state them in one sentence when you hand back the brief, and keep
going. Ask at most two questions, and only when a different answer would change the zone list
or the rubric weighting (for example: "a working shop or a restored showpiece?").

### 2. Read the derivation rules

Read [references/brief-anatomy.md](references/brief-anatomy.md). It says which sections the
renderer supplies as fixed scaffolding (you must not restate them) and how to derive each
scene-specific list — zones, asset counts, palette, lighting, cameras, rubric weighting,
critics, failures.

Then find the closest entry in [references/scene-archetypes.md](references/scene-archetypes.md)
for the zones this scene type invites people to forget, the rubric bias it needs, and the
shortcut it invites. Seeds only — write fresh prose.

### 3. Author the spec

Write one JSON file. The field-by-field reference is
[references/spec-schema.md](references/spec-schema.md);
[assets/examples/arch-motorcycle-workshop.json](assets/examples/arch-motorcycle-workshop.json)
is a complete worked example — read it for shape and specificity, never for sentences.

Put the spec somewhere neutral (a scratch directory, or beside the user's project). It is an
intermediate, not a deliverable, unless the user asks to keep it for later edits.

The four things that decide whether the brief is any good:

1. **Hard counts in every asset family.** "At least 12 complete machines across four distinct
   types, 3 stripped to varying depths" builds a scene. "Several motorcycles" builds three.
2. **Zones nobody photographs.** Storage, waste, staff routes, plant. A zone list that is all
   public produces a scene built only where the camera looks.
3. **Rubric weighting that fits this scene.** Give the most points to whatever this particular
   place lives or dies on, and keep technical quality around 5. Copying a weighting from
   another scene is the tell that the brief was not really written for this one.
4. **Scene-specific failures.** Name the shortcut *this* scene invites, not only the generic
   ones.

### 4. Render and fix

```bash
node scripts/render-brief.mjs my-scene.json --out-dir .
```

The renderer refuses to write anything until the spec is internally consistent, and prints
every problem at once. It enforces: rubric points summing to exactly 100, each gate derived as
`points × 0.85` rounded up, camera files numbered `01…NN` with no gaps and exactly one hero,
count ranges (zones 8–14, cameras 12–18, critics 5–7), and no leftover placeholders. Camera,
zone, and critic counts appear in several places in the output and are all derived from the
arrays, so they cannot contradict each other.

Fix the spec and re-run until it passes. Use `--draft` only while the spec is still being
filled in — it relaxes the count ranges and nothing else.

### 5. Hand back

Give the user the Markdown path first (that is the prompt), then the HTML. Send the files with
SendUserFile so they are reachable, and state any assumption you made in step 1 in a single
sentence. Do not paste the whole brief into chat — it is long by design.

If the user wants the brief published as a shareable page rather than a local file, publish the
HTML as an Artifact.

## Scope

This skill stops at the brief. It does not run Blender, write `bpy` scripts, or edit `.blend`
files. If the user wants the scene actually built, hand them the Markdown brief and let it
drive a session that has Blender available — the brief is written to be executed by an agent
with a long budget and sub-agents for the review loop.

## Files

| Path | What it is |
| --- | --- |
| [scripts/render-brief.mjs](scripts/render-brief.mjs) | Spec → Markdown + HTML, with all consistency enforcement |
| [references/brief-anatomy.md](references/brief-anatomy.md) | Fixed scaffolding vs. derived content, and the writing rules |
| [references/scene-archetypes.md](references/scene-archetypes.md) | Ten archetypes with zone, rubric, and failure seeds |
| [references/spec-schema.md](references/spec-schema.md) | Every spec field, and what the renderer enforces |
| [assets/examples/arch-motorcycle-workshop.json](assets/examples/arch-motorcycle-workshop.json) | A complete worked spec |
