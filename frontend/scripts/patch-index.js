// Patches the api-base-url meta tag in the built index.html
// with the API_BASE_URL environment variable set on Render.
// Falls back to localhost if not set (local builds).
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/frontend/browser/index.html');
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000';

if (!fs.existsSync(indexPath)) {
  console.warn('patch-index.js: dist/frontend/browser/index.html not found, skipping.');
  process.exit(0);
}

let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(
  /(<meta name="api-base-url" content=")[^"]*(")/,
  `$1${apiBaseUrl}$2`
);
fs.writeFileSync(indexPath, html);
console.log(`patch-index.js: set api-base-url to ${apiBaseUrl}`);
