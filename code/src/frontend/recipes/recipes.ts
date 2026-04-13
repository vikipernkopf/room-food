import { Component, effect, signal, WritableSignal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../core/auth-service';
import { RecipeService } from '../core/recipe-service';
import { Recipe, RecipeCreatePayload, User } from '../../backend/model';
import { DEFAULT_RECIPE_IMAGE } from '../core/user-form-validation';

type RecipeMealType = {
	value: string;
	viewValue: string;
};

@Component({
	selector: 'app-recipes',
	imports: [ReactiveFormsModule, FormsModule],
	templateUrl: './recipes.html',
	styleUrl: './recipes.scss'
})
export class Recipes {
	protected activePopup: 'create' | null = null;
	protected readonly currentUser: WritableSignal<User | null>;
	protected readonly defaultRecipeImage = DEFAULT_RECIPE_IMAGE;
	protected readonly recipes = signal<Recipe[]>([]);
	protected readonly recipesLoadError = signal('');
	protected readonly recipeSaveError = signal('');
	protected creating = false;
	protected readonly recipeNameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
	protected readonly recipeDescriptionControl = new FormControl('');
	protected readonly recipeImageControl = new FormControl('');
	protected readonly selectedMealTypes = signal<string[]>([]);
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

	constructor(private readonly recipeService: RecipeService, private readonly authService: AuthService) {
		this.currentUser = this.authService.currentUser;

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
		this.clearCreateForm();
	}

	protected closePopup(): void {
		this.activePopup = null;
		this.clearCreateForm();
	}

	protected onOverlayClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			this.closePopup();
		}
	}

	protected isMealTypeSelected(mealType: string): boolean {
		return this.selectedMealTypes().includes(mealType);
	}

	protected toggleMealType(mealType: string): void {
		this.recipeSaveError.set('');
		this.selectedMealTypes.update(types =>
			types.includes(mealType)
				? types.filter(type => type !== mealType)
				: [...types, mealType]
		);
	}

	protected createRecipe(): void {
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

		const payload: RecipeCreatePayload = {
			authorUsername: username,
			name,
			description: this.recipeDescriptionControl.value?.trim() || undefined,
			image: this.recipeImageControl.value?.trim() || this.defaultRecipeImage,
			mealTypes: this.selectedMealTypes()
		};

		this.creating = true;
		this.recipeService.createRecipe(payload).subscribe({
			next: () => {
				this.creating = false;
				this.closePopup();
				this.fetchRecipes(username);
			},
			error: error => {
				this.creating = false;
				this.recipeSaveError.set(
					'Failed to create recipe: ' + (error.error?.error || error.message || 'Unknown error'));
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

	protected getRecipeImage(recipe: Recipe): string {
		return recipe.image || this.defaultRecipeImage;
	}

	private clearCreateForm(): void {
		this.creating = false;
		this.recipeSaveError.set('');
		this.recipeNameControl.reset('');
		this.recipeDescriptionControl.reset('');
		this.recipeImageControl.reset('');
		this.selectedMealTypes.set([]);
	}
}
