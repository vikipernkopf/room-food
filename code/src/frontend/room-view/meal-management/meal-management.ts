import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	signal,
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
		MatIconModule,
		MatButtonModule
	],
	templateUrl: './meal-management.html',
	styleUrl: './meal-management.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MealManagement implements OnChanges {
	@Output() close = new EventEmitter<void>();
	@Output() mealSaved = new EventEmitter<void>();
	@Input() mealToEdit: Meal | null = null;
	@Input() roomCode: string = '';
	@Input() initialDate: Date | null = null;
	@Input() initialTime: Date | null = null;
	@Input() overviewMode: boolean = false;
	@Input() availableRooms: { code: string; roomName: string; role: string; profilePicture?: string }[] = [];

	protected readonly isViewMode: WritableSignal<boolean> = signal(true);
	protected readonly showMore = signal(false);
	protected readonly eatingPeople: WritableSignal<Set<string>> = signal(new Set());
	protected readonly currentUser: WritableSignal<User | null>;

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
	protected selectedIngredients: string = '';

	protected mealTypes: MealType[] = [
		{ value: 'breakfast-0', viewValue: 'Breakfast' },
		{ value: 'lunch-1', viewValue: 'Lunch' },
		{ value: 'dinner-2', viewValue: 'Dinner' },
		{ value: 'snack-3', viewValue: 'Snack' }
	];

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

	// ----------------------- Lifecycle ------------------------------

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

	// ----------------------- Getters ------------------------------

	protected get backendError(): string {
		return this.mealService.saveError();
	}

	protected get isEditMode(): boolean {
		return this.mealToEdit !== null && !this.isViewMode();
	}

	protected get selectedRecipes(): Recipe[] {
		const idSet = new Set(this.selectedRecipeIds);
		return this.availableRecipes.filter(recipe => idSet.has(recipe.id));
	}

	protected get selectedRoomName(): string {
		return this.getRoomName(this.selectedRoomCode);
	}

	protected get formattedStartTime(): string {
		if (!this.selectedStartTime) return '';
		const hours = this.selectedStartTime.getHours();
		if (hours === 0) return '12am';
		if (hours === 12) return '12pm';
		return hours < 12 ? `${hours}am` : `${hours - 12}pm`;
	}

	protected get formattedEndTime(): string {
		if (!this.selectedEndTime) return '';
		const hours = this.selectedEndTime.getHours();
		const minutes = this.selectedEndTime.getMinutes();
		const mins = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
		if (hours === 0) return `12${mins}am`;
		if (hours === 12) return `12${mins}pm`;
		return hours < 12 ? `${hours}${mins}am` : `${hours - 12}${mins}pm`;
	}

	protected get timeErrors(): { start: string | null; end: string | null } {
		const start = this.selectedStartTime;
		const end = this.selectedEndTime;

		if (!start || !end) return { start: null, end: null };

		const errors: { start: string | null; end: string | null } = { start: null, end: null };
		const startHours = start.getHours();
		const endHours = end.getHours();

		if (startHours < 5 || startHours >= 24) {
			errors.start = 'Time must be between 5 AM and 11 PM';
		}
		if (endHours < 5 || endHours >= 24) {
			errors.end = 'Time must be between 5 AM and 11 PM';
		}
		if (end <= start) {
			errors.end = 'End time must be after start time';
		}

		return errors;
	}

	// ----------------------- Public actions ------------------------------

	closePopup(): void {
		this.isViewMode.set(false);
		this.close.emit();
	}

	protected editButton(): void {
		this.isViewMode.set(false);
	}

	protected clearErrors(): void {
		this.showError = false;
		if (this.mealService.saveError()) {
			this.mealService.saveError.set('');
		}
	}

	protected requestViewUpdate(): void {
		this.cdr?.markForCheck?.();
	}

	// ----------------------- Eating people ------------------------------

	protected addCurrentUserToEating(): void {
		const username = this.currentUser()?.username;
		const mealId = this.mealToEdit?.id;
		if (!username || !mealId) return;

		this.mealService.addEatingUser(mealId, username).subscribe({
			next: () => {
				this.eatingPeople.update(people => new Set([...people, username]));
				this.requestViewUpdate();
			},
			error: err => console.error('Error adding eating user:', err)
		});
	}

	protected removeCurrentUserFromEating(): void {
		const username = this.currentUser()?.username;
		const mealId = this.mealToEdit?.id;
		if (!username || !mealId) return;

		this.mealService.removeEatingUser(mealId, username).subscribe({
			next: () => {
				this.eatingPeople.update(people => {
					const next = new Set(people);
					next.delete(username);
					return next;
				});
				this.requestViewUpdate();
			},
			error: err => console.error('Error removing eating user:', err)
		});
	}
	protected isCurrentUserEating(): boolean {
		return this.eatingPeople().has(this.currentUser()?.username ?? '');
	}

	protected eatingPeopleArray(): string[] {
		return Array.from(this.eatingPeople());
	}

	protected isUserEating(username: string): boolean {
		return this.eatingPeople().has(username);
	}

	protected canRemoveUser(username: string): boolean {
		return this.isUserEating(username);
	}

	// ----------------------- Recipes ------------------------------

	protected recipeIngredients: { ingredientName: string; measurement: string; amount: number }[] = [];
	protected ingredientsLoading: boolean = false;

	protected get scaledIngredients(): { ingredientName: string; measurement: string; amount: number }[] {
		const people = Math.max(1, this.eatingPeople().size);
		return this.recipeIngredients.map(ing => ({
			...ing,
			amount: Math.round(ing.amount * people * 100) / 100
		}));
	}
	private loadIngredientsForSelectedRecipes(): void {
		if (this.selectedRecipeIds.length === 0) {
			this.recipeIngredients = [];
			this.requestViewUpdate();
			return;
		}

		this.ingredientsLoading = true;
		const calls = this.selectedRecipeIds.map(id =>
			this.recipeService.getIngredientsForRecipe(id)
		);

		// fire all requests, merge results
		let completed = 0;
		const merged = new Map<string, { ingredientName: string; measurement: string; amount: number }>();

		calls.forEach(call => {
			call.subscribe({
				next: ingredients => {
					for (const ing of ingredients) {
						const key = `${ing.ingredientName}__${ing.measurement}`;
						const existing = merged.get(key);
						if (existing) {
							existing.amount += ing.amount;
						} else {
							merged.set(key, { ...ing });
						}
					}
					completed++;
					if (completed === calls.length) {
						this.recipeIngredients = Array.from(merged.values())
							.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
						this.ingredientsLoading = false;
						this.requestViewUpdate();
					}
				},
				error: () => {
					completed++;
					if (completed === calls.length) {
						this.ingredientsLoading = false;
						this.requestViewUpdate();
					}
				}
			});
		});
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
		this.loadIngredientsForSelectedRecipes(); // add this line
		this.requestViewUpdate();
	}

	public onRecipeSearchKeydown(event: KeyboardEvent): void {
		event.stopPropagation();
	}

	public getSelectedRecipeLabel(): string {
		if (this.selectedRecipeIds.length === 0) return '';

		const names = this.selectedRecipeIds
			.map(id => this.availableRecipes.find(r => r.id === id)?.name)
			.filter((name): name is string => !!name);

		if (names.length === 0) return 'Recipes selected';
		if (names.length <= 2) return names.join(', ');
		return `${names.length} recipes selected`;
	}

	// ----------------------- Responsible users ------------------------------

	public onResponsibleUsersChange(usernames: string[]): void {
		this.selectedResponsibleUsers = this.normalizeResponsibleUsers(usernames);
		this.clearErrors();
		this.requestViewUpdate();
	}

	public getSelectedResponsibleUsersLabel(): string {
		if (this.selectedResponsibleUsers.length === 0) return '';
		return this.selectedResponsibleUsers.join(', ');
	}

	// ----------------------- Room ------------------------------

	protected getRoomName(roomCode: string | null | undefined): string {
		if (!roomCode) return '';
		return this.availableRooms.find(room => room.code === roomCode)?.roomName ?? roomCode;
	}

	protected onRoomSelectionChange(roomCode: string): void {
		this.selectedRoomCode = roomCode;
		this.loadRoomMembersForRoom(roomCode);
		this.requestViewUpdate();
	}

	// ----------------------- Formatting ------------------------------

	protected formatMealType(value: string): string {
		const trimmed = value.slice(0, Math.max(0, value.length - 2));
		return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
	}

	protected formatDateValue(date: Date | null): string {
		if (!date) return '';
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	// ----------------------- Save / Delete ------------------------------

	protected saveMeal(): void {
		this.clearErrors();

		const user = this.authService.currentUser();
		const currentUsername = user?.username;
		const effectiveRoomCode = this.overviewMode ? this.selectedRoomCode : this.roomCode;

		if (!this.dish || !this.selectedValue || !this.selectedDate || !this.selectedStartTime || !this.selectedEndTime || !currentUsername || !effectiveRoomCode) {
			this.showError = true;
			if (!this.roomCode) {
				this.mealService.saveError.set('Room code is missing. Please refresh the page.');
			}
			return;
		}

		const finalDate = new Date(this.selectedDate);
		finalDate.setHours(this.selectedStartTime.getHours(), this.selectedStartTime.getMinutes(), 0, 0);

		const finalEndDate = new Date(this.selectedDate);
		finalEndDate.setHours(this.selectedEndTime.getHours(), this.selectedEndTime.getMinutes(), 0, 0);

		const newMeal: Meal = {
			time: finalDate,
			endTime: finalEndDate,
			name: this.dish,
			mealType: this.selectedValue,
			responsible: currentUsername,
			room: effectiveRoomCode,
			recipeIds: [...this.selectedRecipeIds],
			responsibleUsers: [...this.selectedResponsibleUsers],
			eatingUsernames: []/* this.isCurrentUserEating() ? [currentUsername] : []*/
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

	// ----------------------- Private helpers ------------------------------

	private prefillFormFromInput(): void {
		this.clearErrors();
		console.log('prefillFormFromInput called, eatingPeople:', Array.from(this.eatingPeople()));
		if (!this.mealToEdit) {
			this.dish = '';
			this.selectedValue = 'breakfast-0';
			this.selectedDate = null;
			this.selectedStartTime = null;
			this.selectedEndTime = null;
			this.selectedRecipeIds = [];
			this.selectedResponsibleUsers = [];
			this.selectedIngredients = '';
			this.recipeSearchTerm = '';
			this.eatingPeople.set(new Set());
			this.isViewMode.set(false);
			this.applyRecipeFilter();
			this.loadIngredientsForSelectedRecipes();
			this.requestViewUpdate();
			console.log('prefillFormFromInput called, this is inside the if mealToEdit:', this.mealToEdit);
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
		this.selectedIngredients = '';
		this.recipeSearchTerm = '';
		this.applyRecipeFilter();
		this.isViewMode.set(true);
		this.loadEatingUsers();
		this.requestViewUpdate();
		console.log('prefillFormFromInput called, mealToEdit:', this.mealToEdit?.id);
	}

	private applyInitialDateTime(): void {
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

	private applyRecipeFilter(): void {
		const term = this.recipeSearchTerm.trim().toLowerCase();
		const selectedIdSet = new Set(this.selectedRecipeIds);

		if (!term) {
			const selected = this.availableRecipes.filter(r => selectedIdSet.has(r.id));
			const unselected = this.availableRecipes.filter(r => !selectedIdSet.has(r.id));
			this.filteredRecipes = [...selected, ...unselected];
			return;
		}

		const startsWith: Recipe[] = [];
		const contains: Recipe[] = [];

		for (const recipe of this.availableRecipes) {
			const name = recipe.name.toLowerCase();
			if (name.includes(term)) {
				name.startsWith(term) ? startsWith.push(recipe) : contains.push(recipe);
			}
		}

		this.filteredRecipes = [...startsWith, ...contains];
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
					const validIds = new Set(this.availableRecipes.map(r => r.id));
					this.selectedRecipeIds = this.selectedRecipeIds.filter(id => validIds.has(id));
					this.loadIngredientsForSelectedRecipes(); // ADD THIS LINE
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

	private loadEatingUsers(): void {

		const mealId = this.mealToEdit?.id;
		console.log('loadEatingUsers called, mealId:', mealId);
		if (!mealId) {
			this.eatingPeople.set(new Set());
			return;
		}

		this.mealService.getEatingUsers(mealId).subscribe({
			next: response => {
				console.log('getEatingUsers response:', response);
				this.eatingPeople.set(new Set(response.eatingUsers));
				this.showMore.set(this.showMore()); // force signal graph update
				this.requestViewUpdate();
			},
			error: err => {
				console.error('Error loading eating users:', err);
				this.eatingPeople.set(new Set());
				this.requestViewUpdate();
			}
		});
	}

	private normalizeRecipeIds(recipeIds: number[] | undefined): number[] {
		if (!Array.isArray(recipeIds)) return [];
		const normalized = recipeIds.map(Number).filter(id => Number.isInteger(id) && id > 0);
		return Array.from(new Set(normalized));
	}

	private normalizeResponsibleUsers(usernames: string[] | undefined): string[] {
		if (!Array.isArray(usernames)) return [];
		const normalized = usernames.map(u => String(u).trim()).filter(u => u.length > 0);
		return Array.from(new Set(normalized));
	}
}
