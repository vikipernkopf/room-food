import BetterSqlite3 from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbFileName = join(__dirname, '..', '..', 'room-food.db');

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

  public getLastRowId(): number {
    const stmt = this.prepare<{ id: number }>("SELECT last_insert_rowid() as \"id\"");
    const result = stmt.get();
    if (!result) {
      throw new Error("Unable to retrieve last inserted row id");
    }
    return result.id;
  }

  public complete(commit: boolean | null = null): void {
    if (this.completed) return;
    this.completed = true;

    if (commit !== null) {
      (commit ? DB.commitTransaction(this.db) : DB.rollbackTransaction(this.db));
    } else if (!this.readOnly) {
      throw new Error("transaction has been opened, requires information if commit or rollback needed");
    }
    this.db.close();
  }
}

class DB {
  public static createDBConnection(): BetterSqlite3.Database {
    const db = new BetterSqlite3(dbFileName, {
      fileMustExist: false,
      verbose: (s: unknown) => DB.logStatement(s)
    });

    db.pragma("foreign_keys = ON");
    DB.ensureTablesCreated(db);
    return db;
  }

  public static beginTransaction(connection: BetterSqlite3.Database): void {
    connection.exec("begin transaction;");
  }

  public static commitTransaction(connection: BetterSqlite3.Database): void {
    connection.exec("commit;");
  }

  public static rollbackTransaction(connection: BetterSqlite3.Database): void {
    connection.exec("rollback;");
  }

  private static logStatement(statement: string | unknown): void {
    if (typeof statement !== "string") return;
    const start = statement.slice(0, 6).trim().toLowerCase();
    if (start.startsWith("pragma") || start.startsWith("create")) return;
    console.log(`SQL: ${statement}`);
  }

  private static ensureTablesCreated(connection: BetterSqlite3.Database): void {
    connection.exec(
      `create table if not exists User
            (
                id integer primary key autoincrement,
                username text not null,
                password text not null,

                constraint uq_user unique (username)

                ) strict`
    );
    connection.exec(
      `create table if not exists Recipe
       (
         id integer primary key autoincrement,
         name text not null,
         mealType text not null,
         authorId integer not null,

         constraint uq_recipe unique (id, authorId),
         constraint fk_authorId foreign key (authorId) REFERENCES User(id) ON DELETE CASCADE

       ) strict`
    );
    connection.exec(
      `create table if not exists Meal
            (
                id integer primary key autoincrement,
                time text not null,
                recipeId integer not null,
                responsibleId integer not null,
                roomId integer,

                constraint uq_mealtime unique (time),
                constraint fk_responsibleId foreign key (responsibleId) REFERENCES User(id) ON DELETE CASCADE,
                constraint fk_recipeId foreign key (recipeId) REFERENCES Recipe(id) ON DELETE CASCADE

                ) strict`
    );
  }
}

type RawStatement<TResult> = BetterSqlite3.Statement<unknown[], TResult>;
type RunResult = ReturnType<RawStatement<unknown>["run"]>;

export interface ITypedStatement<TResult = unknown, TParams = unknown> {
  readonly _params?: TParams;
  get(): TResult | undefined;
  all(): TResult[];
  run(): RunResult;
}
