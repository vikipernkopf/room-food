const Database = require("better-sqlite3");

// Test the recipe insertion directly via the database
const db = new Database("room-food.db");

console.log("=== Testing Recipe Insertion ===\n");

// Get the testuser123 that we created via API
console.log("1. Getting test user created via API...");
let userId;
try {
	const user = db.prepare(`SELECT id
	                         FROM User
	                         WHERE username = 'testuser123'`).get();
	if (user) {
		userId = user.id;
		console.log(`   ✓ Test user found with ID: ${userId}`);
	} else {
		console.error("   ✗ Test user not found! Please run signup API first.");
		process.exit(1);
	}
} catch (e) {
	console.error("   ✗ Error:", e.message);
	process.exit(1);
}

// Now test inserting a recipe with the new schema
console.log("\n2. Creating recipe with description and image...");
try {
	const stmt = db.prepare(`
		INSERT INTO Recipe (name, description, image, author)
		VALUES (:name, :description, :image, :author)
	`);

	const result = stmt.run({
		name: "Spaghetti Carbonara",
		description: "Classic Italian pasta with eggs, cheese, and bacon",
		image: "https://example.com/carbonara.jpg",
		author: userId
	});

	const recipeId = db.prepare("SELECT last_insert_rowid() as id").get().id;
	console.log(`   ✓ Recipe created with ID: ${recipeId}`);

	// Insert meal types
	console.log("\n3. Adding meal types to recipe...");
	const mealTypes = ["dinner", "lunch"];
	mealTypes.forEach(type => {
		db.prepare(`
			INSERT INTO RecipeMealType (recipe_id, meal_type)
			VALUES (:rid, :mt)
		`).run({
			rid: recipeId,
			mt: type
		});
		console.log(`   ✓ Added meal type: ${type}`);
	});

	// Verify the recipe with all its data
	console.log("\n4. Verifying recipe data...");
	const recipe = db.prepare(`
		SELECT r.id, r.name, r.description, r.image, r.author
		FROM Recipe r
		WHERE r.id = :id
	`).get({ id: recipeId });

	console.log(`\n   Recipe Details:`);
	console.log(`   - ID: ${recipe.id}`);
	console.log(`   - Name: ${recipe.name}`);
	console.log(`   - Description: ${recipe.description}`);
	console.log(`   - Image: ${recipe.image}`);
	console.log(`   - Author (User ID): ${recipe.author}`);

	// Get username for reference
	const authorUser = db.prepare(`SELECT username
	                               FROM User
	                               WHERE id = :id`).get({ id: recipe.author });
	console.log(`   - Author (Username): ${authorUser.username}`);

	const types = db.prepare(`
		SELECT meal_type
		FROM RecipeMealType
		WHERE recipe_id = :id
	`).all({ id: recipeId });

	console.log(`   - Meal Types: ${types.map(t => t.meal_type).join(", ")}`);

	console.log("\n✅ All tests passed! Schema is working correctly.");

} catch (e) {
	console.error("❌ Error:", e.message);
}

db.close();

