import { Component, signal, computed, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Ingredient } from '../../../../backend/model';
import { IngredientsFrontendService } from '../../../core/ingredients-frontend-service';
import { AuthService } from '../../../core/auth-service';

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
	protected options = signal<Ingredient[]>([]);
	protected isLoading = signal(false);

	protected filteredOptions = computed(() => {
		return this.options();
	});

	onInput(value: string) {
		this.query.set(value);

		const username = this.authService.currentUser()?.username;
		if (!value.trim() || !username) {
			this.options.set([]);
			this.isOpen.set(false);
			return;
		}

		this.isLoading.set(true);
		this.isOpen.set(true);

		this.ingredientService.getIngredientsForPrefix(value, username).subscribe({
			next: (ingredients) => {
				this.options.set(ingredients);
				this.isLoading.set(false);
			},
			error: (err) => {
				console.error('Error fetching ingredients:', err);
				this.options.set([]);
				this.isLoading.set(false);
			}
		});
	}

	selectOption(option: Ingredient) {
		this.query.set(option.name);
		this.isOpen.set(false);
		this.ingredientSelected.emit(option);
	}

	onFocus() {
		if (this.options().length > 0) {
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
