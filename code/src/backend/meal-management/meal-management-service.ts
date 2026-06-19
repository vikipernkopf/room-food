import { ServiceBase } from '../service-base';
import { Unit } from '../unit';
import { Meal, Recipe } from '../model';
import { LoginSignUpService } from '../login-sign-up/login-sign-up-service';
import { RoomsService } from '../rooms/rooms-service';

//noinspection SqlRedundantCodeInCoalesce,SqlMissingColumnAliases,LocalVariableNamingConventionJS
export class MealManagementService extends ServiceBase {

	private login: LoginSignUpService;
	private rooms: RoomsService;

	constructor(unit: Unit) {
		super(unit);
		this.login = new LoginSignUpService(this.unit);
		this.rooms = new RoomsService(this.unit);
	}

	// ----------------------- Meal part ------------------------------

	public addMeal(meal: Meal): number | 'room_not_found' | 'recipe_not_found' | 'error' {
		console.log('=== addMeal called ===');
		console.log('Meal object:', JSON.stringify({
			name: meal.name,
			room: meal.room,
			recipeIds: meal.recipeIds
		}));

		if (!this.checkRoomExists(meal.room)) {
			return 'room_not_found';
		}

		const recipeIds = this.normalizeRecipeIds(meal.recipeIds);
		console.log('After normalizeRecipeIds:', JSON.stringify(recipeIds));

		if (!this.checkRecipesExist(recipeIds)) {
			return 'recipe_not_found';
		}

		let success: boolean;
		let id: number;

		[success, id] = this.executeStmt(
			this.unit.prepare(`
				insert into Meal(time, endTime, name, mealType, roomCode, cooked)
				values (:t, :et, :n, :mt, :rc, :c)
			`, {
				t: meal.time.toISOString(),
				et: meal.endTime.toISOString(),
				n: meal.name,
				mt: meal.mealType,
				rc: meal.room,
				c: meal.cooked ? 1 : 0
			})
		);

		console.log('Meal inserted with id:', id, 'success:', success);

		if (!success) {
			return 'error';
		}

		console.log('About to call replaceMealRecipes with id:', id, 'recipeIds:', JSON.stringify(recipeIds));
		if (!this.replaceMealRecipes(id, recipeIds)) {
			console.error('replaceMealRecipes failed!');
			return 'error';
		}

		if (!this.replaceMealResponsibleUsers(id, meal.responsibleUsers)) {
			return 'error';
		}

		if (!this.replaceEatingUsers(id, meal.eatingUsernames ?? [])) {
			return 'error';
		}

		if (meal.ingredientAssignments !== undefined) {
			if (!this.setMealIngredientAssignments(id, meal.ingredientAssignments)) {
				return 'error';
			}
		}

		console.log('=== addMeal completed successfully, returning id:', id);
		return id;
	}

	public deleteMeal(mealId: number): true | 'not_found' | 'error' {
		if (!this.checkMealExists(mealId)) {
			return 'not_found';
		}

		let result: boolean;

		[result] = this.executeStmt(
			this.unit.prepare(`delete
			                   from Meal
			                   where id = :id;`,
				{ id: mealId })
		);

		if (result) {
			return true;
		} else {
			return 'error';
		}
	}

	public updateMeal(
		mealId: number,
		updatedMeal: Meal
	): true | 'not_found' | 'room_not_found' | 'recipe_not_found' | 'error' {
		if (!this.checkRoomExists(updatedMeal.room)) {
			return 'room_not_found';
		}

		const recipeIds = this.normalizeRecipeIds(updatedMeal.recipeIds);
		if (!this.checkRecipesExist(recipeIds)) {
			return 'recipe_not_found';
		}

		if (!this.checkMealExists(mealId)) {
			return 'not_found';
		}

		const [success] = this.executeStmt(
			this.unit.prepare(
				`update Meal
				 set time=:newTime,
				     endTime=:newEndTime,
				     name=:newName,
				     mealType=:newMealType,
				     roomCode=:newRoom,
				     cooked=:isCooked
				 where id = :mealId`,
				{
					newTime: updatedMeal.time.toISOString(),
					newEndTime: updatedMeal.endTime.toISOString(),
					newName: updatedMeal.name,
					newMealType: updatedMeal.mealType,
					newRoom: updatedMeal.room,
					isCooked: updatedMeal.cooked ? 1 : 0,
					mealId
				}
			)
		);

		if (!success) {
			return 'error';
		}

		if (!this.replaceMealRecipes(mealId, recipeIds)) {
			return 'error';
		}

		if (!this.replaceMealResponsibleUsers(mealId, updatedMeal.responsibleUsers)) {
			return 'error';
		}

		if (!this.replaceEatingUsers(mealId, updatedMeal.eatingUsernames ?? [])) {
			return 'error';
		}

		if (updatedMeal.ingredientAssignments !== undefined) {
			if (!this.setMealIngredientAssignments(mealId, updatedMeal.ingredientAssignments)) {
				return 'error';
			}
		}

		return true;
	}

