import {
	Component,
	ChangeDetectionStrategy,
	effect,
	inject,
	signal,
	viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { Shopping } from '../../shopping/shopping';

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
export class IngredientList {
	readonly shoppingModal = viewChild(Shopping);

	// Ingredients still needed (for display only)
	readonly ingredients = signal<Ingredient[]>([]);
	readonly loading = signal(false);
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

	loadIngredients(username: string): void {
		this.loading.set(true);

		// Fetch only NOT BOUGHT ingredients for display
		this.ingredientsFrontendService.getIngredientsForUser(username).subscribe({
			next: ingredients => {
				const validIngredients = Array.isArray(ingredients) ? ingredients : [];

				const aggregatedMap = new Map<string, Ingredient>();

				validIngredients.forEach(ing => {
					const name = ing.name || '';
					const measurement = ing.measurement || '';
					const amount = Number(ing.amount) || 0;
					const key = `${name.toLowerCase().trim()}|${measurement.toLowerCase().trim()}`;

					const existing = aggregatedMap.get(key);
					if (existing) {
						existing.amount += amount;
					} else {
						aggregatedMap.set(key, {
							name,
							measurement,
							amount
						});
					}
				});

				this.ingredients.set(
					Array.from(aggregatedMap.values()).sort((a, b) =>
						(a.name || '').localeCompare(b.name || '')
					)
				);
				this.loading.set(false);
			},
			error: () => {
				this.ingredients.set([]);
				this.loading.set(false);
			}
		});
	}

	openShopping(): void {
		// Modal fetches ALL assignments itself (both bought and not bought)
		this.shoppingModal()?.open();
	}

	onSaved(): void {
		const user = this.username();
		if (user) {
			this.loadIngredients(user);
		}
	}
}
