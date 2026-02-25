import {Component, signal, WritableSignal} from '@angular/core';
import {AuthService} from '../core/auth-service';
import { AddMeal } from '../add-meal/add-meal';

@Component({
  selector: 'app-homepage',
	standalone: true,
	imports: [
		AddMeal
	],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})


export class Homepage {
	public readonly username: WritableSignal<string> = signal("");

	constructor(private authService: AuthService) {
		const user = this.authService.getCurrentUser();
		this.username.set(user ? user.username : "Guest");
	}

	isPopupVisible = false;

	togglePopup() {
		this.isPopupVisible = !this.isPopupVisible;
	}
}
