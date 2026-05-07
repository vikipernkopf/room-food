import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="dialog-backdrop">
        <div class="dialog-container">
          <h2>{{ title }}</h2>
          <p>{{ message }}</p>
          <div class="dialog-actions">
            <button class="button-secondary" (click)="onCancel()">
              {{ cancelText }}
            </button>
            <button class="button-danger" (click)="onConfirm()">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './confirmation-dialog.scss'
})
export class ConfirmationDialog {
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() cancelText = 'Cancel';
  @Input() confirmText = 'Confirm';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onConfirm(): void {
    this.confirmed.emit();
    this.close();
  }

  onCancel(): void {
    this.cancelled.emit();
    this.close();
  }
}

