import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, updateDoc, getDoc } from '@angular/fire/firestore';
import { Trackers } from '../models/trackers.model';

@Injectable({
  providedIn: 'root'
})
export class TrackersService {
  private firestore = inject(Firestore);

  async createDefaultTrackers(userId: string): Promise<void> {
    const trackerRef = doc(this.firestore, 'trackers', userId);
    const defaultTrackers: Trackers = {
      userId: userId,
      habitTracker: [],
      sleepTracker: [],
      studyPlanner: [],
      yogaFitnessPlanner: [],
      taskProjectPlanner: [],
      mealPlanner: [],
      moodTracker: [],
      calendarTracker: [],
      financeTracker: [],
      gratitudeJournal: [],
      dailyReflection: [],
      waterIntake:  [],
      readingTracker: [],
    };

    await setDoc(trackerRef, defaultTrackers);
  }

  async updateTracker(userId: string, trackerName: keyof Trackers, data: any): Promise<void> {
    const trackerRef = doc(this.firestore, 'trackers', userId);
    await updateDoc(trackerRef, { [trackerName]: data });
  }

  async resetTracker(userId: string, trackerName: keyof Trackers): Promise<void> {
    const trackerRef = doc(this.firestore, 'trackers', userId);
    let defaultValue: any;

    switch (trackerName) {
      case 'habitTracker':
      case 'sleepTracker':
      case 'studyPlanner':
      case 'yogaFitnessPlanner':
      case 'taskProjectPlanner':
      case 'mealPlanner':
      case 'moodTracker':
      case 'calendarTracker':
      case 'gratitudeJournal':
      case 'dailyReflection':
      case 'financeTracker':
      case 'waterIntake':
      case 'readingTracker':
        defaultValue = [];
        break;
      default:
        throw new Error('Invalid tracker name');
    }

    await updateDoc(trackerRef, { [trackerName]: defaultValue });
  }

  async getTrackers(userId: string): Promise<Trackers | null> {
    const trackerRef = doc(this.firestore, 'trackers', userId);
    const snap = await getDoc(trackerRef);
    return snap.exists() ? (snap.data() as Trackers) : null;
  }
}