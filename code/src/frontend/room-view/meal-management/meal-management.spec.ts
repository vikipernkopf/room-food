import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MealManagement } from './meal-management';
import { Meal } from '../../../backend/model';

describe('Meal', () => {
	let component: MealManagement;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MealManagement],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting()
			]
		})
		.compileComponents();

		let fixture: ComponentFixture<MealManagement> = TestBed.createComponent(MealManagement);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('prefills selected meal type when editing a meal', () => {
		const mealToEdit: Meal = {
			id: 1,
			name: 'Pasta',
			mealType: 'dinner-2',
			time: new Date('2026-04-17T17:00:00.000Z'),
			endTime: new Date('2026-04-17T18:00:00.000Z'),
			room: 'A1',
			responsible: 'luni',
			responsibleUsers: ['luni']
		};

		component.mealToEdit = mealToEdit;
		component.ngOnChanges({
			mealToEdit: new SimpleChange(null, mealToEdit, true)
		});

		expect(component.selectedValue).toBe('dinner-2');
	});
});
