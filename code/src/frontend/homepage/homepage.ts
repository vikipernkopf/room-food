import {Component, signal, WritableSignal} from '@angular/core';
import {AuthService} from '../core/auth-service';

@Component({
  selector: 'app-homepage',
  imports: [],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})

export class Homepage {
	public readonly username: WritableSignal<string> = signal("Guest");

	constructor(private authService: AuthService) {
		this.username = this.authService.getCurrentUser();
	}
}
