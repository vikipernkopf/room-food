// noinspection JSUnusedGlobalSymbols

import BetterSqlite3 from 'better-sqlite3';
import { join } from 'node:path';

export class Unit {
	private readonly db: BetterSqlite3.Database;
	private completed: boolean;
	public readonly readOnly: boolean;

	public constructor(readOnly: boolean = false) {
		this.completed = false;
		this.readOnly = readOnly;
		this.db = DB.createDBConnection();
		if (!this.readOnly) {
			DB.beginTransaction(this.db);
		}
	}

	public prepare<TResult, TParams extends Record<string, unknown> = Record<string, unknown>>(
		sql: string, bindings?: TParams): ITypedStatement<TResult, TParams> {

		const stmt = this.db.prepare(sql);
		if (bindings != null) {
			stmt.bind(bindings);
		}
		return stmt as unknown as ITypedStatement<TResult, TParams>;
	}

	// noinspection JSUnusedGlobalSymbols
	public getLastRowId(): number {
		const stmt = this.prepare<{
			id: number
		}>('SELECT last_insert_rowid() as "id"');
		const result = stmt.get();
		if (!result) {
			throw new Error('Unable to retrieve last inserted row id');
		}
		return result.id;
	}

	public complete(commit: boolean | null = null): void {
		if (this.completed) {
			return;
		}

		this.completed = true;

		if (commit !== null) {
			commit ? DB.commitTransaction(this.db) : DB.rollbackTransaction(this.db);
		} else if (!this.readOnly) {
			throw new Error('transaction has been opened, requires information if commit or rollback needed');
		}
		this.db.close();
	}
}

//noinspection ProblematicWhitespace,SqlResolve
class DB {
	// noinspection JSUnusedGlobalSymbols
	public static createDBConnection(): BetterSqlite3.Database {
		const dbFileName = join(process.cwd(), 'room-food.db');
		const db = new BetterSqlite3(dbFileName, {
			fileMustExist: false,
			verbose: (s: unknown) => DB.logStatement(s)
		});

		db.pragma('foreign_keys = ON');

		DB.ensureTablesCreated(db);

		return db;
	}

