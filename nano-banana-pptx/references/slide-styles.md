# Nano Banana Pro — Slide Style Gallery

Five world-class design systems with full prompt templates.
Each style includes: cover, agenda, content, split-image, stats, quote, and closing slide templates.
All prompts use `{{PLACEHOLDER}}` syntax — replace before sending to the API.

---

## Style A — Midnight Editorial

**Identity**: Premium editorial magazine. Near-black canvas with a single electric-blue ruling line as the only accent. Everything else is white type and carefully tuned negative space. Inspired by *Wallpaper* × Bloomberg Businessweek.

**Palette**
| Role | Hex | Use |
|------|-----|-----|
| Background | `#0B0F19` | All slides |
| Surface | `#131929` | Cards, panels |
| Primary text | `#F0F4FF` | Titles, body |
| Accent | `#3B82F6` | One ruling line, numbers |
| Muted | `#64748B` | Labels, captions |

**Motif**: A single 2px horizontal electric-blue rule at the very top edge of every slide. No gradients, no blobs, no decorative shapes beyond this line.

**Typography direction**: Heavy condensed sans-serif titles (imagine Helvetica Neue Condensed or Impact weight) at large size, paired with a very light body weight. ALL CAPS section labels.

---

### Style A Prompt Templates

**STYLE_A_SYSTEM** (include in every slide prompt):
```
Design language — Midnight Editorial:
Background fill: near-black #0B0F19. Card/panel surface: #131929.
All text: off-white #F0F4FF. Single accent color: electric blue #3B82F6.
Muted labels: slate #64748B.
Typography: heavy condensed sans-serif titles (bold, tight tracking), light-weight body.
Section category labels in ALL CAPS small text, electric blue.
ONE thin 2px electric-blue horizontal rule spans the full width at the very top of the slide.
NO gradients, NO blob shapes, NO decorative ornaments beyond the top rule.
Negative space is intentional — breathe.
```

**A-1 · Cover**
```
{{STYLE_A_SYSTEM}}
COVER SLIDE. Centered composition with massive negative space.
Top-left: category label in electric blue ALL CAPS: "{{CATEGORY}}"
Center: Hero title "{{TITLE}}" — condensed bold, very large, 3 lines max, off-white.
Below title: subtitle "{{SUBTITLE}}" in light-weight, smaller, slate color.
Bottom strip: thin dark surface bar (#131929) spanning full width.
  Inside bar — left-aligned: "{{DATE}}" in slate. Right-aligned: "{{ORGANIZATION}}" in slate.
Nothing else. Massive dark open space dominates. The title breathes.
16:9 aspect ratio. 4K ultra-quality.
```

**A-2 · Agenda**
```
{{STYLE_A_SYSTEM}}
AGENDA SLIDE.
Maintain identical visual DNA as the reference image.
Top-left: category label "AGENDA" in electric blue ALL CAPS.
Below: agenda items as a clean numbered list — each item on its own row:
  Large electric-blue numeral (01, 02, 03…) followed by item title in off-white.
  Below each title: one short descriptor line in slate, smaller weight.
Items:
{{AGENDA_ITEMS}}
  (format each as: "01   {{SECTION_TITLE}}\n     {{SECTION_DESC}}")
Full-width dark surface card behind the list. Generous row height — don't crowd.
Bottom-right: slide counter "2 / {{TOTAL}}" in slate small text.
16:9. 4K.
```

**A-3 · Full-Bleed Text (Left Text / Right Image)**
```
{{STYLE_A_SYSTEM}}
SPLIT LAYOUT — LEFT TEXT / RIGHT IMAGE.
Maintain identical visual DNA as the reference image.
Left half (48% width): dark surface panel #131929.
  Top of panel: section category label "{{SECTION}}" in electric blue ALL CAPS, small.
  Below: slide title "{{SLIDE_TITLE}}" in condensed bold, large, off-white, 2 lines max.
  Below title: body text — {{BULLET_COUNT}} bullet points, each prefixed with a thin blue dash "—":
{{BULLETS}}
    (format: "— {{POINT_1}}", one per line)
  Bottom of panel: page counter "{{PAGE}} / {{TOTAL}}" in slate.
Right half (52% width): AI-generated full-bleed photorealistic or illustrative image.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Image mood: editorial, professional, slightly desaturated to harmonize with dark palette.
  Vertical divider between panels: 1px electric blue line.
16:9. 4K.
```

