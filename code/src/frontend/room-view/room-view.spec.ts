import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import { RoomView } from './room-view';
import { AuthService } from '../core/auth-service';
import { Meal, User } from '../../backend/model';

@Component({
  selector: 'app-meal-plan',
  standalone: true,
  template: '<div class="meal-plan-stub">{{ meal?.name }}</div>'
})
class StubMealPlan {
  @Input() meal: Meal | null = null;
  @Input() index: number = 0;
}

@Component({
  selector: 'app-add-meal',
  standalone: true,
  template: ''
})
class StubAddMeal {
  @Output() close = new EventEmitter<void>();
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  template: ''
})
class StubNavbar {}

class StubAuthService {
  public readonly currentUser: WritableSignal<User | null> = signal(null);
}

describe('RoomView', () => {
  let component: RoomView;
  let fixture: ComponentFixture<RoomView>;
  let httpMock: HttpTestingController;
  let authService: StubAuthService;

  beforeEach(async () => {
    authService = new StubAuthService();

    await TestBed.configureTestingModule({
      imports: [RoomView],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService }
      ]
    })
      .overrideComponent(RoomView, {
        set: {
          imports: [StubMealPlan, StubAddMeal, StubNavbar]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(RoomView);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (component) {
      component.ngOnDestroy();
    }
    if (httpMock) {
      httpMock.verify();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders empty state when backend returns no meals', () => {
    authService.currentUser.set({ username: 'luni' });
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/meals/luni');
    expect(req.request.method).toBe('GET');
    req.flush([]);

    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    const mealItems = fixture.debugElement.queryAll(By.css('.meal-plan-stub'));

    expect(emptyState).toBeTruthy();
    expect(mealItems.length).toBe(0);
  });

  it('renders meals after fetch', () => {
    authService.currentUser.set({ username: 'luni' });
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/meals/luni');
    req.flush([
      { name: 'Pasta', time: new Date('2026-02-27T12:00:00Z'), room: 'A1', responsible: 'luni' },
      { name: 'Salad', time: new Date('2026-02-27T18:00:00Z'), room: 'A1', responsible: 'luni' }
    ] as Meal[]);

    fixture.detectChanges();

    const mealItems = fixture.debugElement.queryAll(By.css('.meal-plan-stub'));
    expect(mealItems.length).toBe(2);
    expect(mealItems[0].nativeElement.textContent).toContain('Pasta');
    expect(mealItems[1].nativeElement.textContent).toContain('Salad');
  });

  it('shows add-meal popup when button is clicked', () => {
    authService.currentUser.set({ username: 'luni' });
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/meals/luni');
    req.flush([]);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.fancy'));
    button.triggerEventHandler('click');
    fixture.detectChanges();

    const popup = fixture.debugElement.query(By.css('app-add-meal'));
    expect(popup).toBeTruthy();
  });

  it('auto-refreshes meals on interval', () => {
    vi.useFakeTimers();
    authService.currentUser.set({ username: 'luni' });
    fixture.detectChanges();

    const first = httpMock.expectOne('/api/meals/luni');
    first.flush([]);
    fixture.detectChanges();

    vi.advanceTimersByTime(2000);
    const refresh = httpMock.expectOne('/api/meals/luni');
    refresh.flush([]);

    vi.useRealTimers();
  });
});
