import {Component, inject, OnInit, DestroyRef, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RoomService} from '../../core/room-service';
import {AuthService} from '../../core/auth-service';
import {firstValueFrom} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
	selector: 'app-edit-room',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './edit-room.html',
	styleUrls: ['./edit-room.scss']
})
export class EditRoom implements OnInit {
	protected editForm: FormGroup;
	protected roomCode: string = '';
	protected loading = false;
	protected submitError: string = '';
	private roomService = inject(RoomService);
	private authService = inject(AuthService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);
	private hasRedirected = false;
	private lastProcessedCode: string = '';
	public roomCodeInput = input.required<string>({ alias: 'roomCode' });
	public initialName = input<string>('');
	protected close = output<boolean>();

	constructor() {
		this.editForm = new FormGroup({
			roomName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
			pfp: new FormControl('', [Validators.maxLength(1000)])
		});

		this.editForm.patchValue({ roomName: this.initialName() });
	}

	ngOnInit(): void {
		// Subscribe to route param 'code' to react to changes like other components
		this.route.paramMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(paramMap => {
				const code = paramMap.get('code') ?? '';
				console.log('EditRoom route param received, code:', code);
				this.roomCode = code;
				this.handleCodeChange(code);
			});
	}

	private handleCodeChange(code: string) {
		// Avoid re-processing the same code
		if (code === this.lastProcessedCode) {
			return;
		}
		this.lastProcessedCode = code;

		if (!code || code.length === 0) {
			if (!this.hasRedirected) {
				this.hasRedirected = true;
				this.router.navigate(['/error']);
			}
			return;
		}

		// Validate the code exists in backend
		this.roomService.checkRoomExists(code).subscribe({
			next: response => {
				if (response.exists) {
					this.hasRedirected = false;
					// load name and enforce permissions
					this.loadRoomName(code);
					this.ensurePermission(code);
				} else {
					if (!this.hasRedirected) {
						this.hasRedirected = true;
						this.router.navigate(['/error']);
					}
				}
			},
			error: err => {
				console.error('Error validating room in edit:', err);
				if (!this.hasRedirected) {
					this.hasRedirected = true;
					this.router.navigate(['/error']);
				}
			}
		});
	}

	private async loadRoomName(code: string) {
		try {
			const resp = await firstValueFrom(this.roomService.getRoomName(code));
			if (resp?.roomName) {
				this.editForm.patchValue({ roomName: resp.roomName });
			}
		} catch (err) {
			console.error('Failed to load room name', err);
		}
	}

	private async ensurePermission(code: string) {
		const current = this.authService.currentUser();
		if (!current) {
			this.router.navigate(['/error']);
			return;
		}

		try {
			const members = await firstValueFrom(this.roomService.getMembersPerRoom(code));
			const found = members?.find(m => m.username === current.username);
			if (!found) {
				this.router.navigate(['/error']);
				return;
			}
			const role = (found.role || '').toString().toLowerCase();
			if (!(role === 'owner' || role === 'admin')) {
				this.router.navigate(['/error']);
				return;
			}
		} catch (err) {
			console.error('Failed to determine role', err);
			this.router.navigate(['/error']);
		}
	}

	async onSubmit(): Promise<void> {
		this.submitError = '';
		// Basic validation
		if (this.editForm.invalid) {
			this.editForm.markAllAsTouched();
			return;
		}

		// Ensure we have a room code to call the API with.
		// Sometimes route params may not have propagated; fallback to snapshot.
		if (!this.roomCode || this.roomCode.length === 0) {
			const fallback = this.route.snapshot?.paramMap?.get('code') ?? '';
			if (fallback && fallback.length > 0) {
				this.roomCode = fallback;
			}
		}

		if (!this.roomCode || this.roomCode.length === 0) {
			// Prevent sending a request to /api/room/ with missing code
			this.submitError = 'Missing room code; cannot save.';
			console.error('Attempted save without room code');
			this.router.navigate(['/error']);
			return;
		}

		const current = this.authService.currentUser();
		if (!current) {
			this.router.navigate(['/error']);
			return;
		}

		const roomName = this.editForm.value.roomName ?? null;
		const pfp = this.editForm.value.pfp ?? null;
		this.loading = true;
		try {
			const result = await firstValueFrom(this.roomService.editRoom(this.roomCode, current.username, roomName, pfp));
			if (result?.success) {
				this.close.emit(true);
			} else {
				this.submitError = result?.message ?? 'Failed to save changes';
			}
		} catch (err: any) {
			console.error('Error saving room', err);
			if (err?.status === 403) {
				this.submitError = 'You do not have permission to edit this room';
			} else if (err?.status === 404) {
				this.submitError = 'Room not found';
			} else {
				this.submitError = 'Server error while saving';
			}
		} finally {
			this.loading = false;
		}
	}

	onCancel() {
		this.close.emit(false);
	}
}