	// Create all tables directly without executing migration transformations.
	// The original migration-aware method `ensureTablesCreated` is left intact
	// (unused) so you can re-enable migrations later if desired.
	private static ensureTablesCreatedWithoutMigration(connection: BetterSqlite3.Database): void {
		console.log('Ensuring database tables (no migrations) and creating schema...');

		connection.exec(
			`create table if not exists Room
			 (
				 code            text not null,
				 name            text not null,
				 profile_picture text,

				 constraint pk_code primary key (code)
			 ) strict`
		);

		connection.exec(
			`create table if not exists User
			 (
				 id              integer primary key autoincrement,
				 username        text not null,
				 password        text not null,
				 email           text,
				 first_name      text,
				 last_name       text,
				 bio             text,
				 dob             text,
				 profile_picture text,

				 constraint uq_user unique (username),
				 constraint uq_user_email unique (email)

			 ) strict`
		);

		connection.exec(
			`create table if not exists RoomUserMember
			 (
				 username  text not null,
				 room_code text not null,
				 role      text not null,

				 constraint pk_room_member primary key (username, room_code),
				 constraint fk_username foreign key (username) references User (username) ON DELETE CASCADE,
				 constraint fk_room_code foreign key (room_code) references Room (code) ON DELETE CASCADE

			 ) strict`
		);

		connection.exec(
			`create table if not exists RoomUserRequest
			 (
				 username  text not null,
				 room_code text not null,

				 constraint pk_room_member primary key (username, room_code),
				 constraint fk_username foreign key (username) references User (username) ON DELETE CASCADE,
				 constraint fk_room_code foreign key (room_code) references Room (code) ON DELETE CASCADE

			 ) strict`
		);

		connection.exec(
			`create table if not exists Recipe
			 (
				 id          integer primary key autoincrement,
				 name        text not null,
				 description text,
				 image       text,
				 visibility  text not null default 'private'
					 constraint ck_recipe_visibility check (visibility in ('public', 'private')),
				 author      integer not null,
				 instructions text not null default '',

				 constraint fk_author foreign key (author) REFERENCES User (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists RecipeMealType
			 (
				 recipe_id integer not null,
				 meal_type text    not null,

				 constraint pk_recipe_meal_type primary key (recipe_id, meal_type),
				 constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists SavedRecipe
			 (
				 user_id   integer not null,
				 recipe_id integer not null,

				 constraint pk_saved_recipe primary key (user_id, recipe_id),
				 constraint fk_saved_recipe_user_id foreign key (user_id) references User (id) ON DELETE CASCADE,
				 constraint fk_saved_recipe_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists MealRecipe
			 (
				 meal_id   integer not null,
				 recipe_id integer not null,

				 constraint pk_meal_recipe primary key (meal_id, recipe_id),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists Meal
			 (
				 id          integer primary key autoincrement,
				 time        text not null,
				 endTime	 text not null,
				 name        text,
				 mealType    text not null default 'breakfast-0',
				 roomCode    text not null,
				 cooked 	 integer not null default 0

			 ) strict`
		);

		connection.exec(
			`create table if not exists MealResponsibleUser
			 (
				 meal_id  integer not null,
				 username text    not null,

				 constraint pk_meal_responsible_user primary key (meal_id, username),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_username foreign key (username) references User (username) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists Ingredient
			 (
				 id              integer primary key autoincrement,
				 name	         text not null,
				 default_measurement text,
				 user text,

				 constraint uq_name unique (name)

			 ) strict`
		);

		connection.exec(
			`create table if not exists RecipeIngredient
			 (
				 recipe_id		 integer not null,
				 ingredient_id   integer not null,
				 measurement     text not null,
				 amount          text not null,

				 constraint pk_recipe_ingredient primary key (recipe_id, ingredient_id, measurement),
				 constraint fk_recipe foreign key (recipe_id) references Recipe(id) ON DELETE CASCADE,
				 constraint fk_ingredient foreign key (ingredient_id) references Ingredient(id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists RoomIngredient
			 (
				 room_code		 text not null,
				 ingredient_id   integer not null,
				 measurement     text not null,
				 amount          text not null,

				 constraint pk_room_ingredient primary key (room_code, ingredient_id, measurement),
				 constraint fk_room_code foreign key (room_code) references Room(code) ON DELETE CASCADE,
				 constraint fk_ingredient foreign key (ingredient_id) references Ingredient(id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists MealIngredientAssignment
			 (
				 meal_id              integer not null,
				 ingredient_id        integer not null,
				 assigned_to_username text    not null,
				 bought               integer not null default 0,

				 constraint pk_meal_ingredient_assignment primary key (meal_id, ingredient_id, assigned_to_username),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_ingredient foreign key (ingredient_id) references Ingredient (id) ON DELETE CASCADE,
				 constraint fk_username foreign key (assigned_to_username) references User (username) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists MealEatingUser
			 (
				 meal_id integer not null,
				 user_id integer not null,

				 constraint pk_meal_eating_user primary key (meal_id, user_id),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_username foreign key (user_id) references User (id) ON DELETE CASCADE
			 )`
		);

		console.log('Schema creation (no migrations) completed');
	}

	public static beginTransaction(connection: BetterSqlite3.Database): void {
		connection.exec('begin transaction;');
	}

	public static commitTransaction(connection: BetterSqlite3.Database): void {
		connection.exec('commit;');
	}

	public static rollbackTransaction(connection: BetterSqlite3.Database): void {
		connection.exec('rollback;');
	}

	private static logStatement(statement: string | unknown): void {
		if (typeof statement !== 'string') {
			return;
		}

		const start = statement.slice(0, 6).trim().toLowerCase();

		if (start.startsWith('pragma') || start.startsWith('create')) {
			return;
		}

		console.log(`SQL: ${statement}`);
	}