**A-4 · Full-Bleed Image (Left Image / Right Text)**
```
{{STYLE_A_SYSTEM}}
SPLIT LAYOUT — LEFT IMAGE / RIGHT TEXT.
Maintain identical visual DNA as the reference image.
Left half (52% width): AI-generated full-bleed image, fills the panel edge-to-edge.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Image mood: editorial, cinematic, slightly cooler tones.
  Vertical divider on the right edge of image: 1px electric blue line.
Right half (48% width): dark surface panel #131929.
  Top: section label "{{SECTION}}" in electric blue ALL CAPS, small.
  Below: "{{SLIDE_TITLE}}" in condensed bold, large, off-white.
  Paragraph / bullets below:
{{BODY_TEXT}}
  Bottom: attribution or source note in slate italic, very small: "{{SOURCE}}"
16:9. 4K.
```

**A-5 · Stats / Data**
```
{{STYLE_A_SYSTEM}}
DATA SLIDE.
Maintain identical visual DNA as the reference image.
Top: section label "BY THE NUMBERS" in electric blue ALL CAPS.
  Below: slide title "{{SLIDE_TITLE}}" in condensed bold, large, off-white.
Center: {{STAT_COUNT}} stat cards in a horizontal row. Each card (#131929 background):
  - Very large numeral in electric blue: "{{STAT_N}}"
  - Label below in off-white, medium weight: "{{LABEL_N}}"
  - One-line context beneath in slate, small: "{{CONTEXT_N}}"
  - Cards separated by 1px blue vertical rules.
Stats:
{{STATS}}
  (format: STAT | LABEL | CONTEXT — e.g. "87% | adoption rate | among Fortune 500 by 2025")
Bottom: footnote in slate, small italic: "{{FOOTNOTE}}"
16:9. 4K.
```

**A-6 · Quote**
```
{{STYLE_A_SYSTEM}}
PULL QUOTE SLIDE.
Maintain identical visual DNA as the reference image.
Full dark background. Centered vertically and horizontally.
Giant quotation mark in electric blue, top-left, decorative, ~150pt.
Quote text — editorial italic serif — large, off-white, centered:
  "{{QUOTE_TEXT}}"
Below quote: thin 1px electric-blue horizontal rule, centered, 200px wide.
Attribution: "— {{SPEAKER_NAME}}" in condensed bold, off-white.
  "{{SPEAKER_TITLE}}" on next line, slate, light weight.
Nothing else. Maximum breathing space.
16:9. 4K.
```

**A-7 · Closing / Thank You**
```
{{STYLE_A_SYSTEM}}
CLOSING SLIDE.
Maintain identical visual DNA as the reference image.
Left 42%: dark surface panel #131929.
  Top: "KEY TAKEAWAYS" in electric blue ALL CAPS.
  Below: {{TAKEAWAY_COUNT}} takeaway lines, each preceded by "→" in electric blue:
{{TAKEAWAYS}}
    (format: "→ {{TAKEAWAY_N}}", one per line)
Right 58%: near-black background #0B0F19.
  Center: large off-white bold text "{{CLOSING_WORD}}" — e.g. "Thank You" or "Let's Build"
  Below: "{{CLOSING_SUBTITLE}}" in slate, lighter weight.
  Bottom: contact block in slate, small:
    "{{CONTACT_EMAIL}}  ·  {{CONTACT_WEB}}"
16:9. 4K.
```

---

## Style B — Warm Editorial (Terracotta × Cream)

