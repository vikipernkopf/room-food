import { Component, effect, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth-service';
import { RecipeService } from '../../core/recipe-service';
import { Ingredient, RecipeCreatePayload, RecipeVisibility } from '../../../backend/model';
import { DEFAULT_RECIPE_IMAGE } from '../../core/default-images';
import { SearchIngredient } from '../../search-ingredient/search-ingredient';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { firstValueFrom } from 'rxjs';

export type RecipeMealType = {
	value: string;
	viewValue: string;
};

@Component({
	selector: 'app-create-recipe',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatButtonModule,
		MatIconModule,
		SearchIngredient
	],
	templateUrl: './manage-recipe.html',
	styleUrl: './manage-recipe.scss'
})
export class ManageRecipe implements OnInit {
	readonly recipeId = input<number | null>(null);

	private readonly recipeService = inject(RecipeService);
	private readonly authService = inject(AuthService);
	private readonly ingredientService = inject(IngredientsFrontendService);
	private readonly router = inject(Router);

	protected readonly currentUser = this.authService.currentUser;
	protected readonly isSaving = signal(false);
	protected readonly saveError = signal('');
	protected readonly ingredientError = signal('');
	protected readonly defaultRecipeImage = DEFAULT_RECIPE_IMAGE;

	protected readonly isEditMode = signal(false);

	protected readonly recipeNameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
	protected readonly recipeDescriptionControl = new FormControl('');
	protected readonly recipeImageControl = new FormControl('');
	protected readonly recipeMealTypesControl = new FormControl<string[]>([], { nonNullable: true });
	protected readonly recipeVisibilityControl = new FormControl<RecipeVisibility>('private', { nonNullable: true });
	protected readonly recipeStepsControl = new FormControl('', [Validators.required]);

	protected readonly ingredients = signal<Array<{
		name: string;
		measurement: string;
		amount: number
	}>>([]);
	protected readonly currentIngredientName = signal('');
	protected readonly currentIngredientMeasurement = signal('');
	protected readonly currentIngredientAmount = signal('');

	protected readonly mealTypeOptions: RecipeMealType[] = [
		{
			value: 'breakfast',
			viewValue: 'Breakfast'
		},
		{
			value: 'lunch',
			viewValue: 'Lunch'
		},
		{
			value: 'dinner',
			viewValue: 'Dinner'
		},
		{
			value: 'snack',
			viewValue: 'Snack'
		}
	];

	constructor() {
		effect(() => this.loginCheck());

		effect(() => {
			const id = this.recipeId();
			console.log(id);

			if (id !== null && id !== undefined) {
				this.isEditMode.set(true);
				this.loadRecipeForEditing(id);
			} else {
				this.isEditMode.set(false);
				this.resetForm();
			}
		});
	}

	ngOnInit(): void {
	}

	async loginCheck() {
		let user;
		for (let i = 0; i < 5; i++) {
			user = this.currentUser();
			await new Promise(f => setTimeout(f, 40));
			if (user) {
				break;
			}
		}
		if (!user) {
			this.saveError.set('You must be logged in to manage a recipe');
		}
	}

	private loadRecipeForEditing(id: number): void {
		this.recipeService.getRecipeById(id).subscribe({
			next: recipe => {
				if (recipe) {
					this.recipeNameControl.setValue(recipe.name ?? '');
					this.recipeDescriptionControl.setValue(recipe.description ?? '');
					this.recipeImageControl.setValue(recipe.image ?? '');
					this.recipeMealTypesControl.setValue(recipe.mealTypes ?? []);
					this.recipeVisibilityControl.setValue(recipe.visibility ?? 'private');

					// Fixed: Explicitly populating cooking steps from API layout structure
					this.recipeStepsControl.setValue((recipe as any).instructions || recipe.description || '');

					this.ingredients.set(recipe.ingredients ?? []);
				}
			},
			error: err => {
				console.error('Failed to load recipe details', err);
				this.saveError.set('Could not load recipe details for editing.');
			}
		});
	}

