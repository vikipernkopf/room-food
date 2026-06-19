import { ServiceBase } from '../service-base';
import { Unit } from '../unit';
import { Ingredient } from '../model';

//noinspection SqlMissingColumnAliases
export class IngredientsService extends ServiceBase {
	constructor(unit: Unit) {
		super(unit);
	}

	// ------------------------------------------------------------------
	// Bought ingredients (now from MealIngredientAssignment.bought = 1)
	// ------------------------------------------------------------------

	public getBoughtIngredientsForRoom(roomCode: string): Ingredient[] {
		return this.unit.prepare(`
			select i.id,
			       i.name,
			       mia.measurement,
			       sum(cast(mia.amount as real)) as amount
			from MealIngredientAssignment mia
				     join Meal m on mia.meal_id = m.id
				     join Ingredient i on mia.ingredient_id = i.id
			where m.roomCode = :roomCode
			  and mia.bought = 1
			group by i.id, i.name, mia.measurement
			order by i.name
		`, { roomCode }).all() as unknown as Ingredient[];
	}

	public removeBoughtIngredientsFromRoom(ingredientName: string, measurement: string, roomCode: string): boolean {
		const ingredientId = this.getIngredientIdByName(ingredientName);
		if (!ingredientId) {
			return false;
		}

		const [success] = this.executeStmt(this.unit.prepare(`
			update MealIngredientAssignment
			set bought = 0
			where ingredient_id = :ingredientId
			  and measurement = :measurement
			  and meal_id in (select id from Meal where roomCode = :roomCode)
		`, {
			roomCode,
			ingredientId,
			measurement
		}));

		return success;
	}

	public getAllRoomIngredientsForUser(username: string): Ingredient[] {
		return this.unit.prepare(`
			select i.name, ri.measurement, cast(ri.amount as real) as amount
			from RoomIngredient ri
				     join Ingredient i on ri.ingredient_id = i.id
				     join RoomUserMember rum on ri.room_code = rum.room_code
			where rum.username = :username
		`, { username }).all() as unknown as Ingredient[];
	}

	public getBoughtIngredientsForUserRooms(username: string): Ingredient[] {
		return this.unit.prepare(`
			select i.name, mia.measurement, cast(mia.amount as real) as amount
			from MealIngredientAssignment mia
				     join Meal m on mia.meal_id = m.id
				     join Ingredient i on mia.ingredient_id = i.id
				     join RoomUserMember rum on m.roomCode = rum.room_code
			where rum.username = :username
			  and mia.bought = 1
		`, { username }).all() as unknown as Ingredient[];
	}

	// ------------------------------------------------------------------
	// Ingredient lookup / search
	// ------------------------------------------------------------------

	public getIngredientsForPrefix(prefix: string, user: string): Ingredient[] {
		return this.unit.prepare(`
			select i.name, i.default_measurement as measurement, 0 as amount
			from Ingredient i
			where lower(i.name) like lower(:n || '%')
			  and (i.user IS NULL or i.user = :u)
			order by i.name
		`, {
			n: prefix,
			u: user
		}).all() as unknown as Ingredient[];
	}