	private static ensureTablesCreated(connection: BetterSqlite3.Database): void {
		console.log('Ensuring database tables with migrations and creating schema...');

		connection.exec(
			`create table if not exists Room
			 (
				 code            text not null,
				 name            text not null,
				 profile_picture text,

				 constraint pk_code primary key (code)
			 ) strict`
		);

		connection.exec(
			`create table if not exists User
			 (
				 id              integer primary key autoincrement,
				 username        text not null,
				 password        text not null,
				 email           text,
				 first_name      text,
				 last_name       text,
				 bio             text,
				 dob             text,
				 profile_picture text,

				 constraint uq_user unique (username),
				 constraint uq_user_email unique (email)

			 ) strict`
		);

		connection.exec(
			`create table if not exists RoomUserMember
			 (
				 username  text not null,
				 room_code text not null,
				 role      text not null,

				 constraint pk_room_member primary key (username, room_code),
				 constraint fk_username foreign key (username) references User (username) ON DELETE CASCADE,
				 constraint fk_room_code foreign key (room_code) references Room (code) ON DELETE CASCADE

			 ) strict`
		);

		connection.exec(
			`create table if not exists RoomUserRequest
			 (
				 username  text not null,
				 room_code text not null,

				 constraint pk_room_member primary key (username, room_code),
				 constraint fk_username foreign key (username) references User (username) ON DELETE CASCADE,
				 constraint fk_room_code foreign key (room_code) references Room (code) ON DELETE CASCADE

			 ) strict`
		);

		connection.exec(
			`create table if not exists Recipe
			 (
				 id          integer primary key autoincrement,
				 name        text not null,
				 description text,
				 image       text,
				 visibility  text not null default 'private'
					 constraint ck_recipe_visibility check (visibility in ('public', 'private')),
				 author      integer not null,
				 instructions text not null default '',

				 constraint fk_author foreign key (author) REFERENCES User (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists RecipeMealType
			 (
				 recipe_id integer not null,
				 meal_type text    not null,

				 constraint pk_recipe_meal_type primary key (recipe_id, meal_type),
				 constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists SavedRecipe
			 (
				 user_id   integer not null,
				 recipe_id integer not null,

				 constraint pk_saved_recipe primary key (user_id, recipe_id),
				 constraint fk_saved_recipe_user_id foreign key (user_id) references User (id) ON DELETE CASCADE,
				 constraint fk_saved_recipe_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists MealRecipe
			 (
				 meal_id   integer not null,
				 recipe_id integer not null,

				 constraint pk_meal_recipe primary key (meal_id, recipe_id),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists Meal
			 (
				 id          integer primary key autoincrement,
				 time        text not null,
				 endTime	 text not null,
				 name        text,
				 mealType    text not null default 'breakfast-0',
				 responsible text,
				 roomCode    text not null,
				 constraint fk_responsible foreign key (responsible) REFERENCES User (username) ON DELETE CASCADE

			 ) strict`
		);

		connection.exec(
			`create table if not exists MealResponsibleUser
			 (
				 meal_id  integer not null,
				 username text    not null,

				 constraint pk_meal_responsible_user primary key (meal_id, username),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_username foreign key (username) references User (username) ON DELETE CASCADE
			 ) strict`
		);

		connection.exec(
			`create table if not exists Ingredient
			 (
				 id              integer primary key autoincrement,
				 name	         text not null,
				 default_measurement text,
				 user text,

				 constraint uq_name unique (name)

			 ) strict`
		);

		connection.exec(
			`create table if not exists RecipeIngredient
			 (
				 recipe_id		 integer not null,
				 ingredient_name text not null,
				 measurement text not null,
				 amount text not null,

				 constraint fk_recipe foreign key (recipe_id) references Recipe(id) ON DELETE CASCADE

			 ) strict`
		);

		connection.exec(
			`create table if not exists RoomIngredient
			 (
				 room_code		 text not null,
				 ingredient_name text not null,
				 measurement text not null,
				 amount text not null,

				 constraint pk_room_ingredient primary key (room_code, ingredient_name, measurement),
				 constraint fk_room_code foreign key (room_code) references Room(code) ON DELETE CASCADE

			 ) strict`
		);

		connection.exec(`
			CREATE TABLE IF NOT EXISTS BoughtIngredient (
				                                            room_code          TEXT NOT NULL,
				                                            ingredient_name    TEXT NOT NULL,
				                                            measurement        TEXT NOT NULL,
				                                            amount             TEXT NOT NULL,
				                                            bought_by_username TEXT NOT NULL,
				                                            bought_at          TEXT NOT NULL,
				                                            CONSTRAINT pk_bought_ingredient PRIMARY KEY (room_code, ingredient_name, measurement),
				                                            CONSTRAINT fk_bought_room FOREIGN KEY (room_code) REFERENCES Room(code) ON DELETE CASCADE
			) STRICT
		`);

		connection.exec(
			`create table if not exists MealEatingUser
			 (
				 meal_id integer not null,
				 user_id integer not null,

				 constraint pk_meal_eating_user primary key (meal_id, user_id),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_username foreign key (user_id) references User (id) ON DELETE CASCADE
			 )
			`);

		connection.exec(
			`create table if not exists MealIngredientAssignment
			 (
				 meal_id integer not null,
				 ingredient_name text not null,
				 assigned_to_username text not null,

				 constraint pk_meal_ingredient_assignment primary key (meal_id, ingredient_name, assigned_to_username),
				 constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
				 constraint fk_username foreign key (assigned_to_username) references User (username) ON DELETE CASCADE
			 ) strict`
		);

		this.runBoughtIngredientMigration(connection);
		this.runMiaColumnMigration(connection);
		this.runRemoveResponsibleFromMealMigration(connection);
		this.runAddCookedToMealMigration(connection);

		console.log('Schema creation with migrations completed');
	}

