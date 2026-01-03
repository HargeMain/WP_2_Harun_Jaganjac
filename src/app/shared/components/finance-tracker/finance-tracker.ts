import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { TrackersService } from '../../../core/services/trackers.service';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  category: string;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'cancelled';
  recurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  notes: string;
}

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  transactions: Transaction[];
  goal?: number;
}

interface Budget {
  id: string;
  name: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
}

interface FinanceInsight {
  message: string;
  type: 'positive' | 'neutral' | 'warning' | 'critical';
}

@Component({
  selector: 'app-finance-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './finance-tracker.html',
  styleUrls: ['./finance-tracker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceTrackerComponent implements OnInit {
  @Input() primaryColor = '#0f766e';
  @Input() secondaryColor = '#ffffff';

  accountForm!: FormGroup;
  transactionForm!: FormGroup;
  budgetForm!: FormGroup;
  
  accounts: Account[] = [];
  budgets: Budget[] = [];
  filteredTransactions: Transaction[] = [];
  financeInsights: FinanceInsight[] = [];
  
  isLoading = false;
  userId = '';
  showSaveNotification = false;
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  
  totalBalance = 0;
  totalIncome = 0;
  totalExpenses = 0;
  netFlow = 0;
  savingsRate = 0;
  budgetUtilization = 0;
  
  categories = [
    'Food & Dining',
    'Shopping',
    'Housing',
    'Transportation',
    'Entertainment',
    'Healthcare',
    'Education',
    'Utilities',
    'Salary',
    'Investment',
    'Other'
  ];
  
  paymentMethods = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'PayPal', 'Other'];

  filterType: 'all' | 'income' | 'expense' | 'transfer' | 'investment' = 'all';
  filterCategory: string = 'all';
  filterAccount: string = 'all';
  filterDateFrom: string = '';
  filterDateTo: string = '';
  
  activeView: 'list' | 'summary' | 'charts' = 'list';

  constructor(
    private fb: FormBuilder,
    private trackerService: TrackersService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  private initializeForms() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];

    this.accountForm = this.fb.group({
      name: ['', Validators.required],
      type: ['checking', Validators.required],
      initialBalance: [0, [Validators.required, Validators.min(0)]],
      currency: ['USD', Validators.required],
      goal: [0]
    });

    this.transactionForm = this.fb.group({
      accountId: ['', Validators.required],
      date: [today, Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      category: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      status: ['completed', Validators.required],
      recurring: [false],
      recurringFrequency: ['monthly'],
      notes: ['']
    });

    this.budgetForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      limit: [0, [Validators.required, Validators.min(1)]],
      period: ['monthly', Validators.required],
      startDate: [firstDayOfMonth, Validators.required],
      endDate: [lastDayOfMonth, Validators.required]
    });
  }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userId = user.uid;
      this.loadFinanceData();
    }
  }

  async loadFinanceData() {
    this.isLoading = true;
    try {
      const trackers = await this.trackerService.getTrackers(this.userId);
      const financeData = trackers?.financeTracker || { accounts: [], budgets: [] };
      if (typeof financeData === 'object' && financeData !== null && !Array.isArray(financeData)) {
        this.accounts = financeData.accounts || [];
        this.budgets = financeData.budgets || [];
      } else {
        this.accounts = [];
        this.budgets = [];
      }
      this.calculateFinancialMetrics();
      this.generateFinanceInsights();
      this.filterTransactions();
      this.updatePagination();
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateFinancialMetrics() {
    this.totalBalance = 0;
    this.totalIncome = 0;
    this.totalExpenses = 0;
    this.netFlow = 0;
    
    this.accounts.forEach(account => {
      this.totalBalance += account.balance;
      
      account.transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          this.totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
          this.totalExpenses += transaction.amount;
        }
      });
    });
    
    this.netFlow = this.totalIncome - this.totalExpenses;
    this.savingsRate = this.totalIncome > 0 ? (this.netFlow / this.totalIncome) * 100 : 0;
    
    let totalSpent = 0;
    let totalBudget = 0;
    this.budgets.forEach(budget => {
      totalSpent += budget.spent;
      totalBudget += budget.limit;
    });
    this.budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  }

  private generateFinanceInsights() {
    this.financeInsights = [];

    if (this.netFlow > 0) {
      this.financeInsights.push({
        message: `Positive cash flow: +${this.formatCurrency(this.netFlow)} this period! Keep it up! 💰`,
        type: 'positive'
      });
    } else if (this.netFlow < 0) {
      this.financeInsights.push({
        message: `Negative cash flow: ${this.formatCurrency(this.netFlow)}. Consider reviewing expenses. 📉`,
        type: 'warning'
      });
    }

    if (this.savingsRate >= 20) {
      this.financeInsights.push({
        message: `Excellent savings rate: ${this.savingsRate.toFixed(1)}%! You're building wealth effectively! 🏦`,
        type: 'positive'
      });
    } else if (this.savingsRate >= 10) {
      this.financeInsights.push({
        message: `Good savings rate: ${this.savingsRate.toFixed(1)}%. On track for financial goals! 📈`,
        type: 'positive'
      });
    } else if (this.savingsRate < 0) {
      this.financeInsights.push({
        message: `You're spending more than you earn! Immediate action needed! ⚠️`,
        type: 'critical'
      });
    }

    if (this.budgetUtilization > 90) {
      this.financeInsights.push({
        message: `High budget utilization: ${this.budgetUtilization.toFixed(1)}%. Some categories may be over budget! 🚨`,
        type: 'warning'
      });
    } else if (this.budgetUtilization > 100) {
      this.financeInsights.push({
        message: `You've exceeded your budget by ${(this.budgetUtilization - 100).toFixed(1)}%! Review spending! 🔔`,
        type: 'critical'
      });
    }

    const largeExpense = this.getLargestExpense();
    if (largeExpense) {
      this.financeInsights.push({
        message: `Largest expense: ${largeExpense.description} (${this.formatCurrency(largeExpense.amount)}) 💸`,
        type: 'neutral'
      });
    }

    if (this.financeInsights.length === 0) {
      this.financeInsights.push({
        message: "Start tracking your finances to gain insights and improve your financial health! 📊",
        type: 'neutral'
      });
    }
  }

  private getLargestExpense(): Transaction | null {
    let largest: Transaction | null = null;
    
    this.accounts.forEach(account => {
      account.transactions.forEach(transaction => {
        if (transaction.type === 'expense' && 
            (!largest || transaction.amount > largest.amount)) {
          largest = transaction;
        }
      });
    });
    
    return largest;
  }

  async addAccount() {
    if (this.accountForm.invalid) return;

    this.isLoading = true;
    const formValue = this.accountForm.value;
    const newAccount: Account = {
      id: this.generateId(),
      name: formValue.name,
      type: formValue.type,
      balance: formValue.initialBalance,
      currency: formValue.currency,
      transactions: [],
      goal: formValue.goal || undefined
    };

    const updatedAccounts = [...this.accounts, newAccount];
    
    try {
      await this.saveFinanceData(updatedAccounts, this.budgets);
      
      this.accounts = updatedAccounts;
      this.calculateFinancialMetrics();
      this.generateFinanceInsights();
      this.accountForm.reset({
        name: '',
        type: 'checking',
        initialBalance: 0,
        currency: 'USD',
        goal: 0
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async addTransaction() {
    if (this.transactionForm.invalid) return;

    this.isLoading = true;
    const transactionData = this.transactionForm.value;
    
    const newTransaction: Transaction = {
      id: this.generateId(),
      date: transactionData.date,
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      category: transactionData.category,
      paymentMethod: transactionData.paymentMethod,
      status: transactionData.status,
      recurring: transactionData.recurring || false,
      recurringFrequency: transactionData.recurringFrequency,
      notes: transactionData.notes || ''
    };

    const accountIndex = this.accounts.findIndex(a => a.id === transactionData.accountId);
    if (accountIndex > -1) {
      const updatedAccounts = [...this.accounts];
      updatedAccounts[accountIndex].transactions.push(newTransaction);
      
      const updatedBudgets = this.updateBudgetsForTransaction(newTransaction);
      
      try {
        await this.saveFinanceData(updatedAccounts, updatedBudgets);
        
        this.accounts = updatedAccounts;
        this.budgets = updatedBudgets;
        this.calculateFinancialMetrics();
        this.generateFinanceInsights();
        this.filterTransactions();
        
        const today = new Date().toISOString().split('T')[0];
        this.transactionForm.reset({
          accountId: '',
          date: today,
          description: '',
          amount: 0,
          type: 'expense',
          category: '',
          paymentMethod: '',
          status: 'completed',
          recurring: false,
          recurringFrequency: 'monthly',
          notes: ''
        });
        
        this.showSaveNotification = true;
        setTimeout(() => this.showSaveNotification = false, 2500);
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error saving transaction:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  async addBudget() {
    if (this.budgetForm.invalid) return;

    this.isLoading = true;
    const budgetData = this.budgetForm.value;
    
    const newBudget: Budget = {
      id: this.generateId(),
      name: budgetData.name,
      category: budgetData.category,
      limit: budgetData.limit,
      spent: 0,
      period: budgetData.period,
      startDate: budgetData.startDate,
      endDate: budgetData.endDate
    };

    const updatedBudgets = [...this.budgets, newBudget];
    
    try {
      await this.saveFinanceData(this.accounts, updatedBudgets);
      
      this.budgets = updatedBudgets;
      this.calculateFinancialMetrics();
      this.generateFinanceInsights();
      
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];
      
      this.budgetForm.reset({
        name: '',
        category: '',
        limit: 0,
        period: 'monthly',
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth
      });
      
      this.showSaveNotification = true;
      setTimeout(() => this.showSaveNotification = false, 2500);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving budget:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private updateBudgetsForTransaction(transaction: Transaction): Budget[] {
    if (transaction.type !== 'expense') return this.budgets;
    
    const updatedBudgets = [...this.budgets];
    const transactionDate = new Date(transaction.date);
    
    updatedBudgets.forEach(budget => {
      const budgetStart = new Date(budget.startDate);
      const budgetEnd = new Date(budget.endDate);
      
      if (budget.category === transaction.category &&
          transactionDate >= budgetStart &&
          transactionDate <= budgetEnd) {
        budget.spent += transaction.amount;
      }
    });
    
    return updatedBudgets;
  }

  async deleteTransaction(accountId: string, transactionId: string) {
    const accountIndex = this.accounts.findIndex(a => a.id === accountId);
    if (accountIndex > -1) {
      const updatedAccounts = [...this.accounts];
      const transactionIndex = updatedAccounts[accountIndex].transactions.findIndex(t => t.id === transactionId);
      
      if (transactionIndex > -1) {
        const transaction = updatedAccounts[accountIndex].transactions[transactionIndex];
        updatedAccounts[accountIndex].transactions.splice(transactionIndex, 1);
        
        const updatedBudgets = this.removeTransactionFromBudgets(transaction);
        
        try {
          await this.saveFinanceData(updatedAccounts, updatedBudgets);
          
          this.accounts = updatedAccounts;
          this.budgets = updatedBudgets;
          this.calculateFinancialMetrics();
          this.generateFinanceInsights();
          this.filterTransactions();
          this.cdr.detectChanges();
        } catch (error) {
          console.error('Error deleting transaction:', error);
        }
      }
    }
  }

  private removeTransactionFromBudgets(transaction: Transaction): Budget[] {
    if (transaction.type !== 'expense') return this.budgets;
    
    const updatedBudgets = [...this.budgets];
    const transactionDate = new Date(transaction.date);
    
    updatedBudgets.forEach(budget => {
      const budgetStart = new Date(budget.startDate);
      const budgetEnd = new Date(budget.endDate);
      
      if (budget.category === transaction.category &&
          transactionDate >= budgetStart &&
          transactionDate <= budgetEnd) {
        budget.spent = Math.max(0, budget.spent - transaction.amount);
      }
    });
    
    return updatedBudgets;
  }

  async deleteBudget(budgetId: string) {
    const updatedBudgets = this.budgets.filter(b => b.id !== budgetId);
    
    try {
      await this.saveFinanceData(this.accounts, updatedBudgets);
      
      this.budgets = updatedBudgets;
      this.calculateFinancialMetrics();
      this.generateFinanceInsights();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  }

  async updateAccountBalance(accountId: string, newBalance: number) {
    const accountIndex = this.accounts.findIndex(a => a.id === accountId);
    if (accountIndex > -1) {
      const updatedAccounts = [...this.accounts];
      updatedAccounts[accountIndex].balance = newBalance;
      
      try {
        await this.saveFinanceData(updatedAccounts, this.budgets);
        
        this.accounts = updatedAccounts;
        this.calculateFinancialMetrics();
        this.generateFinanceInsights();
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error updating account balance:', error);
      }
    }
  }

  private async saveFinanceData(accounts: Account[], budgets: Budget[]) {
    const financeData = {
      accounts,
      budgets,
      lastUpdated: new Date().toISOString()
    };
    
    await this.trackerService.updateTracker(
      this.userId,
      'financeTracker',
      financeData
    );
  }

  filterTransactions() {
    this.filteredTransactions = [];
    
    this.accounts.forEach(account => {
      account.transactions.forEach(transaction => {
        if (this.filterType !== 'all' && transaction.type !== this.filterType) return;
        if (this.filterCategory !== 'all' && transaction.category !== this.filterCategory) return;
        if (this.filterAccount !== 'all' && account.id !== this.filterAccount) return;
        if (this.filterDateFrom && transaction.date < this.filterDateFrom) return;
        if (this.filterDateTo && transaction.date > this.filterDateTo) return;
        
        this.filteredTransactions.push(transaction);
      });
    });
    
    this.updatePagination();
    this.cdr.detectChanges();
  }

  private updatePagination() {
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  getDisplayedTransactions(): Transaction[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredTransactions.slice(startIndex, endIndex);
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

  formatCurrency(amount: number): string {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
    
    return amount < 0 ? `-${formatted}` : formatted;
  }

  getTransactionTypeColor(type: Transaction['type']): string {
    switch (type) {
      case 'income': return '#10b981';
      case 'expense': return '#ef4444';
      case 'transfer': return '#3b82f6';
      case 'investment': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  getAccountTypeColor(type: Account['type']): string {
    switch (type) {
      case 'checking': return '#3b82f6';
      case 'savings': return '#10b981';
      case 'credit': return '#ef4444';
      case 'investment': return '#8b5cf6';
      case 'cash': return '#f59e0b';
      default: return '#6b7280';
    }
  }

  getStatusColor(status: Transaction['status']): string {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getDaysAgo(date: string): number {
    const today = new Date();
    const transactionDate = new Date(date);
    const diffTime = today.getTime() - transactionDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Dodate metode za template
  getAccountName(transaction: Transaction): string {
    const account = this.accounts.find(acc => 
      acc.transactions.some(t => t.id === transaction.id)
    );
    return account ? account.name : 'Unknown Account';
  }

  getTransactionAccountId(transaction: Transaction): string {
    const account = this.accounts.find(acc => 
      acc.transactions.some(t => t.id === transaction.id)
    );
    return account ? account.id : '';
  }

  getGoalProgress(account: Account): number {
    if (!account.goal || account.goal <= 0) {
      return 0;
    }
    const progress = (account.balance / account.goal) * 100;
    return Math.min(progress, 100);
  }

  async resetFinanceTracker() {
      try {
        await this.trackerService.resetTracker(this.userId, 'financeTracker');
        this.accounts = [];
        this.budgets = [];
        this.filteredTransactions = [];
        this.calculateFinancialMetrics();
        this.financeInsights = [{
          message: "Fresh start! Ready to track your finances? 💰",
          type: 'neutral'
        }];
        this.currentPage = 1;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error resetting finance tracker:', error);
      }
  }
}