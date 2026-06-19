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
import { MatCheckbox } from '@angular/material/checkbox';
import { Observable } from 'rxjs';
import { ShoppingFrontendService, BoughtIngredient } from '../core/shopping-frontend-service';
import { AuthService } from '../core/auth-service';

export interface MealAssignment {
	mealId: number;
	ingredientId: number;
	amount: number;
	measurement: string;
}

export interface ShoppingIngredient {
	ingredientId: number;
	name: string;
	measurement: string;
	amount: number;
	checked: boolean;
	alreadyBought: boolean;
	boughtBy?: string;
	assignments: MealAssignment[];
	initialChecked: boolean;
}

export type ShoppingMode = 'room' | 'personal';

@Component({
	selector: 'app-shopping-modal',
	standalone: true,
	imports: [CommonModule, MatCheckbox],
	templateUrl: './shopping.html',
	styleUrl: './shopping.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Shopping {
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

	// For room mode: pass needed ingredients (aggregated from parent)
	// For personal mode: modal fetches all assignments itself
	open(ingredients?: ShoppingIngredient[]): void {
		this.error.set('');
		this.success.set('');
		this.isOpen.set(true);
		this.loading.set(true);

		const currentMode = this.mode();
		const currentRoomCode = this.roomCode();
		const currentUser = this.authService.currentUser();
		const username = currentUser?.username ?? '';

		if (currentMode === 'room' && ingredients) {
			this.loadRoomShopping(ingredients, currentRoomCode);
		} else {
			this.loadPersonalShopping(username);
		}
	}

	private loadRoomShopping(
		baseIngredients: ShoppingIngredient[],
		roomCode: string
	): void {
		// baseIngredients already have assignments from parent
		this.shoppingSvc.getRoomBought(roomCode).subscribe({
			next: (bought: BoughtIngredient[]) => {
				const boughtMap = new Map<number, BoughtIngredient[]>();
				for (const b of bought) {
					if (!boughtMap.has(b.ingredientId)) {
						boughtMap.set(b.ingredientId, []);
					}
					boughtMap.get(b.ingredientId)!.push(b);
				}

				this.ingredients.set(baseIngredients.map(i => {
					const boughtList = boughtMap.get(i.ingredientId) ?? [];
					if (boughtList.length === 0) {
						return i;
					}

					const boughtAmount = boughtList.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0);
					const fullyBought = boughtAmount >= i.amount;

					return {
						...i,
						alreadyBought: fullyBought,
						checked: fullyBought,
						initialChecked: fullyBought,
						boughtBy: boughtList[0]?.boughtByUsername
					};
				}));
				this.loading.set(false);
			},
			error: () => {
				this.ingredients.set(baseIngredients);
				this.loading.set(false);
			}
		});
	}

	private loadPersonalShopping(username: string): void {
		// Fetch all assignments for this user (both bought and not bought)
		this.shoppingSvc.getPersonalAssignments(username).subscribe({
			next: (assignments: Array<{
				ingredientId: number;
				name: string;
				measurement: string;
				amount: number;
				bought: boolean;
				mealId: number;
			}>) => {
				// Aggregate by ingredientId + measurement
				const map = new Map<string, {
					ingredientId: number;
					name: string;
					measurement: string;
					amount: number;
					assignments: Array<{
						mealId: number;
						ingredientId: number;
						amount: number;
						measurement: string
					}>;
					boughtCount: number;
					totalCount: number;
				}>();

				for (const a of assignments) {
					const key = `${a.ingredientId}||${a.measurement}`;

					if (!map.has(key)) {
						map.set(key, {
							ingredientId: a.ingredientId,
							name: a.name,
							measurement: a.measurement,
							amount: 0,
							assignments: [],
							boughtCount: 0,
							totalCount: 0
						});
					}

					const agg = map.get(key)!;
					agg.amount += Number(a.amount);
					agg.assignments.push({
						mealId: a.mealId,
						ingredientId: a.ingredientId,
						amount: Number(a.amount),
						measurement: a.measurement
					});
					agg.totalCount++;
					if (a.bought) {
						agg.boughtCount++;
					}
				}

				const sortedList = Array.from(map.values())
				.map(agg => {
					const isBought = agg.boughtCount > 0;
					return {
						ingredientId: agg.ingredientId,
						name: agg.name,
						measurement: agg.measurement,
						amount: agg.amount,
						checked: isBought,
						initialChecked: isBought,
						alreadyBought: isBought,
						boughtBy: undefined,
						assignments: agg.assignments
					};
				})
				.sort((a, b) => a.name.localeCompare(b.name));

				this.ingredients.set(sortedList);
				this.loading.set(false);
			},
			error: () => {
				this.ingredients.set([]);
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
			copy[idx] = {
				...copy[idx],
				checked: !copy[idx].checked
			};
			return copy;
		});
	}

	toggleAll(): void {
		const target = !this.allChecked();
		this.ingredients.update(list => list.map(i => ({
			...i,
			checked: target
		})));
	}

	save(): void {
		const user = this.authService.currentUser();
		if (!user?.username) {
			this.error.set('Not logged in');
			return;
		}

		const list = this.ingredients();
		// Diff based on initial state change rather than the fragile alreadyBought flag
		const toMark = list.filter(i => i.checked && !i.initialChecked);
		const toUnmark = list.filter(i => !i.checked && i.initialChecked);

		if (toMark.length === 0 && toUnmark.length === 0) {
			this.closeModal();
			return;
		}

		this.saving.set(true);
		this.error.set('');

		const currentMode = this.mode();

		const markRequests = toMark.flatMap(i =>
			i.assignments.map((a: MealAssignment) => ({
				mealId: a.mealId,
				ingredientId: a.ingredientId,
				// Fallback to current user if assignment username isn't present
				username: currentMode === 'personal' ? user.username : (a as any).username || user.username
			}))
		);

		const unmarkRequests = toUnmark.flatMap(i =>
			i.assignments.map((a: MealAssignment) => ({
				mealId: a.mealId,
				ingredientId: a.ingredientId,
				username: currentMode === 'personal' ? user.username : (a as any).username || user.username
			}))
		);

		const allReqs: Observable<unknown>[] = [];

		if (markRequests.length > 0) {
			allReqs.push(this.shoppingSvc.markRoomBoughtBulk(markRequests));
		}

		if (unmarkRequests.length > 0) {
			allReqs.push(this.shoppingSvc.unmarkRoomBoughtBulk(unmarkRequests));
		}

		let completed = 0;
		let hasError = false;

		const checkComplete = (): void => {
			if (hasError) {
				return;
			}
			if (completed === allReqs.length) {
				this.saving.set(false);
				this.success.set('Saved!');
				setTimeout(() => {
					this.saved.emit();
					this.closeModal();
				}, 900);
			}
		};

		if (allReqs.length === 0) {
			this.saving.set(false);
			this.closeModal();
			return;
		}

		allReqs.forEach(req =>
			req.subscribe({
				next: () => {
					completed++;
					checkComplete();
				},
				error: () => {
					if (!hasError) {
						hasError = true;
						this.saving.set(false);
						this.error.set('Something went wrong, please try again.');
					}
				}
			}));
	}

	clearAll(): void {
		if (!confirm('Clear all bought ingredients?')) {
			return;
		}

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
			error: () => this.error.set('Failed to clear items.')
		});
	}
}
