import { Component, effect, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { form, required, minLength, FormField, FormRoot, submit } from '@angular/forms/signals';
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

interface RecipeFormModel {
	name: string;
	description: string;
	image: string;
	mealTypes: string[];
	visibility: RecipeVisibility;
	instructions: string;
}

const INITIAL_RECIPE_MODEL: RecipeFormModel = {
	name: '',
	description: '',
	image: '',
	mealTypes: [],
	visibility: 'private',
	instructions: ''
};

@Component({
	selector: 'app-create-recipe',
	standalone: true,
	imports: [
		CommonModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatButtonModule,
		MatIconModule,
		SearchIngredient,
		FormField,
		FormRoot
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
	private readonly searchIngredient = viewChild<any>('searchIngredient');

	protected readonly currentUser = this.authService.currentUser;
	protected readonly isSaving = signal(false);
	protected readonly saveError = signal('');
	protected readonly ingredientError = signal('');
	protected readonly defaultRecipeImage = DEFAULT_RECIPE_IMAGE;

	protected readonly isEditMode = signal(false);

	protected readonly model = signal<RecipeFormModel>({ ...INITIAL_RECIPE_MODEL });

	protected readonly recipeForm = form(this.model, path => {
		required(path.name, { message: 'Recipe name is required.' });
		minLength(path.name, 3, { message: 'Recipe name must be at least 3 characters.' });
		required(path.instructions, { message: 'Instructions are required.' });
	});

	protected readonly ingredients = signal<Array<{
		name: string;
		measurement: string;
		amount: number
	}>>([]);
	protected readonly currentIngredientName = signal('');
	protected readonly currentIngredientMeasurement = signal('');
	protected readonly currentIngredientAmount = signal<number | ''>('');

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
					this.model.set({
						name: recipe.name ?? '',
						description: recipe.description ?? '',
						image: recipe.image ?? '',
						mealTypes: (recipe.mealTypes ?? []).map(type => type.replace(/-\d+$/, '').trim()),
						visibility: recipe.visibility ?? 'private',
						instructions: (recipe as any).instructions || recipe.description || ''
					});
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

		const newIngredient = { name, measurement, amount };
		const found = this.ingredients().find(s => s.name === newIngredient.name);

		if (found) {
			found.amount = newIngredient.amount;
			found.measurement = newIngredient.measurement;
			this.ingredients.update(list => [...list]);
		} else {
			this.ingredients.update(list => [...list, newIngredient]);
		}

		this.currentIngredientName.set('');
		this.currentIngredientMeasurement.set('');
		this.currentIngredientAmount.set('');
		this.ingredientError.set('');

		// Reset the child component's internal input field
		this.searchIngredient()?.clear();
	}

	removeIngredient(index: number) {
		this.ingredients.update(list => list.filter((_, i) => i !== index));
	}

	async submitForm(): Promise<void> {
		const username = this.authService.currentUser()?.username;
		if (!username) {
			this.saveError.set('You must be logged in to manage a recipe');
			return;
		}

		this.isSaving.set(true);
		this.saveError.set('');

		await submit(this.recipeForm, async f => {
			const id = this.recipeId();
			const payload: RecipeCreatePayload = {
				authorUsername: username,
				name: f.name().value().trim(),
				description: f.description().value().trim() || undefined,
				image: f.image().value().trim() || this.defaultRecipeImage,
				mealTypes: f.mealTypes().value(),
				visibility: f.visibility().value(),
				ingredients: this.ingredients(),
				instructions: f.instructions().value().trim()
			} as any;

			if (this.isEditMode() && id) {
				await firstValueFrom(this.recipeService.updateRecipe(id, payload as any));
			} else {
				await firstValueFrom(this.recipeService.createRecipe(payload));
			}

			this.isSaving.set(false);

			for (const ing of this.ingredients()) {
				try {
					await firstValueFrom(this.ingredientService.saveUserIngredient(username, ing));
				} catch (err) {
					console.error('Failed to save ingredient to user history:', err);
				}
			}

			this.router.navigate(['/recipes']).then(() => this.resetForm());
		});

		this.isSaving.set(false);
	}

	private resetForm() {
		this.model.set({ ...INITIAL_RECIPE_MODEL });
		this.ingredients.set([]);
		this.saveError.set('');
		this.ingredientError.set('');
	}
}
