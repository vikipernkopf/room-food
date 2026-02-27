import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {MealPlan} from './meal-plan';

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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows fallback text when no meal is provided', () => {
    component.meal = null;
    fixture.detectChanges();

    const fallback = fixture.debugElement.query(By.css('p'));
    expect(fallback.nativeElement.textContent).toContain('No meal data available');
  });

  it('renders meal details when meal is provided', () => {
	  component.meal = {
		name: 'Pasta',
		time: new Date('2026-02-27T12:00:00Z'),
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
      time: new Date('2026-02-27T18:00:00Z'),
      room: 'A1',
      responsible: 'luni'
    };
    component.index = 1;
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('.meal-plan'));
    expect(container.nativeElement.classList.contains('even')).toBe(true);
  });
});
