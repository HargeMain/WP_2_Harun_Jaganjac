import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface Task {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  assignedTo?: string;
  dependencies: string[];
  tags: string[];
  createdAt: string;
  completedAt?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
}

interface TaskDisplay {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  projectName: string;
  assignedTo?: string;
}

interface ProjectInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning' | 'critical';
}

@Component({
  selector: 'app-task-project-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './task-project-planner.html',
  styleUrls: ['./task-project-planner.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskProjectPlannerComponent implements OnInit {
  @Input() primaryColor = '#1e3a8a';
  @Input() secondaryColor = '#ffffff';

  projectForm!: FormGroup;
  taskForm!: FormGroup;
  projects: Project[] = [];
  filteredTasks: TaskDisplay[] = [];
  aiInsights: ProjectInsight[] = [];
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  
  totalProjects = 0;
  activeProjects = 0;
  completedTasks = 0;
  totalTasks = 0;
  overdueTasks = 0;
  completionRate = 0;
  productivityScore = 0;
  totalHoursWorked = 0;
  totalHoursEstimated = 0;
  efficiencyRate = 0;

  filterStatus: 'all' | 'todo' | 'in-progress' | 'review' | 'completed' = 'all';
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent' = 'all';
  filterProject: string = 'all';
  
  activeView: 'list' | 'board' | 'timeline' = 'list';

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      endDate: ['', Validators.required],
      status: ['planning', Validators.required]
    });

    this.taskForm = this.fb.group({
      projectId: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      priority: ['medium', Validators.required],
      status: ['todo', Validators.required],
      dueDate: ['', Validators.required],
      estimatedHours: [1, [Validators.required, Validators.min(0.5)]],
      assignedTo: [''],
      tags: this.fb.array([])
    });
  }

  get tags(): FormArray {
    return this.taskForm.get('tags') as FormArray;
  }

  addTag() {
    this.tags.push(this.fb.control(''));
  }

  removeTag(index: number) {
    this.tags.removeAt(index);
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadProjects();
    }
  }

  async loadProjects() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      this.projects = trackers?.taskProjectPlanner || [];
      this.calculateMetrics();
      this.generateAIInsights();
      this.filterTasks();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateMetrics() {
    this.totalProjects = this.projects.length;
    this.activeProjects = this.projects.filter(p => p.status === 'active').length;
    
    this.completedTasks = 0;
    this.totalTasks = 0;
    this.overdueTasks = 0;
    this.totalHoursWorked = 0;
    this.totalHoursEstimated = 0;
    
    const today = new Date();
    
    this.projects.forEach(project => {
      this.totalTasks += project.tasks.length;
      project.tasks.forEach(task => {
        if (task.status === 'completed') {
          this.completedTasks++;
          this.totalHoursWorked += task.actualHours || 0;
        }
        this.totalHoursEstimated += task.estimatedHours;
        
        if (task.status !== 'completed' && task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (dueDate < today) {
            this.overdueTasks++;
          }
        }
      });
    });
    
    this.completionRate = this.totalTasks > 0 ? (this.completedTasks / this.totalTasks) * 100 : 0;
    this.efficiencyRate = this.totalHoursEstimated > 0 ? 
      (this.totalHoursWorked / this.totalHoursEstimated) * 100 : 0;
    
    const completionWeight = 0.4;
    const efficiencyWeight = 0.3;
    const activeProjectsWeight = 0.2;
    const overduePenalty = 0.1;
    
    const completionScore = this.completionRate;
    const efficiencyScore = Math.min(100, this.efficiencyRate * 1.2);
    const activeScore = (this.activeProjects / Math.max(1, this.totalProjects)) * 100;
    const overduePenaltyScore = Math.max(0, 100 - (this.overdueTasks * 10));
    
    this.productivityScore = Math.round(
      (completionScore * completionWeight) +
      (efficiencyScore * efficiencyWeight) +
      (activeScore * activeProjectsWeight) +
      (overduePenaltyScore * overduePenalty)
    );
  }

  private generateAIInsights() {
    this.aiInsights = [];

    if (this.productivityScore >= 80) {
      this.aiInsights.push({
        message: `Excellent productivity score: ${this.productivityScore}/100! Your team is performing exceptionally well! 🚀`,
        type: 'positive'
      });
    } else if (this.productivityScore >= 60) {
      this.aiInsights.push({
        message: `Good productivity score: ${this.productivityScore}/100. Keep up the momentum! 📈`,
        type: 'positive'
      });
    } else if (this.productivityScore > 0) {
      this.aiInsights.push({
        message: `Productivity score: ${this.productivityScore}/100. Consider reviewing task assignments and deadlines. 📊`,
        type: 'neutral'
      });
    }

    if (this.overdueTasks > 5) {
      this.aiInsights.push({
        message: `Critical: ${this.overdueTasks} tasks are overdue! Need immediate attention! ⚠️`,
        type: 'critical'
      });
    } else if (this.overdueTasks > 0) {
      this.aiInsights.push({
        message: `${this.overdueTasks} tasks are overdue. Consider adjusting priorities or deadlines. 🔔`,
        type: 'warning'
      });
    }

    if (this.completionRate >= 90) {
      this.aiInsights.push({
        message: `Outstanding completion rate: ${Math.round(this.completionRate)}%! Your team delivers consistently! ✅`,
        type: 'positive'
      });
    } else if (this.completionRate >= 70) {
      this.aiInsights.push({
        message: `Solid completion rate: ${Math.round(this.completionRate)}%. Well on track! 📅`,
        type: 'positive'
      });
    } else if (this.completionRate > 0) {
      this.aiInsights.push({
        message: `Completion rate: ${Math.round(this.completionRate)}%. Focus on completing pending tasks. ⏳`,
        type: 'neutral'
      });
    }

    if (this.efficiencyRate <= 80) {
      this.aiInsights.push({
        message: `Efficiency rate: ${Math.round(this.efficiencyRate)}%. Tasks are taking longer than estimated. Consider better estimation. ⏱️`,
        type: 'warning'
      });
    } else if (this.efficiencyRate >= 120) {
      this.aiInsights.push({
        message: `Great efficiency! Tasks are completed ${Math.round(this.efficiencyRate - 100)}% faster than estimated! 🎯`,
        type: 'positive'
      });
    }

    if (this.activeProjects >= 3) {
      this.aiInsights.push({
        message: `${this.activeProjects} active projects. Ensure resources aren't spread too thin. 🤹‍♂️`,
        type: 'warning'
      });
    }

    if (this.aiInsights.length === 0) {
      this.aiInsights.push({
        message: "Start planning your projects and tasks to track progress and boost productivity! 📋",
        type: 'neutral'
      });
    }
  }

  async addProject() {
    if (this.projectForm.invalid) return;

    this.isLoading = true;
    const newProject: Project = {
      id: this.generateId(),
      ...this.projectForm.value,
      tasks: []
    };

    const updatedProjects = [...this.projects, newProject];

    try {
      await this.trackerService.updateTracker(
        this.userId,
        'taskProjectPlanner',
        updatedProjects
      );
      
      this.projects = updatedProjects;
      this.calculateMetrics();
      this.generateAIInsights();
      this.projectForm.reset({
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'planning'
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async addTask() {
    if (this.taskForm.invalid) return;

    this.isLoading = true;
    const taskData = this.taskForm.value;
    
    const newTask: Task = {
      id: this.generateId(),
      ...taskData,
      actualHours: 0,
      dependencies: [],
      tags: taskData.tags || [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    const projectIndex = this.projects.findIndex(p => p.id === taskData.projectId);
    if (projectIndex > -1) {
      const updatedProjects = [...this.projects];
      updatedProjects[projectIndex].tasks.push(newTask);
      
      try {
        await this.trackerService.updateTracker(
          this.userId,
          'taskProjectPlanner',
          updatedProjects
        );
        
        this.projects = updatedProjects;
        this.calculateMetrics();
        this.generateAIInsights();
        this.filterTasks();
        this.taskForm.reset({
          projectId: '',
          name: '',
          description: '',
          priority: 'medium',
          status: 'todo',
          dueDate: '',
          estimatedHours: 1,
          assignedTo: ''
        });
        this.tags.clear();
        
        this.showSaveNotification = true;
        setTimeout(() => this.showSaveNotification = false, 2500);
      } catch (error) {
        console.error('Error saving task:', error);
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  async updateTaskStatus(projectId: string, taskId: string, newStatus: Task['status']) {
    const projectIndex = this.projects.findIndex(p => p.id === projectId);
    if (projectIndex > -1) {
      const taskIndex = this.projects[projectIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex > -1) {
        const updatedProjects = [...this.projects];
        updatedProjects[projectIndex].tasks[taskIndex].status = newStatus;
        
        if (newStatus === 'completed') {
          updatedProjects[projectIndex].tasks[taskIndex].completedAt = new Date().toISOString().split('T')[0];
        }
        
        try {
          await this.trackerService.updateTracker(
            this.userId,
            'taskProjectPlanner',
            updatedProjects
          );
          
          this.projects = updatedProjects;
          this.calculateMetrics();
          this.generateAIInsights();
          this.filterTasks();
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Error updating task status:', error);
        }
      }
    }
  }

  async updateTaskHours(projectId: string, taskId: string, hours: number) {
    const projectIndex = this.projects.findIndex(p => p.id === projectId);
    if (projectIndex > -1) {
      const taskIndex = this.projects[projectIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex > -1) {
        const updatedProjects = [...this.projects];
        updatedProjects[projectIndex].tasks[taskIndex].actualHours = hours;
        
        try {
          await this.trackerService.updateTracker(
            this.userId,
            'taskProjectPlanner',
            updatedProjects
          );
          
          this.projects = updatedProjects;
          this.calculateMetrics();
          this.generateAIInsights();
          this.filterTasks();
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Error updating task hours:', error);
        }
      }
    }
  }

  async updateProjectStatus(projectId: string, newStatus: Project['status']) {
    const projectIndex = this.projects.findIndex(p => p.id === projectId);
    if (projectIndex > -1) {
      const updatedProjects = [...this.projects];
      updatedProjects[projectIndex].status = newStatus;
      
      try {
        await this.trackerService.updateTracker(
          this.userId,
          'taskProjectPlanner',
          updatedProjects
        );
        
        this.projects = updatedProjects;
        this.calculateMetrics();
        this.generateAIInsights();
        this.filterTasks();
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error updating project status:', error);
      }
    }
  }

  filterTasks() {
    this.filteredTasks = [];
    
    this.projects.forEach(project => {
      project.tasks.forEach(task => {
        if (this.filterStatus !== 'all' && task.status !== this.filterStatus) return;
        if (this.filterPriority !== 'all' && task.priority !== this.filterPriority) return;
        if (this.filterProject !== 'all' && project.id !== this.filterProject) return;
        
        this.filteredTasks.push({
          id: task.id,
          name: task.name,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          projectName: project.name,
          assignedTo: task.assignedTo
        });
      });
    });
    
    this.updatePagination();
  }

  private updatePagination() {
    this.totalPages = Math.ceil(this.filteredTasks.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getDisplayedTasks(): TaskDisplay[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredTasks.slice(startIndex, endIndex);
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    
    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.cdr.detectChanges();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  getPriorityColor(priority: Task['priority']): string {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  }

  getStatusColor(status: Task['status']): string {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in-progress': return '#3b82f6';
      case 'review': return '#8b5cf6';
      case 'todo': return '#6b7280';
      default: return '#6b7280';
    }
  }

  getProjectStatusColor(status: Project['status']): string {
    switch (status) {
      case 'active': return '#3b82f6';
      case 'completed': return '#22c55e';
      case 'on-hold': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      case 'planning': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async resetPlanner() {
    try {
      await this.trackerService.resetTracker(this.userId, 'taskProjectPlanner');
      this.projects = [];
      this.filteredTasks = [];
      this.calculateMetrics();
      this.aiInsights = [{
        message: "Fresh start! Ready to plan your next big project? 🚀",
        type: 'neutral'
      }];
      this.currentPage = 1;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error resetting planner:', error);
    }
  }
}
