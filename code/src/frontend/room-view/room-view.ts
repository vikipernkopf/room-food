import {Component, signal, WritableSignal, effect} from '@angular/core';
import {MealPlan} from './meal-plan/meal-plan';
import {AuthService} from '../core/auth-service';
import {Meal, User} from '../../backend/model';
import {MealService} from '../core/meal-service';

@Component({
	selector: 'app-room-view',
	templateUrl: './room-view.html',
	styleUrl: './room-view.scss',
	imports: [
		MealPlan
	]
})
export class RoomView {
	protected meals: WritableSignal<Meal[]> = signal([]);
	protected readonly username: WritableSignal<string> = signal("");
	protected readonly currentUser: WritableSignal<User | null>;

	constructor(private authService: AuthService, private mealService: MealService) {
		this.currentUser = this.authService.currentUser;
		effect(() => {
			const user = this.currentUser();
			console.log('Current user updated in room view:', user?.username);

			if (user?.username) {
				console.log('Username available:', user.username);
				this.username.set(user.username);
				this.meals = this.mealService.getAllMealsOfUser(user);
			} else {
				console.log('No user available');
				this.username.set("Guest");
				console.log('Setting username to ', this.username());
				this.meals = signal([]);
			}
		});
	}
}
