//@ts-ignore
import BetterSqlite3 from 'better-sqlite3';
import { join } from 'node:path';

/**
 * Comprehensive seed script that creates:
 * 1. Sample users and rooms
 * 2. Sample ingredients
 * 3. Sample recipes with ingredients
 * 4. Sample meals
 *
 * Run with: npm run seed-full-data
 * Or: npx tsx scripts/seed-full-data.ts [--db <path>]
 */

function seedFullData(dbPath: string): void {
	console.log(`📦 Seeding comprehensive sample data into database: ${dbPath}`);

	const db = new BetterSqlite3(dbPath);

	try {
		db.pragma('foreign_keys = ON');

		// =========== USERS ===========
		console.log('\n👥 Creating sample users...');

		// Passwords: alice123, bob123, charlie123, diana123 (bcrypt hashes)
		const users = [
			{ username: 'alice', hashedPassword: '$2b$10$5oSUBSHnDLYTrYstMniF3eYzEXG4xEpRQ.m9EYn2YWodz4/12nJVK', first_name: 'Alice', last_name: 'Smith' }, // alice123
			{ username: 'bob', hashedPassword: '$2b$10$mOmAONOdMa4TBWjSAK6wSeRXP8aBAeEfy7g3Ql5UtGoy/S/XJUWuC', first_name: 'Bob', last_name: 'Johnson' }, // bob123
			{ username: 'charlie', hashedPassword: '$2b$10$Aj0WicMS4dEI.dK5Cbe6x.0ypFYbO1Re/nngKEM3oYFgFAf2qyi5O', first_name: 'Charlie', last_name: 'Brown' }, // charlie123
			{ username: 'diana', hashedPassword: '$2b$10$K0g34fpwYY2A2Y3JkpqDhuPsFTkOXtYOEJjmEpYvVggwijcdyTp7m', first_name: 'Diana', last_name: 'Prince' }, // diana123
		];

		const insertUser = db.prepare(`
			INSERT OR IGNORE INTO User (username, password, first_name, last_name)
			VALUES (?, ?, ?, ?)
		`);

		const createdUsers: Map<string, number> = new Map();
		for (const user of users) {
			const result = insertUser.run(user.username, user.hashedPassword, user.first_name, user.last_name);
			if (result.changes > 0) {
				const userId = db
					.prepare('SELECT id FROM User WHERE username = ?')
					.get(user.username) as { id: number };
				createdUsers.set(user.username, userId.id);
				console.log(`  ✓ Created user: ${user.username}`);
			}
		}

		// =========== ROOMS ===========
		console.log('\n🏠 Creating sample rooms...');

		const rooms = [
			{ code: 'room-001', name: 'Downtown Apartment' },
			{ code: 'room-002', name: 'Riverside Villa' },
			{ code: 'room-003', name: 'Mountain House' },
		];

		const insertRoom = db.prepare(`
			INSERT OR IGNORE INTO Room (code, name)
			VALUES (?, ?)
		`);

		for (const room of rooms) {
			const result = insertRoom.run(room.code, room.name);
			if (result.changes > 0) {
				console.log(`  ✓ Created room: ${room.name} (${room.code})`);
			}
		}

		// =========== ROOM MEMBERS ===========
		console.log('\n🔗 Adding users to rooms...');

		const insertRoomMember = db.prepare(`
			INSERT OR IGNORE INTO RoomUserMember (username, room_code, role)
			VALUES (?, ?, ?)
		`);

		for (const username of Array.from(createdUsers.keys())) {
			for (const room of rooms) {
				const role = username === 'alice' ? 'admin' : 'member';
				const result = insertRoomMember.run(username, room.code, role);
				if (result.changes > 0) {
					console.log(`  ✓ Added ${username} to ${room.name} as ${role}`);
				}
			}
		}

		// =========== INGREDIENTS ===========
		console.log('\n🥘 Creating sample ingredients...');

		const ingredientData = [
			{ name: 'Pasta', default_measurement: 'grams' },
			{ name: 'Tomato', default_measurement: 'units' },
			{ name: 'Garlic', default_measurement: 'cloves' },
			{ name: 'Olive Oil', default_measurement: 'ml' },
			{ name: 'Onion', default_measurement: 'units' },
			{ name: 'Ground Beef', default_measurement: 'grams' },
			{ name: 'Parmesan Cheese', default_measurement: 'grams' },
			{ name: 'Eggs', default_measurement: 'units' },
			{ name: 'Bread', default_measurement: 'slices' },
			{ name: 'Butter', default_measurement: 'grams' },
			{ name: 'Milk', default_measurement: 'ml' },
			{ name: 'Bacon', default_measurement: 'slices' },
			{ name: 'Salt', default_measurement: 'teaspoons' },
			{ name: 'Black Pepper', default_measurement: 'teaspoons' },
			{ name: 'Sugar', default_measurement: 'grams' },
			{ name: 'Flour', default_measurement: 'grams' },
			{ name: 'Chicken Breast', default_measurement: 'grams' },
			{ name: 'Rosemary', default_measurement: 'sprigs' },
			{ name: 'Lemon', default_measurement: 'units' },
			{ name: 'Bell Pepper', default_measurement: 'units' },
			{ name: 'Broccoli', default_measurement: 'grams' },
			{ name: 'Carrot', default_measurement: 'units' },
			{ name: 'Spinach', default_measurement: 'grams' },
		];

		const insertIngredient = db.prepare(`
			INSERT OR IGNORE INTO Ingredient (name, default_measurement)
			VALUES (?, ?)
		`);

		for (const ing of ingredientData) {
			insertIngredient.run(ing.name, ing.default_measurement);
		}
		console.log(`  ✓ Created ${ingredientData.length} ingredients`);

		// =========== RECIPES ===========
		console.log('\n📖 Creating sample recipes...');

		const aliceId = createdUsers.get('alice');
		if (!aliceId) {
			console.error('Error: Alice user not found');
			return;
		}

		const recipes: Array<{
			name: string;
			description: string;
			image?: string;
			visibility: 'public' | 'private';
			author: number;
			mealTypes: string[];
			ingredients: Array<{ ingredient: string; amount: string; measurement: string }>;
		}> = [
			{
				name: 'Pasta Bolognese',
				description: 'Classic Italian pasta with meat sauce',
				visibility: 'public',
				author: aliceId,
				mealTypes: ['lunch-1', 'dinner-2'],
				ingredients: [
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
			},
			{
				name: 'Scrambled Eggs',
				description: 'Fluffy scrambled eggs for breakfast',
				visibility: 'public',
				author: aliceId,
				mealTypes: ['breakfast-0'],
				ingredients: [
					{ ingredient: 'Eggs', amount: '3', measurement: 'units' },
					{ ingredient: 'Butter', amount: '20', measurement: 'grams' },
					{ ingredient: 'Milk', amount: '50', measurement: 'ml' },
					{ ingredient: 'Salt', amount: '0.5', measurement: 'teaspoons' },
					{ ingredient: 'Black Pepper', amount: '0.25', measurement: 'teaspoons' },
				],
			},
			{
				name: 'Grilled Chicken',
				description: 'Tender grilled chicken with lemon and herbs',
				visibility: 'public',
				author: aliceId,
				mealTypes: ['lunch-1', 'dinner-2'],
				ingredients: [
					{ ingredient: 'Chicken Breast', amount: '250', measurement: 'grams' },
					{ ingredient: 'Olive Oil', amount: '20', measurement: 'ml' },
					{ ingredient: 'Lemon', amount: '0.5', measurement: 'units' },
					{ ingredient: 'Rosemary', amount: '2', measurement: 'sprigs' },
					{ ingredient: 'Salt', amount: '1', measurement: 'teaspoons' },
					{ ingredient: 'Black Pepper', amount: '0.5', measurement: 'teaspoons' },
				],
			},
		];

		const insertRecipe = db.prepare(`
			INSERT INTO Recipe (name, description, visibility, author)
			VALUES (?, ?, ?, ?)
		`);

		const insertRecipeMealType = db.prepare(`
			INSERT INTO RecipeMealType (recipe_id, meal_type)
			VALUES (?, ?)
		`);

		const insertRecipeIngredient = db.prepare(`
			INSERT OR IGNORE INTO RecipeIngredient (recipe_id, ingredient_name, measurement, amount)
			VALUES (?, ?, ?, ?)
		`);

		for (const recipe of recipes) {
			insertRecipe.run(recipe.name, recipe.description, recipe.visibility, recipe.author);
			const recipeId = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };

			// Add meal types
			for (const mealType of recipe.mealTypes) {
				insertRecipeMealType.run(recipeId.id, mealType);
			}

			// Add ingredients
			for (const ing of recipe.ingredients) {
				insertRecipeIngredient.run(recipeId.id, ing.ingredient, ing.measurement, ing.amount);
			}

			console.log(`  ✓ Created recipe: ${recipe.name} with ${recipe.ingredients.length} ingredients`);
		}

		// =========== MEALS ===========
		console.log('\n🍽️  Creating sample meals...');

		const now = new Date();
		const tomorrowBreakfast = new Date(now);
		tomorrowBreakfast.setDate(tomorrowBreakfast.getDate() + 1);
		tomorrowBreakfast.setHours(8, 0, 0, 0);

		const insertMeal = db.prepare(`
			INSERT INTO Meal (time, endTime, name, mealType, responsible, roomCode)
			VALUES (?, ?, ?, ?, ?, ?)
		`);

		const meals = [
			{
				time: new Date(tomorrowBreakfast),
				endTime: new Date(new Date(tomorrowBreakfast).setHours(9, 0, 0, 0)),
				name: 'Breakfast',
				mealType: 'breakfast-0',
				responsible: 'alice',
				roomCode: 'room-001',
			},
			{
				time: new Date(new Date(tomorrowBreakfast).setHours(12, 0, 0, 0)),
				endTime: new Date(new Date(tomorrowBreakfast).setHours(13, 0, 0, 0)),
				name: 'Lunch',
				mealType: 'lunch-1',
				responsible: 'bob',
				roomCode: 'room-001',
			},
			{
				time: new Date(new Date(tomorrowBreakfast).setHours(19, 0, 0, 0)),
				endTime: new Date(new Date(tomorrowBreakfast).setHours(20, 0, 0, 0)),
				name: 'Dinner',
				mealType: 'dinner-2',
				responsible: 'charlie',
				roomCode: 'room-001',
			},
		];

		for (const meal of meals) {
			insertMeal.run(
				meal.time.toISOString(),
				meal.endTime.toISOString(),
				meal.name,
				meal.mealType,
				meal.responsible,
				meal.roomCode
			);
		}
		console.log(`  ✓ Created ${meals.length} sample meals`);

		console.log('\n✅ Seed data complete!');
		console.log('\n📊 Summary:');
		const userCount = db
			.prepare(`SELECT COUNT(*) as count FROM User`)
			.get() as { count: number };
		const roomCount = db
			.prepare(`SELECT COUNT(*) as count FROM Room`)
			.get() as { count: number };
		const ingredientCount = db
			.prepare(`SELECT COUNT(*) as count FROM Ingredient`)
			.get() as { count: number };
		const recipeCount = db
			.prepare(`SELECT COUNT(*) as count FROM Recipe`)
			.get() as { count: number };
		const recipeIngredientCount = db
			.prepare(`SELECT COUNT(*) as count FROM RecipeIngredient`)
			.get() as { count: number };
		const mealCount = db
			.prepare(`SELECT COUNT(*) as count FROM Meal`)
			.get() as { count: number };

		console.log(`   Users: ${userCount.count}`);
		console.log(`   Rooms: ${roomCount.count}`);
		console.log(`   Ingredients: ${ingredientCount.count}`);
		console.log(`   Recipes: ${recipeCount.count}`);
		console.log(`   Recipe-Ingredient links: ${recipeIngredientCount.count}`);
		console.log(`   Meals: ${mealCount.count}`);

		console.log('\n💻 Sample Login Credentials:');
		for (const username of Array.from(createdUsers.keys())) {
			let password = '';
			if (username === 'alice') {
				password = 'alice123';
			} else {
				if (username === 'bob') {
					password = 'bob123';
				} else {
					if (username === 'charlie') {
									password = 'charlie123';
					} else {
						if (username === 'diana') {
							password = 'diana123';
						}
					}
				}
			}

			console.log(`   Username: ${username}`);
			console.log(`   Password: ${password}`);
		}

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

seedFullData(dbPath);
