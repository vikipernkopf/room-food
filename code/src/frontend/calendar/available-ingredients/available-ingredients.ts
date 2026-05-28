import {
	Component,
	ChangeDetectionStrategy,
	effect,
	inject,
	input,
	OnInit,
	signal,
	viewChild,
	WritableSignal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { MealService } from '../../core/meal-service';
import { ShoppingModal } from '../../shopping/shopping-modal';
import { SearchIngredient } from '../../recipes/recipe-management/search-ingredient/search-ingredient';
import { firstValueFrom } from 'rxjs';

interface Ingredient {
	name: string;
	measurement: string;
	amount: number;
}

interface RecipeIngredient {
	ingredientName?: string;
	name?: string;
	measurement: string;
	amount: string | number;
}

@Component({
	selector: 'app-avaliable-ingredients',
	standalone: true,
	imports: [CommonModule, FormsModule, ShoppingModal, SearchIngredient],
	templateUrl: './available-ingredients.html',
	styleUrl: './available-ingredients.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailableIngredients implements OnInit {
	readonly roomCode = input<string>('');
	readonly shoppingModal = viewChild(ShoppingModal);

	// Needed ingredients (aggregated from meals)
	readonly neededIngredients = signal<Ingredient[]>([]);
	// Available ingredients (from room stock)
	readonly availableIngredients = signal<Ingredient[]>([]);
	readonly loading = signal(true);

	// Add ingredient form signals
	readonly newIngredientName = signal('');
	readonly newIngredientMeasurement = signal('');
	readonly newIngredientAmount = signal(0);
	readonly showAddForm = signal(false);
	readonly ingredientError: WritableSignal<string> = signal('');

	private readonly authService = inject(AuthService);
	private readonly ingredientsFrontendService = inject(IngredientsFrontendService);
	private readonly mealService = inject(MealService);

	constructor() {
		effect(() => {
			const user = this.authService.currentUser();
			const code = this.roomCode();
			if (user?.username && code) {
				this.loadIngredients();
			} else if (user === null) {
				this.loading.set(false);
			}
		});
	}

	ngOnInit(): void {}

	loadIngredients(): void {
		const code = this.roomCode();
		if (!code) {
			this.loading.set(false);
			return;
		}
		this.loading.set(true);
		this.neededIngredients.set([]);
		this.availableIngredients.set([]);

		// Load needed ingredients from meals
		this.mealService.getMealsByRoomCode(code).subscribe({
			next: async meals => {
				try {
					const recipeIds: number[] = [];
					const now = new Date();

					const futureMeals = meals.filter(m =>
						new Date(m.time) >= now
					);

					futureMeals.forEach(m => {
						(m.recipeIds || []).forEach(rid => recipeIds.push(rid));
					});
					const results = await Promise.all(
						recipeIds.map(rid => firstValueFrom(this.ingredientsFrontendService.getIngredientsForRecipe(rid)))
					);
					const map = new Map<string, Ingredient>();
					results.flat().forEach((r: unknown) => {
						const raw = r as RecipeIngredient;
						const ing: Ingredient = {
							name: raw.ingredientName ?? raw.name ?? '',
							measurement: raw.measurement,
							amount: Number(raw.amount)
						};
						const key = ing.name + '||' + ing.measurement;
						const existing = map.get(key);
						if (existing) {
							existing.amount += ing.amount;
						} else {
							map.set(key, { ...ing });
						}
					});
					this.neededIngredients.set(Array.from(map.values()));
				} catch (e) {
					console.error(e);
					this.neededIngredients.set([]);
				}
			},
			error: err => {
				console.error('Error loading needed ingredients:', err);
				this.neededIngredients.set([]);
			}
		});

		// Load available ingredients from room
		this.ingredientsFrontendService.getIngredientsForRoom(code).subscribe({
			next: ingredients => {
				this.availableIngredients.set(ingredients || []);
				this.loading.set(false);
			},
			error: err => {
				console.error('Error loading available ingredients:', err);
				this.availableIngredients.set([]);
				this.loading.set(false);
			}
		});
	}

	// Shopping modal
	openShopping(): void {
		this.shoppingModal()?.open(this.neededIngredients());
	}

	onSaved(): void {
		this.loadIngredients();
	}

	// Called by parent calendar component
	updateIngredients(): void {
		this.loadIngredients();
	}

	// Add ingredient form
	toggleAddForm(): void {
		this.showAddForm.update(v => !v);
		if (this.showAddForm()) {
			this.resetForm();
		}
	}

	resetForm(): void {
		this.newIngredientName.set('');
		this.newIngredientMeasurement.set('');
		this.newIngredientAmount.set(0);
		this.ingredientError.set('');
	}

	onIngredientSelected(ingredient: Ingredient): void {
		this.newIngredientName.set(ingredient.name);
		if (ingredient.measurement !== '') {
			this.newIngredientMeasurement.set(ingredient.measurement);
		}
	}

	async addIngredient(): Promise<void> {
		const name = this.newIngredientName().trim();
		const measurement = this.newIngredientMeasurement().trim();
		const amount = Number(this.newIngredientAmount());

		if (!name || !measurement || !amount || amount <= 0) {
			this.ingredientError.set('Please fill in all ingredient fields with valid values');
			return;
		}

		const newIngredient: Ingredient = { name, measurement, amount };
		const code = this.roomCode();

		const found = this.availableIngredients().find(s => s.name === newIngredient.name);

		try {
			if (found) {
				newIngredient.amount = found.amount + amount;
				await firstValueFrom(this.ingredientsFrontendService.deleteIngredientFromRoom(code, name, measurement));
			}
			await firstValueFrom(this.ingredientsFrontendService.addIngredientToRoom(code, newIngredient));
			this.loadIngredients();
			this.resetForm();
		} catch (err) {
			console.error('Error adding ingredient:', err);
			this.ingredientError.set('Failed to add ingredient');
		}
	}

	deleteIngredient(ingredientName: string, measurement: string): void {
		if (!confirm(`Delete ${ingredientName}?`)) {
			return;
		}

		this.ingredientsFrontendService.deleteIngredientFromRoom(this.roomCode(), ingredientName, measurement).subscribe({
			next: () => this.loadIngredients(),
			error: err => {
				console.error('Error deleting ingredient:', err);
				alert('Failed to delete ingredient');
			}
		});
	}
}
