import {Component, signal, ChangeDetectionStrategy, WritableSignal} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth-service';
import { LoginCredentials } from '../../backend/model';

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
		identifier: new FormControl('', [Validators.required]),
		password: new FormControl('', [Validators.required])
	});
	public loginError: WritableSignal<String>= signal('');
	private returnUrl = '/homepage';

	constructor(private authService: AuthService, private route: ActivatedRoute) {
		const requestedReturn = this.route.snapshot.queryParamMap.get('returnUrl');
		if (requestedReturn && requestedReturn.startsWith('/')) {
			this.returnUrl = requestedReturn;
		}
	}
	onFormSubmit() {
		if (this.loginForm.valid) {
			const identifier = this.loginForm.value.identifier ?? '';
			const password = this.loginForm.value.password ?? '';
			const credentials: LoginCredentials = { identifier, password };
			this.authService.login(credentials, this.returnUrl);
			this.loginError = this.authService.loginError;
		} else {
			this.loginForm.markAllAsTouched();
			console.log('Form is invalid');
		}
	}
}
