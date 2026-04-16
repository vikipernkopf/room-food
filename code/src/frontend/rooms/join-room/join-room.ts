import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth-service';
import { RoomService } from '../../core/room-service';
import { CommonModule } from '@angular/common';
import { StatusCodes } from 'http-status-codes';

@Component({
	selector: 'app-join-room',
	standalone: true,
	imports: [
		ReactiveFormsModule,
		RouterLink,
		CommonModule
	],
	templateUrl: './join-room.html',
	styleUrl: './join-room.scss'
})
export class JoinRoom {
	@Input()
	showCreateRoomLink = false;
	@Output()
	createRoomRequested = new EventEmitter<void>();

	// Form controls using FormGroup
	roomJoinForm = new FormGroup({
		roomCode: new FormControl('', [Validators.required, Validators.minLength(2)])
	});

	public readonly joinRoomStatus = signal('');
	public readonly joinRoomStatusType = signal<'success' | 'error' | ''>('');
	public isLoading = false;

	constructor(
		private authService: AuthService,
		private roomService: RoomService
	) {
		this.setLoadingState(false);
	}

	private setLoadingState(isLoading: boolean) {
		this.isLoading = isLoading;
		if (isLoading) {
			this.roomJoinForm.disable();
			return;
		}
		this.roomJoinForm.enable();
	}

	protected isJoinRoomSuccess(): boolean {
		return this.joinRoomStatusType() === 'success';
	}

	protected isJoinRoomError(): boolean {
		return this.joinRoomStatusType() === 'error';
	}

	private setJoinRoomError(message: string): void {
		this.joinRoomStatusType.set('error');
		this.joinRoomStatus.set(message);
	}

	private setJoinRoomSuccess(message: string): void {
		this.joinRoomStatusType.set('success');
		this.joinRoomStatus.set(message);
	}

	onFormSubmit() {
		if (this.roomJoinForm.valid) {
			const currentUser = this.authService.currentUser();

			if (!currentUser) {
				this.setJoinRoomError('You must be logged in to join a room');
				return;
			}

			this.setLoadingState(true);
			this.joinRoomStatus.set('');
			this.joinRoomStatusType.set('');
			const roomCode = (this.roomJoinForm.value.roomCode ?? '').trim().toUpperCase();

			this.roomService.requestToJoinRoom(currentUser.username, roomCode).subscribe({
				next: response => {
					console.log(`Requested ${currentUser.username} to join ${roomCode}`, response);
					this.setLoadingState(false);
					this.setJoinRoomSuccess('Join request sent successfully.');
				},
				error: err => {
					this.setLoadingState(false);
					let errorMessage = 'Error joining room. Please try again.';

					if (err.status === StatusCodes.BAD_REQUEST) {
						errorMessage = 'Invalid room code. Please check and try again.';
					}

					if (err.status === StatusCodes.CONFLICT) {
						errorMessage = 'You are already a member or requesting to join this room';
					}

					this.setJoinRoomError(errorMessage);
					console.error('Error joining room:', err);
				}
			});
		} else {
			this.roomJoinForm.markAllAsTouched();
			console.log('Form is invalid');
		}
	}
}
