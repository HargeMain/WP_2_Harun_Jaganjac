import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('WP_2_Harun_Jaganjac');

  constructor(private firestore: Firestore) {}

  async testInsert() {
    const usersRef = collection(this.firestore, 'test-users');

    await addDoc(usersRef, {
      name: 'Harun Test',
      createdAt: new Date()
    });

    alert('Upisano u Firestore ✔️');
  }
}
