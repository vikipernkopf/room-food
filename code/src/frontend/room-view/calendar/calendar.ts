import {Component, OnInit} from '@angular/core';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-calendar',
	imports: [
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
	hours: number[] = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
	weekdays: {name: string; date: number; isToday: boolean}[] = [];

	ngOnInit() {
		this.renderWeek();
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
				isToday: nextDay.toDateString() === todayStr
			});
		}
	}

	nextWeek(): void {
		this.viewDate.setDate(this.viewDate.getDate() + 7);
		this.renderWeek();
	}

	// Move backward 7 days
	prevWeek(): void {
		this.viewDate.setDate(this.viewDate.getDate() - 7);
		this.renderWeek();
	}

	// Jump back to the current real-time week
	goToToday(): void {
		this.viewDate = new Date();
		this.renderWeek();
	}
}
