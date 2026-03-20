import {Component, OnInit, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MealManagement} from '../../meal-management/meal-management';
import {MealService} from '../../core/meal-service';
import {Meal} from '../../../backend/model';
import {AuthService} from '../../core/auth-service';

@Component({
  selector: 'app-calendar',
	imports: [
		MealManagement,
		DatePipe
	],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit {
	viewDate: Date = new Date();
	currMonth: string = '';
	currYear: number = 0;
	dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	hours: number[] = Array.from({ length: 24 }, (_, i) => i);
	weekdays: {name: string; date: number; month: number; year: number; isToday: boolean}[] = [];
	protected hourHeight: number = 65;
	showMealPopup = false;

	meals = signal<Meal[]>([]);
	selectedMeal: Meal | null = null;
	selectedDateForPopup: Date | null = null;
	selectedTimeForPopup: Date | null = null;

	constructor(private mealService: MealService, private authService: AuthService) {}

	ngOnInit() {
		this.renderWeek();
		this.loadMeals();
	}

	loadMeals() {
		const user = this.authService.currentUser();
		if (!user) return;

		this.mealService.getMealsByUsername(user.username).subscribe({
			next: (meals) => {
				console.log('Meals received for calendar:', meals);
				const formattedMeals = meals.map(m => ({
					...m,
					time: new Date(m.time)
				}));
				this.meals.set(formattedMeals);
			},
			error: (err) => console.error('Error loading meals', err)
		});
	}

	renderWeek(): void {
		const sunday = new Date(this.viewDate);
		sunday.setDate(this.viewDate.getDate() - this.viewDate.getDay());
		sunday.setHours(0, 0, 0, 0);

		this.currMonth = sunday.toLocaleString('en-US', { month: "long" });
		this.currYear = sunday.getFullYear();

		this.weekdays = [];
		const todayStr = new Date().toDateString();

		for (let i = 0; i < 7; i++) {
			const nextDay = new Date(sunday);
			nextDay.setDate(sunday.getDate() + i);

			this.weekdays.push({
				name: this.dayNames[nextDay.getDay()],
				date: nextDay.getDate(),
				month: nextDay.getMonth(),
				year: nextDay.getFullYear(),
				isToday: nextDay.toDateString() === todayStr
			});
		}
	}

	handleColumnClick(event: MouseEvent, dayInfo: any) {
		// Only open if we didn't click an existing meal (which stops propagation)
		this.selectedMeal = null;

		const clickedY = event.offsetY;
		const totalMinutes = Math.floor((clickedY / this.hourHeight) * 60);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = Math.round((totalMinutes % 60) / 15) * 15;

		const targetDate = new Date(dayInfo.year, dayInfo.month, dayInfo.date);
		const targetTime = new Date();
		targetTime.setHours(hours, minutes, 0, 0);

		this.selectedDateForPopup = targetDate;
		this.selectedTimeForPopup = targetTime;
		this.showMealPopup = true;
	}

	openEdit(meal: Meal) {
		this.selectedMeal = meal;
		this.showMealPopup = true;
	}

	getMealsForDay(day: any) {
		return this.meals().filter(meal => {
			const mDate = new Date(meal.time);

			const isSameYear = mDate.getFullYear() === day.year;
			const isSameMonth = mDate.getMonth() === day.month;
			const isSameDay = mDate.getDate() === day.date;

			return isSameYear && isSameMonth && isSameDay;
		});
	}

	getMealTop(meal: Meal): number {
		const date = new Date(meal.time);
		const hours = date.getHours();
		const minutes = date.getMinutes();

		return (hours * this.hourHeight) + ((minutes / 60) * this.hourHeight);
	}

	nextWeek() { this.viewDate.setDate(this.viewDate.getDate() + 7); this.renderWeek(); }
	prevWeek() { this.viewDate.setDate(this.viewDate.getDate() - 7); this.renderWeek(); }
	goToToday() { this.viewDate = new Date(); this.renderWeek(); }
}
