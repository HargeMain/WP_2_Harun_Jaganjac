export interface Trackers {
  habitTracker: any[]; 
  sleepTracker: any[]; 
  studyPlanner: any[]; 
  yogaFitnessPlanner: any[]; 
  taskProjectPlanner: any[]; 
  mealPlanner: any[];
  moodTracker: any[];
  calendarTracker: any[]; 
  financeTracker: { balance: number; expenses: any[] }; 
  gratitudeJournal: any[]; 
  dailyReflection: any[]; 
  waterIntake: { dailyGoal: number; current: number }; 
  readingTracker: { books: string[]; pagesRead: number }; 
  userId: string;

}