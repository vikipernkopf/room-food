const Database = require('better-sqlite3');
const db = new Database('room-food.db');

console.log('=== All Tables in Database ===');
const allTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
allTables.forEach(t => {
  console.log(`  - ${t.name}`);
});

console.log('\n=== Recipe Table Details ===');
try {
  const recipeColumns = db.prepare(`PRAGMA table_info(Recipe)`).all();
  if (recipeColumns.length > 0) {
    console.log('Columns:');
    recipeColumns.forEach(col => {
      console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
    });
  } else {
    console.log('Table not found');
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}

console.log('\n=== RecipeMealType Table Details ===');
try {
  const rmtColumns = db.prepare(`PRAGMA table_info(RecipeMealType)`).all();
  if (rmtColumns.length > 0) {
    console.log('Columns:');
    rmtColumns.forEach(col => {
      console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
    });
  } else {
    console.log('Table not found');
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}

console.log('\n=== MealRecipe Table Details ===');
try {
  const mrColumns = db.prepare(`PRAGMA table_info(MealRecipe)`).all();
  if (mrColumns.length > 0) {
    console.log('Columns:');
    mrColumns.forEach(col => {
      console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
    });
  } else {
    console.log('Table not found');
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}

db.close();

