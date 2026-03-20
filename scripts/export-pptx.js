#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

let PptxGenJS;
try {
  PptxGenJS = require('pptxgenjs');
} catch (error) {
  console.error('Missing dependency: pptxgenjs');
  console.error('Run `npm install` inside frontend-slides-skill before exporting PPTX.');
  process.exit(1);
}

const SLIDE_WIDTH_IN = 13.333;
const SLIDE_HEIGHT_IN = 7.5;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function colorValue(value, fallback = '000000') {
  if (!value) return fallback;
  return String(value).replace('#', '').toUpperCase();
}

function pxToInchesX(px, canvasWidth) {
  return (Number(px || 0) / canvasWidth) * SLIDE_WIDTH_IN;
}

function pxToInchesY(px, canvasHeight) {
  return (Number(px || 0) / canvasHeight) * SLIDE_HEIGHT_IN;
}

function resolveAsset(deckPath, assetPath) {
  if (!assetPath) return null;
  if (path.isAbsolute(assetPath)) return assetPath;
  return path.resolve(path.dirname(deckPath), assetPath);
}

function normalizeShapeName(shape) {
  switch (shape) {
    case 'roundRect':
    case 'roundedRect':
      return 'roundRect';
    case 'ellipse':
    case 'circle':
      return 'ellipse';
    default:
      return 'rect';
  }
}

function mapTextOptions(element, canvas) {
  const style = element.style || {};
  return {
    x: pxToInchesX(element.x, canvas.width),
    y: pxToInchesY(element.y, canvas.height),
    w: pxToInchesX(element.w, canvas.width),
    h: pxToInchesY(element.h, canvas.height),
    margin: 0,
    fontFace: style.fontFamily || 'Arial',
    fontSize: Math.max(8, Math.round((style.fontSize || 20) * 0.75)),
    bold: Number(style.fontWeight || 400) >= 600,
    color: colorValue(style.color, '1F1A1C'),
    align: style.align || 'left',
    valign: style.verticalAlign || 'mid',
    breakLine: false,
    fit: 'shrink'
  };
}

function mapImageOptions(element, canvas, deckPath) {
  return {
    path: resolveAsset(deckPath, element.src),
    x: pxToInchesX(element.x, canvas.width),
    y: pxToInchesY(element.y, canvas.height),
    w: pxToInchesX(element.w, canvas.width),
    h: pxToInchesY(element.h, canvas.height)
  };
}

function mapShapeOptions(element, canvas) {
  const style = element.style || {};
  return {
    x: pxToInchesX(element.x, canvas.width),
    y: pxToInchesY(element.y, canvas.height),
    w: pxToInchesX(element.w, canvas.width),
    h: pxToInchesY(element.h, canvas.height),
    rectRadius: style.radius ? Math.max(0, Math.min(0.2, style.radius / 100)) : undefined,
    fill: { color: colorValue(style.fill, 'FFFFFF'), transparency: style.fill ? 0 : 100 },
    line: {
      color: colorValue(style.stroke, style.fill || 'FFFFFF'),
      transparency: style.stroke || style.strokeWidth ? 0 : 100,
      width: style.strokeWidth ? Math.max(0.5, style.strokeWidth / 4) : 0.5
    }
  };
}

function mapLineOptions(element, canvas) {
  const style = element.style || {};
  return {
    x: pxToInchesX(element.x, canvas.width),
    y: pxToInchesY(element.y, canvas.height),
    w: pxToInchesX(element.w, canvas.width),
    h: pxToInchesY(element.h || 0, canvas.height),
    line: {
      color: colorValue(style.stroke, 'E8D9D8'),
      width: style.strokeWidth ? Math.max(0.5, style.strokeWidth / 4) : 1
    }
  };
}

function addElement(slide, element, canvas, deckPath) {
  if (!element || !element.type) return;

  if (element.type === 'text') {
    slide.addText(String(element.text || ''), mapTextOptions(element, canvas));
    return;
  }

  if (element.type === 'image' && element.src) {
    const options = mapImageOptions(element, canvas, deckPath);
    if (options.path && fs.existsSync(options.path)) {
      slide.addImage(options);
    }
    return;
  }

  if (element.type === 'shape') {
    slide.addShape(normalizeShapeName(element.shape), mapShapeOptions(element, canvas));
    return;
  }

  if (element.type === 'line') {
    slide.addShape('line', mapLineOptions(element, canvas));
    return;
  }

  if (element.type === 'group') {
    asArray(element.children).forEach((child) => addElement(slide, child, canvas, deckPath));
  }
}

function addBackground(slide, background, canvas, deckPath) {
  if (!background) return;

  if (background.color) {
    slide.background = { color: colorValue(background.color, 'FFFFFF') };
  }

  if (background.image) {
    const imagePath = resolveAsset(deckPath, background.image);
    if (imagePath && fs.existsSync(imagePath)) {
      slide.addImage({
        path: imagePath,
        x: 0,
        y: 0,
        w: SLIDE_WIDTH_IN,
        h: SLIDE_HEIGHT_IN
      });
    }
  }
}

async function exportPptx(deckPath, outputPath) {
  const deck = readJson(deckPath);
  const canvas = deck.meta.canvas || { width: 1280, height: 720 };
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = deck.meta.author || 'Codex';
  pptx.company = 'frontend-slides-skill';
  pptx.subject = deck.meta.subtitle || deck.meta.title || 'Presentation';
  pptx.title = deck.meta.title || 'Presentation';
  pptx.lang = 'zh-CN';
  pptx.theme = {
    headFontFace: deck.meta.theme?.fontDisplay || 'Arial',
    bodyFontFace: deck.meta.theme?.fontBody || 'Arial',
    lang: 'zh-CN'
  };

  deck.slides.forEach((slideModel) => {
    const slide = pptx.addSlide();
    addBackground(slide, slideModel.background, canvas, deckPath);
    asArray(slideModel.elements).forEach((element) => addElement(slide, element, canvas, deckPath));

    if (slideModel.notes && typeof slide.addNotes === 'function') {
      slide.addNotes(String(slideModel.notes));
    }
  });

  ensureDir(outputPath);
  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

async function main() {
  const inputDeckPath = process.argv[2];
  const outputPptxPath = process.argv[3];

  if (!inputDeckPath || !outputPptxPath) {
    console.error('Usage: node scripts/export-pptx.js <deck.json> <output.pptx>');
    process.exit(1);
  }

  const deckPath = path.resolve(inputDeckPath);
  const outputPath = path.resolve(outputPptxPath);

  if (!fs.existsSync(deckPath)) {
    console.error(`Input deck not found: ${deckPath}`);
    process.exit(1);
  }

  await exportPptx(deckPath, outputPath);
  console.log(`Wrote editable PPTX presentation to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
