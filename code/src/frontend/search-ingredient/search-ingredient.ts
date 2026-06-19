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
	@Output()
	ingredientSelected = new EventEmitter<Ingredient>();
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

		const seen = new Set<string>();
		const combined: Ingredient[] = [];

		for (const ing of userOpts) {
			if (!ing?.name) {
				continue;
			}
			const key = ing.name.toLowerCase();
			if (!seen.has(key)) {
				seen.add(key);
				combined.push(ing);
			}
		}

		for (const ing of globalOpts) {
			if (!ing?.name) {
				continue;
			}
			const key = ing.name.toLowerCase();
			if (!seen.has(key)) {
				seen.add(key);
				combined.push(ing);
			}
		}

		return combined;
	});

	public clear(): void {
		this.query.set('');
		this.isOpen.set(false);
		this.userOptions.set([]);
		this.globalOptions.set([]);
	}

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

		this.ingredientService.getUserIngredientsForPrefix(value, username).subscribe({
			next: userIngredients => {
				this.userOptions.set(userIngredients);

				this.ingredientService.getIngredientsForPrefix(value, username).subscribe({
					next: globalIngredients => {
						this.globalOptions.set(globalIngredients);
						this.isLoading.set(false);
					},
					error: err => {
						console.error('Error fetching global ingredients:', err);
						this.globalOptions.set([]);
						this.isLoading.set(false);
					}
				});
			},
			error: err => {
				console.error('Error fetching user ingredients:', err);
				this.userOptions.set([]);

				this.ingredientService.getIngredientsForPrefix(value, username).subscribe({
					next: globalIngredients => {
						this.globalOptions.set(globalIngredients);
						this.isLoading.set(false);
					},
					error: err2 => {
						console.error('Error fetching global ingredients:', err2);
						this.globalOptions.set([]);
						this.isLoading.set(false);
					}
				});
			}
		});

		this.ingredientSelected.emit({
			name: value,
			measurement: '',
			amount: 0
		});
	}

	selectOption(option: Ingredient) {
		if (!option?.name) {
			return;
		}
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
		setTimeout(() => this.isOpen.set(false), 200);
	}
}
