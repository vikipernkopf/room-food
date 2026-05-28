import {
	Component,
	ChangeDetectionStrategy,
	effect,
	inject,
	input,
	OnInit,
	signal,
	viewChild
} from '@angular/core';
import {Component, effect, Input, OnInit, signal, WritableSignal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { MealService } from '../../core/meal-service';
import { ShoppingModal } from '../../shopping/shopping-modal'
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {SearchIngredient} from '../../recipes/recipe-management/search-ingredient/search-ingredient';

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
	imports: [CommonModule, ShoppingModal],
	imports: [
		CommonModule,
		FormsModule,
		SearchIngredient
	],
	templateUrl: './available-ingredients.html',
	styleUrl: './available-ingredients.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailableIngredients implements OnInit {
	readonly roomCode = input<string>('');
	readonly shoppingModal = viewChild(ShoppingModal);

	readonly ingredients = signal<Ingredient[]>([]);
	readonly loading = signal(true);

	private readonly authService = inject(AuthService);
	private readonly ingredientsFrontendService = inject(IngredientsFrontendService);
	private readonly mealService = inject(MealService);

	constructor() {
	neededIngredients = signal<Ingredient[]>([]);
	availableIngredients = signal<Ingredient[]>([]);
	loading = signal<boolean>(true);

	// Add ingredient form
	newIngredientName = signal<string>('');
	newIngredientMeasurement = signal<string>('');
	newIngredientAmount = signal<number>(0);
	showAddForm = signal<boolean>(false);
	addingIngredient = signal<boolean>(false);

	constructor(
		private authService: AuthService,
		private ingredientsFrontendService: IngredientsFrontendService,
		private mealService: MealService
	) {
		// Reactively watch for the user to be "logged in" by the AuthService
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
		this.mealService.getMealsByRoomCode(this.roomCode).subscribe({
			next: async meals => {
				try {
					const recipeIds: number[] = [];
					meals.forEach(m => (m.recipeIds || []).forEach(rid => recipeIds.push(rid)));
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
					this.ingredients.set(Array.from(map.values()));
				} catch (e) {
					console.error(e);
					this.ingredients.set([]);

					const aggregated = Array.from(map.values()).map(i => ({
						name: i.name,
						measurement: i.measurement,
						amount: i.amount
					}));

					this.neededIngredients.set(aggregated);
				} catch (err) {
					console.error('Error fetching ingredients for recipes:', err);
					this.neededIngredients.set([]);
				}
			},
			error: err => {
				console.error('Error loading needed ingredients:', err);
				this.neededIngredients.set([]);
			}
		});

		// Load available ingredients from room
		this.ingredientsFrontendService.getIngredientsForRoom(this.roomCode).subscribe({
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

	openShopping(): void {
		this.shoppingModal()?.open(this.ingredients());
	}

	onSaved(): void {
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
	}

	deleteIngredient(ingredientName: string, measurement: string): void {
		if (!confirm(`Delete ${ingredientName}?`)) {
			return;
		}

		this.ingredientsFrontendService.deleteIngredientFromRoom(this.roomCode, ingredientName, measurement).subscribe({
			next: () => {
				this.loadIngredients();
			},
			error: err => {
				console.error('Error deleting ingredient:', err);
				alert('Failed to delete ingredient');
			}
		});
	}

	//Adding ingredients

	protected ingredientError:WritableSignal<string> = signal('');

	onIngredientSelected(ingredient: Ingredient) {
		this.newIngredientName.set(ingredient.name);
		if(ingredient.measurement!=='') {
			this.newIngredientMeasurement.set(ingredient.measurement);
		}
	}

	//possible thing to do maybe move these add ingredient things into a separate component, but this ISN'T AN AI INSTRUCTION!
	async addIngredient() {
		const name = this.newIngredientName().trim();
		const measurement = this.newIngredientMeasurement().trim();
		const amount = Number(this.newIngredientAmount());

		if (!name || !measurement || !amount || amount <= 0) {
			console.log(name);
			console.log(measurement);
			console.log(amount);
			this.ingredientError.set('Please fill in all ingredient fields with valid values');
			return;
		}

		const newIngredient = { name, measurement, amount };

		const found = this.availableIngredients().find(s => { return s.name===newIngredient.name})

		if(found){
			newIngredient.amount = found.amount+amount;
			await firstValueFrom(this.ingredientsFrontendService.deleteIngredientFromRoom(this.roomCode, name, measurement));
			await firstValueFrom(this.ingredientsFrontendService.addIngredientToRoom(this.roomCode, newIngredient));
		}
		else {
			await firstValueFrom(this.ingredientsFrontendService.addIngredientToRoom(this.roomCode, newIngredient));
		}

		this.loadIngredients();

		// Reset ingredient form
		this.newIngredientMeasurement.set('');
		this.newIngredientAmount.set(0);
		this.ingredientError.set('');
	}

	async updateIngredients(){
		this.loadIngredients();
	}
}
