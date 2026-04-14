import { Component, EventEmitter, Input, Output, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth-service';
import { RoomService } from '../../core/room-service';
import { CommonModule } from '@angular/common';
import { User } from '../../../backend/model';
import { DEFAULT_ROOM_PICTURE } from '../../core/user-form-validation';

@Component({
	selector: 'app-room-creation',
	standalone: true,
	imports: [
		ReactiveFormsModule,
		RouterLink,
		CommonModule
	],
	templateUrl: './create-room.html',
	styleUrl: './create-room.scss',
})
export class RoomCreation {
	@Input()
	showJoinExistingLink = false;
	@Output()
	joinExistingRequested = new EventEmitter<void>();

	// Form controls using FormGroup
	roomCreationForm = new FormGroup({
		roomName: new FormControl('', [Validators.required, Validators.minLength(2)]),
		roomPictureUrl: new FormControl(''),
	});

	public createRoomError: WritableSignal<string>;
	public isLoading = false;
	protected currentUser: WritableSignal<User | null>;

	constructor(
		private authService: AuthService,
		private roomService: RoomService,
		private router: Router
	) {
		this.createRoomError = this.roomService.saveError;
		this.currentUser = this.authService.currentUser;
		this.setLoadingState(false);
	}

	private setLoadingState(isLoading: boolean) {
		this.isLoading = isLoading;
		if (isLoading) {
			this.roomCreationForm.disable();
			return;
		}
		this.roomCreationForm.enable();
	}

	onFormSubmit() {
		if (this.roomCreationForm.valid) {
			const user = this.currentUser();

			if (!user) {
				this.roomService.saveError.set('You must be logged in to create a room');
				return;
			}

			this.setLoadingState(true);
			const roomName = this.roomCreationForm.value.roomName ?? '';
			const roomPictureUrl = (this.roomCreationForm.value.roomPictureUrl ?? '').trim();
			const pfp = roomPictureUrl || DEFAULT_ROOM_PICTURE;
			console.log(user);

			this.roomService.createRoom(user.username, roomName, pfp).subscribe({
				next: response => {
					console.log('Room created successfully:', response);
					this.setLoadingState(false);
					this.roomService.saveError.set('');
					// Navigate to the room or rooms list
					console.log(response);
					// noinspection JSIgnoredPromiseFromCall
					this.router.navigate([`/calendar/${response.result}`]);
				},
				error: err => {
					this.setLoadingState(false);
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
