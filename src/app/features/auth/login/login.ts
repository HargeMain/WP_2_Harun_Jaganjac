import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorModalComponent } from '../../../shared/components/app-error-modal/app-error-modal';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorModalComponent
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  isDark = false;
  errorMsg = '';
  isLoading = false;
  isModalOpen = false;
  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    const theme = this.getCookie('theme');
    this.isDark = theme === 'dark';
  }

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  toggleTheme() {
    this.isDark = !this.isDark;
    this.setCookie('theme', this.isDark ? 'dark' : 'light', 365);
  }

  async login() {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMsg = '';

    const { email, password } = this.form.value;

    try {
      const user = await this.auth.login(email!, password!);

      if (user) {
        alert('Logged in 🔥');
        console.log('Logged user:', user);
      }

    } catch (err: any) {
      this.errorMsg = err?.message || 'Login failed';
      this.isModalOpen = true;
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.errorMsg = '';
    this.cdr.detectChanges();
  }

  private setCookie(name: string, value: string, days: number) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
}