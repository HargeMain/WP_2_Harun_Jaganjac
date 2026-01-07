import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  deleteDoc, 
  doc, 
  getDoc, 
  updateDoc,
  collection,
  getDocs,
  query 
} from '@angular/fire/firestore';
import { AppUser } from '../models/user.model';
import { collectionData, docData } from 'rxfire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);

  async getUser(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  }

  async getAllUsers(): Promise<AppUser[]> {
    const usersCollection = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
  }

  async updateUser(uid: string, data: Partial<AppUser>) {
    return await updateDoc(doc(this.firestore, 'users', uid), data);
  }

  getUserLive(uid: string): Observable<AppUser> {
    return docData(doc(this.firestore, 'users', uid)) as Observable<AppUser>;
  }

  async getUsers(userId: string): Promise<AppUser | null> {
    const trackerRef = doc(this.firestore, 'users', userId);
    const snap = await getDoc(trackerRef);
    return snap.exists() ? (snap.data() as AppUser) : null;
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, 'users', userId);
      await deleteDoc(userDocRef);
    } catch (error) {
      throw error; 
    }
  }

  getUserByEmail(email: any) {
    throw new Error('Method not implemented.');
  }
}
