# Frontend Slides

A Claude Code skill for creating stunning, animation-rich presentations from a shared deck model, then exporting them to HTML first and later to PDF/PPTX.

## What This Does

**Frontend Slides** helps non-designers create beautiful presentations without knowing CSS or JavaScript. It uses a "show, don't tell" approach: instead of asking you to describe your aesthetic preferences in words, it generates visual previews and lets you pick what you like.

Here is a deck about the skill, made through the skill:

https://github.com/user-attachments/assets/ef57333e-f879-432a-afb9-180388982478


### Key Features

- **Canonical Deck Model** — Build `deck.json` once, then render multiple outputs from the same source.
- **HTML First** — Single HTML files with inline CSS/JS remain the primary output.
- **Visual Style Discovery** — Can't articulate design preferences? No problem. Pick from generated visual previews.
- **PPT Conversion** — Convert existing PowerPoint files to web, preserving all images and content.
- **Print-Safe HTML** — HTML exporter includes print CSS so PDF export does not depend on viewport capture.
- **Anti-AI-Slop** — Curated distinctive styles that avoid generic AI aesthetics (bye-bye, purple gradients on white).
- **Production Quality** — Accessible, responsive, well-commented code you can customize.

## Installation

### For Claude Code Users

Copy the skill files to your Claude Code skills directory:

```bash
# Create the skill directory
mkdir -p ~/.claude/skills/frontend-slides/scripts

# Copy all files (or clone this repo directly)
cp SKILL.md STYLE_PRESETS.md viewport-base.css html-template.md animation-patterns.md ~/.claude/skills/frontend-slides/
cp scripts/extract-pptx.py ~/.claude/skills/frontend-slides/scripts/
```

Or clone directly:

```bash
git clone https://github.com/zarazhangrui/frontend-slides.git ~/.claude/skills/frontend-slides
```

Then use it by typing `/frontend-slides` in Claude Code.

## Usage

### Create a New Presentation

```
/frontend-slides

> "I want to create a pitch deck for my AI startup"
```

The skill will:
1. Ask about your content (slides, messages, images)
2. Ask about the feeling you want (impressed? excited? calm?)
3. Generate 3 visual style previews for you to compare
4. Create the full presentation in your chosen style
5. Open it in your browser

### Convert a PowerPoint

```
/frontend-slides

> "Convert my presentation.pptx to a web slideshow"
```

The skill will:
1. Extract all text, images, and notes from your PPT
2. Show you the extracted content for confirmation
3. Let you pick a visual style
4. Generate an HTML presentation with all your original assets

## Included Styles

### Dark Themes
- **Bold Signal** — Confident, high-impact, vibrant card on dark
- **Electric Studio** — Clean, professional, split-panel
- **Creative Voltage** — Energetic, retro-modern, electric blue + neon
- **Dark Botanical** — Elegant, sophisticated, warm accents

### Light Themes
- **Notebook Tabs** — Editorial, organized, paper with colorful tabs
- **Pastel Geometry** — Friendly, approachable, vertical pills
- **Split Pastel** — Playful, modern, two-color vertical split
- **Vintage Editorial** — Witty, personality-driven, geometric shapes

### Specialty
- **Neon Cyber** — Futuristic, particle backgrounds, neon glow
- **Terminal Green** — Developer-focused, hacker aesthetic
- **Swiss Modern** — Minimal, Bauhaus-inspired, geometric
- **Paper & Ink** — Literary, drop caps, pull quotes

## Architecture

This skill now uses two layers:

1. **Deck model** — a canonical `deck.json` with slides, elements, layout, and theme
2. **Exporters** — HTML now, PDF/PPTX next

This skill still uses **progressive disclosure** — the main `SKILL.md` is a concise map, with supporting files loaded on-demand only when needed:

| File | Purpose | Loaded When |
|------|---------|-------------|
| `SKILL.md` | Core workflow and rules | Always (skill invocation) |
| `references/deck-schema.md` | Canonical multi-format slide structure | Phase 3 |
| `STYLE_PRESETS.md` | 12 curated visual presets | Phase 2 (style selection) |
| `viewport-base.css` | Mandatory responsive CSS | Phase 3 (generation) |
| `html-template.md` | HTML structure and JS features | Phase 3 (generation) |
| `animation-patterns.md` | CSS/JS animation reference | Phase 3 (generation) |
| `scripts/build-deck.js` | Normalize source slides into `deck.json` | Phase 3 / Phase 4 |
| `scripts/export-html.js` | Render HTML from `deck.json` | Phase 3 / Phase 5 |
| `scripts/export-pdf.js` | Export PDF from print-safe HTML via headless Chrome | Phase 5 |
| `scripts/export-pptx.js` | Export editable PPTX from `deck.json` | Phase 5 |
| `scripts/extract-pptx.py` | PPT content extraction | Phase 4 (conversion) |

This design follows [OpenAI's harness engineering](https://openai.com/index/harness-engineering/) principle: "give the agent a map, not a 1,000-page instruction manual."

## Current Multi-Format Strategy

### Stage 1

- Generate `deck.json`
- Export HTML from `deck.json`
- Make exported HTML print-safe for PDF

### Stage 2

- Add a dedicated PDF exporter, ideally Chromium/Playwright based

Current script:

```bash
node scripts/export-pdf.js presentation.html presentation.pdf
```

This exporter:

- starts a temporary local static server beside the HTML file
- loads the deck through local HTTP so relative assets resolve correctly
- uses headless Chrome print mode instead of viewport capture
- preserves one slide per PDF page when the HTML includes print CSS

### Stage 3

- Add a PPTX exporter that maps deck elements to editable text boxes, images, lines, and shapes

Current script:

```bash
node scripts/export-pptx.js presentation/deck.json presentation/deck.pptx
```

Current editable coverage:

- text boxes
- images
- basic rectangles
- rounded rectangles
- ellipses
- lines

## Why Browser PDF Export Often Fails For Slide HTML

Screen-first slide HTML usually relies on:

- `height: 100vh`
- `overflow: hidden`
- `scroll-snap-type`
- fixed nav or progress overlays

That works well on screen, but many browser and app exporters treat the page as a live viewport instead of a paginated document. The result is often:

- only the current slide is captured
- slide breaks are ignored
- fixed UI repeats on every page

The fix is not "click export differently." The fix is to render a print-safe variant:

- disable scroll-snap in print
- hide fixed UI in print
- force each slide to `break-after: page`
- use explicit print page dimensions for 16:9 slides

## Philosophy

This skill was born from the belief that:

1. **You don't need to be a designer to make beautiful things.** You just need to react to what you see.

2. **Dependencies are debt.** A single HTML file will work in 10 years. A React project from 2019? Good luck.

3. **Generic is forgettable.** Every presentation should feel custom-crafted, not template-generated.

4. **Comments are kindness.** Code should explain itself to future-you (or anyone else who opens it).

## Requirements

- [Claude Code](https://claude.ai/claude-code) CLI
- For PPT conversion: Python with `python-pptx` library

## Credits

Created by [@zarazhangrui](https://github.com/zarazhangrui) with Claude Code.

Inspired by the "Vibe Coding" philosophy — building beautiful things without being a traditional software engineer.

## License

MIT — Use it, modify it, share it.
