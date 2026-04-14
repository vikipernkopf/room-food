import {
	AfterViewInit,
	Component,
	ElementRef,
	Inject,
	OnDestroy,
	PLATFORM_ID,
	ViewChild,
	computed,
	effect,
	signal,
} from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth-service';

@Component({
	selector: 'app-navbar',
	imports: [
		NgOptimizedImage,
		RouterLink,
		RouterLinkActive
	],
	templateUrl: './navbar.html',
	styleUrl: './navbar.scss',
})
export class Navbar implements AfterViewInit, OnDestroy {
	// Collapse slightly early to avoid edge-case visual crowding from sub-pixel/font differences.
	private static readonly COLLAPSE_GUARD_PX = 10;

	@ViewChild('navbarShell')
	private navbarShell?: ElementRef<HTMLElement>;
	@ViewChild('navbarMeasure')
	private navbarMeasure?: ElementRef<HTMLElement>;

	protected readonly profileLink;
	protected readonly profileQueryParams;
	protected readonly myRoomsLink;
	protected readonly myRoomsQueryParams;
	protected readonly myRecipesLink;
	protected readonly myRecipesQueryParams;
	protected readonly isLoggedIn;
	protected readonly isCollapsed = signal(false);
	protected readonly isMenuOpen = signal(false);

	private readonly handleWindowResize = () => this.queueLayoutRecalculation();
	private readonly isBrowser: boolean;
	private resizeObserver: ResizeObserver | null = null;
	private layoutFrame: number | null = null;

	constructor(
		private readonly authService: AuthService,
		@Inject(PLATFORM_ID) platformId: object
	) {
		this.isBrowser = isPlatformBrowser(platformId);

		this.profileLink = computed(() => {
			const username = this.authService.currentUser()?.username;
			return username ? ['/profile', username] : ['/login'];
		});

		this.profileQueryParams = computed(() => {
			const username = this.authService.currentUser()?.username;
			return username ? null : { returnUrl: '/profile' };
		});

		this.myRoomsLink = computed(() => {
			const user = this.authService.currentUser();
			return user ? ['/myrooms'] : ['/login'];
		});

		this.myRoomsQueryParams = computed(() => {
			const user = this.authService.currentUser();
			return user ? null : { returnUrl: '/myrooms' };
		});

		this.myRecipesLink = computed(() => {
			const user = this.authService.currentUser();
			return user ? ['/recipes'] : ['/login'];
		});

		this.myRecipesQueryParams = computed(() => {
			const user = this.authService.currentUser();
			return user ? null : { returnUrl: '/recipes' };
		});

		this.isLoggedIn = computed(() => this.authService.currentUser() !== null);

		effect(() => {
			this.authService.currentUser();
			this.queueLayoutRecalculation();
		});
	}

	ngAfterViewInit(): void {
		if (!this.isBrowser) {
			return;
		}

		window.addEventListener('resize', this.handleWindowResize);
		if (typeof ResizeObserver !== 'undefined' && this.navbarShell) {
			this.resizeObserver = new ResizeObserver(() => this.queueLayoutRecalculation());
			this.resizeObserver.observe(this.navbarShell.nativeElement);
		}
		this.queueLayoutRecalculation();
	}

	ngOnDestroy(): void {
		if (!this.isBrowser) {
			return;
		}

		window.removeEventListener('resize', this.handleWindowResize);
		this.resizeObserver?.disconnect();
		if (this.layoutFrame !== null) {
			cancelAnimationFrame(this.layoutFrame);
		}
	}

	logout(): void {
		this.isMenuOpen.set(false);
		this.authService.logout();
	}

	protected toggleMenu(): void {
		if (!this.isCollapsed()) {
			return;
		}

		this.isMenuOpen.update(value => !value);
	}

	protected handleMenuItemClick(): void {
		if (this.isCollapsed()) {
			this.isMenuOpen.set(false);
		}
	}

	private queueLayoutRecalculation(): void {
		if (!this.isBrowser) {
			return;
		}

		if (this.layoutFrame !== null) {
			return;
		}

		this.layoutFrame = window.requestAnimationFrame(() => {
			this.layoutFrame = null;
			this.recalculateLayout();
		});
	}

	private recalculateLayout(): void {
		const shell = this.navbarShell?.nativeElement;
		const measure = this.navbarMeasure?.nativeElement;

		if (!shell || !measure) {
			return;
		}

		const availableWidth = Math.floor(shell.clientWidth);
		const requiredWidth = Math.ceil(measure.getBoundingClientRect().width);

		if (availableWidth <= 0 || requiredWidth <= 0) {
			return;
		}

		const shouldCollapse = requiredWidth + Navbar.COLLAPSE_GUARD_PX > availableWidth;
		this.isCollapsed.set(shouldCollapse);

		if (!shouldCollapse) {
			this.isMenuOpen.set(false);
		}
	}

}
