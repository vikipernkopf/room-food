import {Component, WritableSignal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthService} from '../core/auth-service';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-signup',
	imports: [
		ReactiveFormsModule,
		RouterLink,
		NgIf
	],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp {
// Form controls using FormGroup
	signUpForm = new FormGroup({
		username: new FormControl('', [Validators.required,
			Validators.pattern('^[a-zA-Z0-9]*$')]),
		password: new FormControl('', [
			Validators.required,
			Validators.minLength(8),
			Validators.pattern(/^(?=.*\d)(?=.*[!@#$%^&*])/)
		])
	});

	// Expose the service signal directly so template updates when service sets errors
	public signUpError: WritableSignal<string>;

	constructor(private authService: AuthService) {
		this.signUpError = this.authService.signUpError;
	}


	onFormSubmit() {
		if (this.signUpForm.valid) {
			// Pass the form values (username and password) to your service
			this.authService.signUp(this.signUpForm.value);
		} else {
			console.log('Form is invalid');
		}
	}
}
