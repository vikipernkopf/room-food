import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth-service';
import { RecipeService } from '../core/recipe-service';
import { Recipe } from '../../backend/model';
import { DEFAULT_RECIPE_IMAGE } from '../core/user-form-validation';
import { RecipeFormValue, RecipeManagement, RecipeMealType } from './recipe-management/recipe-management';

@Component({
	selector: 'app-recipes',
	imports: [RecipeManagement],
	templateUrl: './recipes.html',
	styleUrl: './recipes.scss'
})
export class Recipes {
	protected activePopup: 'create' | 'edit' | null = null;
	private readonly recipeService = inject(RecipeService);
	private readonly authService = inject(AuthService);
	protected readonly currentUser = this.authService.currentUser;
	protected readonly defaultRecipeImage = DEFAULT_RECIPE_IMAGE;
	protected readonly recipes = signal<Recipe[]>([]);
	protected readonly recipesLoadError = signal('');
	protected readonly recipeSaveError = signal('');
	protected creating = false;
	protected readonly recipeToEdit = signal<Recipe | null>(null);
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
		effect(() => {
			const username = this.currentUser()?.username?.trim();

			if (!username) {
				this.recipes.set([]);
				this.recipesLoadError.set('');
				this.closePopup();
				return;
			}

			this.fetchRecipes(username);
		});
	}

	protected openCreateRecipe(): void {
		this.activePopup = 'create';
		this.recipeToEdit.set(null);
		this.recipeSaveError.set('');
		this.creating = false;
	}

	protected openEditRecipe(recipe: Recipe): void {
		this.recipeToEdit.set(recipe);
		this.activePopup = 'edit';
		this.recipeSaveError.set('');
		this.creating = false;
	}

	protected closePopup(): void {
		this.activePopup = null;
		this.recipeToEdit.set(null);
		this.recipeSaveError.set('');
		this.creating = false;
	}

	protected saveRecipe(payload: RecipeFormValue): void {
		this.recipeSaveError.set('');

		const username = this.currentUser()?.username;
		if (!username) {
			this.recipeSaveError.set('You must be logged in to create a recipe.');
			return;
		}

		if (!payload.name.trim()) {
			this.recipeSaveError.set('Recipe name is required.');
			return;
		}

		const editRecipeId = this.recipeToEdit()?.id;
		this.creating = true;

		const request = editRecipeId
			? this.recipeService.updateRecipe(editRecipeId, {
				name: payload.name.trim(),
				description: payload.description,
				image: payload.image,
				mealTypes: payload.mealTypes
			})
			: this.recipeService.createRecipe({
				authorUsername: username,
				name: payload.name.trim(),
				description: payload.description,
				image: payload.image,
				mealTypes: payload.mealTypes
			});

		request.subscribe({
			next: () => {
				this.creating = false;
				this.closePopup();
				this.fetchRecipes(username);
			},
			error: (error: any) => {
				this.creating = false;
				this.recipeSaveError.set(
					'Failed to save recipe: ' + (error?.error?.error || error?.message || 'Unknown error'));
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
				if (this.recipeToEdit()?.id === recipe.id) {
					this.closePopup();
				}
			},
			error: (error: any) => {
				this.creating = false;
				this.recipeSaveError.set(
					'Failed to delete recipe: ' + (error?.error?.error || error?.message || 'Unknown error'));
			}
		});
	}

	private fetchRecipes(username: string): void {
		this.recipeService.getRecipesByAuthorUsername(username).subscribe({
			next: (recipes: Recipe[]) => {
				this.recipes.set(this.sortRecipesByName(recipes || []));
				this.recipesLoadError.set('');
			},
			error: () => {
				this.recipes.set([]);
				this.recipesLoadError.set('Failed to load your recipes.');
			}
		});
	}

	private sortRecipesByName(recipes: Recipe[]): Recipe[] {
		return [...recipes].sort((a, b) => a.name.localeCompare(b.name, undefined, {
			sensitivity: 'base'
		}));
	}

	protected getRecipeCardDescription(recipe: Recipe): string {
		return recipe.description || 'No description provided.';
	}

	protected getRecipeImage(recipe: Recipe): string {
		return recipe.image || this.defaultRecipeImage;
	}
}
