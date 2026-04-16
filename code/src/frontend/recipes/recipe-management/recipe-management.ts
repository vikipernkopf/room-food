import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Recipe, RecipeVisibility } from '../../../backend/model';

export type RecipeMealType = {
	value: string;
	viewValue: string;
};

export type RecipeFormValue = {
	name: string;
	description?: string;
	image?: string;
	mealTypes: string[];
	visibility: RecipeVisibility;
};

@Component({
	selector: 'app-recipe-management',
	standalone: true,
	imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
	templateUrl: './recipe-management.html',
	styleUrl: './recipe-management.scss',
})
export class RecipeManagement {
	readonly recipe = input<Recipe | null>(null);
	readonly creating = input(false);
	readonly saveError = input('');
	readonly defaultRecipeImage = input('');
	readonly mealTypeOptions = input<RecipeMealType[]>([]);
	readonly closed = output<void>();
	readonly saved = output<RecipeFormValue>();
	readonly deleteRequested = output<Recipe>();
	readonly recipeNameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
	readonly recipeDescriptionControl = new FormControl('');
	readonly recipeImageControl = new FormControl('');
	readonly recipeMealTypesControl = new FormControl<string[]>([], { nonNullable: true });
	readonly recipeVisibilityControl = new FormControl<RecipeVisibility>('private', { nonNullable: true });

	constructor() {
		effect(() => {
			const recipe = this.recipe();

			if (!recipe) {
				this.resetRecipeForm();
				return;
			}

			this.prefillRecipeForm(recipe);
		});
	}

	get isEditMode(): boolean {
		return this.recipe() !== null;
	}

	get modalTitle(): string {
		return this.isEditMode ? 'Edit Recipe' : 'Create Recipe';
	}

	get submitButtonLabel(): string {
		if (this.creating()) {
			return this.isEditMode ? 'Saving...' : 'Creating...';
		}

		return this.isEditMode ? 'Save Recipe' : 'Create Recipe';
	}

	onOverlayClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			this.closePopup();
		}
	}

	closePopup(): void {
		this.closed.emit();
	}

	saveRecipe(): void {
		if (this.creating()) {
			return;
		}

		this.recipeNameControl.markAsTouched();
		if (this.recipeNameControl.invalid) {
			return;
		}

		this.saved.emit({
			name: this.recipeNameControl.value?.trim() ?? '',
			description: this.recipeDescriptionControl.value?.trim() || undefined,
			image: this.recipeImageControl.value?.trim() || this.defaultRecipeImage(),
			mealTypes: this.recipeMealTypesControl.value,
			visibility: this.recipeVisibilityControl.value
		});
	}

	deleteRecipe(): void {
		const recipe = this.recipe();

		if (recipe) {
			this.deleteRequested.emit(recipe);
		}
	}

	private resetRecipeForm(): void {
		this.recipeNameControl.reset('');
		this.recipeDescriptionControl.reset('');
		this.recipeImageControl.reset('');
		this.recipeMealTypesControl.setValue([]);
		this.recipeVisibilityControl.setValue('private');
	}

	private prefillRecipeForm(recipe: Recipe): void {
		this.recipeNameControl.setValue(recipe.name);
		this.recipeDescriptionControl.setValue(recipe.description ?? '');
		this.recipeImageControl.setValue(recipe.image ?? this.defaultRecipeImage());
		this.recipeMealTypesControl.setValue(recipe.mealTypes ?? []);
		this.recipeVisibilityControl.setValue(recipe.visibility ?? 'private');
	}

}
