import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

// Default images are defined in a small Angular-free module so server-side
// scripts can import them without pulling in the Angular compiler.
export { DEFAULT_PROFILE_PICTURE, DEFAULT_ROOM_PICTURE, DEFAULT_RECIPE_IMAGE } from './default-images';

export const BACKEND_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_PATTERN = /^(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export const requiredTrimmed: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
	const val = control.value;

	// If it's a valid Date object, it satisfies the "required" check
	if (val instanceof Date) {
		return isNaN(val.getTime()) ? { requiredTrimmed: true } : null;
	}

	// Otherwise fall back to the string trimming logic
	const stringValue = typeof val === 'string' ? val.trim() : '';
	return stringValue.length > 0 ? null : { requiredTrimmed: true };
};

export function profileFieldValidators(passwordRequired: boolean): {
	email: ValidatorFn[];
	firstName: ValidatorFn[];
	lastName: ValidatorFn[];
	bio: ValidatorFn[];
	dob: ValidatorFn[];
	profilePicture: ValidatorFn[];
	password: ValidatorFn[];
} {
	return {
		email: [Validators.required, Validators.email, Validators.pattern(BACKEND_EMAIL_PATTERN)],
		firstName: [Validators.required, requiredTrimmed, Validators.maxLength(50)],
		lastName: [Validators.required, requiredTrimmed, Validators.maxLength(50)],
		bio: [Validators.maxLength(100)],
		dob: [Validators.required, requiredTrimmed],
		profilePicture: [Validators.maxLength(1000)],
		password: passwordRequired
			? [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_STRENGTH_PATTERN)]
			: [Validators.minLength(8), Validators.pattern(/^$|(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/)]
	};
}
