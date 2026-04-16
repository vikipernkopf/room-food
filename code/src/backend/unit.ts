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
		console.log('Ensuring database tables and running migrations...');
		connection.exec(
			`create table if not exists Room
			 (
				 code            text not null,
				 name            text not null,
				 profile_picture text,

				 constraint pk_code primary key (code)
			 ) strict`
		);
		DB.migrateRoomTableToProfilePicture(connection);
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

		DB.migrateUserTableToProfileColumns(connection);

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
			`create table if not exists Meal
			 (
				 id          integer primary key autoincrement,
				 time        text not null,
				 name        text,
				 responsible text,
				 roomCode    text not null,
				 constraint fk_responsible foreign key (responsible) REFERENCES User (username) ON DELETE CASCADE

			 ) strict`
		);

		DB.migrateRecipeAndMealTables(connection);
	}

	private static migrateRoomTableToProfilePicture(connection: BetterSqlite3.Database): void {
		const columns = connection.prepare(`pragma table_info(Room)`).all() as Array<{
			name: string
		}>;
		const existingColumns = new Set(columns.map(column => column.name));

		if (!existingColumns.has('profile_picture')) {
			connection.exec(`alter table Room
				add column profile_picture text;`);
		}
	}

	private static migrateUserTableToProfileColumns(connection: BetterSqlite3.Database): void {
		const columns = connection.prepare(`pragma table_info(User)`).all() as Array<{
			name: string
		}>;
		const existingColumns = new Set(columns.map(column => column.name));

		const migrations: string[] = [];

		if (!existingColumns.has('email')) {
			migrations.push(`alter table User
				add column email text;`);
		}

		if (!existingColumns.has('first_name')) {
			migrations.push(`alter table User
				add column first_name text;`);
		}

		if (!existingColumns.has('last_name')) {
			migrations.push(`alter table User
				add column last_name text;`);
		}

		if (!existingColumns.has('bio')) {
			migrations.push(`alter table User
				add column bio text;`);
		}

		if (!existingColumns.has('dob')) {
			migrations.push(`alter table User
				add column dob text;`);
		}

		if (!existingColumns.has('profile_picture')) {
			migrations.push(`alter table User
				add column profile_picture text;`);
		}

		if (migrations.length > 0) {
			connection.exec(migrations.join('\n'));
		}

		connection.exec(`create unique index if not exists uq_user_email on User (lower(email));`);
	}

	private static migrateRecipeAndMealTables(connection: BetterSqlite3.Database): void {
		connection.pragma('foreign_keys = OFF');
		try {
			const mealTableInfo = connection.prepare(
				`select sql
			 from sqlite_master
			 where type = 'table'
			   and name = 'Meal'`
			).get() as {
				sql?: string
			} | undefined;

			const recipeTableInfo = connection.prepare(
				`select sql
			 from sqlite_master
			 where type = 'table'
			   and name = 'Recipe'`
			).get() as {
				sql?: string
			} | undefined;

			const recipeColumns = connection.prepare(`pragma table_info(Recipe)`).all() as Array<{
				name: string
			}>;
			const recipeColumnNames = new Set(recipeColumns.map(column => column.name.toLowerCase()));

			const mealSql = (mealTableInfo?.sql ?? '').toLowerCase();
			const recipeSql = (recipeTableInfo?.sql ?? '').toLowerCase();

			// Check if Meal table has legacy unique constraint on time
			const mealHasLegacyUniqueTime = mealSql.includes('uq_mealtime') || mealSql.includes('unique (time)');

			const recipeHasMealTypeColumn = recipeColumnNames.has('mealtype');
			const recipeHasDescriptionColumn = recipeColumnNames.has('description');
			const recipeHasImageColumn = recipeColumnNames.has('image');
			const recipeHasVisibilityColumn = recipeColumnNames.has('visibility');
			const recipeHasAuthorColumn = recipeColumnNames.has('author');
			const recipeHasLegacyIdDefault = recipeSql.includes('default (abs(random())');
			const recipeHasLegacyUqRecipe = recipeSql.includes('uq_recipe');
			const recipeNeedsMigration =
				recipeHasMealTypeColumn ||
				!recipeHasDescriptionColumn ||
				!recipeHasImageColumn ||
				!recipeHasVisibilityColumn ||
				!recipeHasAuthorColumn ||
				recipeHasLegacyIdDefault ||
				recipeHasLegacyUqRecipe;

			if (mealHasLegacyUniqueTime) {
				console.log('Migrating Meal table: removing legacy unique constraint on time...');
				connection.exec(`
				alter table Meal
					rename to Meal_legacy;

				create table Meal
				(
					id          integer primary key autoincrement,
					time        text not null,
					name        text,
					responsible text,
					roomCode    text not null,
					constraint fk_responsible foreign key (responsible) REFERENCES User (username) ON DELETE CASCADE
				) strict;

				insert into Meal(id, time, name, responsible, roomCode)
				select id, time, name, responsible, roomCode
				from Meal_legacy;

				drop table Meal_legacy;
			`);
				console.log('✓ Meal migration completed');
			}

			if (recipeNeedsMigration) {
				console.log(
					'Migrating Recipe table: converting mealType to new schema with RecipeMealType junction table...');
				connection.exec(`
				alter table Recipe
					rename to Recipe_legacy;

				create table Recipe
				(
					id          integer primary key autoincrement,
					name        text not null,
					description text,
					image       text,
					visibility  text not null default 'private'
						constraint ck_recipe_visibility check (visibility in ('public', 'private')),
					author      integer not null,

					constraint fk_author foreign key (author) REFERENCES User (id) ON DELETE CASCADE
				) strict;
			`);

				const legacyRecipeColumns = connection.prepare(`pragma table_info(Recipe_legacy)`).all() as Array<{
					name: string
				}>;
				const legacyRecipeColumnNames = new Set(legacyRecipeColumns.map(column => column.name.toLowerCase()));

				const legacyDescriptionExpr = legacyRecipeColumnNames.has('description') ? 'description' : 'null';
				const legacyImageExpr = legacyRecipeColumnNames.has('image') ? 'image' : 'null';
				const legacyVisibilityExpr = legacyRecipeColumnNames.has('visibility')
					? `case
						when lower(trim(legacy.visibility)) = 'public' then 'public'
						when lower(trim(legacy.visibility)) = 'private' then 'private'
						else 'private'
					end`
					: `'private'`;
				const legacyAuthorExpr = DB.getLegacyRecipeAuthorExpr(legacyRecipeColumnNames, 'legacy');

				if (legacyAuthorExpr === null) {
					console.warn(
						'Recipe migration: no legacy author column found; existing legacy recipes were skipped.'
					);
				} else {
					connection.exec(`
					insert into Recipe(id, name, description, image, visibility, author)
					select id, name, description, image, visibility, resolved_author
					from (
						select legacy.id                                            as id,
						       legacy.name                                          as name,
						       ${legacyDescriptionExpr}                              as description,
						       ${legacyImageExpr}                                    as image,
						       ${legacyVisibilityExpr}                               as visibility,
						       ${legacyAuthorExpr}                                   as resolved_author
						from Recipe_legacy legacy
					)
					where resolved_author is not null;
				`);
				}

				if (legacyRecipeColumnNames.has('mealtype')) {
					connection.exec(`
					insert into RecipeMealType(recipe_id, meal_type)
					select id as recipe_id, mealType as meal_type
					from Recipe_legacy;
				`);
				}

				connection.exec(`drop table Recipe_legacy;`);
				console.log('✓ Recipe migration completed');
			}

			// Ensure RecipeMealType table exists for recipes
			const recipeMealTypeExists = connection.prepare(
				`select name from sqlite_master where type = 'table' and name = 'RecipeMealType'`
			).get();
			const recipeMealTypeFkRows = connection.prepare(
				`pragma foreign_key_list(RecipeMealType)`
			).all() as Array<{
				table: string
			}>;
			const recipeMealTypeFkTargetsRecipe = recipeMealTypeFkRows.some(
				fk => fk.table.toLowerCase() === 'recipe'
			);
			const recipeMealTypeNeedsFkRepair = !!recipeMealTypeExists && !recipeMealTypeFkTargetsRecipe;

			if (!recipeMealTypeExists && !recipeNeedsMigration) {
				// Table should have been created in ensureTablesCreated, this is just a safety check
				connection.exec(`
				create table if not exists RecipeMealType
				(
					recipe_id integer not null,
					meal_type text    not null,

					constraint pk_recipe_meal_type primary key (recipe_id, meal_type),
					constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
				) strict
			`);
			}

			if (recipeMealTypeNeedsFkRepair) {
				console.log('Repairing RecipeMealType FK target to reference Recipe table...');
				connection.exec(`
				alter table RecipeMealType
					rename to RecipeMealType_legacy;

				create table RecipeMealType
				(
					recipe_id integer not null,
					meal_type text    not null,

					constraint pk_recipe_meal_type primary key (recipe_id, meal_type),
					constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
				) strict;

				insert into RecipeMealType(recipe_id, meal_type)
				select legacy.recipe_id, legacy.meal_type
				from RecipeMealType_legacy legacy
				where exists(
					select 1 as existing_recipe
					from Recipe r
					where r.id = legacy.recipe_id
				);

				drop table RecipeMealType_legacy;
			`);
				console.log('✓ RecipeMealType FK repair completed');
			}

			// Ensure MealRecipe table exists
			const mealRecipeExists = connection.prepare(
				`select name from sqlite_master where type = 'table' and name = 'MealRecipe'`
			).get();

			if (!mealRecipeExists) {
				connection.exec(`
				create table if not exists MealRecipe
				(
					meal_id   integer not null,
					recipe_id integer not null,

					constraint pk_meal_recipe primary key (meal_id, recipe_id),
					constraint fk_meal_id foreign key (meal_id) references Meal (id) ON DELETE CASCADE,
					constraint fk_recipe_id foreign key (recipe_id) references Recipe (id) ON DELETE CASCADE
				) strict
			`);
			}
			console.log('Database schema migration check completed');
		} finally {
			connection.pragma('foreign_keys = ON');
		}
	}

	private static getLegacyRecipeAuthorExpr(
		legacyRecipeColumnNames: Set<string>, sourceAlias: string): string | null {
		if (legacyRecipeColumnNames.has('author')) {
			return `${sourceAlias}.author`;
		}

		const directIdColumns = ['author_id', 'authorid', 'user_id', 'userid'];
		const directIdColumn = directIdColumns.find(column => legacyRecipeColumnNames.has(column));
		if (directIdColumn !== undefined) {
			return `${sourceAlias}.${directIdColumn}`;
		}

		const usernameColumns = ['author_username', 'authorusername', 'username', 'author_name', 'authorname'];
		const usernameColumn = usernameColumns.find(column => legacyRecipeColumnNames.has(column));
		if (usernameColumn !== undefined) {
			return `(select u.id from User u
				where lower(u.username) = lower(${sourceAlias}.${usernameColumn})
				limit 1)`;
		}

		return null;
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
