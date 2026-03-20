#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeTextBlocks(slide) {
  const blocks = [];

  if (slide.title) {
    blocks.push({
      type: 'text',
      role: 'title',
      text: slide.title,
      x: 96,
      y: 76,
      w: 700,
      h: 96,
      style: {
        fontFamily: 'Noto Sans SC',
        fontSize: 40,
        fontWeight: 700,
        color: '#1F1A1C',
        align: 'left',
        lineHeight: 1.15
      }
    });
  }

  const content = toArray(slide.content);
  content.forEach((item, index) => {
    const text = typeof item === 'string' ? item : item.content;
    if (!text) return;

    blocks.push({
      type: 'text',
      role: 'body',
      text,
      x: 96,
      y: 190 + (index * 72),
      w: 620,
      h: 56,
      style: {
        fontFamily: 'Noto Sans SC',
        fontSize: 24,
        fontWeight: 400,
        color: '#4B3A40',
        align: 'left',
        lineHeight: 1.4
      }
    });
  });

  return blocks;
}

function normalizeImageBlocks(slide) {
  return toArray(slide.images).map((image, index) => ({
    type: 'image',
    role: 'image',
    src: image.path || image.src,
    x: 760,
    y: 120 + (index * 20),
    w: 420,
    h: 420,
    fit: 'contain',
    radius: 20
  })).filter((item) => item.src);
}

function normalizeSlide(slide, index) {
  const elements = slide.elements && slide.elements.length
    ? slide.elements
    : [...normalizeTextBlocks(slide), ...normalizeImageBlocks(slide)];

  return {
    id: slide.id || `slide-${String(index + 1).padStart(2, '0')}`,
    name: slide.name || slide.title || `Slide ${index + 1}`,
    notes: slide.notes || '',
    background: slide.background || { color: '#FCF8F5' },
    elements
  };
}

function buildDeck(source) {
  const slides = Array.isArray(source) ? source : source.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('Input must contain a non-empty slides array.');
  }

  const meta = source.meta || {};

  return {
    meta: {
      title: meta.title || 'Untitled Deck',
      subtitle: meta.subtitle || '',
      author: meta.author || '',
      canvas: meta.canvas || { width: 1280, height: 720 },
      outputs: meta.outputs || ['html'],
      theme: {
        bg: '#FCF8F5',
        text: '#1F1A1C',
        accent: '#C62E5C',
        fontDisplay: 'Noto Sans SC',
        fontBody: 'Noto Sans SC',
        ...(meta.theme || {})
      }
    },
    slides: slides.map(normalizeSlide)
  };
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error('Usage: node scripts/build-deck.js <input.json> <output-deck.json>');
    process.exit(1);
  }

  const source = readJson(inputPath);
  const deck = buildDeck(source);
  writeJson(outputPath, deck);
  console.log(`Wrote normalized deck to ${outputPath}`);
}

main();
