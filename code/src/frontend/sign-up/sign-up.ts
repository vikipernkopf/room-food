import {Component, signal, WritableSignal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthService} from '../core/auth-service';

@Component({
  selector: 'app-signup',
	imports: [
		ReactiveFormsModule,
		RouterLink
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

	public signUpError: WritableSignal<string> = signal('');

	constructor(private authService: AuthService) {}


	onFormSubmit() {
		if (this.signUpForm.valid) {
			// Pass the form values (username and password) to your service
			this.authService.signUp(this.signUpForm.value);
			this.signUpError = this.authService.signUpError;
		} else {
			console.log('Form is invalid');
		}
	}
}
