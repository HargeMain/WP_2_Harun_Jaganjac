import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerMenu } from'../../../shared/components/drawer-menu/drawer-menu';
import { AppUser } from '../../../core/models/user.model'; 

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule, DrawerMenu],
  templateUrl: './main.html',
  styleUrls: ['./main.css']
})
export class MainPageComponent implements OnInit {
  primaryColor?: string;
  secondaryColor?: string;
  role?: 'admin' | 'user';

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user: AppUser = JSON.parse(storedUser);
      this.primaryColor = user.primaryColor;
      this.secondaryColor = user.secondaryColor;
      this.role = user.role;
    }
  }
}