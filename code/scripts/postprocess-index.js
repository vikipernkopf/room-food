const fs = require('fs');
const path = require('path');

const src = process.argv[2] || path.join('dist', 'roomFood', 'browser', 'index.csr.html');
const outDir = process.argv[3] || path.dirname(src);

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

ensureDir(outDir);

if (!fs.existsSync(src)) {
  console.error(`Source file not found: ${src}`);
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');

const baseRegex = /<base\s+href="[^"]*"\s*\/?>/i;

// Variant for /room-food/ (keep asset paths as in the built file)
const roomFoodHtml = html.replace(baseRegex, '<base href="/room-food/">');

// Variant for root: set base to '/' and make local asset paths relative (prepend './' for non-absolute URLs)
let rootHtml = html.replace(baseRegex, '<base href="/">');
// Make href/src paths relative where they are not absolute or protocol-relative
rootHtml = rootHtml.replace(/(href=["'])(?!https?:|\/|\.\/)([^"'>]+)/g, (m, p1, p2) => `${p1}./${p2}`);
rootHtml = rootHtml.replace(/(src=["'])(?!https?:|\/|\.\/)([^"'>]+)/g, (m, p1, p2) => `${p1}./${p2}`);

// Prepare injection script: use env INJECT_API_URL if provided, otherwise default to hosted backend
const injectUrl = process.env.INJECT_API_URL || 'https://roomfood-backend.black2.cf/api';
const injectScript = `\n<script>window.__API_URL = '${injectUrl}';</script>\n`;

function injectIntoHead(content) {
  // Insert before closing </head>
  const closingHead = /<\/head>/i;
  if (closingHead.test(content)) {
    return content.replace(closingHead, `${injectScript}</head>`);
  }
  // Fallback: prepend to content
  return injectScript + content;
}

const roomFoodHtmlInjected = injectIntoHead(roomFoodHtml);
const rootHtmlInjected = injectIntoHead(rootHtml);

const outRoomPath = path.join(outDir, 'index.room-food.html');
const outRootPath = path.join(outDir, 'index.html');

fs.writeFileSync(outRoomPath, roomFoodHtmlInjected, 'utf8');
fs.writeFileSync(outRootPath, rootHtmlInjected, 'utf8');

console.log('Wrote:', outRoomPath);
console.log('Wrote:', outRootPath);
