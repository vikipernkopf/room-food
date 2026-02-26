import {Component, computed, Signal, WritableSignal} from '@angular/core';
import {AuthService} from '../core/auth-service';
import {RouterLink} from '@angular/router';
import {User} from '../../backend/model';

@Component({
  selector: 'app-homepage',
  imports: [RouterLink],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})

export class Homepage {
	protected readonly currentUser: WritableSignal<User | null>;
	protected readonly username: Signal<string>;

	constructor(private authService: AuthService) {
		this.currentUser = this.authService.currentUser;
		this.username = computed(() => this.currentUser()?.username || "Guest");
	}
}
