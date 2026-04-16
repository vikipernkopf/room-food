import {Component, effect, inject, OnDestroy, signal, WritableSignal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDivider} from '@angular/material/divider';
import {MatCard} from '@angular/material/card';
import {MatLabel} from '@angular/material/input';
import {MatButton, MatIconButton} from '@angular/material/button';
import {RoomService} from '../core/room-service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {Role, User} from '../../backend/model';
import {AuthService} from '../core/auth-service';
import {firstValueFrom} from 'rxjs';

interface Member {
	username: string;
	role: Role;
}

interface Request {
	username: string;
}

@Component({
	selector: 'app-room-management-view',
	standalone: true,
	imports: [
		CommonModule,
		MatDivider,
		MatCard,
		MatIconButton,
		MatLabel,
		MatButton
	],
	templateUrl: './room-management-view.html',
	styleUrl: './room-management-view.scss'
})
export class RoomManagementView implements OnDestroy {
	protected readonly roomCode: WritableSignal<string> = signal('');
	protected readonly roomName: WritableSignal<string> = signal('');
	protected readonly members: WritableSignal<Member[]> = signal([]);
	protected readonly requests: WritableSignal<Request[]> = signal([]);
	protected readonly currentUser: WritableSignal<User | null>;
	protected readonly userRole: WritableSignal<Role> = signal(Role.Member);
	private authService: AuthService = inject(AuthService);
	private hasRedirected = false;
	private lastProcessedCode: string = '';

	constructor(private route: ActivatedRoute,
		private router: Router,
		private roomService: RoomService) {

		this.currentUser=this.authService.currentUser;
		// Subscribe to route param 'code' and unsubscribe on destroy
		this.route.paramMap
		.pipe(takeUntilDestroyed())
		.subscribe(paramMap => {
			const code = paramMap.get('code') ?? '';
			console.log('Route param received, setting roomCode to:', code);
			this.roomCode.set(code);
			this.roomService.getRoomName(code).subscribe({
				next: response => {
					console.log(`Room name found for room ${this.roomCode()}: ${response.roomName}`);
					this.roomName.set(response.roomName);
				},
				error: error => console.error('Error getting name:', error)
			});
		});

		// Effect to handle room code changes
		effect(() => {
			const code = this.roomCode();
			console.log('Room code effect triggered with code:', code);

			// Only process if the code has changed
			if (code === this.lastProcessedCode) {
				console.log('Code unchanged, skipping effect');
				return;
			}

			this.lastProcessedCode = code;

			// If code is empty, redirect to error immediately
			if (!code || code.length === 0) {
				if (!this.hasRedirected) {
					console.log('Room code is empty, redirecting to error');
					this.hasRedirected = true;
					this.router.navigate(['/error']);
				}
				return;
			}

			// Code is not empty, validate it exists in the database
			console.log('Validating room code:', code);
			this.validateRoom(code);
		});
	}

	private validateRoom(roomCode: string) {
		this.roomService.checkRoomExists(roomCode).subscribe({
			next: response => {
				console.log('Room validation response:', response);
				if (response.exists) {
					console.log('Room exists, loading members and requests');
					this.hasRedirected = false;
					this.loadRoomData(roomCode);
					this.determineRole();
				} else {
					console.log('Room does not exist in database, redirecting to error');
					if (!this.hasRedirected) {
						this.hasRedirected = true;
						this.router.navigate(['/error']);
					}
				}
			},
			error: error => {
				console.error('Error validating room:', error);
				// If validation fails, redirect to error
				if (!this.hasRedirected) {
					this.hasRedirected = true;
					this.router.navigate(['/error']);
				}
			}
		});
	}

	private loadRoomData(roomCode: string) {
		this.fetchMembers(roomCode);
		this.fetchRequests(roomCode);
	}

	private fetchMembers(roomCode: string) {
		this.roomService.getMembersPerRoom(roomCode).subscribe({
			next: members => {
				console.log('Successfully fetched members:', members);
				const result: Member[] = [];
				members.forEach(m =>{
					result.push({username: m.username, role:m.role as Role})
				})
				this.members.set(result || []);
			},
			error: error => {
				console.error('Error fetching members:', error);
				this.members.set([]);
			}
		});
	}

	private fetchRequests(roomCode: string) {
		this.roomService.getRequestsPerRoom(roomCode).subscribe({
			next: requests => {
				console.log('Successfully fetched requests:', requests);
				this.requests.set(requests || []);
			},
			error: error => {
				console.error('Error fetching requests:', error);
				this.requests.set([]);
			}
		});
	}

