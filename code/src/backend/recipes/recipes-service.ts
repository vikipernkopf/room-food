import { ServiceBase } from '../service-base';
import { Unit } from '../unit';
import { LoginSignUpService } from '../login-sign-up/login-sign-up-service';
import { Ingredient, Recipe, RecipeCreatePayload, RecipeUpdatePayload, RecipeVisibility } from '../model';

export class RecipesService extends ServiceBase {
	private readonly users: LoginSignUpService;

	constructor(unit: Unit) {
		super(unit);
		this.users = new LoginSignUpService(this.unit);
	}

	public async getSavedRecipesByUsername(username: string): Promise<Recipe[]> {
		const userId = this.users.getUserIdByUsername(username);
		if (userId === undefined) {
			return [];
		}

		const recipes = this.unit.prepare<any>(`
			select r.id,
			       r.name,
			       r.description,
			       r.image,
			       r.instructions,
			       r.visibility,
			       r.author,
			       u.username                                         as authorUsername,
			       coalesce(group_concat(distinct rmt.meal_type), '') as mealTypes,
			       (select json_group_array(json_object(
				       'id', i.id,
				       'name', i.name,
				       'amount', ri.amount,
				       'measurement', ri.measurement
			                                )) as jga
			        from RecipeIngredient ri
				             join Ingredient i on ri.ingredient_id = i.id
			        where ri.recipe_id = r.id)                        as ingredients,
			       1                                                  as isSavedByUser,
			       case when r.author = :userId then 1 else 0 end     as isOwnedByUser
			from SavedRecipe sr
				     join Recipe r on sr.recipe_id = r.id
				     join User u on r.author = u.id
				     left join RecipeMealType rmt on r.id = rmt.recipe_id
			where sr.user_id = :userId
			group by r.id, r.instructions
		`, {
			userId
		}).all();

		return RecipesService.mapRowsToRecipes(recipes);
	}

