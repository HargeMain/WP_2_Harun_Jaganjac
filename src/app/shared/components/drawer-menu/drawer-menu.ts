import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-drawer-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drawer-menu.html',
  styleUrls: ['./drawer-menu.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DrawerMenu {
  @Input() primaryColor?: string = '#1e3a8a';
  @Input() secondaryColor?: string = '#ffffff';
  @Input() role?: 'admin' | 'user' = 'user';

  @Output() drawerStateChange = new EventEmitter<boolean>();

  isOpen = false;
  showSubmenu = false;

  constructor(private router: Router) {}

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    this.drawerStateChange.emit(this.isOpen);
  }

  toggleSubmenu() {
    this.showSubmenu = !this.showSubmenu;
  }

  navigateAndClose(path: string) {
    this.router.navigate([path]);
    this.toggleDrawer();
  }
}