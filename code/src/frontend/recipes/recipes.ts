import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth-service';
import { RecipeService } from '../core/recipe-service';
import { Ingredient, Recipe, RecipeCreatePayload, RecipeUpdatePayload, RecipeVisibility } from '../../backend/model';
import { DEFAULT_RECIPE_IMAGE } from '../core/user-form-validation';
import { IngredientsFrontendService } from '../core/ingredients-frontend-service';

export type RecipeFormValue = {
	name: string;
	description?: string;
	image?: string;
	mealTypes: string[];
	visibility: RecipeVisibility;
	ingredients?: Ingredient[];
	instructions: string;
};

@Component({
	selector: 'app-recipes',
	imports: [],
	templateUrl: './recipes.html',
	styleUrl: './recipes.scss'
})
export class Recipes {
	protected readonly activePopup = signal<'create' | 'edit' | null>(null);
	private readonly recipeService = inject(RecipeService);
	private readonly authService = inject(AuthService);
	private readonly ingredientService = inject(IngredientsFrontendService);
	protected readonly currentUser = this.authService.currentUser;
	protected readonly defaultRecipeImage = DEFAULT_RECIPE_IMAGE;
	protected readonly recipes = signal<Recipe[]>([]);
	protected readonly searchTerm = signal('');
	protected readonly isSearchMode = computed(() => this.searchTerm().trim().length > 0);
	protected readonly recipesLoadError = signal('');
	protected readonly recipeSaveError = signal('');
	protected readonly recipeActionError = signal('');
	protected readonly creating = signal(false);
	protected readonly savingRecipeId = signal<number | null>(null);
	protected readonly recipeToEdit = signal<Recipe | null>(null);
	private readonly router = inject(Router);

	/*protected readonly mealTypeOptions: RecipeMealType[] = [
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
	];*/

	constructor() {
		effect(() => {
			const username = this.currentUser()?.username?.trim();
			if (!username) {
				this.recipes.set([]);
				this.recipesLoadError.set('');
				return;
			}
			this.loadRecipesForCurrentMode(username);
		});
	}

	protected updateSearchTerm(event: Event): void {
		const target = event.target as HTMLInputElement | null;
		this.searchTerm.set(target?.value ?? '');
		this.recipeActionError.set('');
	}

	protected openCreateRecipe(): void {
		this.router.navigate(['/recipes/create']);
	}

	// Redirects directly to the dedicated edit route structure
	protected openEditRecipe(recipe: Recipe): void {
		if (recipe?.id) {
			this.router.navigate(['/recipes/edit', recipe.id]);
		}
	}

	protected closePopup(): void {
		this.activePopup.set(null);
		this.recipeToEdit.set(null);
		this.recipeSaveError.set('');
		this.creating.set(false);
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
		this.creating.set(true);

		if (editRecipeId) {
			const updatePayload: RecipeUpdatePayload = {
				name: payload.name.trim(),
				description: payload.description,
				image: payload.image,
				mealTypes: payload.mealTypes,
				visibility: payload.visibility,
				ingredients: payload.ingredients ?? [],
				instructions: payload.instructions
			};

			this.recipeService.updateRecipe(editRecipeId, updatePayload).subscribe({
				next: () => {
					this.saveIngredientsToUserHistory(username, payload.ingredients ?? []);
					this.handleSaveSuccess(username);
				},
				error: err => this.handleSaveError(err)
			});
		} else {
			const createPayload: RecipeCreatePayload = {
				authorUsername: username,
				name: payload.name.trim(),
				description: payload.description,
				image: payload.image,
				mealTypes: payload.mealTypes,
				visibility: payload.visibility,
				ingredients: payload.ingredients ?? [],
				instructions: payload.instructions
			};

			this.recipeService.createRecipe(createPayload).subscribe({
				next: () => {
					this.saveIngredientsToUserHistory(username, payload.ingredients ?? []);
					this.handleSaveSuccess(username);
				},
				error: err => this.handleSaveError(err)
			});
		}
	}

	private saveIngredientsToUserHistory(username: string, ingredients: {
		name: string;
		measurement: string;
		amount: number
	}[]): void {
		for (const ing of ingredients) {
			this.ingredientService.saveUserIngredient(username, ing).subscribe({
				next: () => {
				},
				error: err => console.error('Failed to save ingredient to user history:', err)
			});
		}
	}

	private handleSaveSuccess(username: string): void {
		this.creating.set(false);
		this.closePopup();
		this.loadRecipesForCurrentMode(username);
	}

	private handleSaveError(error: any): void {
		this.creating.set(false);
		this.recipeSaveError.set(
			'Failed to save recipe: ' + (error?.error?.error || error?.message || 'Unknown error')
		);
	}

