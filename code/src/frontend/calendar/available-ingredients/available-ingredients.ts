import { Component, effect, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { MealService } from '../../core/meal-service';
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
	templateUrl: './available-ingredients.html',
	styleUrl: './available-ingredients.scss',
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

		// Fetch meals then fetch all recipe ingredients in parallel and aggregate
		this.mealService.getMealsByRoomCode(this.roomCode).subscribe({
			next: async meals => {
				try {
					const recipeIds: number[] = [];
					meals.forEach(m => {
						(m.recipeIds || []).forEach(rid => recipeIds.push(rid));
					});

					// Deduplicate recipe ids
					const uniq = Array.from(new Set(recipeIds));

					// Fetch ingredients for all recipes in parallel
					const promises = uniq.map(rid =>
						firstValueFrom(
							this.ingredientsFrontendService.getIngredientsForRecipe(rid)
						)
					);
					const results = await Promise.all(promises);

					// Flatten and normalize backend shape (some endpoints return ingredientName)
					const allRaw = results.flat();
					const all: Ingredient[] = allRaw.map((r: any) => ({
						name: r.ingredientName ?? r.name ?? '',
						measurement: r.measurement,
						amount: Number(r.amount)
					}));

					// Aggregate by name + measurement
					const map = new Map<string, Ingredient>();
					all.forEach(ing => {
						const key = `${ing.name}||${ing.measurement}`;
						const existing = map.get(key);
						if (existing) {
							existing.amount = Number(existing.amount) + Number(ing.amount);
						} else {
							map.set(key, { ...ing });
						}
					});

					const aggregated = Array.from(map.values()).map(i => ({
						name: i.name,
						measurement: i.measurement,
						amount: i.amount
					}));

					this.ingredients.set(aggregated);
				} catch (err) {
					console.error('Error fetching ingredients for recipes:', err);
					this.ingredients.set([]);
				}
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
