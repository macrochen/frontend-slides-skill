#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
];

function findChromeBinary() {
  return CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

function createStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const normalizedRoot = path.resolve(rootDir);

    const server = http.createServer((req, res) => {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const safePath = requestPath === '/' ? '/index.html' : requestPath;
      const normalizedRequest = path.normalize(safePath).replace(/^(\.\.[/\\])+/, '');
      const filePath = path.resolve(path.join(normalizedRoot, `.${normalizedRequest}`));

      if (!filePath.startsWith(normalizedRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        res.writeHead(200, {
          'Content-Type': getMimeType(filePath),
          'Cache-Control': 'no-cache'
        });
        res.end(content);
      });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Chrome PDF export failed with exit code ${code}`));
    });
  });
}

async function main() {
  const inputHtmlPath = process.argv[2];
  const outputPdfPath = process.argv[3];

  if (!inputHtmlPath || !outputPdfPath) {
    console.error('Usage: node scripts/export-pdf.js <presentation.html> <output.pdf>');
    process.exit(1);
  }

  const chromeBinary = findChromeBinary();
  if (!chromeBinary) {
    console.error('Could not find Google Chrome or Chromium in /Applications.');
    process.exit(1);
  }

  const htmlPath = path.resolve(inputHtmlPath);
  const pdfPath = path.resolve(outputPdfPath);

  if (!fs.existsSync(htmlPath)) {
    console.error(`Input HTML not found: ${htmlPath}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

  const rootDir = path.dirname(htmlPath);
  const htmlFileName = path.basename(htmlPath);
  let staticServer;

  try {
    staticServer = await createStaticServer(rootDir);
    const url = `http://127.0.0.1:${staticServer.port}/${encodeURIComponent(htmlFileName)}`;

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--allow-file-access-from-files',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=3000',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${pdfPath}`,
      url
    ];

    const chrome = spawn(chromeBinary, args, { stdio: 'inherit' });
    await waitForExit(chrome);
    console.log(`Wrote PDF presentation to ${pdfPath}`);
  } finally {
    if (staticServer && staticServer.server) {
      staticServer.server.close();
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