	private static runAddCookedToMealMigration(connection: BetterSqlite3.Database): void {
		console.log('Running Meal → add cooked column migration...');

		const hasCooked = connection.prepare(`
        SELECT 1 FROM pragma_table_info('Meal') WHERE name = 'cooked'
    `).get();

		if (hasCooked) {
			console.log('Cooked column already exists, migration not needed.');
			return;
		}

		connection.exec(`
        ALTER TABLE Meal ADD COLUMN cooked INTEGER NOT NULL DEFAULT 0
    `);

		console.log('Added cooked column to Meal table.');
	}

	private static runRemoveResponsibleFromMealMigration(connection: BetterSqlite3.Database): void {
		console.log('Running Meal → remove responsible column migration...');

		const hasResponsible = connection.prepare(`
			SELECT 1 FROM pragma_table_info('Meal') WHERE name = 'responsible'
		`).get();

		if (!hasResponsible) {
			console.log('Responsible column not found, migration not needed.');
			return;
		}

		// Disable constraints during structural mutations to stop SQLite from re-mapping child tracking pointers to Meal_old
		connection.exec('PRAGMA foreign_keys = OFF');

		try {
			// 1. Rename parent table
			connection.exec('ALTER TABLE Meal RENAME TO Meal_old');

			// 2. Re-create parent table with clean schema definitions
			connection.exec(`
				CREATE TABLE Meal (
					id          integer primary key autoincrement,
					time        text not null,
					endTime     text not null,
					name        text,
					mealType    text not null default 'breakfast-0',
					roomCode    text not null,
					cooked      integer not null default 0
				) strict
			`);

			// 3. Migrate historical core rows
			connection.exec(`
				INSERT INTO Meal (id, time, endTime, name, mealType, roomCode)
				SELECT id, time, endTime, name, mealType, roomCode FROM Meal_old
			`);

			// 4. RECREATE CHILD TABLES to force correct foreign key resolution targeting the new 'Meal' table

			// MealRecipe
			connection.exec('ALTER TABLE MealRecipe RENAME TO MealRecipe_old');
			connection.exec(`
				CREATE TABLE MealRecipe (
					meal_id   integer not null,
					recipe_id integer not null,
					constraint pk_meal_recipe primary key (meal_id, recipe_id),
					constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
					constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
				) strict
			`);
			connection.exec('INSERT INTO MealRecipe SELECT * FROM MealRecipe_old');
			connection.exec('DROP TABLE MealRecipe_old');

			// MealResponsibleUser
			connection.exec('ALTER TABLE MealResponsibleUser RENAME TO MealResponsibleUser_old');
			connection.exec(`
				CREATE TABLE MealResponsibleUser (
					meal_id  integer not null,
					username text    not null,
					constraint pk_meal_responsible_user primary key (meal_id, username),
					constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
					constraint fk_username foreign key (username) references User (username) ON DELETE CASCADE
				) strict
			`);
			connection.exec('INSERT INTO MealResponsibleUser SELECT * FROM MealResponsibleUser_old');
			connection.exec('DROP TABLE MealResponsibleUser_old');

			// MealEatingUser
			connection.exec('ALTER TABLE MealEatingUser RENAME TO MealEatingUser_old');
			connection.exec(`
				CREATE TABLE MealEatingUser (
					meal_id integer not null,
					user_id integer not null,
					constraint pk_meal_eating_user primary key (meal_id, user_id),
					constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
					constraint fk_username foreign key (user_id) references User (id) ON DELETE CASCADE
				)
			`);
			connection.exec('INSERT INTO MealEatingUser SELECT * FROM MealEatingUser_old');
			connection.exec('DROP TABLE MealEatingUser_old');

			// MealIngredientAssignment
			connection.exec('ALTER TABLE MealIngredientAssignment RENAME TO MealIngredientAssignment_old');
			connection.exec(`
				CREATE TABLE MealIngredientAssignment (
					meal_id              INTEGER NOT NULL,
					ingredient_id        INTEGER NOT NULL,
					assigned_to_username TEXT    NOT NULL,
					measurement          TEXT    NOT NULL DEFAULT '',
					amount               TEXT    NOT NULL DEFAULT '0',
					bought               INTEGER NOT NULL DEFAULT 0,
					CONSTRAINT pk_meal_ingredient_assignment PRIMARY KEY (meal_id, ingredient_id, assigned_to_username),
					CONSTRAINT fk_meal_id     FOREIGN KEY (meal_id)              REFERENCES Meal(id)      ON DELETE CASCADE,
					CONSTRAINT fk_ingredient FOREIGN KEY (ingredient_id)        REFERENCES Ingredient(id) ON DELETE CASCADE,
					CONSTRAINT fk_username   FOREIGN KEY (assigned_to_username) REFERENCES User(username) ON DELETE CASCADE
				) STRICT
			`);
			connection.exec('INSERT INTO MealIngredientAssignment SELECT * FROM MealIngredientAssignment_old');
			connection.exec('DROP TABLE MealIngredientAssignment_old');

			// 5. Safely drop temp parent table
			connection.exec('DROP TABLE Meal_old');

			// 6. Re-engage internal constraint structures
			connection.exec('PRAGMA foreign_keys = ON');
			console.log('Removed responsible column from Meal table and repaired all tracking child foreign keys.');
		} catch (error) {
			console.error('Migration failed:', error);
			connection.exec('PRAGMA foreign_keys = ON');
			throw error;
		}
	}

