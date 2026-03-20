import { Component, OnInit, OnDestroy } from '@angular/core';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {MatDivider} from '@angular/material/divider';
import {MatCard} from '@angular/material/card';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-room-management-view',
	imports: [
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
export class RoomManagementView {
	roomCode?: string | null;

	constructor(private route: ActivatedRoute,
				private router: Router) {
	  this.route.paramMap.subscribe((paramMap) => {
		  this.roomCode = (paramMap.get('code'));
		  if(this.checkRoomExists(this.roomCode)){
			  this.redirectToError();
		  }
	  });
	}

	printcode() {
		console.log(this.roomCode);
	}

	private checkRoomExists(roomCode: string | null | undefined): boolean {
		return roomCode!=null && roomCode !=undefined && roomCode.length>0;
	}

	private redirectToError():string {
		this.router.navigate(['/error']);
		return "redirection failed in room-management-view.ts";
	}
}
