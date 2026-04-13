import { ServiceBase } from '../service-base';
import { Unit } from '../unit';
import { LoginSignUpService } from '../login-sign-up/login-sign-up-service';
import { Recipe, RecipeCreatePayload, RecipeUpdatePayload } from '../model';

export class RecipesService extends ServiceBase {
	private readonly users: LoginSignUpService;

	constructor(unit: Unit) {
		super(unit);
		this.users = new LoginSignUpService(this.unit);
	}

	public getRecipesByAuthorUsername(username: string): Recipe[] {
		const authorId = this.users.getUserIdByUsername(username);
		if (authorId === undefined) {
			return [];
		}

		const recipes = this.unit.prepare<{
			id: number;
			name: string;
			description?: string | null;
			image?: string | null;
			author: number;
			mealTypes: string | null;
		}>(`
			select r.id,
			       r.name,
			       r.description,
			       r.image,
			       r.author,
			       coalesce(group_concat(rmt.meal_type, '||'), '') as mealTypes
			from Recipe r
			left join RecipeMealType rmt on r.id = rmt.recipe_id
			where r.author = :author
			group by r.id, r.name, r.description, r.image, r.author
			order by r.id desc
		`, { author: authorId }).all();

		return recipes.map(recipe => ({
			id: recipe.id,
			name: recipe.name,
			description: recipe.description ?? undefined,
			image: recipe.image ?? undefined,
			author: recipe.author,
			mealTypes: recipe.mealTypes ? recipe.mealTypes.split('||').filter(Boolean) : []
		}));
	}

	public addRecipe(recipe: RecipeCreatePayload): number | 'author_not_found' | 'error' {
		const authorId = this.users.getUserIdByUsername(recipe.authorUsername);
		if (authorId === undefined) {
			return 'author_not_found';
		}

		const mealTypes = Array.from(
			new Set((recipe.mealTypes ?? []).map(mealType => mealType.trim()).filter(Boolean))
		);

		let success: boolean;
		let id: number;

		[success, id] = this.executeStmt(
			this.unit.prepare(
				`insert into Recipe(name, description, image, author)
				 values (:name, :description, :image, :author)`,
				{
					name: recipe.name.trim(),
					description: recipe.description?.trim() || null,
					image: recipe.image?.trim() || null,
					author: authorId
				}
			)
		);

		if (!success) {
			return 'error';
		}

		for (const mealType of mealTypes) {
			const [linked] = this.executeStmt(
				this.unit.prepare(
					`insert into RecipeMealType(recipe_id, meal_type)
					 values (:recipeId, :mealType)`,
					{
						recipeId: id,
						mealType
					}
				)
			);

			if (!linked) {
				return 'error';
			}
		}

		return id;
	}

	private checkRecipeExists(recipeId: number): boolean {
		return this.unit.prepare(`
			select *
			from Recipe
			where id = :id
		`, { id: recipeId }).get() !== undefined;
	}

	public updateRecipe(recipeId: number, recipe: RecipeUpdatePayload): true | 'not_found' | 'error' {
		if (!this.checkRecipeExists(recipeId)) {
			return 'not_found';
		}

		const mealTypes = Array.from(
			new Set((recipe.mealTypes ?? []).map(mealType => mealType.trim()).filter(Boolean))
		);

		try {
			this.unit.prepare(
				`update Recipe
				 set name = :name,
				     description = :description,
				     image = :image
				 where id = :id`,
				{
					name: recipe.name.trim(),
					description: recipe.description?.trim() || null,
					image: recipe.image?.trim() || null,
					id: recipeId
				}
			).run();

			this.unit.prepare(`delete from RecipeMealType where recipe_id = :id`, { id: recipeId }).run();
		} catch {
			return 'error';
		}

		for (const mealType of mealTypes) {
			const [linked] = this.executeStmt(
				this.unit.prepare(
					`insert into RecipeMealType(recipe_id, meal_type)
					 values (:recipeId, :mealType)`,
					{
						recipeId,
						mealType
					}
				)
			);

			if (!linked) {
				return 'error';
			}
		}

		return true;
	}

	public deleteRecipe(recipeId: number): true | 'not_found' | 'error' {
		if (!this.checkRecipeExists(recipeId)) {
			return 'not_found';
		}

		const [success] = this.executeStmt(
			this.unit.prepare(`delete from Recipe where id = :id`, { id: recipeId })
		);

		if (!success) {
			return 'error';
		}

		return true;
	}
}
