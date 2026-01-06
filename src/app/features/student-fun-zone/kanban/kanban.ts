import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { HeaderComponent } from '../../../shared/components/header/header';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';

interface Task {
  col: string;
  title: string;
  desc: string;
}

interface SavedBoard {
  name: string;
  data: Task[];
}

@Component({
  selector: 'app-kanban-page',
  standalone: true,
  imports: [CommonModule, DrawerMenu, HeaderComponent, FooterComponent, FormsModule],
  templateUrl: './kanban.html',
  styleUrls: ['./kanban.css'],
  encapsulation: ViewEncapsulation.None
})
export class KanbanPageComponent implements OnInit {
  primaryColor: string = '#0b428c';
  secondaryColor: string = '#e8f0ff';
  role: 'admin' | 'user' = 'user';
  username: string = 'User';
  userId: string = '1';
  isDrawerOpen: boolean = false;
  
  tasks: Task[] = [];
  savedBoards: SavedBoard[] = [];
  
  showTaskModal: boolean = false;
  showSaveModal: boolean = false;
  showLoadModal: boolean = false;
  showEmailModal: boolean = false;
  showConfirmModal: boolean = false;
  
  taskName: string = '';
  taskDesc: string = '';
  saveName: string = '';
  emailField: string = '';
  loadSelect: string = '0';
  
  notifyMessage: string = '';
  showNotify: boolean = false;

  draggedTask: any = null;

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

    this.loadSavedBoards();
  }

  loadSavedBoards() {
    const saves = localStorage.getItem('kanbanBoards');
    this.savedBoards = saves ? JSON.parse(saves) : [];
  }

  alertMsg(msg: string) {
    this.notifyMessage = msg;
    this.showNotify = true;
    setTimeout(() => {
      this.showNotify = false;
    }, 1800);
  }

  openTaskModal() {
    this.taskName = '';
    this.taskDesc = '';
    this.showTaskModal = true;
  }

  closeTaskModal() {
    this.showTaskModal = false;
  }

  addTask() {
    if (!this.taskName.trim()) {
      this.alertMsg('Enter task name!');
      return;
    }

    this.createTask('todo', this.taskName.trim(), this.taskDesc.trim());
    this.showTaskModal = false;
    this.alertMsg('Task added.');
  }

  createTask(col: string, title: string, desc: string) {
    this.tasks.push({ col, title, desc });
  }

  getTasksByColumn(col: string): Task[] {
    return this.tasks.filter(task => task.col === col);
  }

  dragStart(event: DragEvent, task: Task) {
    this.draggedTask = task;
    setTimeout(() => {
      if (event.target) {
        (event.target as HTMLElement).style.opacity = '0.4';
      }
    }, 0);
  }

  dragEnd(event: DragEvent) {
    if (event.target) {
      (event.target as HTMLElement).style.opacity = '1';
    }
    this.draggedTask = null;
  }

  dragOver(event: DragEvent) {
    event.preventDefault();
  }

  drop(event: DragEvent, col: string) {
    event.preventDefault();
    if (this.draggedTask) {
      this.draggedTask.col = col;
      this.alertMsg('Moved.');
    }
  }

  openSaveModal() {
    this.saveName = '';
    this.showSaveModal = true;
  }

  closeSaveModal() {
    this.showSaveModal = false;
  }

  saveBoard() {
    if (!this.saveName.trim()) {
      this.alertMsg('Enter name!');
      return;
    }

    const boardData: Task[] = [...this.tasks];
    const newBoard: SavedBoard = { name: this.saveName.trim(), data: boardData };

    this.savedBoards.push(newBoard);
    localStorage.setItem('kanbanBoards', JSON.stringify(this.savedBoards));

    this.showSaveModal = false;
    this.alertMsg('Saved!');
  }

  openLoadModal() {
    this.loadSelect = '0';
    this.showLoadModal = true;
  }

  closeLoadModal() {
    this.showLoadModal = false;
  }

  loadBoard() {
    const index = parseInt(this.loadSelect);
    if (index >= 0 && index < this.savedBoards.length) {
      this.tasks = [...this.savedBoards[index].data];
      this.showLoadModal = false;
      this.alertMsg('Loaded!');
    }
  }

  clearBoard() {
    this.tasks = [];
    this.alertMsg('Cleared.');
  }

  async exportPDF() {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const boardElement = document.querySelector('.board') as HTMLElement;
      const canvas = await html2canvas(boardElement);
      const img = canvas.toDataURL('image/png');

      const pdf = new jsPDF('landscape', 'px', [canvas.width, canvas.height]);
      pdf.addImage(img, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('kanban.pdf');

      this.alertMsg('PDF created.');
    } catch (error) {
      console.error('PDF export failed:', error);
      this.alertMsg('PDF export failed.');
    }
  }

  async exportPNG() {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const boardElement = document.querySelector('.board') as HTMLElement;
      const canvas = await html2canvas(boardElement);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'kanban.png';
      a.click();
      this.alertMsg('PNG saved.');
    } catch (error) {
      console.error('PNG export failed:', error);
      this.alertMsg('PNG export failed.');
    }
  }

  async printBoard() {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const boardElement = document.querySelector('.board') as HTMLElement;
      const canvas = await html2canvas(boardElement);
      const img = canvas.toDataURL('image/png');

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
          <body style="margin:0; padding:0;">
            <img id="printImg" src="${img}" style="width:100%; height:auto;">
            <script>
              const imgEl = document.getElementById('printImg');
              imgEl.onload = function () {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 300);
              };
            <\/script>
          </body>
          </html>
        `);
        win.document.close();
      }
    } catch (error) {
      console.error('Print failed:', error);
      this.alertMsg('Print failed.');
    }
  }

  openEmailModal() {
    this.emailField = '';
    this.showEmailModal = true;
  }

  closeEmailModal() {
    this.showEmailModal = false;
  }

  nextEmail() {
    if (!this.emailField.trim()) {
      this.alertMsg('Enter email!');
      return;
    }
    this.showEmailModal = false;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
  }

  async sendEmail() {
    const email = this.emailField.trim();

    try {
      const html2canvas = (await import('html2canvas')).default;
      const boardElement = document.querySelector('.board') as HTMLElement;
      const canvas = await html2canvas(boardElement);
      const img = canvas.toDataURL('image/png');

      const body = encodeURIComponent('Kanban board:\n\n' + img);
      window.location.href = `mailto:${email}?subject=Kanban Board&body=${body}`;

      this.showConfirmModal = false;
      this.emailField = '';
      this.alertMsg('Opening mail client...');
    } catch (error) {
      console.error('Email failed:', error);
      this.alertMsg('Email failed.');
    }
  }

  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }
}