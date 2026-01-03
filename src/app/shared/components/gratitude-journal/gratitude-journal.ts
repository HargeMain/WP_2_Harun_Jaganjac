import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';
import { Subscription } from 'rxjs';

interface GratitudeEntry {
  id: string;
  date: string;
  content: string;
  category: 'people' | 'experiences' | 'health' | 'achievements' | 'simple_pleasures' | 'growth' | 'other';
  mood: 'joyful' | 'grateful' | 'peaceful' | 'hopeful' | 'content' | 'reflective';
  tags: string[];
  isPrivate: boolean;
  createdAt: string;
  location?: string;
  weather?: string;
}

interface JournalInsight {
  message: string;
  type: 'positive' | 'neutral' | 'motivational' | 'reflective';
}

interface MoodStat {
  mood: string;
  count: number;
  percentage: number;
  color: string;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
  icon: string;
}

@Component({
  selector: 'app-gratitude-journal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gratitude-journal.html',
  styleUrls: ['./gratitude-journal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GratitudeJournalComponent implements OnInit, OnDestroy {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  entryForm: FormGroup;
  filterForm: FormGroup;
  
  gratitudeEntries: GratitudeEntry[] = [];
  filteredEntries: GratitudeEntry[] = [];
  aiInsights: JournalInsight[] = [];
  
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentView: 'list' | 'calendar' | 'mood' = 'list';
  
  totalEntries = 0;
  streakDays = 0;
  currentStreak = 0;
  longestStreak = 0;
  entriesThisWeek = 0;
  entriesThisMonth = 0;
  averagePerWeek = 0;
  moodDistribution: MoodStat[] = [];
  categoryDistribution: CategoryStat[] = [];
  positivityScore = 0;
  consistencyScore = 0;
  
  categories = [
    { value: 'people', label: 'People', icon: 'people' },
    { value: 'experiences', label: 'Experiences', icon: 'emoji_events' },
    { value: 'health', label: 'Health', icon: 'fitness_center' },
    { value: 'achievements', label: 'Achievements', icon: 'star' },
    { value: 'simple_pleasures', label: 'Simple Pleasures', icon: 'coffee' },
    { value: 'growth', label: 'Growth', icon: 'trending_up' },
    { value: 'other', label: 'Other', icon: 'category' }
  ];

  moods = [
    { value: 'joyful', label: 'Joyful', icon: 'sentiment_very_satisfied', color: '#fbbf24' },
    { value: 'grateful', label: 'Grateful', icon: 'favorite', color: '#f87171' },
    { value: 'peaceful', label: 'Peaceful', icon: 'self_improvement', color: '#60a5fa' },
    { value: 'hopeful', label: 'Hopeful', icon: 'emoji_objects', color: '#a78bfa' },
    { value: 'content', label: 'Content', icon: 'sentiment_satisfied', color: '#34d399' },
    { value: 'reflective', label: 'Reflective', icon: 'psychology', color: '#818cf8' }
  ];

  tags: string[] = ['Family', 'Friends', 'Work', 'Nature', 'Learning', 'Health', 'Success', 'Love'];

  private filterSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.entryForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      content: ['', [Validators.required, Validators.minLength(10)]],
      category: ['people', Validators.required],
      mood: ['grateful', Validators.required],
      tags: [[]],
      isPrivate: [false],
      location: [''],
      weather: ['']
    });

    this.filterForm = this.fb.group({
      searchTerm: [''],
      filterCategory: ['all'],
      filterMood: ['all'],
      filterDate: ['all'],
      filterTag: ['all']
    });
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadGratitudeEntries();
    }

    this.filterSubscription = this.filterForm.valueChanges.subscribe(() => {
      this.filterEntries();
    });
  }

  ngOnDestroy() {
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
  }

  async loadGratitudeEntries() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.gratitudeEntries = trackers?.gratitudeJournal || [];
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEntries();
    } catch (error) {
      console.error('Error loading gratitude entries:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateMetrics() {
    this.totalEntries = this.gratitudeEntries.length;
    this.calculateStreaks();
    
    const today = new Date();
    const startOfWeek = this.getStartOfWeek(today);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.entriesThisWeek = this.gratitudeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfWeek && entryDate <= today;
    }).length;
    
    this.entriesThisMonth = this.gratitudeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfMonth && entryDate <= today;
    }).length;
    
    const weeksTracked = Math.max(1, Math.ceil(this.totalEntries / 7));
    this.averagePerWeek = this.totalEntries / weeksTracked;
    
    this.calculateMoodDistribution();
    this.calculateCategoryDistribution();
    
    this.positivityScore = this.calculatePositivityScore();
    this.consistencyScore = this.calculateConsistencyScore();
  }

  private calculateStreaks() {
    if (this.gratitudeEntries.length === 0) {
      this.currentStreak = 0;
      this.longestStreak = 0;
      this.streakDays = 0;
      return;
    }

    const sortedEntries = [...this.gratitudeEntries].sort((a, b) => 
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

  private calculateMoodDistribution() {
    const moodCounts = new Map<string, number>();
    this.moods.forEach(mood => moodCounts.set(mood.value, 0));
    
    this.gratitudeEntries.forEach(entry => {
      const count = moodCounts.get(entry.mood) || 0;
      moodCounts.set(entry.mood, count + 1);
    });
    
    this.moodDistribution = Array.from(moodCounts.entries())
      .filter(([_, count]) => count > 0)
      .map(([mood, count]) => {
        const moodConfig = this.getMoodConfig(mood);
        return {
          mood,
          count,
          percentage: (count / this.totalEntries) * 100,
          color: moodConfig?.color || '#6b7280'
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private calculateCategoryDistribution() {
    const categoryCounts = new Map<string, number>();
    this.categories.forEach(cat => categoryCounts.set(cat.value, 0));
    
    this.gratitudeEntries.forEach(entry => {
      const count = categoryCounts.get(entry.category) || 0;
      categoryCounts.set(entry.category, count + 1);
    });
    
    this.categoryDistribution = Array.from(categoryCounts.entries())
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => {
        const catConfig = this.getCategoryConfig(category);
        return {
          category,
          count,
          percentage: (count / this.totalEntries) * 100,
          icon: catConfig?.icon || 'category'
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  private calculatePositivityScore(): number {
    if (this.moodDistribution.length === 0) return 0;
    
    const moodWeights: Record<string, number> = {
      'joyful': 100,
      'grateful': 95,
      'peaceful': 85,
      'hopeful': 80,
      'content': 75,
      'reflective': 70
    };
    
    const weightedSum = this.moodDistribution.reduce((sum, stat) => {
      return sum + (stat.count * (moodWeights[stat.mood] || 50));
    }, 0);
    
    return Math.round((weightedSum / this.totalEntries) * 10) / 10;
  }

  getMoodCount(moodValue: string): number {
  const moodStat = this.moodDistribution.find(m => m.mood === moodValue);
  return moodStat?.count || 0;
 }

  private calculateConsistencyScore(): number {
    if (this.totalEntries === 0) return 0;
    
    const streakWeight = 0.4;
    const frequencyWeight = 0.3;
    const durationWeight = 0.3;
    
    const streakScore = this.longestStreak > 0 ? 
      (this.currentStreak / this.longestStreak) * 100 : 0;
    
    const targetWeeklyEntries = 7;
    const frequencyScore = Math.min(100, (this.averagePerWeek / targetWeeklyEntries) * 100);
    
    const uniqueDays = new Set(this.gratitudeEntries.map(e => e.date)).size;
    const daysTracked = Math.max(1, this.daysBetweenFirstAndLastEntry());
    const durationScore = (uniqueDays / daysTracked) * 100;
    
    return Math.round(
      (streakScore * streakWeight) +
      (frequencyScore * frequencyWeight) +
      (durationScore * durationWeight)
    );
  }

  private daysBetweenFirstAndLastEntry(): number {
    if (this.gratitudeEntries.length < 2) return 1;
    
    const sortedEntries = [...this.gratitudeEntries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const firstDate = new Date(sortedEntries[0].date);
    const lastDate = new Date(sortedEntries[sortedEntries.length - 1].date);
    
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private generateAIInsights() {
    this.aiInsights = [];

    if (this.currentStreak >= 7) {
      this.aiInsights.push({
        message: `Amazing ${this.currentStreak}-day streak! Your consistency is building positive habits. 🎯`,
        type: 'positive'
      });
    } else if (this.currentStreak >= 3) {
      this.aiInsights.push({
        message: `Great ${this.currentStreak}-day streak! Keep the momentum going. 💪`,
        type: 'motivational'
      });
    } else if (this.totalEntries > 0 && this.currentStreak === 0) {
      this.aiInsights.push({
        message: `Time to start a new streak! Remember why gratitude matters to you. 🌟`,
        type: 'motivational'
      });
    }

    if (this.positivityScore >= 85) {
      this.aiInsights.push({
        message: `Your positivity score is ${this.positivityScore}/100! Your gratitude practice is radiating positive energy. 🌈`,
        type: 'positive'
      });
    } else if (this.positivityScore >= 70) {
      this.aiInsights.push({
        message: `Good positivity score of ${this.positivityScore}/100. You're cultivating a thankful mindset. 🌱`,
        type: 'positive'
      });
    }

    const topCategory = this.categoryDistribution[0];
    if (topCategory && topCategory.percentage >= 40) {
      const categoryLabel = this.getCategoryLabel(topCategory.category);
      this.aiInsights.push({
        message: `You're most grateful for ${categoryLabel.toLowerCase()} (${Math.round(topCategory.percentage)}%). Consider exploring other areas too. 🔄`,
        type: 'reflective'
      });
    }

    const topMood = this.moodDistribution[0];
    if (topMood && topMood.percentage >= 50) {
      const moodLabel = this.getMoodLabel(topMood.mood);
      this.aiInsights.push({
        message: `Your dominant mood is ${moodLabel.toLowerCase()}. Notice how this feeling colors your experiences. 🎨`,
        type: 'reflective'
      });
    }

    if (this.consistencyScore >= 80) {
      this.aiInsights.push({
        message: `Excellent consistency (${this.consistencyScore}%)! Your dedication to gratitude is creating lasting benefits. 🏆`,
        type: 'positive'
      });
    } else if (this.consistencyScore <= 40) {
      this.aiInsights.push({
        message: `Consistency is key to reaping gratitude's benefits (${this.consistencyScore}%). Try setting a daily reminder. ⏰`,
        type: 'motivational'
      });
    }

    if (this.aiInsights.length === 0 && this.totalEntries > 0) {
      this.aiInsights.push({
        message: "Every gratitude entry is a step toward greater happiness and resilience. Keep writing! ✨",
        type: 'positive'
      });
    } else if (this.totalEntries === 0) {
      this.aiInsights.push({
        message: "Welcome to your gratitude journal! Start by writing three things you're grateful for today. 🌟",
        type: 'motivational'
      });
    }
  }

  async addEntry() {
    if (this.entryForm.invalid) return;

    this.isLoading = true;
    const formData = this.entryForm.value;
    
    const newEntry: GratitudeEntry = {
      id: this.generateId(),
      ...formData,
      createdAt: new Date().toISOString()
    };

    const updatedEntries = [...this.gratitudeEntries, newEntry];

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'gratitudeJournal',
        updatedEntries
      );
      
      this.gratitudeEntries = updatedEntries;
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEntries();
      
      this.entryForm.reset({
        date: new Date().toISOString().split('T')[0],
        content: '',
        category: 'people',
        mood: 'grateful',
        tags: [],
        isPrivate: false,
        location: '',
        weather: ''
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updateEntry(entryId: string, updates: Partial<GratitudeEntry>) {
    const updatedEntries = this.gratitudeEntries.map(entry => 
      entry.id === entryId ? { ...entry, ...updates } : entry
    );
    
    try {
      await this.trackerService.updateTracker(
        this.userId,
        'gratitudeJournal',
        updatedEntries
      );
      
      this.gratitudeEntries = updatedEntries;
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEntries();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  }

  async deleteEntry(entryId: string) {
    const updatedEntries = this.gratitudeEntries.filter(entry => entry.id !== entryId);
    
    try {
      await this.trackerService.updateTracker(
        this.userId,
        'gratitudeJournal',
        updatedEntries
      );
      
      this.gratitudeEntries = updatedEntries;
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEntries();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  }

  filterEntries() {
    const filters = this.filterForm.value;
    
    this.filteredEntries = this.gratitudeEntries.filter(entry => {
      if (filters.filterCategory !== 'all' && entry.category !== filters.filterCategory) return false;
      if (filters.filterMood !== 'all' && entry.mood !== filters.filterMood) return false;
      if (filters.filterTag !== 'all' && !entry.tags?.includes(filters.filterTag)) return false;
      
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!entry.content.toLowerCase().includes(searchLower) && 
            !entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      if (filters.filterDate !== 'all') {
        const entryDate = new Date(entry.date);
        const today = new Date();
        
        switch (filters.filterDate) {
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

  toggleTag(tag: string) {
    const currentTags = this.entryForm.get('tags')?.value || [];
    const index = currentTags.indexOf(tag);
    
    if (index > -1) {
      currentTags.splice(index, 1);
    } else {
      currentTags.push(tag);
    }
    
    this.entryForm.patchValue({ tags: currentTags });
  }

  getMoodConfig(moodValue: string) {
    return this.moods.find(m => m.value === moodValue);
  }

  getCategoryConfig(categoryValue: string) {
    return this.categories.find(c => c.value === categoryValue);
  }

  getMoodEntries(moodValue: string): GratitudeEntry[] {
  return this.filteredEntries.filter(e => e.mood === moodValue).slice(0, 3);
}

  getMoodIcon(moodValue: string): string {
    const mood = this.getMoodConfig(moodValue);
    return mood?.icon || 'sentiment_neutral';
  }

  getMoodColor(moodValue: string): string {
    const mood = this.getMoodConfig(moodValue);
    return mood?.color || '#6b7280';
  }

  getMoodLabel(moodValue: string): string {
    const mood = this.getMoodConfig(moodValue);
    return mood?.label || moodValue;
  }

  getCategoryIcon(categoryValue: string): string {
    const category = this.getCategoryConfig(categoryValue);
    return category?.icon || 'category';
  }

  getCategoryLabel(categoryValue: string): string {
    const category = this.getCategoryConfig(categoryValue);
    return category?.label || 'Other';
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

  async resetJournal() {
    try {
      await this.trackerService.resetTracker(this.userId, 'gratitudeJournal');
      this.gratitudeEntries = [];
      this.filteredEntries = [];
      this.calculateMetrics();
      this.aiInsights = [{
        message: "Fresh start! What are you grateful for today? ✨",
        type: 'motivational'
      }];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting journal:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}