/**
 * Nano Banana Pro × PPTX — Core Generator
 * =========================================
 * Reads a slide-config JSON file, fills {{PLACEHOLDER}} tokens with your content,
 * calls Gemini (Nano Banana Pro) to generate each slide image, then assembles a .pptx file.
 *
 * Environment variables:
 *   GEMINI_API_KEY   (required) — your Google AI Studio API key
 *   GEMINI_MODEL     (optional) — override the model, default: gemini-3-pro-image-preview
 *
 * Usage:
 *   node generate.js --config slides.json [--output my-deck.pptx] [--slides-dir ./slides]
 *
 * Config format: see examples/slides-example.json
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-image-preview";

if (!API_KEY) {
  console.error("❌  GEMINI_API_KEY environment variable is not set.");
  console.error("    Get a free key at: https://aistudio.google.com");
  process.exit(1);
}

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    config: get("--config") || "slides.json",
    output: get("--output") || "presentation.pptx",
    slidesDir: get("--slides-dir") || "./slides",
  };
}

// ── Placeholder filling ───────────────────────────────────────────────────────

/**
 * Replace {{TOKEN}} placeholders in a string with values from a data object.
 * Supports nested keys: {{SECTION.LABEL}} → data.SECTION.LABEL
 * Unreplaced tokens are left as-is (so you can catch them in QA).
 */
function fillPlaceholders(template, data) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const parts = key.split(".");
    let val = data;
    for (const part of parts) {
      if (val && typeof val === "object" && part in val) {
        val = val[part];
      } else {
        return match; // leave unreplaced
      }
    }
    return String(val);
  });
}

// ── Image generation ──────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(API_KEY);

async function generateSlideImage({ prompt, referenceImagePath, slideIndex, slidesDir }) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseModalities: ["image", "text"] },
  });

  const parts = [{ text: prompt }];

  if (referenceImagePath && fs.existsSync(referenceImagePath)) {
    const imageData = fs.readFileSync(referenceImagePath).toString("base64");
    parts.unshift({
      inlineData: { mimeType: "image/png", data: imageData },
    });
    console.log(`   📎 Style reference: ${path.basename(referenceImagePath)}`);
  }

  const result = await model.generateContent(parts);
  const candidates = result.response?.candidates;

  if (!candidates || candidates.length === 0) {
    throw new Error("API returned no candidates");
  }

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      const buf = Buffer.from(part.inlineData.data, "base64");
      const outPath = path.join(slidesDir, `slide_${String(slideIndex).padStart(2, "0")}.png`);
      fs.writeFileSync(outPath, buf);
      return outPath;
    }
  }

  throw new Error(`Slide ${slideIndex}: No image data in API response`);
}

async function generateWithRetry(params, maxRetries = 2, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await generateSlideImage(params);
    } catch (err) {
      if (attempt <= maxRetries) {
        console.warn(`   ⚠️  Attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs / 1000}s...`);
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
}

// ── PPTX assembly ─────────────────────────────────────────────────────────────

async function assemblePptx({ imagePaths, outputPath, title, author }) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  if (title) pres.title = title;
  if (author) pres.author = author;

  let added = 0;
  for (const imgPath of imagePaths) {
    if (!imgPath || !fs.existsSync(imgPath)) {
      console.warn(`   ⚠️  Slide image missing, inserting blank: ${imgPath}`);
      pres.addSlide(); // blank placeholder so slide numbering is preserved
      continue;
    }
    const slide = pres.addSlide();
    slide.addImage({
      path: path.resolve(imgPath),
      x: 0, y: 0, w: 10, h: 5.625,
      sizing: { type: "cover", w: 10, h: 5.625 },
    });
    added++;
  }

  await pres.writeFile({ fileName: outputPath });
  return added;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { config: configPath, output: outputFile, slidesDir } = parseArgs();

  // Load config
  if (!fs.existsSync(configPath)) {
    console.error(`❌  Config file not found: ${configPath}`);
    console.error("    Run with: node generate.js --config your-slides.json");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  const {
    title = "Presentation",
    author = "Nano Banana Pro × Claude",
    throttle_ms = 2500,
    variables = {},        // global placeholder values
    slides = [],
  } = config;

  const totalSlides = slides.length;

  console.log(`\n🍌  Nano Banana Pro × PPTX Generator`);
  console.log(`🤖  Model  : ${MODEL}`);
  console.log(`📋  Title  : ${title}`);
  console.log(`📑  Slides : ${totalSlides}`);
  console.log(`📁  Output : ${outputFile}\n`);

  fs.mkdirSync(slidesDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputFile) || ".", { recursive: true });

  const imagePaths = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideNum = i + 1;

    // Merge global vars + slide-level vars + auto tokens
    const slideVars = {
      PAGE: String(slideNum),
      TOTAL: String(totalSlides),
      ...variables,
      ...(slide.variables || {}),
    };

    // Fill placeholders in the prompt
    const rawPrompt = slide.prompt || "";
    const filledPrompt = fillPlaceholders(rawPrompt, slideVars);

    // Warn about unfilled placeholders
    const unfilled = [...filledPrompt.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]);
    if (unfilled.length > 0) {
      console.warn(`   ⚠️  Slide ${slideNum} has unfilled placeholders: ${unfilled.join(", ")}`);
    }

    process.stdout.write(`🎨  Slide ${slideNum}/${totalSlides} — ${slide.name || ""}... `);

    // Style consistency: pass slide 1 as reference for all subsequent slides
    const referenceImagePath =
      i > 0 && imagePaths[0] ? imagePaths[0] : (slide.reference_image || null);

    try {
      const imgPath = await generateWithRetry({
        prompt: filledPrompt,
        referenceImagePath,
        slideIndex: slideNum,
        slidesDir,
      });
      imagePaths.push(imgPath);
      console.log(`✅  ${path.basename(imgPath)}`);
    } catch (err) {
      console.error(`\n❌  Slide ${slideNum} failed after retries: ${err.message}`);
      imagePaths.push(null); // preserve slide position
    }

    if (i < slides.length - 1) {
      await sleep(throttle_ms);
    }
  }

  const successCount = imagePaths.filter(Boolean).length;
  console.log(`\n📦  Assembling PPTX (${successCount}/${totalSlides} slides)...`);

  const addedCount = await assemblePptx({
    imagePaths,
    outputPath: outputFile,
    title,
    author,
  });

  console.log(`\n✨  Done!`);
  console.log(`📊  PPTX  : ${outputFile}  (${addedCount} slides)`);
  console.log(`🖼️   Images: ${slidesDir}/`);
  if (totalSlides - successCount > 0) {
    console.log(`⚠️   ${totalSlides - successCount} slide(s) failed — replace images manually then re-run assembly.`);
  }
  console.log();
}

main().catch((err) => {
  console.error("\n💥  Fatal error:", err.message);
  process.exit(1);
});
