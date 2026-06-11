import { Component, signal, computed, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Ingredient } from '../../backend/model';
import { IngredientsFrontendService } from '../core/ingredients-frontend-service';
import { AuthService } from '../core/auth-service';

@Component({
	selector: 'app-search-ingredient',
	standalone: true,
	templateUrl: './search-ingredient.html',
	styleUrl: './search-ingredient.scss',
	imports: [FormsModule, CommonModule]
})
export class SearchIngredient {
	@Output() ingredientSelected = new EventEmitter<Ingredient>();
	private readonly authService = inject(AuthService);
	private readonly ingredientService = inject(IngredientsFrontendService);

	protected query = signal('');
	protected isOpen = signal(false);
	protected userOptions = signal<Ingredient[]>([]);
	protected globalOptions = signal<Ingredient[]>([]);
	protected isLoading = signal(false);

	protected filteredOptions = computed(() => {
		const userOpts = this.userOptions();
		const globalOpts = this.globalOptions();

		// Combine user history (first) with global ingredients, removing duplicates
		const seen = new Set<string>();
		const combined: Ingredient[] = [];

		// User ingredients first (prioritized)
		for (const ing of userOpts) {
			const key = ing.name.toLowerCase();
			if (!seen.has(key)) {
				seen.add(key);
				combined.push(ing);
			}
		}

		// Then global ingredients (only if not already in user history)
		for (const ing of globalOpts) {
			const key = ing.name.toLowerCase();
			if (!seen.has(key)) {
				seen.add(key);
				combined.push(ing);
			}
		}

		return combined;
	});

	onInput(value: string) {
		this.query.set(value);

		const username = this.authService.currentUser()?.username;
		if (!value.trim() || !username) {
			this.userOptions.set([]);
			this.globalOptions.set([]);
			this.isOpen.set(false);
			return;
		}

		this.isLoading.set(true);
		this.isOpen.set(true);

		// Search user-specific ingredients first
		this.ingredientService.getUserIngredientsForPrefix(value, username).subscribe({
			next: (userIngredients) => {
				this.userOptions.set(userIngredients);

				// Also search global ingredients as fallback
				this.ingredientService.getIngredientsForPrefix(value, username).subscribe({
					next: (globalIngredients) => {
						this.globalOptions.set(globalIngredients);
						this.isLoading.set(false);
					},
					error: (err) => {
						console.error('Error fetching global ingredients:', err);
						this.globalOptions.set([]);
						this.isLoading.set(false);
					}
				});
			},
			error: (err) => {
				console.error('Error fetching user ingredients:', err);
				this.userOptions.set([]);

				// Fallback to global search if user search fails
				this.ingredientService.getIngredientsForPrefix(value, username).subscribe({
					next: (globalIngredients) => {
						this.globalOptions.set(globalIngredients);
						this.isLoading.set(false);
					},
					error: (err2) => {
						console.error('Error fetching global ingredients:', err2);
						this.globalOptions.set([]);
						this.isLoading.set(false);
					}
				});
			}
		});

		// Always emit the raw input so parent can use it even if not selected from dropdown
		this.ingredientSelected.emit({
			name: value,
			measurement: '',
			amount: 0
		});
	}

	selectOption(option: Ingredient) {
		this.query.set(option.name);
		this.isOpen.set(false);
		this.ingredientSelected.emit(option);
	}

	onFocus() {
		if (this.filteredOptions().length > 0) {
			this.isOpen.set(true);
		}
	}

	onBlur() {
		// Delay to allow click on option to register
		setTimeout(() => {
			this.isOpen.set(false);
		}, 200);
	}
}
