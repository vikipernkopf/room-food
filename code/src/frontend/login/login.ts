import {Component, signal, ChangeDetectionStrategy, WritableSignal, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth-service';
import { LoginCredentials } from '../../backend/model';
import {CookieService} from 'ngx-cookie-service';
import {inject} from '@angular/core';

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
	private readonly title="annoying";
	private cookieValue = '';
	public cookieService= inject(CookieService);

	/*ngOnInit(): void {
		const token = this.cookieService.get('auth_token');
		if (token) {
			this.authService.currentUser.set(/* restored user );
			this.router.navigate(['/home']);
		}
	}
	*/
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
			this.cookieService.set('auth_token', this.title, 7, '/');
		} else {
			this.loginForm.markAllAsTouched();
			console.log('Form is invalid');
		}
	}


}
