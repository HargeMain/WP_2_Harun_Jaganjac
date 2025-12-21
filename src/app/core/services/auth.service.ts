import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private firestore = inject(Firestore);

  async login(email: string, password: string) {

    const usersRef = collection(this.firestore, 'users');

    const q = query(
      usersRef,
      where('email', '==', email),
      where('password', '==', password)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error('Invalid email or password');
    }

    return snap.docs[0].data();
  }
}
