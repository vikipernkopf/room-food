import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Homepage } from './homepage';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideLocationMocks} from '@angular/common/testing';
import { AuthService } from '../core/auth-service';

describe('Homepage', () => {
  let component: Homepage;
  let fixture: ComponentFixture<Homepage>;
  let router: Router;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
	  providers: [
    provideHttpClient(),
		provideHttpClientTesting(),
		provideRouter([]),
		provideLocationMocks()
	  ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Homepage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('redirects Get Started to signup when user is logged out', () => {
    authService.currentUser.set(null);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (component as any).onGetStarted();

    expect(navigateSpy).toHaveBeenCalledWith(['/signup']);
  });

  it('redirects Get Started to room overview when user is logged in', () => {
    authService.currentUser.set({ username: 'alice' } as any);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (component as any).onGetStarted();

    expect(navigateSpy).toHaveBeenCalledWith(['/myrooms']);
  });
});