	acceptRequest(username: string) {
		const code = this.roomCode();
		console.log('Accepting request for user:', username, 'in room:', code);

		this.roomService.acceptRequest(code, username).subscribe({
			next: response => {
				console.log('Request accepted successfully:', response);
				// Remove from requests list and refresh
				this.requests.update(reqs => reqs.filter(req => req.username !== username));
				// Refresh members list
				this.fetchMembers(code);
			},
			error: error => {
				console.error('Error accepting request:', error);
				alert('Failed to accept request');
			}
		});
	}

	rejectRequest(username: string) {
		const code = this.roomCode();
		console.log('Rejecting request for user:', username, 'in room:', code);

		this.roomService.rejectRequest(code, username).subscribe({
			next: response => {
				console.log('Request rejected successfully:', response);
				// Remove from requests list
				this.requests.update(reqs => reqs.filter(req => req.username !== username));
			},
			error: error => {
				console.error('Error rejecting request:', error);
				alert('Failed to reject request');
			}
		});
	}

	protected async removeMember(username: string) {
		const code = this.roomCode();
		this.determineRole().then(async _ =>{
			if((!(this.userRole()===Role.Owner) &&
				!(this.userRole()===Role.Admin)))
			{
				alert('Role insufficient');
				return
			}

			//I use confirm for now cuz i don't wanna do a popup but it can be changed later
			if (!confirm(`Kick member ${username}?`)) return;

			console.log('Removing member:', username, 'from room:', code);

			const result:boolean = (await firstValueFrom(this.roomService.removeMember(this.roomCode(), username, this.currentUser()?.username || ''))).success;

			console.log(result);

			this.fetchMembers(this.roomCode());
		})
	}

	ngOnDestroy() {
		// Cleanup is handled by takeUntilDestroyed
	}

	private async determineRole() {
		try {
			const members = await firstValueFrom(this.roomService.getMembersPerRoom(this.roomCode()));
			const current = this.currentUser();
			const found = members?.find(m => m.username === current?.username);
			if(found===undefined){
				this.errorPage();
				return;
			}
			this.userRole.set(found.role as Role);
		} catch (err) {
			console.error('Error determining role:', err);
		}

		console.log(`user role: ${this.userRole()}`)
	}

	deleteRoom() {
		const code = this.roomCode();
		const current = this.currentUser();
		if (!current) {
			this.errorPage();
			return;
		}

		//I use confirm for now cuz i don't wanna do a popup but it can be changed later
		if (!confirm(`Delete room ${code}? This action cannot be undone.`)) return;

		this.determineRole().then(_ =>{
			if(this.userRole()!=Role.Owner){
				alert("You must be owner to delete room") // just in case
				return;
			}

			this.roomService.deleteRoom(code, current.username).subscribe({
				next: res => {
					console.log('Room deleted:', res);
					// navigate back to rooms list or homepage
					this.router.navigate(['/myrooms']);
				},
				error: err => {
					console.error('Error deleting room:', err);
					if (err?.status === 403) {
						alert('You do not have permission to delete this room');
					} else {
						alert('Failed to delete room');
					}
				}
			});
		})
	}

	leaveRoom() {
		const code = this.roomCode();
		const current = this.currentUser();
		if (!current) {
			this.errorPage();
			return;
		}

		if (!confirm(`Leave room ${code}?`)) return;

		this.determineRole().then(_ => {
			if (this.userRole() === Role.Owner) {
				alert("An owner can't leave a room. Please delegate the owner to someone else to leave.")
				return;
			}

			this.roomService.leaveRoom(code, current.username).subscribe({
				next: res => {
					console.log('Left room:', res);
					// navigate away after leaving
					this.router.navigate(['/myrooms']);
				},
				error: err => {
					console.error('Error leaving room:', err);
					if (err?.status === 403) {
						alert('You do not have permission to leave this room');
					} else {
						alert('Failed to leave room');
					}
				}
			});
		});
	}

	errorPage(){
		if (!this.hasRedirected) {
			console.log('Requirements to stay in room management view not fulfilled, redirecting to error');
			this.hasRedirected = true;
			// noinspection JSIgnoredPromiseFromCall
			this.router.navigate(['/error']);
		}
		return;
	}

	protected readonly Role = Role;
}
