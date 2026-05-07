import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SignUp } from './sign-up';
import { AuthService } from '../core/auth-service';
import { vi } from 'vitest';

describe('SignUp', () => {
	let component: SignUp;
	let fixture: ComponentFixture<SignUp>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [SignUp],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				provideLocationMocks()
			]
		}).compileComponents();

		fixture = TestBed.createComponent(SignUp);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should block submit when passwords do not match', () => {
		const authService = TestBed.inject(AuthService);
		const signUpSpy = vi.spyOn(authService, 'signUp');

		(component as any).signUpModel.set({
			username: 'user1',
			email: 'user1@example.com',
			firstName: 'User',
			lastName: 'One',
			bio: '',
			dob: '2000-01-01',
			profilePicture: '',
			password: 'Pass123!',
			repeatPassword: 'Different123!'
		});
		fixture.detectChanges();

		component.onFormSubmit();

		expect((component as any).signUpForm.repeatPassword().invalid()).toBe(true);
		expect(
			(component as any).fieldHasError(
				(component as any).signUpForm.repeatPassword,
				'passwordMismatch'
			)
		).toBe(true);
		expect(signUpSpy).not.toHaveBeenCalled();
	});

	it('should toggle password input type when eye button is clicked', () => {
		const passwordInput = fixture.debugElement.query(By.css('#password')).nativeElement as HTMLInputElement;
		expect(passwordInput.type).toBe('password');

		const toggleButton = fixture.debugElement
		.query(By.css('button[aria-label="Show password"]'))
			.nativeElement as HTMLButtonElement;
		toggleButton.click();
		fixture.detectChanges();

		expect(passwordInput.type).toBe('text');
	});
});
