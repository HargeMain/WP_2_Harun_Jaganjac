import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface WaterIntake {
  id: string;
  date: string;
  time: string;
  amount: number;
  unit: 'ml' | 'oz' | 'cups';
  type: 'water' | 'tea' | 'coffee' | 'juice' | 'soda' | 'smoothie';
  temperature: 'cold' | 'room' | 'warm';
  notes: string;
  timestamp: string;
}

interface DailySummary {
  date: string;
  totalAmount: number;
  goalAmount: number;
  progress: number;
  entries: WaterIntake[];
  status: 'below-goal' | 'at-goal' | 'exceeded-goal';
}

interface WaterInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning' | 'critical';
}

@Component({
  selector: 'app-water-intake',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './water-intake.html',
  styleUrls: ['./water-intake.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaterIntakeTrackerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  intakeForm!: FormGroup;
  goalForm!: FormGroup;
  
  dailyIntakes: WaterIntake[] = [];
  weeklyHistory: DailySummary[] = [];
  waterInsights: WaterInsight[] = [];
  
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  
  today = new Date().toISOString().split('T')[0];
  todayTotal = 0;
  dailyGoal = 2000;
  goalProgress = 0;
  streakDays = 0;
  weeklyAverage = 0;
  hydrationScore = 0;
  
  waterTypes = [
    { value: 'water', label: '💧 Pure Water' },
    { value: 'tea', label: '🍵 Tea' },
    { value: 'coffee', label: '☕ Coffee' },
    { value: 'juice', label: '🧃 Juice' },
    { value: 'soda', label: '🥤 Soda' },
    { value: 'smoothie', label: '🥤 Smoothie' }
  ];
  
  temperatureTypes = [
    { value: 'cold', label: '❄️ Cold' },
    { value: 'room', label: '🌡️ Room Temperature' },
    { value: 'warm', label: '🔥 Warm' }
  ];
  
  unitTypes = [
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'cups', label: 'Cups (250ml)' }
  ];
  
  filterDate: string = this.today;
  filterType: 'all' | 'water' | 'tea' | 'coffee' | 'juice' | 'soda' | 'smoothie' = 'all';

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  private initializeForms() {
    const now = new Date();
    const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');

    this.intakeForm = this.fb.group({
      date: [this.today, Validators.required],
      time: [currentTime, Validators.required],
      amount: [250, [Validators.required, Validators.min(1), Validators.max(5000)]],
      unit: ['ml', Validators.required],
      type: ['water', Validators.required],
      temperature: ['room', Validators.required],
      notes: ['']
    });

    this.goalForm = this.fb.group({
      dailyGoal: [2000, [Validators.required, Validators.min(500), Validators.max(10000)]],
      unit: ['ml', Validators.required],
      reminderFrequency: [120, [Validators.min(30), Validators.max(360)]]
    });
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadWaterData();
    }
  }

  async loadWaterData() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      const waterData = trackers?.waterIntake || { 
        dailyIntakes: [], 
        weeklyHistory: [], 
        settings: { dailyGoal: 2000, unit: 'ml', reminderFrequency: 120 } 
      };
      
      this.dailyIntakes = (typeof waterData === 'object' && !Array.isArray(waterData) && waterData.dailyIntakes) ? waterData.dailyIntakes : [];
      this.weeklyHistory = (typeof waterData === 'object' && !Array.isArray(waterData) && waterData.weeklyHistory) ? waterData.weeklyHistory : [];
      
      if (typeof waterData === 'object' && !Array.isArray(waterData) && waterData.settings) {
        this.dailyGoal = waterData.settings.dailyGoal;
        this.goalForm.patchValue(waterData.settings);
      }
      
      this.calculateTodayMetrics();
      this.generateWeeklyHistory();
      this.generateWaterInsights();
      this.filterIntakes();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading water data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateTodayMetrics() {
    const todayIntakes = this.dailyIntakes.filter(entry => entry.date === this.today);
    this.todayTotal = todayIntakes.reduce((sum, entry) => sum + this.convertToMl(entry.amount, entry.unit), 0);
    this.goalProgress = this.dailyGoal > 0 ? (this.todayTotal / this.dailyGoal) * 100 : 0;
    
    this.calculateStreak();
    this.calculateWeeklyAverage();
    this.calculateHydrationScore();
  }

  convertToMl(amount: number, unit: string): number {
    switch(unit) {
      case 'ml': return amount;
      case 'oz': return amount * 29.5735;
      case 'cups': return amount * 250;
      default: return amount;
    }
  }

  private convertFromMl(amount: number, targetUnit: string): number {
    switch(targetUnit) {
      case 'ml': return amount;
      case 'oz': return amount / 29.5735;
      case 'cups': return amount / 250;
      default: return amount;
    }
  }

  private calculateStreak() {
    let streak = 0;
    const today = new Date(this.today);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayIntakes = this.dailyIntakes.filter(entry => entry.date === dateStr);
      const dayTotal = dayIntakes.reduce((sum, entry) => sum + this.convertToMl(entry.amount, entry.unit), 0);
      
      if (dayTotal >= this.dailyGoal) {
        streak++;
      } else if (i === 0) {
        if (dayTotal > 0) streak++;
        break;
      } else {
        break;
      }
    }
    
    this.streakDays = streak;
  }

  private calculateWeeklyAverage() {
    const last7Days = this.getLastNDays(7);
    let total = 0;
    let daysWithData = 0;
    
    last7Days.forEach(date => {
      const dayIntakes = this.dailyIntakes.filter(entry => entry.date === date);
      const dayTotal = dayIntakes.reduce((sum, entry) => sum + this.convertToMl(entry.amount, entry.unit), 0);
      
      if (dayIntakes.length > 0) {
        total += dayTotal;
        daysWithData++;
      }
    });
    
    this.weeklyAverage = daysWithData > 0 ? total / daysWithData : 0;
  }

  private calculateHydrationScore() {
    const todayScore = Math.min(this.goalProgress / 100, 1);
    const streakScore = Math.min(this.streakDays / 7, 1) * 0.3;
    const consistencyScore = (this.weeklyAverage / this.dailyGoal) * 0.4;
    const diversityScore = this.calculateDiversityScore() * 0.3;
    
    this.hydrationScore = Math.round((todayScore * 0.4 + streakScore * 0.3 + consistencyScore * 0.2 + diversityScore * 0.1) * 100);
  }

  private calculateDiversityScore(): number {
    const todayIntakes = this.dailyIntakes.filter(entry => entry.date === this.today);
    const types = new Set(todayIntakes.map(entry => entry.type));
    return Math.min(types.size / 3, 1);
  }

  private generateWeeklyHistory() {
    this.weeklyHistory = [];
    const last7Days = this.getLastNDays(7);
    
    last7Days.forEach(date => {
      const dayIntakes = this.dailyIntakes.filter(entry => entry.date === date);
      const totalAmount = dayIntakes.reduce((sum, entry) => sum + this.convertToMl(entry.amount, entry.unit), 0);
      const progress = this.dailyGoal > 0 ? (totalAmount / this.dailyGoal) * 100 : 0;
      
      let status: 'below-goal' | 'at-goal' | 'exceeded-goal' = 'below-goal';
      if (progress >= 100) {
        status = 'exceeded-goal';
      } else if (progress >= 90) {
        status = 'at-goal';
      }
      
      this.weeklyHistory.push({
        date,
        totalAmount,
        goalAmount: this.dailyGoal,
        progress,
        entries: dayIntakes,
        status
      });
    });
  }

  private getLastNDays(n: number): string[] {
    const days = [];
    const today = new Date();
    
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    
    return days;
  }

  private generateWaterInsights() {
    this.waterInsights = [];

    if (this.goalProgress >= 100) {
      this.waterInsights.push({
        message: `🎉 Congratulations! You've reached your daily water goal of ${this.formatAmount(this.dailyGoal)}!`,
        type: 'positive'
      });
    } else if (this.goalProgress >= 75) {
      this.waterInsights.push({
        message: `👍 You're ${Math.round(100 - this.goalProgress)}% away from your daily goal! Almost there!`,
        type: 'positive'
      });
    } else if (this.goalProgress >= 50) {
      this.waterInsights.push({
        message: `📊 Halfway there! You've consumed ${this.formatAmount(this.todayTotal)} of your ${this.formatAmount(this.dailyGoal)} goal.`,
        type: 'neutral'
      });
    } else if (this.goalProgress > 0) {
      this.waterInsights.push({
        message: `💧 You've started your hydration journey. ${this.formatAmount(this.dailyGoal - this.todayTotal)} to go!`,
        type: 'neutral'
      });
    } else {
      this.waterInsights.push({
        message: `🚰 Time to start hydrating! Your goal is ${this.formatAmount(this.dailyGoal)} today.`,
        type: 'warning'
      });
    }

    if (this.streakDays >= 7) {
      this.waterInsights.push({
        message: `🔥 Amazing ${this.streakDays}-day hydration streak! Keep it going!`,
        type: 'positive'
      });
    } else if (this.streakDays >= 3) {
      this.waterInsights.push({
        message: `📈 ${this.streakDays} days in a row! Building a strong hydration habit!`,
        type: 'positive'
      });
    }

    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= 12 && this.goalProgress < 30) {
      this.waterInsights.push({
        message: `⏰ It's past noon and you're behind schedule. Time to catch up on hydration!`,
        type: 'warning'
      });
    }

    if (currentHour >= 18 && this.goalProgress < 70) {
      this.waterInsights.push({
        message: `🌙 Evening approaching. Don't forget to hydrate before the day ends!`,
        type: 'warning'
      });
    }

    if (this.hydrationScore >= 90) {
      this.waterInsights.push({
        message: `🏆 Excellent hydration score: ${this.hydrationScore}/100! You're a hydration champion!`,
        type: 'positive'
      });
    } else if (this.hydrationScore >= 70) {
      this.waterInsights.push({
        message: `👍 Good hydration habits! Your score is ${this.hydrationScore}/100.`,
        type: 'positive'
      });
    }

    if (this.waterInsights.length === 0) {
      this.waterInsights.push({
        message: "Start tracking your water intake to stay hydrated and healthy! 💪",
        type: 'neutral'
      });
    }
  }

  async addIntake() {
    if (this.intakeForm.invalid) return;

    this.isLoading = true;
    const formValue = this.intakeForm.value;
    
    const newIntake: WaterIntake = {
      id: this.generateId(),
      date: formValue.date,
      time: formValue.time,
      amount: formValue.amount,
      unit: formValue.unit,
      type: formValue.type,
      temperature: formValue.temperature,
      notes: formValue.notes || '',
      timestamp: new Date().toISOString()
    };

    const updatedIntakes = [...this.dailyIntakes, newIntake];
    
    try {
      await this.saveWaterData(updatedIntakes, this.weeklyHistory);
      
      this.dailyIntakes = updatedIntakes;
      this.calculateTodayMetrics();
      this.generateWeeklyHistory();
      this.generateWaterInsights();
      this.filterIntakes();
      
      const now = new Date();
      const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');
      
      this.intakeForm.reset({
        date: this.today,
        time: currentTime,
        amount: 250,
        unit: 'ml',
        type: 'water',
        temperature: 'room',
        notes: ''
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving water intake:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async updateGoal() {
    if (this.goalForm.invalid) return;

    this.isLoading = true;
    const formValue = this.goalForm.value;
    
    this.dailyGoal = formValue.dailyGoal;
    
    try {
      await this.saveWaterData(this.dailyIntakes, this.weeklyHistory);
      
      this.calculateTodayMetrics();
      this.generateWeeklyHistory();
      this.generateWaterInsights();
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error updating goal:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async deleteIntake(intakeId: string) {
    const updatedIntakes = this.dailyIntakes.filter(intake => intake.id !== intakeId);
    
    try {
      await this.saveWaterData(updatedIntakes, this.weeklyHistory);
      
      this.dailyIntakes = updatedIntakes;
      this.calculateTodayMetrics();
      this.generateWeeklyHistory();
      this.generateWaterInsights();
      this.filterIntakes();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting intake:', error);
    }
  }

  async logQuickIntake(amount: number, unit: string, type: string) {
    this.isLoading = true;
    const now = new Date();
    const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');
    
    const quickIntake: WaterIntake = {
      id: this.generateId(),
      date: this.today,
      time: currentTime,
      amount,
      unit: unit as 'ml' | 'oz' | 'cups',
      type: type as 'water' | 'tea' | 'coffee' | 'juice' | 'soda' | 'smoothie',
      temperature: 'room',
      notes: 'Quick log',
      timestamp: now.toISOString()
    };

    const updatedIntakes = [...this.dailyIntakes, quickIntake];
    
    try {
      await this.saveWaterData(updatedIntakes, this.weeklyHistory);
      
      this.dailyIntakes = updatedIntakes;
      this.calculateTodayMetrics();
      this.generateWeeklyHistory();
      this.generateWaterInsights();
      this.filterIntakes();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error logging quick intake:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async saveWaterData(dailyIntakes: WaterIntake[], weeklyHistory: DailySummary[]) {
    const waterData = {
      dailyIntakes,
      weeklyHistory,
      settings: this.goalForm.value,
      lastUpdated: new Date().toISOString()
    };
    
    await this.trackerService.updateTracker(
      this.userId,
      'waterIntake',
      waterData
    );
  }

  filterIntakes() {
    this.updatePagination();
    this.cdr.detectChanges();
  }

  getFilteredIntakes(): WaterIntake[] {
    return this.dailyIntakes.filter(intake => {
      if (this.filterDate !== 'all' && intake.date !== this.filterDate) return false;
      if (this.filterType !== 'all' && intake.type !== this.filterType) return false;
      return true;
    });
  }

  private updatePagination() {
    const filtered = this.getFilteredIntakes();
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getDisplayedIntakes(): WaterIntake[] {
    const filtered = this.getFilteredIntakes();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return filtered.slice(startIndex, endIndex);
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

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  formatAmount(amount: number): string {
    const unit = this.goalForm.get('unit')?.value || 'ml';
    const convertedAmount = this.convertFromMl(amount, unit);
    return `${Math.round(convertedAmount)} ${unit}`;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  getWaterTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      water: '💧',
      tea: '🍵',
      coffee: '☕',
      juice: '🧃',
      soda: '🥤',
      smoothie: '🥤'
    };
    return icons[type] || '💧';
  }

  getTemperatureIcon(temperature: string): string {
    const icons: { [key: string]: string } = {
      cold: '❄️',
      room: '🌡️',
      warm: '🔥'
    };
    return icons[temperature] || '🌡️';
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return '#10b981';
    if (progress >= 75) return '#3b82f6';
    if (progress >= 50) return '#f59e0b';
    if (progress >= 25) return '#f97316';
    return '#ef4444';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'below-goal': '⚠️',
      'at-goal': '👍',
      'exceeded-goal': '🎉'
    };
    return icons[status] || '📊';
  }

  getDayName(dateString: string): string {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  async resetWaterTracker() {
      try {
        await this.trackerService.resetTracker(this.userId, 'waterIntake');
        this.dailyIntakes = [];
        this.weeklyHistory = [];
        this.calculateTodayMetrics();
        this.generateWeeklyHistory();
        this.waterInsights = [{
          message: "Fresh start! Time to hydrate! 💦",
          type: 'neutral'
        }];
        this.currentPage = 1;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error resetting water tracker:', error);
      }
  }

  getUniqueDates(): string[] {
    const dates = [...new Set(this.dailyIntakes.map(intake => intake.date))];
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }
}