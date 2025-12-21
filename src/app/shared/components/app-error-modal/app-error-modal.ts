import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-error-modal.html',
  styleUrls: ['./app-error-modal.css']
})
export class ErrorModalComponent {
  @Input() errorTitle: string = 'Error';
  @Input() errorMessage: string = '';
  @Input() isOpen: boolean = false;
  @Input() isDark: boolean = false;
  @Output() close = new EventEmitter<void>();
}