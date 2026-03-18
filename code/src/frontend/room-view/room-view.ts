import {Component, signal, WritableSignal, effect, OnDestroy} from '@angular/core';
import {MealPlan} from './meal-plan/meal-plan';
import {AuthService} from '../core/auth-service';
import {Meal, User} from '../../backend/model';
import {MealService} from '../core/meal-service';
import {MealManagement} from '../meal-management/meal-management.component';

@Component({
	selector: 'app-room-view',
	templateUrl: './room-view.html',
	styleUrl: './room-view.scss',
	imports: [
		MealPlan,
		MealManagement
	]
})
export class RoomView implements OnDestroy {
	protected readonly meals: WritableSignal<Meal[]> = signal([]);
	protected readonly username: WritableSignal<string> = signal("");
	protected readonly currentUser: WritableSignal<User | null>;
	protected readonly isPopupVisible = signal(false);
	protected readonly mealToEdit: WritableSignal<Meal | null> = signal(null);
	private refreshInterval: any = null;

	constructor(private authService: AuthService, private mealService: MealService) {
		this.currentUser = this.authService.currentUser;

		effect(() => {
			const user = this.currentUser();
			console.log('Current user updated in room view:', user?.username);

			if (user?.username) {
				console.log('Username available:', user.username);
				this.username.set(user.username);

				this.fetchMealsForUser(user.username);

				if (!this.refreshInterval) {
					this.startAutoRefresh();
				}
			} else {
				console.log('No user available');
				this.username.set("Guest");
				this.meals.set([]);
				this.stopAutoRefresh();
			}
		});
	}

	private fetchMealsForUser(username: string) {
		this.mealService.getMealsByUsername(username).subscribe({
			next: (meals) => {
				console.log('Successfully fetched meals:', meals);
				this.meals.set(meals || []);
			},
			error: (error) => {
				console.error('Error fetching meals:', error);
				// Don't clear meals on error to prevent flicker
			}
		});
	}

	private startAutoRefresh() {
		this.refreshInterval = setInterval(() => {
			const user = this.currentUser();
			if (user?.username) {
				console.log('Auto-refreshing meals...');
				this.fetchMealsForUser(user.username);
			}
		}, 2000);
	}

	private stopAutoRefresh() {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}
	}

	ngOnDestroy() {
		this.stopAutoRefresh();
	}

	togglePopup() {
		this.isPopupVisible.update(val => !val);
	}

	protected openAddMealPopup(): void {
		this.mealToEdit.set(null);
		this.isPopupVisible.set(true);
	}

	protected openEditMealPopup(meal: Meal): void {
		this.mealToEdit.set(meal);
		this.isPopupVisible.set(true);
	}

	protected closeMealPopup(): void {
		this.isPopupVisible.set(false);
		this.mealToEdit.set(null);
	}

	protected handleMealSaved(): void {
		const user = this.currentUser();
		if (user?.username) {
			this.fetchMealsForUser(user.username);
		}
		this.closeMealPopup();
	}
}
