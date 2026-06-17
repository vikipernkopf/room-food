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

		connection.exec(
			`create table if not exists UserIngredient
			 (
				 username        text not null,
				 ingredient_name text not null,
				 measurement     text not null,
				 amount          text not null,
				 used_at         text not null default (datetime('now')),

				 constraint pk_user_ingredient primary key (username, ingredient_name, measurement),
				 constraint fk_user_ingredient_user foreign key (username) references User(username) ON DELETE CASCADE
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

		connection.exec(`
			CREATE TABLE IF NOT EXISTS PersonalBoughtIngredient (
				username        TEXT NOT NULL,
				ingredient_name TEXT NOT NULL,
				measurement     TEXT NOT NULL,
				amount          TEXT NOT NULL,
				bought_at       TEXT NOT NULL,
				CONSTRAINT pk_personal_bought PRIMARY KEY (username, ingredient_name, measurement),
				CONSTRAINT fk_personal_bought_user FOREIGN KEY (username) REFERENCES User(username) ON DELETE CASCADE
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

		this.migrateIngredientsTables(connection);

		console.log('Schema creation with migrations completed');
	}

	private static migrateIngredientsTables(connection: BetterSqlite3.Database): void {
		console.log('Running ingredient table migrations...');

		connection.exec('PRAGMA foreign_keys = OFF');

		try {
			connection.exec(`DROP TABLE IF EXISTS UserIngredient`);
			console.log('Dropped UserIngredient table (if existed).');
		} catch (e) {
			console.log('UserIngredient table did not exist or already dropped.');
		}

		try {
			connection.exec(`DROP TABLE IF EXISTS PersonalBoughtIngredient`);
			console.log('Dropped PersonalBoughtIngredient table (if existed).');
		} catch (e) {
			console.log('PersonalBoughtIngredient table did not exist or already dropped.');
		}

		connection.exec('PRAGMA foreign_keys = ON');
		console.log('Ingredient table migrations completed.');
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
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='RoomIngredient'")
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
