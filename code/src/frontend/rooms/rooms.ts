import {Component, WritableSignal} from '@angular/core';
import {RoomService} from '../core/room-service';
import {AuthService} from '../core/auth-service';
import {User} from '../../backend/model';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-rooms',
	imports: [
		RouterLink,
		RouterLinkActive
	],
  templateUrl: './rooms.html',
  styleUrl: './rooms.scss',
})
export class Rooms {
	protected readonly currentUser: WritableSignal<User | null>;

	// holds the most recently created room code for display
	protected createdRoomCode?: string | null = null;
	protected creating = false;

	constructor(private roomsService: RoomService, private authService: AuthService) {
		this.currentUser = this.authService.currentUser;
	}

	protected newRoom() {
		const username = this.currentUser()?.username;
		if (!username) {
			console.error('Cannot create room: user not logged in');
			// optional: show a UI message instead of silent failure
			this.createdRoomCode = null;
			return;
		}

		console.log("Creating room for user:", username);
		this.creating = true;
		this.roomsService.createRoom(username, "DefaultRoom")
			.subscribe({
				next: (res) => {
					this.createdRoomCode = res.result;
					this.creating = false;
					console.log('Created room code', res.result);
				},
				error: (err) => {
					this.creating = false;
					console.error('Failed to create room', err);
				}
			});
	}
}
