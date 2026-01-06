import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';
import { HeaderComponent } from '../../../shared/components/header/header';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { AppUser } from '../../../core/models/user.model';

interface BoardItem {
  type: 'note' | 'quote' | 'img';
  left: number;
  top: number;
  content: string;
}

@Component({
  selector: 'app-vision-board-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DrawerMenu,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './vision-board.html',
  styleUrls: ['./vision-board.css']
})
export class VisionBoardPageComponent implements OnInit {

  primaryColor = '#0b428c';
  secondaryColor = '#e8f0ff';
  role: 'admin' | 'user' = 'user';
  username = 'User';
  userId = '';
  isDrawerOpen = false;


  boardItems: BoardItem[] = [];

  @ViewChild('board', { static: true })
  boardRef!: ElementRef<HTMLDivElement>;


  private draggingIndex: number | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private rafId: number | null = null;


  notifyMessage = '';
  showNotify = false;

  constructor(private zone: NgZone) {}

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


  addNote(isQuote = false) {
    const offset = this.boardItems.length * 30;

    this.boardItems.push({
      type: isQuote ? 'quote' : 'note',
      left: 120 + offset,
      top: 120 + offset,
      content: isQuote ? 'Inspirational quote...' : 'New note...'
    });

    this.alert('Element added.');
  }

  addImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.boardItems.push({
        type: 'img',
        left: 150,
        top: 150,
        content: reader.result as string
      });
      this.alert('Image added.');
    };
    reader.readAsDataURL(file);
  }

  clearBoard() {
    this.boardItems = [];
    this.alert('Board cleared.');
  }


  startDrag(event: MouseEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();

    this.draggingIndex = index;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;

    this.zone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.onDrag, { passive: true });
      window.addEventListener('mouseup', this.stopDrag, { once: true });
    });
  }

  onDrag = (event: MouseEvent) => {
    if (this.draggingIndex === null) return;

    if (this.rafId) cancelAnimationFrame(this.rafId);

    this.rafId = requestAnimationFrame(() => {
      const boardRect = this.boardRef.nativeElement.getBoundingClientRect();

      const item = this.boardItems[this.draggingIndex!];
      item.left = event.clientX - boardRect.left - this.offsetX;
      item.top = event.clientY - boardRect.top - this.offsetY;
    });
  };

  stopDrag = () => {
    this.draggingIndex = null;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.onDrag);
  };

  alert(msg: string) {
    this.notifyMessage = msg;
    this.showNotify = true;
    setTimeout(() => (this.showNotify = false), 1800);
  }


  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }
}
