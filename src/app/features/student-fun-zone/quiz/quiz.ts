import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';
import { HeaderComponent } from '../../../shared/components/header/header';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { AppUser } from '../../../core/models/user.model';


type QuestionKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DrawerMenu,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './quiz.html',
  styleUrls: ['./quiz.css']
})


export class QuizPageComponent implements OnInit {

  primaryColor = '#0b428c';
  secondaryColor = '#e8f0ff';
  role: 'admin' | 'user' = 'user';
  username = 'User';
  userId = '';
  isDrawerOpen = false;

  answers: Record<QuestionKey, string | string[]> = {
    q1: '',
    q2: [] as string[],
    q3: '',
    q4: [] as string[],
    q5: ''
  };

  showModal = false;
  score = 0;
  total = 5;
  scoreEmoji = '🙂';

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user: AppUser = JSON.parse(storedUser);
      this.primaryColor = user.primaryColor || this.primaryColor;
      this.secondaryColor = user.secondaryColor || this.secondaryColor;
      this.role = user.role || this.role;
      this.userId = user.uid || this.userId;
      this.username = user.name || this.username;

    }
  }

  checkAnswers() {
    const correct: Record<QuestionKey, string[]> = {
      q1: ['a'],
      q2: ['a', 'b'],
      q3: ['b'],
      q4: ['a', 'b', 'd'],
      q5: ['b']
    };

    let score = 0;

    for (const key of Object.keys(correct) as QuestionKey[]) {
      const userAnswer = this.answers[key];
      const correctAnswer = correct[key];

      if (
        Array.isArray(userAnswer)
          ? userAnswer.length === correctAnswer.length &&
          userAnswer.every(v => correctAnswer.includes(v))
          : correctAnswer.includes(userAnswer)
      ) {
        score++;
      }
    }

    this.score = score;
    this.setEmoji(score);

    const history = JSON.parse(localStorage.getItem('quizScores') || '[]');
    history.push({ score, date: new Date().toLocaleString() });
    localStorage.setItem('quizScores', JSON.stringify(history));

    this.showModal = true;
  }

  setEmoji(score: number) {
    if (score <= 1) this.scoreEmoji = '😢';
    else if (score === 2) this.scoreEmoji = '😐';
    else if (score === 3 || score === 4) this.scoreEmoji = '🙂';
    else this.scoreEmoji = '🤩';
  }

  resetQuiz() {
    this.answers = { q1: '', q2: [], q3: '', q4: [], q5: '' };
    this.showModal = false;
  }

  toggleCheckbox(
    question: QuestionKey,
    value: string,
    event: Event
  ) {
    const checked = (event.target as HTMLInputElement).checked;
    const arr = this.answers[question] as string[];

    if (checked) {
      if (!arr.includes(value)) {
        arr.push(value);
      }
    } else {
      const index = arr.indexOf(value);
      if (index > -1) {
        arr.splice(index, 1);
      }
    }
  }


  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }
}
