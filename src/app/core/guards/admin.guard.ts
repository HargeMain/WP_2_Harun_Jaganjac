import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AppUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      this.router.navigate(['/login']);
      return false;
    }

    const user: AppUser = JSON.parse(storedUser);

    if (user.role !== 'admin') {
      this.router.navigate(['/main']);
      return false;
    }

    return true;
  }
}
