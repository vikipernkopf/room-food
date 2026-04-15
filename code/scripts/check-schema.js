const Database = require('better-sqlite3');
const db = new Database('room-food.db');

const tables = ['Recipe', 'RecipeMealType', 'MealRecipe'];

tables.forEach(t => {
  const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t}'`).get();
  console.log(`\n=== ${t} Table ===`);
  if (schema?.sql) {
    console.log(schema.sql);
  } else {
    console.log('Table not found');
  }
});

// Also check table info
console.log('\n\n=== Recipe Table Columns ===');
const recipeColumns = db.prepare(`PRAGMA table_info(Recipe)`).all();
recipeColumns.forEach(col => {
  console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
});

console.log('\n=== RecipeMealType Table Columns ===');
const rmtColumns = db.prepare(`PRAGMA table_info(RecipeMealType)`).all();
rmtColumns.forEach(col => {
  console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
});

console.log('\n=== MealRecipe Table Columns ===');
const mrColumns = db.prepare(`PRAGMA table_info(MealRecipe)`).all();
mrColumns.forEach(col => {
  console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
});

db.close();

