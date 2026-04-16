import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Navbar } from './navbar';
import { AuthService } from '../core/auth-service';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  function setLayoutWidths(containerWidth: number, contentWidth: number): void {
    const root = fixture.nativeElement as HTMLElement;
    const shell = root.querySelector('.navbar-shell') as HTMLElement;
    const measureShell = root.querySelector('.navbar-measure .navbar-shell') as HTMLElement;

    Object.defineProperty(shell, 'clientWidth', {
      configurable: true,
      value: containerWidth,
    });

    Object.defineProperty(measureShell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: contentWidth,
        height: 0,
        top: 0,
        left: 0,
        right: contentWidth,
        bottom: 0,
        x: 0,
        y: 0,
      }),
    });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the navbar expanded when the links fit horizontally', () => {
    fixture.detectChanges();
    setLayoutWidths(900, 700);

    (component as any).recalculateLayout();
    fixture.detectChanges();

    expect((component as any).isCollapsed()).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.navbar-toggler')).toBeNull();
    expect((fixture.nativeElement.querySelector('#navContent') as HTMLElement).classList.contains('is-collapsed')).toBeFalsy();
  });

  it('collapses the navbar when the measured content is wider than the available space', () => {
    fixture.detectChanges();
    setLayoutWidths(420, 700);

    (component as any).recalculateLayout();
    fixture.detectChanges();

    expect((component as any).isCollapsed()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.navbar-toggler')).not.toBeNull();
    expect((fixture.nativeElement.querySelector('#navContent') as HTMLElement).classList.contains('is-collapsed')).toBeTruthy();
  });

  it('collapses in near-overflow edge cases using the guard band', () => {
    fixture.detectChanges();
    setLayoutWidths(700, 695);

    (component as any).recalculateLayout();
    fixture.detectChanges();

    expect((component as any).isCollapsed()).toBeTruthy();
  });

  it('routes My Rooms through login with returnUrl when logged out', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set(null);

    expect((component as any).myRoomsLink()).toEqual(['/login']);
    expect((component as any).myRoomsQueryParams()).toEqual({ returnUrl: '/myrooms' });
  });

  it('routes My Rooms directly when logged in', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set({ username: 'alice' } as any);

    expect((component as any).myRoomsLink()).toEqual(['/myrooms']);
    expect((component as any).myRoomsQueryParams()).toBeNull();
  });
});
