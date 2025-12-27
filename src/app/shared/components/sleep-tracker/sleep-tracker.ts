import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface SleepEntry {
  date: string;
  sessions: {
    sleepTime: string;
    wakeTime: string;
    duration: number;
    quality: number;
    notes?: string;
  }[];
}

interface SleepDisplay {
  date: string;
  sleepTime: string;
  wakeTime: string;
  duration: number;
  quality: number;
  notes?: string;
}

interface SleepInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning';
}

@Component({
  selector: 'app-sleep-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sleep-tracker.html',
  styleUrls: ['./sleep-tracker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SleepTrackerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  sleepForm!: FormGroup;
  sleepEntries: SleepEntry[] = [];
  aiInsights: SleepInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  
  todaySleepDuration = 0;
  dailySleepGoal = 8;
  sleepProgress = 0;
  averageSleepDuration = 0;
  averageSleepQuality = 0;
  currentStreak = 0;
  consistencyScore = 0;
  deepSleepHours = 0;
  remSleepHours = 0;

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.sleepForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      sessions: this.fb.array([])
    });
  }

  get sessions(): FormArray {
    return this.sleepForm.get('sessions') as FormArray;
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadSleepData();
    }
  }

  addSleepSession() {
    this.sessions.push(this.fb.group({
      sleepTime: ['22:00', Validators.required],
      wakeTime: ['06:00', Validators.required],
      duration: [8, [Validators.required, Validators.min(1), Validators.max(24)]],
      quality: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      notes: ['']
    }));
    this.calculateDurationFromTimes();
    this.cdr.detectChanges();
  }

  removeSleepSession(index: number) {
    this.sessions.removeAt(index);
    this.cdr.detectChanges();
  }

  calculateDurationFromTimes() {
    const lastIndex = this.sessions.length - 1;
    const session = this.sessions.at(lastIndex);
    
    if (session) {
      const sleepTime = session.get('sleepTime')?.value;
      const wakeTime = session.get('wakeTime')?.value;
      
      if (sleepTime && wakeTime) {
        const sleepDate = new Date(`2000-01-01T${sleepTime}`);
        const wakeDate = new Date(`2000-01-01T${wakeTime}`);
        
        if (wakeDate < sleepDate) {
          wakeDate.setDate(wakeDate.getDate() + 1);
        }
        
        const durationHours = (wakeDate.getTime() - sleepDate.getTime()) / (1000 * 60 * 60);
        session.get('duration')?.setValue(Math.round(durationHours * 10) / 10);
      }
    }
  }

  async loadSleepData() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.sleepEntries = trackers?.sleepTracker || [];
      this.calculateSleepMetrics();
      this.generateAIInsights();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading sleep data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateSleepMetrics() {
    const today = new Date().toISOString().split('T')[0];
    
    this.todaySleepDuration = 0;
    this.averageSleepDuration = 0;
    this.averageSleepQuality = 0;
    this.deepSleepHours = 0;
    this.remSleepHours = 0;
    
    const todayEntry = this.sleepEntries.find(entry => entry.date === today);
    if (todayEntry) {
      this.todaySleepDuration = todayEntry.sessions.reduce((sum, session) => sum + session.duration, 0);
    }
    
    if (this.sleepEntries.length > 0) {
      let totalDuration = 0;
      let totalQuality = 0;
      let totalSessions = 0;
      
      this.sleepEntries.forEach(entry => {
        entry.sessions.forEach(session => {
          totalDuration += session.duration;
          totalQuality += session.quality;
          totalSessions++;
          
          if (session.quality >= 4) {
            this.deepSleepHours += session.duration * 0.25;
            this.remSleepHours += session.duration * 0.20;
          }
        });
      });
      
      this.averageSleepDuration = totalDuration / totalSessions;
      this.averageSleepQuality = totalQuality / totalSessions;
    }
    
    this.sleepProgress = Math.min((this.todaySleepDuration / this.dailySleepGoal) * 100, 100);

    this.calculateSleepStreak();

    this.calculateConsistencyScore();
  }

  private calculateSleepStreak() {
    if (this.sleepEntries.length === 0) {
      this.currentStreak = 0;
      return;
    }

    const uniqueDates = [...new Set(this.sleepEntries.map(entry => entry.date))];
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

  private calculateConsistencyScore() {
    if (this.sleepEntries.length < 3) {
      this.consistencyScore = 0;
      return;
    }

    const recentEntries = this.sleepEntries.slice(-7);
    const durations = recentEntries.flatMap(entry => 
      entry.sessions.map(session => session.duration)
    );
    
    if (durations.length > 1) {
      const mean = durations.reduce((a, b) => a + b) / durations.length;
      const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
      
      this.consistencyScore = Math.max(0, 100 - (variance * 20));
    } else {
      this.consistencyScore = 0;
    }
  }

  private generateAIInsights() {
    this.aiInsights = [];

    if (this.todaySleepDuration >= this.dailySleepGoal) {
      this.aiInsights.push({
        message: `Perfect! ${this.todaySleepDuration} hours of sleep – you're well-rested! 😴`,
        type: 'positive'
      });
    } else if (this.todaySleepDuration >= this.dailySleepGoal * 0.8) {
      this.aiInsights.push({
        message: `Good sleep! ${this.todaySleepDuration}/${this.dailySleepGoal} hours – nearly optimal! 🌙`,
        type: 'positive'
      });
    } else if (this.todaySleepDuration > 0) {
      this.aiInsights.push({
        message: `You slept ${this.todaySleepDuration} hours. Aim for 7-9 hours for optimal health! ⭐`,
        type: 'warning'
      });
    }

    if (this.averageSleepQuality >= 4) {
      this.aiInsights.push({
        message: `Excellent sleep quality! Keep maintaining your bedtime routine! ✨`,
        type: 'positive'
      });
    } else if (this.averageSleepQuality >= 3) {
      this.aiInsights.push({
        message: `Good sleep quality. Consider reducing screen time before bed! 📱`,
        type: 'neutral'
      });
    } else if (this.averageSleepQuality > 0) {
      this.aiInsights.push({
        message: `Your sleep quality needs improvement. Try relaxation techniques before bed! 🧘‍♂️`,
        type: 'warning'
      });
    }

    if (this.consistencyScore >= 80) {
      this.aiInsights.push({
        message: `Amazing consistency! Your regular sleep schedule boosts recovery! 📅`,
        type: 'positive'
      });
    } else if (this.consistencyScore >= 60) {
      this.aiInsights.push({
        message: `Good consistency. Try going to bed at the same time daily! ⏰`,
        type: 'neutral'
      });
    }

    if (this.currentStreak >= 7) {
      this.aiInsights.push({
        message: `Incredible ${this.currentStreak}-day tracking streak! Your dedication is inspiring! 🔥`,
        type: 'positive'
      });
    } else if (this.currentStreak >= 3) {
      this.aiInsights.push({
        message: `Nice ${this.currentStreak}-day streak! Tracking leads to better habits! 📈`,
        type: 'positive'
      });
    }

    if (this.deepSleepHours > 0 && this.remSleepHours > 0) {
      const totalQualitySleep = this.deepSleepHours + this.remSleepHours;
      if (totalQualitySleep >= this.averageSleepDuration * 0.4) {
        this.aiInsights.push({
          message: `Great! You're getting quality restorative & REM sleep! 💤`,
          type: 'positive'
        });
      }
    }

    if (this.aiInsights.length === 0) {
      this.aiInsights.push({
        message: "Track your sleep to optimize recovery, mood, and productivity! 🌙",
        type: 'neutral'
      });
    }
  }

  private updatePagination() {
    const totalItems = this.sleepEntries.length;
    this.totalPages = Math.ceil(totalItems / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getDisplayedEntries(): SleepDisplay[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    const allSessions: SleepDisplay[] = [];
    this.sleepEntries.forEach(entry => {
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

  getQualityStars(quality: number): string {
    return '★'.repeat(quality) + '☆'.repeat(5 - quality);
  }

  getQualityColor(quality: number): string {
    if (quality >= 4) return '#4ade80';
    if (quality >= 3) return '#fbbf24';
    return '#ef4444';
  }

  async onSubmit() {
    if (this.sleepForm.invalid) return;

    this.isLoading = true;
    const newEntry: SleepEntry = this.sleepForm.value;
    
    const existingEntryIndex = this.sleepEntries.findIndex(entry => entry.date === newEntry.date);
    
    let updatedEntries: SleepEntry[];
    
    if (existingEntryIndex > -1) {
      updatedEntries = [...this.sleepEntries];
      updatedEntries[existingEntryIndex].sessions = [
        ...updatedEntries[existingEntryIndex].sessions,
        ...newEntry.sessions
      ];
    } else {
      updatedEntries = [...this.sleepEntries, newEntry];
    }

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'sleepTracker',
        updatedEntries
      );
      
      this.sleepEntries = updatedEntries;
      this.calculateSleepMetrics();
      this.generateAIInsights();
      this.updatePagination();
      this.sleepForm.reset({ date: new Date().toISOString().split('T')[0] });
      this.sessions.clear();
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
    } catch (error) {
      console.error('Error saving sleep data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async resetSleepTracker() {
    try {
      await this.trackerService.resetTracker(this.userId, 'sleepTracker');
      this.sleepEntries = [];
      this.todaySleepDuration = 0;
      this.sleepProgress = 0;
      this.currentPage = 1;
      this.aiInsights = [{
        message: "Fresh start! Ready to track your sleep patterns? 🌙",
        type: 'neutral'
      }];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting sleep tracker:', error);
    }
  }
}
