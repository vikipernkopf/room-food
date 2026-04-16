import { ServiceBase } from '../service-base';
import { Unit } from '../unit';
import { Meal, Recipe } from '../model';
import { LoginSignUpService } from '../login-sign-up/login-sign-up-service';
import { RoomsService } from '../rooms/rooms-service';

export class MealManagementService extends ServiceBase {

	private login: LoginSignUpService;
	private rooms: RoomsService;

	constructor(unit: Unit) {
		super(unit);
		this.login = new LoginSignUpService(this.unit);
		this.rooms = new RoomsService(this.unit);
	}

	// ----------------------- Meal part ------------------------------

	/**
	 * Add a meal for a room
	 *
	 * @param meal - meal to add
	 * @return id if added, "room_not_found" if room doesn't exist, "recipe_not_found" if the recipe doesn't exist and
	 *     "error" otherwise.
	 * "recipe not exists" is for future sprints
	 */
	public addMeal(meal: Meal): number | 'room_not_found' | 'recipe_not_found' | 'error' {
		if (!this.checkRoomExists(meal.room)) {
			return 'room_not_found';
		}

		const recipeIds = this.normalizeRecipeIds(meal.recipeIds);
		if (!this.checkRecipesExist(recipeIds)) {
			return 'recipe_not_found';
		}

		/*if(!this.checkRecipeExists(meal.recipeId)){
		 return "recipe_not_found";
		 }*/

		let success: boolean;
		let id: number;

		[success, id] = this.executeStmt(
			this.unit.prepare(`
				insert into Meal(time, endTime, name, responsible, roomCode)
				values (:t, :et, :n, :rs, :rc)
			`, {
				t: meal.time.toISOString(),
				et: meal.endTime.toISOString(),
				n: meal.name,
				rs: meal.responsible,
				rc: meal.room
			})
		);

		if (!success) {
			return 'error';
		}

		if (!this.replaceMealRecipes(id, recipeIds)) {
			return 'error';
		}

		if (!this.replaceMealResponsibleUsers(id, meal.responsibleUsers)) {
			return 'error';
		}

		return id;
	}

	/**
	 * Delete a meal from a room
	 *
	 * @param mealId - meal id to delete
	 * @return true if deleted, "not_found" if meal doesn't exist, "error" otherwise
	 */
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

	/**
	 * Update an existing meal in a room
	 *
	 * @param mealId - current persisted meal id
	 * @param updatedMeal - new meal values
	 * @return true if updated, "not_found" if the original meal does not exist,
	 * "room_not_found" if target room does not exist,
	 * "error" on DB failure
	 */
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
				     responsible=:newResponsible,
				     roomCode=:newRoom
				 where id = :mealId`,
				{
					newTime: updatedMeal.time.toISOString(),
					newEndTime: updatedMeal.endTime.toISOString(),
					newName: updatedMeal.name,
					newResponsible: updatedMeal.responsible,
					newRoom: updatedMeal.room,
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

		return true;
	}

	/**
	 * Get an array of meals for a user
	 *
	 * @param username - username of the user
	 * @return array of meals the user is responsible for
	 */
	public getMealsForUser(username: string): Meal[] {
		const fetch = this.unit.prepare(`
			select m.id, m.time, m.endTime, m.name, m.roomCode, m.responsible
			from Meal m
			where m.responsible = :n
		`, { n: username }).all() as {
			time: string,
			endTime: string,
			id: number,
			name: string,
			roomCode: string,
			responsible: string
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
				responsible: e.responsible,
				room: e.roomCode,
				recipeIds: this.getRecipeIdsForMeal(e.id),
				responsibleUsers: this.getResponsibleUsersForMeal(e.id)
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

	/**
	 * Check if there exists a meal at the specified time in the specified room
	 *
	 * @param roomCode - room to check
	 * @return true if taken, false otherwise
	 */
	public checkRoomExists(roomCode: string): boolean {
		return this.rooms.checkRoomExists(roomCode);
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Get an array of meals for a room
	 *
	 * @param roomCode - code of the room
	 * @return array of meals the room is planning
	 */
	public getMealsForRoom(roomCode: string): Meal[] {
		const fetch = this.unit.prepare(`
			select m.id, m.time, m.endTime, m.name, m.roomCode, m.responsible
			from Meal m
			where m.roomCode = :c
		`, { c: roomCode }).all() as {
			time: string,
			endTime: string,
			id: number,
			name: string,
			roomCode: string,
			responsible: string
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
				responsible: e.responsible,
				room: e.roomCode,
				recipeIds: this.getRecipeIdsForMeal(e.id),
				responsibleUsers: this.getResponsibleUsersForMeal(e.id)
			});
		});

		return meals;
	}

	// ----------------------- Recipe part ------------------------------

	private normalizeRecipeIds(recipeIds?: number[]): number[] {
		if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
			return [];
		}

		const validIds = recipeIds.filter(recipeId => Number.isInteger(recipeId) && recipeId > 0);
		return Array.from(new Set(validIds));
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
			this.unit.prepare(
				`delete
				 from MealRecipe
				 where meal_id = :mealId`,
				{ mealId }
			).run();

			for (const recipeId of recipeIds) {
				const result = this.unit.prepare(
					`insert into MealRecipe(meal_id, recipe_id)
					 values (:mealId, :recipeId)`,
					{
						mealId,
						recipeId
					}
				).run();

				if (result.changes !== 1) {
					return false;
				}
			}

			return true;
		} catch (_error) {
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

	// noinspection JSUnusedGlobalSymbols
	public checkRecipeExists(recipeId: number): boolean {
		return this.unit.prepare(
			`select *
			 from Recipe
			 where id = :r`, { r: recipeId }
		).get() !== undefined;
	}

	// noinspection JSUnusedGlobalSymbols
	public addRecipe(recipe: Recipe): number | 'author_not_found' | 'error' {
		// recipe.author should be a user ID
		if (!this.login.checkUserExistsId(recipe.author)) {
			return 'author_not_found';
		}

		let _: boolean;
		let id: number;

		// noinspection JSUnusedAssignment
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

		// Insert meal types into junction table
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
						// Continue with other users even if one fails
					}
				} catch (error) {
					console.warn(`Warning: Error inserting responsible user ${username}:`, error);
					// Continue with other users even if one fails
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
}