	public getMealsForUser(username: string): Meal[] {
		const fetch = this.unit.prepare(`
			select distinct m.id,
			                m.time,
			                m.endTime,
			                m.name,
			                coalesce(m.mealType, 'breakfast-0') as mealType,
			                m.roomCode,
			                m.cooked
			from Meal m
				     join MealResponsibleUser mru on mru.meal_id = m.id
			where mru.username = :n
		`, { n: username }).all() as {
			time: string,
			endTime: string,
			id: number,
			name: string,
			mealType: string,
			roomCode: string,
			cooked: number
		}[];

		if (fetch === undefined) {
			return [];
		}

		const meals: Meal[] = [];

		fetch.forEach(e => {
			const date: Date = new Date(Date.parse(e.time));
			meals.push({
				id: e.id,
				time: date,
				endTime: new Date(Date.parse(e.endTime)),
				name: e.name,
				mealType: e.mealType,
				room: e.roomCode,
				recipeIds: this.getRecipeIdsForMeal(e.id),
				responsibleUsers: this.getResponsibleUsersForMeal(e.id),
				cooked: e.cooked === 1
			});
		});

		return meals;
	}

	public checkMealExists(mealId: number): boolean {
		return this.unit.prepare(
			`select *
			 from Meal
			 where id = :id`, { id: mealId }
		).get() !== undefined;
	}

	public checkRoomExists(roomCode: string): boolean {
		return this.rooms.checkRoomExists(roomCode);
	}

	public getMealsForRoom(roomCode: string): Meal[] {
		const fetch = this.unit.prepare(`
			select m.id,
			       m.time,
			       m.endTime,
			       m.name,
			       coalesce(m.mealType, 'breakfast-0') as mealType,
			       m.roomCode,
			       m.cooked
			from Meal m
			where m.roomCode = :c
		`, { c: roomCode }).all() as {
			time: string,
			endTime: string,
			id: number,
			name: string,
			mealType: string,
			roomCode: string,
			cooked: number
		}[];

		if (fetch === undefined) {
			return [];
		}

		const meals: Meal[] = [];

		fetch.forEach(e => {
			const date: Date = new Date(Date.parse(e.time));
			meals.push({
				id: e.id,
				time: date,
				endTime: new Date(Date.parse(e.endTime)),
				name: e.name,
				mealType: e.mealType,
				room: e.roomCode,
				recipeIds: this.getRecipeIdsForMeal(e.id),
				responsibleUsers: this.getResponsibleUsersForMeal(e.id),
				cooked: e.cooked === 1
			});
		});

		return meals;
	}

	public addEatingUserByUsername(mealId: number, username: string)
		: true | 'meal_not_found' | 'user_not_found' | 'already_eating' | 'error' {
		if (!this.checkMealExists(mealId)) {
			return 'meal_not_found';
		}

		const userRow = this.unit.prepare<{
			id: number
		}>(
			`select id
			 from User
			 where username = :username`,
			{ username }
		).get();
		if (!userRow) {
			return 'user_not_found';
		}

		const userId = userRow.id;

		const existing = this.unit.prepare(
			`select 1
			 from MealEatingUser
			 where meal_id = :mealId
			   and user_id = :userId`,
			{
				mealId,
				userId
			}
		).get();
		if (existing) {
			return 'already_eating';
		}

		const [success] = this.executeStmt(
			this.unit.prepare(
				`insert into MealEatingUser(meal_id, user_id)
				 values (:mealId, :userId)`,
				{
					mealId,
					userId
				}
			)
		);
		return success ? true : 'error';
	}

