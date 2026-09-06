# Scene spec schema

The spec is the only file you author. `scripts/render-brief.mjs` turns it into the Markdown
prompt and the HTML page, and supplies every invariant section itself. Anything not listed
here is scaffolding you do not write.

Annotated skeleton (JSON — the `//` lines are commentary, strip them):

```jsonc
{
  "slug": "kebab-case-id",          // becomes arch_motorcycle_workshop/ and the .blend name
  "title": "Human Readable Title",
  "subtitle": "One long sentence naming the scene, the pipeline, the critic count, the camera count, and the rubric.",

  "meta": {
    "engine": "Blender 4.x · Cycles",
    "scope": "the one metric pair that sizes this scene — area, unit count, capacity"
  },

  "runtime": {                       // the machine the brief will be executed on
    "compute": "...",
    "dcc": "...",
    "harness": "...",
    "starting_assets": "...",
    "budget": "..."
  },

  "roles": ["lead environment artist", "..."],   // >= 3; one must be the domain expert

  "objective": {
    "paragraphs": ["what is being built", "how big it is and how closely it must hold up"],
    "callout": { "label": "Defining Visual Story", "body": "one sentence of movement through the space" },
    "avoid": ["wrong reading 1", "..."]          // >= 4 named wrong interpretations
  },

  "spatial_intro": "optional override of the units/clearances sentence",
  "units": "meters",                             // optional, defaults to meters

  "zones": [                                     // 8-14
    { "name": "Zone name", "body": "what it contains and what makes it legible" }
  ],
  "adjacency": ["circulation rule", "..."],      // >= 3

  "asset_families": [                            // >= 6, each with hard counts
    { "name": "Family", "body": "at least N of X, with ..." }
  ],

  "construction": ["assembly that must resolve honestly", "..."],   // >= 3
  "palette": ["material phrase", "..."],                            // >= 5
  "material_notes": ["optional scene-specific surface rule"],       // optional

  "lighting": {
    "time": "time of day / weather, phrased to complete 'Set the scene at ...'",
    "exterior": "what is outside and why it is not a black or white hole",
    "direction": "the actual fixture list with colour temperatures, phrased to complete 'Lighting direction: ...'",
    "notes": ["optional extra"]
  },

  "storytelling": ["trace of recent use", "..."],  // >= 3

  "cameras": [                                     // 12-18, files numbered 01.. in order
    { "file": "01_snake_case.png", "name": "Camera name", "body": "what this frame proves" },
    { "file": "03_hero.png", "name": "Hero", "body": "...", "hero": true, "resolution": "2560x1440" }
  ],
  "base_resolution": "1920x1080",                  // optional

  "critics": [                                     // 5-7
    { "name": "Domain critic", "body": "what this critic judges" }
  ],

  "rubric": [                                      // 5-8 rows, points sum to exactly 100
    { "dimension": "Name", "detail": "what is being judged", "points": 20 }
  ],

  "failures": ["a condition that makes the artifact unacceptable", "..."],  // >= 8
  "escalation": ["structural thing to revisit when the score stalls", "..."], // >= 3
  "review_cycles": 4                               // optional, defaults to 4
}
```

## What the renderer enforces

It exits non-zero and prints every problem at once. These are hard:

- `slug` is kebab-case; `rubric` points are whole numbers 5–40 summing to **exactly 100**.
- Gate per dimension is derived as `points × 0.85`, rounded **up** to one decimal — never
  authored by hand, so it can never drift from the points column.
- Camera files match `NN_snake_case.png` and their `NN` runs 01, 02, 03 … with no gaps or
  duplicates. Exactly one camera carries `"hero": true`, and it needs a `resolution`.
- Counts stay in range: zones 8–14, cameras 12–18, critics 5–7, rubric 5–8 rows, plus the
  list minimums above. `--draft` relaxes the count ranges only; the structural rules stay on.
- No `{{…}}`, `<PLACEHOLDER>`, `TODO`, `TBD`, `XXX`, or `Lorem ipsum` survives anywhere.

Camera count, zone count, critic count, and the `01–NN` range in the deliverables tree are all
derived from the arrays. There is no second place to update them, which is the point.

## Commands

```bash
node scripts/render-brief.mjs my-scene.json --out-dir out
node scripts/render-brief.mjs my-scene.json --format md --quiet
node scripts/render-brief.mjs my-scene.json --draft      # while the spec is still growing
```
