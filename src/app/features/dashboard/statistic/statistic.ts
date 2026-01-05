import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';
import { HeaderComponent } from '../../../shared/components/header/header';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { AppUser } from '../../../core/models/user.model';
import Chart from 'chart.js/auto';
import { Firestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { jsPDF } from 'jspdf';

interface Trackers {
  financeTracker?: {
    accounts: Account[];
    budgets: Budget[];
    lastUpdated: string;
    income?: number;
    expenses?: number;
  };
  waterIntake?: {
    dailyIntakes: WaterIntake[];
    weeklyHistory: DailySummary[];
    settings: { goal: number };
    lastUpdated: string
  };
  readingTracker?: {
    books: Book[];
    readingSessions: ReadingSession[];
    readingGoals: ReadingGoal[];
    lastUpdated: string;
    yearlyGoal?: number;
  };
  moodTracker?: {
    entries: MoodEntry[];
    lastUpdated: string;
    averageMood?: number;
  };
}

interface Account {
  name: string;
  balance: number;
}

interface Budget {
  category: string;
  allocated: number;
  spent?: number;
}

interface WaterIntake {
  date: string;
  amount: number;
  time?: string;
}

interface DailySummary {
  date: string;
  amount: number;
}

interface Book {
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: 'reading' | 'completed' | 'planned';
}

interface ReadingSession {
  date: string;
  pagesRead: number;
  duration: number;
  bookId?: string;
}

interface ReadingGoal {
  type: string;
  target: number;
  current: number;
  deadline?: string;
}

interface MoodEntry {
  date: string;
  mood: number;
  notes?: string;
  tags?: string[];
}

interface ChartConfig {
  type: string;
  title: string;
  icon: string;
  isDragging: boolean;
}

interface AIInsight {
  type: string;
  message: string;
  confidence: number;
  suggestion?: string;
  timestamp: Date;
}

interface ChartStats {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

interface AITrend {
  title: string;
  description: string;
  progress: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-statistic-page',
  standalone: true,
  imports: [CommonModule, DrawerMenu, HeaderComponent, FooterComponent, CdkDrag, CdkDropList],
  templateUrl: './statistic.html',
  styleUrls: ['./statistic.css']
})
export class StatisticPageComponent implements OnInit, AfterViewInit, OnDestroy {
  primaryColor: string = '#2196F3';
  secondaryColor: string = '#FF4081';
  role?: 'admin' | 'user';
  username?: string;
  userId?: string;
  isDrawerOpen = false;
  private resizeTimeout?: any;

  isLoading: boolean = true;
  isRefreshing: boolean = false;
  loadingProgress: number = 0;
  loadingTips: string[] = [
    "Analyzing your financial patterns...",
    "Calculating hydration trends...",
    "Processing reading habits...",
    "Evaluating mood correlations...",
    "Generating personalized insights..."
  ];
  currentTip: number = 0;
  aiParticles: any[] = [];

  showAIInsights: boolean = true;
  aiInsights: AIInsight[] = [];
  aiSummary: string = '';
  aiTrends: AITrend[] = [];

  fullscreenChart: string | null = null;
  highlightedChart: string | null = null;

  private firestore: Firestore;
  private trackers: Trackers | null = null;

  private financeChart?: Chart;
  private waterChart?: Chart;
  private readingChart?: Chart;
  private moodChart?: Chart;

  private fullscreenFinanceChart?: Chart;
  private fullscreenWaterChart?: Chart;
  private fullscreenReadingChart?: Chart;
  private fullscreenMoodChart?: Chart;

  financeData: any = { labels: [], data: [], categories: [] };
  waterData: any = { labels: [], data: [], goal: 2000 };
  readingData: any = { labels: [], data: [], books: [] };
  moodData: any = { labels: [], data: [], average: 3 };

  chartOrder: ChartConfig[] = [
    { type: 'finance', title: 'Finance Tracker', icon: 'attach_money', isDragging: false },
    { type: 'water', title: 'Water Intake', icon: 'local_drink', isDragging: false },
    { type: 'reading', title: 'Reading Tracker', icon: 'book', isDragging: false },
    { type: 'mood', title: 'Mood Tracker', icon: 'mood', isDragging: false }
  ];

  @ViewChild('financeCanvas') financeCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('waterCanvas') waterCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('readingCanvas') readingCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('moodCanvas') moodCanvas?: ElementRef<HTMLCanvasElement>;

  constructor() {
    this.firestore = getFirestore();
    this.generateAIParticles();
  }

  ngOnInit() {
    this.loadUserPreferences();
    this.loadChartOrder();
    this.startLoadingSimulation();

    if (this.userId) {
      this.loadTrackers();
    }
  }

  ngAfterViewInit() {
    this.updateCharts();
  }

  ngOnDestroy() {
    this.destroyAllCharts();
  }

  @HostListener('window:resize')
  onResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateCharts();
    }, 300);
  }

  private startLoadingSimulation() {
    const interval = setInterval(() => {
      this.loadingProgress += 10;
      this.currentTip = Math.floor(Math.random() * this.loadingTips.length);

      if (this.loadingProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this.isLoading = false;
        }, 500);
      }
    }, 200);
  }

  private generateAIParticles() {
    this.aiParticles = Array.from({ length: 8 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 2}s`,
      background: this.secondaryColor
    }));
  }

  private loadUserPreferences() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user: AppUser = JSON.parse(storedUser);
      this.primaryColor = user.primaryColor || this.primaryColor;
      this.secondaryColor = user.secondaryColor || this.secondaryColor;
      this.role = user.role;
      this.username = user.name;
      this.userId = user.uid;
    }
  }

  private loadChartOrder() {
    const savedOrder = localStorage.getItem('chartOrder');
    if (savedOrder) {
      this.chartOrder = JSON.parse(savedOrder);
    }
  }

  private saveChartOrder() {
    localStorage.setItem('chartOrder', JSON.stringify(this.chartOrder));
  }

  private async loadTrackers() {
    if (!this.userId) return;

    try {
      const trackers = await this.getTrackers(this.userId);
      this.trackers = trackers;
      this.prepareChartData();
      this.generateAIInsights();
      this.generateAISummary();
      this.generateTrends();
      this.updateCharts();
    } catch (error) {
      console.error('Error loading trackers:', error);
    }
  }

  private prepareChartData() {
    if (!this.trackers) return;

    const finance = this.trackers.financeTracker;
    if (finance && finance.budgets) {
      this.financeData.labels = finance.budgets.map(b => b.category);
      this.financeData.data = finance.budgets.map(b => b.spent || 0);
      this.financeData.categories = finance.budgets.map(b => ({
        category: b.category,
        allocated: b.allocated,
        spent: b.spent || 0,
        remaining: b.allocated - (b.spent || 0)
      }));
    }

    const water = this.trackers.waterIntake;
    if (water && water.dailyIntakes) {
      const last7Days = water.dailyIntakes
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7);

      this.waterData.labels = last7Days.map(d =>
        new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
      );
      this.waterData.data = last7Days.map(d => d.amount);
      this.waterData.goal = water.settings?.goal || 2000;
    }

    const reading = this.trackers.readingTracker;
    if (reading && reading.readingSessions) {
      const last14Days = this.getLastNDays(14);
      const pagesByDate = reading.readingSessions.reduce((acc: { [date: string]: number }, session) => {
        acc[session.date] = (acc[session.date] || 0) + session.pagesRead;
        return acc;
      }, {});

      this.readingData.labels = last14Days.map(date =>
        new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      this.readingData.data = last14Days.map(date => pagesByDate[date] || 0);
      this.readingData.books = reading.books || [];
    }

    const mood = this.trackers.moodTracker;

    if (mood && mood.entries) {
      const entriesArray: MoodEntry[] = Array.isArray(mood.entries)
        ? mood.entries
        : Object.values(mood.entries);

      const last30Days = this.getLastNDays(30);

      this.moodData.labels = last30Days.map(date =>
        new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );

      const moodByDate = entriesArray.reduce(
        (acc: { [date: string]: number[] }, entry) => {
          if (!acc[entry.date]) acc[entry.date] = [];
          acc[entry.date].push(entry.mood);
          return acc;
        },
        {}
      );

      this.moodData.data = last30Days.map(date => {
        const moods = moodByDate[date];
        return moods ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
      });

      this.moodData.average = mood.averageMood || 3;
    }

  }

  private getLastNDays(n: number): string[] {
    const dates: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  private generateAIInsights() {
    this.aiInsights = [];

    if (this.financeData.data.length > 0) {
      const totalSpent = this.financeData.data.reduce((a: number, b: number) => a + b, 0);
      const avgSpent = totalSpent / this.financeData.data.length;

      let financeMessage = '';
      let confidence = 85;

      if (totalSpent > 1000) {
        financeMessage = `You've spent $${totalSpent.toFixed(2)} this month. Consider reviewing discretionary expenses.`;
      } else if (totalSpent < 500) {
        financeMessage = `Great job keeping expenses low at $${totalSpent.toFixed(2)}! You're on track for savings.`;
      } else {
        financeMessage = `Your spending is moderate at $${totalSpent.toFixed(2)}. Keep tracking to optimize your budget.`;
      }

      this.aiInsights.push({
        type: 'finance',
        message: financeMessage,
        confidence,
        suggestion: 'Try categorizing expenses for better insights',
        timestamp: new Date()
      });
    }

    if (this.waterData.data.length > 0) {
      const avgWater = this.waterData.data.reduce((a: number, b: number) => a + b, 0) / this.waterData.data.length;
      const goalMet = avgWater >= this.waterData.goal;

      this.aiInsights.push({
        type: 'water',
        message: goalMet
          ? `Excellent! You're averaging ${avgWater.toFixed(0)}ml daily, meeting your ${this.waterData.goal}ml goal.`
          : `You're averaging ${avgWater.toFixed(0)}ml daily. Try increasing by ${(this.waterData.goal - avgWater).toFixed(0)}ml to reach your goal.`,
        confidence: 92,
        suggestion: 'Set reminders to drink water regularly',
        timestamp: new Date()
      });
    }

    if (this.readingData.data.length > 0) {
      const totalPages = this.readingData.data.reduce((a: number, b: number) => a + b, 0);
      const avgDaily = totalPages / this.readingData.data.filter((d: number) => d > 0).length || 0;

      this.aiInsights.push({
        type: 'reading',
        message: `You've read ${totalPages} pages recently. ${avgDaily > 20 ? 'Impressive pace!' : 'Try setting daily reading goals.'}`,
        confidence: 78,
        suggestion: 'Join a reading challenge to stay motivated',
        timestamp: new Date()
      });
    }

    if (this.moodData.data.length > 0) {
      const nonNull = this.moodData.data.filter((v: number | null): v is number => v !== null);
      const avgMood = nonNull.length > 0 ? nonNull.reduce((a: number, b: number) => a + b, 0) / nonNull.length : 0;
      const trend = this.calculateTrend(nonNull);

      let moodMessage = '';
      if (avgMood >= 4) moodMessage = 'Your mood has been consistently positive!';
      else if (avgMood >= 3) moodMessage = 'Your mood is stable and balanced.';
      else moodMessage = 'Consider activities that boost your mood.';

      this.aiInsights.push({
        type: 'mood',
        message: `${moodMessage} Average: ${avgMood.toFixed(1)}/5, Trend: ${trend}.`,
        confidence: 88,
        suggestion: 'Track mood triggers to identify patterns',
        timestamp: new Date()
      });
    }
  }

  private generateAISummary() {
    if (this.aiInsights.length === 0) {
      this.aiSummary = 'No data available for AI analysis. Start tracking your activities to get insights.';
      return;
    }

    const summaryParts: string[] = [];

    if (this.financeData.data.length > 0) {
      const totalSpent = this.financeData.data.reduce((a: number, b: number) => a + b, 0);
      summaryParts.push(`<strong>Financial Health:</strong> ${totalSpent > 1000 ? 'Review spending' : 'Good control'}`);
    }

    if (this.waterData.data.length > 0) {
      const avgWater = this.waterData.data.reduce((a: number, b: number) => a + b, 0) / this.waterData.data.length;
      summaryParts.push(`<strong>Hydration:</strong> ${avgWater >= this.waterData.goal ? 'Goal met' : 'Needs improvement'}`);
    }

    if (this.readingData.data.length > 0) {
      const readingDays = this.readingData.data.filter((d: number) => d > 0).length;
      summaryParts.push(`<strong>Reading:</strong> ${readingDays >= 7 ? 'Consistent' : 'Irregular'} habit`);
    }

    if (this.moodData.data.length > 0) {
      const nonNull = this.moodData.data.filter((v: number | null): v is number => v !== null);
      const avgMood: number = nonNull.length > 0 ? nonNull.reduce((a: number, b: number) => a + b, 0) / nonNull.length : 0;
      summaryParts.push(`<strong>Mood:</strong> ${avgMood >= 3.5 ? 'Positive' : 'Needs attention'}`);
    }

    this.aiSummary = `Based on your recent activity: ${summaryParts.join(', ')}. 
    <br><br><em>Recommendation:</em> ${this.getOverallRecommendation()}`;
  }

  private generateTrends() {
    this.aiTrends = [
      {
        title: 'Financial Growth',
        description: 'Based on current savings rate',
        progress: Math.min(100, (this.financeData.data.length > 0 ? 65 : 30)),
        icon: 'fas fa-chart-line',
        color: this.primaryColor
      },
      {
        title: 'Health Consistency',
        description: 'Hydration and activity patterns',
        progress: Math.min(100, (this.waterData.data.length > 0 ? 80 : 40)),
        icon: 'fas fa-heartbeat',
        color: this.secondaryColor
      },
      {
        title: 'Learning Progress',
        description: 'Reading and skill development',
        progress: Math.min(100, (this.readingData.data.length > 0 ? 75 : 35)),
        icon: 'fas fa-graduation-cap',
        color: '#4CAF50'
      },
      {
        title: 'Well-being Index',
        description: 'Mood and stress levels',
        progress: Math.min(100, (this.moodData.data.length > 0 ? 70 : 45)),
        icon: 'fas fa-brain',
        color: '#9C27B0'
      }
    ];
  }

  private getOverallRecommendation(): string {
    const recommendations: string[] = [];

    if (this.financeData.data.length === 0) {
      recommendations.push('start tracking expenses');
    }
    if (this.waterData.data.length === 0) {
      recommendations.push('log daily water intake');
    }
    if (this.readingData.data.length === 0) {
      recommendations.push('set reading goals');
    }
    if (this.moodData.data.length === 0) {
      recommendations.push('track your mood daily');
    }

    if (recommendations.length === 0) {
      return 'Continue your current habits and consider setting higher goals for continuous improvement.';
    }

    return `Focus on ${recommendations.join(', ')} to get the most from your dashboard.`;
  }

  private calculateTrend(data: number[]): string {
    if (data.length < 2) return 'insufficient data';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const difference = avgSecond - avgFirst;

    if (difference > 0.5) return 'significantly improving';
    if (difference > 0.1) return 'improving';
    if (difference < -0.5) return 'declining';
    if (difference < -0.1) return 'slightly declining';
    return 'stable';
  }

  private createCharts() {
    setTimeout(() => {
      this.createFinanceChart();
      this.createWaterChart();
      this.createReadingChart();
      this.createMoodChart();
    }, 300);
  }

  private createFinanceChart() {
    if (!this.financeCanvas || this.financeData.data.length === 0) return;

    if (this.financeChart) {
      this.financeChart.destroy();
      this.financeChart = undefined;
    }

    const ctx = this.financeCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.financeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.financeData.labels,
        datasets: [{
          data: this.financeData.data,
          backgroundColor: [
            this.primaryColor,
            this.secondaryColor,
            '#4CAF50',
            '#FF9800',
            '#9C27B0',
            '#00BCD4'
          ],
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: this.primaryColor,
              font: { family: 'Poppins', size: 11 },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: this.primaryColor,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${context.label}: $${value} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 2000
        }
      }
    });
  }

  private createWaterChart() {
    if (!this.waterCanvas || this.waterData.data.length === 0) return;


    if (this.waterChart) {
      this.waterChart.destroy();
      this.waterChart = undefined;
    }

    const ctx = this.waterCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, this.primaryColor + 'CC');
    gradient.addColorStop(1, this.primaryColor + '33');

    this.waterChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.waterData.labels,
        datasets: [{
          label: 'Water Intake (ml)',
          data: this.waterData.data,
          backgroundColor: gradient,
          borderColor: this.primaryColor,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }, {
          label: 'Daily Goal',
          data: Array(this.waterData.labels.length).fill(this.waterData.goal),
          type: 'line',
          borderColor: this.secondaryColor,
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: this.primaryColor },
            title: {
              display: true,
              text: 'Milliliters (ml)',
              color: this.primaryColor
            }
          },
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: this.primaryColor }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: this.primaryColor,
              font: { family: 'Poppins', size: 12 }
            }
          }
        }
      }
    });
  }

  private createReadingChart() {
    if (!this.readingCanvas || this.readingData.data.length === 0) return;

    if (this.readingChart) {
      this.readingChart.destroy();
      this.readingChart = undefined;
    }

    const ctx = this.readingCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, this.primaryColor + 'DD');
    gradient.addColorStop(1, this.primaryColor + '44');

    this.readingChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.readingData.labels,
        datasets: [{
          label: 'Pages Read',
          data: this.readingData.data,
          backgroundColor: gradient,
          borderColor: this.primaryColor,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: this.secondaryColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: this.primaryColor },
            title: {
              display: true,
              text: 'Pages',
              color: this.primaryColor
            }
          },
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              color: this.primaryColor,
              maxTicksLimit: 7
            }
          }
        }
      }
    });
  }

  private createMoodChart() {
    if (!this.moodCanvas || this.moodData.data.length === 0) return;

    if (this.moodChart) {
      this.moodChart.destroy();
      this.moodChart = undefined;
    }

    const ctx = this.moodCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, this.secondaryColor + 'CC');
    gradient.addColorStop(1, this.secondaryColor + '33');

    this.moodChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.moodData.labels,
        datasets: [{
          label: 'Mood Score (1-5)',
          data: this.moodData.data,
          backgroundColor: gradient,
          borderColor: this.secondaryColor,
          borderWidth: 3,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: this.primaryColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7
        }, {
          label: 'Average',
          data: Array(this.moodData.labels.length).fill(this.moodData.average),
          type: 'line',
          borderColor: this.primaryColor,
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              color: this.secondaryColor
            },
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            title: {
              display: true,
              text: 'Mood Level',
              color: this.secondaryColor
            }
          },
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              color: this.secondaryColor,
              maxTicksLimit: 10
            }
          }
        }
      }
    });
  }

  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }

  drop(event: CdkDragDrop<ChartConfig[]>) {
    moveItemInArray(this.chartOrder, event.previousIndex, event.currentIndex);
    this.saveChartOrder();

    this.chartOrder.forEach(chart => chart.isDragging = false);
    this.highlightedChart = this.chartOrder[event.currentIndex].type;

    setTimeout(() => {
      this.highlightedChart = null;
    }, 1000);
  }

  toggleAIInsights() {
    this.showAIInsights = !this.showAIInsights;
    localStorage.setItem('showAIInsights', JSON.stringify(this.showAIInsights));
  }

  async refreshData() {
    this.isRefreshing = true;
    this.loadingProgress = 0;

    const interval = setInterval(() => {
      this.loadingProgress += 20;
      if (this.loadingProgress >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          await this.loadTrackers();
          this.updateCharts();
          this.isRefreshing = false;
          this.loadingProgress = 0;
        }, 500);
      }
    }, 200);
  }

  toggleFullscreen(chartType: string) {
    this.fullscreenChart = chartType;
    setTimeout(() => {
      this.createFullscreenChart(chartType);
    }, 100);
  }

  closeFullscreen() {
    this.fullscreenChart = null;
    this.destroyFullscreenCharts();
  }

  private createFullscreenChart(chartType: string) {
    const canvasId = `fullscreen-${chartType}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    switch (chartType) {
      case 'finance':
        this.createFullscreenFinanceChart(ctx);
        break;
      case 'water':
        this.createFullscreenWaterChart(ctx);
        break;
      case 'reading':
        this.createFullscreenReadingChart(ctx);
        break;
      case 'mood':
        this.createFullscreenMoodChart(ctx);
        break;
    }
  }

  private createFullscreenFinanceChart(ctx: CanvasRenderingContext2D) {
    this.fullscreenFinanceChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: this.financeData.labels,
        datasets: [{
          data: this.financeData.data,
          backgroundColor: [
            this.primaryColor,
            this.secondaryColor,
            '#4CAF50',
            '#FF9800',
            '#9C27B0',
            '#00BCD4'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Financial Overview',
            font: { size: 24, family: 'Poppins' },
            color: this.primaryColor
          }
        }
      }
    });
  }

  private createFullscreenWaterChart(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 500);
    gradient.addColorStop(0, this.primaryColor + 'CC');
    gradient.addColorStop(1, this.primaryColor + '33');

    this.fullscreenWaterChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.waterData.labels,
        datasets: [{
          label: 'Water Intake (ml)',
          data: this.waterData.data,
          backgroundColor: gradient
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Water Consumption',
            font: { size: 24, family: 'Poppins' },
            color: this.primaryColor
          }
        }
      }
    });
  }

  private createFullscreenReadingChart(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 500);
    gradient.addColorStop(0, this.primaryColor + 'DD');
    gradient.addColorStop(1, this.primaryColor + '44');

    this.fullscreenReadingChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.readingData.labels,
        datasets: [{
          label: 'Pages Read',
          data: this.readingData.data,
          backgroundColor: gradient,
          borderColor: this.primaryColor,
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Reading Progress',
            font: { size: 24, family: 'Poppins' },
            color: this.primaryColor
          }
        }
      }
    });
  }

  private createFullscreenMoodChart(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 500);
    gradient.addColorStop(0, this.secondaryColor + 'CC');
    gradient.addColorStop(1, this.secondaryColor + '33');

    this.fullscreenMoodChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.moodData.labels,
        datasets: [{
          label: 'Mood Score (1-5)',
          data: this.moodData.data,
          backgroundColor: gradient,
          borderColor: this.secondaryColor,
          borderWidth: 3,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Mood Tracking',
            font: { size: 24, family: 'Poppins' },
            color: this.secondaryColor
          }
        }
      }
    });
  }

  downloadChart(chartType: string) {
    const canvas = this.getChartCanvas(chartType);
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${chartType}-chart-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  private getChartCanvas(chartType: string): HTMLCanvasElement | null {
    switch (chartType) {
      case 'finance': return this.financeCanvas?.nativeElement || null;
      case 'water': return this.waterCanvas?.nativeElement || null;
      case 'reading': return this.readingCanvas?.nativeElement || null;
      case 'mood': return this.moodCanvas?.nativeElement || null;
      default: return null;
    }
  }

  async generateReport() {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    doc.setFontSize(24);
    doc.setTextColor(...this.hexToRgb(this.primaryColor));
    doc.text('Personal Statistics Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on ${date}`, 105, 30, { align: 'center' });

    let yPos = 40;
    const chartPromises = this.chartOrder.map(async (chart, index) => {
      const canvas = this.getChartCanvas(chart.type);
      if (canvas) {
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 10, yPos, 190, 80);
        yPos += 90;
      }
    });

    await Promise.all(chartPromises);

    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(...this.hexToRgb(this.primaryColor));
    doc.text('AI Insights Summary', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(60);
    const splitText = doc.splitTextToSize(this.aiSummary.replace(/<[^>]*>/g, ''), 170);
    doc.text(splitText, 20, 40);

    doc.save(`statistics-report-${date}.pdf`);
  }

  shareInsights() {
    if (navigator.share) {
      navigator.share({
        title: 'My Statistics Insights',
        text: `Check out my statistics dashboard insights!\n\n${this.aiSummary.replace(/<[^>]*>/g, '')}`,
        url: window.location.href
      });
    } else {
      const text = `Statistics Dashboard Insights:\n\n${this.aiSummary.replace(/<[^>]*>/g, '')}\n\nView more at: ${window.location.href}`;
      navigator.clipboard.writeText(text).then(() => {
        alert('Insights copied to clipboard!');
      });
    }
  }

  applySuggestion(chartType: string) {
    const insight = this.aiInsights.find(i => i.type === chartType);
    if (!insight) return;

      console.log(`Applying suggestion for ${chartType}:`, insight.suggestion);

      this.highlightedChart = chartType;
      setTimeout(() => {
        this.highlightedChart = null;
      }, 1500);
  }

  getChartType(chartType: string): string {
    const types: { [key: string]: string } = {
      'finance': 'Doughnut',
      'water': 'Bar',
      'reading': 'Line',
      'mood': 'Line'
    };
    return types[chartType] || 'Chart';
  }

  getChartStats(chartType: string): ChartStats[] {
    switch (chartType) {
      case 'finance':
        const totalSpent = this.financeData.data.reduce((a: number, b: number) => a + b, 0);
        const avgSpent = this.financeData.data.length > 0 ? totalSpent / this.financeData.data.length : 0;
        return [
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}` },
          { label: 'Avg/Week', value: `$${avgSpent.toFixed(2)}` },
          { label: 'Categories', value: this.financeData.labels.length.toString() }
        ];

      case 'water':
        const totalWater = this.waterData.data.reduce((a: number, b: number) => a + b, 0);
        const avgWater = this.waterData.data.length > 0 ? totalWater / this.waterData.data.length : 0;
        const goalPercentage = Math.min(100, Math.round((avgWater / this.waterData.goal) * 100));
        return [
          { label: 'Daily Avg', value: `${avgWater.toFixed(0)}ml` },
          { label: 'Goal Progress', value: `${goalPercentage}%` },
          { label: 'Total', value: `${totalWater.toFixed(0)}ml` }
        ];

      case 'reading':
        const totalPages = this.readingData.data.reduce((a: number, b: number) => a + b, 0);
        const readingDays = this.readingData.data.filter((d: number) => d > 0).length;
        const streak = this.calculateStreak(this.readingData.data);
        return [
          { label: 'Total Pages', value: totalPages.toString() },
          { label: 'Reading Days', value: readingDays.toString() },
          { label: 'Current Streak', value: `${streak} days` }
        ];

      case 'mood':
        const nonNull = this.moodData.data.filter((v: number | null): v is number => v !== null);
        const avgMood = nonNull.length > 0 ? nonNull.reduce((a: number, b: number) => a + b, 0) / nonNull.length : 0;
        const bestDay = nonNull.length > 0 ? Math.max(...nonNull) : 0;
        const consistency = this.calculateConsistency(nonNull);
        return [
          { label: 'Average Mood', value: avgMood.toFixed(1) },
          { label: 'Best Day', value: bestDay.toFixed(1) },
          { label: 'Consistency', value: `${consistency}%` }
        ];

      default:
        return [];
    }
  }

  getChartInsight(chartType: string): AIInsight | null {
    return this.aiInsights.find(insight => insight.type === chartType) || null;
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 90) return '#4CAF50';
    if (confidence >= 75) return '#FF9800';
    return '#F44336';
  }

  private calculateStreak(data: number[]): number {
    let streak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] > 0) streak++;
      else break;
    }
    return streak;
  }

  private calculateConsistency(data: number[]): number {
    if (data.length < 2) return 100;
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (stdDev * 20));
    return Math.round(consistency);
  }

  private updateCharts() {
    this.destroyAllCharts();
    this.createCharts();
  }

  private destroyAllCharts() {
    if (this.financeChart) {
      this.financeChart.destroy();
      this.financeChart = undefined;
    }
    if (this.waterChart) {
      this.waterChart.destroy();
      this.waterChart = undefined;
    }
    if (this.readingChart) {
      this.readingChart.destroy();
      this.readingChart = undefined;
    }
    if (this.moodChart) {
      this.moodChart.destroy();
      this.moodChart = undefined;
    }
  }


  private destroyFullscreenCharts() {
    [
      this.fullscreenFinanceChart,
      this.fullscreenWaterChart,
      this.fullscreenReadingChart,
      this.fullscreenMoodChart
    ].forEach(chart => chart?.destroy());
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  async getTrackers(userId: string): Promise<Trackers | null> {
    try {
      const trackerRef = doc(this.firestore, 'trackers', userId);
      const snap = await getDoc(trackerRef);
      return snap.exists() ? (snap.data() as Trackers) : null;
    } catch (error) {
      console.error('Error loading trackers:', error);
      return null;
    }
  }
}