import { ServiceBase } from '../service-base';
import { Unit } from '../unit';
import { LoginSignUpService } from '../login-sign-up/login-sign-up-service';
import { Recipe, RecipeCreatePayload, RecipeUpdatePayload, RecipeVisibility } from '../model';

export class RecipesService extends ServiceBase {
	private readonly users: LoginSignUpService;

	constructor(unit: Unit) {
		super(unit);
		this.users = new LoginSignUpService(this.unit);
	}

	public getRecipesByAuthorUsername(username: string): Recipe[] {
		const viewerId = this.users.getUserIdByUsername(username);
		if (viewerId === undefined) {
			return [];
		}

		const recipes = this.unit.prepare<{
			id: number;
			name: string;
			description?: string | null;
			image?: string | null;
			visibility: RecipeVisibility;
			author: number;
			authorUsername: string;
			mealTypes: string | null;
			isSavedByUser: number;
			isOwnedByUser: number;
		}>(`
			select r.id,
			       r.name,
			       r.description,
			       r.image,
			       r.visibility,
			       r.author,
			       u.username as authorUsername,
			       coalesce(group_concat(rmt.meal_type, '||'), '') as mealTypes
			       ,case when sr.user_id is null then 0 else 1 end as isSavedByUser
			       ,case when r.author = :viewerId then 1 else 0 end as isOwnedByUser
			from Recipe r
			join User u on u.id = r.author
			left join RecipeMealType rmt on r.id = rmt.recipe_id
			left join SavedRecipe sr on sr.recipe_id = r.id and sr.user_id = :viewerId
			where r.author = :viewerId
			   or (r.visibility = 'public' and sr.user_id = :viewerId)
			group by r.id, r.name, r.description, r.image, r.visibility, r.author, u.username,
			         isSavedByUser, isOwnedByUser
			order by r.id desc
		`, { viewerId }).all();

		return RecipesService.mapRowsToRecipes(recipes);
	}

	public getPublicRecipes(searchTerm: string, viewerUsername?: string): Recipe[] {
		const normalizedSearch = searchTerm.trim().toLowerCase();
		if (!normalizedSearch) {
			return [];
		}

		const viewerId = viewerUsername ? this.users.getUserIdByUsername(viewerUsername) : undefined;

		const recipes = this.unit.prepare<{
			id: number;
			name: string;
			description?: string | null;
			image?: string | null;
			visibility: RecipeVisibility;
			author: number;
			authorUsername: string;
			mealTypes: string | null;
			isSavedByUser: number;
			isOwnedByUser: number;
		}>(`
			select r.id,
			       r.name,
			       r.description,
			       r.image,
			       r.visibility,
			       r.author,
			       u.username as authorUsername,
			       coalesce(group_concat(rmt.meal_type, '||'), '') as mealTypes
			       ,case when sr.user_id is null then 0 else 1 end as isSavedByUser
			       ,case when r.author = :viewerId then 1 else 0 end as isOwnedByUser
			from Recipe r
			join User u on u.id = r.author
			left join RecipeMealType rmt on r.id = rmt.recipe_id
			left join SavedRecipe sr on sr.recipe_id = r.id and sr.user_id = :viewerId
			where r.visibility = 'public'
			  and lower(r.name) like '%' || :search || '%'
			group by r.id, r.name, r.description, r.image, r.visibility, r.author, u.username,
			         isSavedByUser, isOwnedByUser
			order by r.id desc
		`, {
			search: normalizedSearch,
			viewerId: viewerId ?? -1
		}).all();

		return RecipesService.mapRowsToRecipes(recipes);
	}

	public savePublicRecipeForUser(username: string, recipeId: number):
		true | 'user_not_found' | 'recipe_not_found' | 'forbidden' | 'error' {
		const userId = this.users.getUserIdByUsername(username);
		if (userId === undefined) {
			return 'user_not_found';
		}

		const recipeRow = this.unit.prepare<{
			author: number;
			visibility: RecipeVisibility;
		}>(
			`select author, visibility
			 from Recipe
			 where id = :recipeId`,
			{ recipeId }
		).get();

		if (!recipeRow) {
			return 'recipe_not_found';
		}

		if (recipeRow.visibility !== 'public' || recipeRow.author === userId) {
			return 'forbidden';
		}

		try {
			this.unit.prepare(
				`insert or ignore into SavedRecipe(user_id, recipe_id)
				 values (:userId, :recipeId)`,
				{
					userId,
					recipeId
				}
			).run();
		} catch {
			return 'error';
		}

		return true;
	}

	public getAllRecipesRaw(): Array<{
		id: number;
		name: string;
		description: string | null;
		image: string | null;
		visibility: RecipeVisibility;
		author: number;
	}> {
		return this.unit.prepare<{
			id: number;
			name: string;
			description: string | null;
			image: string | null;
			visibility: RecipeVisibility;
			author: number;
		}>(`
			select id,
			       name,
			       description,
			       image,
			       visibility,
			       author
			from Recipe
			order by id desc
		`).all();
	}

	public addRecipe(recipe: RecipeCreatePayload): number | 'author_not_found' | 'error' {
		const authorId = this.users.getUserIdByUsername(recipe.authorUsername);
		if (authorId === undefined) {
			return 'author_not_found';
		}

		const mealTypes = Array.from(
			new Set((recipe.mealTypes ?? []).map(mealType => mealType.trim()).filter(Boolean))
		);

		let id: number;
		try {
			const insertedRecipe = this.unit.prepare<{
				id: number;
			}, {
				name: string;
				description: string | null;
				image: string | null;
				visibility: RecipeVisibility;
				author: number;
			}>(
				`insert into Recipe(name, description, image, visibility, author)
				 values (:name, :description, :image, :visibility, :author)
				 returning id`,
				{
					name: recipe.name.trim(),
					description: recipe.description?.trim() || null,
					image: recipe.image?.trim() || null,
					visibility: RecipesService.normalizeVisibility(recipe.visibility),
					author: authorId
				}
			).get();

			if (insertedRecipe === undefined) {
				return 'error';
			}

			id = insertedRecipe.id;
		} catch {
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
				     image = :image,
				     visibility = :visibility
				 where id = :id`,
				{
					name: recipe.name.trim(),
					description: recipe.description?.trim() || null,
					image: recipe.image?.trim() || null,
					visibility: RecipesService.normalizeVisibility(recipe.visibility),
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

	private static normalizeVisibility(visibility: RecipeVisibility | string | undefined): RecipeVisibility {
		return visibility === 'public' ? 'public' : 'private';
	}

	private static mapRowsToRecipes(rows: Array<{
		id: number;
		name: string;
		description?: string | null;
		image?: string | null;
		visibility: RecipeVisibility;
		author: number;
		authorUsername: string;
		mealTypes: string | null;
		isSavedByUser: number;
		isOwnedByUser: number;
	}>): Recipe[] {
		return rows.map(recipe => ({
			id: recipe.id,
			name: recipe.name,
			description: recipe.description ?? undefined,
			image: recipe.image ?? undefined,
			visibility: RecipesService.normalizeVisibility(recipe.visibility),
			author: recipe.author,
			authorUsername: recipe.authorUsername,
			mealTypes: recipe.mealTypes ? recipe.mealTypes.split('||').filter(Boolean) : [],
			isSavedByUser: !!recipe.isSavedByUser,
			isOwnedByUser: !!recipe.isOwnedByUser
		}));
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
