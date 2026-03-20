# Deck Schema

Use `deck.json` as the single source of truth for every presentation.

The goal is simple:

- The agent reasons about slides once
- `HTML`, `PDF`, and `PPTX` exporters read the same structure
- `PPTX` keeps text, images, and shapes editable because elements stay semantic

## Principles

1. Keep layout semantic, not CSS-dependent
2. Store every element explicitly
3. Use a fixed slide canvas for cross-format rendering
4. Treat animation as optional metadata, not layout data
5. Keep fields stable so scripts can transform the same deck repeatedly

## Required Top-Level Shape

```json
{
  "meta": {
    "title": "Deck title",
    "subtitle": "Optional subtitle",
    "author": "Optional author",
    "canvas": {
      "width": 1280,
      "height": 720
    },
    "outputs": ["html"],
    "theme": {
      "bg": "#FCF8F5",
      "text": "#1F1A1C",
      "accent": "#C62E5C",
      "fontDisplay": "Noto Sans SC",
      "fontBody": "Noto Sans SC"
    }
  },
  "slides": [
    {
      "id": "slide-01",
      "name": "Cover",
      "notes": "Optional speaker notes",
      "background": {
        "color": "#FCF8F5",
        "image": "cover.png",
        "fit": "cover"
      },
      "elements": []
    }
  ]
}
```

## Coordinate System

Use canvas pixels relative to `meta.canvas`.

- `x`, `y`, `w`, `h` are required for positioned elements
- Default canvas is `1280 x 720`
- Exporters should scale proportionally for screen, PDF, and PPTX

## Supported Element Types

### 1. Text

```json
{
  "id": "title",
  "type": "text",
  "x": 96,
  "y": 88,
  "w": 640,
  "h": 120,
  "text": "Presentation Title",
  "style": {
    "fontFamily": "Noto Sans SC",
    "fontSize": 44,
    "fontWeight": 700,
    "lineHeight": 1.2,
    "color": "#1F1A1C",
    "align": "left",
    "verticalAlign": "middle",
    "letterSpacing": 0
  },
  "animation": {
    "preset": "fade-up",
    "delayMs": 120
  }
}
```

### 2. Image

```json
{
  "id": "hero-image",
  "type": "image",
  "x": 760,
  "y": 120,
  "w": 420,
  "h": 420,
  "src": "assets/hero.png",
  "fit": "cover",
  "radius": 24
}
```

### 3. Shape

```json
{
  "id": "accent-block",
  "type": "shape",
  "shape": "rect",
  "x": 88,
  "y": 612,
  "w": 160,
  "h": 12,
  "style": {
    "fill": "#C62E5C",
    "stroke": "#C62E5C",
    "strokeWidth": 0,
    "radius": 999
  }
}
```

### 4. Line

```json
{
  "id": "divider",
  "type": "line",
  "x": 88,
  "y": 160,
  "w": 1104,
  "h": 0,
  "style": {
    "stroke": "#E8D9D8",
    "strokeWidth": 2
  }
}
```

### 5. Group

```json
{
  "id": "metric-group",
  "type": "group",
  "x": 88,
  "y": 250,
  "w": 520,
  "h": 240,
  "children": []
}
```

## Export Rules

### HTML

- Can use animation metadata
- Can use gradients and richer backgrounds
- May render groups as nested `div`s

### PDF

- Render from a print-safe HTML variant
- Every slide must map to exactly one PDF page
- Hide fixed UI like progress bars and nav dots in print mode

### PPTX

- Prefer editable primitives: text boxes, images, rectangles, lines
- Do not rely on CSS-only effects for meaning
- If an HTML effect cannot map cleanly, degrade gracefully to static content
- Exporters should map semantic deck elements directly instead of rasterizing whole slides

## PPTX-Safe Design Limits

These are the safest elements to promise as editable:

- Text boxes
- Images
- Solid and rounded rectangles
- Simple circles
- Lines
- Simple tables
- Flat fills and simple gradients

Avoid making these required for semantic meaning:

- Backdrop blur
- Blend modes
- Arbitrary CSS grid auto-placement
- Complex masks or clip paths
- Scroll-triggered motion
- Layer effects that only exist in CSS

## Validation Checklist

- Every slide has an `id`
- Every element has a `type`
- Positioned elements have `x`, `y`, `w`, `h`
- Text elements define `text`
- Image elements define `src`
- Theme colors exist for background, text, accent
- Slide count matches the requested outline
