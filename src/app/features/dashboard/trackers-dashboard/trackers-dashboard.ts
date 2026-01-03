import { Component, OnInit, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerMenu } from '../../../shared/components/drawer-menu/drawer-menu';
import { HeaderComponent } from '../../../shared/components/header/header';
import { FooterComponent } from '../../../shared/components/footer/footer';
import { AppUser } from '../../../core/models/user.model';
import { HabitTrackerComponent } from '../../../shared/components/habit-tracker/habit-tracker';
import { MealTrackerComponent } from '../../../shared/components/meal-planner/meal-planner';
import { StudyPlannerComponent } from '../../../shared/components/study-planner/study-planner';
import { YogaFitnessPlannerComponent } from '../../../shared/components/yoga-fitness-planner/yoga-fitness-planner';
import { LazyLoadDirective } from '../../../shared/directives/lazy-load';
import { SleepTrackerComponent } from '../../../shared/components/sleep-tracker/sleep-tracker';
import { TaskProjectPlannerComponent } from '../../../shared/components/task-project-planner/task-project-planner';
import { MoodTrackerComponent } from '../../../shared/components/mood-tracker/mood-tracker';
import { CalendarTrackerComponent } from '../../../shared/components/calendar-tracker/calendar-tracker';
import { GratitudeJournalComponent } from '../../../shared/components/gratitude-journal/gratitude-journal';
import { DailyReflectionComponent } from '../../../shared/components/daily-reflection/daily-reflection';
import { FinanceTrackerComponent } from '../../../shared/components/finance-tracker/finance-tracker';
import { WaterIntakeTrackerComponent } from '../../../shared/components/water-intake/water-intake';
import { ReadingTrackerComponent } from '../../../shared/components/reading-tracker/reading-tracker';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-trackers-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DrawerMenu,
    HeaderComponent,
    FooterComponent,
    HabitTrackerComponent,
    MealTrackerComponent,
    StudyPlannerComponent,
    YogaFitnessPlannerComponent,
    SleepTrackerComponent,
    TaskProjectPlannerComponent,
    MoodTrackerComponent,
    CalendarTrackerComponent,
    DailyReflectionComponent,
    FinanceTrackerComponent,
    WaterIntakeTrackerComponent,
    ReadingTrackerComponent,
    GratitudeJournalComponent,
    LazyLoadDirective,
    DragDropModule
  ],
  templateUrl: './trackers-dashboard.html',
  styleUrls: ['./trackers-dashboard.css']
})
export class TrackersDashboardComponent implements OnInit, AfterViewInit {
  primaryColor: string = '#1e3a8a';
  secondaryColor: string = '#ffffff';
  role?: 'admin' | 'user';
  isDrawerOpen = false;

  isDragging = false;
  dragStartIndex = -1;
  dragOverIndex = -1;
  dragGhost: HTMLElement | null = null;
  
  trackers = [
    { 
      id: 'habit', 
      name: 'Habit Tracker', 
      icon: 'psychology',
      component: HabitTrackerComponent,
      visible: true,
      order: 0
    },
    { 
      id: 'meal', 
      name: 'Meal Tracker', 
      icon: 'restaurant',
      component: MealTrackerComponent,
      visible: true,
      order: 1
    },
    {
      id: 'daily-reflection',
      name: 'Daily Reflection',
      icon: 'event_note',
      component: DailyReflectionComponent,
      visible: true,
      order: 2
    },
    {
      id: 'finance',
      name: 'Finance Tracker',
      icon: 'account_balance_wallet',
      component: FinanceTrackerComponent,
      visible: true,
      order: 3
    },
    {
      id: 'mood', 
      name: 'Mood Tracker', 
      icon: 'mood',
      component: MoodTrackerComponent,
      visible: true,
      order: 4
    },
    { 
      id: 'gratitude', 
      name: 'Gratitude Journal', 
      icon: 'favorite',
      component: GratitudeJournalComponent,
      visible: true,
      order: 5
    },
    {
      id : 'reading',
      name: 'Reading Tracker',
      icon: 'menu_book',
      component: ReadingTrackerComponent,
      visible: true,
      order: 6
    },
    {
      id:'water',
      name: 'Water Intake Tracker',
      icon: 'local_drink',
      component: WaterIntakeTrackerComponent,
      visible: true,
      order: 7
    },
    { 
      id: 'study', 
      name: 'Study Planner', 
      icon: 'school',
      component: StudyPlannerComponent,
      visible: true,
      order: 8
    },
    { 
      id: 'sleep', 
      name: 'Sleep Tracker', 
      icon: 'bed',
      component: SleepTrackerComponent,
      visible: true,
      order: 9
    },
    { 
      id: 'yoga', 
      name: 'Yoga & Fitness Planner', 
      icon: 'self_improvement',
      component: YogaFitnessPlannerComponent,
      visible: true,
      order: 10
    },
    { 
      id: 'task', 
      name: 'Task & Project Planner', 
      icon: 'assignment',
      component: TaskProjectPlannerComponent,
      visible: true,
      order: 11
    },
    {
      id: 'calendar',
      name: 'Calendar Tracker',
      icon: 'calendar_today',
      component: CalendarTrackerComponent,
      visible: true,
      order: 12
    }
  ];

