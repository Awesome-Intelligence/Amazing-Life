/**
 * Dashboard View
 * Main dashboard interface for Amazing Life
 */

import { App, ItemView, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { GoalTree, Task, LEVEL_NAMES, STATUS_NAMES, PRIORITY_NAMES, GoalLevel, TaskPriority } from '../types';
import AmazingLife from '../main';

export const DASHBOARD_VIEW_TYPE = 'amazing-life-dashboard';

export class DashboardView extends ItemView {
  private plugin: AmazingLife;
  
  constructor(leaf: WorkspaceLeaf, plugin: AmazingLife) {
    super(leaf);
    this.plugin = plugin;
  }
  
  getViewType(): string {
    return DASHBOARD_VIEW_TYPE;
  }
  
  getDisplayText(): string {
    return 'Amazing Life 仪表盘';
  }
  
  async onOpen(): Promise<void> {
    await this.render();
  }
  
  async onClose(): Promise<void> {
    // Clean up if needed
  }
  
  async render(): Promise<void> {
    const container = this.containerEl;
    container.empty();
    
    // Header
    const header = container.createDiv('dashboard-header');
    header.innerHTML = `
      <div class="dashboard-title">
        <h1>🌟 Amazing Life</h1>
        <p class="dashboard-subtitle">生活管理系统</p>
      </div>
      <div class="dashboard-actions">
        <button class="dashboard-btn primary" id="create-goal-btn">+ 创建目标</button>
        <button class="dashboard-btn" id="create-task-btn">+ 创建任务</button>
      </div>
    `;
    
    // Stats Overview
    const stats = container.createDiv('dashboard-stats');
    const goalTrees = this.plugin.getGoalManager().getGoalTree();
    const allGoals = this.plugin.getGoalManager().getAllGoals();
    const allTasks = this.plugin.getTaskManager().getAllTasks();
    const todayTasks = this.plugin.getTaskManager().getTodayTasks();
    const overdueTasks = this.plugin.getTaskManager().getOverdueTasks();
    const completedTasks = this.plugin.getTaskManager().getCompletedTasks();
    
    const completedThisWeek = completedTasks.filter(t => {
      if (!t['A-completed']) return false;
      const completed = new Date(t['A-completed']);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return completed >= weekAgo;
    }).length;
    
    stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${allGoals.length}</div>
        <div class="stat-label">目标总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${allTasks.length}</div>
        <div class="stat-label">任务总数</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-value">${todayTasks.length}</div>
        <div class="stat-label">今日任务</div>
      </div>
      <div class="stat-card ${overdueTasks.length > 0 ? 'warning' : ''}">
        <div class="stat-value">${overdueTasks.length}</div>
        <div class="stat-label">逾期任务</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${completedThisWeek}</div>
        <div class="stat-label">本周完成</div>
      </div>
    `;
    
    // Main Content - Two Columns
    const main = container.createDiv('dashboard-main');
    
    // Left Column - Goals
    const goalsSection = main.createDiv('dashboard-goals');
    goalsSection.innerHTML = `
      <div class="section-header">
        <h2>🎯 目标概览</h2>
        <button class="dashboard-btn small" id="view-all-goals">查看全部</button>
      </div>
      <div class="goals-list" id="goals-list">
        ${this.renderGoalsList(goalTrees)}
      </div>
    `;
    
    // Right Column - Tasks
    const tasksSection = main.createDiv('dashboard-tasks');
    tasksSection.innerHTML = `
      <div class="section-header">
        <h2>📋 今日任务</h2>
        <button class="dashboard-btn small" id="view-all-tasks">查看全部</button>
      </div>
      <div class="tasks-list" id="tasks-list">
        ${this.renderTasksList(todayTasks)}
      </div>
    `;
    
    // Overdue Tasks Section
    if (overdueTasks.length > 0) {
      const overdueSection = container.createDiv('dashboard-overdue');
      overdueSection.innerHTML = `
        <div class="section-header warning">
          <h2>⚠️ 逾期任务</h2>
        </div>
        <div class="tasks-list">
          ${this.renderTasksList(overdueTasks, true)}
        </div>
      `;
    }
    
    // Quick Actions
    const quickActions = container.createDiv('dashboard-quick-actions');
    quickActions.innerHTML = `
      <div class="section-header">
        <h2>⚡ 快捷操作</h2>
      </div>
      <div class="quick-actions-grid">
        <button class="quick-action-btn" id="open-today-note">
          <span class="quick-action-icon">📝</span>
          <span>今日日记</span>
        </button>
        <button class="quick-action-btn" id="open-weekly-note">
          <span class="quick-action-icon">📅</span>
          <span>本周周记</span>
        </button>
        <button class="quick-action-btn" id="open-monthly-note">
          <span class="quick-action-icon">📆</span>
          <span>本月月记</span>
        </button>
        <button class="quick-action-btn" id="refresh-dashboard">
          <span class="quick-action-icon">🔄</span>
          <span>刷新数据</span>
        </button>
      </div>
    `;
    
    // Bind events
    this.bindEvents();
    
    // Add styles
    this.addStyles();
  }
  
  private renderGoalsList(goalTrees: GoalTree[]): string {
    if (goalTrees.length === 0) {
      return `<div class="empty-state">暂无目标，创建一个开始吧！</div>`;
    }
    
    return goalTrees.slice(0, 5).map(tree => {
      const goal = tree.goal;
      const levelName = LEVEL_NAMES[goal['A-level']];
      
      return `
        <div class="goal-card" data-goal-id="${goal['A-id']}">
          <div class="goal-header">
            <span class="goal-level-badge level-${goal['A-level']}">${levelName}</span>
            <span class="goal-status ${goal['A-status']}">${goal['A-status'] === 'active' ? '进行中' : goal['A-status']}</span>
          </div>
          <h3 class="goal-title">${goal['A-title']}</h3>
          <div class="goal-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${goal['A-progress']}%"></div>
            </div>
            <span class="progress-text">${goal['A-progress']}%</span>
          </div>
          ${tree.children.length > 0 ? `<div class="goal-children">子目标: ${tree.children.length}</div>` : ''}
        </div>
      `;
    }).join('');
  }
  
  private renderTasksList(tasks: Task[], isOverdue = false): string {
    if (tasks.length === 0) {
      return `<div class="empty-state">暂无任务</div>`;
    }
    
    return tasks.slice(0, 8).map(task => {
      const priorityClass = task['A-priority'] <= 2 ? 'high' : task['A-priority'] <= 3 ? 'medium' : 'low';
      const priorityName = PRIORITY_NAMES[task['A-priority']];
      
      return `
        <div class="task-item ${isOverdue ? 'overdue' : ''}" data-task-id="${task['A-id']}">
          <div class="task-checkbox ${task['A-status'] === 'completed' ? 'checked' : ''}">
            ${task['A-status'] === 'completed' ? '✓' : ''}
          </div>
          <div class="task-content">
            <span class="task-title ${task['A-status'] === 'completed' ? 'completed' : ''}">${task['A-title']}</span>
            <div class="task-meta">
              <span class="task-priority priority-${priorityClass}">${priorityName}</span>
              ${task['A-due'] ? `<span class="task-due">${task['A-due']}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  private bindEvents(): void {
    // Create Goal Button
    const createGoalBtn = this.containerEl.querySelector('#create-goal-btn');
    createGoalBtn?.addEventListener('click', () => {
      this.showCreateGoalModal();
    });
    
    // Create Task Button
    const createTaskBtn = this.containerEl.querySelector('#create-task-btn');
    createTaskBtn?.addEventListener('click', () => {
      this.showCreateTaskModal();
    });
    
    // Quick Actions
    this.containerEl.querySelector('#open-today-note')?.addEventListener('click', () => {
      this.openTodayNote();
    });
    
    this.containerEl.querySelector('#open-weekly-note')?.addEventListener('click', () => {
      this.openWeeklyNote();
    });
    
    this.containerEl.querySelector('#open-monthly-note')?.addEventListener('click', () => {
      this.openMonthlyNote();
    });
    
    this.containerEl.querySelector('#refresh-dashboard')?.addEventListener('click', () => {
      this.refresh();
    });
    
    // Task checkboxes
    this.containerEl.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', async (e) => {
        const taskItem = (e.target as HTMLElement).closest('.task-item');
        const taskId = taskItem?.getAttribute('data-task-id');
        if (taskId) {
          await this.toggleTaskStatus(taskId);
        }
      });
    });
  }
  
  private async showCreateGoalModal(): Promise<void> {
    const modal = this.containerEl.createDiv('create-modal');
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>创建目标</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="create-goal-form">
          <div class="form-group">
            <label for="goal-title">目标名称</label>
            <input type="text" id="goal-title" required placeholder="输入目标名称...">
          </div>
          <div class="form-group">
            <label for="goal-level">目标层级</label>
            <select id="goal-level">
              <option value="1">🎯 人生目标</option>
              <option value="2">🎯 阶段目标</option>
              <option value="3" selected>🎯 年度目标</option>
              <option value="4">🎯 短期目标</option>
            </select>
          </div>
          <div class="form-group">
            <label for="goal-parent">父目标（可选）</label>
            <select id="goal-parent">
              <option value="">-- 无 --</option>
              ${this.plugin.getGoalManager().getAllGoals().map(g => 
                `<option value="${g['A-id']}">${g['A-title']}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="goal-due">截止日期（可选）</label>
            <input type="date" id="goal-due">
          </div>
          <div class="form-actions">
            <button type="button" class="dashboard-btn" id="cancel-goal">取消</button>
            <button type="submit" class="dashboard-btn primary">创建</button>
          </div>
        </form>
      </div>
    `;
    
    // Bind modal events
    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-goal')?.addEventListener('click', () => modal.remove());
    
    modal.querySelector('#create-goal-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (modal.querySelector('#goal-title') as HTMLInputElement).value;
      const level = Number((modal.querySelector('#goal-level') as HTMLSelectElement).value) as GoalLevel;
      const parent = (modal.querySelector('#goal-parent') as HTMLSelectElement).value || null;
      const due = (modal.querySelector('#goal-due') as HTMLInputElement).value || null;
      
      await this.plugin.getGoalManager().createGoal({ title, level, parent, due });
      new Notice('目标创建成功！');
      modal.remove();
      await this.render();
    });
  }
  
  private async showCreateTaskModal(): Promise<void> {
    const modal = this.containerEl.createDiv('create-modal');
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>创建任务</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="create-task-form">
          <div class="form-group">
            <label for="task-title">任务名称</label>
            <input type="text" id="task-title" required placeholder="输入任务名称...">
          </div>
          <div class="form-group">
            <label for="task-goal">关联目标（可选）</label>
            <select id="task-goal">
              <option value="">-- 无 --</option>
              ${this.plugin.getGoalManager().getAllGoals().map(g => 
                `<option value="${g['A-id']}">${g['A-title']}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="task-priority">优先级</label>
            <select id="task-priority">
              <option value="1">🔴 最高</option>
              <option value="2">🟠 高</option>
              <option value="3" selected>🟡 中</option>
              <option value="4">🟢 低</option>
              <option value="5">⚪ 最低</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-due">截止日期（可选）</label>
            <input type="date" id="task-due">
          </div>
          <div class="form-actions">
            <button type="button" class="dashboard-btn" id="cancel-task">取消</button>
            <button type="submit" class="dashboard-btn primary">创建</button>
          </div>
        </form>
      </div>
    `;
    
    // Bind modal events
    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-task')?.addEventListener('click', () => modal.remove());
    
    modal.querySelector('#create-task-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (modal.querySelector('#task-title') as HTMLInputElement).value;
      const goal = (modal.querySelector('#task-goal') as HTMLSelectElement).value || null;
      const priority = Number((modal.querySelector('#task-priority') as HTMLSelectElement).value) as TaskPriority;
      const due = (modal.querySelector('#task-due') as HTMLInputElement).value || null;
      
      await this.plugin.getTaskManager().createTask({ title, goal, priority, due });
      new Notice('任务创建成功！');
      modal.remove();
      await this.render();
    });
  }
  
  private async toggleTaskStatus(taskId: string): Promise<void> {
    const task = this.plugin.getTaskManager().getTask(taskId);
    if (!task) return;
    
    if (task['A-status'] === 'completed') {
      await this.plugin.getTaskManager().updateTask(taskId, { status: 'pending' });
    } else {
      await this.plugin.getTaskManager().completeTask(taskId);
    }
    
    await this.render();
  }
  
  private async openTodayNote(): Promise<void> {
    const today = this.plugin.getNoteManager().getToday();
    const notePath = this.plugin.getSettings().dailyPath + '/' + today + '.md';
    
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (file && file instanceof TFile) {
      await this.app.workspace.getLeaf(true).openFile(file);
    } else {
      new Notice('今日日记不存在');
    }
  }
  
  private async openWeeklyNote(): Promise<void> {
    const weekKey = this.plugin.getNoteManager().getCurrentWeekKey();
    const notePath = this.plugin.getSettings().weeklyPath + '/' + weekKey + '.md';
    
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (file && file instanceof TFile) {
      await this.app.workspace.getLeaf(true).openFile(file);
    } else {
      new Notice('周记不存在');
    }
  }
  
  private async openMonthlyNote(): Promise<void> {
    const yearMonth = this.plugin.getNoteManager().getCurrentYearMonth();
    const notePath = this.plugin.getSettings().monthlyPath + '/' + yearMonth + '.md';
    
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (file && file instanceof TFile) {
      await this.app.workspace.getLeaf(true).openFile(file);
    } else {
      new Notice('月记不存在');
    }
  }
  
  async refresh(): Promise<void> {
    await this.plugin.getGoalManager().loadGoals();
    await this.plugin.getTaskManager().loadTasks();
    await this.render();
    new Notice('数据已刷新');
  }
  
  private addStyles(): void {
    // Check if styles already added
    if (document.getElementById('amazing-life-dashboard-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'amazing-life-dashboard-styles';
    style.textContent = `
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border-color);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px 8px 0 0;
        margin: -12px -12px 12px -12px;
      }
      
      .dashboard-title h1 {
        margin: 0;
        font-size: 24px;
      }
      
      .dashboard-subtitle {
        margin: 4px 0 0;
        opacity: 0.9;
        font-size: 14px;
      }
      
      .dashboard-actions {
        display: flex;
        gap: 8px;
      }
      
      .dashboard-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        background: rgba(255,255,255,0.2);
        color: white;
      }
      
      .dashboard-btn:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .dashboard-btn.primary {
        background: white;
        color: #667eea;
      }
      
      .dashboard-btn.primary:hover {
        background: #f0f0f0;
      }
      
      .dashboard-btn.small {
        padding: 4px 12px;
        font-size: 12px;
      }
      
      .dashboard-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .stat-card {
        background: var(--background-secondary);
        padding: 16px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid var(--border-color);
      }
      
      .stat-card.warning {
        border-color: #ef4444;
        background: #fef2f2;
      }
      
      .stat-card.success {
        border-color: #22c55e;
        background: #f0fdf4;
      }
      
      .stat-card.highlight {
        border-color: #667eea;
        background: #eef2ff;
      }
      
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: var(--text-primary);
      }
      
      .stat-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
      
      .dashboard-main {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      @media (max-width: 800px) {
        .dashboard-main {
          grid-template-columns: 1fr;
        }
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      
      .section-header h2 {
        margin: 0;
        font-size: 18px;
      }
      
      .section-header.warning h2 {
        color: #ef4444;
      }
      
      .goals-list, .tasks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .goal-card {
        background: var(--background-secondary);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .goal-card:hover {
        border-color: #667eea;
        transform: translateY(-2px);
      }
      
      .goal-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .goal-level-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        background: var(--interactive-accent);
        color: white;
      }
      
      .goal-level-badge.level-1 { background: #8b5cf6; }
      .goal-level-badge.level-2 { background: #7c3aed; }
      .goal-level-badge.level-3 { background: #6d28d9; }
      .goal-level-badge.level-4 { background: #5b21b6; }
      
      .goal-status {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        background: #22c55e;
        color: white;
      }
      
      .goal-status.completed {
        background: #6b7280;
      }
      
      .goal-title {
        margin: 0 0 8px;
        font-size: 14px;
      }
      
      .goal-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .progress-bar {
        flex: 1;
        height: 6px;
        background: var(--background-modifier-border);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        font-size: 12px;
        color: var(--text-secondary);
        min-width: 35px;
      }
      
      .goal-children {
        margin-top: 8px;
        font-size: 11px;
        color: var(--text-secondary);
      }
      
      .task-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--background-secondary);
        border-radius: 6px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .task-item:hover {
        border-color: #667eea;
      }
      
      .task-item.overdue {
        border-color: #ef4444;
        background: #fef2f2;
      }
      
      .task-checkbox {
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      
      .task-checkbox.checked {
        background: #22c55e;
        border-color: #22c55e;
      }
      
      .task-content {
        flex: 1;
        min-width: 0;
      }
      
      .task-title {
        display: block;
        font-size: 14px;
        margin-bottom: 4px;
      }
      
      .task-title.completed {
        text-decoration: line-through;
        color: var(--text-secondary);
      }
      
      .task-meta {
        display: flex;
        gap: 8px;
        font-size: 11px;
      }
      
      .task-priority {
        padding: 1px 6px;
        border-radius: 3px;
      }
      
      .priority-high {
        background: #fee2e2;
        color: #dc2626;
      }
      
      .priority-medium {
        background: #fef3c7;
        color: #d97706;
      }
      
      .priority-low {
        background: #dcfce7;
        color: #16a34a;
      }
      
      .task-due {
        color: var(--text-secondary);
      }
      
      .dashboard-overdue {
        background: #fef2f2;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #fecaca;
      }
      
      .dashboard-quick-actions {
        background: var(--background-secondary);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
      }
      
      .quick-actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      
      .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px;
        background: var(--background-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .quick-action-btn:hover {
        border-color: #667eea;
        transform: translateY(-2px);
      }
      
      .quick-action-icon {
        font-size: 24px;
      }
      
      .quick-action-btn span:last-child {
        font-size: 12px;
        color: var(--text-secondary);
      }
      
      .empty-state {
        text-align: center;
        padding: 24px;
        color: var(--text-secondary);
        background: var(--background-secondary);
        border-radius: 8px;
      }
      
      /* Modal Styles */
      .create-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
      }
      
      .modal-content {
        position: relative;
        background: var(--background-primary);
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .modal-header h2 {
        margin: 0;
        font-size: 20px;
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary);
      }
      
      .modal-close:hover {
        color: var(--text-primary);
      }
      
      .modal-form .form-group {
        margin-bottom: 16px;
      }
      
      .modal-form label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
      }
      
      .modal-form input,
      .modal-form select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 14px;
        background: var(--background-primary);
        color: var(--text-primary);
      }
      
      .modal-form input:focus,
      .modal-form select:focus {
        outline: none;
        border-color: #667eea;
      }
      
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }
    `;
    document.head.appendChild(style);
  }
}