**Identity**: Warm, human, premium. A terracotta-and-cream palette that feels like a luxury architecture or design studio's brand book. Organic but structured. Inspired by Kinfolk magazine × Dezeen.

**Palette**
| Role | Hex | Use |
|------|-----|-----|
| Background | `#F7F0E8` | Cream canvas |
| Deep accent | `#8B3A2A` | Terracotta — titles, rules |
| Surface dark | `#2C1810` | Dark panels, left strips |
| Body text | `#3D2B1F` | All readable text |
| Muted | `#A89080` | Captions, secondary |
| Gold line | `#C9963E` | Decorative rule only |

**Motif**: A 4px terracotta vertical bar on the far left of every slide (full height). Thin gold horizontal rule under section labels.

**Typography direction**: Tall elegant serif for titles (think Garamond / EB Garamond), clean humanist sans-serif for body. Warm and literary.

---

### Style B Prompt Templates

**STYLE_B_SYSTEM**:
```
Design language — Warm Editorial:
Background: warm cream #F7F0E8. Dark panel color: rich brown-black #2C1810.
Primary text: dark brown #3D2B1F. Accent: terracotta #8B3A2A. Muted: warm taupe #A89080.
Decorative rule: antique gold #C9963E (thin horizontal rule under section labels only).
A 4px full-height terracotta vertical bar on the extreme left edge of every slide.
Typography: elegant tall serif for titles (Garamond style, high contrast strokes),
  humanist sans-serif for body text. Warm, literary, premium.
NO gradients, NO neon, NO tech-corporate aesthetics.
```

**B-3 · Left Image / Right Text (Split)**
```
{{STYLE_B_SYSTEM}}
SPLIT LAYOUT — LEFT IMAGE / RIGHT TEXT.
Maintain identical visual DNA as the reference image.
Left half (50%): full-bleed photographic or illustrative image.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Mood: warm, natural light, editorial photography style, slightly warm tone.
  The 4px terracotta left-edge vertical bar overlaps the image's left margin.
Right half (50%): cream background #F7F0E8.
  Top: section label "{{SECTION}}" in terracotta, small caps, followed by thin gold rule.
  Heading: "{{SLIDE_TITLE}}" in tall serif, large, dark brown, 2 lines max.
  Body: paragraph or bullet points in humanist sans, body text color #3D2B1F:
{{BODY_TEXT}}
  Bottom-right: page number "{{PAGE}}" in taupe, small.
16:9. 4K.
```

**B-4 · Left Text / Right Image (Split)**
```
{{STYLE_B_SYSTEM}}
SPLIT LAYOUT — LEFT TEXT / RIGHT IMAGE.
Maintain identical visual DNA as the reference image.
Left half (50%): cream background #F7F0E8.
  The 4px terracotta bar is at the far left edge.
  Top: section label "{{SECTION}}" in terracotta small caps + thin gold rule beneath.
  Heading: "{{SLIDE_TITLE}}" in tall elegant serif, large, dark brown.
  Bullets below in humanist sans, dark brown:
{{BULLETS}}
  Bottom-left: page number "{{PAGE}}" in taupe, small.
Right half (50%): full-bleed image.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Mood: warm light, editorial still-life or architectural, natural color grading.
16:9. 4K.
```

---

## Style C — Kinetic Dark (Deep Space × Neon Teal)

**Identity**: High-energy, forward-looking, technology or innovation conference. Deep near-black space background with a single neon teal accent. Feels like a product launch keynote. Inspired by Apple WWDC × Google I/O slide aesthetics.

**Palette**
| Role | Hex | Use |
|------|-----|-----|
| Background | `#060A10` | All slides |
| Surface | `#0E1724` | Cards, panels |
| Teal accent | `#00D4AA` | Headings, rules, highlights |
| Body text | `#D4E4F0` | All readable text |
| Muted | `#4A6070` | Labels, captions |
| Glow tint | soft radial teal glow | behind hero numbers/icons only |

