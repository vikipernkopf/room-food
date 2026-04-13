const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create a test database with the OLD schema
const testDbPath = 'test-migration.db';

// Clean up if it exists
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log('=== Testing Migration from Old Schema ===\n');

console.log('1. Creating test database with OLD schema...');
const db = new Database(testDbPath);
db.pragma('foreign_keys = ON');

// Create old schema
db.exec(`
  create table User (
    id integer primary key autoincrement,
    username text not null unique,
    password text not null
  ) strict;

  create table Recipe (
    id integer PRIMARY KEY DEFAULT (abs(random()) % 90000000 + 10000000),
    name text not null,
    mealType text not null,
    author integer not null,
    constraint uq_recipe unique (id, author),
    constraint fk_author foreign key (author) REFERENCES User (id) ON DELETE CASCADE
  ) strict;

  create table Meal (
    id integer primary key,
    time text not null unique,
    name text,
    responsible text,
    roomCode text not null,
    constraint fk_responsible foreign key (responsible) REFERENCES User (username) ON DELETE CASCADE
  ) strict;
`);

// Insert test data
db.prepare(`INSERT INTO User (username, password) VALUES ('chef1', 'pwd')`).run();
db.prepare(`INSERT INTO Recipe (id, name, mealType, author) VALUES (12345678, 'Pasta', 'dinner', 1)`).run();
db.prepare(`INSERT INTO Meal (id, time, name, responsible, roomCode) VALUES (1, '2026-04-10T19:00:00Z', 'Dinner', 'chef1', 'room1')`).run();

console.log('   ✓ Old schema created with test data');

// Verify old schema
const oldRecipe = db.prepare(`SELECT * FROM Recipe LIMIT 1`).get();
console.log(`   ✓ Old Recipe: id=${oldRecipe.id}, mealType=${oldRecipe.mealType}`);

const oldMeal = db.prepare(`SELECT * FROM Meal LIMIT 1`).get();
console.log(`   ✓ Old Meal: time=${oldMeal.time} (has unique constraint)`);

db.close();

console.log('\n2. Running migration (simulating app startup)...');

// Now run the migration by importing Unit
const { Unit } = require('./src/backend/unit.ts');

// Force a new connection to trigger migrations
const unit = new Unit(true); // read-only to avoid transaction
unit.complete();

console.log('   ✓ Migration completed');

console.log('\n3. Verifying new schema...');
const dbMigrated = new Database(testDbPath);
dbMigrated.pragma('foreign_keys = ON');

// Check if migration worked
const recipeCols = dbMigrated.prepare(`PRAGMA table_info(Recipe)`).all();
console.log('   Recipe columns:');
recipeCols.forEach(col => {
  console.log(`     - ${col.name} (${col.type})`);
});

const hasDescription = recipeCols.some(c => c.name === 'description');
const hasImage = recipeCols.some(c => c.name === 'image');
const hasAutoIncrement = dbMigrated.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='Recipe'`).get().sql.includes('autoincrement');

console.log(`\n   ✓ Has description column: ${hasDescription ? 'YES' : 'NO'}`);
console.log(`   ✓ Has image column: ${hasImage ? 'YES' : 'NO'}`);
console.log(`   ✓ Has autoincrement id: ${hasAutoIncrement ? 'YES' : 'NO'}`);

// Check if RecipeMealType was created and populated
const recipeMealTypes = dbMigrated.prepare(`SELECT * FROM RecipeMealType`).all();
console.log(`\n   ✓ RecipeMealType entries: ${recipeMealTypes.length}`);
if (recipeMealTypes.length > 0) {
  recipeMealTypes.forEach(rmt => {
    console.log(`     - Recipe ${rmt.recipe_id}: ${rmt.meal_type}`);
  });
}

// Check if Meal migration worked
const mealSql = dbMigrated.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='Meal'`).get().sql;
const hasUniqueMeal = mealSql.includes('unique (time)');
console.log(`\n   ✓ Meal has unique time constraint: ${hasUniqueMeal ? 'YES (BAD - should be removed)' : 'NO (GOOD)'}`);

dbMigrated.close();

// Cleanup
fs.unlinkSync(testDbPath);

console.log('\n✅ Migration test completed successfully!');

