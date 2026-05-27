import { ServiceBase } from '../service-base';
import { Unit } from '../unit';
import { LoginSignUpService } from '../login-sign-up/login-sign-up-service';
import { Ingredient } from '../model';
import { RoomsService } from '../rooms/rooms-service';

//noinspection SqlMissingColumnAliases
export class IngredientsService extends ServiceBase {
	private readonly users: LoginSignUpService;
	private readonly roomsService: RoomsService;

	constructor(unit: Unit) {
		super(unit);
		this.users = new LoginSignUpService(this.unit);
		this.roomsService = new RoomsService(this.unit);
	}

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
			insert into Ingredient(name, default_measurement, user) VALUES (:n, :m, :u);
		`, {
			n: name,
			m: measurement,
			u: user
		}));

		return success;
	}

	public addIngredientToRecipe(ingredient: Ingredient, recipeId: number, user: string): boolean {
		//only add ingredient if user is the one who created the recipe
		const isOwner = this.unit.prepare(`
			select 1 from Recipe r
			join User u on u.id = r.author
			where r.id = :recipeId and u.username = :user
		`, {
			recipeId,
			user
		}).get();

		if (!isOwner) {
			return false;
		}

		const [success] = this.executeStmt(this.unit.prepare(`
			insert into RecipeIngredient(recipe_id, ingredient_name, measurement, amount)
			VALUES (:recipeId, :ingredientName, :measurement, :amount)
		`, {
			recipeId,
			ingredientName: ingredient.name,
			measurement: ingredient.measurement,
			amount: ingredient.amount
		}));

		return success;
	}

	public getIngredientsForRecipe(recipeId: number): Ingredient[] {
		return this.unit.prepare(`
			select ri.ingredient_name as name, ri.measurement, ri.amount
			from RecipeIngredient ri
			where ri.recipe_id = :recipeId
		`, { recipeId }).all() as unknown as Ingredient[];
	}

	public getDefaultMeasurement(name: string): string {
		const result = this.unit.prepare(`
			select default_measurement from Ingredient
			where name = :name
		`, { name }).get() as {
			default_measurement: string
		} | undefined;

		return result?.default_measurement || '';
	}

	public getIngredientsToBuyForUser(username: string): Ingredient[] {
		// Only include ingredients that are explicitly assigned to the user via MealIngredientAssignment
		return this.unit.prepare(`
			select
				ri.ingredient_name as name,
				ri.measurement,
				sum(cast(ri.amount as real)) as amount
			from MealIngredientAssignment mia
			join MealRecipe mr on mr.meal_id = mia.meal_id
			join RecipeIngredient ri on ri.recipe_id = mr.recipe_id and ri.ingredient_name = mia.ingredient_name
			where mia.assigned_to_username = :username
			group by ri.ingredient_name, ri.measurement
			order by ri.ingredient_name
		`, { username }).all() as unknown as Ingredient[];
	}

	public getIngredientsForRoom(roomCode: string): Ingredient[] {
		return this.unit.prepare(`
			select ri.ingredient_name as name, ri.measurement, ri.amount
			from RoomIngredient ri
			where ri.room_code = :roomCode
		`, { roomCode }).all() as unknown as Ingredient[];
	}

	public addIngredientToRoom(ingredient: Ingredient, roomCode: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			insert into RoomIngredient(room_code, ingredient_name, measurement, amount)
			VALUES (:roomCode, :ingredientName, :measurement, :amount)
			on conflict(room_code, ingredient_name, measurement) do update set
			amount = amount + excluded.amount
		`, {
			roomCode,
			ingredientName: ingredient.name,
			measurement: ingredient.measurement,
			amount: ingredient.amount
		}));

		return success;
	}

	public deleteIngredientFromRoom(ingredientName: string, measurement: string, roomCode: string): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			delete from RoomIngredient
			where room_code = :roomCode and ingredient_name = :ingredientName and measurement = :measurement
		`, {
			roomCode,
			ingredientName,
			measurement
		}));

		return success;
	}

	public updateIngredientAmountInRoom(ingredientName: string, measurement: string, roomCode: string, newAmount: number): boolean {
		const [success] = this.executeStmt(this.unit.prepare(`
			update RoomIngredient
			set amount = :newAmount
			where room_code = :roomCode and ingredient_name = :ingredientName and measurement = :measurement
		`, {
			roomCode,
			ingredientName,
			measurement,
			newAmount
		}));

		return success;
	}
}
