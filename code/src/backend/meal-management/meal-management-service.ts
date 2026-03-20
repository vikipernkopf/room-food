import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {Meal, Recipe} from '../model';
import {LoginSignUpService} from '../login-sign-up/login-sign-up-service';
import {RoomsService} from '../rooms/rooms-service';

export class MealManagementService extends ServiceBase {

	private login:LoginSignUpService;
	private rooms:RoomsService;

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
	 * @return id if added, "room_not_found" if room doesn't exist, "recipe_not_found" if the recipe doesn't exist and "error" otherwise.
	 * "recipe not exists" is for future sprints
	 */
	public addMeal(meal:Meal):number | "room_not_found" | "recipe_not_found" | "error" {
		if(!this.checkRoomExists(meal.room)){
			return "room_not_found";
		}

		/*if(!this.checkRecipeExists(meal.recipeId)){
			return "recipe_not_found";
		}*/

		let success:boolean;
		let id:number;

		[success, id] = this.executeStmt(
			this.unit.prepare(`
			insert into Meal(time, name, responsible, roomCode) values (:t, :n, :rs, :rc)
			`, {t:meal.time.toISOString(), n:meal.name, rs:meal.responsible, rc:meal.room})
		);

		if(!success){
			return "error";
		}

		return id;
	}

	/**
	 * Delete a meal from a room
	 *
	 * @param mealId - meal id to delete
	 * @return true if deleted, "not_found" if meal doesn't exist, "error" otherwise
	 */
	public deleteMeal(mealId:number):true | "not_found" | "error" {
		if(!this.checkMealExists(mealId)){
			return "not_found";
		}

		let result:boolean;

		[result] = this.executeStmt(
			this.unit.prepare(`delete from Meal where id = :id;`,
				{id:mealId})
		);

		if(!result) return "error";

		else return true;
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
	): true | "not_found" | "room_not_found" | "error" {
		if (!this.checkRoomExists(updatedMeal.room)) {
			return "room_not_found";
		}

		if (!this.checkMealExists(mealId)) {
			return "not_found";
		}

		const [success] = this.executeStmt(
			this.unit.prepare(
				`update Meal set time=:newTime, name=:newName, responsible=:newResponsible, roomCode=:newRoom
				 where id=:mealId`,
				{
					newTime: updatedMeal.time.toISOString(),
					newName: updatedMeal.name,
					newResponsible: updatedMeal.responsible,
					newRoom: updatedMeal.room,
					mealId: mealId,
				}
			)
		);

		if (!success) {
			return "error";
		}

		return true;
	}

	/**
	 * Get an array of meals for a user
	 *
	 * @param username - username of the user
	 * @return array of meals the user is responsible for
	 */
	public getMealsForUser(username:string):Meal[]{
		const fetch = this.unit.prepare(`
	    	select m.id, m.time, m.name, m.roomCode, m.responsible from Meal m where m.responsible=:n
    	`, {n:username}).all() as {time:string,
			id:number,
			name:string,
			roomCode:string,
			responsible:string}[];

		if(fetch===undefined) return [];

		const meals:Meal[] = [];

		fetch.forEach(e =>{
			const date:Date = new Date(Date.parse(e.time));
			meals.push({id:e.id, time:date, name:e.name,
				responsible:e.responsible, room:e.roomCode});
		})

		return meals;
	}

	public checkMealExists(mealId:number):boolean{
		return this.unit.prepare(
			`select * from Meal where id=:id`,{id:mealId}
		).get()!==undefined;
	}

	/**
	 * Check if there exists a meal at the specified time in the specified room
	 *
	 * @param roomCode - room to check
	 * @return true if taken, false otherwise
	 */
	public checkRoomExists(roomCode:string):boolean{
		return this.rooms.checkRoomExists(roomCode);
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Get an array of meals for a room
	 *
	 * @param roomCode - code of the room
	 * @return array of meals the room is planning
	 */
	public getMealsForRoom(roomCode:string):Meal[]{
		const fetch = this.unit.prepare(`
			select m.id, m.time, m.name, m.roomCode, m.responsible from Meal m where m.roomCode=:c
		`, {c:roomCode}).all() as {time:string,
			id:number,
			name:string,
			roomCode:string,
			responsible:string}[];

		if(fetch===undefined) return [];

		const meals:Meal[] = [];

		fetch.forEach(e =>{
			const date:Date = new Date(Date.parse(e.time));
			meals.push({id:e.id, time:date, name:e.name,
				responsible:e.responsible, room:e.roomCode});
		})

		return meals;
	}

	// ----------------------- Recipe part ------------------------------

	// noinspection JSUnusedGlobalSymbols
	public checkRecipeExists(recipeId:number):boolean{
		return this.unit.prepare(
			`select * from Recipe where id=:r`,{r:recipeId}
		).get()!==undefined;
	}

	// noinspection JSUnusedGlobalSymbols
	public addRecipe(recipe:Recipe):number | "author_not_found" {
		/*

		id:number,
	name:string,
	mealType:string,
	author:string
		 */
		if(!this.login.checkUserExists(recipe.author)){
			return "author_not_found";
		}


		let _:boolean;
		let id:number;

		// noinspection JSUnusedAssignment
		[_, id] = this.executeStmt(
			this.unit.prepare(`
			insert into Recipe(name, mealType, author) values (:n, :m, :a)
			`, {n:recipe.name, m:recipe.mealType, a:recipe.author})
		);

		return id;
	}
}
