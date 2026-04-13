import { Component, effect, inject, signal, WritableSignal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../core/auth-service';
import { RawRecipeRow, RecipeService } from '../core/recipe-service';
import { Recipe, User } from '../../backend/model';
import { DEFAULT_RECIPE_IMAGE } from '../core/user-form-validation';

type RecipeMealType = {
	value: string;
	viewValue: string;
};

@Component({
	selector: 'app-recipes',
	imports: [ReactiveFormsModule, FormsModule, MatSelectModule, JsonPipe],
	templateUrl: './recipes.html',
	styleUrl: './recipes.scss'
})
export class Recipes {
	protected activePopup: 'create' | 'edit' | null = null;
	private readonly recipeService = inject(RecipeService);
	private readonly authService = inject(AuthService);
	protected readonly currentUser: WritableSignal<User | null>;
	protected readonly defaultRecipeImage = DEFAULT_RECIPE_IMAGE;
	protected readonly recipes = signal<Recipe[]>([]);
	protected readonly rawRecipeRows = signal<RawRecipeRow[]>([]);
	protected readonly recipesLoadError = signal('');
	protected readonly rawRecipesLoadError = signal('');
	protected readonly recipeSaveError = signal('');
	protected creating = false;
	protected readonly recipeToEdit = signal<Recipe | null>(null);
	protected readonly recipeNameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
	protected readonly recipeDescriptionControl = new FormControl('');
	protected readonly recipeImageControl = new FormControl('');
	protected readonly recipeMealTypesControl = new FormControl<string[]>([], { nonNullable: true });
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
		this.currentUser = this.authService.currentUser;

		effect(() => {
			const username = this.currentUser()?.username?.trim();

			if (!username) {
				this.recipes.set([]);
				this.rawRecipeRows.set([]);
				this.recipesLoadError.set('');
				this.rawRecipesLoadError.set('');
				this.closePopup();
				return;
			}

			this.fetchRecipes(username);
			this.fetchRawRecipes();
		});
	}

	protected openCreateRecipe(): void {
		this.activePopup = 'create';
		this.recipeToEdit.set(null);
		this.resetRecipeForm();
	}

	protected openEditRecipe(recipe: Recipe): void {
		this.recipeToEdit.set(recipe);
		this.activePopup = 'edit';
		this.prefillRecipeForm(recipe);
	}

	protected get modalTitle(): string {
		return this.isEditMode ? 'Edit Recipe' : 'Create Recipe';
	}

	protected get submitButtonLabel(): string {
		if (this.creating) {
			return this.isEditMode ? 'Saving...' : 'Creating...';
		}

		return this.isEditMode ? 'Save Recipe' : 'Create Recipe';
	}

	protected get isEditMode(): boolean {
		return this.recipeToEdit() !== null;
	}

	protected closePopup(): void {
		this.activePopup = null;
		this.recipeToEdit.set(null);
		this.resetRecipeForm();
	}

	protected onOverlayClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			this.closePopup();
		}
	}

	protected saveRecipe(): void {
		this.recipeSaveError.set('');

		const username = this.currentUser()?.username;
		const name = this.recipeNameControl.value?.trim() ?? '';

		if (!username) {
			this.recipeSaveError.set('You must be logged in to create a recipe.');
			return;
		}

		if (!name) {
			this.recipeSaveError.set('Recipe name is required.');
			return;
		}

		const description = this.recipeDescriptionControl.value?.trim() || undefined;
		const image = this.recipeImageControl.value?.trim() || this.defaultRecipeImage;
		const mealTypes = this.recipeMealTypesControl.value;
		const editRecipeId = this.recipeToEdit()?.id;

		this.creating = true;
		const request = editRecipeId
			? this.recipeService.updateRecipe(editRecipeId, {
				name,
				description,
				image,
				mealTypes
			})
			: this.recipeService.createRecipe({
				authorUsername: username,
				name,
				description,
				image,
				mealTypes
			});

		request.subscribe({
			next: () => {
				this.creating = false;
				this.closePopup();
				this.fetchRecipes(username);
				this.fetchRawRecipes();
			},
			error: error => {
				this.creating = false;
				this.recipeSaveError.set(
					'Failed to save recipe: ' + (error.error?.error || error.message || 'Unknown error'));
			}
		});
	}

	protected deleteRecipe(recipe: Recipe): void {
		if (!recipe.id) {
			this.recipeSaveError.set('Unable to delete recipe: missing recipe id');
			return;
		}

		this.recipeSaveError.set('');
		this.creating = true;
		this.recipeService.deleteRecipe(recipe.id).subscribe({
			next: () => {
				this.creating = false;
				this.recipes.update(currentRecipes =>
					currentRecipes.filter(currentRecipe => currentRecipe.id !== recipe.id)
				);
				this.fetchRawRecipes();
				if (this.recipeToEdit()?.id === recipe.id) {
					this.closePopup();
				}
			},
			error: error => {
				this.creating = false;
				this.recipeSaveError.set(
					'Failed to delete recipe: ' + (error.error?.error || error.message || 'Unknown error'));
			}
		});
	}

	private fetchRecipes(username: string): void {
		this.recipeService.getRecipesByAuthorUsername(username).subscribe({
			next: recipes => {
				this.recipes.set(recipes || []);
				this.recipesLoadError.set('');
			},
			error: () => {
				this.recipes.set([]);
				this.recipesLoadError.set('Failed to load your recipes.');
			}
		});
	}

	private fetchRawRecipes(): void {
		this.recipeService.getRawRecipes().subscribe({
			next: rows => {
				this.rawRecipeRows.set(rows || []);
				this.rawRecipesLoadError.set('');
			},
			error: () => {
				this.rawRecipeRows.set([]);
				this.rawRecipesLoadError.set('Failed to load raw recipe rows.');
			}
		});
	}

	protected getRecipeCardDescription(recipe: Recipe): string {
		return recipe.description || 'No description provided.';
	}

	protected getRecipeImage(recipe: Recipe): string {
		return recipe.image || this.defaultRecipeImage;
	}

	private resetRecipeForm(): void {
		this.creating = false;
		this.recipeSaveError.set('');
		this.recipeNameControl.reset('');
		this.recipeDescriptionControl.reset('');
		this.recipeImageControl.reset('');
		this.recipeMealTypesControl.setValue([]);
	}

	private prefillRecipeForm(recipe: Recipe): void {
		this.resetRecipeForm();
		this.recipeNameControl.setValue(recipe.name);
		this.recipeDescriptionControl.setValue(recipe.description ?? '');
		this.recipeImageControl.setValue(recipe.image ?? this.defaultRecipeImage);
		this.recipeMealTypesControl.setValue(recipe.mealTypes ?? []);
	}
}
