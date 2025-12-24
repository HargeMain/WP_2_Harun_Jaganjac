import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { MainPageComponent } from './features/dashboard/main/main';
export const routes: Routes = [
   { path: '', component: LoginComponent },  
   { path: 'login', component: LoginComponent },
   { path: 'register', component: RegisterComponent },
   { path: 'main', component: MainPageComponent }
];
