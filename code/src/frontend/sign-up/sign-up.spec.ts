import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { By } from '@angular/platform-browser';

import { SignUp } from './sign-up';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideLocationMocks} from '@angular/common/testing';
import {AuthService} from '../core/auth-service';
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
    	await fixture.whenStable();
  	});

  	it('should create', () => {
    	expect(component).toBeTruthy();
  	});

      it('should block submit when passwords do not match', () => {
        const authService = TestBed.inject(AuthService);
            const signUpSpy = vi.spyOn(authService, 'signUp');

        component.signUpForm.patchValue({
          username: 'user1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          dob: '2000-01-01',
          password: 'Pass123!',
          repeatPassword: 'Different123!'
        });

        component.onFormSubmit();

            expect(component.signUpForm.hasError('passwordMismatch')).toBe(true);
        expect(signUpSpy).not.toHaveBeenCalled();
      });

      it('should toggle password input type when eye button is clicked', () => {
        fixture.detectChanges();

        const passwordInput = fixture.debugElement.query(By.css('#password')).nativeElement as HTMLInputElement;
        expect(passwordInput.type).toBe('password');

        const toggleButton = fixture.debugElement.query(By.css('button[aria-label="Show password"]')).nativeElement as HTMLButtonElement;
        toggleButton.click();
        fixture.detectChanges();

        expect(passwordInput.type).toBe('text');
      });
});
