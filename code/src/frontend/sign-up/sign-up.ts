import {Component, WritableSignal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthService} from '../core/auth-service';
import { SignUpCredentials } from '../../backend/model';

const DEFAULT_PROFILE_PICTURE =
	'https://i.imgur.com/tdi3NGa_d.webp?maxwidth=760&fidelity=grand';

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
		email: new FormControl('', [Validators.required, Validators.email]),
		firstName: new FormControl('', [Validators.required]),
		lastName: new FormControl('', [Validators.required]),
		bio: new FormControl('', [Validators.maxLength(400)]),
		dob: new FormControl('', [Validators.required]),
		profilePicture: new FormControl(''),
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
			const profilePicture = (this.signUpForm.value.profilePicture ?? '').trim();
			const payload: SignUpCredentials = {
				username: this.signUpForm.value.username ?? '',
				password: this.signUpForm.value.password ?? '',
				email: this.signUpForm.value.email ?? '',
				firstName: this.signUpForm.value.firstName ?? '',
				lastName: this.signUpForm.value.lastName ?? '',
				bio: this.signUpForm.value.bio ?? '',
				dob: this.signUpForm.value.dob ?? '',
				profilePicture: profilePicture || DEFAULT_PROFILE_PICTURE
			};
			this.authService.signUp(payload);
		} else {
			this.signUpForm.markAllAsTouched();
			console.log('Form is invalid');
		}
	}
}
