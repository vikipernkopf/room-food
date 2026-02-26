import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {Meal} from '../model';

export class RoomViewService extends ServiceBase {
	constructor(unit: Unit) {
		super(unit);
	}

	public getMealsForUser(username:string): Meal[] {
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
}
