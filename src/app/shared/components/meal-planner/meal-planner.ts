import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface MealEntry {
  date: string;
  meals: {
    name: string;
    calories: number;
    completed: boolean;
  }[];
}

interface MealInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning';
}

@Component({
  selector: 'app-meal-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './meal-planner.html',
  styleUrls: ['./meal-planner.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MealTrackerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  mealForm!: FormGroup;
  mealEntries: MealEntry[] = [];
  aiInsights: MealInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  todayCalories = 0;
  dailyCalorieGoal = 2000;
  calorieProgress = 0;

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.mealForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      meals: this.fb.array([])
    });
  }

  get meals(): FormArray {
    return this.mealForm.get('meals') as FormArray;
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadMeals();
    }
  }

  addMeal() {
    this.meals.push(this.fb.group({
      name: ['', Validators.required],
      calories: [0, [Validators.required, Validators.min(0)]],
      completed: [false]
    }));
    this.cdr.detectChanges();
  }

  removeMeal(index: number) {
    this.meals.removeAt(index);
    this.cdr.detectChanges();
  }

  async loadMeals() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.mealEntries = trackers?.mealPlanner || [];
       this.isLoading = false;
      this.calculateTodayCalories();
      this.generateAIInsights();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private calculateTodayCalories() {
    const today = new Date().toISOString().split('T')[0];
    
    const todayEntries = this.mealEntries.filter(entry => entry.date === today);
    
    if (todayEntries.length > 0) {
      this.todayCalories = todayEntries.reduce((total, entry) => {
        return total + entry.meals.reduce((sum, meal) => sum + meal.calories, 0);
      }, 0);
      
      this.calorieProgress = Math.min((this.todayCalories / this.dailyCalorieGoal) * 100, 100);
      console.log('Today calories calculated:', this.todayCalories, 'Progress:', this.calorieProgress + '%');
    } else {
      this.todayCalories = 0;
      this.calorieProgress = 0;
    }
  }

  private generateAIInsights() {
    this.aiInsights = [];
    const today = new Date().toISOString().split('T')[0];

    const todayEntries = this.mealEntries.filter(entry => entry.date === today);
    const todayMeals = todayEntries.flatMap(entry => entry.meals);
    const totalCaloriesToday = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
    
    if (totalCaloriesToday > this.dailyCalorieGoal * 1.2) {
      this.aiInsights.push({
        message: `Whoa! ${totalCaloriesToday} calories today – consider balancing with lighter meals tomorrow. 🍽️`,
        type: 'warning'
      });
    } else if (totalCaloriesToday > this.dailyCalorieGoal) {
      this.aiInsights.push({
        message: `Slightly over goal (${totalCaloriesToday}/${this.dailyCalorieGoal}). Keep tracking for balance! ⚖️`,
        type: 'neutral'
      });
    } else if (totalCaloriesToday >= this.dailyCalorieGoal * 0.8) {
      this.aiInsights.push({
        message: `Great balance! ${totalCaloriesToday}/${this.dailyCalorieGoal} calories – you're on track! 🌟`,
        type: 'positive'
      });
    } else if (totalCaloriesToday > 0) {
      this.aiInsights.push({
        message: `Good start! ${totalCaloriesToday}/${this.dailyCalorieGoal} calories – fuel your body well! 💪`,
        type: 'neutral'
      });
    }


    const recentEntries = this.mealEntries.slice(-7);
    if (recentEntries.length >= 5) {
      const daysWithMeals = recentEntries.filter(entry => entry.meals.length > 0).length;
      if (daysWithMeals === 7) {
        this.aiInsights.push({
          message: "Perfect consistency! 7 days in a row tracking meals – amazing commitment! 🏆",
          type: 'positive'
        });
      } else if (daysWithMeals >= 5) {
        this.aiInsights.push({
          message: `Strong consistency! Tracked ${daysWithMeals} of last 7 days – keep it up! 📊`,
          type: 'positive'
        });
      }
    }

    if (this.aiInsights.length === 0) {
      this.aiInsights.push({
        message: "Track your meals to see insights and stay accountable! 🥗",
        type: 'neutral'
      });
    }
  }

  async onSubmit() {
    if (this.mealForm.invalid) return;

    const newEntry: MealEntry = this.mealForm.value;
    
    const existingEntryIndex = this.mealEntries.findIndex(entry => entry.date === newEntry.date);
    
    let updatedEntries: MealEntry[];
    
    if (existingEntryIndex > -1) {
      updatedEntries = [...this.mealEntries];
      updatedEntries[existingEntryIndex].meals = [
        ...updatedEntries[existingEntryIndex].meals,
        ...newEntry.meals
      ];
    } else {
      updatedEntries = [...this.mealEntries, newEntry];
    }

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'mealPlanner',
        updatedEntries
      );
      
      this.mealEntries = updatedEntries;
      this.calculateTodayCalories();
      this.generateAIInsights();
      this.mealForm.reset({ date: new Date().toISOString().split('T')[0] });
      this.meals.clear();
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving meals:', error);
    }
  }

  async toggleCompleted(entryIdx: number, mealIdx: number) {
    this.mealEntries[entryIdx].meals[mealIdx].completed =
      !this.mealEntries[entryIdx].meals[mealIdx].completed;

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'mealPlanner',
        this.mealEntries
      );

      this.calculateTodayCalories();
      this.generateAIInsights();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error toggling meal:', error);
    }
  }

  getTotalCalories(meals: any[]): number {
    return meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  }

  async resetMeals() {
    try {
      await this.trackerService.resetTracker(this.userId, 'mealPlanner');
      this.mealEntries = [];
      this.todayCalories = 0;
      this.calorieProgress = 0;
      this.aiInsights = [{
        message: "Fresh start! Ready to track your nutrition journey? 🍎",
        type: 'neutral'
      }];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting meals:', error);
    }
  }
}