	private static runBoughtIngredientMigration(connection: BetterSqlite3.Database): void {
		console.log('Running BoughtIngredient → MealIngredientAssignment migration...');

		// Check if old tables exist
		const oldTables = connection.prepare(`
			SELECT name FROM sqlite_master
			WHERE type = 'table' AND name IN ('BoughtIngredient', 'RecipeIngredient', 'RoomIngredient', 'MealIngredientAssignment')
		`).all() as Array<{
			name: string
		}>;
		const oldTableNames = new Set(oldTables.map(t => t.name));

		if (!oldTableNames.has('BoughtIngredient') && !oldTableNames.has('RecipeIngredient')) {
			console.log('No old ingredient tables found, migration not needed.');
			return;
		}

		connection.exec('PRAGMA foreign_keys = OFF');

		try {
			// Step 1: Drop BoughtIngredient if it exists
			if (oldTableNames.has('BoughtIngredient')) {
				connection.exec('DROP TABLE IF EXISTS BoughtIngredient');
				console.log('Dropped BoughtIngredient table.');
			}

			// Step 2: Migrate RecipeIngredient (add ingredient_id FK)
			if (oldTableNames.has('RecipeIngredient')) {
				// Check if already migrated (has ingredient_id column)
				const hasIngredientId = connection.prepare(`
					SELECT 1 FROM pragma_table_info('RecipeIngredient') WHERE name = 'ingredient_id'
				`).get();
				if (!hasIngredientId) {
					connection.exec('ALTER TABLE RecipeIngredient RENAME TO RecipeIngredient_old');

					connection.exec(`
						CREATE TABLE RecipeIngredient (
							recipe_id INTEGER NOT NULL,
							ingredient_id INTEGER NOT NULL,
							measurement TEXT NOT NULL,
							amount TEXT NOT NULL,
							CONSTRAINT pk_recipe_ingredient PRIMARY KEY (recipe_id, ingredient_id, measurement),
							CONSTRAINT fk_recipe FOREIGN KEY (recipe_id) REFERENCES Recipe(id) ON DELETE CASCADE,
							CONSTRAINT fk_ingredient FOREIGN KEY (ingredient_id) REFERENCES Ingredient(id) ON DELETE CASCADE
						) STRICT
					`);

					connection.exec(`
						INSERT INTO RecipeIngredient (recipe_id, ingredient_id, measurement, amount)
						SELECT ri.recipe_id, i.id, ri.measurement, ri.amount
						FROM RecipeIngredient_old ri
						JOIN Ingredient i ON i.name = ri.ingredient_name
					`);

					connection.exec('DROP TABLE RecipeIngredient_old');
					console.log('Migrated RecipeIngredient to use ingredient_id FK.');
				}
			}

			// Step 3: Migrate RoomIngredient (add ingredient_id FK)
			if (oldTableNames.has('RoomIngredient')) {
				const hasIngredientId = connection.prepare(`
					SELECT 1 FROM pragma_table_info('RoomIngredient') WHERE name = 'ingredient_id'
				`).get();
				if (!hasIngredientId) {
					connection.exec('ALTER TABLE RoomIngredient RENAME TO RoomIngredient_old');

					connection.exec(`
						CREATE TABLE RoomIngredient (
							room_code TEXT NOT NULL,
							ingredient_id INTEGER NOT NULL,
							measurement TEXT NOT NULL,
							amount TEXT NOT NULL,
							CONSTRAINT pk_room_ingredient PRIMARY KEY (room_code, ingredient_id, measurement),
							CONSTRAINT fk_room_code FOREIGN KEY (room_code) REFERENCES Room(code) ON DELETE CASCADE,
							CONSTRAINT fk_ingredient FOREIGN KEY (ingredient_id) REFERENCES Ingredient(id) ON DELETE CASCADE
						) STRICT
					`);

					connection.exec(`
						INSERT INTO RoomIngredient (room_code, ingredient_id, measurement, amount)
						SELECT ri.room_code, i.id, ri.measurement, ri.amount
						FROM RoomIngredient_old ri
						JOIN Ingredient i ON i.name = ri.ingredient_name
					`);

					connection.exec('DROP TABLE RoomIngredient_old');
					console.log('Migrated RoomIngredient to use ingredient_id FK.');
				}
			}

			// Step 4: Migrate MealIngredientAssignment (add ingredient_id FK and bought column)
			if (oldTableNames.has('MealIngredientAssignment')) {
				const hasIngredientId = connection.prepare(`
					SELECT 1 FROM pragma_table_info('MealIngredientAssignment') WHERE name = 'ingredient_id'
				`).get();
				if (!hasIngredientId) {
					connection.exec('ALTER TABLE MealIngredientAssignment RENAME TO MealIngredientAssignment_old');

					connection.exec(`
						CREATE TABLE MealIngredientAssignment (
							meal_id INTEGER NOT NULL,
							ingredient_id INTEGER NOT NULL,
							assigned_to_username TEXT NOT NULL,
							bought INTEGER NOT NULL DEFAULT 0,
							CONSTRAINT pk_meal_ingredient_assignment PRIMARY KEY (meal_id, ingredient_id, assigned_to_username),
							CONSTRAINT fk_meal_id FOREIGN KEY (meal_id) REFERENCES Meal(id) ON DELETE CASCADE,
							CONSTRAINT fk_ingredient FOREIGN KEY (ingredient_id) REFERENCES Ingredient(id) ON DELETE CASCADE,
							CONSTRAINT fk_username FOREIGN KEY (assigned_to_username) REFERENCES User(username) ON DELETE CASCADE
						) STRICT
					`);

					connection.exec(`
						INSERT INTO MealIngredientAssignment (meal_id, ingredient_id, assigned_to_username, bought)
						SELECT mia.meal_id, i.id, mia.assigned_to_username, 0
						FROM MealIngredientAssignment_old mia
						JOIN Ingredient i ON i.name = mia.ingredient_name
					`);

					connection.exec('DROP TABLE MealIngredientAssignment_old');
					console.log('Migrated MealIngredientAssignment to use ingredient_id FK and bought column.');
				}
			}

			connection.exec('PRAGMA foreign_keys = ON');
			console.log('BoughtIngredient migration completed.');
		} catch (error) {
			console.error('Migration failed:', error);
			connection.exec('PRAGMA foreign_keys = ON');
			throw error;
		}
	}

