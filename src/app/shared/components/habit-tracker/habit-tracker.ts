import { Component, Input, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface HabitEntry {
  date: string;
  habits: { name: string; completed: boolean }[];
}

interface HabitStreak {
  name: string;
  currentStreak: number;
  longestStreak: number;
}

@Component({
  selector: 'app-habit-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './habit-tracker.html',
  styleUrls: ['./habit-tracker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitTrackerComponent implements OnInit {
  @Input() primaryColor: string = '#1e3a8a'; 
  @Input() secondaryColor: string = '#ffffff'; 

  habitForm!: FormGroup;
  habitEntries: HabitEntry[] = [];
  habitStreaks: HabitStreak[] = [];
  aiInsights: string[] = [];
  isLoading = false;
  userId: string = '';
  showSaveNotification = false;
  todayProgress: number = 0; 

  constructor(
    private fb: FormBuilder,
    private trackersService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.habitForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      habits: this.fb.array([])
    });
  }

  get habits(): FormArray {
    return this.habitForm.get('habits') as FormArray;
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadHabits();
    }
  }

  async loadHabits() {
    this.isLoading = true;
    try {
      const trackers = await this.trackersService.getTrackers(this.userId);
      this.habitEntries = trackers?.habitTracker || [];
      this.calculateStreaks();
      this.generateAIInsights();
      this.calculateTodayProgress(); 
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  addHabit() {
    this.habits.push(this.fb.group({
      name: ['', Validators.required],
      completed: [false]
    }));
    this.cdr.detectChanges();
  }

  removeHabit(index: number) {
    this.habits.removeAt(index);
    this.cdr.detectChanges();
  }

  private calculateStreaks() {
    const habitMap: { [name: string]: { dates: Date[] } } = {};

    this.habitEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      entry.habits.forEach(habit => {
        if (habit.completed) {
          if (!habitMap[habit.name]) habitMap[habit.name] = { dates: [] };
          habitMap[habit.name].dates.push(entryDate);
        }
      });
    });

    this.habitStreaks = Object.keys(habitMap).map(name => {
      const sortedDates = habitMap[name].dates.sort((a, b) => a.getTime() - b.getTime());
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;
      let prevDate: Date | null = null;

      sortedDates.forEach(date => {
        if (prevDate && this.isConsecutive(prevDate, date)) tempStreak++;
        else tempStreak = 1;
        longestStreak = Math.max(longestStreak, tempStreak);
        prevDate = date;
      });

      if (sortedDates.length > 0) {
        const lastDate = sortedDates[sortedDates.length - 1];
        if (this.isTodayOrYesterday(lastDate)) currentStreak = tempStreak;
      }

      return { name, currentStreak, longestStreak };
    });
  }

  private isConsecutive(date1: Date, date2: Date): boolean {
    return (date2.getTime() - date1.getTime()) === 86400000;
  }

  private isTodayOrYesterday(date: Date): boolean {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return date.toDateString() === today.toDateString() || date.toDateString() === yesterday.toDateString();
  }

  private calculateTodayProgress() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = this.habitEntries.find(entry => entry.date === today);
    
    if (todayEntry && todayEntry.habits.length > 0) {
      const completedCount = todayEntry.habits.filter(habit => habit.completed).length;
      const totalCount = todayEntry.habits.length;
      this.todayProgress = Math.round((completedCount / totalCount) * 100);
    } else {
      this.todayProgress = 0;
    }
  }

  private generateAIInsights() {
    this.aiInsights = [];
    const today = new Date().toISOString().split('T')[0];
    const todayHabits = this.habitEntries.find(e => e.date === today)?.habits || [];
    const completedToday = todayHabits.filter(h => h.completed).length;
    const totalToday = todayHabits.length;

    if (completedToday === totalToday && totalToday > 0) {
      this.aiInsights.push("Perfect day! 100% habits completed – you're unstoppable today! 🔥");
    } else if (completedToday >= totalToday * 0.7) {
      this.aiInsights.push(`Strong performance! ${completedToday}/${totalToday} habits done – almost there! 💪`);
    } else if (completedToday > totalToday * 0.3) {
      this.aiInsights.push("Good start! Keep the momentum – small wins build big habits.");
    }

    this.habitStreaks.forEach(streak => {
      if (streak.currentStreak >= 10) {
        this.aiInsights.push(`Legendary! ${streak.name} at ${streak.currentStreak} days streak – pure discipline! 🏆`);
      } else if (streak.currentStreak >= 5) {
        this.aiInsights.push(`You're crushing it! ${streak.name} at ${streak.currentStreak} days – stay consistent!`);
      }
    });

    if (this.aiInsights.length === 0) {
      this.aiInsights.push("Every journey starts with one step. Add a habit today! 🌱");
    }
  }

  async onSubmit() {
    if (this.habitForm.invalid) return;

    const newEntry: HabitEntry = {
      date: this.habitForm.value.date,
      habits: this.habitForm.value.habits
    };

    const updatedEntries = [...this.habitEntries, newEntry];

    try {
      await this.trackersService.updateTracker(this.userId, 'habitTracker', updatedEntries);
      this.habitEntries = updatedEntries;
      this.calculateStreaks();
      this.generateAIInsights();
      this.calculateTodayProgress(); 
      this.habitForm.reset({ date: new Date().toISOString().split('T')[0] });
      this.habits.clear();

      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving habits:', error);
    }
  }

  async toggleCompleted(entryIndex: number, habitIndex: number) {
    this.habitEntries[entryIndex].habits[habitIndex].completed = !this.habitEntries[entryIndex].habits[habitIndex].completed;
    try {
      await this.trackersService.updateTracker(this.userId, 'habitTracker', this.habitEntries);
      this.calculateStreaks();
      this.generateAIInsights();
      this.calculateTodayProgress(); 
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  }

  async resetHabits() {
    try {
      await this.trackersService.resetTracker(this.userId, 'habitTracker');
      this.habitEntries = [];
      this.habitStreaks = [];
      this.todayProgress = 0; 
      this.aiInsights = ["Fresh start! Build new streaks today! 🌟"];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting habits:', error);
    }
  }
}