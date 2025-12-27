import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';
import { HeaderComponent } from '../../../shared/components/header/header';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { AppUser } from '../../../core/models/user.model';
import { HabitTrackerComponent } from '../../../shared/components/habit-tracker/habit-tracker';
import { MealTrackerComponent } from '../../../shared/components/meal-planner/meal-planner';
import { StudyPlannerComponent } from '../../../shared/components/study-planner/study-planner';
import { YogaFitnessPlannerComponent } from '../../../shared/components/yoga-fitness-planner/yoga-fitness-planner';
import { LazyLoadDirective } from '../../../shared/directives/lazy-load';
import { SleepTrackerComponent } from '../../../shared/components/sleep-tracker/sleep-tracker';
import { TaskProjectPlannerComponent } from '../../../shared/components/task-project-planner/task-project-planner';
import { MoodTrackerComponent } from '../../../shared/components/mood-tracker/mood-tracker';
import { CalendarTrackerComponent } from '../../../shared/components/calendar-tracker/calendar-tracker';

@Component({
  selector: 'app-trackers-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DrawerMenu,
    HeaderComponent,
    FooterComponent,
    HabitTrackerComponent,
    MealTrackerComponent,
    StudyPlannerComponent,
    YogaFitnessPlannerComponent,
    SleepTrackerComponent,
    TaskProjectPlannerComponent,
    MoodTrackerComponent,
    CalendarTrackerComponent,
    LazyLoadDirective
  ],
  templateUrl: './trackers-dashboard.html',
  styleUrls: ['./trackers-dashboard.css']
})
export class TrackersDashboardComponent implements OnInit {
  primaryColor: string = '#1e3a8a';
  secondaryColor: string = '#ffffff';
  role?: 'admin' | 'user';
  isDrawerOpen = false;

  trackers = [
    { 
      id: 'habit', 
      name: 'Habit Tracker', 
      icon: 'psychology',
      component: HabitTrackerComponent,
      visible: true
    },
    { 
      id: 'meal', 
      name: 'Meal Tracker', 
      icon: 'restaurant',
      component: MealTrackerComponent,
      visible: true 
    },
    {
      id: 'mood', 
      name: 'Mood Tracker', 
      icon: 'mood',
      component: MoodTrackerComponent,
      visible: true
    },
    { 
      id: 'study', 
      name: 'Study Planner', 
      icon: 'school',
      component: StudyPlannerComponent,
      visible: true 
    },
    { 
      id: 'sleep', 
      name: 'Sleep Tracker', 
      icon: 'bed',
      component: SleepTrackerComponent,
      visible: true 
    },
    { 
      id: 'yoga', 
      name: 'Yoga & Fitness Planner', 
      icon: 'self_improvement',
      component: YogaFitnessPlannerComponent,
      visible: true 
    },
     { 
      id: 'task', 
      name: 'Task & Project Planner', 
      icon: 'assignment',
      component: TaskProjectPlannerComponent,
      visible: true 
    },
    {
      id: 'calendar',
      name: 'Calendar Tracker',
      icon: 'calendar_today',
      component: CalendarTrackerComponent,
      visible: true
    }
  ];

  currentIndex = 0;
  isAnimating = false;
  nextTrackerName = '';
  prevTrackerName = '';

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user: AppUser = JSON.parse(storedUser);
      this.primaryColor = user.primaryColor || this.primaryColor;
      this.secondaryColor = user.secondaryColor || this.secondaryColor;
      this.role = user.role;
    }
    this.updateNextPrevNames();
  }

  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }

  nextTracker() {
    if (this.currentIndex < this.trackers.length - 1 && !this.isAnimating) {
      this.isAnimating = true;
      this.currentIndex++;
      this.updateNextPrevNames();
      
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  prevTracker() {
    if (this.currentIndex > 0 && !this.isAnimating) {
      this.isAnimating = true;
      this.currentIndex--;
      this.updateNextPrevNames();
      
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  goToTracker(index: number) {
    if (index >= 0 && index < this.trackers.length && !this.isAnimating) {
      this.isAnimating = true;
      this.currentIndex = index;
      this.updateNextPrevNames();
      
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  private updateNextPrevNames() {
    this.nextTrackerName = this.currentIndex < this.trackers.length - 1 
      ? this.trackers[this.currentIndex + 1].name 
      : '';
    
    this.prevTrackerName = this.currentIndex > 0 
      ? this.trackers[this.currentIndex - 1].name 
      : '';
  }

  get isFirst(): boolean {
    return this.currentIndex === 0;
  }

  get isLast(): boolean {
    return this.currentIndex === this.trackers.length - 1;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isAnimating) return;
    
    switch(event.key) {
      case 'ArrowLeft':
        this.prevTracker();
        break;
      case 'ArrowRight':
        this.nextTracker();
        break;
      case 'Home':
        event.preventDefault();
        this.goToTracker(0);
        break;
      case 'End':
        event.preventDefault();
        this.goToTracker(this.trackers.length - 1);
        break;
    }
  }

  touchStartX = 0;
  
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    if (this.isAnimating) return;
    
    const touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.nextTracker();
      } else {
        this.prevTracker();
      }
    }
  }
}