  currentIndex = 0;
  isAnimating = false;
  nextTrackerName = '';
  prevTrackerName = '';

  @ViewChild('pathDots', { static: false }) pathDots!: ElementRef;

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user: AppUser = JSON.parse(storedUser);
      this.primaryColor = user.primaryColor || this.primaryColor;
      this.secondaryColor = user.secondaryColor || this.secondaryColor;
      this.role = user.role;
    }
    
    const savedOrder = localStorage.getItem('trackersOrder');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        this.sortTrackersByOrder(order);
      } catch (e) {
        console.error('Error loading tracker order:', e);
      }
    }
    
    this.updateNextPrevNames();
  }

  ngAfterViewInit() {
    this.initializeDragAndDrop();
  }

  sortTrackersByOrder(order: {[key: string]: number}) {
    this.trackers.sort((a, b) => {
      const orderA = order[a.id] !== undefined ? order[a.id] : a.order;
      const orderB = order[b.id] !== undefined ? order[b.id] : b.order;
      return orderA - orderB;
    });
    
    this.trackers.forEach((tracker, index) => {
      tracker.order = index;
    });
  }

  saveTrackersOrder() {
    const order: {[key: string]: number} = {};
    this.trackers.forEach((tracker, index) => {
      order[tracker.id] = index;
    });
    localStorage.setItem('trackersOrder', JSON.stringify(order));
  }

  onDragStart(event: DragEvent, index: number) {
    if (this.isAnimating) {
      event.preventDefault();
      return;
    }
    
    this.isDragging = true;
    this.dragStartIndex = index;
    
    const element = event.target as HTMLElement;
    element.classList.add('dragging');
    
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
      
      // Kreiraj custom drag ghost
      const dragGhost = element.cloneNode(true) as HTMLElement;
      dragGhost.style.position = 'absolute';
      dragGhost.style.opacity = '0.8';
      dragGhost.style.zIndex = '10000';
      dragGhost.style.pointerEvents = 'none';
      dragGhost.style.width = element.offsetWidth + 'px';
      dragGhost.style.height = element.offsetHeight + 'px';
      dragGhost.style.transform = 'rotate(5deg) scale(1.1)';
      dragGhost.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      
      document.body.appendChild(dragGhost);
      event.dataTransfer.setDragImage(dragGhost, 30, 30);
      
      this.dragGhost = dragGhost;
    }
    
    event.stopPropagation();
  }

  onDragOver(event: DragEvent, index: number) {
    if (!this.isDragging || this.isAnimating) return;
    
    event.preventDefault();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    if (this.dragOverIndex !== index && index !== this.dragStartIndex) {
      this.dragOverIndex = index;
      
      const elements = document.querySelectorAll('.path-icon');
      elements.forEach(el => el.classList.remove('drag-over'));
      
      const targetElement = elements[index] as HTMLElement;
      if (targetElement) {
        targetElement.classList.add('drag-over');
      }
    }
    
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent, index: number) {
    const element = event.target as HTMLElement;
    element.classList.remove('drag-over');
  }

  onDrop(event: DragEvent, index: number) {
    event.preventDefault();
    
    if (this.dragStartIndex === -1 || this.dragStartIndex === index || this.isAnimating) {
      this.resetDragState();
      return;
    }
    
    this.animateTrackerSwap(this.dragStartIndex, index);
    
    this.resetDragState();
    event.stopPropagation();
  }

  onDragEnd(event: DragEvent) {
    this.resetDragState();
  }

  private animateTrackerSwap(fromIndex: number, toIndex: number) {
    this.isAnimating = true;
    
    const [movedItem] = this.trackers.splice(fromIndex, 1);
    this.trackers.splice(toIndex, 0, movedItem);
    
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }
    
    this.trackers.forEach((tracker, index) => {
      tracker.order = index;
    });
    
    this.saveTrackersOrder();
    
    this.updateNextPrevNames();
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }

  private resetDragState() {
    this.isDragging = false;
    this.dragStartIndex = -1;
    this.dragOverIndex = -1;
    
    document.querySelectorAll('.path-icon').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    
    if (this.dragGhost && this.dragGhost.parentNode) {
      this.dragGhost.parentNode.removeChild(this.dragGhost);
      this.dragGhost = null;
    }
  }

  private initializeDragAndDrop() {
    setTimeout(() => {
      const elements = document.querySelectorAll('.path-icon');
      elements.forEach((element, index) => {
        this.setupTouchEvents(element as HTMLElement, index);
      });
    }, 1000);
  }

  private setupTouchEvents(element: HTMLElement, index: number) {
    let startX = 0;
    let startY = 0;
    let isTouchDragging = false;
    let touchGhost: HTMLElement | null = null;
    
    element.addEventListener('touchstart', (e: TouchEvent) => {
      if (this.isAnimating) return;
      
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isTouchDragging = false;
      
      e.preventDefault();
    }, { passive: false });
    
    element.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.isAnimating) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      if (!isTouchDragging && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isTouchDragging = true;
        this.isDragging = true;
        this.dragStartIndex = index;
        
        element.classList.add('dragging');
        
        touchGhost = element.cloneNode(true) as HTMLElement;
        touchGhost.style.position = 'fixed';
        touchGhost.style.left = (touch.clientX - 30) + 'px';
        touchGhost.style.top = (touch.clientY - 30) + 'px';
        touchGhost.style.opacity = '0.9';
        touchGhost.style.zIndex = '10000';
        touchGhost.style.pointerEvents = 'none';
        touchGhost.style.transform = 'scale(1.1) rotate(5deg)';
        touchGhost.style.boxShadow = '0 15px 35px rgba(0,0,0,0.4)';
        touchGhost.style.transition = 'transform 0.2s ease';
        
        document.body.appendChild(touchGhost);
      }
      
      if (isTouchDragging && touchGhost) {
        touchGhost.style.left = (touch.clientX - 30) + 'px';
        touchGhost.style.top = (touch.clientY - 30) + 'px';
        
        const elements = document.querySelectorAll('.path-icon');
        elements.forEach((el, idx) => {
          if (idx !== index) {
            const rect = el.getBoundingClientRect();
            if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
              el.classList.add('drag-over');
              this.dragOverIndex = idx;
            } else {
              el.classList.remove('drag-over');
            }
          }
        });
      }
      
      e.preventDefault();
    }, { passive: false });
    
    element.addEventListener('touchend', (e: TouchEvent) => {
      if (isTouchDragging && this.dragStartIndex !== -1 && this.dragOverIndex !== -1 && 
          this.dragStartIndex !== this.dragOverIndex) {
        this.animateTrackerSwap(this.dragStartIndex, this.dragOverIndex);
      }
      
      if (touchGhost && touchGhost.parentNode) {
        touchGhost.parentNode.removeChild(touchGhost);
      }
      
      document.querySelectorAll('.path-icon').forEach(el => {
        el.classList.remove('dragging', 'drag-over');
      });
      
      isTouchDragging = false;
      this.resetDragState();
      
      e.preventDefault();
    }, { passive: false });
  }

  onDrawerStateChange(state: boolean) {
    this.isDrawerOpen = state;
  }

  nextTracker() {
    if (this.currentIndex < this.trackers.length - 1 && !this.isAnimating) {
      this.isAnimating = true;
      this.currentIndex++;
      this.updateNextPrevNames();
      
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  prevTracker() {
    if (this.currentIndex > 0 && !this.isAnimating) {
      this.isAnimating = true;
      this.currentIndex--;
      this.updateNextPrevNames();
      
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  goToTracker(index: number) {
    if (index >= 0 && index < this.trackers.length && !this.isAnimating && !this.isDragging) {
      this.isAnimating = true;
      this.currentIndex = index;
      this.updateNextPrevNames();
      
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  private updateNextPrevNames() {
    this.nextTrackerName = this.currentIndex < this.trackers.length - 1 
      ? this.trackers[this.currentIndex + 1].name 
      : '';
    
    this.prevTrackerName = this.currentIndex > 0 
      ? this.trackers[this.currentIndex - 1].name 
      : '';
  }

  get isFirst(): boolean {
    return this.currentIndex === 0;
  }

  get isLast(): boolean {
    return this.currentIndex === this.trackers.length - 1;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isAnimating || this.isDragging) return;
    
    switch(event.key) {
      case 'ArrowLeft':
        this.prevTracker();
        break;
      case 'ArrowRight':
        this.nextTracker();
        break;
      case 'Home':
        event.preventDefault();
        this.goToTracker(0);
        break;
      case 'End':
        event.preventDefault();
        this.goToTracker(this.trackers.length - 1);
        break;
      case 'r':
      case 'R':
        if (event.ctrlKey) {
          event.preventDefault();
          this.resetTrackersOrder();
        }
        break;
    }
  }

  resetTrackersOrder() {
    if (confirm('Reset trackers to default order?')) {
      localStorage.removeItem('trackersOrder');
      this.trackers.sort((a, b) => a.order - b.order);
      this.updateNextPrevNames();
    }
  }

  touchStartX = 0;
  
  onTouchStart(event: TouchEvent) {
    if (this.isDragging) return;
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    if (this.isAnimating || this.isDragging) return;
    
    const touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        this.nextTracker();
      } else {
        this.prevTracker();
      }
    }
  }
}