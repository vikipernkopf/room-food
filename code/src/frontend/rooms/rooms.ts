import {Component, effect, signal, WritableSignal} from '@angular/core';
import {RoomService} from '../core/room-service';
import {AuthService} from '../core/auth-service';
import {User} from '../../backend/model';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {RoomCreation} from '../room-creation/room-creation';
import {RouterLink} from '@angular/router';

type MemberRoom = { code: string, role: string };

@Component({
  selector: 'app-rooms',
	imports: [
		ReactiveFormsModule,
		RoomCreation,
		RouterLink
	],
  templateUrl: './rooms.html',
  styleUrl: './rooms.scss',
})
export class Rooms {
	protected readonly currentUser: WritableSignal<User | null>;

	// holds the most recently created room code for display
	protected createdRoomCode?: string | null = null;
	protected creating = false;
	protected showAddRoom = false;
	protected readonly memberRooms = signal<MemberRoom[]>([]);
	protected readonly roomsLoadError = signal('');

	// Create a control for the room name input
	protected roomNameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);

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
		this.roomsService.getRoomsForMember(username).subscribe({
			next: (rooms) => {
				this.memberRooms.set(rooms || []);
				this.roomsLoadError.set('');
			},
			error: () => {
				this.memberRooms.set([]);
				this.roomsLoadError.set('Failed to load your rooms.');
			}
		});
	}

	protected newRoom() {
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
				next: (res) => {
					this.createdRoomCode = res.result;
					this.creating = false;
					this.showAddRoom = false;
					this.roomNameControl.reset();
					console.log('Created room code', res.result);
				},
				error: (err) => {
					this.creating = false;
					console.error('Failed to create room', err);
				}
			});
	}

	protected openAddRoom() {
		this.showAddRoom = !this.showAddRoom;
	}

	onRoomCreated() {
		this.showAddRoom = false;
	}
}
