// noinspection GrazieInspection

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	SimpleChanges,
	WritableSignal
} from '@angular/core';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import {MatDatepicker, MatDatepickerModule} from '@angular/material/datepicker';
import {MatTimepickerModule} from '@angular/material/timepicker';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {provideNativeDateAdapter} from '@angular/material/core';
import { AuthService } from '../../core/auth-service';
import {Meal, User} from '../../../backend/model';
import {MealService} from '../../core/meal-service';

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
		MatIconModule, MatButtonModule,
	],
	templateUrl: './meal-management.html',
	styleUrl: './meal-management.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})

export class MealManagement implements OnChanges {
	@Output() close = new EventEmitter<void>();
	@Output() mealSaved = new EventEmitter<void>();
	@Input() mealToEdit: Meal | null = null;
	@Input() roomCode: string = "";
	@Input() initialDate: Date | null = null;
	@Input() initialTime: Date | null = null;

	closePopup() {
		this.close.emit();
	}

	dish: string = '';
	selectedValue: string = 'breakfast-0';
	selectedDate: Date | null = null;
	selectedStartTime: Date | null = null;
	selectedEndTime: Date | null = null;
	showError: boolean = false;
	isSubmitting: boolean = false;
	minTime: Date = new Date(new Date().setHours(5, 0, 0, 0));
	maxTime: Date = new Date(new Date().setHours(23, 0, 0, 0));

	mealTypes: MealType[] = [
		{value: 'breakfast-0', viewValue: 'Breakfast'},
		{value: 'lunch-1', viewValue: 'Lunch'},
		{value: 'dinner-2', viewValue: 'Dinner'},
		{value: 'snack-3', viewValue: 'Snack'},
	];

	protected readonly currentUser: WritableSignal<User | null>;

	constructor(private authService: AuthService, private mealService: MealService) {
		this.currentUser = this.authService.currentUser;
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['mealToEdit'] && this.mealToEdit) {
			this.prefillFormFromInput();
		} else if (changes['initialDate'] || changes['initialTime']) {
			this.applyInitialDateTime();
		}
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

		if (!this.mealToEdit) return;

		const mealTime = new Date(this.mealToEdit.time as unknown as string);
		this.dish = this.mealToEdit.name;
		this.selectedDate = mealTime;
		this.selectedStartTime = mealTime;
		this.selectedEndTime = mealTime;
	}

	protected saveMeal(): void {
		this.clearErrors();

		const user = this.authService.currentUser();
		const currentUsername = user?.username;

		if (this.dish &&
			this.selectedValue &&
			this.selectedDate &&
			this.selectedStartTime &&
			this.selectedEndTime &&
			currentUsername &&
			this.roomCode) {

			const finalDate = new Date(this.selectedDate);
			finalDate.setHours(this.selectedStartTime.getHours());
			finalDate.setMinutes(this.selectedStartTime.getMinutes());

			const finalEndDate = new Date(this.selectedDate);
			finalEndDate.setHours(this.selectedEndTime.getHours());
			finalEndDate.setMinutes(this.selectedEndTime.getMinutes());

			const newMeal: Meal = {
				time: finalDate,
				endTime: finalEndDate,
				name: this.dish,
				responsible: currentUsername ,
				room: this.roomCode // Use the roomCode passed from parent instead of currentUsername
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
				next: (meal) => {
					console.log('Successfully saved meal:', meal);
					this.mealService.saveError.set('');
					this.isSubmitting = false;
					this.mealSaved.emit();
					this.closePopup();
				},
				error: (err) => {
					console.error('Error saving meal:', err);
					this.isSubmitting = false;
					this.mealService.saveError.set('Unable to save meal: ' + (err.error?.error || err.message || 'Unknown error'));
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
			error: (err) => {
				this.isSubmitting = false;
				console.error('Error deleting meal:', err);
				this.mealService.saveError.set('Unable to delete meal: ' + (err.error?.error || err.message || 'Unknown error'));
			}
		});
	}

	private applyInitialDateTime() {
		this.clearErrors();

		if(!this.isEditMode){
			this.selectedDate = this.initialDate;
			this.selectedStartTime = this.initialTime;

			if (this.initialTime) {
				const endTime = new Date(this.initialTime);
				endTime.setHours(endTime.getHours() + 1);
				this.selectedEndTime = endTime;
			}

			this.dish = '';
			this.selectedValue = 'breakfast-0';
		}
	}
}

