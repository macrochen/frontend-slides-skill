#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readViewportCss(baseDir) {
  const cssPath = path.join(baseDir, '..', 'viewport-base.css');
  return fs.readFileSync(cssPath, 'utf8');
}

function fileStem(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function renderElement(element) {
  const style = element.style || {};
  const box = [
    `left:${element.x || 0}px`,
    `top:${element.y || 0}px`,
    `width:${element.w || 0}px`,
    `height:${element.h || 0}px`
  ].join(';');

  if (element.type === 'text') {
    const textStyles = [
      box,
      `font-family:${style.fontFamily || 'sans-serif'}`,
      `font-size:${style.fontSize || 24}px`,
      `font-weight:${style.fontWeight || 400}`,
      `color:${style.color || '#1F1A1C'}`,
      `line-height:${style.lineHeight || 1.3}`,
      `text-align:${style.align || 'left'}`
    ].join(';');

    return `<div class="element text-element reveal" style="${textStyles}">${escapeHtml(element.text || '')}</div>`;
  }

  if (element.type === 'image') {
    const fit = element.fit || 'contain';
    const radius = element.radius || 0;
    return `<img class="element image-element reveal" style="${box};object-fit:${fit};border-radius:${radius}px" src="${escapeHtml(element.src || '')}" alt="">`;
  }

  if (element.type === 'shape') {
    const shapeStyles = [
      box,
      `background:${style.fill || 'transparent'}`,
      `border:${style.strokeWidth || 0}px solid ${style.stroke || 'transparent'}`,
      `border-radius:${style.radius || 0}px`
    ].join(';');
    return `<div class="element shape-element reveal" style="${shapeStyles}"></div>`;
  }

  if (element.type === 'line') {
    const lineStyles = [
      `left:${element.x || 0}px`,
      `top:${element.y || 0}px`,
      `width:${element.w || 0}px`,
      `height:${style.strokeWidth || 2}px`,
      `background:${style.stroke || '#E8D9D8'}`
    ].join(';');
    return `<div class="element line-element reveal" style="${lineStyles}"></div>`;
  }

  return '';
}

function renderSlide(slide, canvas) {
  const background = slide.background || {};
  const backgroundStyle = [
    background.color ? `background-color:${background.color}` : '',
    background.image ? `background-image:url('${background.image}')` : '',
    background.image ? `background-size:${background.fit === 'contain' ? 'contain' : 'cover'}` : '',
    background.image ? 'background-position:center' : '',
    background.image ? 'background-repeat:no-repeat' : ''
  ].filter(Boolean).join(';');

  return `
    <section class="slide" data-slide-id="${escapeHtml(slide.id)}">
      <div class="print-slide" style="width:${canvas.width}px;height:${canvas.height}px;${backgroundStyle}">
        ${slide.elements.map(renderElement).join('\n')}
      </div>
      ${slide.notes ? `<!-- NOTES: ${escapeHtml(slide.notes)} -->` : ''}
    </section>
  `;
}

function renderExportPanel(config) {
  const links = [];

  links.push('<button class="export-button primary" type="button" id="downloadHtml">Download HTML</button>');

  if (config.outputs.includes('pdf')) {
    links.push('<button class="export-button" type="button" id="printPdf">Print / Export PDF</button>');
    links.push(`<a class="export-button" href="./${escapeHtml(config.baseName)}.pdf" download>Download PDF</a>`);
  }

  links.push(`<a class="export-button" href="./${escapeHtml(config.deckFileName)}" download>Download deck.json</a>`);

  if (config.outputs.includes('pptx')) {
    links.push(`<a class="export-button" href="./${escapeHtml(config.baseName)}.pptx" download>Download PPTX</a>`);
  }

  return `
  <aside class="presentation-export" id="presentationExport" aria-label="Export panel">
    <button class="export-fab" type="button" id="exportFab" aria-expanded="false" aria-controls="exportPanel">Export</button>
    <div class="export-panel" id="exportPanel">
      <h3>Export</h3>
      <p>Low-visibility edge handle. Hover or tap only when you need downloads or print export.</p>
      <div class="export-actions">
        ${links.join('\n        ')}
      </div>
    </div>
  </aside>`;
}

function renderHtml(deck, viewportCss, exportConfig) {
  const canvas = deck.meta.canvas || { width: 1280, height: 720 };
  const theme = deck.meta.theme || {};

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(deck.meta.title || 'Deck')}</title>
  <style>
    :root {
      --bg-primary: ${theme.bg || '#FCF8F5'};
      --text-primary: ${theme.text || '#1F1A1C'};
      --accent: ${theme.accent || '#C62E5C'};
    }

${viewportCss}

    body {
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: ${JSON.stringify(theme.fontBody || 'sans-serif')};
    }

    .slide {
      display: grid;
      place-items: center;
      padding: clamp(0.5rem, 2vw, 1.5rem);
      background: radial-gradient(circle at top left, rgba(255,255,255,0.75), transparent 35%);
    }

    .print-slide {
      position: relative;
      width: min(100vw - 2rem, calc((100vh - 2rem) * ${canvas.width} / ${canvas.height}));
      height: auto;
      aspect-ratio: ${canvas.width} / ${canvas.height};
      overflow: hidden;
      border-radius: 24px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.12);
    }

    .element {
      position: absolute;
      box-sizing: border-box;
      white-space: pre-wrap;
    }

    .image-element {
      display: block;
    }

    .reveal {
      opacity: 1;
      transform: none;
      filter: none;
    }

    .presentation-export {
      position: fixed;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      z-index: 45;
      width: min(20rem, calc(100vw - 2rem));
      pointer-events: auto;
    }

    .presentation-export::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      width: 0.35rem;
      height: 4.6rem;
      transform: translateY(-50%);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(198, 46, 92, 0.06), rgba(198, 46, 92, 0.14), rgba(198, 46, 92, 0.06));
      opacity: 0.5;
    }

    .export-fab {
      position: absolute;
      top: 50%;
      right: calc(-1 * 2.1rem);
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 4rem;
      min-height: 1.65rem;
      padding: 0.18rem 0.55rem;
      border: 1px solid rgba(198, 46, 92, 0.07);
      border-radius: 0.5rem 0.5rem 0 0;
      background: rgba(255, 253, 252, 0.68);
      box-shadow: 0 0.3rem 0.9rem rgba(118, 70, 76, 0.07);
      color: rgba(142, 17, 55, 0.6);
      font-size: clamp(0.52rem, 0.7vw, 0.6rem);
      font-weight: 600;
      letter-spacing: 0.12em;
      cursor: pointer;
      backdrop-filter: blur(8px);
      opacity: 0.5;
      transition: opacity 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
    }

    .presentation-export:hover .export-fab,
    .presentation-export.open .export-fab {
      opacity: 0;
    }

    .export-panel {
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      padding: 0.9rem 1rem;
      border-radius: 1rem;
      border: 1px solid rgba(198, 46, 92, 0.12);
      background: rgba(255, 253, 252, 0.9);
      box-shadow: 0 1rem 3rem rgba(118, 70, 76, 0.11);
      backdrop-filter: blur(16px);
      opacity: 0;
      transform: translate(-86%, -50%);
      transform-origin: left center;
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.24s ease;
    }

    .presentation-export:hover .export-panel,
    .presentation-export.open .export-panel {
      opacity: 1;
      transform: translate(0, -50%);
      pointer-events: auto;
    }

    .export-panel h3 {
      margin: 0 0 0.35rem;
      font-size: clamp(0.95rem, 1.2vw, 1.08rem);
    }

    .export-panel p {
      margin: 0 0 0.7rem;
      color: rgba(31, 26, 28, 0.65);
      font-size: clamp(0.7rem, 0.95vw, 0.82rem);
      line-height: 1.45;
    }

    .export-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }

    .export-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.4rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.8rem;
      border: 1px solid rgba(198, 46, 92, 0.14);
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248, 237, 239, 0.9));
      color: rgba(142, 17, 55, 0.92);
      font-size: clamp(0.72rem, 0.95vw, 0.84rem);
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }

    .export-button.primary {
      color: #fff;
      border-color: transparent;
      background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, white));
    }

    .export-button:hover {
      filter: brightness(0.99);
    }

    @media (max-width: 900px) {
      .presentation-export {
        top: auto;
        bottom: 1rem;
        left: 0.5rem;
        transform: none;
      }

      .presentation-export::before {
        display: none;
      }

      .export-fab {
        top: auto;
        bottom: 0;
        right: auto;
        left: 0;
        transform: none;
        min-width: 4.8rem;
        min-height: 2rem;
        border-radius: 999px;
        opacity: 0.8;
      }

      .presentation-export:hover .export-fab,
      .presentation-export.open .export-fab {
        opacity: 0.8;
      }

      .export-panel {
        top: auto;
        bottom: 3rem;
        left: 0;
        transform: translateY(0.5rem);
      }

      .presentation-export:hover .export-panel,
      .presentation-export.open .export-panel {
        transform: translateY(0);
      }
    }

    @media print {
      @page {
        size: 13.333in 7.5in;
        margin: 0;
      }

      html, body {
        height: auto !important;
        overflow: visible !important;
        scroll-snap-type: none !important;
        background: white !important;
      }

      body {
        margin: 0;
      }

      .presentation-export {
        display: none !important;
      }

      .slide {
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        padding: 0 !important;
        break-after: page;
        page-break-after: always;
      }

      .slide:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      .print-slide {
        width: 13.333in !important;
        height: 7.5in !important;
        aspect-ratio: auto !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
${renderExportPanel(exportConfig)}
${deck.slides.map((slide) => renderSlide(slide, canvas)).join('\n')}
<script>
  (() => {
    const exportContainer = document.getElementById('presentationExport');
    const exportFab = document.getElementById('exportFab');
    const downloadHtmlButton = document.getElementById('downloadHtml');
    const printPdfButton = document.getElementById('printPdf');

    const closePanel = () => {
      if (!exportContainer || !exportFab) return;
      exportContainer.classList.remove('open');
      exportFab.setAttribute('aria-expanded', 'false');
    };

    const togglePanel = () => {
      if (!exportContainer || !exportFab) return;
      const willOpen = !exportContainer.classList.contains('open');
      exportContainer.classList.toggle('open', willOpen);
      exportFab.setAttribute('aria-expanded', String(willOpen));
    };

    if (exportFab) {
      exportFab.addEventListener('click', (event) => {
        event.stopPropagation();
        togglePanel();
      });
    }

    if (downloadHtmlButton) {
      downloadHtmlButton.addEventListener('click', () => {
        const html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = ${JSON.stringify(exportConfig.htmlFileName)};
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      });
    }

    if (printPdfButton) {
      printPdfButton.addEventListener('click', () => {
        window.print();
      });
    }

    document.addEventListener('click', (event) => {
      if (!exportContainer) return;
      if (!exportContainer.contains(event.target)) {
        closePanel();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    });
  })();
</script>
</body>
</html>
`;
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error('Usage: node scripts/export-html.js <deck.json> <output.html>');
    process.exit(1);
  }

  const deck = readJson(inputPath);
  const viewportCss = readViewportCss(__dirname);
  const baseName = fileStem(outputPath);
  const html = renderHtml(deck, viewportCss, {
    outputs: Array.isArray(deck.meta.outputs) ? deck.meta.outputs : ['html'],
    baseName,
    htmlFileName: path.basename(outputPath),
    deckFileName: path.basename(inputPath)
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`Wrote HTML presentation to ${outputPath}`);
}

main();
