import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/auth-service';
import { PublicProfile, UpdateProfilePayload, User } from '../../backend/model';

const DEFAULT_PROFILE_PICTURE =
  'https://i.imgur.com/tdi3NGa_d.webp?maxwidth=760&fidelity=grand';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile {
  protected readonly profile: WritableSignal<PublicProfile | null> = signal(null);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly deleteError = signal('');
  protected readonly passwordText : WritableSignal<string> = signal('New password (optional)');
  protected readonly currentUser: WritableSignal<User | null>;

  protected readonly isOwnProfile = computed(() => {
    const profile = this.profile();
    const currentUser = this.currentUser();
    return !!profile?.username && profile.username === currentUser?.username;
  });

  protected readonly profileImageUrl = computed(() => {
    return this.profile()?.profilePicture || DEFAULT_PROFILE_PICTURE;
  });

  protected readonly editForm = new FormGroup({
    firstName: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    lastName: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    bio: new FormControl('', [Validators.maxLength(400)]),
    profilePicture: new FormControl('', [Validators.maxLength(1000)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    dob: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.minLength(8)])
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {
    this.currentUser = this.authService.currentUser;

    effect(() => {
      const routeUsername = this.route.snapshot.paramMap.get('username');
      const currentUserUsername = this.currentUser()?.username;

      const username = (routeUsername ?? currentUserUsername ?? '').trim();

      if (!username) {
        // If no username in route and not logged in, redirect to login
        if (!this.currentUser()) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/profile' } });
        } else {
          this.loadError.set('No profile selected. Log in to view your profile.');
          this.isLoading.set(false);
        }
        return;
      }

      this.fetchProfile(username);
    });
  }

  protected saveProfile(): void {
    const profile = this.profile();
    const currentUser = this.currentUser();
    if (!profile || !currentUser || !this.isOwnProfile()) {
      this.saveError.set('You can only edit your own profile.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.saveError.set('Please fix the highlighted fields.');
      return;
    }

    const payload: UpdateProfilePayload = {
      actorUsername: currentUser.username,
      email: this.editForm.value.email ?? '',
      firstName: this.editForm.value.firstName ?? '',
      lastName: this.editForm.value.lastName ?? '',
        bio: this.editForm.value.bio ?? '',
      dob: this.editForm.value.dob ?? '',
      profilePicture: (this.editForm.value.profilePicture ?? '').trim() || DEFAULT_PROFILE_PICTURE,
      password: this.editForm.value.password ?? ''
    };

    this.authService.updateProfile(profile.username, payload).subscribe({
      next: (updatedUser) => {
        this.profile.set({
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          bio: updatedUser.bio,
          profilePicture: updatedUser.profilePicture
        });
        this.patchEditFormFromUser(updatedUser);
        this.editForm.controls.password.setValue('');
        this.saveError.set('');
        this.saveSuccess.set('Profile updated successfully.');
      },
      error: (err) => {
        if (err.status === 409 && err.error?.reason === 'email_taken') {
          this.saveError.set('This e-mail address is already in use.');
        } else if (err.status === 403) {
          this.saveError.set('You can only edit your own profile.');
        } else {
          this.saveError.set('Unable to save profile right now.');
        }
        this.saveSuccess.set('');
      }
    });
  }

  private fetchProfile(username: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');

    this.authService.getPublicProfile(username).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.prefillEditForm(profile);
        this.isLoading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.loadError.set('User profile not found.');
        } else {
          this.loadError.set('Unable to load profile.');
        }
        this.profile.set(null);
        this.isLoading.set(false);
      }
    });
  }

  private prefillEditForm(profile: PublicProfile): void {
    const currentUser = this.currentUser();

    this.editForm.patchValue({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      bio: profile.bio ?? '',
      profilePicture: profile.profilePicture ?? DEFAULT_PROFILE_PICTURE,
      email: currentUser?.email ?? '',
      dob: currentUser?.dob ?? '',
      password: ''
    });
  }

  private patchEditFormFromUser(user: User): void {
    this.editForm.patchValue({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      bio: user.bio ?? '',
      profilePicture: user.profilePicture ?? DEFAULT_PROFILE_PICTURE,
      email: user.email ?? '',
      dob: user.dob ?? ''
    });
  }

  protected deleteUserBtn(): void {
	  this.passwordText.set("Confirm delete with password");
	  const currentUser = this.currentUser();
	  if (!currentUser) {
		  this.deleteError.set('You must be logged in to delete your profile.');
		  return;
	  }

	  if (!this.editForm.value.password) {
		  this.deleteError.set('Please enter your password to delete your profile.');
		  return;
	  }

	  if (!confirm('Are you sure you want to permanently delete your profile? This cannot be undone.')) {
		  return;
	  }

	  this.deleteError.set('');
	  this.authService.deleteUser({
		  identifier: currentUser.username,
		  password: this.editForm.value.password
	  }).subscribe({
		  next: () => {
			  // Deletion was successful, logout handled by service
			  this.deleteError.set('');
		  },
		  error: (err) => {
			  if (err.status === 401) {
				  this.deleteError.set('Wrong password. Please try again.');
			  } else {
				  this.deleteError.set('Failed to delete account. Please try again later.');
			  }
		  }
	  });
  }
}

