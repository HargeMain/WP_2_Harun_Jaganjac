import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface ReadingSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  bookId: string;
  bookTitle: string;
  pagesRead: number;
  totalPages: number;
  duration: number; // in minutes
  notes: string;
  readingType: 'physical' | 'ebook' | 'audiobook';
  rating?: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  totalPages: number;
  currentPage: number;
  status: 'to-read' | 'reading' | 'finished' | 'abandoned';
  startDate?: string;
  finishDate?: string;
  rating?: number;
}

interface ReadingGoal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'book';
  target: number; // pages or books
  current: number;
  period: string; // e.g., '2024-01'
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'failed';
}

interface ReadingInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning' | 'critical';
}

@Component({
  selector: 'app-reading-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './reading-tracker.html',
  styleUrls: ['./reading-tracker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReadingTrackerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  bookForm!: FormGroup;
  sessionForm!: FormGroup;
  goalForm!: FormGroup;
  
  books: Book[] = [];
  readingSessions: ReadingSession[] = [];
  readingGoals: ReadingGoal[] = [];
  readingInsights: ReadingInsight[] = [];
  
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  
  today = new Date().toISOString().split('T')[0];
  todayReadingTime = 0;
  todayPagesRead = 0;
  weeklyReadingTime = 0;
  monthlyReadingTime = 0;
  totalBooksRead = 0;
  totalPagesRead = 0;
  readingStreak = 0;
  averageDailyReading = 0;
  readingScore = 0;
  
  genres = [
    'Fiction',
    'Non-Fiction',
    'Science Fiction',
    'Fantasy',
    'Mystery',
    'Romance',
    'Biography',
    'Self-Help',
    'History',
    'Science',
    'Technology',
    'Business',
    'Philosophy',
    'Poetry',
    'Drama',
    'Other'
  ];
  
  readingTypes = [
    { value: 'physical', label: '📖 Physical Book' },
    { value: 'ebook', label: '📱 E-Book' },
    { value: 'audiobook', label: '🎧 Audiobook' }
  ];
  
  goalTypes = [
    { value: 'daily', label: 'Daily (pages)' },
    { value: 'weekly', label: 'Weekly (pages)' },
    { value: 'monthly', label: 'Monthly (pages)' },
    { value: 'yearly', label: 'Yearly (books)' },
    { value: 'book', label: 'Book Completion' }
  ];
  
  filterDate: string = 'all';
  filterBook: string = 'all';
  filterType: string = 'all';

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

    this.bookForm = this.fb.group({
      title: ['', Validators.required],
      author: ['', Validators.required],
      genre: ['', Validators.required],
      totalPages: [300, [Validators.required, Validators.min(1)]],
      status: ['to-read', Validators.required]
    });

    this.sessionForm = this.fb.group({
      bookId: ['', Validators.required],
      date: [this.today, Validators.required],
      startTime: [currentTime, Validators.required],
      endTime: ['', Validators.required],
      pagesRead: [0, [Validators.required, Validators.min(1)]],
      readingType: ['physical', Validators.required],
      rating: [0],
      notes: ['']
    });

    this.goalForm = this.fb.group({
      type: ['daily', Validators.required],
      target: [50, [Validators.required, Validators.min(1)]],
      startDate: [this.today, Validators.required],
      endDate: [this.getDefaultEndDate('daily'), Validators.required]
    });
  }

  private getDefaultEndDate(goalType: string): string {
    const today = new Date();
    const endDate = new Date(today);
    
    switch(goalType) {
      case 'daily':
        return today.toISOString().split('T')[0];
      case 'weekly':
        endDate.setDate(today.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(today.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(today.getFullYear() + 1);
        break;
      case 'book':
        endDate.setDate(today.getDate() + 30); // 30 days to finish a book
        break;
    }
    
    return endDate.toISOString().split('T')[0];
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadReadingData();
    }
  }

  async loadReadingData() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      const readingData = (trackers?.readingTracker && typeof trackers.readingTracker === 'object' && !Array.isArray(trackers.readingTracker)) 
        ? trackers.readingTracker 
        : { 
            books: [], 
            readingSessions: [], 
            readingGoals: [] 
          };
      
      this.books = (readingData as any).books || [];
      this.readingSessions = (readingData as any).readingSessions || [];
      this.readingGoals = (readingData as any).readingGoals || [];
      
      this.calculateReadingMetrics();
      this.updateReadingProgress();
      this.generateReadingInsights();
      this.filterSessions();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading reading data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateReadingMetrics() {
    const todaySessions = this.readingSessions.filter(session => session.date === this.today);
    this.todayReadingTime = todaySessions.reduce((sum, session) => sum + session.duration, 0);
    this.todayPagesRead = todaySessions.reduce((sum, session) => sum + session.pagesRead, 0);
    
    const last7Days = this.getLastNDays(7);
    this.weeklyReadingTime = this.readingSessions
      .filter(session => last7Days.includes(session.date))
      .reduce((sum, session) => sum + session.duration, 0);
    
    const last30Days = this.getLastNDays(30);
    this.monthlyReadingTime = this.readingSessions
      .filter(session => last30Days.includes(session.date))
      .reduce((sum, session) => sum + session.duration, 0);
    
    this.totalBooksRead = this.books.filter(book => book.status === 'finished').length;
    this.totalPagesRead = this.readingSessions.reduce((sum, session) => sum + session.pagesRead, 0);
    
    this.calculateReadingStreak();
    this.calculateAverageDailyReading();
    this.calculateReadingScore();
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

  private calculateReadingStreak() {
    let streak = 0;
    const today = new Date(this.today);
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = this.readingSessions.filter(session => session.date === dateStr);
      const dayReadingTime = daySessions.reduce((sum, session) => sum + session.duration, 0);
      
      if (dayReadingTime > 0) {
        streak++;
      } else if (i === 0) {
        break;
      } else {
        break;
      }
    }
    
    this.readingStreak = streak;
  }

  private calculateAverageDailyReading() {
    const sessionsWithDates = this.readingSessions.filter(session => session.duration > 0);
    const uniqueDays = new Set(sessionsWithDates.map(session => session.date)).size;
    
    if (uniqueDays > 0) {
      this.averageDailyReading = this.totalPagesRead / uniqueDays;
    } else {
      this.averageDailyReading = 0;
    }
  }

  private calculateReadingScore() {
    const timeScore = Math.min(this.todayReadingTime / 60, 1) * 0.3; // Max 60 minutes today
    const streakScore = Math.min(this.readingStreak / 30, 1) * 0.2; // Max 30-day streak
    const consistencyScore = (this.averageDailyReading / 50) * 0.2; // Target 50 pages daily
    const completionScore = Math.min(this.totalBooksRead / 10, 1) * 0.3; // Max 10 books
    
    this.readingScore = Math.round((timeScore + streakScore + consistencyScore + completionScore) * 100);
  }

  private updateReadingProgress() {
    this.books.forEach(book => {
      if (book.status === 'reading') {
        const bookSessions = this.readingSessions.filter(session => session.bookId === book.id);
        const pagesRead = bookSessions.reduce((sum, session) => sum + session.pagesRead, 0);
        book.currentPage = Math.min(pagesRead, book.totalPages);
        
        if (book.currentPage >= book.totalPages) {
          book.status = 'finished';
          book.finishDate = this.today;
        }
      }
    });
  }

  private generateReadingInsights() {
    this.readingInsights = [];

    if (this.todayReadingTime >= 60) {
      this.readingInsights.push({
        message: `📚 Great job! You've read for ${this.formatMinutes(this.todayReadingTime)} today!`,
        type: 'positive'
      });
    } else if (this.todayReadingTime >= 30) {
      this.readingInsights.push({
        message: `👍 You're making good progress: ${this.formatMinutes(this.todayReadingTime)} today.`,
        type: 'positive'
      });
    } else if (this.todayReadingTime > 0) {
      this.readingInsights.push({
        message: `📖 You've started reading today. Keep going!`,
        type: 'neutral'
      });
    } else {
      this.readingInsights.push({
        message: `⏰ Time to pick up a book! Even 15 minutes of reading can make a difference.`,
        type: 'warning'
      });
    }

    if (this.readingStreak >= 7) {
      this.readingInsights.push({
        message: `🔥 Amazing ${this.readingStreak}-day reading streak! You're building a great habit!`,
        type: 'positive'
      });
    } else if (this.readingStreak >= 3) {
      this.readingInsights.push({
        message: `📈 ${this.readingStreak} days in a row! Consistency is key to building habits.`,
        type: 'positive'
      });
    }

    const activeGoals = this.readingGoals.filter(goal => goal.status === 'active');
    activeGoals.forEach(goal => {
      const progress = (goal.current / goal.target) * 100;
      if (progress >= 100) {
        this.readingInsights.push({
          message: `🎉 Congratulations! You've completed your ${goal.type} reading goal!`,
          type: 'positive'
        });
      } else if (progress >= 75) {
        this.readingInsights.push({
          message: `🎯 You're ${Math.round(100 - progress)}% away from your ${goal.type} goal!`,
          type: 'positive'
        });
      }
    });

    const currentlyReading = this.books.filter(book => book.status === 'reading');
    if (currentlyReading.length === 0) {
      this.readingInsights.push({
        message: `📚 You're not currently reading any books. Start a new one!`,
        type: 'warning'
      });
    }

    if (this.readingScore >= 90) {
      this.readingInsights.push({
        message: `🏆 Excellent reading score: ${this.readingScore}/100! You're a reading champion!`,
        type: 'positive'
      });
    } else if (this.readingScore >= 70) {
      this.readingInsights.push({
        message: `📊 Good reading habits! Your score is ${this.readingScore}/100.`,
        type: 'positive'
      });
    }

    if (this.readingInsights.length === 0) {
      this.readingInsights.push({
        message: "Start tracking your reading to build a lifelong learning habit! 📚",
        type: 'neutral'
      });
    }
  }

  async addBook() {
    if (this.bookForm.invalid) return;

    this.isLoading = true;
    const formValue = this.bookForm.value;
    
    const newBook: Book = {
      id: this.generateId(),
      title: formValue.title,
      author: formValue.author,
      genre: formValue.genre,
      totalPages: formValue.totalPages,
      currentPage: 0,
      status: formValue.status,
      startDate: formValue.status === 'reading' || formValue.status === 'finished' ? this.today : undefined
    };

    const updatedBooks = [...this.books, newBook];
    
    try {
      await this.saveReadingData(updatedBooks, this.readingSessions, this.readingGoals);
      
      this.books = updatedBooks;
      this.calculateReadingMetrics();
      this.generateReadingInsights();
      
      this.bookForm.reset({
        title: '',
        author: '',
        genre: '',
        totalPages: 300,
        status: 'to-read'
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving book:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async addReadingSession() {
    if (this.sessionForm.invalid) return;

    this.isLoading = true;
    const formValue = this.sessionForm.value;
    
    const book = this.books.find(b => b.id === formValue.bookId);
    if (!book) {
      this.isLoading = false;
      return;
    }

    const startTime = new Date(`${formValue.date}T${formValue.startTime}`);
    const endTime = new Date(`${formValue.date}T${formValue.endTime}`);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    const newSession: ReadingSession = {
      id: this.generateId(),
      date: formValue.date,
      startTime: formValue.startTime,
      endTime: formValue.endTime,
      bookId: formValue.bookId,
      bookTitle: book.title,
      pagesRead: formValue.pagesRead,
      totalPages: book.totalPages,
      duration: duration > 0 ? duration : 30, // Default 30 minutes if end time is before start
      notes: formValue.notes || '',
      readingType: formValue.readingType,
      rating: formValue.rating || undefined
    };

    const updatedSessions = [...this.readingSessions, newSession];
    const updatedGoals = this.updateGoalsWithSession(newSession);
    
    try {
      await this.saveReadingData(this.books, updatedSessions, updatedGoals);
      
      this.readingSessions = updatedSessions;
      this.readingGoals = updatedGoals;
      this.updateReadingProgress();
      this.calculateReadingMetrics();
      this.generateReadingInsights();
      this.filterSessions();
      
      const now = new Date();
      const currentTime = now.toTimeString().split(':').slice(0, 2).join(':');
      
      this.sessionForm.reset({
        bookId: '',
        date: this.today,
        startTime: currentTime,
        endTime: '',
        pagesRead: 0,
        readingType: 'physical',
        rating: 0,
        notes: ''
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving reading session:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async addReadingGoal() {
    if (this.goalForm.invalid) return;

    this.isLoading = true;
    const formValue = this.goalForm.value;
    
    const newGoal: ReadingGoal = {
      id: this.generateId(),
      type: formValue.type,
      target: formValue.target,
      current: 0,
      period: this.getPeriodForGoal(formValue.type, formValue.startDate),
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      status: 'active'
    };

    const updatedGoals = [...this.readingGoals, newGoal];
    
    try {
      await this.saveReadingData(this.books, this.readingSessions, updatedGoals);
      
      this.readingGoals = updatedGoals;
      this.generateReadingInsights();
      
      this.goalForm.reset({
        type: 'daily',
        target: 50,
        startDate: this.today,
        endDate: this.getDefaultEndDate('daily')
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving reading goal:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private getPeriodForGoal(goalType: string, startDate: string): string {
    const date = new Date(startDate);
    
    switch(goalType) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekNumber = Math.ceil(date.getDate() / 7);
        return `${date.getFullYear()}-W${weekNumber}`;
      case 'monthly':
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      case 'yearly':
        return date.getFullYear().toString();
      case 'book':
        return `book-${this.generateId().substring(0, 8)}`;
      default:
        return 'custom';
    }
  }

  private updateGoalsWithSession(session: ReadingSession): ReadingGoal[] {
    const updatedGoals = [...this.readingGoals];
    const sessionDate = new Date(session.date);
    
    updatedGoals.forEach(goal => {
      const goalStart = new Date(goal.startDate);
      const goalEnd = new Date(goal.endDate);
      
      if (sessionDate >= goalStart && sessionDate <= goalEnd) {
        if (goal.type === 'book') {
          const book = this.books.find(b => b.id === session.bookId);
          if (book && book.status === 'finished') {
            goal.current += 1;
          }
        } else {
          goal.current += session.pagesRead;
        }
        
        if (goal.current >= goal.target && goal.status === 'active') {
          goal.status = 'completed';
        }
      }
    });
    
    return updatedGoals;
  }

  async deleteReadingSession(sessionId: string) {
    const updatedSessions = this.readingSessions.filter(session => session.id !== sessionId);
    
    try {
      await this.saveReadingData(this.books, updatedSessions, this.readingGoals);
      
      this.readingSessions = updatedSessions;
      this.updateReadingProgress();
      this.calculateReadingMetrics();
      this.generateReadingInsights();
      this.filterSessions();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting reading session:', error);
    }
  }

  async updateBookStatus(bookId: string, newStatus: Book['status']) {
    const updatedBooks = [...this.books];
    const bookIndex = updatedBooks.findIndex(book => book.id === bookId);
    
    if (bookIndex > -1) {
      updatedBooks[bookIndex].status = newStatus;
      
      if (newStatus === 'reading' && !updatedBooks[bookIndex].startDate) {
        updatedBooks[bookIndex].startDate = this.today;
      }
      
      if (newStatus === 'finished') {
        updatedBooks[bookIndex].finishDate = this.today;
        updatedBooks[bookIndex].currentPage = updatedBooks[bookIndex].totalPages;
      }
      
      try {
        await this.saveReadingData(updatedBooks, this.readingSessions, this.readingGoals);
        
        this.books = updatedBooks;
        this.calculateReadingMetrics();
        this.generateReadingInsights();
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error updating book status:', error);
      }
    }
  }

  private async saveReadingData(books: Book[], readingSessions: ReadingSession[], readingGoals: ReadingGoal[]) {
    const readingData = {
      books,
      readingSessions,
      readingGoals,
      lastUpdated: new Date().toISOString()
    };
    
    await this.trackerService.updateTracker(
      this.userId,
      'readingTracker',
      readingData
    );
  }

  filterSessions() {
    this.updatePagination();
    this.cdr.detectChanges();
  }

  getFilteredSessions(): ReadingSession[] {
    return this.readingSessions.filter(session => {
      if (this.filterDate !== 'all' && session.date !== this.filterDate) return false;
      if (this.filterBook !== 'all' && session.bookId !== this.filterBook) return false;
      if (this.filterType !== 'all' && session.readingType !== this.filterType) return false;
      return true;
    });
  }

  private updatePagination() {
    const filtered = this.getFilteredSessions();
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getDisplayedSessions(): ReadingSession[] {
    const filtered = this.getFilteredSessions();
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

  formatMinutes(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  getReadingTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      physical: '📖',
      ebook: '📱',
      audiobook: '🎧'
    };
    return icons[type] || '📖';
  }

  getBookStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'to-read': '📚',
      'reading': '🔖',
      'finished': '✅',
      'abandoned': '❌'
    };
    return icons[status] || '📚';
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return '#10b981';
    if (progress >= 75) return '#3b82f6';
    if (progress >= 50) return '#f59e0b';
    if (progress >= 25) return '#f97316';
    return '#ef4444';
  }

  getBookProgress(book: Book): number {
    if (book.totalPages === 0) return 0;
    return (book.currentPage / book.totalPages) * 100;
  }

  getGoalProgress(goal: ReadingGoal): number {
    if (goal.target === 0) return 0;
    return (goal.current / goal.target) * 100;
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'active': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getDateDisplay(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  getFullDateDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  getDayName(dateString: string): string {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  getUniqueDates(): string[] {
    const dates = [...new Set(this.readingSessions.map(session => session.date))];
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }

  getCurrentlyReadingBooks(): Book[] {
    return this.books.filter(book => book.status === 'reading');
  }

  getActiveGoals(): ReadingGoal[] {
    return this.readingGoals.filter(goal => goal.status === 'active');
  }

  async resetReadingTracker() {
      try {
        await this.trackerService.resetTracker(this.userId, 'readingTracker');
        this.books = [];
        this.readingSessions = [];
        this.readingGoals = [];
        this.calculateReadingMetrics();
        this.readingInsights = [{
          message: "Fresh start! Time to discover new books! 📚",
          type: 'neutral'
        }];
        this.currentPage = 1;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error resetting reading tracker:', error);
    }
  }
}