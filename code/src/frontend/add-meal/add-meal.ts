import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import {MatDatepicker, MatDatepickerModule} from '@angular/material/datepicker';
import {MatTimepickerModule} from '@angular/material/timepicker';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {provideNativeDateAdapter} from '@angular/material/core';

interface MealType {
	value: string;
	viewValue: string;
}

export interface Meal {
	dish: string;
	mealType: string;
	date: Date;
	time: string;
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
	templateUrl: './add-meal.html',
	styleUrl: './add-meal.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMeal {
	@Output() close = new EventEmitter<void>();

	closePopup() {
		this.close.emit();
	}

	dish: string = '';
	selectedValue!: string;
	selectedMealType = '';
	selectedDate!: Date;
	selectedTime!: Date;
	showError: boolean = false;

	mealTypes: MealType[] = [
		{value: 'breakfast-0', viewValue: 'Breakfast'},
		{value: 'lunch-1', viewValue: 'Lunch'},
		{value: 'dinner-2', viewValue: 'Dinner'},
		{value: 'snack-3', viewValue: 'Snack'},
	];

	saveMeal() {
		// 2. Check if all fields have values
		if (this.selectedValue && this.selectedDate && this.selectedTime) {
			this.showError = false;
			console.log('Saved:', this.selectedValue, this.selectedDate, this.selectedTime);
			this.closePopup();
		} else {
			// 3. Show the red text if something is missing
			this.showError = true;
		}
	}
}

