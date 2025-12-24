import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorModalComponent } from '../../../shared/components/app-error-modal/app-error-modal';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AppUser } from '../../../core/models/user.model'; 

function passwordValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const value = control.value;
  if (!value) return null;
  const hasUpper = /[A-Z]/.test(value);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  const hasNumber = /\d/.test(value);
  const valid = hasUpper && hasSpecial && hasNumber && value.length >= 6;
  return valid ? null : { invalidPassword: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ErrorModalComponent,
    RouterOutlet,
    RouterLink
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {

  isDark = false;
  errorMsg = '';
  isLoading = false;
  isUploading = false;
  isDragOver = false;
  isModalOpen = false;
  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private cdr: ChangeDetectorRef, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      userName: ['', Validators.required],
      name: ['', Validators.required],
      surname: ['', Validators.required],
      age: [null, [Validators.required, Validators.min(0)]],
      password: ['', [Validators.required, Validators.minLength(6), passwordValidator]],
      primaryColor: ['#1e3a8a', Validators.required],
      secondaryColor: ['#ffffff', Validators.required],
      imageBase64: ['']
    });
  }

  ngOnInit() {
    const theme = this.getCookie('theme');
    this.isDark = theme === 'dark';
  }

  get email() { return this.form.get('email'); }
  get userName() { return this.form.get('userName'); }
  get name() { return this.form.get('name'); }
  get surname() { return this.form.get('surname'); }
  get age() { return this.form.get('age'); }
  get password() { return this.form.get('password'); }
  get primaryColor() { return this.form.get('primaryColor'); }
  get secondaryColor() { return this.form.get('secondaryColor'); }

  toggleTheme() {
    this.isDark = !this.isDark;
    this.setCookie('theme', this.isDark ? 'dark' : 'light', 365);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      this.handleFile(files[0]);
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      return; 
    }
    this.isUploading = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.form.patchValue({ imageBase64: reader.result as string });
      this.isUploading = false;
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.isUploading = false;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  private getFormErrors(): string[] {
    const errors: string[] = [];
    const controls = this.form.controls;

    if (controls['email'].errors) {
      if (controls['email'].errors['required']) errors.push('Email is required');
      if (controls['email'].errors['email']) errors.push('Invalid email format');
    }

    if (controls['userName'].errors?.['required']) errors.push('Username is required');

    if (controls['name'].errors?.['required']) errors.push('Name is required');

    if (controls['surname'].errors?.['required']) errors.push('Surname is required');

    if (controls['age'].errors) {
      if (controls['age'].errors['required']) errors.push('Age is required');
      if (controls['age'].errors['min']) errors.push('Age must be at least 0');
    }

    if (controls['password'].errors) {
      if (controls['password'].errors['required']) errors.push('Password is required');
      if (controls['password'].errors['minlength']) errors.push('Password must be at least 6 characters');
      if (controls['password'].errors['invalidPassword']) errors.push('Password must contain at least one uppercase letter, one special character, and one number');
    }

    if (controls['primaryColor'].errors?.['required']) errors.push('Primary color is required');

    if (controls['secondaryColor'].errors?.['required']) errors.push('Secondary color is required');

    return errors;
  }

  async register() {
    this.form.markAllAsTouched();
    const errors = this.getFormErrors();
    if (errors.length > 0) {
      this.errorMsg = errors.join('\n');
      this.isModalOpen = true;
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';

    try {
      const user = await this.auth.register(this.form.value as AppUser);
      alert('Registered successfully 🔥');
      this.router.navigate(['/login'], { state: { email: this.form.value.email, password: this.form.value.password } });
    } catch (err: any) {
      this.errorMsg = err.message || 'Registration failed';
      this.isModalOpen = true;
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