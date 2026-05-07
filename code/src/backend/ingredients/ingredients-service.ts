import { Observable } from 'rxjs';
import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {LoginSignUpService} from '../login-sign-up/login-sign-up-service';
import {Ingredient} from '../model';

export class IngredientsService extends ServiceBase {
	private readonly users: LoginSignUpService;

	constructor(unit: Unit) {
		super(unit);
		this.users = new LoginSignUpService(this.unit);
	}

	public getIngredientsForPrefix(prefix:string, user:string):Ingredient[]{
		return this.unit.prepare(`
			select i.name, i.default_measurement as measurement, 0 as amount
			from Ingredient i
			where lower(i.name) like lower(:n || '%')
			  and (i.user IS NULL or i.user = :u)
			order by i.name
		`, {n: prefix, u: user}).all() as unknown as Ingredient[];
	}

	public addIngredient(name:string, measurement:string, user:string | null):boolean{
		const [success] = this.executeStmt(this.unit.prepare(`
			insert into Ingredient(name, default_measurement, user) VALUES (:n, :m, :u);
		`, {n:name, m:measurement, u:user}));

		return success;
	}

	public addIngredientToRecipe(ingredient:Ingredient, recipeId: number, user:string):boolean{
		//only add ingredient if user is the one who created the recipe
		const isOwner = this.unit.prepare(`
			select 1 from Recipe r
			join User u on u.id = r.author
			where r.id = :recipeId and u.username = :user
		`, {recipeId, user}).get();

		if (!isOwner) {
			return false;
		}

		const [success] = this.executeStmt(this.unit.prepare(`
			insert into RecipeIngredient(recipe_id, ingredient_name, measurement, amount)
			VALUES (:recipeId, :ingredientName, :measurement, :amount)
		`, {recipeId, ingredientName: ingredient.name, measurement: ingredient.measurement, amount: ingredient.amount}));

		return success;
	}

	public getIngredientsForRecipe(recipeId:number):Ingredient[]{
		return this.unit.prepare(`
			select ri.ingredient_name as name, ri.measurement, ri.amount
			from RecipeIngredient ri
			where ri.recipe_id = :recipeId
		`, {recipeId}).all() as unknown as Ingredient[];
	}

	public getDefaultMeasurement(name:string):string{
		const result = this.unit.prepare(`
			select default_measurement from Ingredient
			where name = :name
		`, {name}).get() as { default_measurement: string } | undefined;

		return result?.default_measurement || '';
	}

	public getIngredientsToBuyForUser(username: string): Ingredient[] {
		return this.unit.prepare(`
		select
			ri.ingredient_name as name,
			ri.measurement,
			sum(cast(ri.amount as real)) as amount
		from MealResponsibleUser mru
		join MealRecipe mr
			on mr.meal_id = mru.meal_id
		join RecipeIngredient ri
			on ri.recipe_id = mr.recipe_id
		where mru.username = :username
		group by ri.ingredient_name, ri.measurement
		order by ri.ingredient_name
	`, { username }).all() as unknown as Ingredient[];
	}
}
