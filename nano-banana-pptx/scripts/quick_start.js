/**
 * Nano Banana Pro × PPTX — Quick-Start Scaffold
 * ===============================================
 * Given a topic and style, writes a ready-to-edit slides.json and immediately
 * runs the generator. The JSON is left on disk so you can tweak any slide
 * text, add more slides, or change prompts before re-running.
 *
 * Environment variables:
 *   GEMINI_API_KEY   (required)
 *   GEMINI_MODEL     (optional, default: gemini-3-pro-image-preview)
 *
 * Usage:
 *   node quick_start.js \
 *     --topic  "AI in Healthcare" \
 *     --style  A                    (A | B | C | D | E — see references/slide-styles.md)
 *     --slides 8                    (total slides to generate, default: 8)
 *     --output my-deck.pptx
 *
 * The generated slides-<slug>.json is written to disk.
 * To iterate: edit it freely, then re-run the generator directly:
 *   node generate.js --config slides-<slug>.json --output my-deck.pptx
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── Env ───────────────────────────────────────────────────────────────────────

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL   = process.env.GEMINI_MODEL || "gemini-3-pro-image-preview";

if (!API_KEY) {
  console.error("❌  GEMINI_API_KEY not set. Get a free key at aistudio.google.com");
  process.exit(1);
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : fallback;
  };
  return {
    topic:      get("--topic",  "Strategic Innovation 2025"),
    style:      get("--style",  "A").toUpperCase(),
    slideCount: parseInt(get("--slides", "8"), 10),
    output:     get("--output", null),
  };
}

// ── Style definitions ─────────────────────────────────────────────────────────
// Full design documentation and split-layout templates: references/slide-styles.md

const STYLE_SYSTEMS = {
  A: {
    name: "Midnight Editorial",
    system: `Design language — Midnight Editorial:
Background fill: near-black #0B0F19. Card/panel surface: #131929.
All text: off-white #F0F4FF. Single accent color: electric blue #3B82F6. Muted labels: slate #64748B.
Typography: heavy condensed sans-serif titles (bold, tight tracking), light-weight body.
Section category labels in ALL CAPS small text, electric blue.
ONE thin 2px electric-blue horizontal rule spans the full width at the very top of every slide.
NO gradients, NO blob shapes, NO decorative ornaments beyond the top rule.
Negative space is intentional — breathe.`,
  },
  B: {
    name: "Warm Editorial",
    system: `Design language — Warm Editorial (Terracotta × Cream):
Background: warm cream #F7F0E8. Dark panel color: rich brown-black #2C1810.
Primary text: dark brown #3D2B1F. Accent: terracotta #8B3A2A. Muted: warm taupe #A89080.
Thin antique gold #C9963E horizontal rule under section labels only.
4px full-height terracotta vertical bar on the extreme left edge of every slide.
Typography: elegant tall serif for titles (Garamond style), humanist sans-serif for body.
Warm, literary, premium. NO gradients, NO neon, NO tech-corporate aesthetics.`,
  },
  C: {
    name: "Kinetic Dark",
    system: `Design language — Kinetic Dark (Deep Space × Neon Teal):
Background: near-black #060A10 with barely-visible dot grid (4% opacity white dots, 24px spacing).
Card surface: #0E1724. Primary text: light steel blue #D4E4F0. Accent: neon teal #00D4AA. Muted: slate-blue #4A6070.
Key focal elements get very subtle radial teal glow behind them (15% opacity, large radius).
Typography: geometric sans-serif, medium-heavy. Tight tracking on large titles.
Thin 1px teal horizontal rules under section labels. Clean, focused, breathable.`,
  },
  D: {
    name: "Luxe Minimal",
    system: `Design language — Luxe Minimal (Pure White × 18K Gold):
Background: pure white #FFFFFF. Type: deep charcoal-navy #1A1A2E.
Accent: 18K gold #B8962E — ONLY on: 1px full-width bottom rule, section label prefix squares ■, large numerals in stat slides.
Light card fill: #F5F5F7. Muted text: #8E8E93.
Typography: tall elegant serif for display (Garamond/Didot style), clean geometric sans for body.
Every slide: 1px gold horizontal rule at very bottom edge, full width. Maximum restraint. Silence IS the design.`,
  },
  E: {
    name: "Bold Geometric",
    system: `Design language — Bold Geometric (Coral × Charcoal):
Background: deep charcoal #1C1C1E. Text: off-white #F5F0EB. Accent: coral #FF5A5F.
Card/panel fill: #2C2C2E. Muted: #8A8A8E.
EVERY slide MUST have: (1) full-height coral rectangle, 8% slide width, RIGHT edge. (2) small coral square top-left corner.
Typography: bold extended/wide sans-serif for titles, regular geometric sans for body. No serifs.`,
  },
};

// ── AI scaffold generation ────────────────────────────────────────────────────

async function generateScaffold(topic, styleName, slideCount) {
  console.log("🧠  Generating slide outline via Gemini text...");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const metaPrompt = `
You are a senior presentation strategist and copywriter with a background in design.
Create a ${slideCount}-slide presentation scaffold for the topic: "${topic}"
Visual style: ${styleName}

Return ONLY a valid JSON array of slide objects. No markdown, no code fences, no explanation.

Each object must have EXACTLY these keys:
{
  "name": "short internal slide name",
  "type": one of: "cover" | "agenda" | "split-left-text-right-image" | "split-left-image-right-text" | "stats" | "quote" | "closing",
  "section": "section/chapter label shown on slide (e.g. 'CHAPTER 01', 'KEY DATA', 'INSIGHTS')",
  "title": "slide headline — punchy, specific, final copy",
  "body": "ready-to-display content (see format rules below)",
  "image_description": "for split slides: precise description of the image to generate. Empty string for other types.",
  "source": "footnote, attribution, or data source. Empty string if none."
}

BODY FORMAT RULES by slide type:
- cover: one subtitle line
- agenda: multi-line, one item per line: "01   Section Title\\n     One-line description"
- split slides: multi-line bullets, each starting with "— "
- stats: multi-line, one stat per line: "VALUE | label | one-line context"
- quote: the full verbatim quote text only (source goes in "source" field)
- closing: multi-line takeaways, each starting with "→ "

MANDATORY SLIDE SEQUENCE:
- Slide 1: cover
- Slide 2: agenda (list all content sections)
- Slides 3 to ${slideCount - 1}: content slides — MUST include at least one "split-left-text-right-image" AND at least one "split-left-image-right-text". Mix in stats and quote.
- Slide ${slideCount}: closing

CONTENT QUALITY:
- Every word is final, ready to appear verbatim on the slide
- Bullets: 3–5 per slide, specific and actionable
- Stats: realistic figures with plausible sources  
- Image descriptions: photorealistic, editorial, specific — mention lighting, mood, subject, angle
- No vague placeholders like "describe benefits here" — write the actual content
`;

  const result = await textModel.generateContent(metaPrompt);
  const raw = result.response.text().trim();
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

// ── Prompt builders by slide type ─────────────────────────────────────────────

const STYLE_TOKEN = "{{STYLE_SYSTEM}}";
const MAINTAIN = `${STYLE_TOKEN}\nMaintain IDENTICAL color palette, typography, motif, and design language as the reference slide image.`;

function promptFor(slide, isFirst) {
  const base = isFirst ? STYLE_TOKEN : MAINTAIN;
  const page = "{{PAGE}} / {{TOTAL}}";

  switch (slide.type) {
    case "cover":
      return `${base}
COVER SLIDE. Centered composition, massive negative space.
Category label top-left in accent color ALL CAPS: "{{CATEGORY}}"
Hero title: "{{SLIDE_TITLE}}" — largest text, bold, primary color.
Subtitle: "{{SUBTITLE}}" in lighter weight, muted, below the title.
Bottom strip: dark bar full width. Left: "{{DATE}}" muted. Right: "{{ORGANIZATION}}" muted.
Nothing else. Open space dominates. 16:9. 4K.`;

    case "agenda":
      return `${base}
AGENDA / TABLE OF CONTENTS SLIDE.
Top-left: "AGENDA" in accent color ALL CAPS.
Numbered agenda list — large accent numeral, item title in primary text, descriptor in muted below:
{{AGENDA_ITEMS}}
Full surface-color card behind the list. Generous row height.
Bottom-right: "${page}" in muted, small. 16:9. 4K.`;

    case "split-left-text-right-image":
      return `${base}
SPLIT LAYOUT — LEFT TEXT / RIGHT AI-GENERATED IMAGE.
Left half (48%): surface/card panel.
  Top: section label "{{SECTION}}" in accent color ALL CAPS, small.
  Title: "{{SLIDE_TITLE}}" in display font, large, primary text color.
  Bullet points (each prefixed with "—", one per line):
{{BULLETS}}
  Bottom: "${page}" in muted small.
Right half (52%): full-bleed AI-generated image.
  Subject: "{{IMAGE_DESCRIPTION}}"
  Mood: editorial, professional, harmonizes with this color palette.
  1px accent-color vertical divider between panels.
16:9. 4K.`;

    case "split-left-image-right-text":
      return `${base}
SPLIT LAYOUT — LEFT AI-GENERATED IMAGE / RIGHT TEXT.
Left half (52%): full-bleed AI-generated image.
  Subject: "{{IMAGE_DESCRIPTION}}"
  Mood: editorial, cinematic, harmonizes with this color palette.
  1px accent-color vertical line at the right edge.
Right half (48%): surface/card panel.
  Top: section label "{{SECTION}}" in accent color ALL CAPS, small.
  Title: "{{SLIDE_TITLE}}" in display font, large, primary text color.
  Bullets (each "—", one per line):
{{BULLETS}}
  Bottom: source in muted italic very small: "{{SOURCE}}"
16:9. 4K.`;

    case "stats":
      return `${base}
DATA / STATISTICS SLIDE.
Top: "BY THE NUMBERS" in accent color ALL CAPS. Below: title "{{SLIDE_TITLE}}" in display font, large.
Center: horizontal row of stat cards. Each card (surface color background):
  Large accent numeral/stat. Label in primary text medium weight. Context in muted small.
Stats (STAT | LABEL | CONTEXT format):
{{STATS}}
Cards separated by 1px accent vertical rules.
Footnote in muted italic small: "{{SOURCE}}"
${page} bottom-right. 16:9. 4K.`;

    case "quote":
      return `${base}
PULL QUOTE SLIDE. Full background color. Centered composition.
Giant decorative quotation mark in accent color, upper area.
Quote in editorial italic, large, primary text color, centered:
  "{{QUOTE_TEXT}}"
Thin 1px accent rule centered below the quote.
"— {{SPEAKER_NAME}}" in display bold, primary text. "{{SPEAKER_TITLE}}" in muted below.
Maximum breathing space. 16:9. 4K.`;

    case "closing":
      return `${base}
CLOSING / THANK YOU SLIDE.
Left 42%: surface panel.
  "KEY TAKEAWAYS" in accent ALL CAPS.
  Takeaway lines prefixed with "→" in accent color:
{{BULLETS}}
Right 58%: background color.
  Large bold primary text: "{{CLOSING_WORD}}"
  Subtitle in muted below: "{{CLOSING_SUBTITLE}}"
  Contact block at bottom in muted small: "{{CONTACT_EMAIL}}  ·  {{CONTACT_WEB}}"
16:9. 4K.`;

    default:
      return `${base}\n${slide.body || ""}\n16:9. 4K.`;
  }
}

function variablesFor(slide) {
  switch (slide.type) {
    case "cover":
      return { SLIDE_TITLE: slide.title, SUBTITLE: slide.body, CATEGORY: slide.section };
    case "agenda":
      return { AGENDA_ITEMS: slide.body };
    case "split-left-text-right-image":
    case "split-left-image-right-text":
      return {
        SECTION: slide.section,
        SLIDE_TITLE: slide.title,
        BULLETS: slide.body,
        IMAGE_DESCRIPTION: slide.image_description,
        SOURCE: slide.source,
      };
    case "stats":
      return { SLIDE_TITLE: slide.title, STATS: slide.body, SOURCE: slide.source };
    case "quote": {
      const parts = (slide.source || "").split(",");
      return {
        QUOTE_TEXT: slide.body,
        SPEAKER_NAME: parts[0]?.trim() || "",
        SPEAKER_TITLE: parts.slice(1).join(",").trim() || "",
      };
    }
    case "closing":
      return {
        BULLETS: slide.body,
        CLOSING_WORD: slide.title || "Thank You",
        CLOSING_SUBTITLE: "",
      };
    default:
      return {};
  }
}

// ── Build slides.json ─────────────────────────────────────────────────────────

function buildConfig(topic, style, scaffold) {
  const total = scaffold.length;
  const slug  = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  const config = {
    _comment:   `Nano Banana Pro × PPTX — Generated scaffold for: "${topic}"`,
    _edit_hint: "Edit prompts, variables, or slide order freely. Add more slides by appending to the slides array. Re-run with: node generate.js --config <this-file> --output deck.pptx",
    title:      topic,
    author:     "Nano Banana Pro × Claude",
    throttle_ms: 2500,
    variables: {
      STYLE_SYSTEM:    style.system,
      CATEGORY:        topic.split(" ").slice(0, 2).join(" ").toUpperCase(),
      DATE:            new Date().getFullYear().toString(),
      ORGANIZATION:    "Your Organization",
      CONTACT_EMAIL:   "hello@yourcompany.com",
      CONTACT_WEB:     "www.yourcompany.com",
      TOTAL:           String(total),
    },
    slides: scaffold.map((slide, i) => ({
      name:      slide.name,
      variables: variablesFor(slide),
      prompt:    promptFor(slide, i === 0),
    })),
  };

  return { config, slug };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { topic, style: styleKey, slideCount, output } = parseArgs();

  const styleInfo = STYLE_SYSTEMS[styleKey];
  if (!styleInfo) {
    console.error(`❌  Unknown style "${styleKey}". Options: A B C D E`);
    process.exit(1);
  }

  console.log(`\n🍌  Nano Banana Pro × PPTX — Quick Start`);
  console.log(`🎨  Style  : ${styleKey} — ${styleInfo.name}`);
  console.log(`🤖  Model  : ${MODEL}`);
  console.log(`📋  Topic  : ${topic}`);
  console.log(`📑  Slides : ${slideCount}\n`);

  // Step 1: AI scaffold
  let scaffold;
  try {
    scaffold = await generateScaffold(topic, styleInfo.name, slideCount);
    console.log(`✅  Scaffold: ${scaffold.length} slides planned\n`);
  } catch (err) {
    console.error("❌  Scaffold generation failed:", err.message);
    process.exit(1);
  }

  // Step 2: Build config
  const { config, slug } = buildConfig(topic, styleInfo, scaffold);
  const configPath = `slides-${slug}.json`;
  const outputFile = output || `${slug}.pptx`;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  console.log(`📝  Config written: ${configPath}`);
  console.log(`    ↳ Edit this file to adjust text, prompts, or add slides before iterating.\n`);

  // Step 3: Run generator
  console.log("🚀  Starting image generation...\n");
  try {
    execSync(
      `node "${path.join(__dirname, "generate.js")}" --config "${configPath}" --output "${outputFile}"`,
      { stdio: "inherit", env: process.env }
    );
  } catch {
    console.error("\n❌  Generator exited with errors. Check output above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n💥  Fatal:", err.message);
  process.exit(1);
});