	protected deleteRecipe(recipe: Recipe): void {
		if (!this.isOwnedRecipe(recipe)) {
			this.recipeActionError.set('You can only delete your own recipes.');
			return;
		}

		if (!recipe.id) {
			this.recipeSaveError.set('Unable to delete recipe: missing recipe id');
			return;
		}

		this.recipeSaveError.set('');
		this.creating.set(true);
		this.recipeService.deleteRecipe(recipe.id).subscribe({
			next: () => {
				this.creating.set(false);
				this.recipes.update(currentRecipes =>
					currentRecipes.filter(currentRecipe => currentRecipe.id !== recipe.id)
				);
				if (this.recipeToEdit()?.id === recipe.id) {
					this.closePopup();
				}
			},
			error: (error: any) => {
				this.creating.set(false);
				this.recipeSaveError.set(
					'Failed to delete recipe: ' + (error?.error?.error || error?.message || 'Unknown error'));
			}
		});
	}

	protected savePublicRecipe(recipe: Recipe): void {
		const username = this.currentUser()?.username?.trim();
		if (!username) {
			this.recipeActionError.set('You must be logged in to save recipes.');
			return;
		}

		if (!this.canSaveRecipe(recipe)) {
			return;
		}

		this.recipeActionError.set('');
		this.savingRecipeId.set(recipe.id);

		this.recipeService.savePublicRecipe(recipe.id, username).subscribe({
			next: () => {
				this.savingRecipeId.set(null);
				this.loadRecipesForCurrentMode(username);
			},
			error: (error: any) => {
				this.savingRecipeId.set(null);
				this.recipeActionError.set(
					'Failed to save recipe: ' + (error?.error?.error || error?.message || 'Unknown error')
				);
			}
		});
	}

	protected canEditRecipe(recipe: Recipe): boolean {
		return !this.isSearchMode() && this.isOwnedRecipe(recipe);
	}

	protected canSaveRecipe(recipe: Recipe): boolean {
		if (!recipe.id || recipe.visibility !== 'public') {
			return false;
		}

		if (this.isOwnedRecipe(recipe)) {
			return false;
		}

		return !recipe.isSavedByUser;
	}

	protected recipeAuthorLabel(recipe: Recipe): string {
		return recipe.authorUsername ? `@${recipe.authorUsername}` : 'Unknown author';
	}

	private isOwnedRecipe(recipe: Recipe): boolean {
		if (recipe.isOwnedByUser !== undefined) {
			return recipe.isOwnedByUser;
		}

		const username = this.currentUser()?.username?.trim();
		if (!username) {
			return false;
		}

		return recipe.authorUsername?.toLowerCase() === username.toLowerCase();
	}

	private loadRecipesForCurrentMode(username: string): void {
		const search = this.searchTerm().trim();
		if (search) {
			this.fetchPublicRecipes(search);
			return;
		}

		this.fetchUserRecipes(username);
	}

	private fetchUserRecipes(username: string): void {
		// Reset loading state
		this.recipes.set([]);
		this.recipesLoadError.set('');

		// Fetch authored recipes
		this.recipeService.getRecipesByAuthorUsername(username).subscribe({
			next: (authoredRecipes: Recipe[]) => {
				// Fetch saved recipes after authored load
				this.recipeService.getSavedRecipesByUsername(username).subscribe({
					next: (savedRecipes: Recipe[]) => {
						// Merge both, authored first, then saved (deduplicated by id)
						const merged = this.mergeAndDeduplicateRecipes(authoredRecipes, savedRecipes);
						this.recipes.set(this.sortRecipesByName(merged));
						this.recipesLoadError.set('');
					},
					error: () => {
						// Still show authored recipes if saved fails
						this.recipes.set(this.sortRecipesByName(authoredRecipes || []));
						this.recipesLoadError.set('Failed to load saved recipes.');
					}
				});
			},
			error: () => {
				this.recipes.set([]);
				this.recipesLoadError.set('Failed to load your recipes.');
			}
		});
	}

	private mergeAndDeduplicateRecipes(authored: Recipe[], saved: Recipe[]): Recipe[] {
		const map = new Map<number, Recipe>();

		// Add authored first (they take precedence if duplicate)
		for (const recipe of authored || []) {
			map.set(recipe.id, recipe);
		}

		// Add saved only if not already present
		for (const recipe of saved || []) {
			if (!map.has(recipe.id)) {
				map.set(recipe.id, recipe);
			}
		}

		return Array.from(map.values());
	}

	private fetchPublicRecipes(searchTerm: string): void {
		const username = this.currentUser()?.username?.trim();
		this.recipeService.getPublicRecipes(searchTerm, username).subscribe({
			next: (recipes: Recipe[]) => {
				this.recipes.set(this.sortRecipesByName(recipes || []));
				this.recipesLoadError.set('');
			},
			error: () => {
				this.recipes.set([]);
				this.recipesLoadError.set('Failed to load public recipes.');
			}
		});
	}

	private sortRecipesByName(recipes: Recipe[]): Recipe[] {
		return [...recipes].sort((a, b) => a.name.localeCompare(b.name, undefined, {
			sensitivity: 'base'
		}));
	}

	protected getRecipeImage(recipe: Recipe): string {
		return recipe.image || this.defaultRecipeImage;
	}
}
