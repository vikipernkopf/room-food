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
import { AuthService } from '../core/auth-service';
import {Meal, User} from '../../backend/model';
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
	templateUrl: './meal-management.html',
	styleUrl: './meal-management.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})

export class MealManagement implements OnChanges {
	@Output() close = new EventEmitter<void>();
	@Output() mealSaved = new EventEmitter<void>();
	@Input() mealToEdit: Meal | null = null;

	closePopup() {
		this.close.emit();
	}

	dish: string = '';
	selectedValue: string = 'breakfast-0';
	selectedDate: Date | null = null;
	selectedTime: Date | null = null;
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

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['mealToEdit']) {
			this.prefillFormFromInput();
		}
	}

	protected get isEditMode(): boolean {
		return this.mealToEdit !== null;
	}

	private prefillFormFromInput(): void {
		this.showError = false;

		if (!this.mealToEdit) {
			this.dish = '';
			this.selectedValue = 'breakfast-0';
			this.selectedDate = null;
			this.selectedTime = null;
			return;
		}

		const mealTime = new Date(this.mealToEdit.time as unknown as string);
		this.dish = this.mealToEdit.name;
		this.selectedDate = mealTime;
		this.selectedTime = mealTime;
	}

	protected saveMeal(): void {
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

			const request = this.isEditMode && this.mealToEdit
				? this.menuService.updateMeal(
					{
						time: new Date(this.mealToEdit.time as unknown as string),
						name: this.mealToEdit.name,
						responsible: this.mealToEdit.responsible,
						room: this.mealToEdit.room,
					},
					newMeal
				)
				: this.menuService.postMeal(newMeal);

			request.subscribe({
				next: (meal) => {
					console.log('Successfully saved meal:', meal);
					this.menuService.saveError.set('');
					this.mealSaved.emit();
					this.closePopup();
				},
				error: (err) => {
					console.error('Error saving meal:', err);
					this.menuService.saveError.set('Unable to save meal: ' + (err.error?.error || err.message || 'Unknown error'));
				}
			});
		} else {
			this.showError = true;
		}
	}
}