	onIngredientSelected(ingredient: Ingredient) {
		this.currentIngredientName.set(ingredient.name);
		if (ingredient.measurement !== '') {
			this.currentIngredientMeasurement.set(ingredient.measurement);
		}
	}

	addIngredient() {
		const name = this.currentIngredientName().trim();
		const measurement = this.currentIngredientMeasurement().trim();
		const amount = Number(this.currentIngredientAmount());

		if (!name || !measurement || !amount || amount <= 0) {
			this.ingredientError.set('Please fill in all ingredient fields with valid values');
			return;
		}

		const newIngredient = {
			name,
			measurement,
			amount
		};
		const found = this.ingredients().find(s => s.name === newIngredient.name);

		if (found) {
			found.amount = newIngredient.amount;
			found.measurement = newIngredient.measurement;
			this.ingredients.update(list => [...list]);
		} else {
			this.ingredients.update(list => [...list, newIngredient]);
		}

		this.currentIngredientMeasurement.set('');
		this.currentIngredientAmount.set('');
		this.ingredientError.set('');
	}

	removeIngredient(index: number) {
		this.ingredients.update(list => list.filter((_, i) => i !== index));
	}

	submitForm(): void {
		if (this.isEditMode()) {
			this.updateRecipe();
		} else {
			this.createRecipe();
		}
	}

	createRecipe() {
		const username = this.authService.currentUser()?.username;
		if (!username) {
			this.saveError.set('You must be logged in to create a recipe');
			return;
		}

		this.isSaving.set(true);
		this.saveError.set('');

		const payload: RecipeCreatePayload = this.buildFormPayload(username);

		this.recipeService.createRecipe(payload).subscribe({
			next: () => this.handlePostSaveActions(),
			error: err => {
				this.isSaving.set(false);
				this.saveError.set(err?.error?.message || 'Failed to create recipe');
			}
		});
	}

	updateRecipe() {
		const username = this.authService.currentUser()?.username;
		const id = this.recipeId();

		if (!username || !id) {
			this.saveError.set('Invalid reference state or missing authentication credentials.');
			return;
		}

		this.isSaving.set(true);
		this.saveError.set('');

		const payload = {
			...this.buildFormPayload(username),
			id
		};

		this.recipeService.updateRecipe(id, payload as any).subscribe({
			next: () => this.handlePostSaveActions(),
			error: err => {
				this.isSaving.set(false);
				this.saveError.set(err?.error?.message || 'Failed to update recipe changes.');
			}
		});
	}

	private buildFormPayload(username: string): RecipeCreatePayload {
		return {
			authorUsername: username,
			name: this.recipeNameControl.value?.trim() ?? '',
			description: this.recipeDescriptionControl.value?.trim() || undefined,
			image: this.recipeImageControl.value?.trim() || this.defaultRecipeImage,
			mealTypes: this.recipeMealTypesControl.value ?? [],
			visibility: this.recipeVisibilityControl.value ?? 'private',
			ingredients: this.ingredients(),
			instructions: this.recipeStepsControl.value?.trim() ?? ''
		} as any;
	}

	private async handlePostSaveActions() {
		this.isSaving.set(false);
		const username = this.authService.currentUser()?.username;

		if (username) {
			for (const ing of this.ingredients()) {
				try {
					await firstValueFrom(this.ingredientService.saveUserIngredient(username, ing));
				} catch (err) {
					console.error('Failed to save ingredient to user history:', err);
				}
			}
		}

		this.router.navigate(['/recipes']).then(() => this.resetForm());
	}

	private resetForm() {
		this.recipeNameControl.reset('');
		this.recipeDescriptionControl.reset('');
		this.recipeImageControl.reset('');
		this.recipeMealTypesControl.reset([]);
		this.recipeVisibilityControl.reset('private');
		this.recipeStepsControl.reset('');
		this.ingredients.set([]);
	}
}
