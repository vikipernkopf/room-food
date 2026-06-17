import {
	Component,
	ChangeDetectionStrategy,
	effect,
	inject,
	OnInit,
	signal,
	viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { Shopping } from '../../shopping/shopping';
import { forkJoin } from 'rxjs';

interface Ingredient {
	name: string;
	measurement: string;
	amount: number;
}

@Component({
	selector: 'app-ingredient-list',
	standalone: true,
	imports: [CommonModule, Shopping],
	templateUrl: './ingredient-list.html',
	styleUrl: './ingredient-list.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngredientList implements OnInit {
	readonly shoppingModal = viewChild(Shopping);

	// Ingredients from MealIngredientAssignment minus bought/personal bought
	readonly ingredients = signal<Ingredient[]>([]);
	readonly loading = signal(true);
	readonly username = signal('');

	private readonly authService = inject(AuthService);
	private readonly ingredientsFrontendService = inject(IngredientsFrontendService);

	constructor() {
		effect(() => {
			const user = this.authService.currentUser();
			if (user?.username) {
				this.username.set(user.username);
				this.loadIngredients(user.username);
			} else if (user === null) {
				this.loading.set(false);
			}
		});
	}

	ngOnInit(): void {
	}

	loadIngredients(username: string): void {
		this.loading.set(true);
		this.ingredients.set([]);

		// Load assigned ingredients and subtract bought in parallel
		forkJoin({
			assigned: this.ingredientsFrontendService.getIngredientsForUser(username),
			bought: this.ingredientsFrontendService.getBoughtIngredientsForUserRooms(username)
		}).subscribe({
			next: ({
				assigned,
				bought
			}) => {
				const neededMap = new Map<string, Ingredient>();

				// Start with assigned ingredients from MealIngredientAssignment
				(assigned || []).forEach((ing: Ingredient) => {
					const key = ing.name + '||' + ing.measurement;
					const existing = neededMap.get(key);
					if (existing) {
						existing.amount += Number(ing.amount);
					} else {
						neededMap.set(key, {
							...ing,
							amount: Number(ing.amount)
						});
					}
				});

				// Subtract room-level bought
				(bought || []).forEach((b: Ingredient) => {
					const key = b.name + '||' + b.measurement;
					const needed = neededMap.get(key);
					if (needed) {
						needed.amount -= Number(b.amount);
						if (needed.amount <= 0) {
							neededMap.delete(key);
						}
					}
				});

				this.ingredients.set(Array.from(neededMap.values()));
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
		const user = this.username();
		if (user) {
			this.loadIngredients(user);
		}
	}
}
