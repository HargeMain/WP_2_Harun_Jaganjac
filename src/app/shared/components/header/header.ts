import { Component, Input, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {
  @Input() primaryColor?: string = '#1e3a8a';
  @Input() secondaryColor?: string = '#ffffff';
  @Input() role?: 'admin' | 'user' = 'user';
  @Input() isDrawerOpen: boolean = false;

  showMenu = false;
  showModal = false;
  showNotification = false;
  notificationMessage = '';
  isLoading = false;
  isUploading = false;
  user: any = {}; 
  authService:AuthService;
  changeDetailsForm!: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
     this.changeDetailsForm = this.fb.group({
      newPassword: ['', [Validators.minLength(6)]],
      imageBase64: ['']
  });
    this.authService = new AuthService();
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  openChangeDetails() {
    this.showModal = true;
    this.showMenu = false;
  }

  closeModal() {
    this.showModal = false;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.changeDetailsForm.patchValue({ imageBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }

  async submitChanges() {
  if (this.changeDetailsForm.invalid) return;

  if (!this.changeDetailsForm.value.newPassword && !this.changeDetailsForm.value.imageBase64) return;

  const storedUser = localStorage.getItem('user');
  if (!storedUser) return;

  const currentUser = JSON.parse(storedUser);

  this.isLoading = true;

  try {
    const updatedUser = await this.authService.updateUserByEmail(
      currentUser.email,
      {
        password: this.changeDetailsForm.value.newPassword || undefined,
        imageBase64: this.changeDetailsForm.value.imageBase64 || undefined
      }
    );

    const mergedUser = {
      ...currentUser,
      ...updatedUser
    };

    localStorage.setItem('user', JSON.stringify(mergedUser));
    this.user = mergedUser;

    this.changeDetailsForm.reset();
    this.closeModal();

    this.notificationMessage = 'Profile updated successfully';
    this.showNotification = true;
    setTimeout(() => {
      this.showNotification = false;
    }, 2000);

  } catch (err: any) {
    this.notificationMessage = err.message || 'Update failed';
    this.showNotification = true;
    setTimeout(() => {
      this.showNotification = false;
    }, 2000);
  } finally {
    this.isLoading = false;
  }
}


  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}