**Motif**: Subtle radial gradient glow (teal, low opacity ~15%) behind key focal elements — title on cover, big numbers on stats slide. Thin teal 1px rules. Grid of very faint dots (opacity 4%) on background.

**Typography direction**: Geometric sans-serif, medium-heavy weight. Think SF Pro / Inter. Tight tracking on titles, generous line-height on body.

---

### Style C Prompt Templates

**STYLE_C_SYSTEM**:
```
Design language — Kinetic Dark:
Background: near-black deep space #060A10 with a barely-visible dot grid (4% opacity white dots, 24px spacing).
Card/panel surface: #0E1724. Primary text: light steel blue #D4E4F0.
Single accent: neon teal #00D4AA. Muted labels: slate-blue #4A6070.
Key focal elements (hero title, big stats) get a very subtle radial teal glow behind them (15% opacity, large radius).
Typography: geometric sans-serif, medium-heavy. Tight tracking on large titles.
Thin 1px teal horizontal rules under section labels.
No decorative blobs, no harsh gradients. Clean, focused, breathable.
```

**C-3 · Left Text / Right Image (Split)**
```
{{STYLE_C_SYSTEM}}
SPLIT LAYOUT — LEFT TEXT / RIGHT AI IMAGE.
Maintain identical visual DNA as the reference image.
Left panel (45%): background #060A10.
  Top: section label "{{SECTION}}" in teal, small, light tracking. 1px teal rule below.
  Title: "{{SLIDE_TITLE}}" in geometric sans, bold, large, steel-blue text.
    Subtle teal radial glow behind the title text area.
  Below: {{BULLET_COUNT}} bullet points in steel-blue, normal weight:
{{BULLETS}}
    (prefix each: "▸ {{POINT_N}}")
  Bottom: "{{PAGE}} / {{TOTAL}}" in muted slate, small.
Right panel (55%): AI-generated image fills the panel.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Image mood: futuristic, dark, cinematic, cool color temperature. Teal or blue tones.
  Left edge of image: soft teal vignette feathers into the left panel.
  1px teal vertical divider at the split point.
16:9. 4K.
```

**C-4 · Left Image / Right Text (Split)**
```
{{STYLE_C_SYSTEM}}
SPLIT LAYOUT — LEFT AI IMAGE / RIGHT TEXT.
Maintain identical visual DNA as the reference image.
Left panel (55%): AI-generated image, full bleed.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Mood: cinematic, futuristic, cool and teal-tinted. High contrast.
  Right edge of image: soft dark vignette feathering into the right panel.
  1px teal vertical line at the split.
Right panel (45%): background #060A10.
  Top: section label "{{SECTION}}" in teal ALL CAPS, small. 1px teal rule below.
  Title: "{{SLIDE_TITLE}}" in geometric sans, heavy, steel-blue.
  Body paragraph or bullets:
{{BODY_TEXT}}
  Bottom: source/attribution in muted slate italic: "{{SOURCE}}"
16:9. 4K.
```

---

## Style D — Luxe Minimal (Pure White × Gold)

**Identity**: Ultra-premium, luxury brand, finance or consulting. Pure white canvas. The only color is 18K gold for accents and a deep charcoal for type. Inspired by McKinsey Quarterly × LVMH annual reports.

**Palette**
| Role | Hex | Use |
|------|-----|-----|
| Background | `#FFFFFF` | All slides |
| Type | `#1A1A2E` | Titles, body |
| Gold | `#B8962E` | Rules, numerals, accent |
| Light gray | `#F5F5F7` | Card fills |
| Muted | `#8E8E93` | Captions, footnotes |

**Motif**: A single 1px gold horizontal rule full-width at the very bottom of every slide. Section labels preceded by a tiny gold square "■". No imagery unless explicitly requested in split slides.

---

### Style D Prompt Templates

