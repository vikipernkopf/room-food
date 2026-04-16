import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MealService } from './meal-service';
import { Meal } from '../../backend/model';

describe('MealService', () => {
	let service: MealService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});
		service = TestBed.inject(MealService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	it('should be created', () => expect(service).toBeTruthy());

	it('postMeal sends mealType and ISO timestamps', () => {
		const meal: Meal = {
			name: 'Pasta',
			mealType: 'dinner-2',
			time: new Date('2026-04-17T17:00:00.000Z'),
			endTime: new Date('2026-04-17T18:00:00.000Z'),
			room: 'A1',
			responsible: 'luni',
			responsibleUsers: ['luni']
		};

		service.postMeal(meal).subscribe();

		const req = httpMock.expectOne('/api/meal');
		expect(req.request.method).toBe('POST');
		expect(req.request.body.mealType).toBe('dinner-2');
		expect(req.request.body.time).toBe('2026-04-17T17:00:00.000Z');
		expect(req.request.body.endTime).toBe('2026-04-17T18:00:00.000Z');
		req.flush({
			...meal,
			id: 1
		});
	});

	it('updateMeal sends updatedMeal with mealType', () => {
		const meal: Meal = {
			id: 7,
			name: 'Soup',
			mealType: 'lunch-1',
			time: new Date('2026-04-17T11:00:00.000Z'),
			endTime: new Date('2026-04-17T12:00:00.000Z'),
			room: 'A1',
			responsible: 'tobi',
			responsibleUsers: ['tobi', 'luni']
		};

		service.updateMeal(7, meal).subscribe();

		const req = httpMock.expectOne('/api/meal/7');
		expect(req.request.method).toBe('PUT');
		expect(req.request.body.updatedMeal.mealType).toBe('lunch-1');
		expect(req.request.body.updatedMeal.time).toBe('2026-04-17T11:00:00.000Z');
		expect(req.request.body.updatedMeal.endTime).toBe('2026-04-17T12:00:00.000Z');
		req.flush({ ...meal });
	});
});
