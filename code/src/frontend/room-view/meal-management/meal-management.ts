import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	Output, signal,
	SimpleChanges,
	WritableSignal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthService } from '../../core/auth-service';
import { Meal, Recipe, User } from '../../../backend/model';
import { MealService } from '../../core/meal-service';
import { RecipeService } from '../../core/recipe-service';
import { RoomService } from '../../core/room-service';

interface MealType {
	value: string;
	viewValue: string;
}

@Component({
	selector: 'app-add-meal',
	standalone: true,
	providers: [provideNativeDateAdapter()],
	imports: [
		CommonModule,
		FormsModule,
		MatFormFieldModule,
		MatSelectModule,
		MatInputModule,
		MatDatepickerModule,
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
	@Input()
	overviewMode: boolean = false;
	@Input()
	availableRooms: { code: string; roomName: string; role: string; profilePicture?: string }[] = [];

	closePopup() {
		this.isViewMode.set(false);
		this.close.emit();
	}

	protected readonly isViewMode: WritableSignal<boolean> = signal(true);

	protected dish: string = '';
	public selectedValue: string = 'breakfast-0';
	protected selectedDate: Date | null = null;
	protected selectedStartTime: Date | null = null;
	protected selectedEndTime: Date | null = null;
	protected minTime: Date = new Date(new Date().setHours(5, 0, 0, 0));
	protected maxTime: Date = new Date(new Date().setHours(23, 0, 0, 0));
	protected showError: boolean = false;
	protected isSubmitting: boolean = false;
	protected selectedRecipeIds: number[] = [];
	protected recipeSearchTerm: string = '';
	protected availableRecipes: Recipe[] = [];
	protected filteredRecipes: Recipe[] = [];
	protected recipesLoadError: string = '';
	protected selectedResponsibleUsers: string[] = [];
	protected availableRoomMembers: string[] = [];
	protected roomMembersLoadError: string = '';
	protected selectedRoomCode: string = '';

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
		private roomService: RoomService,
		cdr?: ChangeDetectorRef
	) {
		this.currentUser = this.authService.currentUser;
		this.cdr = cdr ?? null;
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['mealToEdit'] && this.mealToEdit) {
			this.prefillFormFromInput();
		} else if (changes['initialDate'] || changes['initialTime']) {
			this.applyInitialDateTime();
		}

		if (changes['roomCode'] && this.roomCode) {
			this.loadRoomMembers();
		}

		if (this.overviewMode) {
			this.selectedRoomCode = this.mealToEdit?.room ?? this.roomCode ?? this.availableRooms[0]?.code ?? '';
			this.loadRoomMembersForRoom(this.selectedRoomCode);
		} else {
			this.selectedRoomCode = this.roomCode;
		}

		this.loadRecipesForCurrentUser();
	}

	protected get backendError(): string {
		return this.mealService.saveError();
	}

	protected get selectedRoomName(): string {
		return this.getRoomName(this.selectedRoomCode);
	}

	protected getRoomName(roomCode: string | null | undefined): string {
		if (!roomCode) {
			return '';
		}

		return this.availableRooms.find(room => room.code === roomCode)?.roomName ?? roomCode;
	}

	protected formatMealType(value: string): string {
		const trimmed = value.slice(0, Math.max(0, value.length - 2));
		return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
	}

	protected formatDateValue(date: Date | null): string {
		if (!date) {
			return '';
		}

		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	protected clearErrors(): void {
		this.showError = false;
		if (this.mealService.saveError()) {
			this.mealService.saveError.set('');
		}
	}

	protected editButton(){
		this.isViewMode.set(false);
	}

	protected get isEditMode(): boolean {
		return this.mealToEdit !== null && !this.isViewMode();
	}

	protected get selectedRecipes(): Recipe[] {
		const idSet: Set<number> = new Set(this.selectedRecipeIds);
		return this.availableRecipes.filter((recipe: Recipe): boolean => idSet.has(recipe.id));
	}

	private prefillFormFromInput(): void {
		this.clearErrors();

		if (!this.mealToEdit) {
			this.dish = '';
			this.selectedValue = 'breakfast-0';
			this.selectedDate = null;
			this.selectedStartTime = null;
			this.selectedEndTime = null;
			this.selectedRecipeIds = [];
			this.selectedResponsibleUsers = [];
			this.recipeSearchTerm = '';
			this.isViewMode.set(false);
			this.applyRecipeFilter();
			this.requestViewUpdate();
			return;
		}

		const mealTime = new Date(this.mealToEdit.time as unknown as string);
		this.dish = this.mealToEdit.name;
		this.selectedValue = this.mealToEdit.mealType || 'breakfast-0';
		this.selectedDate = mealTime;
		this.selectedStartTime = new Date(this.mealToEdit.time);
		this.selectedEndTime = new Date(this.mealToEdit.endTime);
		this.selectedRecipeIds = this.normalizeRecipeIds(this.mealToEdit.recipeIds);
		this.selectedResponsibleUsers = this.normalizeResponsibleUsers(this.mealToEdit.responsibleUsers);
		this.recipeSearchTerm = '';
		this.applyRecipeFilter();
		this.requestViewUpdate();
		this.isViewMode.set(true);
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

	public onResponsibleUsersChange(usernames: string[]): void {
		this.selectedResponsibleUsers = this.normalizeResponsibleUsers(usernames);
		this.clearErrors();
		this.requestViewUpdate();
	}

	public getSelectedResponsibleUsersLabel(): string {
		if (this.selectedResponsibleUsers.length === 0) {
			return '';
		}

		return this.selectedResponsibleUsers.join(', ');
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
			if (normalizedRecipeName.includes(normalizedSearchTerm)) {
				if (normalizedRecipeName.startsWith(normalizedSearchTerm)) {
					startsWithMatches.push(recipe);
				} else {
					containsMatches.push(recipe);
				}
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

	protected requestViewUpdate(): void {
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

	private normalizeResponsibleUsers(usernames: string[] | undefined): string[] {
		if (!Array.isArray(usernames)) {
			return [];
		}

		const normalizedUsernames = usernames
		.map(username => String(username).trim())
		.filter(username => username.length > 0);

		return Array.from(new Set(normalizedUsernames));
	}

	private loadRoomMembers(): void {
		this.loadRoomMembersForRoom(this.roomCode);
	}

	private loadRoomMembersForRoom(roomCode: string): void {
		if (!roomCode) {
			this.availableRoomMembers = [];
			this.roomMembersLoadError = '';
			this.requestViewUpdate();
			return;
		}

		this.roomService.getMembersPerRoom(roomCode).subscribe({
			next: members => {
				this.availableRoomMembers = members.map(m => m.username) || [];
				this.roomMembersLoadError = '';
				this.requestViewUpdate();
			},
			error: () => {
				this.availableRoomMembers = [];
				this.roomMembersLoadError = 'Failed to load room members.';
				this.requestViewUpdate();
			}
		});
	}

	protected onRoomSelectionChange(roomCode: string): void {
		this.selectedRoomCode = roomCode;
		this.loadRoomMembersForRoom(roomCode);
		this.requestViewUpdate();
	}

	protected saveMeal(): void {
		this.clearErrors();

		const user = this.authService.currentUser();
		const currentUsername = user?.username;
		const effectiveRoomCode = this.overviewMode ? this.selectedRoomCode : this.roomCode;

		if (this.dish
			&& this.selectedValue
			&& this.selectedDate
			&& this.selectedStartTime
			&& this.selectedEndTime
			&& currentUsername
			&& effectiveRoomCode) {

			// 1. Create a fresh Date object for Start from the selected Date
			const finalDate = new Date(this.selectedDate);
			finalDate.setHours(this.selectedStartTime.getHours());
			finalDate.setMinutes(this.selectedStartTime.getMinutes());
			finalDate.setSeconds(0);
			finalDate.setMilliseconds(0);

			const finalEndDate = new Date(this.selectedDate);
			finalEndDate.setHours(this.selectedEndTime.getHours());
			finalEndDate.setMinutes(this.selectedEndTime.getMinutes());
			finalEndDate.setSeconds(0);
			finalEndDate.setMilliseconds(0);

			console.log('START STRING:', finalDate.toISOString());
			console.log('END STRING:', finalEndDate.toISOString());

			const newMeal: Meal = {
				time: finalDate,
				endTime: finalEndDate,
				name: this.dish,
				mealType: this.selectedValue,
				responsible: currentUsername,
				room: effectiveRoomCode,
				recipeIds: [...this.selectedRecipeIds],
				responsibleUsers: [...this.selectedResponsibleUsers]
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

	private applyInitialDateTime() {
		this.clearErrors();

		if (!this.isEditMode) {
			this.selectedDate = this.initialDate;
			this.selectedStartTime = this.initialTime;

			if (this.initialTime) {
				const endTime = new Date(this.initialTime);
				endTime.setHours(endTime.getHours() + 1);
				this.selectedEndTime = endTime;
			}

			this.dish = '';
			this.selectedValue = 'breakfast-0';
			this.isViewMode.set(false);
		}
	}

	protected get formattedStartTime(): string {
		if (!this.selectedStartTime) {
			return '';
		}

		const hours = this.selectedStartTime.getHours();

		if (hours === 0) {
			return '12am';
		}

		if (hours === 12) {
			return '12pm';
		}

		return hours < 12 ? `${hours}am` : `${hours - 12}pm`;
	}

	protected get formattedEndTime(): string {
		if (!this.selectedEndTime) {
			return '';
		}

		const hours: number = this.selectedEndTime.getHours();
		const minutes: number = this.selectedEndTime.getMinutes();
		const mins: string = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';

		if (hours === 0) {
			return `12${mins}am`;
		}

		if (hours === 12) {
			return `12${mins}pm`;
		}

		return hours < 12 ? `${hours}${mins}am` : `${hours - 12}${mins}pm`;
	}

	protected get timeErrors() {
		const start = this.selectedStartTime;
		const end = this.selectedEndTime;

		// If times aren't picked yet, no errors
		if (!start || !end) return { start: null, end: null };

		const errors = {
			start: null as string | null,
			end: null as string | null
		};

		// 1. Check Range (5 AM - 11 PM) using standard .getHours()
		const startHours = start.getHours();
		const endHours = end.getHours();
		if (startHours < 5 || startHours >= 23) {
			errors.start = "Time must be between 5 AM and 11 PM";
		}
		if (endHours < 5 || endHours >= 23) {
			errors.end = "Time must be between 5 AM and 11 PM";
		}

		// 2. Check Relationship (End > Start)
		if (end <= start) {
			errors.end = "End time must be after start time";
		}

		return errors;
	}
}