**STYLE_D_SYSTEM**:
```
Design language — Luxe Minimal:
Background: pure white #FFFFFF. Type: deep charcoal-navy #1A1A2E.
Accent: 18K gold #B8962E — used ONLY for: 1px full-width bottom rule, section label prefix squares ■, large numerals in stat slides.
Light card fill: #F5F5F7. Muted text: #8E8E93.
Typography: tall elegant serif for display (Garamond / Didot weight), clean geometric sans for body. Absolute minimum decoration.
Every slide: 1px gold horizontal rule at the very bottom edge, full width. Nothing else as decoration.
Maximum restraint. Silence IS the design.
```

**D-3 · Left Text / Right Image (Split)**
```
{{STYLE_D_SYSTEM}}
SPLIT LAYOUT — LEFT TEXT / RIGHT IMAGE.
Maintain identical visual DNA as the reference image.
Left half (50%): white background.
  Top: "■ {{SECTION}}" — gold square followed by section label in charcoal small caps.
  Below: 1px gold rule, partial width (matches text column).
  Heading: "{{SLIDE_TITLE}}" in tall serif display, very large, charcoal.
  Body bullets or paragraph in clean sans, normal weight, charcoal:
{{BULLETS}}
  Bottom: "{{PAGE}}" in muted gray, small.
Right half (50%): full-bleed editorial photograph or illustration.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Mood: bright, airy, high-key, muted saturation — harmonizes with white palette.
  No border between panels (the image simply begins at the midpoint).
The 1px gold bottom rule spans the full slide width across both halves.
16:9. 4K.
```

**D-4 · Left Image / Right Text (Split)**
```
{{STYLE_D_SYSTEM}}
SPLIT LAYOUT — LEFT IMAGE / RIGHT TEXT.
Maintain identical visual DNA as the reference image.
Left half (50%): full-bleed photograph or illustration.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Mood: clean, editorial, high-key lighting, muted or neutral tones.
Right half (50%): white background.
  Top: "■ {{SECTION}}" — gold square + section label in charcoal small caps.
  Partial-width gold rule below the label.
  Heading: "{{SLIDE_TITLE}}" in tall serif display, large, charcoal.
  Body paragraph or bullets in geometric sans, charcoal:
{{BODY_TEXT}}
  Bottom-right: source in muted gray italic, very small: "{{SOURCE}}"
Full-width 1px gold bottom rule across entire slide.
16:9. 4K.
```

---

## Style E — Bold Geometric (Coral × Charcoal)

**Identity**: Creative agency, brand strategy, marketing. Bold asymmetric geometry in coral and deep charcoal. Confident and energetic without being chaotic. Inspired by Pentagram × Sagmeister & Walsh work.

**Palette**
| Role | Hex | Use |
|------|-----|-----|
| Background | `#1C1C1E` | All slides |
| Coral | `#FF5A5F` | Geometric accent blocks, key numbers |
| Off-white | `#F5F0EB` | Primary text |
| Dark card | `#2C2C2E` | Panel fills |
| Muted | `#8A8A8E` | Labels, captions |

**Motif**: Asymmetric coral rectangle (full height, 8% slide width) anchored to the RIGHT edge of every slide. A smaller coral square (40×40px) in the TOP-LEFT corner. These two shapes create tension and frame the content.

---

### Style E Prompt Templates

**STYLE_E_SYSTEM**:
```
Design language — Bold Geometric:
Background: deep charcoal #1C1C1E. Text: off-white #F5F0EB. Accent: coral #FF5A5F.
Card/panel fill: slightly lighter charcoal #2C2C2E. Muted: #8A8A8E.
EVERY slide must have these two fixed geometric shapes:
  1. A full-height coral rectangle, 8% slide width, anchored to the RIGHT edge.
  2. A small coral square (~40×40px) in the TOP-LEFT corner.
These are non-negotiable structural elements — they anchor the composition.
Typography: bold extended/wide sans-serif for titles (Impact / Barlow Condensed feel),
  regular weight geometric sans for body. No serifs.
```

