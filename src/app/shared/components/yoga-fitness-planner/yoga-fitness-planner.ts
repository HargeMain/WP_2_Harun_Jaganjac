import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface PlannerEntry {
  date: string;
  sessions: {
    activity: string;
    type: 'Yoga' | 'Fitness';
    duration: number;
    completed: boolean;
  }[];
}

interface SessionDisplay {
  date: string;
  activity: string;
  type: 'Yoga' | 'Fitness';
  duration: number;
  completed: boolean;
}

interface WellnessInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning';
}

@Component({
  selector: 'app-yoga-fitness-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './yoga-fitness-planner.html',
  styleUrls: ['./yoga-fitness-planner.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YogaFitnessPlannerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  plannerForm!: FormGroup;
  plannerEntries: PlannerEntry[] = [];
  aiInsights: WellnessInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  
  todayYogaTime = 0;
  todayFitnessTime = 0;
  dailyWorkoutGoal = 60;
  workoutProgress = 0;
  totalYogaTime = 0;
  totalFitnessTime = 0;
  currentStreak = 0;
  completionRate = 0;

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.plannerForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      sessions: this.fb.array([])
    });
  }

  get sessions(): FormArray {
    return this.plannerForm.get('sessions') as FormArray;
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadPlanner();
    }
  }

  addSession() {
    this.sessions.push(this.fb.group({
      activity: ['', Validators.required],
      type: ['Yoga', Validators.required],
      duration: [0, [Validators.required, Validators.min(1)]],
      completed: [false]
    }));
    this.cdr.detectChanges();
  }

  removeSession(index: number) {
    this.sessions.removeAt(index);
    this.cdr.detectChanges();
  }

  async loadPlanner() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.plannerEntries = trackers?.yogaFitnessPlanner || [];
      this.calculateMetrics();
      this.generateAIInsights();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading planner:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateMetrics() {
    const today = new Date().toISOString().split('T')[0];
    
    this.todayYogaTime = 0;
    this.todayFitnessTime = 0;
    this.totalYogaTime = 0;
    this.totalFitnessTime = 0;
    
    this.plannerEntries.forEach(entry => {
      const isToday = entry.date === today;
      entry.sessions.forEach(session => {
        if (session.type === 'Yoga') {
          if (isToday) this.todayYogaTime += session.duration;
          this.totalYogaTime += session.duration;
        } else {
          if (isToday) this.todayFitnessTime += session.duration;
          this.totalFitnessTime += session.duration;
        }
      });
    });
    
    const todayTotalTime = this.todayYogaTime + this.todayFitnessTime;
    this.workoutProgress = Math.min((todayTotalTime / this.dailyWorkoutGoal) * 100, 100);
    this.calculateStreak();
    const totalActivities = this.plannerEntries.reduce((total, entry) => total + entry.sessions.length, 0);
    const completedActivities = this.plannerEntries.reduce((total, entry) => 
      total + entry.sessions.filter(session => session.completed).length, 0);
    this.completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
  }

  private calculateStreak() {
    if (this.plannerEntries.length === 0) {
      this.currentStreak = 0;
      return;
    }

    const uniqueDates = [...new Set(this.plannerEntries.map(entry => entry.date))];
    const sortedDates = uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const entryDate = new Date(sortedDates[i]);
      const daysDifference = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    this.currentStreak = streak;
  }

  private generateAIInsights() {
    this.aiInsights = [];
    const todayTotal = this.todayYogaTime + this.todayFitnessTime;

    if (todayTotal >= this.dailyWorkoutGoal) {
      this.aiInsights.push({
        message: `Amazing! ${todayTotal} minutes of activity today – you've crushed your goal! 🏆`,
        type: 'positive'
      });
    } else if (todayTotal >= this.dailyWorkoutGoal * 0.7) {
      this.aiInsights.push({
        message: `Great work! ${todayTotal}/${this.dailyWorkoutGoal} minutes – keep going! 💪`,
        type: 'positive'
      });
    } else if (todayTotal > 0) {
      this.aiInsights.push({
        message: `Good start with ${todayTotal} minutes today. Every movement counts! 🚶‍♂️`,
        type: 'neutral'
      });
    }

    const yogaPercentage = this.todayYogaTime > 0 ? (this.todayYogaTime / todayTotal) * 100 : 0;
    const fitnessPercentage = this.todayFitnessTime > 0 ? (this.todayFitnessTime / todayTotal) * 100 : 0;
    
    if (todayTotal > 0) {
      if (Math.abs(yogaPercentage - fitnessPercentage) < 20) {
        this.aiInsights.push({
          message: `Perfect balance! ${Math.round(yogaPercentage)}% yoga, ${Math.round(fitnessPercentage)}% fitness. 🧘‍♀️🏋️‍♂️`,
          type: 'positive'
        });
      } else if (yogaPercentage > 70) {
        this.aiInsights.push({
          message: `Great focus on yoga today! Consider adding some strength training for balance. 🧘‍♀️`,
          type: 'neutral'
        });
      } else if (fitnessPercentage > 70) {
        this.aiInsights.push({
          message: `Strong fitness focus! A bit of yoga could help with recovery and flexibility. 🏋️‍♂️`,
          type: 'neutral'
        });
      }
    }

    if (this.currentStreak >= 7) {
      this.aiInsights.push({
        message: `Incredible ${this.currentStreak}-day streak! Your consistency is inspiring! 🔥`,
        type: 'positive'
      });
    } else if (this.currentStreak >= 3) {
      this.aiInsights.push({
        message: `Nice ${this.currentStreak}-day streak! Building powerful wellness habits! 📈`,
        type: 'positive'
      });
    }

    if (this.completionRate >= 90) {
      this.aiInsights.push({
        message: `Excellent discipline! ${Math.round(this.completionRate)}% of activities completed! ✅`,
        type: 'positive'
      });
    }

    if (this.aiInsights.length === 0) {
      this.aiInsights.push({
        message: "Start your wellness journey! Track your yoga and fitness activities to see insights! 🌱",
        type: 'neutral'
      });
    }
  }

  private updatePagination() {
    const totalItems = this.plannerEntries.length;
    this.totalPages = Math.ceil(totalItems / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getDisplayedEntries(): SessionDisplay[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    const allSessions: SessionDisplay[] = [];
    this.plannerEntries.forEach(entry => {
      entry.sessions.forEach(session => {
        allSessions.push({
          date: entry.date,
          ...session
        });
      });
    });
    
    return allSessions.slice(startIndex, endIndex);
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    
    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.cdr.detectChanges();
  }

  async onSubmit() {
    if (this.plannerForm.invalid) return;

    this.isLoading = true;
    const newEntry: PlannerEntry = this.plannerForm.value;
    
    const existingEntryIndex = this.plannerEntries.findIndex(entry => entry.date === newEntry.date);
    
    let updatedEntries: PlannerEntry[];
    
    if (existingEntryIndex > -1) {
      updatedEntries = [...this.plannerEntries];
      updatedEntries[existingEntryIndex].sessions = [
        ...updatedEntries[existingEntryIndex].sessions,
        ...newEntry.sessions
      ];
    } else {
      updatedEntries = [...this.plannerEntries, newEntry];
    }

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'yogaFitnessPlanner',
        updatedEntries
      );
      
      this.plannerEntries = updatedEntries;
      this.calculateMetrics();
      this.generateAIInsights();
      this.updatePagination();
      this.plannerForm.reset({ date: new Date().toISOString().split('T')[0] });
      this.sessions.clear();
      
      this.showSaveNotification = true;
    } catch (error) {
      console.error('Error saving planner:', error);
    } finally {
      this.isLoading = false;
      this.showSaveNotification = false;
      this.cdr.detectChanges();
    }
  }

  getTotalMinutes(sessions: any[]): number {
    return sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  }

  async resetPlanner() {
    try {
      await this.trackerService.resetTracker(this.userId, 'yogaFitnessPlanner');
      this.plannerEntries = [];
      this.todayYogaTime = 0;
      this.todayFitnessTime = 0;
      this.workoutProgress = 0;
      this.currentPage = 1;
      this.aiInsights = [{
        message: "Fresh start! Ready to track your wellness journey? 🧘‍♀️",
        type: 'neutral'
      }];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting planner:', error);
    }
  }
}
