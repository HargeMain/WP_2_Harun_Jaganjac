import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';
import { HeaderComponent } from '../../../shared/components/header/header';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { AppUser } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import { TrackersService } from '../../../core/services/trackers.service';

@Component({
  selector: 'app-user-settings-page',
  standalone: true,
  imports: [CommonModule, DrawerMenu, HeaderComponent, FooterComponent],
  templateUrl: './user-settings.html',
  styleUrls: ['./user-settings.css']
})
export class UserSettingsPageComponent implements OnInit {

  primaryColor?: string;
  secondaryColor?: string;
  role?: 'admin' | 'user';
  username?: string;
  userId?: string;
  isDrawerOpen = false;

  allUsers: AppUser[] = [];
  hoveredRow: string | null = null;

  deletingUserId: string | null = null;

  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    userId: ''
  };

  constructor(
    private userService: UserService,
    private trackersService: TrackersService
  ) {}

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;

    const user: AppUser = JSON.parse(storedUser);
    this.primaryColor = user.primaryColor;
    this.secondaryColor = user.secondaryColor;
    this.role = user.role;
    this.userId = user.uid;
    this.username = user.name;

    if (this.role === 'admin') {
      this.loadAllUsers();
    }
  }

  async loadAllUsers() {
    const users = await this.userService.getAllUsers();
    this.allUsers = users.filter(u => u.uid !== this.userId);
  }

  onRightClick(event: MouseEvent, user: AppUser) {
    event.preventDefault();
    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      userId: user.uid!
    };
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenu.visible = false;
  }

  async deleteUser(userId: string) {
    if (userId === this.userId) return;

    this.deletingUserId = userId;

    try {
      await this.trackersService.deleteTrackers(userId);
      await this.userService.deleteUser(userId);

      setTimeout(() => {
        this.allUsers = this.allUsers.filter(u => u.uid !== userId);
        this.deletingUserId = null;
      }, 600);

    } catch {
      this.deletingUserId = null;
      alert('Delete failed');
    }

    this.contextMenu.visible = false;
  }

  formatDate(timestamp?: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString();
  }

  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }
}
