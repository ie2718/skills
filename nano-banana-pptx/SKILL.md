---
name: nano-banana-pptx
description: >
  Use this skill to generate stunning, visually rich PowerPoint presentations (.pptx) powered by
  Google's Nano Banana Pro (Gemini 3 Pro Image) AI image generation model. Trigger whenever the
  user asks to create a PPT, presentation, or slide deck AND wants AI-generated visual slides,
  beautiful images, infographics, or high-quality design. Also trigger for phrases like "用nano
  banana生成PPT", "AI生成幻灯片", "帮我做一个精美的PPT", "create a beautiful presentation",
  "generate slides with AI images", "make a professional deck", or any request combining PPT
  creation with visual quality. This skill produces polished, design-consistent presentations
  where EACH SLIDE is an AI-generated image assembled into a downloadable .pptx file.
---

# Nano Banana Pro × PPTX Skill

Generate stunning AI-powered presentations using **Nano Banana Pro** (Gemini 3 Pro Image)
for slide visuals, assembled into a professional `.pptx` via **PptxGenJS**.

---

## How It Works

Each slide is an **AI-generated full-bleed image**, assembled into a PPTX:

```
Topic → Outline → Slide Config (JSON) → AI Images (Nano Banana Pro) → PPTX
```

Key advantages:
- **Pixel-perfect design**: Every slide is a bespoke visual
- **Text rendered in-image**: Crisp titles, bullets, and stats inside the image
- **Style consistency**: Slide 1 image is passed as a reference to all subsequent calls
- **4K resolution**: Sharp on any projector
- **Flexible text**: `{{PLACEHOLDER}}` tokens let you swap content without touching prompts

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | — | Google AI Studio key (free at [aistudio.google.com](https://aistudio.google.com)) |
| `GEMINI_MODEL` | No | `gemini-3-pro-image-preview` | Override the image model |

```bash
export GEMINI_API_KEY="your-key-here"
export GEMINI_MODEL="gemini-3-pro-image-preview"   # optional
```

---

## Quick Start

```bash
npm install -g @google/generative-ai pptxgenjs

node scripts/quick_start.js \
  --topic  "The Future of Sustainable Architecture" \
  --style  A \
  --slides 10 \
  --output deck.pptx
```

This will:
1. Call Gemini text to plan an intelligent slide outline
2. Write a `slides-<slug>.json` config to disk (editable)
3. Generate each slide image via Nano Banana Pro
4. Assemble the PPTX

**Styles**: `A` Midnight Editorial · `B` Warm Editorial · `C` Kinetic Dark · `D` Luxe Minimal · `E` Bold Geometric
See [`references/slide-styles.md`](references/slide-styles.md) for full design specs and all slide-type prompt templates.

---

## The Slide Config File (slides.json)

The quick_start script writes a `slides-<slug>.json` that you can freely edit before re-generating.

### Structure

```json
{
  "title": "Presentation Title",
  "author": "Author Name",
  "throttle_ms": 2500,

  "variables": {
    "STYLE_SYSTEM": "...full design system prompt...",
    "ORGANIZATION": "Acme Corp",
    "DATE": "2025",
    "CONTACT_EMAIL": "hello@acme.com",
    "TOTAL": "10"
  },

  "slides": [
    {
      "name": "Cover",
      "variables": {
        "TITLE":    "The Future of Sustainable Architecture",
        "SUBTITLE": "A 2025 Strategic Framework"
      },
      "prompt": "{{STYLE_SYSTEM}}\nCOVER SLIDE...\nTitle: \"{{TITLE}}\"\nSubtitle: \"{{SUBTITLE}}\"\n16:9. 4K."
    }
  ]
}
```

### Placeholder System

Placeholders use `{{TOKEN}}` syntax. They are filled at runtime — global `variables` are available in every slide, slide-level `variables` override globals for that slide.

**Built-in auto tokens** (always available):
| Token | Value |
|-------|-------|
| `{{PAGE}}` | Current slide number |
| `{{TOTAL}}` | Total number of slides |

**Common tokens** (set in global variables):
| Token | Description |
|-------|-------------|
| `{{STYLE_SYSTEM}}` | The design system prompt block |
| `{{ORGANIZATION}}` | Company or team name |
| `{{DATE}}` | Year or date |
| `{{CONTACT_EMAIL}}` | Closing slide email |
| `{{CONTACT_WEB}}` | Closing slide website |

**Slide-level tokens** (set per slide):
| Token | Description |
|-------|-------------|
| `{{SLIDE_TITLE}}` | This slide's heading |
| `{{SUBTITLE}}` | Subtitle line (cover) |
| `{{SECTION}}` | Section/chapter label |
| `{{BULLETS}}` | Multi-line bullet block |
| `{{IMAGE_DESCRIPTION}}` | What to paint in image half |
| `{{STATS}}` | `VALUE \| LABEL \| CONTEXT` per line |
| `{{QUOTE_TEXT}}` | Full verbatim quote |
| `{{SPEAKER_NAME}}` | Quote attribution name |
| `{{SOURCE}}` | Footnote / attribution |
| `{{CLOSING_WORD}}` | e.g. "Thank You" |

Any unreplaced token is left as-is in the prompt (so you can spot missing values in QA).

### Adding More Slides

Simply append objects to the `slides` array:

```json
{
  "name": "My New Slide",
  "variables": {
    "SECTION":           "CHAPTER 04",
    "SLIDE_TITLE":       "Regional Expansion Strategy",
    "BULLETS":           "— APAC market entry: 3 priority cities identified\n— Partnership model reduces capex by 60%\n— Regulatory pre-clearance secured in Singapore",
    "IMAGE_DESCRIPTION": "Aerial nighttime photograph of Singapore skyline, dramatic city lights, premium architectural photography"
  },
  "prompt": "{{STYLE_SYSTEM}}\nMaintain identical visual DNA as reference image.\nSPLIT LAYOUT — LEFT TEXT / RIGHT IMAGE.\n...(rest of your prompt)...\n16:9. 4K."
}
```

Re-run the generator to produce only the new/changed slides:
```bash
node scripts/generate.js --config slides-my-deck.json --output deck.pptx
```

---

## Generating Images (Core Script)

```bash
node scripts/generate.js \
  --config  slides.json \
  --output  deck.pptx \
  --slides-dir ./slides
```

- Reads the config, fills `{{PLACEHOLDERS}}`, calls Nano Banana Pro for each slide
- Passes slide 1 image as style reference to all subsequent slides automatically
- Retries failed slides up to 2 times
- Saves images to `--slides-dir` (default: `./slides/`)
- Assembles all images into the PPTX

---

## Style Gallery

Five world-class design systems. Full specs in [`references/slide-styles.md`](references/slide-styles.md):

| Key | Name | Palette | Feel |
|-----|------|---------|------|
| `A` | **Midnight Editorial** | Black + Electric Blue | Premium editorial, Businessweek |
| `B` | **Warm Editorial** | Cream + Terracotta | Kinfolk, luxury architecture |
| `C` | **Kinetic Dark** | Deep Space + Teal | Apple WWDC, tech keynote |
| `D` | **Luxe Minimal** | Pure White + 18K Gold | McKinsey, LVMH annual reports |
| `E` | **Bold Geometric** | Charcoal + Coral | Creative agency, Pentagram |

Each style includes prompt templates for all slide types including:
- **Left Text / Right Image** (image generated by model)
- **Left Image / Right Text** (image generated by model)
- Cover, Agenda, Stats, Quote, Closing

---

## Slide Types Reference

| Type key | Layout |
|----------|--------|
| `cover` | Centered hero, dramatic negative space |
| `agenda` | Numbered sections list |
| `split-left-text-right-image` | Text panel left, AI image right |
| `split-left-image-right-text` | AI image left, text panel right |
| `stats` | 3-column stat cards with large numbers |
| `quote` | Full-bleed pull quote, centered |
| `closing` | Takeaways left, Thank You right |

---

## Workflow for Claude (Agent Instructions)

When a user asks to generate a PPT with Nano Banana Pro:

1. **Clarify**: topic, desired style (A–E), approximate slide count (8–15), any specific text/data
2. **Plan outline**: Cover → Agenda → Content mix → Closing. Ensure at least one left-text/right-image AND one left-image/right-text slide
3. **Read style templates** from [`references/slide-styles.md`](references/slide-styles.md) for the chosen style
4. **Write the slides.json** — fill all `{{PLACEHOLDERS}}` with real content, not vague descriptions
5. **Run generate.js** with the config
6. **QA**: check each `slides/slide_NN.png` for text legibility, layout accuracy, style consistency
7. **Re-generate failures**: edit the prompt in the JSON, re-run generate.js for just that slide
8. **Present the PPTX**

---

## QA Checklist

After generating, inspect each slide image:
- [ ] Text is legible and correctly spelled
- [ ] Color palette consistent across all slides
- [ ] Style motif present on every slide
- [ ] No overflowing or cut-off text
- [ ] Split slides have clear image/text division
- [ ] Slide types vary — not all the same layout
- [ ] Cover and closing are visually distinct and impactful

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Text garbled or wrong | Write all text verbatim in prompt: `Title: "exact text"` |
| Style inconsistency | Slide 1 must succeed first; it's the reference for all others |
| Layout ignored | Be more specific: `"left 48% panel"`, `"right 52% image"` |
| Rate limit error | Increase `throttle_ms` in config (try `4000`) |
| Blank/no image in response | Retry — model occasionally returns no image; generator retries automatically |
| API key error | Check `GEMINI_API_KEY` env var; verify at aistudio.google.com |
| Model not found | Check `GEMINI_MODEL` env var; default is `gemini-3-pro-image-preview` |

---

## Dependencies

```bash
npm install -g @google/generative-ai pptxgenjs
pip install markitdown   # optional, for text-extraction QA
```

**Example config**: `scripts/slides-example.json`
**Core generator**: `scripts/generate.js`
**Quick scaffold**: `scripts/quick_start.js`
**Style gallery**: `references/slide-styles.md`
