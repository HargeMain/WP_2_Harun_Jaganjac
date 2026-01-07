import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';
import { HeaderComponent } from '../../../shared/components/header/header';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { AppUser } from '../../../core/models/user.model';

@Component({
  selector: 'app-whiteboard-page',
  standalone: true,
  imports: [CommonModule, DrawerMenu, HeaderComponent, FooterComponent],
  templateUrl: './whiteboard.html',
  styleUrls: ['./whiteboard.css']
})
export class WhiteboardPageComponent implements OnInit, AfterViewInit {


  primaryColor = '#0b428c';
  secondaryColor = '#e8f0ff';
  role: 'admin' | 'user' = 'user';
  username = 'User';
  userId = '';
  isDrawerOpen = false;
  showEmailModal = false;
  showConfirmModal = false;
  emailValue = '';


  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;

  tool: 'pencil' | 'eraser' = 'pencil';
  color = '#0b428c';
  lineWidth = 4;

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

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 180;
  }


  setTool(t: 'pencil' | 'eraser') {
    this.tool = t;
  }

  startDraw(e: MouseEvent) {
    this.drawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(e.offsetX, e.offsetY);
  }

  stopDraw() {
    this.drawing = false;
  }

  draw(e: MouseEvent) {
    if (!this.drawing) return;

    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.strokeStyle =
      this.tool === 'eraser' ? '#ffffff' : this.color;

    this.ctx.lineTo(e.offsetX, e.offsetY);
    this.ctx.stroke();
  }


  clearBoard() {
    const c = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);
  }

  exportPNG() {
    const url = this.canvasRef.nativeElement.toDataURL();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard.png';
    a.click();
  }

  async exportPDF() {
    const { jsPDF } = (window as any).jspdf;
    const canvas = this.canvasRef.nativeElement;
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'px', [canvas.width, canvas.height]);
    pdf.addImage(img, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('whiteboard.pdf');
  }

  printBoard() {
    const img = this.canvasRef.nativeElement.toDataURL();
    const win = window.open('', '_blank')!;
    win.document.write(`<img src="${img}" style="width:100%">`);
    win.print();
  }

 openEmailModal() {
  this.showEmailModal = true;
}

confirmEmail() {
  if (!this.emailValue.trim()) return;
  this.showEmailModal = false;
  this.showConfirmModal = true;
}

sendConfirmedMail() {
  const img = this.canvasRef.nativeElement.toDataURL();
  const body = encodeURIComponent('Whiteboard:\n\n' + img);

  window.location.href =
    `mailto:${this.emailValue}?subject=Whiteboard&body=${body}`;

  this.showConfirmModal = false;
  this.emailValue = '';
}

closeModals() {
  this.showEmailModal = false;
  this.showConfirmModal = false;
}

  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }
}

