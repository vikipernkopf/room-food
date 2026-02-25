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
import {MealService} from '../../backend/meal/meal-service';

interface MealType {
	value: string;
	viewValue: string;
}

export const MY_DATE_FORMATS = {
	parse: { dateInput: 'DD/MM/YYYY' },
	display: {
		dateInput: 'DD/MM/YYYY',
		monthYearLabel: 'MMM YYYY',
		dateA11yLabel: 'LL',
		monthYearA11yLabel: 'MMMM YYYY',
	},
};

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
	constructor(private mealService: MealService) {}

	@Output() close = new EventEmitter<void>();

	closePopup() {
		this.close.emit();
	}

	dish: string = '';
	selectedValue: string = '';
	selectedDate: any;
	selectedTime: any;
	showError: boolean = false;

	mealTypes: MealType[] = [
		{value: 'breakfast', viewValue: 'Breakfast'},
		{value: 'lunch', viewValue: 'Lunch'},
		{value: 'dinner', viewValue: 'Dinner'}
	];

	saveMeal() {
		if (this.dish && this.selectedValue && this.selectedDate && this.selectedTime) {
			this.showError = false;

			const dateObj = new Date(this.selectedDate);
			const timeObj = new Date(this.selectedTime);
			dateObj.setHours(timeObj.getHours());
			dateObj.setMinutes(timeObj.getMinutes());

			const combinedDateTime = dateObj.toLocaleString('sv-SE').substring(0, 16);
			const currentUser = "CurrentUsername";

			const mealForBackend: any = {
				time: combinedDateTime,
				recipeId: Number(this.dish),
				responsible: currentUser,
				room: currentUser
			};

			const result = this.mealService.addMeal(mealForBackend, currentUser);

			if (result === true) {
				console.log("Success!");
				this.closePopup();
			} else {
				console.error("Database error:", result);
			}

		} else {
			this.showError = true;
		}
	}
}

