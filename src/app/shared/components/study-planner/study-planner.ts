import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface StudyEntry {
  date: string;
  studies: {
    subject: string;
    duration: number;
    completed: boolean;
  }[];
}

interface StudyInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning';
}

@Component({
  selector: 'app-study-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './study-planner.html',
  styleUrls: ['./study-planner.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudyPlannerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  studyForm!: FormGroup;
  studyEntries: StudyEntry[] = [];
  aiInsights: StudyInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  todayStudyTime = 0;
  dailyStudyGoal = 120;
  studyProgress = 0;
  averageStudyTime = 0;
  currentStreak = 0;
  completionRate = 0;
  focusedSubjects = 0;

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.studyForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      studies: this.fb.array([])
    });
  }

  get studies(): FormArray {
    return this.studyForm.get('studies') as FormArray;
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadStudies();
    }
  }

  addStudy() {
    this.studies.push(this.fb.group({
      subject: ['', Validators.required],
      duration: [0, [Validators.required, Validators.min(1)]],
      completed: [false]
    }));
    this.cdr.detectChanges();
  }

  removeStudy(index: number) {
    this.studies.removeAt(index);
    this.cdr.detectChanges();
  }

  async loadStudies() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.studyEntries = trackers?.studyPlanner || [];
      this.calculateMetrics();
      this.generateAIInsights();
    } catch (error) {
      console.error('Error loading studies:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateMetrics() {
    const today = new Date().toISOString().split('T')[0];
    
    const todayEntries = this.studyEntries.filter(entry => entry.date === today);
    this.todayStudyTime = todayEntries.reduce((total, entry) => {
      return total + entry.studies.reduce((sum, study) => sum + study.duration, 0);
    }, 0);
    
    this.studyProgress = Math.min((this.todayStudyTime / this.dailyStudyGoal) * 100, 100);

    const lastWeekEntries = this.studyEntries.slice(-7);
    if (lastWeekEntries.length > 0) {
      const totalMinutes = lastWeekEntries.reduce((total, entry) => {
        return total + entry.studies.reduce((sum, study) => sum + study.duration, 0);
      }, 0);
      this.averageStudyTime = totalMinutes / lastWeekEntries.length;
    }

    this.calculateStreak();

    const totalTasks = this.studyEntries.reduce((total, entry) => total + entry.studies.length, 0);
    const completedTasks = this.studyEntries.reduce((total, entry) => 
      total + entry.studies.filter(study => study.completed).length, 0);
    this.completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const subjects = new Set<string>();
    this.studyEntries.forEach(entry => {
      entry.studies.forEach(study => subjects.add(study.subject));
    });
    this.focusedSubjects = subjects.size;
  }

  private calculateStreak() {
    if (this.studyEntries.length === 0) {
      this.currentStreak = 0;
      return;
    }

    const sortedEntries = [...this.studyEntries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
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
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = this.studyEntries.filter(entry => entry.date === today);
    const todayTime = todayEntries.reduce((total, entry) => {
      return total + entry.studies.reduce((sum, study) => sum + study.duration, 0);
    }, 0);

    if (todayTime >= this.dailyStudyGoal) {
      this.aiInsights.push({
        message: `Excellent! ${todayTime} minutes of focused study today – you're crushing it! 🚀`,
        type: 'positive'
      });
    } else if (todayTime >= this.dailyStudyGoal * 0.7) {
      this.aiInsights.push({
        message: `Great progress! ${todayTime}/${this.dailyStudyGoal} minutes – almost at your goal! 📚`,
        type: 'positive'
      });
    } else if (todayTime > 0) {
      this.aiInsights.push({
        message: `Good start! ${todayTime} minutes studied. Every minute counts toward mastery! ⏱️`,
        type: 'neutral'
      });
    }

    if (this.currentStreak >= 7) {
      this.aiInsights.push({
        message: `Incredible consistency! ${this.currentStreak}-day study streak – you're building powerful habits! 🔥`,
        type: 'positive'
      });
    } else if (this.currentStreak >= 3) {
      this.aiInsights.push({
        message: `Nice streak! ${this.currentStreak} days in a row – momentum is building! 📈`,
        type: 'positive'
      });
    }

    if (this.completionRate >= 90) {
      this.aiInsights.push({
        message: `Amazing focus! ${Math.round(this.completionRate)}% of tasks completed – exceptional discipline! 🎯`,
        type: 'positive'
      });
    } else if (this.completionRate >= 70) {
      this.aiInsights.push({
        message: `Solid completion rate of ${Math.round(this.completionRate)}%. Keep finishing what you start! ✅`,
        type: 'positive'
      });
    }

    if (this.focusedSubjects >= 5) {
      this.aiInsights.push({
        message: `Great subject diversity! ${this.focusedSubjects} different topics studied – well-rounded learning! 🌈`,
        type: 'positive'
      });
    }

    if (this.aiInsights.length === 0) {
      this.aiInsights.push({
        message: "Start your study journey! Track your sessions to unlock insights and boost productivity! 📝",
        type: 'neutral'
      });
    }
  }

  async onSubmit() {
    if (this.studyForm.invalid) return;

    this.isLoading = true;
    const newEntry: StudyEntry = this.studyForm.value;
    
    const existingEntryIndex = this.studyEntries.findIndex(entry => entry.date === newEntry.date);
    
    let updatedEntries: StudyEntry[];
    
    if (existingEntryIndex > -1) {
      updatedEntries = [...this.studyEntries];
      updatedEntries[existingEntryIndex].studies = [
        ...updatedEntries[existingEntryIndex].studies,
        ...newEntry.studies
      ];
    } else {
      updatedEntries = [...this.studyEntries, newEntry];
    }

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'studyPlanner',
        updatedEntries
      );
      
      this.studyEntries = updatedEntries;
      this.calculateMetrics();
      this.generateAIInsights();
      this.studyForm.reset({ date: new Date().toISOString().split('T')[0] });
      this.studies.clear();
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
    } catch (error) {
      console.error('Error saving study session:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async toggleCompleted(entryIdx: number, studyIdx: number) {
    this.studyEntries[entryIdx].studies[studyIdx].completed =
      !this.studyEntries[entryIdx].studies[studyIdx].completed;

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'studyPlanner',
        this.studyEntries
      );

      this.calculateMetrics();
      this.generateAIInsights();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error toggling study task:', error);
    }
  }

  getTotalMinutes(studies: any[]): number {
    return studies.reduce((sum, s) => sum + (s.duration || 0), 0);
  }

  async resetStudy() {
    try {
      await this.trackerService.resetTracker(this.userId, 'studyPlanner');
      this.studyEntries = [];
      this.todayStudyTime = 0;
      this.studyProgress = 0;
      this.aiInsights = [{
        message: "Fresh start! Ready to track your study sessions? 📚",
        type: 'neutral'
      }];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting study planner:', error);
    }
  }
}
