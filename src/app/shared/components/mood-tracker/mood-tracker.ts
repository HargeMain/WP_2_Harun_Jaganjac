import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface MoodEntry {
  id: string;
  date: string;
  time: string;
  mood: number;
  moodEmoji: string;
  emotion: string;
  intensity: number;
  factors: string[];
  notes: string;
  physicalSymptoms: string[];
  energyLevel: number;
  sleepHours: number;
  weather?: string;
  location?: string;
  tags: string[];
}

interface MoodPattern {
  dayOfWeek: string;
  averageMood: number;
  count: number;
}

interface EmotionDistribution {
  emotion: string;
  count: number;
  percentage: number;
}

interface MoodInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning' | 'suggestion' | 'correlation';
  category: 'pattern' | 'correlation' | 'trend' | 'recommendation';
}

@Component({
  selector: 'app-mood-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './mood-tracker.html',
  styleUrls: ['./mood-tracker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodTrackerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  moodForm!: FormGroup;
  moodEntries: MoodEntry[] = [];
  aiInsights: MoodInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  currentMood = 0;
  averageMood = 0;
  moodTrend = 0;
  streakDays = 0;
  emotionalBalance = 0;
  moodConsistency = 0;
  dominantEmotion = '';
  highEnergyDays = 0;
  moodPatterns: MoodPattern[] = [];
  emotionDistribution: EmotionDistribution[] = [];

  filterDateRange: 'all' | 'week' | 'month' | 'quarter' = 'all';
  filterMoodRange: 'all' | 'low' | 'medium' | 'high' = 'all';
  filterEmotion: string = 'all';

  moodOptions = [
    { value: 1, emoji: '😢', label: 'Very Sad', color: '#3b82f6' },
    { value: 2, emoji: '😔', label: 'Sad', color: '#60a5fa' },
    { value: 3, emoji: '😐', label: 'Neutral', color: '#9ca3af' },
    { value: 4, emoji: '🙂', label: 'Content', color: '#fbbf24' },
    { value: 5, emoji: '😊', label: 'Happy', color: '#f97316' },
    { value: 6, emoji: '😄', label: 'Very Happy', color: '#22c55e' },
    { value: 7, emoji: '🤩', label: 'Excited', color: '#ec4899' },
    { value: 8, emoji: '😌', label: 'Peaceful', color: '#8b5cf6' },
    { value: 9, emoji: '😇', label: 'Grateful', color: '#10b981' },
    { value: 10, emoji: '🌈', label: 'Blissful', color: '#ef4444' }
  ];

  emotionOptions = [
    'Joy', 'Gratitude', 'Peace', 'Contentment', 'Excitement',
    'Anxiety', 'Stress', 'Sadness', 'Anger', 'Frustration',
    'Boredom', 'Loneliness', 'Hope', 'Love', 'Pride',
    'Confusion', 'Overwhelmed', 'Tired', 'Energetic', 'Calm'
  ];

  factorOptions = [
    'Work', 'Family', 'Friends', 'Exercise', 'Sleep',
    'Diet', 'Weather', 'Health', 'Finance', 'Hobbies',
    'Social Media', 'News', 'Meditation', 'Nature', 'Music',
    'Creativity', 'Learning', 'Rest', 'Travel', 'Achievement'
  ];

  symptomOptions = [
    'Headache', 'Fatigue', 'Restlessness', 'Tension',
    'Appetite Change', 'Sleep Issues', 'Low Energy',
    'Nervousness', 'Irritability', 'Focus Issues',
    'Body Aches', 'Digestive Issues', 'Heart Racing'
  ];

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.moodForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      time: [new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), Validators.required],
      mood: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      emotion: ['', Validators.required],
      intensity: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      factors: this.fb.array([], Validators.required),
      notes: [''],
      physicalSymptoms: this.fb.array([]),
      energyLevel: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      sleepHours: [8, [Validators.required, Validators.min(0), Validators.max(24)]],
      weather: [''],
      location: [''],
      tags: this.fb.array([])
    });
  }

  get factors(): FormArray {
    return this.moodForm.get('factors') as FormArray;
  }

  get physicalSymptoms(): FormArray {
    return this.moodForm.get('physicalSymptoms') as FormArray;
  }

  get tags(): FormArray {
    return this.moodForm.get('tags') as FormArray;
  }

  addFactor() {
    this.factors.push(this.fb.control(''));
  }

  removeFactor(index: number) {
    this.factors.removeAt(index);
  }

  addSymptom() {
    this.physicalSymptoms.push(this.fb.control(''));
  }

  removeSymptom(index: number) {
    this.physicalSymptoms.removeAt(index);
  }

  addTag() {
    this.tags.push(this.fb.control(''));
  }

  removeTag(index: number) {
    this.tags.removeAt(index);
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadMoodData();
    }
  }

  async loadMoodData() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.moodEntries = trackers?.moodTracker || [];
      this.calculateMoodMetrics();
      this.generateAIInsights();
      this.filterEntries();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading mood data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateMoodMetrics() {
    if (this.moodEntries.length === 0) {
      this.currentMood = 0;
      this.averageMood = 0;
      this.emotionalBalance = 0;
      return;
    }

    const sortedEntries = [...this.moodEntries].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    this.currentMood = sortedEntries[0].mood;

    const totalMood = this.moodEntries.reduce((sum, entry) => sum + entry.mood, 0);
    this.averageMood = totalMood / this.moodEntries.length;

    const lastWeek = this.getEntriesByDateRange('week');
    const previousWeek = this.getEntriesByDateRange('previousWeek');
    
    if (lastWeek.length > 0 && previousWeek.length > 0) {
      const lastWeekAvg = lastWeek.reduce((sum, entry) => sum + entry.mood, 0) / lastWeek.length;
      const prevWeekAvg = previousWeek.reduce((sum, entry) => sum + entry.mood, 0) / previousWeek.length;
      this.moodTrend = lastWeekAvg > prevWeekAvg ? 1 : lastWeekAvg < prevWeekAvg ? -1 : 0;
    }

    this.calculateStreak();

    const positiveMoods = this.moodEntries.filter(entry => entry.mood >= 6).length;
    const neutralMoods = this.moodEntries.filter(entry => entry.mood >= 4 && entry.mood <= 5).length;
    const negativeMoods = this.moodEntries.filter(entry => entry.mood <= 3).length;
    
    const total = positiveMoods + neutralMoods + negativeMoods;
    this.emotionalBalance = total > 0 ? (positiveMoods / total) * 100 : 0;

    if (this.moodEntries.length >= 2) {
      const squaredDiffs = this.moodEntries.map(entry => 
        Math.pow(entry.mood - this.averageMood, 2)
      );
      const variance = squaredDiffs.reduce((a, b) => a + b) / this.moodEntries.length;
      this.moodConsistency = Math.max(0, 100 - (Math.sqrt(variance) * 10));
    }

    const emotionCounts: { [key: string]: number } = {};
    this.moodEntries.forEach(entry => {
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
    });
    
    let maxCount = 0;
    let dominant = '';
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominant = emotion;
      }
    });
    this.dominantEmotion = dominant;

    this.highEnergyDays = this.moodEntries.filter(entry => entry.energyLevel >= 7).length;

    this.calculateMoodPatterns();

    this.calculateEmotionDistribution();
  }

  private calculateStreak() {
    if (this.moodEntries.length === 0) {
      this.streakDays = 0;
      return;
    }

    const uniqueDates = [...new Set(this.moodEntries.map(entry => entry.date))];
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
    
    this.streakDays = streak;
  }

  private calculateMoodPatterns() {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns: { [key: string]: { total: number; count: number } } = {};
    
    daysOfWeek.forEach(day => {
      patterns[day] = { total: 0, count: 0 };
    });

    this.moodEntries.forEach(entry => {
      const date = new Date(entry.date);
      const dayName = daysOfWeek[date.getDay()];
      patterns[dayName].total += entry.mood;
      patterns[dayName].count++;
    });

    this.moodPatterns = daysOfWeek.map(day => ({
      dayOfWeek: day.substring(0, 3),
      averageMood: patterns[day].count > 0 ? patterns[day].total / patterns[day].count : 0,
      count: patterns[day].count
    }));
  }

  private calculateEmotionDistribution() {
    const emotionCounts: { [key: string]: number } = {};
    this.moodEntries.forEach(entry => {
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
    });

    const total = this.moodEntries.length;
    this.emotionDistribution = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }

  private getEntriesByDateRange(range: 'week' | 'month' | 'quarter' | 'previousWeek'): MoodEntry[] {
    const today = new Date();
    const cutoff = new Date();

    switch (range) {
      case 'week':
        cutoff.setDate(today.getDate() - 7);
        break;
      case 'previousWeek':
        cutoff.setDate(today.getDate() - 14);
        const previousWeekEnd = new Date(today);
        previousWeekEnd.setDate(today.getDate() - 7);
        return this.moodEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= cutoff && entryDate < previousWeekEnd;
        });
      case 'month':
        cutoff.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        cutoff.setMonth(today.getMonth() - 3);
        break;
      default:
        return this.moodEntries;
    }

    return this.moodEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= cutoff;
    });
  }

  private generateAIInsights() {
    this.aiInsights = [];

    if (this.currentMood >= 8) {
      this.aiInsights.push({
        message: `Excellent mood! You're feeling ${this.getMoodLabel(this.currentMood)}. Keep nurturing this positive energy! 🌟`,
        type: 'positive',
        category: 'trend'
      });
    } else if (this.currentMood >= 6) {
      this.aiInsights.push({
        message: `Good mood! You're feeling ${this.getMoodLabel(this.currentMood)}. Maintain this positivity! 😊`,
        type: 'positive',
        category: 'trend'
      });
    } else if (this.currentMood >= 4) {
      this.aiInsights.push({
        message: `Neutral mood. Everything is okay. Consider activities that bring you joy! 🎨`,
        type: 'neutral',
        category: 'recommendation'
      });
    } else {
      this.aiInsights.push({
        message: `You seem to be having a tough time. Remember, emotions are temporary. Consider talking to someone or trying mindfulness. 🧘‍♂️`,
        type: 'suggestion',
        category: 'recommendation'
      });
    }

    if (this.emotionalBalance >= 70) {
      this.aiInsights.push({
        message: `Great emotional balance! ${Math.round(this.emotionalBalance)}% positive moods shows excellent emotional wellbeing! ⚖️`,
        type: 'positive',
        category: 'pattern'
      });
    } else if (this.emotionalBalance >= 50) {
      this.aiInsights.push({
        message: `Good emotional balance. You're managing your emotions well. Keep tracking! 📊`,
        type: 'positive',
        category: 'pattern'
      });
    } else if (this.emotionalBalance > 0) {
      this.aiInsights.push({
        message: `Consider adding more positive activities to your routine to improve emotional balance. 🌈`,
        type: 'suggestion',
        category: 'recommendation'
      });
    }

    if (this.moodTrend === 1) {
      this.aiInsights.push({
        message: `Your mood is trending upward! Whatever you're doing, keep it up! 📈`,
        type: 'positive',
        category: 'trend'
      });
    } else if (this.moodTrend === -1) {
      this.aiInsights.push({
        message: `Your mood trend is slightly down. Check if any patterns are affecting you. 🔍`,
        type: 'warning',
        category: 'pattern'
      });
    }

    if (this.moodConsistency >= 80) {
      this.aiInsights.push({
        message: `Excellent mood consistency! You maintain stable emotional levels. 🎯`,
        type: 'positive',
        category: 'pattern'
      });
    }

    if (this.dominantEmotion) {
      const positiveEmotions = ['Joy', 'Gratitude', 'Peace', 'Contentment', 'Excitement', 'Hope', 'Love', 'Pride', 'Calm'];
      if (positiveEmotions.includes(this.dominantEmotion)) {
        this.aiInsights.push({
          message: `Your dominant emotion "${this.dominantEmotion}" is positive! This greatly impacts your wellbeing. 💫`,
          type: 'positive',
          category: 'pattern'
        });
      } else {
        this.aiInsights.push({
          message: `Your dominant emotion "${this.dominantEmotion}" is challenging. Consider mindfulness or journaling to process it. 📝`,
          type: 'suggestion',
          category: 'recommendation'
        });
      }
    }

    const highMoodHighEnergy = this.moodEntries.filter(entry => entry.mood >= 7 && entry.energyLevel >= 7).length;
    const highMoodLowEnergy = this.moodEntries.filter(entry => entry.mood >= 7 && entry.energyLevel <= 4).length;
    
    if (highMoodHighEnergy > highMoodLowEnergy * 2) {
      this.aiInsights.push({
        message: `High energy often accompanies good moods for you! Keep your energy levels up! ⚡`,
        type: 'correlation',
        category: 'correlation'
      });
    }

    const goodSleepEntries = this.moodEntries.filter(entry => entry.sleepHours >= 7);
    if (goodSleepEntries.length > 0) {
      const avgMoodWithGoodSleep = goodSleepEntries.reduce((sum, entry) => sum + entry.mood, 0) / goodSleepEntries.length;
      if (avgMoodWithGoodSleep > this.averageMood + 1) {
        this.aiInsights.push({
          message: `Good sleep (7+ hours) correlates with better moods for you! Prioritize rest. 😴`,
          type: 'correlation',
          category: 'correlation'
        });
      }
    }

    if (this.aiInsights.length === 0) {
      this.aiInsights.push({
        message: "Start tracking your mood daily to uncover patterns and improve emotional wellbeing! ❤️",
        type: 'neutral',
        category: 'recommendation'
      });
    }

    this.aiInsights = this.aiInsights.slice(0, 5);
  }

  async saveMood() {
    if (this.moodForm.invalid) return;

    this.isLoading = true;
    const formValue = this.moodForm.value;
    
    const selectedMood = this.moodOptions.find(m => m.value === formValue.mood);
    
    const newEntry: MoodEntry = {
      id: this.generateId(),
      ...formValue,
      moodEmoji: selectedMood?.emoji || '😐',
      factors: formValue.factors || [],
      physicalSymptoms: formValue.physicalSymptoms || [],
      tags: formValue.tags || []
    };

    const updatedEntries = [...this.moodEntries, newEntry];

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'moodTracker',
        updatedEntries
      );
      
      this.moodEntries = updatedEntries;
      this.calculateMoodMetrics();
      this.generateAIInsights();
      this.filterEntries();
      this.updatePagination();
      this.moodForm.reset({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mood: 5,
        emotion: '',
        intensity: 3,
        factors: [],
        notes: '',
        physicalSymptoms: [],
        energyLevel: 5,
        sleepHours: 8,
        weather: '',
        location: '',
        tags: []
      });
      this.factors.clear();
      this.physicalSymptoms.clear();
      this.tags.clear();
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
    } catch (error) {
      console.error('Error saving mood:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  filterEntries() {
    let filtered = [...this.moodEntries];

    if (this.filterDateRange !== 'all') {
      filtered = this.getEntriesByDateRange(this.filterDateRange);
    }

    if (this.filterMoodRange !== 'all') {
      switch (this.filterMoodRange) {
        case 'low':
          filtered = filtered.filter(entry => entry.mood <= 3);
          break;
        case 'medium':
          filtered = filtered.filter(entry => entry.mood >= 4 && entry.mood <= 6);
          break;
        case 'high':
          filtered = filtered.filter(entry => entry.mood >= 7);
          break;
      }
    }

    if (this.filterEmotion !== 'all') {
      filtered = filtered.filter(entry => entry.emotion === this.filterEmotion);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    this.updatePagination();
  }

  private updatePagination() {
    this.totalPages = Math.ceil(this.moodEntries.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getDisplayedEntries(): MoodEntry[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.moodEntries.slice(startIndex, endIndex);
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
    return Math.random().toString(36).substr(2, 9);
  }

  getMoodLabel(moodValue: number): string {
    const mood = this.moodOptions.find(m => m.value === Math.round(moodValue));
    return mood?.label || 'Neutral';
  }

  getMoodEmoji(moodValue: number): string {
    const mood = this.moodOptions.find(m => m.value === Math.round(moodValue));
    return mood?.emoji || '😐';
  }

  getMoodColor(moodValue: number): string {
    const mood = this.moodOptions.find(m => m.value === Math.round(moodValue));
    return mood?.color || '#9ca3af';
  }

  getIntensityLabel(intensity: number): string {
    switch (intensity) {
      case 1: return 'Mild';
      case 2: return 'Low';
      case 3: return 'Moderate';
      case 4: return 'Strong';
      case 5: return 'Intense';
      default: return 'Moderate';
    }
  }

  getEnergyLabel(energy: number): string {
    if (energy >= 8) return 'Very High';
    if (energy >= 6) return 'High';
    if (energy >= 4) return 'Moderate';
    if (energy >= 2) return 'Low';
    return 'Very Low';
  }

  async resetMoodTracker() {
    try {
      await this.trackerService.resetTracker(this.userId, 'moodTracker');
      this.moodEntries = [];
      this.currentMood = 0;
      this.averageMood = 0;
      this.currentPage = 1;
      this.aiInsights = [{
        message: "Fresh start! Ready to explore your emotional landscape? 🌈",
        type: 'neutral',
        category: 'recommendation'
      }];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting mood tracker:', error);
    }
  }
}
