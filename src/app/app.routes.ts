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
export const routes: Routes = [
   { path: '', component: LoginComponent },  
   { path: 'login', component: LoginComponent },
   { path: 'register', component: RegisterComponent },
   { path: 'main', component: MainPageComponent },
   { path: 'trackers-dashboard', component: TrackersDashboardComponent },
   { path: 'statistic', component: StatisticPageComponent },
   { path: 'vision-board', component: VisionBoardPageComponent},
   { path: 'kanban', component: KanbanPageComponent },
   { path: 'whiteboard', component: WhiteboardPageComponent },
   { path: 'quiz', component: QuizPageComponent },
   { path: 'bingo', component: BingoPageComponent }
];