	public removeEatingUserByUsername(mealId: number, username: string): 'meal_not_found' | 'user_not_found' | 'not_eating' | 'error' | 'success' {
		if (!this.checkMealExists(mealId)) {
			return 'meal_not_found';
		}

		const userRow = this.unit.prepare<{ id: number }>(
			`select id from User where username = :username`,
			{ username }
		).get();

		if (!userRow) {
			return 'user_not_found';
		}

		const userId = userRow.id;

		const existing = this.unit.prepare(
			`select 1 from MealEatingUser where meal_id = :mealId and user_id = :userId`,
			{ mealId, userId }
		).get();

		if (!existing) {
			return 'not_eating';
		}

		this.unit.prepare(
			`delete from MealEatingUser
			 where meal_id = :mealId and user_id = :userId`,
			{ mealId, userId }
		).run();

		return 'success'; // Returning 'success' skips all error if-blocks in the router
	}

	// ----------------------- Recipe part ------------------------------

	private normalizeRecipeIds(recipeIds?: number[]): number[] {
		if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
			console.log('normalizeRecipeIds: recipeIds is not an array or empty:', recipeIds);
			return [];
		}

		console.log('normalizeRecipeIds: input recipeIds:', JSON.stringify(recipeIds));
		const validIds = recipeIds.filter(recipeId => Number.isInteger(recipeId) && recipeId > 0);
		const result = Array.from(new Set(validIds));
		console.log('normalizeRecipeIds: output:', JSON.stringify(result));
		return result;
	}

	private checkRecipesExist(recipeIds: number[]): boolean {
		for (const recipeId of recipeIds) {
			if (!this.checkRecipeExists(recipeId)) {
				return false;
			}
		}

		return true;
	}

	private replaceMealRecipes(mealId: number, recipeIds: number[]): boolean {
		try {
			console.log(`replaceMealRecipes: mealId=${mealId}, recipeIds=${JSON.stringify(recipeIds)}`);

			this.unit.prepare(
				`delete
				 from MealRecipe
				 where meal_id = :mealId`,
				{ mealId }
			).run();

			for (const recipeId of recipeIds) {
				console.log(`  Inserting recipe ${recipeId} for meal ${mealId}`);
				const result = this.unit.prepare(
					`insert into MealRecipe(meal_id, recipe_id)
					 values (:mealId, :recipeId)`,
					{
						mealId,
						recipeId
					}
				).run();

				if (result.changes !== 1) {
					console.error(`  Failed to insert recipe ${recipeId}: changes=${result.changes}`);
					return false;
				}
			}

			console.log(`  Successfully inserted ${recipeIds.length} recipes for meal ${mealId}`);
			return true;
		} catch (error) {
			console.error(`Error in replaceMealRecipes for mealId=${mealId}:`, error);
			return false;
		}
	}

	private getRecipeIdsForMeal(mealId: number): number[] {
		const rows = this.unit.prepare<{
			recipe_id: number
		}>(
			`select recipe_id
			 from MealRecipe
			 where meal_id = :mealId
			 order by recipe_id`,
			{ mealId }
		).all();

		return rows.map(row => row.recipe_id);
	}

	public checkRecipeExists(recipeId: number): boolean {
		return this.unit.prepare(
			`select *
			 from Recipe
			 where id = :r`, { r: recipeId }
		).get() !== undefined;
	}

	public addRecipe(recipe: Recipe): number | 'author_not_found' | 'error' {
		if (!this.login.checkUserExistsId(recipe.author ?? 0)) {
			return 'author_not_found';
		}

		let _: boolean;
		let id: number;

		[_, id] = this.executeStmt(
			this.unit.prepare(`
				insert into Recipe(name, description, image, visibility, author)
				values (:n, :d, :i, :v, :a)
			`, {
				n: recipe.name,
				d: recipe.description || null,
				i: recipe.image || null,
				v: recipe.visibility,
				a: recipe.author
			})
		);

		if (!_) {
			return 'error';
		}

		if (recipe.mealTypes && recipe.mealTypes.length > 0) {
			for (const mealType of recipe.mealTypes) {
				this.unit.prepare(
					`insert into RecipeMealType(recipe_id, meal_type)
					 values (:rid, :mt)`,
					{
						rid: id,
						mt: mealType
					}
				).run();
			}
		}

		return id;
	}

	private replaceMealResponsibleUsers(mealId: number, responsibleUsers?: string[]): boolean {
		try {
			this.unit.prepare(
				`delete
				 from MealResponsibleUser
				 where meal_id = :mealId`,
				{ mealId }
			).run();

			const normalizedUsers = responsibleUsers
			?.filter(username => typeof username === 'string' && username.trim().length > 0)
			?.map(username => username.trim()) ?? [];
			const uniqueUsers = Array.from(new Set(normalizedUsers));

			for (const username of uniqueUsers) {
				try {
					const result = this.unit.prepare(
						`insert into MealResponsibleUser(meal_id, username)
						 values (:mealId, :username)`,
						{
							mealId,
							username
						}
					).run();

					if (result.changes !== 1) {
						console.warn(`Warning: Failed to insert responsible user ${username} for meal ${mealId}`);
					}
				} catch (error) {
					console.warn(`Warning: Error inserting responsible user ${username}:`, error);
				}
			}

			return true;
		} catch (error) {
			console.error('Error in replaceMealResponsibleUsers:', error);
			return false;
		}
	}

	private getResponsibleUsersForMeal(mealId: number): string[] {
		const rows = this.unit.prepare<{
			username: string
		}>(
			`select username
			 from MealResponsibleUser
			 where meal_id = :mealId
			 order by username`,
			{ mealId }
		).all();

		return rows.map(row => row.username);
	}

	private replaceEatingUsers(mealId: number, usernames: string[]): boolean {
		try {
			this.unit.prepare(
				`delete
				 from MealEatingUser
				 where meal_id = :mealId`,
				{ mealId }
			).run();

			for (const username of usernames) {
				const userRow = this.unit.prepare<{
					id: number
				}>(
					`select id
					 from User
					 where username = :username`,
					{ username }
				).get();

				if (!userRow) {
					continue;
				}

				this.unit.prepare(
					`insert into MealEatingUser(meal_id, user_id)
					 values (:mealId, :userId)`,
					{
						mealId,
						userId: userRow.id
					}
				).run();
			}

			return true;
		} catch (error) {
			console.error('Error in replaceEatingUsers:', error);
			return false;
		}
	}

	// ----------------------- MealEatingUser part ------------------------------

	public getEatingUsers(mealId: number): string[] | 'meal_not_found' {
		if (!this.checkMealExists(mealId)) {
			return 'meal_not_found';
		}

		const rows = this.unit.prepare<{
			username: string
		}>(
			`select u.username
			 from MealEatingUser meu
				      join User u on meu.user_id = u.id
			 where meu.meal_id = :mealId
			 order by u.username`,
			{ mealId }
		).all();

		return rows.map(row => row.username);
	}

	// ----------------------- Ingredient Assignment part ------------------------------

	public assignIngredientToUser(mealId: number, ingredientId: number,
		username: string): true | 'meal_not_found' | 'user_not_found' | 'already_assigned' | 'ingredient_not_found'
		| 'error' {
		if (!this.checkMealExists(mealId)) {
			return 'meal_not_found';
		}

		const userRow = this.unit.prepare<{
			username: string
		}>(
			`select username
			 from User
			 where username = :username`,
			{ username }
		).get();
		if (!userRow) {
			return 'user_not_found';
		}

		const ingredientExists = this.unit.prepare(
			`select 1
			 from Ingredient
			 where id = :ingredientId`,
			{ ingredientId }
		).get();
		if (!ingredientExists) {
			return 'ingredient_not_found';
		}

		const existing = this.unit.prepare(
			`select 1
			 from MealIngredientAssignment
			 where meal_id = :mealId
			   and ingredient_id = :ingredientId
			   and assigned_to_username = :username`,
			{
				mealId,
				ingredientId,
				username
			}
		).get();
		if (existing) {
			return 'already_assigned';
		}

		const recipeInfo = this.unit.prepare<{
			measurement: string;
			amount: string;
		}>(
			`select ri.measurement, ri.amount
			 from MealRecipe mr
				      join RecipeIngredient ri on ri.recipe_id = mr.recipe_id
			 where mr.meal_id = :mealId
			   and ri.ingredient_id = :ingredientId
			 limit 1`,
			{
				mealId,
				ingredientId
			}
		).get();

		const measurement = recipeInfo?.measurement ?? '';
		const amount = recipeInfo?.amount ?? '0';

		const [success] = this.executeStmt(
			this.unit.prepare(
				`insert into MealIngredientAssignment(meal_id, ingredient_id, assigned_to_username, measurement, amount,
				                                      bought)
				 values (:mealId, :ingredientId, :username, :measurement, :amount, 0)`,
				{
					mealId,
					ingredientId,
					username,
					measurement,
					amount
				}
			)
		);
		return success ? true : 'error';
	}

	public removeIngredientAssignment(mealId: number, ingredientId: number,
		username: string): true | 'meal_not_found' | 'user_not_found' | 'not_assigned' | 'ingredient_not_found' | 'error' {
		if (!this.checkMealExists(mealId)) {
			return 'meal_not_found';
		}

		const userRow = this.unit.prepare<{
			username: string
		}>(
			`select username
			 from User
			 where username = :username`,
			{ username }
		).get();
		if (!userRow) {
			return 'user_not_found';
		}

		const ingredientExists = this.unit.prepare(
			`select 1
			 from Ingredient
			 where id = :ingredientId`,
			{ ingredientId }
		).get();
		if (!ingredientExists) {
			return 'ingredient_not_found';
		}

		const existing = this.unit.prepare(
			`select 1
			 from MealIngredientAssignment
			 where meal_id = :mealId
			   and ingredient_id = :ingredientId
			   and assigned_to_username = :username`,
			{
				mealId,
				ingredientId,
				username
			}
		).get();
		if (!existing) {
			return 'not_assigned';
		}

		const [success] = this.executeStmt(
			this.unit.prepare(
				`delete
				 from MealIngredientAssignment
				 where meal_id = :mealId
				   and ingredient_id = :ingredientId
				   and assigned_to_username = :username`,
				{
					mealId,
					ingredientId,
					username
				}
			)
		);
		return success ? true : 'error';
	}

	public getIngredientAssignmentsForMeal(mealId: number): Map<number, string[]> | 'meal_not_found' {
		if (!this.checkMealExists(mealId)) {
			return 'meal_not_found';
		}

		const rows = this.unit.prepare<{
			ingredient_id: number;
			assigned_to_username: string;
		}>(
			`select ingredient_id, assigned_to_username
			 from MealIngredientAssignment
			 where meal_id = :mealId
			 order by ingredient_id, assigned_to_username`,
			{ mealId }
		).all();

		const assignmentMap = new Map<number, string[]>();
		for (const row of rows) {
			if (!assignmentMap.has(row.ingredient_id)) {
				assignmentMap.set(row.ingredient_id, []);
			}
			assignmentMap.get(row.ingredient_id)!.push(row.assigned_to_username);
		}

		return assignmentMap;
	}

	private setMealIngredientAssignments(mealId: number, assignments: {
		[ingredientId: number]: any[]
	}): boolean {
		try {
			this.unit.prepare(
				`delete
				 from MealIngredientAssignment
				 where meal_id = :mealId`,
				{ mealId }).run();

			for (const ingredientIdStr of Object.keys(assignments)) {
				const ingredientId = Number(ingredientIdStr);
				if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
					continue;
				}

				const usernames = assignments[ingredientId] || [];

				const recipeInfo = this.unit.prepare<{
					measurement: string;
					amount: string;
				}>(
					`select ri.measurement, ri.amount
					 from MealRecipe mr
						      join RecipeIngredient ri on ri.recipe_id = mr.recipe_id
					 where mr.meal_id = :mealId
					   and ri.ingredient_id = :ingredientId
					 limit 1`,
					{
						mealId,
						ingredientId
					}
				).get();

				const measurement = recipeInfo?.measurement ?? '';
				const amount = recipeInfo?.amount ?? '0';

				const normalized = Array.from(new Set(
					usernames.filter(u => typeof u === 'string' && u.trim().length > 0)
					.map(u => u.trim()))
				);

				for (const username of normalized) {
					this.unit.prepare(
						`insert into MealIngredientAssignment(meal_id, ingredient_id, assigned_to_username, measurement,
						                                      amount, bought)
						 values (:mealId, :ingredientId, :username, :measurement, :amount, 0)`,
						{
							mealId,
							ingredientId,
							username,
							measurement,
							amount
						})
					.run();
				}
			}

			return true;
		} catch (error) {
			console.error('Error in setMealIngredientAssignments:', error);
			return false;
		}
	}
}
