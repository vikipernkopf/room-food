import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy, Component, effect, inject, input, OnInit, signal, viewChild, WritableSignal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { ShoppingFrontendService } from '../../core/shopping-frontend-service';
import { MealService } from '../../core/meal-service';
import { SearchIngredient } from '../../search-ingredient/search-ingredient';
import { Shopping, ShoppingIngredient } from '../../shopping/shopping';

interface Ingredient {
	id?: number;
	name: string;
	measurement: string;
	amount: number;
}

interface RecipeIngredient {
	id: number;
	name: string;
	measurement: string;
	amount: string | number;
}

interface MealAssignment {
	mealId: number;
	ingredientId: number;
	name: string;
	measurement: string;
	amount: number;
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
	readonly searchIngredient = viewChild<any>('searchIngredient');

	readonly neededIngredients = signal<Ingredient[]>([]);
	readonly mealAssignments = signal<MealAssignment[]>([]);
	readonly availableIngredients = signal<Ingredient[]>([]);
	readonly boughtIngredients = signal<Ingredient[]>([]);
	readonly loading = signal(true);

	readonly newIngredientName = signal('');
	readonly newIngredientMeasurement = signal('');
	readonly newIngredientAmount = signal<number | ''>('');
	readonly ingredientError: WritableSignal<string> = signal('');

	private readonly authService = inject(AuthService);
	private readonly ingredientsFrontendService = inject(IngredientsFrontendService);
	private readonly shoppingFrontendService = inject(ShoppingFrontendService);
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
		this.mealAssignments.set([]);
		this.availableIngredients.set([]);
		this.boughtIngredients.set([]);