	public addIngredient(name: string, measurement: string, user: string | null): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			insert into Ingredient(name, default_measurement, user)
			VALUES (:n, :m, :u);
		`, {
			n: name,
			m: measurement,
			u: user
		}));

		return success;
	}

	// ------------------------------------------------------------------
	// Recipe ingredients
	// ------------------------------------------------------------------

	public addIngredientToRecipe(ingredient: Ingredient, recipeId: number, user: string): boolean {
		const isOwner = this.unit.prepare(`
			select 1
			from Recipe r
				     join User u on u.id = r.author
			where r.id = :recipeId
			  and u.username = :user
		`, {
			recipeId,
			user
		}).get();

		if (!isOwner) {
			return false;
		}

		const ingredientId = this.getOrCreateIngredientId(ingredient.name, ingredient.measurement, user);

		const [success] = this.executeStmt(this.unit.prepare(`
			insert into RecipeIngredient(recipe_id, ingredient_id, measurement, amount)
			VALUES (:recipeId, :ingredientId, :measurement, :amount)
		`, {
			recipeId,
			ingredientId,
			measurement: ingredient.measurement,
			amount: ingredient.amount
		}));

		return success;
	}

	public getIngredientsForRecipe(recipeId: number): Ingredient[] {
		return this.unit.prepare(`
			select i.name, ri.measurement, ri.amount
			from RecipeIngredient ri
				     join Ingredient i on ri.ingredient_id = i.id
			where ri.recipe_id = :recipeId
		`, { recipeId }).all() as unknown as Ingredient[];
	}

	public getDefaultMeasurement(name: string): string {
		const result = this.unit.prepare(`
			select default_measurement
			from Ingredient
			where name = :name
		`, { name }).get() as {
			default_measurement: string
		} | undefined;

		return result?.default_measurement || '';
	}

	// ------------------------------------------------------------------
	// Ingredients to buy (shopping list) — assigned but not yet bought
	// ------------------------------------------------------------------

	public getIngredientsToBuyForUser(username: string): Array<{
		mealId: number;
		ingredientId: number;
		name: string;
		measurement: string;
		amount: string;
		bought: number;
	}> {
		return this.unit.prepare<{
			mealId: number;
			ingredientId: number;
			name: string;
			measurement: string;
			amount: string;
			bought: number;
		}>(`
			SELECT
				mia.meal_id AS mealId,
				mia.ingredient_id AS ingredientId,
				i.name AS name,
				mia.measurement AS measurement,
				mia.amount AS amount,
				mia.bought AS bought
			FROM MealIngredientAssignment mia
				     JOIN Ingredient i ON mia.ingredient_id = i.id
			WHERE mia.assigned_to_username = :username
			  AND mia.bought = 0
		`, { username }).all();
	}

	// ------------------------------------------------------------------
	// Room ingredients
	// ------------------------------------------------------------------

	public getIngredientsForRoom(roomCode: string): Ingredient[] {
		return this.unit.prepare(`
			select i.id,
			       i.name,
			       ri.measurement,
			       ri.amount
			from RoomIngredient ri
				     join Ingredient i on ri.ingredient_id = i.id
			where ri.room_code = :roomCode
			order by i.name
		`, { roomCode }).all() as unknown as Ingredient[];
	}

	public addIngredientToRoom(ingredient: Ingredient, roomCode: string): boolean {
		const ingredientId = this.getOrCreateIngredientId(ingredient.name, ingredient.measurement, null);

		const [success] = this.executeStmt(this.unit.prepare(`
			insert into RoomIngredient (room_code, ingredient_id, measurement, amount)
			VALUES (:roomCode, :ingredientId, :measurement, :amount)
			ON CONFLICT DO UPDATE SET amount = CAST(amount AS REAL) + CAST(excluded.amount AS REAL)
		`, {
			roomCode,
			ingredientId,
			measurement: ingredient.measurement,
			amount: ingredient.amount
		}));

		return success;
	}

	public deleteIngredientFromRoom(ingredientId: number, roomCode: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			delete
			from RoomIngredient
			where room_code = :roomCode
			  and ingredient_id = :ingredientId
		`, {
			roomCode,
			ingredientId
		}));

		return success;
	}

	public updateIngredientAmountInRoom(ingredientId: number, roomCode: string, newAmount: number): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			update RoomIngredient
			set amount = :newAmount
			where room_code = :roomCode
			  and ingredient_id = :ingredientId
		`, {
			roomCode,
			ingredientId,
			newAmount
		}));

		return success;
	}

	// ------------------------------------------------------------------
	// Meal ingredient assignment (assign recipe ingredients to users)
	// ------------------------------------------------------------------

	public assignIngredientToUser(mealId: number, ingredientId: number, username: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			insert into MealIngredientAssignment(meal_id, ingredient_id, assigned_to_username, bought)
			VALUES (:mealId, :ingredientId, :username, 0)
			ON CONFLICT DO UPDATE SET bought = 0
		`, {
			mealId,
			ingredientId,
			username
		}));

		return success;
	}

	public getAssignedIngredientsForMeal(mealId: number): {
		ingredient: Ingredient;
		assignedTo: string;
		bought: boolean
	}[] {
		return this.unit.prepare(`
			select i.name, mia.measurement, mia.amount, mia.assigned_to_username as assignedTo, mia.bought
			from MealIngredientAssignment mia
				     join Ingredient i on mia.ingredient_id = i.id
			where mia.meal_id = :mealId
		`, { mealId }).all() as unknown as {
			ingredient: Ingredient;
			assignedTo: string;
			bought: boolean
		}[];
	}

	public markIngredientAsBought(mealId: number, ingredientId: number, username: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			update MealIngredientAssignment
			set bought = 1
			where meal_id = :mealId
			  and ingredient_id = :ingredientId
			  and assigned_to_username = :username
		`, {
			mealId,
			ingredientId,
			username
		}));

		return success;
	}

	public markIngredientAsNotBought(mealId: number, ingredientId: number, username: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			update MealIngredientAssignment
			set bought = 0
			where meal_id = :mealId
			  and ingredient_id = :ingredientId
			  and assigned_to_username = :username
		`, {
			mealId,
			ingredientId,
			username
		}));

		return success;
	}

	// ------------------------------------------------------------------
	// User-specific ingredient history
	// ------------------------------------------------------------------

	public saveUserIngredient(username: string, ingredient: Ingredient): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			insert into Ingredient(name, default_measurement, user)
			VALUES (:name, :measurement, :user)
			on conflict(name) do update set
				                            default_measurement = excluded.default_measurement,
				                            user = excluded.user
		`, {
			name: ingredient.name,
			measurement: ingredient.measurement,
			user: username
		}));

		return success;
	}

	public getUserIngredientsForPrefix(prefix: string, username: string): Ingredient[] {
		return this.unit.prepare(`
			select name, default_measurement as measurement, 0 as amount
			from Ingredient
			where lower(name) like lower(:prefix || '%')
			  and (user is null or user = :username)
			order by case when user = :username then 0 else 1 end, name
			limit 20
		`, {
			prefix,
			username
		}).all() as unknown as Ingredient[];
	}

	public getAllUserIngredients(username: string): Ingredient[] {
		return this.unit.prepare(`
			select name, default_measurement as measurement, 0 as amount
			from Ingredient
			where user is null or user = :username
			order by case when user = :username then 0 else 1 end, name
		`, {
			username
		}).all() as unknown as Ingredient[];
	}

	// ------------------------------------------------------------------
	// Helper: get or create ingredient by name (returns id)
	// ------------------------------------------------------------------

	private getIngredientIdByName(name: string): number | undefined {
		const result = this.unit.prepare(`
			select id from Ingredient where name = :name
		`, { name }).get() as {
			id: number
		} | undefined;
		return result?.id;
	}

	private getOrCreateIngredientId(name: string, measurement: string, user: string | null): number {
		const existing = this.getIngredientIdByName(name);
		if (existing) {
			return existing;
		}

		this.executeStmt(this.unit.prepare(`
			insert into Ingredient(name, default_measurement, user)
			VALUES (:name, :measurement, :user)
		`, {
			name,
			measurement,
			user
		}));

		const result = this.unit.prepare(`
			select id from Ingredient where name = :name
		`, { name }).get() as {
			id: number
		};
		return result.id;
	}
}
