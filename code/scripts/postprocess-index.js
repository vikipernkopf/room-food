const fs = require('node:fs');
const path = require('node:path');

const browserDir = path.resolve(__dirname, '..', 'dist', 'roomFood', 'browser');
const csrIndexPath = path.join(browserDir, 'index.csr.html');
const indexPath = path.join(browserDir, 'index.html');

if (!fs.existsSync(csrIndexPath)) {
	console.error(`Expected frontend entry file not found: ${csrIndexPath}`);
	process.exit(1);
}

fs.copyFileSync(csrIndexPath, indexPath);
console.log(`Created static entry file: ${indexPath}`);
