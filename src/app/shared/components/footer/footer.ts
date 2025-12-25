import { Component, Input, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent implements OnInit, OnDestroy {
  @Input() primaryColor?: string = '#1e3a8a';
  @Input() secondaryColor?: string = '#ffffff';
  @Input() isDrawerOpen: boolean = false;

  currentDateTime = '';
  private timeSubscription?: Subscription;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.updateDateTime();

    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateDateTime();
      this.cdr.markForCheck(); 
    });
  }

  ngOnDestroy() {
    this.timeSubscription?.unsubscribe();
  }

  private updateDateTime() {
    const now = new Date();
    this.currentDateTime = now.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
}
