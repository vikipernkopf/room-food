import { Component, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../core/auth-service';
import { RoomService } from '../core/room-service';
import { CommonModule } from '@angular/common';
import {User} from '../../backend/model';

const DEFAULT_ROOM_PICTURE =
	'https://i.imgur.com/tdi3NGa_d.webp?maxwidth=760&fidelity=grand';

@Component({
  selector: 'app-room-creation',
	standalone: true,
	imports: [
		ReactiveFormsModule,
		RouterLink,
		CommonModule
	],
  templateUrl: './room-creation.html',
  styleUrl: './room-creation.scss',
})
export class RoomCreation {
	// Form controls using FormGroup
	roomCreationForm = new FormGroup({
		roomName: new FormControl('', [Validators.required, Validators.minLength(2)]),
		roomPictureUrl: new FormControl(''),
	});

	public createRoomError: WritableSignal<string>;
	public isLoading = false;
	protected currentUser: WritableSignal<User|null>;


	constructor(
		private authService: AuthService,
		private roomService: RoomService,
		private router: Router
	) {
		this.createRoomError = this.roomService.saveError;
		this.currentUser = this.authService.currentUser;
	}

	onFormSubmit() {
		if (this.roomCreationForm.valid) {
			const user = this.currentUser();

			if (!user) {
				this.roomService.saveError.set('You must be logged in to create a room');
				return;
			}

			this.isLoading = true;
			const roomName = this.roomCreationForm.value.roomName ?? '';
			const roomPictureUrl = (this.roomCreationForm.value.roomPictureUrl ?? '').trim();
			const pfp = roomPictureUrl || DEFAULT_ROOM_PICTURE;
			console.log(user);

			this.roomService.createRoom(user.username, roomName, pfp).subscribe({
				next: (response) => {
					console.log('Room created successfully:', response);
					this.isLoading = false;
					this.roomService.saveError.set('');
					// Navigate to the room or rooms list
					console.log(response);
					this.router.navigate([`/bla/calendar/${response.result}`]);
				},
				error: (err) => {
					this.isLoading = false;
					console.error('Error creating room:', err);
					this.roomService.saveError.set('Failed to create room. Please try again.');
				}
			});
		} else {
			this.roomCreationForm.markAllAsTouched();
			console.log('Form is invalid');
		}
	}
}
