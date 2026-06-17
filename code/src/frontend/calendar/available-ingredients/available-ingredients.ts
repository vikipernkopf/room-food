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
import { Shopping } from '../../shopping/shopping';
import { SearchIngredient } from '../../search-ingredient/search-ingredient';
import { firstValueFrom, forkJoin } from 'rxjs';

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
	imports: [CommonModule, FormsModule, Shopping, SearchIngredient],
	templateUrl: './available-ingredients.html',
	styleUrl: './available-ingredients.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailableIngredients implements OnInit {
	readonly roomCode = input<string>('');
	readonly shoppingModal = viewChild(Shopping);

	// Needed ingredients (aggregated from meals, minus available, and bought)
	readonly neededIngredients = signal<Ingredient[]>([]);
	// Available ingredients (from room stock)
	readonly availableIngredients = signal<Ingredient[]>([]);
	// Bought ingredients (from BoughtIngredient table - room-level)
	readonly boughtIngredients = signal<Ingredient[]>([]);
	readonly loading = signal(true);

	// Add ingredient form signals
	readonly newIngredientName = signal('');
	readonly newIngredientMeasurement = signal('');
	readonly newIngredientAmount = signal(0);
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

	ngOnInit(): void {
	}

	loadIngredients(): void {
		const code = this.roomCode();
		const username = this.authService.currentUser()?.username;
		if (!code || !username) {
			this.loading.set(false);
			return;
		}
		this.loading.set(true);
		this.neededIngredients.set([]);
		this.availableIngredients.set([]);
		this.boughtIngredients.set([]);

		// Load room stock, and bought in parallel
		forkJoin({
			roomIngredients: this.ingredientsFrontendService.getIngredientsForRoom(code),
			boughtIngredients: this.ingredientsFrontendService.getBoughtIngredientsForRoom(code)
		}).subscribe({
			next: ({
				roomIngredients,
				boughtIngredients
			}) => {
				this.availableIngredients.set(roomIngredients || []);
				this.boughtIngredients.set(boughtIngredients || []);

				// Now load and compute needed ingredients
				this.computeNeededIngredients(code);
			},
			error: err => {
				console.error('Error loading room/bought ingredients:', err);
				this.availableIngredients.set([]);
				this.boughtIngredients.set([]);
				this.computeNeededIngredients(code);
			}
		});
	}

	private computeNeededIngredients(code: string): void {
		this.mealService.getMealsByRoomCode(code).subscribe({
			next: async meals => {
				try {
					const recipeIds: number[] = [];
					const now = new Date();

					const futureMeals = meals.filter(m =>
						new Date(m.time) >= now
					);

					futureMeals.forEach(m => {
						if (m.cooked) {
							return;
						}
						(m.recipeIds || []).forEach(rid => recipeIds.push(rid));
					});

					const results = await Promise.all(
						recipeIds.map(
							rid => firstValueFrom(this.ingredientsFrontendService.getIngredientsForRecipe(rid)))
					);

					// Aggregate needed ingredients
					const neededMap = new Map<string, Ingredient>();
					results.flat().forEach((r: unknown) => {
						const raw = r as RecipeIngredient;
						const ing: Ingredient = {
							name: raw.ingredientName ?? raw.name ?? '',
							measurement: raw.measurement,
							amount: Number(raw.amount)
						};
						const key = ing.name + '||' + ing.measurement;
						const existing = neededMap.get(key);
						if (existing) {
							existing.amount += ing.amount;
						} else {
							neededMap.set(key, { ...ing });
						}
					});

					// Subtract available room stock
					for (const available of this.availableIngredients()) {
						const key = available.name + '||' + available.measurement;
						const needed = neededMap.get(key);
						if (needed) {
							needed.amount -= Number(available.amount);
							if (needed.amount <= 0) {
								neededMap.delete(key);
							}
						}
					}

					// Subtract room-level bought ingredients
					for (const bought of this.boughtIngredients()) {
						const key = bought.name + '||' + bought.measurement;
						const needed = neededMap.get(key);
						if (needed) {
							needed.amount -= Number(bought.amount);
							if (needed.amount <= 0) {
								neededMap.delete(key);
							}
						}
					}

					this.neededIngredients.set(Array.from(neededMap.values()));
					this.loading.set(false);
				} catch (e) {
					console.error(e);
					this.neededIngredients.set([]);
					this.loading.set(false);
				}
			},
			error: err => {
				console.error('Error loading needed ingredients:', err);
				this.neededIngredients.set([]);
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
			this.ingredientError.set('Fill in all fields with valid values');
			return;
		}

		const newIngredient: Ingredient = {
			name,
			measurement,
			amount
		};
		const code = this.roomCode();

		const found = this.availableIngredients().find(s => s.name === newIngredient.name);

		try {
			if (found) {
				newIngredient.amount = Number(found.amount) + Number(amount);
				await firstValueFrom(this.ingredientsFrontendService.deleteIngredientFromRoom(code, name, measurement));
			}
			await firstValueFrom(this.ingredientsFrontendService.addIngredientToRoom(code, newIngredient));

			// Also save to user-specific ingredient history
			const username = this.authService.currentUser()?.username;
			if (username) {
				this.ingredientsFrontendService.saveUserIngredient(username, {
					name,
					measurement,
					amount
				}).subscribe({
					next: () => {
					},
					error: err => console.error('Failed to save ingredient to user history:', err)
				});
			}

			this.loadIngredients();
			this.resetForm();
		} catch (err) {
			console.error('Error adding ingredient:', err);
			this.ingredientError.set('Failed to add ingredient');
		}
	}

	deleteIngredient(ingredientName: string, measurement: string): void {
		this.ingredientsFrontendService.deleteIngredientFromRoom(this.roomCode(), ingredientName, measurement)
		.subscribe({
			next: () => this.loadIngredients(),
			error: err => {
				console.error('Error deleting ingredient:', err);
				this.ingredientError.set('Failed to delete ingredient');
			}
		});
	}

	public async removeIngredients(ingredients: Ingredient[]): Promise<void> {
		for (const i of ingredients) {
			const existing = this.availableIngredients().find(i2 => i2.name === i.name);
			if (existing) {
				existing.amount -= i.amount;
				await firstValueFrom(
					this.ingredientsFrontendService.deleteIngredientFromRoom(this.roomCode(), existing.name,
						existing.measurement)
				);

				if (existing.amount > 0) {
					await firstValueFrom(
						this.ingredientsFrontendService.addIngredientToRoom(this.roomCode(), existing)
					);
					this.availableIngredients.update(v => v.filter(i2 => i2.name !== i.name));
				}
			}
		}
	}
}
