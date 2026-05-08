import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth-service';
import { RecipeService } from '../../core/recipe-service';
import { IngredientsFrontendService } from '../../core/ingredients-frontend-service';
import { Ingredient, RecipeVisibility } from '../../../backend/model';
import { DEFAULT_RECIPE_IMAGE } from '../../core/user-form-validation';
import { SearchIngredient } from '../recipe-management/search-ingredient/search-ingredient';
import { RecipeMealType } from '../recipe-management/recipe-management';
import {MatCard} from '@angular/material/card';

@Component({
	selector: 'app-create-recipe',
	standalone: true,
	imports: [
		FormsModule,
		ReactiveFormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		CommonModule,
		SearchIngredient,
		MatCard
	],
	templateUrl: './create-recipe.html',
	styleUrl: './create-recipe.scss'
})
export class CreateRecipe {
	private readonly recipeService = inject(RecipeService);
	private readonly authService = inject(AuthService);
	private readonly ingredientService = inject(IngredientsFrontendService);

	protected readonly currentUser = this.authService.currentUser;
	protected readonly isCreating = signal(false);
	protected readonly saveError = signal('');
	protected readonly ingredientError = signal('');
	protected readonly defaultRecipeImage = DEFAULT_RECIPE_IMAGE;

	// Recipe form controls
	protected readonly recipeNameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
	protected readonly recipeDescriptionControl = new FormControl('');
	protected readonly recipeImageControl = new FormControl('');
	protected readonly recipeMealTypesControl = new FormControl<string[]>([], { nonNullable: true });
	protected readonly recipeVisibilityControl = new FormControl<RecipeVisibility>('private', { nonNullable: true });
	protected readonly recipeStepsControl = new FormControl('', [Validators.required]);

	// Ingredients management
	protected readonly ingredients = signal<Array<{ name: string; measurement: string; amount: number }>>([]);
	protected readonly currentIngredientName = signal('');
	protected readonly currentIngredientMeasurement = signal('');
	protected readonly currentIngredientAmount = signal('');

	protected readonly mealTypeOptions: RecipeMealType[] = [
		{ value: 'breakfast', viewValue: 'Breakfast' },
		{ value: 'lunch', viewValue: 'Lunch' },
		{ value: 'dinner', viewValue: 'Dinner' },
		{ value: 'snack', viewValue: 'Snack' }
	];

	constructor() {
		effect(() => {
			this.loginCheck();
		});
	}

	async loginCheck(){
		let user;
		for(let i=0; i<5; i++){
			user = this.currentUser();
			await new Promise(f => setTimeout(f, 40));
			if(user){
				break;
			}
		}
		if (!user) {
			this.saveError.set('You must be logged in to create a recipe');
		}
	}

	onIngredientSelected(ingredient: Ingredient) {
		this.currentIngredientName.set(ingredient.name);
		this.currentIngredientMeasurement.set(ingredient.measurement);
	}

	addIngredient() {
		const name = this.currentIngredientName().trim();
		const measurement = this.currentIngredientMeasurement().trim();
		const amount = Number(this.currentIngredientAmount());

		if (!name || !measurement || !amount || amount <= 0) {
			this.ingredientError.set('Please fill in all ingredient fields with valid values');
			return;
		}

		const newIngredient = { name, measurement, amount };
		this.ingredients.update(list => [...list, newIngredient]);

		// Reset ingredient form
		this.currentIngredientName.set('');
		this.currentIngredientMeasurement.set('');
		this.currentIngredientAmount.set('');
		this.ingredientError.set('');
	}

	removeIngredient(index: number) {
		this.ingredients.update(list => list.filter((_, i) => i !== index));
	}

	createRecipe() {
		if (this.isCreating()) {
			return;
		}

		this.recipeNameControl.markAsTouched();
		this.recipeStepsControl.markAsTouched();

		if (this.recipeNameControl.invalid || this.recipeStepsControl.invalid) {
			this.saveError.set('Please fill in recipe name and cooking steps');
			return;
		}

		const username = this.currentUser()?.username;
		if (!username) {
			this.saveError.set('You must be logged in to create a recipe');
			return;
		}

		this.isCreating.set(true);
		this.saveError.set('');

		const payload = {
			authorUsername: username,
			name: this.recipeNameControl.value?.trim() ?? '',
			description: this.recipeDescriptionControl.value?.trim() || undefined,
			image: this.recipeImageControl.value?.trim() || this.defaultRecipeImage,
			mealTypes: this.recipeMealTypesControl.value,
			visibility: this.recipeVisibilityControl.value
		};

		this.recipeService.createRecipe(payload).subscribe({
			next: (response) => {
				// TODO: Add ingredients and steps to the recipe
				this.isCreating.set(false);
				this.saveError.set('');
				// Reset form
				this.resetForm();
				// Navigate to recipes page or show success message
				console.log('Recipe created successfully:', response);
			},
			error: (err) => {
				this.isCreating.set(false);
				this.saveError.set(err?.error?.message || 'Failed to create recipe');
				console.error('Error creating recipe:', err);
			}
		});
	}

	private resetForm() {
		this.recipeNameControl.reset('');
		this.recipeDescriptionControl.reset('');
		this.recipeImageControl.reset('');
		this.recipeMealTypesControl.reset([]);
		this.recipeVisibilityControl.reset('private');
		this.recipeStepsControl.reset('');
		this.ingredients.set([]);
		this.currentIngredientName.set('');
		this.currentIngredientMeasurement.set('');
		this.currentIngredientAmount.set('');
	}
}
