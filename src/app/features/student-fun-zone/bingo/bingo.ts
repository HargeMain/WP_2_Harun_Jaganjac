import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu'; 
import { HeaderComponent } from '../../../shared/components/header/header'; 
import { FooterComponent } from '../../../shared/components/footer/footer'; 
import { AppUser } from '../../../core/models/user.model'; 
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bingo-page',
  standalone: true,
  imports: [CommonModule, DrawerMenu, HeaderComponent, FooterComponent, FormsModule],
  templateUrl: './bingo.html',
  styleUrls: ['./bingo.css']
})
export class BingoPageComponent implements OnInit {
  @ViewChild('contentToConvert', { static: true }) contentToConvert!: ElementRef;
  
  primaryColor: string = '#0b428c';
  secondaryColor: string = '#e8f0ff';
  role: 'admin' | 'user' = 'user';
  username: string = 'User';
  userId: string = '1';
  isDrawerOpen: boolean = false;
  
  emailField: string = '';
  notifyMessage: string = '';
  showNotify: boolean = false;
  showEmailModal: boolean = false;
  
  bingoCells = [
    [
      { text: 'Traveled abroad – Belma', state: 0, mark: '' },
      { text: 'Flew on a plane – Demir', state: 0, mark: '' },
      { text: 'Has more than three siblings', state: 0, mark: '' },
      { text: 'Has five pets', state: 0, mark: '' },
      { text: 'Likes eating pickles', state: 0, mark: '' }
    ],
    [
      { text: 'Plays basketball', state: 0, mark: '' },
      { text: 'Likes Disney cartoons', state: 0, mark: '' },
      { text: 'Likes to draw – Lejla', state: 0, mark: '' },
      { text: 'Likes HTML – Kenan', state: 0, mark: '' },
      { text: 'Can scuba dive', state: 0, mark: '' }
    ],
    [
      { text: 'Favorite color is orange', state: 0, mark: '' },
      { text: 'Does not like blue', state: 0, mark: '' },
      { text: 'FREE SPACE', state: 0, mark: 'FREE', isFree: true },
      { text: 'Good at math – Anis', state: 0, mark: '' },
      { text: 'No pets – Ajmur', state: 0, mark: '' }
    ],
    [
      { text: 'Does not like chocolate – Demir', state: 0, mark: '' },
      { text: 'Afraid of spiders', state: 0, mark: '' },
      { text: 'Likes to bake cookies', state: 0, mark: '' },
      { text: 'Plays an instrument – Anis', state: 0, mark: '' },
      { text: 'Allergic to cats or dogs – Ajmur', state: 0, mark: '' }
    ],
    [
      { text: 'Birthday in October', state: 0, mark: '' },
      { text: 'Likes to eat cheese – Lejla', state: 0, mark: '' },
      { text: 'Plays online games – Kenan', state: 0, mark: '' },
      { text: 'Likes pizza', state: 0, mark: '' },
      { text: 'Likes to sing', state: 0, mark: '' }
    ]
  ];

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.primaryColor = user.primaryColor || this.primaryColor;
      this.secondaryColor = user.secondaryColor || this.secondaryColor;
      this.role = user.role || this.role;
      this.userId = user.uid || this.userId;
      this.username = user.name || this.username;
    }
  }

  toggleCellState(rowIndex: number, cellIndex: number) {
    const cell = this.bingoCells[rowIndex][cellIndex];
    if (cell.isFree) return;
    
    cell.state = (cell.state + 1) % 3;
    
    switch(cell.state) {
      case 1:
        cell.mark = '✓';
        break;
      case 2:
        cell.mark = '✗';
        break;
      default:
        cell.mark = '';
    }
  }

  getCellClass(cell: any) {
    const classes = ['cell'];
    if (cell.state === 1) classes.push('checked');
    if (cell.state === 2) classes.push('crossed');
    if (cell.isFree) classes.push('free');
    return classes.join(' ');
  }

  async exportToPDF() {
    try {
      const html2pdfModule = await import('html2pdf.js');
      const element = this.contentToConvert.nativeElement;
      
      const opt = {
        margin: 5,
        filename: 'bingo.pdf',
        image: { type: 'jpeg' as const, quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' as const }
      };
      
      html2pdfModule.default().set(opt).from(element).save();
      this.showAlert('PDF saved.');
    } catch (error) {
      console.error('PDF export failed:', error);
      this.showAlert('PDF export failed.');
    }
  }

  sendMail() {
    this.showEmailModal = true;
  }

  async sendEmail() {
    if (!this.emailField.trim()) {
      this.showAlert('Enter email.');
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(this.contentToConvert.nativeElement);
      const img = canvas.toDataURL('image/png');
      
      const body = encodeURIComponent(`Bingo board:\n\n${img}`);
      window.location.href = `mailto:${this.emailField}?subject=Bingo&body=${body}`;
      
      this.showEmailModal = false;
      this.emailField = '';
      this.showAlert('Opening mail client...');
    } catch (error) {
      console.error('Email failed:', error);
      this.showAlert('Email failed.');
    }
  }

  cancelEmail() {
    this.showEmailModal = false;
    this.emailField = '';
  }

  showAlert(msg: string) {
    this.notifyMessage = msg;
    this.showNotify = true;
    setTimeout(() => {
      this.showNotify = false;
    }, 1800);
  }

  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }
}