	private static runMiaColumnMigration(connection: BetterSqlite3.Database): void {
		console.log('Running MealIngredientAssignment column migration (add measurement + amount)...');

		// Check if migration is needed
		const hasMeasurement = connection.prepare(`
        SELECT 1 FROM pragma_table_info('MealIngredientAssignment') WHERE name = 'measurement'
    `).get();

		if (hasMeasurement) {
			console.log('MealIngredientAssignment already has measurement column, skipping migration.');
			return;
		}

		connection.exec('PRAGMA foreign_keys = OFF');

		try {
			// Step 1: Drop BoughtIngredient if it still exists
			const boughtExists = connection.prepare(`
            SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'BoughtIngredient'
        `).get();
			if (boughtExists) {
				connection.exec('DROP TABLE IF EXISTS BoughtIngredient');
				console.log('Dropped BoughtIngredient table.');
			}

			// Step 2: Rename old MIA
			connection.exec('ALTER TABLE MealIngredientAssignment RENAME TO MealIngredientAssignment_old');

			// Step 3: Create new MIA with measurement + amount
			connection.exec(`
            CREATE TABLE MealIngredientAssignment (
                meal_id              INTEGER NOT NULL,
                ingredient_id        INTEGER NOT NULL,
                assigned_to_username TEXT    NOT NULL,
                measurement          TEXT    NOT NULL DEFAULT '',
                amount               TEXT    NOT NULL DEFAULT '0',
                bought               INTEGER NOT NULL DEFAULT 0,

                CONSTRAINT pk_meal_ingredient_assignment PRIMARY KEY (meal_id, ingredient_id, assigned_to_username),
                CONSTRAINT fk_meal_id     FOREIGN KEY (meal_id)              REFERENCES Meal(id)      ON DELETE CASCADE,
                CONSTRAINT fk_ingredient FOREIGN KEY (ingredient_id)        REFERENCES Ingredient(id) ON DELETE CASCADE,
                CONSTRAINT fk_username   FOREIGN KEY (assigned_to_username) REFERENCES User(username) ON DELETE CASCADE
            ) STRICT
        `);

			// Step 4: Migrate existing MIA data
			// Pull measurement/amount from RecipeIngredient via MealRecipe, fallback to defaults
			connection.exec(`
            INSERT INTO MealIngredientAssignment (meal_id, ingredient_id, assigned_to_username, measurement, amount, bought)
            SELECT
                mia.meal_id,
                mia.ingredient_id,
                mia.assigned_to_username,
                COALESCE(
                    (SELECT ri.measurement
                     FROM MealRecipe mr
                     JOIN RecipeIngredient ri ON ri.recipe_id = mr.recipe_id
                     WHERE mr.meal_id = mia.meal_id
                       AND ri.ingredient_id = mia.ingredient_id
                     LIMIT 1),
                    ''
                ) AS measurement,
                COALESCE(
                    (SELECT ri.amount
                     FROM MealRecipe mr
                     JOIN RecipeIngredient ri ON ri.recipe_id = mr.recipe_id
                     WHERE mr.meal_id = mia.meal_id
                       AND ri.ingredient_id = mia.ingredient_id
                     LIMIT 1),
                    '0'
                ) AS amount,
                mia.bought
            FROM MealIngredientAssignment_old mia
        `);

			// Step 5: Migrate BoughtIngredient data into MIA (bought = 1)
			// Only if there was leftover BoughtIngredient data that wasn't already migrated
			const boughtOldExists = connection.prepare(`
            SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'BoughtIngredient_old'
        `).get();
			if (boughtOldExists) {
				connection.exec(`
                INSERT INTO MealIngredientAssignment (meal_id, ingredient_id, assigned_to_username, measurement, amount, bought)
                SELECT
                    m.id AS meal_id,
                    i.id AS ingredient_id,
                    bi.bought_by_username AS assigned_to_username,
                    bi.measurement,
                    bi.amount,
                    1 AS bought
                FROM BoughtIngredient_old bi
                JOIN Ingredient i ON i.name = bi.ingredient_name
                JOIN Meal m ON m.roomCode = bi.room_code
                WHERE NOT EXISTS (
                    SELECT 1 FROM MealIngredientAssignment mia2
                    WHERE mia2.meal_id = m.id
                      AND mia2.ingredient_id = i.id
                      AND mia2.assigned_to_username = bi.bought_by_username
                )
                GROUP BY m.id, i.id, bi.bought_by_username, bi.measurement, bi.amount
            `);
				console.log('Migrated leftover BoughtIngredient data into MealIngredientAssignment.');
			}

			// Step 6: Drop old table
			connection.exec('DROP TABLE IF EXISTS MealIngredientAssignment_old');

			connection.exec('PRAGMA foreign_keys = ON');
			console.log('MealIngredientAssignment column migration completed.');
		} catch (error) {
			console.error('Migration failed:', error);
			connection.exec('PRAGMA foreign_keys = ON');
			throw error;
		}
	}

