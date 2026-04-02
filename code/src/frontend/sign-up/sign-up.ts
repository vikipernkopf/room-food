import {Component, WritableSignal} from '@angular/core';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {AuthService} from '../core/auth-service';
import { SignUpCredentials } from '../../backend/model';
import { DEFAULT_PROFILE_PICTURE, profileFieldValidators } from '../core/user-form-validation';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
	const password = control.get('password')?.value ?? '';
	const repeatPassword = control.get('repeatPassword')?.value ?? '';
	if (!password || !repeatPassword) {
		return null;
	}
	return password === repeatPassword ? null : {passwordMismatch: true};
}

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
	private readonly sharedValidators = profileFieldValidators(true);
	protected loginQueryParams: { returnUrl: string } | null = null;

	signUpForm = new FormGroup({
		username: new FormControl('', [Validators.required,
			Validators.pattern('^[a-zA-Z0-9]*$')]),
		email: new FormControl('', this.sharedValidators.email),
		firstName: new FormControl('', this.sharedValidators.firstName),
		lastName: new FormControl('', this.sharedValidators.lastName),
		bio: new FormControl('', this.sharedValidators.bio),
		dob: new FormControl('', this.sharedValidators.dob),
		profilePicture: new FormControl('', this.sharedValidators.profilePicture),
		password: new FormControl('', this.sharedValidators.password),
		repeatPassword: new FormControl('', [Validators.required])
	}, {validators: passwordsMatchValidator});

	public showPassword = false;
	public showRepeatPassword = false;

	// Expose the service signal directly so template updates when service sets errors
	public signUpError: WritableSignal<string>;
	private returnUrl = '/homepage';

	constructor(private authService: AuthService, private route: ActivatedRoute) {
		this.signUpError = this.authService.signUpError;
		const requestedReturn = this.route.snapshot.queryParamMap.get('returnUrl');
		if (requestedReturn && requestedReturn.startsWith('/')) {
			this.returnUrl = requestedReturn;
			this.loginQueryParams = { returnUrl: requestedReturn };
		}
	}

	togglePasswordVisibility() {
		this.showPassword = !this.showPassword;
	}

	toggleRepeatPasswordVisibility() {
		this.showRepeatPassword = !this.showRepeatPassword;
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
			this.authService.signUp(payload, this.returnUrl);
		} else {
			this.signUpForm.markAllAsTouched();
			console.log('Form is invalid');
		}
	}
}
