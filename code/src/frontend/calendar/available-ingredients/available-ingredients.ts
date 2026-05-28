import {Component, effect, Input, OnInit, signal, WritableSignal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { MealService } from '../../core/meal-service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {SearchIngredient} from '../../recipes/recipe-management/search-ingredient/search-ingredient';

interface Ingredient {
	name: string;
	measurement: string;
	amount: number;
}

@Component({
	selector: 'app-avaliable-ingredients',
	imports: [
		CommonModule,
		FormsModule,
		SearchIngredient
	],
	templateUrl: './available-ingredients.html',
	styleUrl: './available-ingredients.scss',
	standalone: true
})
export class AvailableIngredients implements OnInit {
	@Input()
	roomCode: string = '';

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
		this.neededIngredients.set([]);
		this.availableIngredients.set([]);

		// Load needed ingredients from meals
		this.mealService.getMealsByRoomCode(this.roomCode).subscribe({
			next: async meals => {
				try {
					const recipeIds: number[] = [];
					meals.forEach(m => {
						if(m.cooked) return;
						(m.recipeIds || []).forEach(rid => recipeIds.push(rid));
					});

					// Fetch ingredients for all recipes in parallel
					const promises = recipeIds.map(rid =>
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

	public async removeIngredients(ingredients:Ingredient[]): Promise<void>{
		//console.log(`REMOVING ${ingredients}`);
		for (const i of ingredients) {
			const existing = this.availableIngredients().find(i2 => i2.name==i.name);
			//console.log(i);
			if(existing){
				//console.log(`exists ${existing}`);
				existing.amount-=i.amount;
				//console.log(`exists am ${existing.amount}`);
				await firstValueFrom(
					this.ingredientsFrontendService.
					deleteIngredientFromRoom(this.roomCode, existing.name, existing.measurement)
				);

				if(existing.amount>0){
					await firstValueFrom(
						this.ingredientsFrontendService.
						addIngredientToRoom(this.roomCode, existing)
					);
					this.availableIngredients.update(v => v.filter(i2 => i2.name!==i.name));
				}
			}
		}
	}

	async updateIngredients(){
		this.loadIngredients();
	}
}
