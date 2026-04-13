import { Component, effect, signal, WritableSignal } from '@angular/core';
import { RoomService } from '../core/room-service';
import { AuthService } from '../core/auth-service';
import { User } from '../../backend/model';
import { ReactiveFormsModule } from '@angular/forms';
import { RoomCreation } from './create-room/create-room';
import { JoinRoom } from './join-room/join-room';
import { RouterLink } from '@angular/router';
import { DEFAULT_ROOM_PICTURE } from '../core/user-form-validation';

type MemberRoom = {
	code: string,
	roomName: string,
	role: string,
	profilePicture?: string
};

@Component({
	selector: 'app-rooms',
	imports: [
		ReactiveFormsModule,
		RoomCreation,
		JoinRoom,
		RouterLink
	],
	templateUrl: './rooms.html',
	styleUrl: './rooms.scss'
})
export class Rooms {
	protected activePopup: 'create' | 'join' | null = null;
	protected readonly currentUser: WritableSignal<User | null>;

	// holds the most recently created room code for display
	/*protected createdRoomCode?: string | null = null;
	protected creating = false;*/
	protected readonly memberRooms = signal<MemberRoom[]>([]);
	protected readonly roomsLoadError = signal('');

	// Create a control for the room name input
	//protected roomNameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);

	constructor(private roomsService: RoomService, private authService: AuthService) {
		this.currentUser = this.authService.currentUser;

		effect(() => {
			const username = this.currentUser()?.username?.trim();
			if (!username) {
				this.memberRooms.set([]);
				this.roomsLoadError.set('');
				return;
			}
			this.fetchMemberRooms(username);
		});
	}

	private fetchMemberRooms(username: string) {
		console.log('Fetching rooms for user:', username);
		this.roomsService.getRoomsForMember(username).subscribe({
			next: rooms => {
				console.log('Raw rooms response:', rooms);
				console.log('Room names received:', (rooms || []).map(room => ({
					code: room.code,
					roomName: room.roomName,
					profilePicture: room.profilePicture
				})));
				this.memberRooms.set(rooms || []);
				this.roomsLoadError.set('');
			},
			error: () => {
				console.error('Failed to load rooms for user:', username);
				this.memberRooms.set([]);
				this.roomsLoadError.set('Failed to load your rooms.');
			}
		});
	}

	protected getRoomImage(room: MemberRoom): string {
		return room.profilePicture || DEFAULT_ROOM_PICTURE;
	}

	/*protected newRoom() {
	 const username = this.currentUser()?.username;
	 const roomName = this.roomNameControl.value!;
	 if (!username) {
	 console.error('Cannot create room: user not logged in');
	 // optional: show a UI message instead of silent failure
	 this.createdRoomCode = null;
	 return;
	 }

	 console.log("Creating room for user:", username);
	 this.creating = true;
	 this.roomsService.createRoom(username, roomName)
	 .subscribe({
	 next: res => {
	 this.createdRoomCode = res.result;
	 this.creating = false;
	 this.activePopup = null;
	 this.roomNameControl.reset();
	 console.log('Created room code', res.result);
	 },
	 error: err => {
	 this.creating = false;
	 console.error('Failed to create room', err);
	 }
	 });
	 }*/

	protected openCreateRoom() {
		this.activePopup = 'create';
	}

	protected openJoinRoom() {
		this.activePopup = 'join';
	}

	protected closePopup() {
		this.activePopup = null;
	}

	protected onOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			this.closePopup();
		}
	}
}
