import { Component, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth-service';
import { RoomService } from '../../core/room-service';
import { CommonModule } from '@angular/common';
import {StatusCodes} from 'http-status-codes';

@Component({
	selector: 'app-join-room',
	standalone: true,
	imports: [
		ReactiveFormsModule,
		RouterLink,
		CommonModule
	],
	templateUrl: './join-room.html',
	styleUrl: './join-room.scss',
})
export class JoinRoom {
	// Form controls using FormGroup
	roomCreationForm = new FormGroup({
		roomName: new FormControl('', [Validators.required, Validators.minLength(2)])
	});

	public createRoomError: WritableSignal<string>;
	public isLoading = false;

	constructor(
		private authService: AuthService,
		private roomService: RoomService,
		private router: Router
	) {
		this.createRoomError = this.roomService.saveError;
		this.createRoomError.set("");
	}

	onFormSubmit() {
		if (this.roomCreationForm.valid) {
			const currentUser = this.authService.currentUser();

			if (!currentUser) {
				this.roomService.saveError.set('You must be logged in to join a room');
				return;
			}

			this.isLoading = true;
			const roomName = this.roomCreationForm.value.roomName ?? '';

			this.roomService.requestToJoinRoom(currentUser.username, roomName).subscribe({
				next: (response) => {
					console.log(`Requested ${currentUser.username} to join ${roomName}`, response);
					this.isLoading = false;
					this.roomService.saveError.set('');
					// Navigate to the room or rooms list
					//this.router.navigate(['/myrooms']);
				},
				error: (err) => {
					this.isLoading = false;
					console.error('Error joining room:', err);
					this.roomService.saveError.set('Error joining room. Please try again.');
					if(err.status==StatusCodes.CONFLICT){
						this.roomService.saveError.set('You are already a member or requesting to join this room');
					}
				}
			});
		} else {
			this.roomCreationForm.markAllAsTouched();
			console.log('Form is invalid');
		}
	}
}
