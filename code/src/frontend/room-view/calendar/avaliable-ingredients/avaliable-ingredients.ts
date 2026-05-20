import { Component, effect, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth-service';
import { IngredientsFrontendService } from '../../../core/ingredients-frontend-service';
import { MealService } from '../../../core/meal-service';
import { firstValueFrom } from 'rxjs';

interface Ingredient {
	name: string;
	measurement: string;
	amount: number;
}

@Component({
	selector: 'app-avaliable-ingredients',
	imports: [
		CommonModule
	],
	templateUrl: './avaliable-ingredients.html',
	styleUrl: './avaliable-ingredients.scss',
	standalone: true
})
export class AvailableIngredients implements OnInit {
	@Input()
	roomCode: string = '';

	ingredients = signal<Ingredient[]>([]);
	loading = signal<boolean>(true);

	constructor(
		private authService: AuthService,
		private ingredientsFrontendService: IngredientsFrontendService,
		private mealService: MealService
	) {
		// Reactively watch for the user to be "logged in" by the AuthService
		effect(() => {
			const user = this.authService.currentUser();

			if (user?.username && this.roomCode) {
				this.loadIngredients();
			} else if (user === null) {
				// user === null explicitly means auth check finished and no user found
				this.loading.set(false);
			}
		});
	}

	ngOnInit(): void {
		// We no longer call loadIngredients here because the effect handles it
	}

	loadIngredients(): void {
		if (this.roomCode === '') {
			console.log('Bad room code');
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		this.ingredients.set([]);

		this.mealService.getMealsByRoomCode(this.roomCode).subscribe({
			next: meals => {
				console.log('Ingredients loaded:', meals);
				meals.forEach(m => {
					m.recipeIds?.forEach(async r => {
						const v = await firstValueFrom(
							this.ingredientsFrontendService.getIngredientsForRecipe(r)
						);
						this.ingredients.update(i => [...i, ...v]);
					});
				});
				this.loading.set(false);
			},
			error: err => {
				console.error('Error loading ingredients:', err);
				this.ingredients.set([]);
				this.loading.set(false);
			}
		});
	}
}
