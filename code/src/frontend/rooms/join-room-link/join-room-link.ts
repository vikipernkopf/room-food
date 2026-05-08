import {Component, inject, OnInit, signal, effect} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RoomService} from '../../core/room-service';
import {AuthService} from '../../core/auth-service';
import {StatusCodes} from 'http-status-codes';

@Component({
  selector: 'app-join-room-link',
  imports: [],
  templateUrl: './join-room-link.html',
  styleUrl: './join-room-link.scss',
})
export class JoinRoomLink implements OnInit {
	private route = inject(ActivatedRoute);
	private roomService = inject(RoomService);
	private authService = inject(AuthService);

	public readonly joinRoomStatus = signal('');
	public readonly joinRoomStatusType = signal<'success' | 'error' | ''>('');
	public isLoading = false;
	private hasAttemptedJoin = false;

	constructor() {
		// Use effect to wait for currentUser to be set (session restored)
		effect(() => {
			const user = this.authService.currentUser();
			// Only attempt to join when user is not null and we haven't tried yet
			if (user !== null && !this.hasAttemptedJoin) {
				this.attemptToJoinRoom();
			}
		});
	}

	ngOnInit() {
		// Session will be restored automatically by the app component
	}

	private attemptToJoinRoom() {
		const code = this.route.snapshot.paramMap.get('code');
		console.log("the code is " + code);
		const user = this.authService.currentUser();
		console.log("the user is " + user);

		this.hasAttemptedJoin = true;

		if (code === null) {
			this.setJoinRoomError('Invalid link.');
			return;
		}

		if (user === null) {
			this.setJoinRoomError('You are not logged in.');
			return;
		}

		this.setLoadingState(true);
		this.roomService.requestToJoinRoom(user.username, code).subscribe({
			next: response => {
				console.log(`Requested ${user.username} to join ${code}`, response);
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
	}

	private setLoadingState(isLoading: boolean) {
		this.isLoading = isLoading;
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
}
