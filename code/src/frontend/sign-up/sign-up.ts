import { Component, WritableSignal, signal } from '@angular/core';
import {
	FormField,
	FormRoot,
	FormSubmitOptions,
	email,
	form,
	maxLength,
	minLength,
	pattern,
	required,
	submit,
	validate,
	validateTree
} from '@angular/forms/signals';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatInput, MatSuffix } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthService } from '../core/auth-service';
import { SignUpCredentials } from '../../backend/model';
import { BACKEND_EMAIL_PATTERN, DEFAULT_PROFILE_PICTURE } from '../core/user-form-validation';

const PASSWORD_STRENGTH_PATTERN = /^(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

function requiredTrimmed(field: any, message: string): void {
	validate(field, ({ value }: any) => value().trim().length > 0 ? null : {
		kind: 'requiredTrimmed',
		message
	});
}

@Component({
	selector: 'app-signup',
	standalone: true,
	imports: [
		FormField,
		FormRoot,
		RouterLink,
		MatInput,
		MatDatepickerToggle,
		MatDatepicker,
		MatSuffix,
		MatDatepickerInput
	],
	providers: [
		provideNativeDateAdapter()
	],
	templateUrl: './sign-up.html',
	styleUrl: './sign-up.scss',
})
export class SignUp {
	protected readonly signUpModel = signal({
		username: '',
		email: '',
		firstName: '',
		lastName: '',
		bio: '',
		dob: '',
		profilePicture: '',
		password: '',
		repeatPassword: ''
	});

	protected loginQueryParams: {
		returnUrl: string
	} | null = null;

	private readonly formSubmission: FormSubmitOptions<any, any> = {
		action: async () => {
			const model = this.signUpModel();
			const profilePicture = model.profilePicture.trim();

			const formattedDob: string = model.dob && typeof (model.dob as any).toISOString === 'function'
				? (model.dob as unknown as Date).toISOString().split('T')[0]
				: model.dob;

			const payload: SignUpCredentials = {
				username: model.username.toLowerCase(),
				password: model.password,
				email: model.email,
				firstName: model.firstName,
				lastName: model.lastName,
				bio: model.bio,
				dob: formattedDob,
				profilePicture: profilePicture || DEFAULT_PROFILE_PICTURE
			};
			this.authService.signUp(payload, this.returnUrl);
		},
		onInvalid: () => console.log('Form is invalid')
	};

	protected readonly signUpForm: any = form(this.signUpModel, (signUp: any) => {
		required(signUp.username);
		pattern(signUp.username, /^[a-zA-Z0-9]*$/);

		required(signUp.email);
		email(signUp.email);
		pattern(signUp.email, BACKEND_EMAIL_PATTERN);

		required(signUp.firstName);
		requiredTrimmed(signUp.firstName, 'First name is required');
		maxLength(signUp.firstName, 50);

		required(signUp.lastName);
		requiredTrimmed(signUp.lastName, 'Last name is required');
		maxLength(signUp.lastName, 50);

		maxLength(signUp.bio, 100);

		required(signUp.dob);

		maxLength(signUp.profilePicture, 1000);

		required(signUp.password);
		minLength(signUp.password, 8);
		pattern(signUp.password, PASSWORD_STRENGTH_PATTERN);

		required(signUp.repeatPassword);

		validateTree(signUp, ({
			value,
			fieldTree
		}: any) => {
			const {
				password,
				repeatPassword
			} = value();
			if (!password || !repeatPassword || password === repeatPassword) {
				return null;
			}

			return [
				{
					kind: 'passwordMismatch',
					message: 'Passwords do not match',
					fieldTree: fieldTree.repeatPassword
				}
			];
		});
	}, { submission: this.formSubmission });

	// Expose the service signal directly so template updates when service sets errors
	public signUpError: WritableSignal<string>;
	private returnUrl = '/homepage';
	public showPassword = false;
	public showRepeatPassword = false;

	constructor(private authService: AuthService, private route: ActivatedRoute) {
		this.signUpError = this.authService.signUpError;
		const requestedReturn = this.route.snapshot.queryParamMap.get('returnUrl');
		if (requestedReturn && requestedReturn.startsWith('/')) {
			this.returnUrl = requestedReturn;
			this.loginQueryParams = { returnUrl: requestedReturn };
		}
	}

	protected fieldTouchedAndInvalid(field: any): boolean {
		return field().touched() && field().invalid();
	}

	protected fieldHasError(field: any, kind: string): boolean {
		return field().errors().some((error: {
			kind: string
		}) => error.kind === kind);
	}

	togglePasswordVisibility() {
		this.showPassword = !this.showPassword;
	}

	toggleRepeatPasswordVisibility() {
		this.showRepeatPassword = !this.showRepeatPassword;
	}

	onFormSubmit() {
		return submit(this.signUpForm, this.formSubmission);
	}
}
