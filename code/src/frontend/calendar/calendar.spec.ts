import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Calendar } from './calendar';
import { AuthService } from '../core/auth-service';
import { MealService } from '../core/meal-service';
import { RoomService } from '../core/room-service';
import { IngredientsFrontendService } from '../core/ingredients-frontend-service';
import { Meal } from '../../backend/model';

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal({ username: 'alice' });
}

describe('Calendar', () => {
	let component: Calendar;

	beforeEach(async () => {
		const authService = new StubAuthService();
		const roomService = {
			checkRoomExists: vi.fn().mockReturnValue(of({ exists: true }))
		} as any;
		const ingredientsFrontendService = {
			getIngredientsForRoom: vi.fn().mockReturnValue(of([])),
			getIngredientsForRecipe: vi.fn().mockReturnValue(of([])),
			getBoughtIngredientsForRoom: vi.fn().mockReturnValue(of([])),
			getPersonalBoughtIngredients: vi.fn().mockReturnValue(of([]))
		} as any;
		const mealService = {
			getMealsByRoomCode: vi.fn().mockReturnValue(of([
				{
					id: 1,
					name: 'Pasta',
					mealType: 'lunch-1',
					time: new Date('2026-02-23T12:00:00.000Z'),
					endTime: new Date('2026-02-23T13:00:00.000Z'),
					room: 'A1',
					responsible: 'alice'
				}
			]))
		} as any;

		await TestBed.configureTestingModule({
			imports: [Calendar],
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: { paramMap: of(convertToParamMap({ code: 'A1' })) }
				},
				{
					provide: AuthService,
					useValue: authService
				},
				{
					provide: RoomService,
					useValue: roomService
				},
				{
					provide: MealService,
					useValue: mealService
				},
				{
					provide: IngredientsFrontendService,
					useValue: ingredientsFrontendService
				}
			]
		})
			.compileComponents();

		let fixture: ComponentFixture<Calendar> = TestBed.createComponent(Calendar);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('renders the week and filters meals for a day', async () => {
		component.viewDate = new Date('2026-02-23');
		component.renderWeek();
		(component as any).meals.set([
			{
				id: 1,
				name: 'Pasta',
				mealType: 'lunch-1',
				time: new Date('2026-02-23T12:00:00.000Z'),
				endTime: new Date('2026-02-23T13:00:00.000Z'),
				room: 'A1',
				responsible: 'alice'
			} as Meal
		]);
		const day = component.weekdays[1];

		expect(component.weekdays.length).toBe(7);
		expect(component.getMealsForDay(day).length).toBe(1);
	});

	it('opens the meal popup when a column is clicked', () => {
		component.renderWeek();
		component.handleColumnClick({ offsetY: 130 } as MouseEvent, component.weekdays[0]);

		expect(component.showMealPopup).toBeTruthy();
		expect(component.selectedDateForPopup).toBeTruthy();
		expect(component.selectedTimeForPopup).toBeTruthy();
	});
});
