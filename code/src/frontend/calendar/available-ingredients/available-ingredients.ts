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
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { MealService } from '../../core/meal-service';
import { ShoppingModal } from '../../shopping/shopping-modal'
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
	imports: [CommonModule, ShoppingModal],
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
		this.ingredients.set([]);

		this.mealService.getMealsByRoomCode(code).subscribe({
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
				}
				this.loading.set(false);
			},
			error: () => {
				this.ingredients.set([]);
				this.loading.set(false);
			}
		});
	}

	openShopping(): void {
		this.shoppingModal()?.open(this.ingredients());
	}

	onSaved(): void {
		this.loadIngredients();
	}
}
