import {
	Component,
	ChangeDetectionStrategy,
	computed,
	effect,
	inject,
	input,
	output,
	signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingFrontendService, BoughtIngredient } from '../core/shopping-frontend-service';
import { AuthService } from '../core/auth-service';

export interface ShoppingIngredient {
	name: string;
	measurement: string;
	amount: number;
	checked: boolean;
	alreadyBought: boolean;
	boughtBy?: string;
}

export type ShoppingMode = 'room' | 'personal';

@Component({
	selector: 'app-shopping-modal',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './shopping-modal.html',
	styleUrl: './shopping-modal.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShoppingModal {
	readonly roomCode = input<string>('');
	readonly mode = input<ShoppingMode>('room');
	readonly close = output<void>();
	readonly saved = output<void>();

	readonly isOpen = signal(false);
	readonly ingredients = signal<ShoppingIngredient[]>([]);
	readonly loading = signal(false);
	readonly saving = signal(false);
	readonly error = signal('');
	readonly success = signal('');

	private readonly authService = inject(AuthService);
	private readonly shoppingSvc = inject(ShoppingFrontendService);

	readonly allChecked = computed(() => {
		const list = this.ingredients();
		return list.length > 0 && list.every(i => i.checked);
	});

	readonly checkedCount = computed(() => this.ingredients().filter(i => i.checked).length);

	readonly canSave = computed(() => {
		const list = this.ingredients();
		const checked = this.checkedCount();
		const anyBought = list.some(i => i.alreadyBought);
		return checked > 0 || anyBought;
	});

	readonly hasBoughtItems = computed(() => this.ingredients().some(i => i.alreadyBought));

	constructor() {
		effect(() => {
			if (!this.isOpen()) {
				this.error.set('');
				this.success.set('');
			}
		});
	}

	open(ingredients: { name: string; measurement: string; amount: number }[]): void {
		this.error.set('');
		this.success.set('');
		this.isOpen.set(true);
		this.loading.set(true);

		const base: ShoppingIngredient[] = ingredients.map(i => ({
			...i,
			checked: false,
			alreadyBought: false
		}));

		const currentMode = this.mode();
		const currentRoomCode = this.roomCode();
		const currentUser = this.authService.currentUser();
		const username = currentUser?.username ?? '';

		const obs = currentMode === 'room'
			? this.shoppingSvc.getRoomBought(currentRoomCode)
			: this.shoppingSvc.getPersonalBought(username);

		obs.subscribe({
			next: (bought: BoughtIngredient[]) => {
				const boughtMap = new Map(bought.map(b => [b.ingredientName + '||' + b.measurement, b]));
				this.ingredients.set(base.map(i => {
					const key = i.name + '||' + i.measurement;
					const b = boughtMap.get(key);
					return b
						? { ...i, alreadyBought: true, checked: true, boughtBy: b.boughtByUsername }
						: i;
				}));
				this.loading.set(false);
			},
			error: () => {
				this.ingredients.set(base);
				this.loading.set(false);
			}
		});
	}

	closeModal(): void {
		this.isOpen.set(false);
		this.close.emit();
	}

	toggle(idx: number): void {
		this.ingredients.update(list => {
			const copy = [...list];
			copy[idx] = { ...copy[idx], checked: !copy[idx].checked };
			return copy;
		});
	}

	toggleAll(): void {
		const target = !this.allChecked();
		this.ingredients.update(list => list.map(i => ({ ...i, checked: target })));
	}

	save(): void {
		const user = this.authService.currentUser();
		if (!user?.username) {
			this.error.set('Not logged in');
			return;
		}

		const list = this.ingredients();
		const toMark = list.filter(i => i.checked && !i.alreadyBought);
		const toUnmark = list.filter(i => !i.checked && i.alreadyBought);

		if (toMark.length === 0 && toUnmark.length === 0) {
			this.closeModal();
			return;
		}

		this.saving.set(true);
		this.error.set('');

		const currentMode = this.mode();
		const currentRoomCode = this.roomCode();
		const username = user.username;

		const markReqs = toMark.map(i =>
			currentMode === 'room'
				? this.shoppingSvc.markRoomBought(currentRoomCode, i.name, i.measurement, String(i.amount), username)
				: this.shoppingSvc.markPersonalBought(username, i.name, i.measurement, String(i.amount))
		);

		const unmarkReqs = toUnmark.map(i =>
			currentMode === 'room'
				? this.shoppingSvc.unmarkRoomBought(currentRoomCode, i.name, i.measurement)
				: this.shoppingSvc.unmarkPersonalBought(username, i.name, i.measurement)
		);

		const allReqs = [...markReqs, ...unmarkReqs];
		let completed = 0;
		let hasError = false;

		const checkComplete = (): void => {
			if (hasError) return;
			if (completed === allReqs.length) {
				this.saving.set(false);
				this.success.set('Saved!');
				setTimeout(() => {
					this.saved.emit();
					this.closeModal();
				}, 900);
			}
		};

		allReqs.forEach(req => {
			req.subscribe({
				next: () => { completed++; checkComplete(); },
				error: () => {
					if (!hasError) {
						hasError = true;
						this.saving.set(false);
						this.error.set('Something went wrong, please try again.');
					}
				}
			});
		});

		if (allReqs.length === 0) {
			this.saving.set(false);
			this.closeModal();
		}
	}

	clearAll(): void {
		if (!confirm('Clear all bought ingredients?')) return;

		const currentMode = this.mode();
		const currentRoomCode = this.roomCode();
		const currentUser = this.authService.currentUser();
		const username = currentUser?.username ?? '';

		const obs = currentMode === 'room'
			? this.shoppingSvc.clearRoomBought(currentRoomCode)
			: this.shoppingSvc.clearPersonalBought(username);

		obs.subscribe({
			next: () => {
				this.saved.emit();
				this.closeModal();
			},
			error: () => {
				this.error.set('Failed to clear items.');
			}
		});
	}
}