	public static migrateAmountToReal(connection: BetterSqlite3.Database): void {
		connection.exec(`
        	CREATE TABLE IF NOT EXISTS RoomIngredient_new (
            	room_code       TEXT NOT NULL,
            	ingredient_name TEXT NOT NULL,
            	measurement     TEXT NOT NULL,
            	amount          REAL NOT NULL,

            	CONSTRAINT pk_room_ingredient PRIMARY KEY (room_code, ingredient_name, measurement),
            	CONSTRAINT fk_room_code FOREIGN KEY (room_code) REFERENCES Room(code) ON DELETE CASCADE
        	) STRICT;
    	`);

		const oldTableExists = connection
		.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'RoomIngredient\'')
		.get();

		if (oldTableExists) {
			connection.exec(`
				INSERT INTO RoomIngredient_new (room_code, ingredient_name, measurement, amount)
				SELECT room_code,
				       ingredient_name,
				       measurement,
				       CAST(amount AS REAL) as amount
				FROM RoomIngredient;
			`);

			connection.exec(`DROP TABLE RoomIngredient;`);
		}

		connection.exec(`ALTER TABLE RoomIngredient_new RENAME TO RoomIngredient;`);
	}

	public static migrateAddInstructionsToRecipe(connection: BetterSqlite3.Database): void {
		// 1. Create the new schema structure containing the strict instructions column definition
		connection.exec(`
			CREATE TABLE IF NOT EXISTS Recipe_new (
				                                      id          INTEGER PRIMARY KEY AUTOINCREMENT,
				                                      name        TEXT NOT NULL,
				                                      description TEXT,
				                                      image       TEXT,
				                                      visibility  TEXT NOT NULL CHECK(visibility IN ('public', 'private')),
				                                      author      INTEGER NOT NULL,
				                                      instructions TEXT NOT NULL DEFAULT '',

				                                      CONSTRAINT fk_recipe_author FOREIGN KEY (author) REFERENCES User(id) ON DELETE CASCADE
			) STRICT;
		`);

		// 2. Identify if the legacy table structure exists in sqlite_master
		const oldTableExists = connection
		.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'Recipe\'')
		.get();

		if (oldTableExists) {
			// Check if instructions column accidentally exists in the old table to map it smoothly
			const pragma = connection.prepare('PRAGMA table_info(Recipe)').all() as any[];
			const oldHasInstructions = pragma.some(col => col.name === 'instructions');

			// 3. Re-index and safely copy row properties into the new schema layer
			connection.exec(`
          		INSERT INTO Recipe_new (id, name, description, image, visibility, author, instructions)
         		SELECT id,
                 	name,
                 	description,
                 	image,
                 	visibility,
                 	author,
                 	${oldHasInstructions ? 'instructions' : '\'\''}
          			FROM Recipe;
       		`);

			// 4. Drop the outdated definition mapping
			connection.exec(`DROP TABLE Recipe;`);
		}

		// 5. Promote the staged schema definition to the official active designation
		connection.exec(`ALTER TABLE Recipe_new RENAME TO Recipe;`);
		console.log('✓ Recipe instructions migration completed');
	}
}

type RawStatement<TResult> = BetterSqlite3.Statement<unknown[], TResult>;
type RunResult = ReturnType<RawStatement<unknown>['run']>;

export interface ITypedStatement<TResult = unknown, TParams = unknown> {
	readonly _params?: TParams;
	get(): TResult | undefined;
	all(): TResult[];
	run(): RunResult;
}
