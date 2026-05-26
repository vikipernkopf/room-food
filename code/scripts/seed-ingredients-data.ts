//@ts-ignore
import BetterSqlite3 from 'better-sqlite3';
import { join } from 'node:path';

/**
 * Seed sample ingredients and recipe-ingredient relationships into the database.
 * Run with: npm run ts-node scripts/seed-ingredients-data.ts [--db <path>]
 */

function seedData(dbPath: string): void {
	console.log(`📦 Seeding sample ingredients data into database: ${dbPath}`);

	const db = new BetterSqlite3(dbPath);

	try {
		db.pragma('foreign_keys = ON');

		// =========== INGREDIENTS ===========
		console.log('\n📝 Creating sample ingredients...');

		const ingredientData = [
			// Pasta ingredients
			{ name: 'Pasta', default_measurement: 'grams' },
			{ name: 'Tomato', default_measurement: 'units' },
			{ name: 'Garlic', default_measurement: 'cloves' },
			{ name: 'Olive Oil', default_measurement: 'ml' },
			{ name: 'Onion', default_measurement: 'units' },
			{ name: 'Ground Beef', default_measurement: 'grams' },
			{ name: 'Parmesan Cheese', default_measurement: 'grams' },

			// Breakfast ingredients
			{ name: 'Eggs', default_measurement: 'units' },
			{ name: 'Bread', default_measurement: 'slices' },
			{ name: 'Butter', default_measurement: 'grams' },
			{ name: 'Milk', default_measurement: 'ml' },
			{ name: 'Bacon', default_measurement: 'slices' },

			// Common ingredients
			{ name: 'Salt', default_measurement: 'teaspoons' },
			{ name: 'Black Pepper', default_measurement: 'teaspoons' },
			{ name: 'Sugar', default_measurement: 'grams' },
			{ name: 'Flour', default_measurement: 'grams' },
			{ name: 'Baking Powder', default_measurement: 'teaspoons' },

			// Chicken ingredients
			{ name: 'Chicken Breast', default_measurement: 'grams' },
			{ name: 'Rosemary', default_measurement: 'sprigs' },
			{ name: 'Lemon', default_measurement: 'units' },

			// Vegetable ingredients
			{ name: 'Bell Pepper', default_measurement: 'units' },
			{ name: 'Broccoli', default_measurement: 'grams' },
			{ name: 'Carrot', default_measurement: 'units' },
			{ name: 'Spinach', default_measurement: 'grams' },

			// Dairy
			{ name: 'Mozzarella Cheese', default_measurement: 'grams' },
			{ name: 'Sour Cream', default_measurement: 'ml' },
			{ name: 'Cream', default_measurement: 'ml' },

			// Spices
			{ name: 'Paprika', default_measurement: 'teaspoons' },
			{ name: 'Oregano', default_measurement: 'teaspoons' },
			{ name: 'Basil', default_measurement: 'teaspoons' },
		];

		const insertIngredient = db.prepare(`
			INSERT OR IGNORE INTO Ingredient (name, default_measurement)
			VALUES (?, ?)
		`);

		for (const ing of ingredientData) {
			const result = insertIngredient.run(ing.name, ing.default_measurement);
			if (result.changes > 0) {
				console.log(`  ✓ Created ingredient: ${ing.name}`);
			}
		}

		// =========== RECIPE INGREDIENTS ===========
		console.log('\n🍝 Linking ingredients to recipes...');

		// Get all recipes to link ingredients
		const recipes = db.prepare(`SELECT id, name FROM Recipe LIMIT 10`).all() as Array<{
			id: number;
			name: string
		}>;

		if (recipes.length === 0) {
			console.warn('⚠️  No recipes found in database. Please create some recipes first.');
		} else {
			type RecipeIngredientType = Array<{ ingredient: string; amount: string; measurement: string }>;
		const recipeIngredientsMap: Record<string, RecipeIngredientType> = {
				'Pasta Bolognese': [
					{ ingredient: 'Pasta', amount: '400', measurement: 'grams' },
					{ ingredient: 'Ground Beef', amount: '500', measurement: 'grams' },
					{ ingredient: 'Tomato', amount: '4', measurement: 'units' },
					{ ingredient: 'Onion', amount: '2', measurement: 'units' },
					{ ingredient: 'Garlic', amount: '4', measurement: 'cloves' },
					{ ingredient: 'Olive Oil', amount: '30', measurement: 'ml' },
					{ ingredient: 'Parmesan Cheese', amount: '100', measurement: 'grams' },
					{ ingredient: 'Salt', amount: '1', measurement: 'teaspoons' },
					{ ingredient: 'Black Pepper', amount: '0.5', measurement: 'teaspoons' },
				],
				'Scrambled Eggs': [
					{ ingredient: 'Eggs', amount: '3', measurement: 'units' },
					{ ingredient: 'Butter', amount: '20', measurement: 'grams' },
					{ ingredient: 'Milk', amount: '50', measurement: 'ml' },
					{ ingredient: 'Salt', amount: '0.5', measurement: 'teaspoons' },
					{ ingredient: 'Black Pepper', amount: '0.25', measurement: 'teaspoons' },
				],
				'Grilled Chicken': [
					{ ingredient: 'Chicken Breast', amount: '250', measurement: 'grams' },
					{ ingredient: 'Olive Oil', amount: '20', measurement: 'ml' },
					{ ingredient: 'Lemon', amount: '0.5', measurement: 'units' },
					{ ingredient: 'Rosemary', amount: '2', measurement: 'sprigs' },
					{ ingredient: 'Salt', amount: '1', measurement: 'teaspoons' },
					{ ingredient: 'Black Pepper', amount: '0.5', measurement: 'teaspoons' },
				],
				'Vegetable Stir Fry': [
					{ ingredient: 'Bell Pepper', amount: '2', measurement: 'units' },
					{ ingredient: 'Broccoli', amount: '300', measurement: 'grams' },
					{ ingredient: 'Carrot', amount: '2', measurement: 'units' },
					{ ingredient: 'Olive Oil', amount: '25', measurement: 'ml' },
					{ ingredient: 'Garlic', amount: '3', measurement: 'cloves' },
					{ ingredient: 'Salt', amount: '1', measurement: 'teaspoons' },
				],
				'Caesar Salad': [
					{ ingredient: 'Spinach', amount: '200', measurement: 'grams' },
					{ ingredient: 'Parmesan Cheese', amount: '50', measurement: 'grams' },
					{ ingredient: 'Olive Oil', amount: '30', measurement: 'ml' },
					{ ingredient: 'Lemon', amount: '1', measurement: 'units' },
					{ ingredient: 'Salt', amount: '1', measurement: 'teaspoons' },
				],
			};

			const insertRecipeIngredient = db.prepare(`
				INSERT OR IGNORE INTO RecipeIngredient (recipe_id, ingredient_name, measurement, amount)
				VALUES (?, ?, ?, ?)
			`);

			for (const recipe of recipes) {
				const matchingIngredients = recipeIngredientsMap[recipe.name];
				if (matchingIngredients) {
					console.log(`  📌 Adding ingredients to "${recipe.name}"`);
					for (const ing of matchingIngredients) {
						const result = insertRecipeIngredient.run(
							recipe.id,
							ing.ingredient,
							ing.measurement,
							ing.amount
						);
						if (result.changes > 0) {
							console.log(
								`    ✓ Added: ${ing.amount} ${ing.measurement} of ${ing.ingredient}`
							);
						}
					}
				}
			}
		}

		console.log('\n✅ Seed data complete!');
		console.log('\n📊 Summary:');
		const ingredientCount = db
			.prepare(`SELECT COUNT(*) as count FROM Ingredient`)
			.get() as { count: number };
		const recipeIngredientCount = db
			.prepare(`SELECT COUNT(*) as count FROM RecipeIngredient`)
			.get() as { count: number };
		console.log(`   Ingredients: ${ingredientCount.count}`);
		console.log(`   Recipe-Ingredient links: ${recipeIngredientCount.count}`);

	} catch (error) {
		console.error('❌ Error seeding data:', error);
		process.exit(1);
	} finally {
		db.close();
	}
}

// Parse command line arguments
const args = process.argv.slice(2);
let dbPath = join(process.cwd(), 'room-food.db');

if (args.includes('--db')) {
	const dbIndex = args.indexOf('--db');
	if (dbIndex >= 0 && dbIndex + 1 < args.length) {
		dbPath = args[dbIndex + 1];
	}
}

seedData(dbPath);

