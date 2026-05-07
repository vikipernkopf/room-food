import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { App } from './app';
import { AuthService } from '../core/auth-service';

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal(null);
	public restoreSession = vi.fn();
}

describe('App', () =>
	it('should create the app and restore the auth session on init', async () => {
		const authService = new StubAuthService();

		await TestBed.configureTestingModule({
			imports: [App],
			providers: [
				provideRouter([]),
				{
					provide: AuthService,
					useValue: authService
				}
			]
		}).compileComponents();

		const fixture = TestBed.createComponent(App);
		const app = fixture.componentInstance;
		expect(app).toBeTruthy();

		fixture.detectChanges();
		expect(authService.restoreSession).toHaveBeenCalledTimes(1);
	})
);
