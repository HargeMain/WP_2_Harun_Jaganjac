import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface ReflectionEntry {
  id: string;
  date: string; 
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

  energyLevel: 1 | 2 | 3 | 4 | 5; 
  mood: 'terrible' | 'bad' | 'neutral' | 'good' | 'excellent';
  focusLevel: 1 | 2 | 3 | 4 | 5;
  productivityScore: 1 | 2 | 3 | 4 | 5;
  
  wins: string[];
  challenges: string[];
  lessonsLearned: string[];
  gratitude: string[];
  improvements: string[];
  goalsForTomorrow: string[];
  
  location: string;
  weather: string;
  sleepHours: number;
  exerciseMinutes: number;
  meditationMinutes: number;
  
  tags: string[];
  isPrivate: boolean;
  createdAt: string;
}

interface ReflectionInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning' | 'growth';
}

interface TrendData {
  date: string;
  mood: number;
  energy: number;
  productivity: number;
  focus: number;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
  icon: string;
}

@Component({
  selector: 'app-daily-reflection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './daily-reflection.html',
  styleUrls: ['./daily-reflection.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyReflectionComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  reflectionForm!: FormGroup;
  reflectionEntries: ReflectionEntry[] = [];
  filteredEntries: ReflectionEntry[] = [];
  aiInsights: ReflectionInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentView: 'list' | 'trends' | 'calendar' = 'list';
  
  totalEntries = 0;
  streakDays = 0;
  currentStreak = 0;
  longestStreak = 0;
  averageMood = 0;
  averageEnergy = 0;
  averageProductivity = 0;
  averageFocus = 0;
  totalWins = 0;
  totalChallenges = 0;
  totalLessons = 0;
  totalGratitude = 0;
  totalImprovements = 0;
  
  moodTrend: TrendData[] = [];
  energyTrend: TrendData[] = [];
  productivityTrend: TrendData[] = [];
  focusTrend: TrendData[] = [];

  winCategories: CategoryStat[] = [];
  challengeCategories: CategoryStat[] = [];
  
  filterMood: string = 'all';
  filterEnergy: string = 'all';
  filterTimeOfDay: string = 'all';
  filterDateRange: string = 'week';
  searchTerm: string = '';


  timesOfDay = [
    { value: 'morning', label: 'Morning', icon: 'wb_sunny' },
    { value: 'afternoon', label: 'Afternoon', icon: 'light_mode' },
    { value: 'evening', label: 'Evening', icon: 'dark_mode' },
    { value: 'night', label: 'Night', icon: 'nightlight' }
  ];

  moods = [
    { value: 'terrible', label: 'Terrible', color: '#ef4444', emoji: '😞' },
    { value: 'bad', label: 'Bad', color: '#f97316', emoji: '😕' },
    { value: 'neutral', label: 'Neutral', color: '#eab308', emoji: '😐' },
    { value: 'good', label: 'Good', color: '#22c55e', emoji: '🙂' },
    { value: 'excellent', label: 'Excellent', color: '#3b82f6', emoji: '😊' }
  ];

  ratingOptions = [1, 2, 3, 4, 5];
  defaultTags = ['Work', 'Personal', 'Health', 'Learning', 'Relationships', 'Hobbies', 'Finance', 'Growth'];

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.reflectionForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      timeOfDay: ['evening', Validators.required],
      
      energyLevel: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      mood: ['neutral', Validators.required],
      focusLevel: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      productivityScore: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      
      wins: this.fb.array([this.fb.control('')]),
      challenges: this.fb.array([this.fb.control('')]),
      lessonsLearned: this.fb.array([this.fb.control('')]),
      gratitude: this.fb.array([this.fb.control('')]),
      improvements: this.fb.array([this.fb.control('')]),
      goalsForTomorrow: this.fb.array([this.fb.control('')]),
      
      location: [''],
      weather: [''],
      sleepHours: [0, Validators.min(0)],
      exerciseMinutes: [0, Validators.min(0)],
      meditationMinutes: [0, Validators.min(0)],
      
      tags: [[]],
      isPrivate: [false]
    });
  }

  get wins() { return this.reflectionForm.get('wins') as any; }
  get challenges() { return this.reflectionForm.get('challenges') as any; }
  get lessonsLearned() { return this.reflectionForm.get('lessonsLearned') as any; }
  get gratitude() { return this.reflectionForm.get('gratitude') as any; }
  get improvements() { return this.reflectionForm.get('improvements') as any; }
  get goalsForTomorrow() { return this.reflectionForm.get('goalsForTomorrow') as any; }

  addWin() { this.wins.push(this.fb.control('')); }
  removeWin(index: number) { if (this.wins.length > 1) this.wins.removeAt(index); }

  addChallenge() { this.challenges.push(this.fb.control('')); }
  removeChallenge(index: number) { if (this.challenges.length > 1) this.challenges.removeAt(index); }

  addLesson() { this.lessonsLearned.push(this.fb.control('')); }
  removeLesson(index: number) { if (this.lessonsLearned.length > 1) this.lessonsLearned.removeAt(index); }

  addGratitude() { this.gratitude.push(this.fb.control('')); }
  removeGratitude(index: number) { if (this.gratitude.length > 1) this.gratitude.removeAt(index); }

  addImprovement() { this.improvements.push(this.fb.control('')); }
  removeImprovement(index: number) { if (this.improvements.length > 1) this.improvements.removeAt(index); }

  addGoal() { this.goalsForTomorrow.push(this.fb.control('')); }
  removeGoal(index: number) { if (this.goalsForTomorrow.length > 1) this.goalsForTomorrow.removeAt(index); }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadReflectionEntries();
    }
  }

  async loadReflectionEntries() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.reflectionEntries = trackers?.dailyReflection || [];
      this.calculateMetrics();
      this.generateTrendData();
      this.generateAIInsights();
      this.filterEntries();
    } catch (error) {
      console.error('Error loading reflection entries:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateMetrics() {
    this.totalEntries = this.reflectionEntries.length;
    
    if (this.totalEntries === 0) {
      this.resetStats();
      return;
    }
    
    this.calculateStreaks();
    
    let totalMood = 0;
    let totalEnergy = 0;
    let totalProductivity = 0;
    let totalFocus = 0;
    
    let totalWins = 0;
    let totalChallenges = 0;
    let totalLessons = 0;
    let totalGratitude = 0;
    let totalImprovements = 0;
    
    const moodValues: Record<string, number> = {
      'terrible': 1,
      'bad': 2,
      'neutral': 3,
      'good': 4,
      'excellent': 5
    };
    
    this.reflectionEntries.forEach(entry => {
      totalMood += moodValues[entry.mood] || 3;
      totalEnergy += entry.energyLevel;
      totalProductivity += entry.productivityScore;
      totalFocus += entry.focusLevel;
      
      totalWins += entry.wins?.length || 0;
      totalChallenges += entry.challenges?.length || 0;
      totalLessons += entry.lessonsLearned?.length || 0;
      totalGratitude += entry.gratitude?.length || 0;
      totalImprovements += entry.improvements?.length || 0;
    });
    
    this.averageMood = totalMood / this.totalEntries;
    this.averageEnergy = totalEnergy / this.totalEntries;
    this.averageProductivity = totalProductivity / this.totalEntries;
    this.averageFocus = totalFocus / this.totalEntries;
    
    this.totalWins = totalWins;
    this.totalChallenges = totalChallenges;
    this.totalLessons = totalLessons;
    this.totalGratitude = totalGratitude;
    this.totalImprovements = totalImprovements;
    
    this.calculateCategoryStats();
  }

  private resetStats() {
    this.streakDays = 0;
    this.currentStreak = 0;
    this.longestStreak = 0;
    this.averageMood = 0;
    this.averageEnergy = 0;
    this.averageProductivity = 0;
    this.averageFocus = 0;
    this.totalWins = 0;
    this.totalChallenges = 0;
    this.totalLessons = 0;
    this.totalGratitude = 0;
    this.totalImprovements = 0;
    this.winCategories = [];
    this.challengeCategories = [];
  }

  private calculateStreaks() {
    const sortedEntries = [...this.reflectionEntries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const today = new Date();
    let currentStreak = 0;
    let checkingDate = new Date(today);
    
    while (true) {
      const dateStr = checkingDate.toISOString().split('T')[0];
      const hasEntry = sortedEntries.some(entry => entry.date === dateStr);
      
      if (hasEntry) {
        currentStreak++;
        checkingDate.setDate(checkingDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    this.currentStreak = currentStreak;
    
    let longestStreak = 0;
    let currentStreakInProgress = 0;
    let lastDate: Date | null = null;
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      
      if (lastDate) {
        const daysDiff = Math.floor((entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          currentStreakInProgress++;
        } else if (daysDiff > 1) {
          longestStreak = Math.max(longestStreak, currentStreakInProgress);
          currentStreakInProgress = 1;
        }
      } else {
        currentStreakInProgress = 1;
      }
      
      lastDate = entryDate;
    }
    
    longestStreak = Math.max(longestStreak, currentStreakInProgress);
    this.longestStreak = longestStreak;
    this.streakDays = sortedEntries.length;
  }

  private calculateCategoryStats() {
    const winCategoryCounts = new Map<string, number>();
    const challengeCategoryCounts = new Map<string, number>();
    
    this.reflectionEntries.forEach(entry => {
      entry.wins?.forEach(win => {
        const category = this.categorizeText(win);
        const count = winCategoryCounts.get(category) || 0;
        winCategoryCounts.set(category, count + 1);
      });
      
      entry.challenges?.forEach(challenge => {
        const category = this.categorizeText(challenge);
        const count = challengeCategoryCounts.get(category) || 0;
        challengeCategoryCounts.set(category, count + 1);
      });
    });
    
    this.winCategories = Array.from(winCategoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / this.totalWins) * 100,
        icon: this.getCategoryIcon(category)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    this.challengeCategories = Array.from(challengeCategoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / this.totalChallenges) * 100,
        icon: this.getCategoryIcon(category)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private categorizeText(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('work') || lowerText.includes('job') || lowerText.includes('career')) {
      return 'Work';
    } else if (lowerText.includes('health') || lowerText.includes('exercise') || lowerText.includes('diet')) {
      return 'Health';
    } else if (lowerText.includes('family') || lowerText.includes('friend') || lowerText.includes('relationship')) {
      return 'Relationships';
    } else if (lowerText.includes('learn') || lowerText.includes('study') || lowerText.includes('skill')) {
      return 'Learning';
    } else if (lowerText.includes('money') || lowerText.includes('finance') || lowerText.includes('budget')) {
      return 'Finance';
    } else if (lowerText.includes('hobby') || lowerText.includes('fun') || lowerText.includes('leisure')) {
      return 'Hobbies';
    } else if (lowerText.includes('goal') || lowerText.includes('achieve') || lowerText.includes('progress')) {
      return 'Growth';
    } else {
      return 'Other';
    }
  }

  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'Work': return 'work';
      case 'Health': return 'fitness_center';
      case 'Relationships': return 'people';
      case 'Learning': return 'school';
      case 'Finance': return 'attach_money';
      case 'Hobbies': return 'sports_esports';
      case 'Growth': return 'trending_up';
      default: return 'category';
    }
  }

  private generateTrendData() {
    const recentEntries = [...this.reflectionEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7)
      .reverse();
    
    this.moodTrend = [];
    this.energyTrend = [];
    this.productivityTrend = [];
    this.focusTrend = [];
    
    const moodValues: Record<string, number> = {
      'terrible': 1,
      'bad': 2,
      'neutral': 3,
      'good': 4,
      'excellent': 5
    };
    
    recentEntries.forEach(entry => {
      this.moodTrend.push({
        date: entry.date,
        mood: moodValues[entry.mood] || 3,
        energy: entry.energyLevel,
        productivity: entry.productivityScore,
        focus: entry.focusLevel
      });
    });
  }

  private generateAIInsights() {
    this.aiInsights = [];

    if (this.currentStreak >= 7) {
      this.aiInsights.push({
        message: `Impressive ${this.currentStreak}-day reflection streak! Consistency breeds self-awareness. 🌟`,
        type: 'positive'
      });
    }

    if (this.averageMood >= 4) {
      this.aiInsights.push({
        message: `Your average mood is ${this.averageMood.toFixed(1)}/5 - Keep cultivating that positivity! 😊`,
        type: 'positive'
      });
    } else if (this.averageMood <= 2) {
      this.aiInsights.push({
        message: `Your mood has been low (${this.averageMood.toFixed(1)}/5). Consider what might help uplift your spirits. 🌱`,
        type: 'warning'
      });
    }

    if (this.averageProductivity >= 4 && this.averageFocus >= 4) {
      this.aiInsights.push({
        message: `Great focus and productivity levels! You're in the zone. 🎯`,
        type: 'positive'
      });
    } else if (this.averageProductivity <= 2 || this.averageFocus <= 2) {
      this.aiInsights.push({
        message: `Consider strategies to improve focus (${this.averageFocus.toFixed(1)}/5) and productivity (${this.averageProductivity.toFixed(1)}/5). ⚡`,
        type: 'growth'
      });
    }

    const winChallengeRatio = this.totalChallenges > 0 ? this.totalWins / this.totalChallenges : 0;
    if (winChallengeRatio > 2) {
      this.aiInsights.push({
        message: `You're celebrating ${this.totalWins} wins vs ${this.totalChallenges} challenges - Great balance! ⚖️`,
        type: 'positive'
      });
    } else if (winChallengeRatio < 0.5) {
      this.aiInsights.push({
        message: `More challenges (${this.totalChallenges}) than wins (${this.totalWins}) noted. Try to find silver linings. 🌈`,
        type: 'growth'
      });
    }

    if (this.winCategories.length > 0) {
      const topWin = this.winCategories[0];
      this.aiInsights.push({
        message: `Most of your wins are in ${topWin.category.toLowerCase()} (${Math.round(topWin.percentage)}%) - Play to your strengths! 💪`,
        type: 'neutral'
      });
    }

    if (this.challengeCategories.length > 0) {
      const topChallenge = this.challengeCategories[0];
      this.aiInsights.push({
        message: `Most challenges in ${topChallenge.category.toLowerCase()} (${Math.round(topChallenge.percentage)}%) - Opportunity for growth! 🌱`,
        type: 'growth'
      });
    }

    if (this.totalLessons > this.totalEntries * 2) {
      this.aiInsights.push({
        message: `You're learning a lot! ${this.totalLessons} lessons from ${this.totalEntries} days shows great reflection depth. 📚`,
        type: 'positive'
      });
    }

    if (this.aiInsights.length === 0 && this.totalEntries > 0) {
      this.aiInsights.push({
        message: "Daily reflection builds self-awareness and growth. Keep up the great work! 🌟",
        type: 'positive'
      });
    } else if (this.totalEntries === 0) {
      this.aiInsights.push({
        message: "Start your daily reflection journey today! Self-awareness is the first step to growth. 🚀",
        type: 'growth'
      });
    }
  }

  async addReflection() {
    if (this.reflectionForm.invalid) return;

    this.isLoading = true;
    const formData = this.reflectionForm.value;
    
    const filterArray = (arr: string[]) => arr.filter(item => item.trim() !== '');
    
    const newEntry: ReflectionEntry = {
      id: this.generateId(),
      ...formData,
      wins: filterArray(formData.wins || []),
      challenges: filterArray(formData.challenges || []),
      lessonsLearned: filterArray(formData.lessonsLearned || []),
      gratitude: filterArray(formData.gratitude || []),
      improvements: filterArray(formData.improvements || []),
      goalsForTomorrow: filterArray(formData.goalsForTomorrow || []),
      createdAt: new Date().toISOString()
    };

    const updatedEntries = [...this.reflectionEntries, newEntry];

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'dailyReflection',
        updatedEntries
      );
      
      this.reflectionEntries = updatedEntries;
      this.calculateMetrics();
      this.generateTrendData();
      this.generateAIInsights();
      this.filterEntries();
      
      this.reflectionForm.reset({
        date: new Date().toISOString().split('T')[0],
        timeOfDay: 'evening',
        energyLevel: 3,
        mood: 'neutral',
        focusLevel: 3,
        productivityScore: 3,
        wins: [''],
        challenges: [''],
        lessonsLearned: [''],
        gratitude: [''],
        improvements: [''],
        goalsForTomorrow: [''],
        location: '',
        weather: '',
        sleepHours: 0,
        exerciseMinutes: 0,
        meditationMinutes: 0,
        tags: [],
        isPrivate: false
      });
      
      while (this.wins.length > 1) this.wins.removeAt(1);
      while (this.challenges.length > 1) this.challenges.removeAt(1);
      while (this.lessonsLearned.length > 1) this.lessonsLearned.removeAt(1);
      while (this.gratitude.length > 1) this.gratitude.removeAt(1);
      while (this.improvements.length > 1) this.improvements.removeAt(1);
      while (this.goalsForTomorrow.length > 1) this.goalsForTomorrow.removeAt(1);
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
    } catch (error) {
      console.error('Error saving reflection:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updateEntry(entryId: string, updates: Partial<ReflectionEntry>) {
    const updatedEntries = this.reflectionEntries.map(entry => 
      entry.id === entryId ? { ...entry, ...updates } : entry
    );
    
    try {
      await this.trackerService.updateTracker(
        this.userId,
        'dailyReflection',
        updatedEntries
      );
      
      this.reflectionEntries = updatedEntries;
      this.calculateMetrics();
      this.generateTrendData();
      this.generateAIInsights();
      this.filterEntries();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  }

  async deleteEntry(entryId: string) {
    const updatedEntries = this.reflectionEntries.filter(entry => entry.id !== entryId);
    
    try {
      await this.trackerService.updateTracker(
        this.userId,
        'dailyReflection',
        updatedEntries
      );
      
      this.reflectionEntries = updatedEntries;
      this.calculateMetrics();
      this.generateTrendData();
      this.generateAIInsights();
      this.filterEntries();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  }

  filterEntries() {
    this.filteredEntries = this.reflectionEntries.filter(entry => {
      if (this.filterMood !== 'all' && entry.mood !== this.filterMood) return false;
      if (this.filterEnergy !== 'all') {
        const energyLevel = parseInt(this.filterEnergy);
        if (entry.energyLevel !== energyLevel) return false;
      }
      if (this.filterTimeOfDay !== 'all' && entry.timeOfDay !== this.filterTimeOfDay) return false;
      
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const allText = [
          ...entry.wins,
          ...entry.challenges,
          ...entry.lessonsLearned,
          ...entry.gratitude,
          ...entry.improvements
        ].join(' ').toLowerCase();
        
        if (!allText.includes(searchLower) && 
            !entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      if (this.filterDateRange !== 'all') {
        const entryDate = new Date(entry.date);
        const today = new Date();
        
        switch (this.filterDateRange) {
          case 'today':
            if (entryDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'week':
            const startOfWeek = this.getStartOfWeek(today);
            if (entryDate < startOfWeek || entryDate > today) return false;
            break;
          case 'month':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            if (entryDate < startOfMonth || entryDate > today) return false;
            break;
        }
      }
      
      return true;
    });
    
    this.filteredEntries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  onFilterChange() {
    this.filterEntries();
  }

  getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  getMoodColor(mood: string): string {
    const moodConfig = this.moods.find(m => m.value === mood);
    return moodConfig?.color || '#6b7280';
  }

  getMoodEmoji(mood: string): string {
    const moodConfig = this.moods.find(m => m.value === mood);
    return moodConfig?.emoji || '😐';
  }

  getTimeOfDayIcon(time: string): string {
    const timeConfig = this.timesOfDay.find(t => t.value === time);
    return timeConfig?.icon || 'schedule';
  }

  getTimeOfDayLabel(time: string): string {
    const timeConfig = this.timesOfDay.find(t => t.value === time);
    return timeConfig?.label || 'Unknown';
  }

  formatEntryDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  getRatingColor(value: number): string {
    switch (value) {
      case 1: return '#ef4444';
      case 2: return '#f97316';
      case 3: return '#eab308';
      case 4: return '#22c55e';
      case 5: return '#3b82f6';
      default: return '#6b7280';
    }
  }

  getRatingLabel(value: number): string {
    switch (value) {
      case 1: return 'Very Low';
      case 2: return 'Low';
      case 3: return 'Average';
      case 4: return 'High';
      case 5: return 'Very High';
      default: return 'Unknown';
    }
  }

  async resetReflections() {
    try {
      await this.trackerService.resetTracker(this.userId, 'dailyReflection');
      this.reflectionEntries = [];
      this.filteredEntries = [];
      this.resetStats();
      this.aiInsights = [{
        message: "Fresh start! Today is a new day for reflection and growth. 🌱",
        type: 'growth'
      }];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting reflections:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}