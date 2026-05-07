import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Login } from './login';
import { AuthService } from '../core/auth-service';
import { vi } from 'vitest';

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal(null);
	public login = vi.fn();
}

describe('Login', () => {
	let component: Login;

	beforeEach(async () => {
		const authService = new StubAuthService();

		await TestBed.configureTestingModule({
			imports: [Login],
			providers: [
				provideRouter([]),
				provideLocationMocks(),
				{
					provide: AuthService,
					useValue: authService
				},
				{
					provide: ActivatedRoute,
					useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/overview' }) } }
				}
			]
		})
		.compileComponents();

		let fixture: ComponentFixture<Login> = TestBed.createComponent(Login);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('passes the returnUrl to AuthService.login when the form is valid', () => {
		const authService = TestBed.inject(AuthService) as unknown as StubAuthService;

		component.loginForm.setValue({
			identifier: 'alice',
			password: 'secret'
		});
		component.onFormSubmit();

		expect(authService.login).toHaveBeenCalledWith(
			{
				identifier: 'alice',
				password: 'secret'
			},
			'/overview'
		);
		expect((component as any).signUpQueryParams).toEqual({ returnUrl: '/overview' });
	});

	it('does not submit when the form is invalid', () => {
		const authService = TestBed.inject(AuthService) as unknown as StubAuthService;

		component.loginForm.setValue({
			identifier: '',
			password: ''
		});
		component.onFormSubmit();

		expect(authService.login).not.toHaveBeenCalled();
	});
});
