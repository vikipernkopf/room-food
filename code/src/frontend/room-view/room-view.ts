import {Component, signal, WritableSignal, effect, computed, Signal} from '@angular/core';
import {MealPlan} from './meal-plan/meal-plan';
import {AuthService} from '../core/auth-service';
import {Meal, User} from '../../backend/model';
import {MealService} from '../core/meal-service';
import {AddMeal} from '../add-meal/add-meal';
import {Navbar} from '../navbar/navbar';

@Component({
	selector: 'app-room-view',
	templateUrl: './room-view.html',
	styleUrl: './room-view.scss',
	imports: [
		MealPlan,
		AddMeal,
		Navbar
	]
})
export class RoomView {
	private mealsSignalFromService: WritableSignal<Meal[]> = signal([]);
	protected readonly meals: Signal<Meal[]>;
	protected readonly username: WritableSignal<string> = signal("");
	protected readonly currentUser: WritableSignal<User | null>;
	protected readonly isPopupVisible = signal(false);

	constructor(private authService: AuthService, private mealService: MealService) {
		this.currentUser = this.authService.currentUser;

		this.meals = computed(() => this.mealsSignalFromService());

		effect(() => {
			const user = this.currentUser();
			console.log('Current user updated in room view:', user?.username);

			if (user?.username) {
				console.log('Username available:', user.username);
				this.username.set(user.username);
				// Get meals from service and update the local signal
				const fetchedMealsSignal = this.mealService.getAllMealsOfUser(user);
				const fetchedMeals = fetchedMealsSignal();
				console.log('Setting meals to:', fetchedMeals);
				this.mealsSignalFromService.set(fetchedMeals || []);
			} else {
				console.log('No user available');
				this.username.set("Guest");
				this.mealsSignalFromService.set([]);
			}
		});
	}

	togglePopup() {
		this.isPopupVisible.update(val => !val);
	}
}
