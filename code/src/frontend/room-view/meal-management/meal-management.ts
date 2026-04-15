// noinspection GrazieInspection

import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	SimpleChanges,
	WritableSignal
} from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthService } from '../../core/auth-service';
import { Meal, Recipe, User } from '../../../backend/model';
import { MealService } from '../../core/meal-service';
import { RecipeService } from '../../core/recipe-service';

interface MealType {
	value: string;
	viewValue: string;
}

@Component({
	selector: 'app-add-meal',
	standalone: true,
	providers: [provideNativeDateAdapter()],
	imports: [
		FormsModule,
		MatFormFieldModule,
		MatSelectModule,
		MatInputModule,
		MatDatepickerModule, MatDatepicker,
		MatTimepickerModule,
		MatIconModule, MatButtonModule
	],
	templateUrl: './meal-management.html',
	styleUrl: './meal-management.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})

export class MealManagement implements OnChanges {
	@Output()
	close = new EventEmitter<void>();
	@Output()
	mealSaved = new EventEmitter<void>();
	@Input()
	mealToEdit: Meal | null = null;
	@Input()
	roomCode: string = '';
	@Input()
	initialDate: Date | null = null;
	@Input()
	initialTime: Date | null = null;

	closePopup() {
		this.close.emit();
	}

	dish: string = '';
	selectedValue: string = 'breakfast-0';
	selectedDate: Date | null = null;
	selectedTime: Date | null = null;
	showError: boolean = false;
	isSubmitting: boolean = false;
	selectedRecipeIds: number[] = [];
	recipeSearchTerm: string = '';
	availableRecipes: Recipe[] = [];
	filteredRecipes: Recipe[] = [];
	recipesLoadError: string = '';

	mealTypes: MealType[] = [
		{
			value: 'breakfast-0',
			viewValue: 'Breakfast'
		},
		{
			value: 'lunch-1',
			viewValue: 'Lunch'
		},
		{
			value: 'dinner-2',
			viewValue: 'Dinner'
		},
		{
			value: 'snack-3',
			viewValue: 'Snack'
		}
	];

	protected readonly currentUser: WritableSignal<User | null>;
	private readonly cdr: ChangeDetectorRef | null;

	constructor(
		private authService: AuthService,
		private mealService: MealService,
		private recipeService: RecipeService,
		cdr?: ChangeDetectorRef
	) {
		this.currentUser = this.authService.currentUser;
		this.cdr = cdr ?? null;
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['mealToEdit']) {
			this.prefillFormFromInput();
		}

		this.loadRecipesForCurrentUser();
	}

	protected get backendError(): string {
		return this.mealService.saveError();
	}

	protected clearErrors(): void {
		this.showError = false;
		if (this.mealService.saveError()) {
			this.mealService.saveError.set('');
		}
	}

	protected get isEditMode(): boolean {
		return this.mealToEdit !== null;
	}

	private prefillFormFromInput(): void {
		this.clearErrors();

		if (!this.mealToEdit) {
			this.dish = '';
			this.selectedValue = 'breakfast-0';
			this.selectedDate = null;
			this.selectedTime = null;
			this.selectedRecipeIds = [];
			this.recipeSearchTerm = '';
			this.applyRecipeFilter();
			this.requestViewUpdate();
			return;
		}

		const mealTime = new Date(this.mealToEdit.time as unknown as string);
		this.dish = this.mealToEdit.name;
		this.selectedDate = mealTime;
		this.selectedTime = mealTime;
		this.selectedRecipeIds = this.normalizeRecipeIds(this.mealToEdit.recipeIds);
		this.recipeSearchTerm = '';
		this.applyRecipeFilter();
		this.requestViewUpdate();
	}

	public onRecipeSearchChange(searchTerm: string): void {
		this.recipeSearchTerm = searchTerm;
		this.applyRecipeFilter();
		this.requestViewUpdate();
	}

	public onRecipeSelectionChange(recipeIds: number[]): void {
		this.selectedRecipeIds = this.normalizeRecipeIds(recipeIds);
		this.applyRecipeFilter();
		this.clearErrors();
		this.requestViewUpdate();
	}

	public onRecipeSearchKeydown(event: KeyboardEvent): void {
		event.stopPropagation();
	}

	public getSelectedRecipeLabel(): string {
		if (this.selectedRecipeIds.length === 0) {
			return '';
		}

		const selectedRecipeNames = this.selectedRecipeIds
		.map(recipeId => this.availableRecipes.find(recipe => recipe.id === recipeId)?.name)
		.filter((recipeName): recipeName is string => !!recipeName);

		if (selectedRecipeNames.length === 0) {
			return 'Recipes selected';
		}

		if (selectedRecipeNames.length <= 2) {
			return selectedRecipeNames.join(', ');
		}

		return `${selectedRecipeNames.length} recipes selected`;
	}

	private applyRecipeFilter(): void {
		const normalizedSearchTerm = this.recipeSearchTerm.trim().toLowerCase();
		const selectedRecipeIdSet = new Set(this.selectedRecipeIds);

		if (!normalizedSearchTerm) {
			const selectedRecipes = this.availableRecipes
				.filter(recipe => selectedRecipeIdSet.has(recipe.id));
			const unselectedRecipes = this.availableRecipes
				.filter(recipe => !selectedRecipeIdSet.has(recipe.id));

			this.filteredRecipes = [...selectedRecipes, ...unselectedRecipes];
			return;
		}

		const startsWithMatches: Recipe[] = [];
		const containsMatches: Recipe[] = [];

		for (const recipe of this.availableRecipes) {
			const normalizedRecipeName = recipe.name.toLowerCase();
			if (!normalizedRecipeName.includes(normalizedSearchTerm)) {
				continue;
			}

			if (normalizedRecipeName.startsWith(normalizedSearchTerm)) {
				startsWithMatches.push(recipe);
			} else {
				containsMatches.push(recipe);
			}
		}

		this.filteredRecipes = [...startsWithMatches, ...containsMatches];
	}

	private loadRecipesForCurrentUser(): void {
		const username = this.currentUser()?.username?.trim();

		if (!username) {
			this.availableRecipes = [];
			this.filteredRecipes = [];
			this.recipesLoadError = '';
			this.requestViewUpdate();
			return;
		}

		this.recipeService.getRecipesByAuthorUsername(username).subscribe({
			next: recipes => {
				this.availableRecipes = recipes || [];
				this.recipesLoadError = '';
				this.applyRecipeFilter();

				if (this.selectedRecipeIds.length > 0) {
					const validRecipeIds = new Set(this.availableRecipes.map(recipe => recipe.id));
					this.selectedRecipeIds = this.selectedRecipeIds
						.filter(recipeId => validRecipeIds.has(recipeId));
				}
				this.requestViewUpdate();
			},
			error: () => {
				this.availableRecipes = [];
				this.filteredRecipes = [];
				this.selectedRecipeIds = [];
				this.recipesLoadError = 'Failed to load recipes for this user.';
				this.requestViewUpdate();
			}
		});
	}

	private requestViewUpdate(): void {
		this.cdr?.markForCheck?.();
	}

	private normalizeRecipeIds(recipeIds: number[] | undefined): number[] {
		if (!Array.isArray(recipeIds)) {
			return [];
		}

		const normalizedRecipeIds = recipeIds
			.map(recipeId => Number(recipeId))
			.filter(recipeId => Number.isInteger(recipeId) && recipeId > 0);

		return Array.from(new Set(normalizedRecipeIds));
	}

	protected saveMeal(): void {
		this.clearErrors();

		const user = this.authService.currentUser();
		const currentUsername = user?.username;

		if (this.dish && this.selectedValue && this.selectedDate && this.selectedTime && currentUsername
			&& this.roomCode) {

			const finalDate = new Date(this.selectedDate);
			finalDate.setHours(this.selectedTime.getHours());
			finalDate.setMinutes(this.selectedTime.getMinutes());

			const newMeal: Meal = {
				time: finalDate,
				name: this.dish,
				responsible: currentUsername,
				room: this.roomCode,
				recipeIds: [...this.selectedRecipeIds]
			};

			const editMealId = this.mealToEdit?.id;

			if (this.isEditMode && !editMealId) {
				this.mealService.saveError.set('Unable to update meal: missing meal id');
				return;
			}

			const request = this.isEditMode && editMealId
				? this.mealService.updateMeal(editMealId, newMeal)
				: this.mealService.postMeal(newMeal);

			this.isSubmitting = true;

			request.subscribe({
				next: meal => {
					console.log('Successfully saved meal:', meal);
					this.mealService.saveError.set('');
					this.isSubmitting = false;
					this.mealSaved.emit();
					this.closePopup();
				},
				error: err => {
					console.error('Error saving meal:', err);
					this.isSubmitting = false;
					this.mealService.saveError.set(
						'Unable to save meal: ' + (err.error?.error || err.message || 'Unknown error'));
				}
			});
		} else {
			this.showError = true;
			if (!this.roomCode) {
				this.mealService.saveError.set('Room code is missing. Please refresh the page.');
			}
		}
	}

	protected deleteMeal(): void {
		this.clearErrors();

		const editMealId = this.mealToEdit?.id;
		if (!editMealId) {
			this.mealService.saveError.set('Unable to delete meal: missing meal id');
			return;
		}

		this.isSubmitting = true;
		this.mealService.deleteMeal(editMealId).subscribe({
			next: () => {
				this.isSubmitting = false;
				this.mealService.saveError.set('');
				this.mealSaved.emit();
				this.closePopup();
			},
			error: err => {
				this.isSubmitting = false;
				console.error('Error deleting meal:', err);
				this.mealService.saveError.set(
					'Unable to delete meal: ' + (err.error?.error || err.message || 'Unknown error'));
			}
		});
	}
}

