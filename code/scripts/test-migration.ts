import BetterSqlite3 from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(message);
	}
}

async function main(): Promise<void> {
	const tempDir = mkdtempSync(join(tmpdir(), 'room-food-migration-'));
	const dbPath = join(tempDir, 'room-food.db');
	const previousCwd = process.cwd();

	console.log('=== Migration Test ===');
	console.log(`Temp dir: ${tempDir}`);

	try {
		const legacyDb = new BetterSqlite3(dbPath);
		legacyDb.pragma('foreign_keys = ON');

		legacyDb.exec(`
		create table if not exists User
		(
			id       integer primary key autoincrement,
			username text not null,
			password text not null,
			constraint uq_user unique (username)
		) strict;

		create table if not exists Room
		(
			code text not null,
			name text not null,
			constraint pk_code primary key (code)
		) strict;

		create table if not exists Meal
		(
			id          integer primary key,
			time        text not null,
			name        text,
			responsible text,
			roomCode    text not null,
			constraint uq_mealtime unique (time),
			constraint fk_responsible foreign key (responsible) REFERENCES User (username) ON DELETE CASCADE
		) strict;

		create table if not exists Recipe
		(
			id       integer PRIMARY KEY
				DEFAULT (abs(random()) % 90000000 + 10000000),
			name     text    not null,
			author   integer not null,
			constraint uq_recipe unique (id, author),
			constraint fk_author foreign key (author) REFERENCES User (id) ON DELETE CASCADE
		) strict;
	`);

		legacyDb.prepare(`insert into User(username, password) values ('chef1', 'pw')`).run();
		legacyDb.prepare(`insert into Room(code, name) values ('ABCD', 'Test Room')`).run();
		legacyDb.prepare(
			`insert into Meal(id, time, name, responsible, roomCode) values (1, '2026-04-10T19:00:00Z', 'Dinner', 'chef1', 'ABCD')`)
		.run();
		legacyDb.prepare(`insert into Recipe(id, name, author) values (12345678, 'Legacy Pasta', 1)`).run();
		legacyDb.close();

		process.chdir(tempDir);

		const { Unit } = await import('../src/backend/unit');
		const unit = new Unit(true);
		unit.complete();

		process.chdir(previousCwd);

		const migratedDb = new BetterSqlite3(dbPath);
		migratedDb.pragma('foreign_keys = ON');

		const recipeColumns = migratedDb.prepare(`pragma table_info(Recipe)`).all() as Array<{
			name: string
		}>;
		const recipeColumnNames = new Set(recipeColumns.map(c => c.name));
		assert(recipeColumnNames.has('description'), 'Recipe.description was not migrated');
		assert(recipeColumnNames.has('image'), 'Recipe.image was not migrated');
		assert(!recipeColumnNames.has('mealType'), 'Recipe.mealType still exists unexpectedly');

		const recipeMealTypeColumns = migratedDb.prepare(`pragma table_info(RecipeMealType)`).all() as Array<{
			name: string
		}>;
		assert(recipeMealTypeColumns.length > 0, 'RecipeMealType table was not created');

		const mealSqlRow = migratedDb.prepare(`select sql from sqlite_master where type='table' and name='Meal'`)
		.get() as {
			sql?: string
		} | undefined;
		const mealSql = (mealSqlRow?.sql ?? '').toLowerCase();
		assert(!mealSql.includes('unique (time)') && !mealSql.includes('uq_mealtime'),
			'Meal unique(time) was not removed');

		const recipeRow = migratedDb.prepare(
			`select id, name, description, image, author from Recipe where id = 12345678`).get() as {
			id: number,
			name: string,
			description: string | null,
			image: string | null,
			author: number
		} | undefined;
		assert(!!recipeRow, 'Legacy recipe row was not preserved');
		assert(recipeRow?.description === null, 'Legacy recipe description should migrate as null');
		assert(recipeRow?.image === null, 'Legacy recipe image should migrate as null');

		migratedDb.close();

		console.log('Migration test passed.');
	} finally {
		process.chdir(previousCwd);
		try {
			rmSync(tempDir, {
				recursive: true,
				force: true
			});
		} catch (cleanupError) {
			console.warn('Cleanup warning:', cleanupError);
		}
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});



