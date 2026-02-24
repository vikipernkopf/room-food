import {Component, signal, ChangeDetectionStrategy, WritableSignal} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth-service';

@Component({
	selector: 'app-login-sign-up',
	standalone: true,
	imports: [CommonModule, RouterLink, ReactiveFormsModule],
	templateUrl: './login.html',
	styleUrl: './login.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})

export class Login {
	// Form controls using FormGroup
	loginForm = new FormGroup({
		username: new FormControl('', [Validators.required]),
		password: new FormControl('', [Validators.required])
	});
	public loginError: WritableSignal<String>= signal('');

	constructor(private authService: AuthService) {}
	onFormSubmit() {
		if (this.loginForm.valid) {
			this.authService.login(this.loginForm.value);
			this.loginError = this.authService.loginError;
		} else {
			console.log('Form is invalid');
		}
	}
}
