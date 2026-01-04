import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { MainPageComponent } from './features/dashboard/main/main';
import { TrackersDashboardComponent } from './features/dashboard/trackers-dashboard/trackers-dashboard';
import { StatisticPageComponent } from './features/dashboard/statistic/statistic';
export const routes: Routes = [
   { path: '', component: LoginComponent },  
   { path: 'login', component: LoginComponent },
   { path: 'register', component: RegisterComponent },
   { path: 'main', component: MainPageComponent },
   { path: 'trackers-dashboard', component: TrackersDashboardComponent },
   { path: 'statistic', component: StatisticPageComponent }
];
