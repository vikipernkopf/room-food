import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {Meal, Room, User} from '../model';
import {LoginSignUpService} from '../login-sign-up/login-sign-up-service';

export class MealService extends ServiceBase {

	private login:LoginSignUpService = new LoginSignUpService(this.unit);

	constructor(unit: Unit) {
		super(unit);
	}

	public addMeal(meal:Meal):boolean | "room not found" | "time taken" | "recipe not found" {
		if(!this.checkRoomExists(meal.room)){
			return "room not found";
		}

		if(this.checkTimeTaken(meal.time, meal.room)){
			return "time taken";
		}

		if(!this.checkRecipeExists(meal.recipeId)){
			return "recipe not found";
		}

		let success:boolean;

		[success] = this.executeStmt(
			this.unit.prepare(`
			insert into Meal(time, recipeId, responsible, roomCode) values (:t, :r, :rs, :rc)
			`, {t:meal.time.toISOString(), r:meal.recipeId, rs:meal.responsible, rc:meal.room})
		);

		return success;
	}

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

	public getMealsForUser(username:string):Meal[]{
		const fetch = this.unit.prepare(`
    	select m.time, m.recipeId, m.roomCode, m.responsible from Meal m where m.responsible=:n
    	`, {n:username}).all() as {time:string,
			recipeId:number,
			roomCode:string,
			responsible:string}[];

		if(fetch===undefined) return [];

		const meals:Meal[] = [];

		fetch.forEach(e =>{
			const date:Date = new Date(Date.parse(e.time));
			meals.push({time:date, recipeId:e.recipeId,
				responsible:e.responsible, room:e.roomCode});
		})

		return meals;
	}

	public checkTimeTaken(time:Date, roomCode:string):boolean{
		if(!this.checkRoomExists(roomCode)){
			return false;
		}

		return this.unit.prepare(
			`select * from Meal where roomCode=:r`,{r:roomCode}
		).get()!==undefined;
	}

	public checkRoomExists(roomCode:string):boolean{
		return this.login.checkUserExists(roomCode); // todo change in future sprints
	}

	public checkRecipeExists(recipeId:number):boolean{
		return this.unit.prepare(
			`select * from Recipe where id=:r`,{r:recipeId}
		).get()!==undefined;
	}

	public getMealsForRoom(roomCode:string):Meal[]{
		// todo in the future sprints
		return this.getMealsForUser(roomCode);
	}
}
