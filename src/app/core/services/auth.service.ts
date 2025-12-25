import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs, addDoc, updateDoc, doc } from '@angular/fire/firestore';
import { AppUser } from '../models/user.model';

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

  async register(user: AppUser) {
    const usersRef = collection(this.firestore, 'users');

    let q = query(usersRef, where('email', '==', user.email));
    let snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('Email already exists');
    }

    q = query(usersRef, where('userName', '==', user.userName));
    snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('Username already exists');
    }

    user.role = 'user';
    user.createdAt = Date.now();

    const docRef = await addDoc(usersRef, user);
    user.uid = docRef.id;

    return user;
  }

  async updateUserByEmail(
  email: string,
  data: { password?: string; imageBase64?: string }
) {
  const usersRef = collection(this.firestore, 'users');

  const q = query(usersRef, where('email', '==', email));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('User not found');
  }

  const userDoc = snap.docs[0];
  const userRef = doc(this.firestore, 'users', userDoc.id);

  await updateDoc(userRef, {
    ...(data.password && { password: data.password }),
    ...(data.imageBase64 && { imageBase64: data.imageBase64 }),
    updatedAt: Date.now()
  });

  return {
    uid: userDoc.id,
    ...userDoc.data(),
    ...data
  };
}

}

