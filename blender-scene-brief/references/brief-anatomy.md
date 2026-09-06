# Brief anatomy — what is fixed and what you derive

A production brief has two layers. Getting the split right is what keeps a generated brief
from reading like a filled-in form.

## Fixed scaffolding (the renderer writes it)

You never author these, and you should not restate them inside your spec strings:

| Section | What it holds |
| --- | --- |
| 01 / TASK | Role framing, "do the actual work", autonomy and stop conditions |
| 02 / PROTOCOL | Environment discovery, the four working documents, checkpoints, resume rules |
| 03 / BUILD ORDER | The five build steps: art bible → graybox → preview judgeset → asset families → dressing |
| 04 / REVIEW LOOP | Judgeset discipline, evidence rules, regression labels, structural escalation frame |
| 05 exit gates | ≥90 overall, ≥85% per dimension, zero critical failures, coverage, no regression |
| 06 / VALIDATION | Cold-start reopen and rerender |
| §4 closing | Credible thickness, terminations, bevels |
| §5 rules | Principled BSDF, real-world scale, directional evidence, no-noise-only separation |
| §6 rules | Key/fill/practical hierarchy, AgX, foreground/midground/background |
| §7 closing | Props must communicate; no clutter to hide weak architecture |
| §9 | Collections, naming, instancing, relative paths, editability |
| §11 | Deliverables tree and portability |

The renderer substitutes only the slug, directory name, camera range, critic count, and
review-cycle count into these.

## Derived per scene (your job)

### Scope metric
One pair that sizes the scene: area plus a capacity or unit count. "1,400–2,000 m² · 120–150
covers" for a restaurant; "260–340 m² · two lifts · 12+ machines" for a workshop; "4 platforms
· 180 m of tunnel" for a station. If you cannot name a number, you have not decided what the
scene is yet.

### Zones (8–14)
Each is a place a person could stand and describe. Include the ones nobody photographs — back
of house, storage, waste, plant, staff routes. A brief that lists only the pretty zones
produces a set built only where the camera looks. Every zone must be worth a camera or worth
being visible from one.

### Adjacency rules (≥3)
Not a repeat of the zone list — the *relationships* that make the plan real: who controls
entry, which two flows must never cross, what stays reachable without moving something, where
dirty separates from clean. Write them as testable statements a critic can check in a render.

### Asset families (≥6) with hard counts
This is the single highest-leverage part of the brief. "Lots of tools" produces three tools.
"At least 3 roller cabinets with partially open drawers, a shadow board with outlines and
gaps, socket sets, torque wrenches…" produces a workshop. Every family gets a number or an
explicit floor, and the families together must cover: the primary subject, the equipment that
makes the activity work, storage and stock, small props, and the exterior or context layer.

### Construction detail (≥3)
Name the assemblies that are usually faked and demand they resolve: how the envelope meets the
structure, how an opening actually works, how water leaves, how something is supported. Pick
the ones specific to this building type.

### Palette (≥5)
Concrete material phrases, not adjectives. "Engineering brick in dark red-brown with lime
bloom and soot" is a spec; "industrial materials" is not. Include the accent and say how
sparingly it is used.

### Lighting
Three fields do the work: `time` (time of day and weather), `exterior` (what is out there, so
windows and openings are neither blown white nor dead black), and `direction` (the actual
fixtures with colour temperatures and roles). Colour temperatures make lighting reviewable.

### Storytelling (≥3)
Evidence of the last hour of work, not decoration. Each item should imply a person who just
left the frame.

### Cameras (12–18)
The set must prove coverage, so derive it from the zone list, not from what looks good:
one arrival/exterior, one hero uniting the major zones, one per remaining zone, at least one
reverse or overhead audit angle, and one or two close material/detail frames. Exactly one hero
at ≥2560×1440. Number them in walk-through order so the contact sheet reads as a tour.

### Critics (5–7)
One per axis the rubric scores, named in the domain's own language. Always include a
technical/Blender critic. The others should be the specialists a real production would hire —
a planner, an operations or subject-matter expert, a materials or craft eye, a lighting eye.

### Rubric (5–8 rows summing to 100)
**Weight for this scene.** The reference restaurant gives 20 points to bar and kitchen
operations because operational authenticity is what that scene lives or dies on. A workshop
weights tooling authenticity; a temple weights carving and construction; a spacecraft weights
mechanical systems and instrument legibility. Keep technical quality small (≈5) — it is a
floor, not a goal. Do not copy the restaurant's weights.

### Critical failures (≥8)
The most useful ones are scene-specific and falsifiable: name the shortcut this particular
scene invites. Generic entries (floating assets, default materials, viewport screenshots
instead of renders, unopenable .blend) belong in the list too, but they should not be all of
it.

### Escalation targets (≥3)
Noun phrases naming what to restructure when the score stalls — the plan, the density, the
key relationship, the ceiling, the exterior read, the hero composition. These are the things a
brief tells the builder to fix *instead of* adding more props.

## Writing rules

- Numbers over adjectives. Every "several", "various", and "many" is a defect.
- Name the wrong answer. The `avoid` list and the failures list are what keep an agent from
  landing on the nearest cliché.
- One voice: declarative, present tense, second person implied. No hedging, no "consider".
- Do not reuse another scene's sentences. Reuse the *shape*: the archetype seeds and the
  example spec exist to show structure, not to be pasted.
- Keep every string self-contained. The renderer wraps them in headings and lists; a string
  that starts with "Also," or "As above," breaks when it lands in a grid cell.
