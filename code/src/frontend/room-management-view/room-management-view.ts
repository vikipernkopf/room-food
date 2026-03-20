import { Component, OnInit, OnDestroy, signal, WritableSignal, effect } from '@angular/core';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {MatDivider} from '@angular/material/divider';
import {MatCard} from '@angular/material/card';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {RoomService} from '../core/room-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-room-management-view',
	standalone: true,
	imports: [
		CommonModule,
		MatDivider,
		MatCard,
		MatInput,
		MatIconButton,
		MatFormField,
		MatIcon,
		MatLabel
	],
  templateUrl: './room-management-view.html',
  styleUrl: './room-management-view.scss',
})
export class RoomManagementView implements OnDestroy {
	protected readonly roomCode: WritableSignal<string> = signal("");
	private hasRedirected = false;
	private lastProcessedCode: string = "";

	constructor(private route: ActivatedRoute,
				private router: Router,
				private roomService: RoomService) {
	  // Subscribe to route param 'code' and unsubscribe on destroy
	  this.route.paramMap
		  .pipe(takeUntilDestroyed())
		  .subscribe((paramMap) => {
			  const code = paramMap.get('code') ?? "";
			  console.log('Route param received, setting roomCode to:', code);
			  this.roomCode.set(code);
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
			next: (response) => {
				console.log('Room validation response:', response);
				if (response.exists) {
					console.log('Room exists, management view loaded');
					this.hasRedirected = false;
				} else {
					console.log('Room does not exist in database, redirecting to error');
					if (!this.hasRedirected) {
						this.hasRedirected = true;
						this.router.navigate(['/error']);
					}
				}
			},
			error: (error) => {
				console.error('Error validating room:', error);
				// If validation fails, redirect to error
				if (!this.hasRedirected) {
					this.hasRedirected = true;
					this.router.navigate(['/error']);
				}
			}
		});
	}

	printcode() {
		console.log(this.roomCode());
	}

	ngOnDestroy() {
		// Cleanup is handled by takeUntilDestroyed
	}
}
