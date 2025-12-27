import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  category: 'work' | 'personal' | 'meeting' | 'health' | 'social' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  attendees: string[];
  notes: string;
  isAllDay: boolean;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminders: number[];
  createdAt: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

interface CalendarInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning' | 'critical';
}

@Component({
  selector: 'app-calendar-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './calendar-tracker.html',
  styleUrls: ['./calendar-tracker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarTrackerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  eventForm!: FormGroup;
  calendarEvents: CalendarEvent[] = [];
  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  selectedDate: Date = new Date();
  filteredEvents: CalendarEvent[] = [];
  aiInsights: CalendarInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentView: 'month' | 'week' | 'day' = 'month';
  
  totalEvents = 0;
  eventsThisWeek = 0;
  eventsToday = 0;
  upcomingEvents = 0;
  completedEvents = 0;
  busyDays = 0;
  freeDays = 0;
  averageEventsPerDay = 0;
  scheduleEfficiency = 0;
  meetingTime = 0;
  personalTime = 0;
  
  filterCategory: string = 'all';
  filterPriority: string = 'all';
  filterMonth: string = 'current';

  categories = ['work', 'personal', 'meeting', 'health', 'social', 'other'];
  priorities = ['low', 'medium', 'high', 'critical'];
  reminders = [0, 5, 10, 15, 30, 60, 120, 1440];

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      startTime: ['09:00'],
      endTime: ['10:00'],
      category: ['work', Validators.required],
      priority: ['medium', Validators.required],
      location: [''],
      attendees: [''],
      notes: [''],
      isAllDay: [false],
      recurring: ['none'],
      reminders: [[]]
    });
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadCalendarEvents();
    }
    this.generateCalendar();
  }

  async loadCalendarEvents() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.calendarEvents = trackers?.calendarTracker || [];
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEvents();
      this.generateCalendar();
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    this.calendarDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const date = new Date(current);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      
      const dayEvents = this.getEventsForDate(date);
      
      this.calendarDays.push({
        date: new Date(date),
        isCurrentMonth,
        isToday,
        events: dayEvents.slice(0, 2)
      });
      
      current.setDate(current.getDate() + 1);
    }
  }

  private getEventsForDate(date: Date): CalendarEvent[] {
    const dateStr = date.toISOString().split('T')[0];
    return this.calendarEvents.filter(event => 
      event.date === dateStr && 
      (this.filterCategory === 'all' || event.category === this.filterCategory) &&
      (this.filterPriority === 'all' || event.priority === this.filterPriority)
    );
  }

  private calculateMetrics() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    this.totalEvents = this.calendarEvents.length;
    this.eventsToday = this.calendarEvents.filter(e => e.date === todayStr).length;
    this.eventsThisWeek = this.calendarEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    }).length;
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.upcomingEvents = this.calendarEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate > today && eventDate <= nextWeek;
    }).length;
    
    this.completedEvents = this.calendarEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate < today;
    }).length;
    
    const eventsByDate = new Map<string, number>();
    this.calendarEvents.forEach(event => {
      const count = eventsByDate.get(event.date) || 0;
      eventsByDate.set(event.date, count + 1);
    });
    
    this.busyDays = Array.from(eventsByDate.values()).filter(count => count >= 3).length;
    this.freeDays = 30 - this.busyDays;
    
    const uniqueDays = new Set(this.calendarEvents.map(e => e.date)).size;
    this.averageEventsPerDay = uniqueDays > 0 ? this.totalEvents / uniqueDays : 0;
    
    const variance = Array.from(eventsByDate.values()).reduce((sum, count) => {
      return sum + Math.pow(count - this.averageEventsPerDay, 2);
    }, 0) / (uniqueDays || 1);
    
    this.scheduleEfficiency = Math.max(0, 100 - (variance * 10));
    
    this.meetingTime = this.calendarEvents.filter(e => e.category === 'meeting').length;
    this.personalTime = this.calendarEvents.filter(e => e.category === 'personal' || e.category === 'health' || e.category === 'social').length;
  }

  private generateAIInsights() {
    this.aiInsights = [];

    if (this.busyDays > 20) {
      this.aiInsights.push({
        message: `You have ${this.busyDays} busy days this month. Consider spreading events more evenly. 📅`,
        type: 'warning'
      });
    }

    if (this.eventsToday > 5) {
      this.aiInsights.push({
        message: `You have ${this.eventsToday} events today! Make sure to take breaks between meetings. ⏰`,
        type: 'critical'
      });
    } else if (this.eventsToday === 0) {
      this.aiInsights.push({
        message: `No events scheduled for today. Perfect time for focused work or planning! 🎯`,
        type: 'positive'
      });
    }

    if (this.upcomingEvents > 10) {
      this.aiInsights.push({
        message: `You have ${this.upcomingEvents} upcoming events next week. Consider prioritizing or rescheduling some. 📋`,
        type: 'warning'
      });
    }

    if (this.meetingTime > this.personalTime * 2) {
      this.aiInsights.push({
        message: `Meetings dominate your schedule (${this.meetingTime} meetings vs ${this.personalTime} personal events). Balance is key! ⚖️`,
        type: 'neutral'
      });
    }

    if (this.scheduleEfficiency >= 80) {
      this.aiInsights.push({
        message: `Excellent schedule efficiency! Your events are well-distributed. 🏆`,
        type: 'positive'
      });
    } else if (this.scheduleEfficiency <= 50) {
      this.aiInsights.push({
        message: `Schedule efficiency is low (${Math.round(this.scheduleEfficiency)}%). Events are too clustered. Consider better distribution. 🔄`,
        type: 'warning'
      });
    }

    const upcomingEmptyDays = this.getUpcomingEmptyDays(7);
    if (upcomingEmptyDays.length > 2) {
      this.aiInsights.push({
        message: `You have ${upcomingEmptyDays.length} free days coming up. Great for strategic planning! 🗓️`,
        type: 'positive'
      });
    }

    if (this.aiInsights.length === 0) {
      this.aiInsights.push({
        message: "Your schedule looks balanced! Keep up the good organization. 🌟",
        type: 'positive'
      });
    }
  }

  private getUpcomingEmptyDays(daysAhead: number): Date[] {
    const emptyDays: Date[] = [];
    const today = new Date();
    
    for (let i = 1; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = this.calendarEvents.filter(e => e.date === dateStr);
      if (dayEvents.length === 0) {
        emptyDays.push(date);
      }
    }
    
    return emptyDays;
  }

  async addEvent() {
    if (this.eventForm.invalid) return;

    this.isLoading = true;
    const formData = this.eventForm.value;
    
    const attendees = formData.attendees ? 
      formData.attendees.split(',').map((email: string) => email.trim()).filter((email: string) => email) : 
      [];

    const newEvent: CalendarEvent = {
      id: this.generateId(),
      ...formData,
      attendees,
      createdAt: new Date().toISOString()
    };

    const updatedEvents = [...this.calendarEvents, newEvent];

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'calendarTracker',
        updatedEvents
      );
      
      this.calendarEvents = updatedEvents;
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEvents();
      this.generateCalendar();
      
      this.eventForm.reset({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        category: 'work',
        priority: 'medium',
        location: '',
        attendees: '',
        notes: '',
        isAllDay: false,
        recurring: 'none',
        reminders: []
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>) {
    const updatedEvents = this.calendarEvents.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    );
    
    try {
      await this.trackerService.updateTracker(
        this.userId,
        'calendarTracker',
        updatedEvents
      );
      
      this.calendarEvents = updatedEvents;
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEvents();
      this.generateCalendar();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  }

  async deleteEvent(eventId: string) {
    const updatedEvents = this.calendarEvents.filter(event => event.id !== eventId);
    
    try {
      await this.trackerService.updateTracker(
        this.userId,
        'calendarTracker',
        updatedEvents
      );
      
      this.calendarEvents = updatedEvents;
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterEvents();
      this.generateCalendar();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }

  filterEvents() {
    this.filteredEvents = this.calendarEvents.filter(event => {
      if (this.filterCategory !== 'all' && event.category !== this.filterCategory) return false;
      if (this.filterPriority !== 'all' && event.priority !== this.filterPriority) return false;
      
      if (this.filterMonth !== 'current') {
        const eventDate = new Date(event.date);
        const eventMonth = eventDate.getMonth();
        const eventYear = eventDate.getFullYear();
        const currentYear = new Date().getFullYear();
        
        switch (this.filterMonth) {
          case 'next':
            const nextMonth = new Date().getMonth() + 1;
            if (eventMonth !== nextMonth || eventYear !== currentYear) return false;
            break;
          case 'previous':
            const prevMonth = new Date().getMonth() - 1;
            if (eventMonth !== prevMonth || eventYear !== currentYear) return false;
            break;
        }
      }
      
      return true;
    });
    
    this.filteredEvents.sort((a, b) => {
      if (a.date === b.date) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.date.localeCompare(b.date);
    });
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
    this.cdr.detectChanges();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
    this.cdr.detectChanges();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.generateCalendar();
    this.cdr.detectChanges();
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.cdr.detectChanges();
  }

  getEventsForSelectedDate(): CalendarEvent[] {
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    return this.calendarEvents.filter(event => event.date === dateStr);
  }

  getDayEventsCount(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    return this.calendarEvents.filter(event => event.date === dateStr).length;
  }

  getEventDuration(event: CalendarEvent): number {
    if (event.isAllDay) return 24 * 60;
    
    const [startHours, startMinutes] = event.startTime.split(':').map(Number);
    const [endHours, endMinutes] = event.endTime.split(':').map(Number);
    
    return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  }

  getTimeSlotColor(category: string): string {
    switch (category) {
      case 'work': return '#3b82f6';
      case 'personal': return '#10b981';
      case 'meeting': return '#8b5cf6';
      case 'health': return '#ef4444';
      case 'social': return '#f59e0b';
      case 'other': return '#6b7280';
      default: return '#6b7280';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'work': return 'work';
      case 'personal': return 'person';
      case 'meeting': return 'groups';
      case 'health': return 'fitness_center';
      case 'social': return 'celebration';
      case 'other': return 'category';
      default: return 'event';
    }
  }

  async resetCalendar() {
    try {
      await this.trackerService.resetTracker(this.userId, 'calendarTracker');
      this.calendarEvents = [];
      this.calculateMetrics();
      this.aiInsights = [{
        message: "Fresh calendar! Start scheduling your events and meetings. 📅",
        type: 'neutral'
      }];
      this.generateCalendar();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting calendar:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
