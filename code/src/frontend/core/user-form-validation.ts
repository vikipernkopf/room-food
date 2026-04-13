import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const DEFAULT_PROFILE_PICTURE =
	'https://i.imgur.com/tdi3NGa_d.webp?maxwidth=760&fidelity=grand';

export const DEFAULT_ROOM_PICTURE =
	'https://static.vecteezy.com/system/resources/previews/026/019/617/' +
	'non_2x/group-profile-avatar-icon-default-social-media-forum-profile-photo-vector.jpg';

export const DEFAULT_RECIPE_IMAGE =
	'https://thecrites.com/sites/all/modules/cookbook/theme/images/' +
	'default-recipe-big.png';

export const BACKEND_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_PATTERN = /^(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export const requiredTrimmed: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
	const value = typeof control.value === 'string' ? control.value.trim() : '';
	return value.length > 0 ? null : { requiredTrimmed: true };
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
