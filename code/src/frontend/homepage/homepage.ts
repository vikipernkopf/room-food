import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth-service';

@Component({
  selector: 'app-homepage',
	imports: [],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})

export class Homepage {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  protected onGetStarted(): void {
    const target = this.authService.currentUser() ? '/myrooms' : '/signup';
    // noinspection JSIgnoredPromiseFromCall
    this.router.navigate([target]);
  }
}
