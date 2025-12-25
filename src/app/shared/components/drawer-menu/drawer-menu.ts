import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-drawer-menu',
  standalone: true,
  imports: [CommonModule],
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

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    this.drawerStateChange.emit(this.isOpen);
  }

  toggleSubmenu() {
    this.showSubmenu = !this.showSubmenu;
  }
}