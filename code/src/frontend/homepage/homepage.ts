import {Component, signal, WritableSignal} from '@angular/core';
import {AuthService} from '../core/auth-service';
import {Navbar} from '../navbar/navbar';

@Component({
  selector: 'app-homepage',
	imports: [
		Navbar
	],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})

export class Homepage {
	public readonly username: WritableSignal<string> = signal("Guest");

	constructor(private authService: AuthService) {
		this.username = this.authService.getCurrentUser();
	}
}
