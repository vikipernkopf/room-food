import {Component, signal, WritableSignal, effect, OnDestroy} from '@angular/core';
import {MealPlan} from './meal-plan/meal-plan';
import {AuthService} from '../core/auth-service';
import {Meal, User} from '../../backend/model';
import {MealService} from '../core/meal-service';
import {RoomService} from '../core/room-service';
import {MealManagement} from './meal-management/meal-management';
import {ActivatedRoute, Router} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-room-view',
	standalone: true,
	templateUrl: './room-view.html',
	styleUrl: './room-view.scss',
	imports: [
		CommonModule,
		MealPlan,
		MealManagement
	]
})
export class RoomView implements OnDestroy {
	protected readonly meals: WritableSignal<Meal[]> = signal([]);
	protected readonly username: WritableSignal<string> = signal("");
	protected readonly roomCode: WritableSignal<string> = signal("");
	protected readonly currentUser: WritableSignal<User | null>;
	protected readonly isPopupVisible = signal(false);
	protected readonly mealToEdit: WritableSignal<Meal | null> = signal(null);
	private refreshInterval: any = null;
	private hasRedirected = false;
	private lastProcessedCode: string = ""; // track which code we've already processed

	constructor(private route:ActivatedRoute, private router: Router, private authService: AuthService, private mealService: MealService, private roomService: RoomService) {
		this.currentUser = this.authService.currentUser;
		console.log('RoomView component initialized');

		// Subscribe to route param 'code' and unsubscribe on destroy
		this.route.paramMap
			.pipe(takeUntilDestroyed())
			.subscribe((paramMap) => {
				const code = paramMap.get('code') ?? "";
				console.log('Route param received, setting roomCode to:', code);
				this.roomCode.set(code);
			});

		effect(() => {
			const code = this.roomCode();
			console.log('Room code effect triggered with code:', code);

			// Only process if the code has changed (avoid re-processing the same code)
			if (code === this.lastProcessedCode) {
				console.log('Code unchanged, skipping effect');
				return;
			}

			this.lastProcessedCode = code;
			console.log('Processing new code:', code);

			// If code is empty, redirect to error immediately
			if (!code || code.length === 0) {
				if (!this.hasRedirected) {
					console.log('Room code is empty, redirecting to error');
					this.hasRedirected = true;
					this.meals.set([]);
					this.stopAutoRefresh();
					// noinspection JSIgnoredPromiseFromCall
					this.router.navigate(['/error']);
				}
				return;
			}

			// Code is not empty, validate it exists in the database
			console.log('Validating room code:', code);
			this.validateAndLoadRoom(code);
		});
	}

	private validateAndLoadRoom(roomCode: string) {
		this.roomService.checkRoomExists(roomCode).subscribe({
			next: (response) => {
				console.log('Room validation response:', response);
				if (response.exists) {
					console.log('Room exists, loading meals');
					this.hasRedirected = false;
					this.fetchMealsForRoom(roomCode);

					if (!this.refreshInterval) {
						console.log('Starting auto-refresh');
						this.startAutoRefresh();
					}
				} else {
					console.log('Room does not exist in database, redirecting to error');
					if (!this.hasRedirected) {
						this.hasRedirected = true;
						this.meals.set([]);
						this.stopAutoRefresh();
						// noinspection JSIgnoredPromiseFromCall
						this.router.navigate(['/error']);
					}
				}
			},
			error: (error) => {
				console.error('Error validating room:', error);
				// If validation fails, redirect to error
				if (!this.hasRedirected) {
					this.hasRedirected = true;
					this.meals.set([]);
					this.stopAutoRefresh();
					// noinspection JSIgnoredPromiseFromCall
					this.router.navigate(['/error']);
				}
			}
		});
	}

	private fetchMealsForRoom(roomCode: string) {
		this.mealService.getMealsByRoomCode(roomCode).subscribe({
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
			const code = this.roomCode();
			if (code) {
				console.log('Auto-refreshing meals for room:', code);
				this.fetchMealsForRoom(code);
			}
		}, 10000);
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

	// noinspection JSUnusedGlobalSymbols
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

	protected handleMealDelete(meal: Meal): void {
		if (!meal.id) {
			this.mealService.saveError.set('Unable to delete meal: missing meal id');
			return;
		}

		this.mealService.deleteMeal(meal.id).subscribe({
			next: () => {
				this.mealService.saveError.set('');
				this.meals.update((currentMeals) => currentMeals.filter((m) => m.id !== meal.id));
			},
			error: (err) => {
				this.mealService.saveError.set('Unable to delete meal: ' + (err.error?.error || err.message || 'Unknown error'));
			}
		});
	}

	protected handleMealSaved(): void {
		const code = this.roomCode();
		if (code) {
			this.fetchMealsForRoom(code);
		}
		this.closeMealPopup();
	}
}
