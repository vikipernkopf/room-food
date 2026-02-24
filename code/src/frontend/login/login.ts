import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth-service';

@Component({
	selector: 'app-login',
	standalone: true,
	imports: [CommonModule, RouterLink, ReactiveFormsModule],
	templateUrl: './login.html',
	styleUrl: './login.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})

export class Login {
	// Form controls using FormGroup
	loginForm = new FormGroup({
		username: new FormControl('', [Validators.required,
			Validators.pattern('^[a-zA-Z0-9]*$')]),
		password: new FormControl('', [Validators.required])
	});

	constructor(private authService: AuthService) {}
	onFormSubmit() {
		if (this.loginForm.valid) {
			// Pass the form values (username and password) to your service
			this.authService.login(this.loginForm.value);
		} else {
			console.log('Form is invalid');
		}
	}
}
