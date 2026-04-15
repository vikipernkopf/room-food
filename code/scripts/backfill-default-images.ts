import BetterSqlite3 = require('better-sqlite3');
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_ROOM_PICTURE =
	'https://static.vecteezy.com/system/resources/previews/026/019/617/' +
	'non_2x/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';

const DEFAULT_RECIPE_IMAGE =
	'https://thecrites.com/sites/all/modules/cookbook/theme/images/' +
	'default-recipe-big.png';

function getDbPath(): string {
	const dbArgIndex = process.argv.findIndex(arg => arg === '--db');
	if (dbArgIndex >= 0 && process.argv[dbArgIndex + 1]) {
		return process.argv[dbArgIndex + 1];
	}

	return join(process.cwd(), 'room-food.db');
}

function getTableColumns(db: BetterSqlite3.Database, tableName: string): Set<string> {
	const columns = db.prepare(`pragma table_info(${tableName})`).all() as Array<{
		name: string
	}>;
	return new Set(columns.map(column => column.name));
}

function main(): void {
	const dbPath = getDbPath();
	if (!existsSync(dbPath)) {
		throw new Error(`Database file not found: ${dbPath}`);
	}

	const db = new BetterSqlite3(dbPath);
	try {
		db.pragma('foreign_keys = ON');

		const roomColumns = getTableColumns(db, 'Room');
		const recipeColumns = getTableColumns(db, 'Recipe');

		if (!roomColumns.has('profile_picture')) {
			throw new Error('Room.profile_picture column is missing.');
		}

		if (!recipeColumns.has('image')) {
			throw new Error('Recipe.image column is missing.');
		}

		const beforeRoomRows = db.prepare('select count(*) as count from Room').get() as {
			count: number
		};
		const beforeRecipeRows = db.prepare('select count(*) as count from Recipe').get() as {
			count: number
		};

		const result = db.transaction(() => {
			const roomUpdate = db.prepare(
				'update Room set profile_picture = ? where code is not null'
			).run(DEFAULT_ROOM_PICTURE);
			const recipeUpdate = db.prepare(
				'update Recipe set image = ? where id is not null'
			).run(DEFAULT_RECIPE_IMAGE);
			return {
				roomChanges: roomUpdate.changes,
				recipeChanges: recipeUpdate.changes
			};
		})();

		console.log(`Database: ${dbPath}`);
		console.log(`Room rows: ${beforeRoomRows.count} updated: ${result.roomChanges}`);
		console.log(`Recipe rows: ${beforeRecipeRows.count} updated: ${result.recipeChanges}`);
		console.log('Default images were written successfully.');
	} finally {
		db.close();
	}
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
