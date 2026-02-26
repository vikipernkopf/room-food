import {ChangeDetectionStrategy, Component, EventEmitter, Output, WritableSignal} from '@angular/core';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import {MatDatepicker, MatDatepickerModule} from '@angular/material/datepicker';
import {MatTimepickerModule} from '@angular/material/timepicker';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {provideNativeDateAdapter} from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../core/auth-service';
import {Meal, User} from '../../backend/model';
import {MealService} from '../core/meal-service';
import {MenuService} from '../core/menu-service';

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

	protected readonly currentUser: WritableSignal<User | null>;

	constructor(private authService: AuthService, private menuService: MenuService,) {
		this.currentUser = this.authService.currentUser;
	}

	saveMeal() {
		const user = this.authService.currentUser();
		const currentUsername = user?.username;

		if (this.dish && this.selectedValue && this.selectedDate && this.selectedTime && currentUsername) {

			const finalDate = new Date(this.selectedDate);
			finalDate.setHours(this.selectedTime.getHours());
			finalDate.setMinutes(this.selectedTime.getMinutes());

			const newMeal: Meal = {
				time: finalDate,
				name: this.dish,
				responsible: currentUsername ,
				room: currentUsername
			};

			console.log('Posting to database...');
			this.menuService.postMealToDb(newMeal).subscribe({
				next: (meal) => {
					console.log('Successfully saved meal: ', meal.name);
					this.menuService.saveError.set('');
					this.closePopup();
				},
				error: (err) => {
					this.menuService.saveError.set('Unable to save meal: ' + err)
				}
			});

		} else {
			this.showError = true;
		}
	}
}

