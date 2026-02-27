/**
 * Post-process the built index.csr.html to create two deployment-ready index files:
 * - index.room-food.html: base href set to /room-food/ (for subdirectory deployment)
 * - index.html: base href set to / and asset links adjusted to be relative (for root deployment)
 */

const fs = require('fs');
const path = require('path');

// Paths
const distDir = path.join(__dirname, '../dist/roomFood/browser');
const inputFile = path.join(distDir, 'index.csr.html');
const outputRoomFood = path.join(distDir, 'index.room-food.html');
const outputRoot = path.join(distDir, 'index.html');

console.log('='.repeat(60));
console.log('Post-processing index.csr.html');
console.log('='.repeat(60));

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: ${inputFile} not found!`);
  console.error('Make sure the build completed successfully.');
  process.exit(1);
}

// Read the original file
let content = fs.readFileSync(inputFile, 'utf8');
console.log(`✓ Read ${inputFile}`);

// Create index.room-food.html with base href /room-food/
let roomFoodContent = content;
// Ensure base href is set to /room-food/
if (roomFoodContent.includes('<base href=')) {
  roomFoodContent = roomFoodContent.replace(
    /<base href="[^"]*">/,
    '<base href="/room-food/">'
  );
} else {
  // Add base href if it doesn't exist
  roomFoodContent = roomFoodContent.replace(
    '<head>',
    '<head>\n  <base href="/room-food/">'
  );
}
fs.writeFileSync(outputRoomFood, roomFoodContent, 'utf8');
console.log(`✓ Created ${outputRoomFood} (base href: /room-food/)`);

// Create index.html with base href / and relative asset paths
let rootContent = content;
// Set base href to /
if (rootContent.includes('<base href=')) {
  rootContent = rootContent.replace(/<base href="[^"]*">/g, '<base href="/">');
} else {
  rootContent = rootContent.replace('<head>', '<head>\n  <base href="/">');
}

// Make asset links relative by removing leading /room-food/ first
rootContent = rootContent.replace(/href="\/room-food\//g, 'href="');
rootContent = rootContent.replace(/src="\/room-food\//g, 'src="');

// Then handle other absolute paths (except for external URLs starting with //)
// Convert /favicon.ico to favicon.ico, etc.
rootContent = rootContent.replace(/(\s)(href|src)="\/([^\/"])/g, '$1$2="$3');

fs.writeFileSync(outputRoot, rootContent, 'utf8');
console.log(`✓ Created ${outputRoot} (base href: /, relative paths)`);

console.log('='.repeat(60));
console.log('✅ Post-processing complete!');
console.log('');
console.log('Generated files:');
console.log(`  - ${outputRoomFood} → for /room-food/ subdirectory deployment`);
console.log(`  - ${outputRoot} → for root deployment with relative paths`);
console.log('='.repeat(60));


