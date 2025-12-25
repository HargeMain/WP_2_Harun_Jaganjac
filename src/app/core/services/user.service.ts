import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { AppUser } from '../models/user.model';
import { docData } from 'rxfire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  getUserByEmail(email: any) {
    throw new Error('Method not implemented.');
  }
  private firestore = inject(Firestore);

  async getUser(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  }

  async updateUser(uid: string, data: Partial<AppUser>) {
    return await updateDoc(doc(this.firestore, 'users', uid), data);
  }

  getUserLive(uid: string): Observable<AppUser> {
  return docData(doc(this.firestore, 'users', uid)) as Observable<AppUser>;
  }

}
