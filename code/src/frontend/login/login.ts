import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
		username: new FormControl('', [Validators.required, Validators.minLength(3)]),
		password: new FormControl('', [Validators.required, Validators.minLength(4)])
	});

	onFormSubmit() {
		if (this.loginForm.valid) {
			console.log('Login successful:', this.loginForm.value);

		}
	}
}
