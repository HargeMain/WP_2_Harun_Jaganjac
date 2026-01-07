import { Routes } from '@angular/router';

import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';

import { MainPageComponent } from './features/dashboard/main/main';
import { TrackersDashboardComponent } from './features/dashboard/trackers-dashboard/trackers-dashboard';
import { StatisticPageComponent } from './features/dashboard/statistic/statistic';

import { VisionBoardPageComponent } from './features/student-fun-zone/vision-board/vision-board';
import { KanbanPageComponent } from './features/student-fun-zone/kanban/kanban';
import { WhiteboardPageComponent } from './features/student-fun-zone/whiteboard/whiteboard';
import { QuizPageComponent } from './features/student-fun-zone/quiz/quiz';
import { BingoPageComponent } from './features/student-fun-zone/bingo/bingo';

import { UserSettingsPageComponent } from './features/admin/user-settings/user-settings';

import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

//* WELL PROTECTED ROUTES DONT DELETE*//

export const routes: Routes = [

  /* PUBLIC */
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  /* LOGGED USERS */
  { path: 'main', component: MainPageComponent, canActivate: [AuthGuard] },
  { path: 'trackers-dashboard', component: TrackersDashboardComponent, canActivate: [AuthGuard] },
  { path: 'statistic', component: StatisticPageComponent, canActivate: [AuthGuard] },
  { path: 'vision-board', component: VisionBoardPageComponent, canActivate: [AuthGuard] },
  { path: 'kanban', component: KanbanPageComponent, canActivate: [AuthGuard] },
  { path: 'whiteboard', component: WhiteboardPageComponent, canActivate: [AuthGuard] },
  { path: 'quiz', component: QuizPageComponent, canActivate: [AuthGuard] },
  { path: 'bingo', component: BingoPageComponent, canActivate: [AuthGuard] },

  /* ADMIN ONLY */
  { 
    path: 'user-settings',
    component: UserSettingsPageComponent,
    canActivate: [AuthGuard, AdminGuard]
  },

  /* FALLBACK */
  { path: '**', redirectTo: 'login' }
];
