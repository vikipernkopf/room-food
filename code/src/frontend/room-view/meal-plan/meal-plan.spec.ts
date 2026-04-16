import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { MealPlan } from './meal-plan';

describe('MealPlan', () => {
	let component: MealPlan;
	let fixture: ComponentFixture<MealPlan>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [MealPlan]
		})
		.compileComponents();

		fixture = TestBed.createComponent(MealPlan);
		component = fixture.componentInstance;
	});

	it('should create', () => expect(component).toBeTruthy());

	it('shows fallback text when no meal is provided', () => {
		component.meal = null;
		fixture.detectChanges();

		const fallback = fixture.debugElement.query(By.css('p'));
		expect(fallback.nativeElement.textContent).toContain('No meal data available');
	});

	it('renders meal details when meal is provided', () => {
		component.meal = {
			name: 'Pasta',
			mealType: 'lunch-1',
			time: new Date('2026-02-27T12:00:00Z'),
			endTime: new Date('2026-02-27T14:00:00Z'),
			room: 'A1',
			responsible: 'luni'
		};
		component.index = 0;
		fixture.detectChanges();

		const name = fixture.debugElement.query(By.css('h3'));
		const details = fixture.debugElement.queryAll(By.css('p'));

		expect(name.nativeElement.textContent).toContain('Pasta');
		expect(details[1].nativeElement.textContent).toContain('A1');
		expect(details[2].nativeElement.textContent).toContain('luni');
	});

	it('adds even class when index is odd', () => {
		component.meal = {
			name: 'Salad',
			mealType: 'dinner-2',
			time: new Date('2026-02-27T18:00:00Z'),
			endTime: new Date('2026-02-27T20:00:00Z'),
			room: 'A1',
			responsible: 'luni'
		};
		component.index = 1;
		fixture.detectChanges();

		const container = fixture.debugElement.query(By.css('.meal-plan'));
		expect(container.nativeElement.classList.contains('even')).toBe(true);
	});

	it('calls onDelete callback when delete button is clicked', () => {
		let deletedMealName = '';
		component.meal = {
			id: 42,
			name: 'Soup',
			mealType: 'lunch-1',
			time: new Date('2026-02-28T12:00:00Z'),
			endTime: new Date('2026-02-27T15:00:00Z'),
			room: 'A1',
			responsible: 'luni'
		};
		component.onDelete = meal => {
			deletedMealName = meal.name;
		};

		fixture.detectChanges();

		const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));
		deleteButton.triggerEventHandler('click');

		expect(deletedMealName).toBe('Soup');
	});

	it('does not call onDelete when there is no meal', () => {
		let deleteCallCount = 0;
		component.meal = null;
		component.onDelete = () => {
			deleteCallCount += 1;
		};

		component.onDeleteClick();

		expect(deleteCallCount).toBe(0);
	});
});