	public getRecipesByAuthorUsername(username: string): Recipe[] {
		const viewerId = this.users.getUserIdByUsername(username);
		if (viewerId === undefined) {
			return [];
		}

		const recipes = this.unit.prepare<any>(`
			select r.id,
			       r.name,
			       r.description,
			       r.image,
			       r.instructions,
			       r.visibility,
			       r.author,
			       u.username                                         as authorUsername,
			       coalesce(group_concat(distinct rmt.meal_type), '') as mealTypes,
			       (select json_group_array(json_object(
				       'id', i.id,
				       'name', i.name,
				       'amount', ri.amount,
				       'measurement', ri.measurement
			                                )) as jga
			        from RecipeIngredient ri
				             join Ingredient i on ri.ingredient_id = i.id
			        where ri.recipe_id = r.id)                        as ingredients,
			       case when sr.user_id is not null then 1 else 0 end as isSavedByUser,
			       case when r.author = :viewerId then 1 else 0 end   as isOwnedByUser
			from Recipe r
				     join User u on r.author = u.id
				     left join RecipeMealType rmt on r.id = rmt.recipe_id
				     left join SavedRecipe sr on r.id = sr.recipe_id and sr.user_id = :viewerId
			where lower(u.username) = lower(:username)
			group by r.id, r.instructions
		`, {
			username,
			viewerId
		}).all();

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
			instructions: string;
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
			       r.instructions,
			       r.visibility,
			       r.author,
			       u.username                                       as authorUsername,
			       coalesce(group_concat(rmt.meal_type, '||'), '')  as mealTypes
				,
				   case when sr.user_id is null then 0 else 1 end   as isSavedByUser
				,
				   case when r.author = :viewerId then 1 else 0 end as isOwnedByUser
			from Recipe r
				     join User u on u.id = r.author
				     left join RecipeMealType rmt on r.id = rmt.recipe_id
				     left join SavedRecipe sr on sr.recipe_id = r.id and sr.user_id = :viewerId
			where r.visibility = 'public'
			  and lower(r.name) like '%' || :search || '%'
			group by r.id, r.name, r.description, r.image, r.visibility, r.author, u.username,
			         r.instructions,
			         isSavedByUser, isOwnedByUser
			order by r.id desc
		`, {
			search: normalizedSearch,
			viewerId: viewerId ?? -1
		}).all();

		const mappedRecipes = RecipesService.mapRowsToRecipes(recipes);

		return mappedRecipes.map(recipe => ({
			...recipe,
			mealTypes: (recipe.mealTypes || []).flatMap(type => type.split('||'))
		}));
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

	public createRecipe(payload: RecipeCreatePayload): number | 'error' {
		const authorId = this.users.getUserIdByUsername(payload.authorUsername);
		if (authorId === undefined) {
			return 'error';
		}

		console.log('createRecipe: author=', payload.authorUsername, 'name=', payload.name, 'mealTypes=',
			payload.mealTypes?.join(','));

		const result = this.unit.prepare<unknown, {
			name: string;
			description: string | null;
			image: string | null;
			visibility: RecipeVisibility;
			author: number;
			instructions: string;
		}>(
			`insert into Recipe (name, description, image, visibility, author, instructions)
			 values (:name, :description, :image, :visibility, :author, :instructions)`,
			{
				name: payload.name,
				description: payload.description ?? null,
				image: payload.image ?? null,
				visibility: payload.visibility,
				author: authorId,
				instructions: payload.instructions?.trim() ?? ''
			}
		).run();

		const recipeId = result.lastInsertRowid as number;

		console.log('createRecipe: inserted recipe id=', recipeId);

		if (this.linkMealTypes(recipeId, payload.mealTypes) === 'error') {
			return 'error';
		}
		if (this.saveIngredients(recipeId, payload.ingredients) === 'error') {
			return 'error';
		}

		return recipeId;
	}

	private linkMealTypes(recipeId: number, mealTypes: string[]): 'error' | true {
		for (const mealType of mealTypes) {
			const linked = this.unit.prepare(
				`insert into RecipeMealType (recipe_id, meal_type)
				 values (:recipeId, :mealType)`,
				{
					recipeId,
					mealType
				}
			).run();
			if (linked.changes !== 1) {
				console.error('linkMealTypes: failed to insert RecipeMealType for mealType=', mealType, 'changes=',
					linked.changes);
				return 'error';
			}
		}

		return true;
	}

	private saveIngredients(recipeId: number, ingredients: Ingredient[]): 'error' | true {
		console.log('saveIngredients: recipeId=', recipeId, 'ingredientsCount=', ingredients?.length ?? 0);
		for (const ing of ingredients) {
			console.log('saveIngredients: processing ingredient', ing.name, 'amount=', ing.amount, 'measurement=',
				ing.measurement);

			// Insert ingredient if not exists (or get existing id)
			this.unit.prepare(
				`insert or ignore into Ingredient (name, default_measurement)
				 values (:name, :measurement)`,
				{
					name: ing.name,
					measurement: ing.measurement
				}
			).run();

			const ingredientRow = this.unit.prepare<{
				id: number
			}>(
				`select id
				 from Ingredient
				 where name = :name`,
				{ name: ing.name }
			).get();

			if (!ingredientRow) {
				console.error('saveIngredients: failed to get ingredient id for', ing.name);
				return 'error';
			}

			const ingredientId = ingredientRow.id;

			const linked = this.unit.prepare(
				`insert into RecipeIngredient (recipe_id, ingredient_id, amount, measurement)
				 values (:recipeId, :ingredientId, :amount, :measurement)`,
				{
					recipeId,
					ingredientId,
					amount: ing.amount,
					measurement: ing.measurement
				}
			).run();
			if (linked.changes !== 1) {
				console.error('saveIngredients: failed to insert RecipeIngredient for', ing.name, 'changes=',
					linked.changes);
				return 'error';
			}
			console.log('saveIngredients: inserted RecipeIngredient for', ing.name, 'id=', ingredientId);
		}
		return true;
	}

	public addRecipe(recipe: RecipeCreatePayload): number | 'author_not_found' | 'error' {
		const authorId = this.users.getUserIdByUsername(recipe.authorUsername);
		if (authorId === undefined) {
			return 'author_not_found';
		}

		console.log('addRecipe: author=', recipe.authorUsername, 'name=', recipe.name, 'mealTypes=',
			(recipe.mealTypes || []).join(','));

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
				instructions: string;
			}>(
				`insert into Recipe(name, description, image, visibility, author, instructions)
				 values (:name, :description, :image, :visibility, :author, :instructions)
				 returning id`,
				{
					name: recipe.name.trim(),
					description: recipe.description?.trim() || null,
					image: recipe.image?.trim() || null,
					visibility: RecipesService.normalizeVisibility(recipe.visibility),
					author: authorId,
					instructions: recipe.instructions?.trim() ?? ''
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

		console.log('addRecipe: created recipe id=', id);
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

		console.log('updateRecipe: recipeId=', recipeId, 'name=', recipe.name, 'mealTypes=',
			(recipe.mealTypes || []).join(','));

		const mealTypes = Array.from(
			new Set((recipe.mealTypes ?? []).map(mealType => mealType.trim()).filter(Boolean))
		);

		try {
			this.unit.prepare(
				`update Recipe
				 set name         = :name,
				     description  = :description,
				     image        = :image,
				     visibility   = :visibility,
				     instructions = :instructions
				 where id = :id`,
				{
					name: recipe.name.trim(),
					description: recipe.description?.trim() || null,
					image: recipe.image?.trim() || null,
					visibility: RecipesService.normalizeVisibility(recipe.visibility),
					instructions: recipe.instructions?.trim() ?? '',
					id: recipeId
				}
			).run();

			this.unit.prepare(`delete
			                   from RecipeMealType
			                   where recipe_id = :id`, { id: recipeId }).run();
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

		console.log('updateRecipe: deleting old RecipeIngredient rows for recipeId=', recipeId);
		try {
			this.unit.prepare(`delete
			                   from RecipeIngredient
			                   where recipe_id = :id`, { id: recipeId }).run();
		} catch (err) {
			console.error('Failed to delete existing RecipeIngredient rows for recipe:', recipeId, err);
			return 'error';
		}

		console.log('updateRecipe: saving new ingredients for recipeId=', recipeId);
		if (this.saveIngredients(recipeId, recipe.ingredients) === 'error') {
			return 'error';
		}

		console.log('updateRecipe: completed successfully for recipeId=', recipeId);
		return true;
	}

	public getRecipeById(recipeId: number): Recipe | 'not_found' | 'error' {
		try {
			const recipeRow = this.unit.prepare(
				`select id, name, description, image, visibility, author, instructions
				 from Recipe
				 where id = :id`,
				{ id: recipeId }
			).get() as any;

			if (!recipeRow) {
				return 'not_found';
			}

			const mealRows = this.unit.prepare(
				`select meal_type
				 from RecipeMealType
				 where recipe_id = :id`,
				{ id: recipeId }
			).all() as any[];

			const mealTypes = mealRows.map(row => row.meal_type);

			const rawIngredients = this.getIngredientsForRecipe(recipeId) || [];
			const ingredients = rawIngredients.map((ing: any) => ({
				id: ing.id,
				name: ing.name,
				measurement: ing.measurement,
				amount: ing.amount
			}));

			let authorUsername = 'Unknown author';
			if (recipeRow.author) {
				const userRow = this.unit.prepare(
					`select username
					 from User
					 where id = :authorId`,
					{ authorId: recipeRow.author }
				).get() as any;

				if (userRow?.username) {
					authorUsername = userRow.username;
				}
			}

			return {
				author: recipeRow.author,
				isOwnedByUser: undefined,
				isSavedByUser: undefined,
				id: recipeRow.id,
				name: recipeRow.name,
				description: recipeRow.description,
				image: recipeRow.image,
				visibility: recipeRow.visibility,
				authorUsername,
				mealTypes,
				ingredients,
				instructions: recipeRow.instructions || ''
			};

		} catch (error) {
			console.error('Error in getRecipeById:', error);
			return 'error';
		}
	}

	private static normalizeVisibility(visibility: RecipeVisibility | string | undefined): RecipeVisibility {
		return visibility === 'public' ? 'public' : 'private';
	}

	private static mapRowsToRecipes(rows: any[]): Recipe[] {
		return rows.map(recipe => ({
			id: recipe.id,
			name: recipe.name,
			description: recipe.description ?? undefined,
			image: recipe.image ?? undefined,
			visibility: recipe.visibility === 'public' ? 'public' : 'private',
			author: recipe.author,
			authorUsername: recipe.authorUsername,
			mealTypes: recipe.mealTypes ? recipe.mealTypes.split(',').filter(Boolean) : [],
			ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
			isSavedByUser: !!recipe.isSavedByUser,
			isOwnedByUser: !!recipe.isOwnedByUser,
			instructions: recipe.instructions
		}));
	}

	public deleteRecipe(recipeId: number): true | 'not_found' | 'error' {
		if (!this.checkRecipeExists(recipeId)) {
			return 'not_found';
		}

		const [success] = this.executeStmt(
			this.unit.prepare(`delete
			                   from Recipe
			                   where id = :id`, { id: recipeId })
		);

		if (!success) {
			return 'error';
		}

		return true;
	}

	public getIngredientsForRecipe(recipeId: number): Array<{
		id: number;
		name: string;
		measurement: string;
		amount: string;
	}> {
		return this.unit.prepare<{
			id: number;
			name: string;
			measurement: string;
			amount: string;
		}>(`
			SELECT i.id           AS id,
			       i.name         AS name,
			       ri.measurement AS measurement,
			       ri.amount      AS amount
			FROM RecipeIngredient ri
				     JOIN Ingredient i ON ri.ingredient_id = i.id
			WHERE ri.recipe_id = :recipeId
		`, { recipeId }).all();
	}
}
