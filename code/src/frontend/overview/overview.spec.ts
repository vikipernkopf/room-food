//noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Overview } from './overview';
import { AuthService } from '../core/auth-service';
import { Meal } from '../../backend/model';
import { MealService } from '../core/meal-service';
import { RoomService } from '../core/room-service';

@Component({
	selector: 'app-add-meal',
	standalone: true,
	template: ''
})
class StubAddMeal {
	@Input()
	mealToEdit: Meal | null = null;
	@Input()
	roomCode: string = '';
	@Input()
	availableRooms: any[] = [];
	@Input()
	overviewMode: boolean = false;
	@Input()
	initialDate: Date | null = null;
	@Input()
	initialTime: Date | null = null;
	@Output()
	close = new EventEmitter<void>();
	@Output()
	mealSaved = new EventEmitter<void>();
}

@Component({
	selector: 'app-navbar',
	standalone: true,
	template: ''
})
class StubNavbar {
}

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal({ username: 'testuser' });
}

describe('Overview', () => {
	let component: Overview;
	let fixture: ComponentFixture<Overview>;
	// no httpMock when using stub services

	beforeEach(async () => {
		const authService = new StubAuthService();

		// stub RoomService and MealService to avoid timing/http test harness complexity
		const stubRoomService: any = {
			getRoomsForMember: (_username: string) => of([
				{
					code: 'R1',
					roomName: 'Room One',
					role: 'member'
				}
			])
		};

		const stubMealService: any = {
			getMealsByUsername: (_username: string) => of([
				{
					id: 1,
					name: 'Pasta',
					time: new Date('2026-02-27T12:00:00Z').toISOString(),
					endTime: new Date('2026-02-27T13:00:00Z').toISOString(),
					room: 'R1',
					responsible: 'luni'
				}
			])
		};

		await TestBed.configureTestingModule({
			imports: [Overview],
			providers: [
				provideRouter([]),
				{
					provide: AuthService,
					useValue: authService
				},
				{
					provide: RoomService,
					useValue: stubRoomService
				},
				{
					provide: MealService,
					useValue: stubMealService
				}
			]
		})
		.overrideComponent(Overview, {
			set: {
				imports: [StubAddMeal, StubNavbar]
			}
		})
		.compileComponents();

		fixture = TestBed.createComponent(Overview);
		component = fixture.componentInstance;
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('renderWeek builds seven weekdays and sets month/year', () => {
		component.viewDate = new Date('2026-02-23');
		component.renderWeek();

		expect(component.weekdays.length).toBe(7);
		expect(component.currMonth).toBeTruthy();
	});

	it('loads rooms and meals for logged in user', async () => {
		vi.useFakeTimers();
		fixture.detectChanges();

		// loadRooms runs synchronously; loadMeals waits ~40ms
		vi.advanceTimersByTime(50);
		fixture.detectChanges();
		// allow any pending microtasks/subscriptions to complete
		await Promise.resolve();

		expect(component.availableRooms().length).toBe(1);
		expect(component.meals().length).toBe(1);
	});

	it('handleColumnClick computes time and opens popup', () => {
		component.renderWeek();
		component.availableRooms.set([
			{
				code: 'R1',
				roomName: 'Room One',
				role: 'owner'
			}
		]);

		const mockDay = component.weekdays[0];
		const fakeEvent: any = { offsetY: (component as any).hourHeight * 2 + 20 }; // around 7:20

		component.handleColumnClick(fakeEvent as MouseEvent, mockDay);

		expect(component.showMealPopup).toBeTruthy();
		expect(component.selectedDateForPopup).toBeTruthy();
		expect(component.selectedTimeForPopup).toBeTruthy();
	});
});
