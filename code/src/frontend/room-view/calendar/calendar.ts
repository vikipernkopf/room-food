// noinspection GrazieInspection

import { Component, effect, OnInit, signal, WritableSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MealManagement } from '../meal-management/meal-management';
import { MealService } from '../../core/meal-service';
import { Meal } from '../../../backend/model';
import { AuthService } from '../../core/auth-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../core/room-service';

@Component({
	selector: 'app-calendar',
	imports: [
		MealManagement,
		DatePipe
	],
	templateUrl: './calendar.html',
	styleUrl: './calendar.scss',
	standalone: true
})
export class Calendar implements OnInit {
	viewDate: Date = new Date();
	currMonth: string = '';
	currYear: number = 0;
	dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	hours: number[] = Array.from({ length: 18 }, (_, i) => i + 5);
	weekdays: {
		name: string;
		date: number;
		month: number;
		year: number;
		isToday: boolean
	}[] = [];
	protected hourHeight: number = 65;
	showMealPopup = false;

	meals = signal<Meal[]>([]);
	selectedMeal: Meal | null = null;
	selectedDateForPopup: Date | null = null;
	selectedTimeForPopup: Date | null = null;

	protected readonly username: WritableSignal<string> = signal('');
	protected readonly roomCode: WritableSignal<string> = signal('');
	private hasRedirected = false;
	private lastProcessedCode: string = ''; // track which code we've already processed

	constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService,
		private mealService: MealService, private roomService: RoomService) {
		console.log('Calendar component initialized');

		// Subscribe to route param 'code' and unsubscribe on destroy
		this.route.paramMap
		.pipe(takeUntilDestroyed())
		.subscribe(paramMap => {
			const code = paramMap.get('code') ?? '';
			console.log('Route param received, setting roomCode to:', code);
			this.roomCode.set(code);
		});

		effect(() => {
			const code = this.roomCode();
			console.log('Room code effect triggered with code:', code);

			// Only process if the code has changed (avoid re-processing the same code)
			if (code === this.lastProcessedCode) {
				console.log('Code unchanged, skipping effect');
				return;
			}

			this.lastProcessedCode = code;
			console.log('Processing new code:', code);

			console.log('Validating room code:', code);
			this.validateAndLoadRoom(code);
		});
	}

	private validateAndLoadRoom(roomCode: string) {
		this.roomService.checkRoomExists(roomCode).subscribe({
			next: response => {
				console.log('Room validation response:', response);
				if (response.exists) {
					this.loadMeals();
				} else {
					console.log('Room does not exist in database, redirecting to error');
					if (!this.hasRedirected) {
						this.hasRedirected = true;
						this.meals.set([]);
						// noinspection JSIgnoredPromiseFromCall
						this.router.navigate(['/error']);
					}
				}
			},
			error: error => {
				console.error('Error validating room:', error);
				// If validation fails, redirect to error
				if (!this.hasRedirected) {
					this.hasRedirected = true;
					this.meals.set([]);
					// noinspection JSIgnoredPromiseFromCall
					this.router.navigate(['/error']);
				}
			}
		});
	}

	ngOnInit() {
		this.renderWeek();
	}

	protected loadMeals() {
		const user = this.authService.currentUser();

		if (!user) {
			console.error('User not logged in');
			if (!this.hasRedirected) {
				this.hasRedirected = true;
				this.meals.set([]);
				// noinspection JSIgnoredPromiseFromCall
				this.router.navigate(['/error']);
			}
			return;
		}

		this.mealService.getMealsByRoomCode(this.roomCode()).subscribe({
			next: meals => {
				console.log('Meals received for calendar:', meals);
				const formattedMeals = meals.map(m => ({
					...m,
					time: new Date(m.time)
				}));
				this.meals.set(formattedMeals);
			},
			error: err => console.error('Error loading meals', err)
		});
	}

	renderWeek(): void {
		const sunday = new Date(this.viewDate);
		sunday.setDate(this.viewDate.getDate() - this.viewDate.getDay());
		sunday.setHours(0, 0, 0, 0);

		this.currMonth = sunday.toLocaleString('en-US', { month: 'long' });
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

		const actualHourWithDecimal = clickedY / this.hourHeight + 5;
		let hours = Math.floor(actualHourWithDecimal);
		const minutesDecimal = actualHourWithDecimal % 1;
		let minutes = Math.round((minutesDecimal * 60) / 15) * 15;

		if (minutes === 60) {
			hours += 1;
			minutes = 0;
		}

		const targetDate = new Date(dayInfo.year, dayInfo.month, dayInfo.date);
		const targetTime = new Date(targetDate);
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

	getMealPosition(startTime: Date | string): number {
		const date = new Date(startTime);
		const hours = date.getHours();
		const minutes = date.getMinutes();

		const decimalHours = (hours + minutes / 60) - 5;
		return decimalHours * this.hourHeight;
	}

	getMealHeight(startTime: Date | string, endTime: Date | string): number {
		const start = new Date(startTime);
		const end = new Date(endTime);

		const durationInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

		return Math.max(durationInHours * this.hourHeight, 30);
	}

	nextWeek() {
		this.viewDate.setDate(this.viewDate.getDate() + 7);
		this.renderWeek();
	}

	prevWeek() {
		this.viewDate.setDate(this.viewDate.getDate() - 7);
		this.renderWeek();
	}

	goToToday() {
		this.viewDate = new Date();
		this.renderWeek();
	}

	getFormattedResponsibleUsers(meal: Meal): string {
		const currentUser = this.authService.currentUser();
		const currentUsername = currentUser?.username;

		// If no responsible users, return empty
		if (!meal.responsibleUsers || meal.responsibleUsers.length === 0) {
			return '';
		}

		// Start with the current user if they're in the list
		const users: string[] = [];
		const allUsers = [...meal.responsibleUsers];

		if (currentUsername && allUsers.includes(currentUsername)) {
			users.push(currentUsername);
			allUsers.splice(allUsers.indexOf(currentUsername), 1);
		}

		// Add remaining users
		users.push(...allUsers);

		// Format to single line with ellipsis
		if (users.length === 1) {
			return users[0];
		}

		return users.slice(0, 2).join(', ') + (users.length > 2 ? '...' : '');
	}
}
