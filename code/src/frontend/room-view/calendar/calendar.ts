import {Component, effect, OnInit, signal, WritableSignal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MealManagement} from '../../meal-management/meal-management';
import {MealService} from '../../core/meal-service';
import {Meal} from '../../../backend/model';
import {AuthService} from '../../core/auth-service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {RoomService} from '../../core/room-service';

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
	hours: number[] = Array.from({ length: 24 }, (_, i) => i);
	weekdays: {name: string; date: number; month: number; year: number; isToday: boolean}[] = [];
	protected hourHeight: number = 65;
	showMealPopup = false;

	meals = signal<Meal[]>([]);
	selectedMeal: Meal | null = null;
	selectedDateForPopup: Date | null = null;
	selectedTimeForPopup: Date | null = null;

	protected readonly username: WritableSignal<string> = signal("");
	protected readonly roomCode: WritableSignal<string> = signal("");
	private hasRedirected = false;
	private lastProcessedCode: string = ""; // track which code we've already processed

	constructor(private route:ActivatedRoute, private router: Router, private authService: AuthService,
				private mealService: MealService, private roomService: RoomService) {
		console.log('Calendar component initialized');

		// Subscribe to route param 'code' and unsubscribe on destroy
		this.route.paramMap
			.pipe(takeUntilDestroyed())
			.subscribe((paramMap) => {
				const code = paramMap.get('code') ?? "";
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
			next: (response) => {
				console.log('Room validation response:', response);
				if (!response.exists) {
					console.log('Room does not exist in database, redirecting to error');
					if (!this.hasRedirected) {
						this.hasRedirected = true;
						this.meals.set([]);
						this.router.navigate(['/error']);
					}
				}
				else{
					this.loadMeals();
				}
			},
			error: (error) => {
				console.error('Error validating room:', error);
				// If validation fails, redirect to error
				if (!this.hasRedirected) {
					this.hasRedirected = true;
					this.meals.set([]);
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
				this.router.navigate(['/error']);
			}
			return;
		}

		console.log("hi 111 1 1212 2 22 23 3333")

		this.mealService.getMealsByRoomCode(this.roomCode()).subscribe({
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