**E-3 · Left Text / Right Image (Split)**
```
{{STYLE_E_SYSTEM}}
SPLIT LAYOUT — LEFT TEXT / RIGHT IMAGE (+ coral right bar).
Maintain identical visual DNA as the reference image.
Left 42%: dark background #1C1C1E.
  Small coral square top-left (structural motif).
  Section label: "{{SECTION}}" in coral, bold, small caps.
  Title: "{{SLIDE_TITLE}}" in bold extended sans, very large, off-white. 2 lines max.
  Bullets in regular geometric sans, off-white:
{{BULLETS}}
    (prefix: "— {{POINT_N}}")
  Bottom: "{{PAGE}} / {{TOTAL}}" in muted, small.
Middle 50%: AI-generated image fills this zone, edge to edge.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Mood: bold, high-contrast, dramatic. Colors that coexist with charcoal and coral.
Right 8%: full-height solid coral rectangle (structural motif — always present).
16:9. 4K.
```

**E-4 · Left Image / Right Text (Split)**
```
{{STYLE_E_SYSTEM}}
SPLIT LAYOUT — LEFT IMAGE / RIGHT TEXT (+ coral right bar).
Maintain identical visual DNA as the reference image.
Left 8%: implied space (the coral small square is top-left of the entire slide).
Middle-left 47%: AI-generated image, full-bleed in this zone.
  Image subject: "{{IMAGE_DESCRIPTION}}"
  Mood: cinematic, bold, high contrast. Warm or saturated tones welcome.
Middle-right 37%: dark panel #2C2C2E.
  Top: section label "{{SECTION}}" in coral, bold, small caps.
  Title: "{{SLIDE_TITLE}}" in bold extended sans, large, off-white.
  Body paragraph or bullets:
{{BODY_TEXT}}
  Bottom: attribution in muted gray italic: "{{SOURCE}}"
Right 8%: full-height solid coral rectangle (always present, structural motif).
16:9. 4K.
```

---

## Placeholder Reference

All templates use `{{PLACEHOLDER}}` tokens. Replace these before sending to the API:

| Token | Description |
|-------|-------------|
| `{{STYLE_X_SYSTEM}}` | The style's design system block (always include) |
| `{{TITLE}}` | Presentation or slide main title |
| `{{SUBTITLE}}` | Subtitle line |
| `{{CATEGORY}}` | Top-level category label (e.g. "Technology Report") |
| `{{DATE}}` | Date or year |
| `{{ORGANIZATION}}` | Company or team name |
| `{{SECTION}}` | Current section label |
| `{{SLIDE_TITLE}}` | This slide's heading |
| `{{AGENDA_ITEMS}}` | Multi-line agenda formatted text |
| `{{BULLETS}}` | Multi-line bullet list |
| `{{BULLET_COUNT}}` | Number of bullets (so model knows) |
| `{{BODY_TEXT}}` | Paragraph or bullet block |
| `{{IMAGE_DESCRIPTION}}` | What the AI should paint in the image half |
| `{{STATS}}` | Stats in STAT \| LABEL \| CONTEXT format |
| `{{STAT_COUNT}}` | Number of stats |
| `{{STAT_N}}` / `{{LABEL_N}}` / `{{CONTEXT_N}}` | Individual stat triplet |
| `{{FOOTNOTE}}` | Source footnote |
| `{{QUOTE_TEXT}}` | Full verbatim quote |
| `{{SPEAKER_NAME}}` | Quote attribution name |
| `{{SPEAKER_TITLE}}` | Quote attribution title |
| `{{TAKEAWAYS}}` | Multi-line takeaway list |
| `{{TAKEAWAY_COUNT}}` | Number of takeaways |
| `{{CLOSING_WORD}}` | e.g. "Thank You" or "Let's Go" |
| `{{CLOSING_SUBTITLE}}` | Closing sub-message |
| `{{CONTACT_EMAIL}}` | Contact email |
| `{{CONTACT_WEB}}` | Website URL |
| `{{PAGE}}` | Current slide number |
| `{{TOTAL}}` | Total slide count |
| `{{SOURCE}}` | Attribution / source line |
