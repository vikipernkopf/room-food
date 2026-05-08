import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { MealManagement } from '../room-view/meal-management/meal-management';
import { MealService } from '../core/meal-service';
import { Meal } from '../../backend/model';
import { AuthService } from '../core/auth-service';
import { Router } from '@angular/router';
import { RoomService } from '../core/room-service';
import { IngredientList } from './ingredient-list/ingredient-list';

//noinspection JSIgnoredPromiseFromCall
@Component({
	selector: 'app-overview',
	imports: [
		MealManagement,
		IngredientList
	],
	templateUrl: './overview.html',
	styleUrl: './overview.scss',
	standalone: true
})
export class Overview implements OnInit {
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
	availableRooms = signal<{ code: string; roomName: string; role: string; profilePicture?: string }[]>([]);
	selectedRoomCode: string = '';
	protected readonly currentUser;

	private hasRedirected = false;

	constructor(private router: Router, private authService: AuthService,
		private mealService: MealService, private roomService: RoomService) {
		this.currentUser = this.authService.currentUser;

		// Reactively load data whenever the user state changes
		effect(() => {
			const user = this.currentUser();

			// If user is logged in, (re)load the data
			if (user?.username) {
				this.loadMeals();
				this.loadRooms();
			} else {
				// Optionally clear data if logged out
				this.meals.set([]);
				this.availableRooms.set([]);
			}
		});

		console.log('Overview component initialized');
	}

	loadRooms() {
		if (!this.currentUser) {
			return;
		}

		this.roomService.getRoomsForMember(this.currentUser()?.username ?? "").subscribe({
			next: rooms => {
				console.log('Rooms loaded for overview:', rooms);
				this.availableRooms.set(rooms);
				if (rooms.length > 0 && !this.selectedRoomCode) {
					this.selectedRoomCode = rooms[0].code;
				}
			},
			error: err => {
				console.error('Error loading rooms:', err);
				this.availableRooms.set([]);
			}
		});
	}

	formatTime(date: Date | string | null | undefined): string {
		if (!date) {
			return '';
		}

		const d = typeof date === 'string' ? new Date(date) : date;
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	ngOnInit() {
		this.renderWeek();
	}

	async loadMeals() {
		const username = this.currentUser()?.username;

		if (!username) {
			return;
		}

		this.mealService.getMealsByUsername(username).subscribe({
			next: meals => {
				const formattedMeals = meals.map(m => ({
					...m,
					time: new Date(m.time)
				}));
				this.meals.set(formattedMeals);
			},
			error: err => {
				console.error('Error loading meals', err);
				this.meals.set([]);
			}
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
		this.selectedMeal = null;

		// Ensure a room is selected before creating a meal
		if (!this.selectedRoomCode && this.availableRooms().length > 0) {
			this.selectedRoomCode = this.availableRooms()[0].code;
		}

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
		this.loadMeals();
	}

	prevWeek() {
		this.viewDate.setDate(this.viewDate.getDate() - 7);
		this.renderWeek();
		this.loadMeals();
	}

	goToToday() {
		this.viewDate = new Date();
		this.renderWeek();
		this.loadMeals();
	}

	getRoomName(roomCode: string): string {
		const room = this.availableRooms().find(r => r.code === roomCode);
		return room ? room.roomName : 'Unknown Room';
	}

	getFormattedResponsibleUsers(meal: Meal): string {
		const currentUsername = this.authService.currentUser()?.username;

		if (!meal.responsibleUsers || meal.responsibleUsers.length === 0) {
			return '';
		}

		const users: string[] = [];
		const allUsers = [...meal.responsibleUsers];

		if (currentUsername && allUsers.includes(currentUsername)) {
			users.push(currentUsername);
			allUsers.splice(allUsers.indexOf(currentUsername), 1);
		}

		users.push(...allUsers);

		if (users.length === 1) {
			return users[0];
		}

		return users.slice(0, 2).join(', ') + (users.length > 2 ? '...' : '');
	}
}

