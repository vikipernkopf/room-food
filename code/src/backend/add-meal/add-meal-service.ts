import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {Meal, Room, User} from '../model';
import {LoginSignUpService} from '../login-sign-up/login-sign-up-service';

export class AddMealService extends ServiceBase {

	private login:LoginSignUpService = new LoginSignUpService(this.unit);

	constructor(unit: Unit) {
		super(unit);
	}

	public addMeal(meal:Meal, username:string):boolean | "not found" | "time taken"{
		if(!this.login.checkUserExists(username)){
			return "not found";
		}

		let success:boolean;

		[success] = this.executeStmt(
			this.unit.prepare(`
			insert into Meal(time, recipeId, responsible, roomCode) values (:t, :r, :rs, :rc)
			`, {t:meal.time.toString(), r:meal.recipeId, rs:meal.responsible, rc:meal.room})
		);

		return success;
	}

	public getMealsForUser(username:string):Meal[]{
		const fetch = this.unit.prepare(`
    	select m.time, m.recipeId, m.roomCode, m.responsible from Meal m where m.responsible=:n
    	`, {n:username}).get() as {time:string,
			recipeId:number,
			room:string,
			responsible:string}[];

		if(fetch===undefined) return [];

		const meals:Meal[] = [];

		fetch.forEach(e =>{

			const date:Date = new Date(Date.parse(e.time));
			meals.push({time:date, recipeId:e.recipeId,
				responsible:e.responsible, room:e.room});
		})

		return [];
	}

	public checkTimeTaken(time:Date, roomCode:string){

	}

	public checkRoomExists(roomCode:string):boolean{
		return this.login.checkUserExists(roomCode); // todo changed in future sprints
	}

	public getMealsForRoom(username:string):Meal[]{
		// todo in the future sprints
		return [];
	}
}
