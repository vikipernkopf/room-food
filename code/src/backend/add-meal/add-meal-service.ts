import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {Meal, Recipe, Room, User} from '../model';
import {LoginSignUpService} from '../login-sign-up/login-sign-up-service';

export class AddMealService extends ServiceBase {

	private login:LoginSignUpService = new LoginSignUpService(this.unit);

	constructor(unit: Unit) {
		super(unit);
	}

	// ----------------------- Meal part ------------------------------

	/**
	 * Add a meal for a room
	 *
	 * @param meal - meal to add
	 * @return id if added, "room not found" if room doesn't exist, "time taken" if there already exists a recipe in that room at that time, "recipe not found" if the recipe doesn't exist and "error" otherwise.
	 * "recipe not exists" is for future sprints
	 */
	public addMeal(meal:Meal):number | "room not found" | "time taken" | "recipe not found" | "error" {
		if(!this.checkRoomExists(meal.room)){
			return "room not found";
		}

		if(this.checkTimeTaken(meal.time, meal.room)){
			return "time taken";
		}

		/*if(!this.checkRecipeExists(meal.recipeId)){
			return "recipe not found";
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
	 * @param meal - meal to delete
	 * @return true if deleted, "not_found" if meal doesn't exist, "error" otherwise
	 */
	public deleteMeal(meal:Meal):true | "not_found" | "error" {
		if(!this.checkTimeTaken(meal.time, meal.room)){
			return "not_found";
		}

		let result:boolean;

		[result] = this.executeStmt(
			this.unit.prepare(`delete from Meal where roomCode = :r and time=:t;`,
				{r:meal.room, t:meal.time.toISOString()})
		);

		if(!result) return "error";

		else return true;
	}

	/**
	 * Get an array of meals for a user
	 *
	 * @param username - username of the user
	 * @return array of meals the user is responsible for
	 */
	public getMealsForUser(username:string):Meal[]{
		const fetch = this.unit.prepare(`
    	select m.time, m.name, m.roomCode, m.responsible from Meal m where m.responsible=:n
    	`, {n:username}).all() as {time:string,
			name:string,
			roomCode:string,
			responsible:string}[];

		if(fetch===undefined) return [];

		const meals:Meal[] = [];

		fetch.forEach(e =>{
			const date:Date = new Date(Date.parse(e.time));
			meals.push({time:date, name:e.name,
				responsible:e.responsible, room:e.roomCode});
		})

		return meals;
	}

	/**
	 * Check if there exists a meal at the specified time in the specified room
	 *
	 * @param time - time to check
	 * @param roomCode - room to check
	 * @return true if taken, false otherwise
	 */
	public checkTimeTaken(time:Date, roomCode:string):boolean{
		if(!this.checkRoomExists(roomCode)){
			return false;
		}

		return this.unit.prepare(
			`select * from Meal where roomCode=:r and time=:t`,{r:roomCode, t:time.toISOString()}
		).get()!==undefined;
	}

	/**
	 * Check if there exists a meal at the specified time in the specified room
	 *
	 * @param time - time to check
	 * @param roomCode - room to check
	 * @return true if taken, false otherwise
	 */
	public checkRoomExists(roomCode:string):boolean{
		return this.login.checkUserExists(roomCode); //! change in future sprints -- !!!!!!!!!!!!!!
	}

	/**
	 * Get an array of meals for a room
	 *
	 * @param roomCode - code of the room
	 * @return array of meals the room is planning
	 */
	public getMealsForRoom(roomCode:string):Meal[]{
		//! change in future sprints ---------------------- !!!!!!!!!!!!!!
		return this.getMealsForUser(roomCode);
	}

	// ----------------------- Recipe part ------------------------------

	public checkRecipeExists(recipeId:number):boolean{
		return this.unit.prepare(
			`select * from Recipe where id=:r`,{r:recipeId}
		).get()!==undefined;
	}

	public addRecipe(recipe:Recipe):number | "author not found" {
		/*

		id:number,
	name:string,
	mealType:string,
	author:string
		 */
		if(!this.login.checkUserExists(recipe.author)){
			return "author not found";
		}


		let success:boolean;
		let id:number;

		[success, id] = this.executeStmt(
			this.unit.prepare(`
			insert into Recipe(name, mealType, author) values (:n, :m, :a)
			`, {n:recipe.name, m:recipe.mealType, a:recipe.author})
		);

		return id;
	}
}