		forkJoin({
			roomIngredients: this.ingredientsFrontendService.getIngredientsForRoom(code),
			boughtIngredients: this.ingredientsFrontendService.getBoughtIngredientsForRoom(code)
		}).subscribe({
			next: ({ roomIngredients, boughtIngredients }) => {
				this.availableIngredients.set(
					(roomIngredients || []).sort((a, b) =>
						(a.name || '').localeCompare(b.name || '')
					)
				);

				this.boughtIngredients.set(
					(boughtIngredients || []).sort((a, b) =>
						(a.name || '').localeCompare(b.name || '')
					)
				);

				this.computeNeededIngredients(code);
				console.log('Loaded roomIngredients:', roomIngredients);
				console.log('Loaded bought ingredients:', boughtIngredients);
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
					const now = new Date();
					const futureMeals = meals.filter(m => new Date(m.time) >= now && !m.cooked);

					const mealRecipeIngredients = await Promise.all(
						futureMeals.map(async meal => {
							const recipeIngredients = await Promise.all(
								(meal.recipeIds || []).map(rid =>
									firstValueFrom(this.ingredientsFrontendService.getIngredientsForRecipe(rid))
								)
							);
							return {
								mealId: meal.id,
								ingredients: recipeIngredients.flat()
							};
						})
					);

					const neededMap = new Map<number, Ingredient>();
					const assignments: MealAssignment[] = [];

					mealRecipeIngredients.forEach(({
						mealId,
						ingredients
					}) =>
						ingredients.forEach((r: unknown) => {
							const raw = r as RecipeIngredient;
							const id = raw.id;
							const name = raw.name;
							const measurement = raw.measurement;
							const amount = Number(raw.amount);

							const existing = neededMap.get(id);
							if (existing) {
								existing.amount += amount;
							} else {
								neededMap.set(id, {
									id,
									name,
									measurement,
									amount
								});
							}

							if (mealId) {
								assignments.push({
									mealId,
									ingredientId: id,
									name,
									measurement,
									amount
								});
							}
						}));

					for (const available of this.availableIngredients()) {
						let needed = available.id ? neededMap.get(available.id) : null;
						if (!needed) {
							needed = Array.from(neededMap.values())
							.find(n => n.name === available.name && n.measurement === available.measurement);
						}
						if (needed) {
							needed.amount -= Number(available.amount);
							if (needed.amount <= 0 && needed.id) {
								neededMap.delete(needed.id);
							}
						}
					}

					for (const bought of this.boughtIngredients()) {
						let needed = bought.id ? neededMap.get(bought.id) : null;
						if (!needed) {
							needed = Array.from(neededMap.values())
							.find(n => n.name === bought.name && n.measurement === bought.measurement);
						}
						if (needed) {
							needed.amount -= Number(bought.amount);
							if (needed.amount <= 0 && needed.id) {
								neededMap.delete(needed.id);
							}
						}
					}

					this.neededIngredients.set(
						Array.from(neededMap.values()).sort((a, b) =>
							(a.name || '').localeCompare(b.name || '')
						)
					);
					this.mealAssignments.set(assignments);
					this.loading.set(false);
				} catch (e) {
					console.error(e);
					this.neededIngredients.set([]);
					this.mealAssignments.set([]);
					this.loading.set(false);
				}
			},
			error: err => {
				console.error('Error loading needed ingredients:', err);
				this.neededIngredients.set([]);
				this.mealAssignments.set([]);
				this.loading.set(false);
			}
		});
	}

	private buildShoppingIngredients(): ShoppingIngredient[] {
		const needed = this.neededIngredients();
		const assignments = this.mealAssignments();
		const bought = this.boughtIngredients();

		const assignmentMap = new Map<number, MealAssignment[]>();
		for (const a of assignments) {
			const key = a.ingredientId;
			if (!assignmentMap.has(key)) {
				assignmentMap.set(key, []);
			}
			assignmentMap.get(key)!.push(a);
		}

		const boughtMap = new Map<number, number>();
		for (const b of bought) {
			if (b.id) {
				boughtMap.set(b.id, (boughtMap.get(b.id) || 0) + Number(b.amount));
			}
		}

		return needed.map(ing => {
			const key = ing.id!;
			const ingAssignments = assignmentMap.get(key) || [];
			const boughtAmount = boughtMap.get(key) || 0;
			const totalAssignmentAmount = ingAssignments.reduce((sum, a) => sum + a.amount, 0);

			const fullyBought = boughtAmount >= totalAssignmentAmount;
			const partiallyBought = boughtAmount > 0 && !fullyBought;
			const isChecked = fullyBought || partiallyBought;

			return {
				ingredientId: ing.id!,
				name: ing.name,
				measurement: ing.measurement,
				amount: ing.amount,
				checked: isChecked,
				initialChecked: isChecked,
				alreadyBought: fullyBought,
				boughtBy: fullyBought ? ingAssignments[0]?.name : undefined,
				assignments: ingAssignments.map(a => ({
					mealId: a.mealId,
					ingredientId: a.ingredientId,
					amount: a.amount,
					measurement: a.measurement
				}))
			};
		});
	}

	openShopping(): void {
		const shoppingIngredients = this.buildShoppingIngredients();
		this.shoppingModal()?.open(shoppingIngredients);
	}

	onSaved(): void {
		this.loadIngredients();
	}

	updateIngredients(): void {
		this.loadIngredients();
	}

	resetForm(): void {
		this.newIngredientName.set('');
		this.newIngredientMeasurement.set('');
		this.newIngredientAmount.set('');
		this.ingredientError.set('');
		this.searchIngredient()?.clear();
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
			if (found && found.id) {
				newIngredient.amount = Number(found.amount) + Number(amount);
				await firstValueFrom(this.ingredientsFrontendService.deleteIngredientFromRoom(code, found.id));
			}
			await firstValueFrom(this.ingredientsFrontendService.addIngredientToRoom(code, newIngredient));

			const username = this.authService.currentUser()?.username;
			if (username) {
				this.ingredientsFrontendService.saveUserIngredient(username, {
					name,
					measurement,
					amount
				})
				.subscribe({
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

	public unmarkBoughtIngredient(ingredient: Ingredient): void {
		if (!ingredient.id) {
			console.error('No ingredientId found on item');
			return;
		}

		const username = this.authService.currentUser()?.username;
		if (!username) {
			console.error('No logged in user found');
			return;
		}

		const matchingAssignments = this.mealAssignments().filter(
			a => a.ingredientId === ingredient.id
		);

		if (matchingAssignments.length === 0) {
			return;
		}

		const requests = matchingAssignments.map(a => ({
			mealId: a.mealId,
			ingredientId: ingredient.id!,
			username
		}));

		this.shoppingFrontendService.unmarkRoomBoughtBulk(requests)
		.subscribe({
			next: () => this.loadIngredients(),
			error: err => {
				console.error('Error unmarking bought ingredient:', err);
				this.ingredientError.set('Failed to unmark bought ingredient');
			}
		});
	}

	public deleteIngredient(ingredient: Ingredient) {
		if (ingredient.id) {
			this.ingredientsFrontendService.deleteIngredientFromRoom(this.roomCode(), ingredient.id)
			.subscribe({
				next: () => this.loadIngredients(),
				error: err => {
					console.error('Error deleting:', err);
					this.ingredientError.set('Failed to delete item');
				}
			});
		}
	}

	public async removeIngredients(ingredients: Ingredient[]): Promise<void> {
		for (const i of ingredients) {
			const existing = this.availableIngredients().find(i2 => i.id && i2.id === i.id || i2.name === i.name);
			if (existing) {
				existing.amount -= i.amount;
				if (existing.id) {
					await firstValueFrom(
						this.ingredientsFrontendService.deleteIngredientFromRoom(this.roomCode(), existing.id)
					);
				}

				if (existing.amount > 0) {
					await firstValueFrom(
						this.ingredientsFrontendService.addIngredientToRoom(this.roomCode(), existing)
					);
				}
			}
		}
		this.loadIngredients();
	}
}
