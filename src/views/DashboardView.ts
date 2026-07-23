/**
 * Dashboard View - Clean Layout Version
 */

import { ItemView, Notice } from 'obsidian';
import { Goal, Task, GoalLevel, TaskPriority } from '../types';
import AmazingLife from '../main';

export const DASHBOARD_VIEW_TYPE = 'amazing-life-dashboard';

export class DashboardView extends ItemView {
  private plugin: AmazingLife;
  
  constructor(leaf: any, plugin: AmazingLife) {
    super(leaf);
    this.plugin = plugin;
  }
  
  getViewType(): string {
    return DASHBOARD_VIEW_TYPE;
  }
  
  getDisplayText(): string {
    return 'Amazing Life';
  }
  
  getIcon(): string {
    return 'target';
  }
  
  async onOpen(): Promise<void> {
    await this.loadAndRender();
  }
  
  async onClose(): Promise<void> {
    this.removeStyles();
  }
  
  private async loadAndRender(): Promise<void> {
    try {
      await this.plugin.getGoalManager().loadGoals();
      await this.plugin.getTaskManager().loadTasks();
      this.render();
    } catch (error) {
      console.error('[AL] Error loading data:', error);
      new Notice('加载数据失败: ' + (error as Error).message);
    }
  }
  
  render(): void {
    const content = this.contentEl;
    content.empty();
    content.className = 'al-dashboard';
    
    const allGoals = this.plugin.getGoalManager().getAllGoals();
    const allTasks = this.plugin.getTaskManager().getAllTasks();
    const todayTasks = this.plugin.getTaskManager().getTodayTasks();
    const overdueTasks = this.plugin.getTaskManager().getOverdueTasks();
    const completedTasks = this.plugin.getTaskManager().getCompletedTasks();
    
    const weekComplete = this.calculateWeekComplete(completedTasks);
    const activeTasks = allTasks.filter(t => t['A-status'] !== 'completed' && t['A-status'] !== 'cancelled').length;
    
    content.innerHTML = `
      <div class="al-page">
        <div class="al-header">
          <div class="al-header-left">
            <div class="al-title">
              <span>🎯</span>
              <span>Amazing Life</span>
            </div>
            <div class="al-date">${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
          </div>
          <div class="al-header-actions">
            <button id="al-refresh-btn">
              <span>🔄</span>
              <span>刷新</span>
            </button>
            <button class="mod-cta" id="al-create-goal-btn">
              <span>+</span>
              <span>创建目标</span>
            </button>
            <button class="mod-cta" id="al-create-task-btn">
              <span>+</span>
              <span>创建任务</span>
            </button>
          </div>
        </div>
        
        <div class="al-body">
          <div class="al-main">
            <div class="al-stats">
              <div class="al-stat">
                <span class="al-stat-num">${todayTasks.length}</span>
                <span class="al-stat-label">今日待办</span>
              </div>
              <div class="al-stat">
                <span class="al-stat-num">${weekComplete}</span>
                <span class="al-stat-label">本周完成</span>
              </div>
              <div class="al-stat ${overdueTasks.length > 0 ? 'al-stat-warning' : ''}">
                <span class="al-stat-num">${overdueTasks.length}</span>
                <span class="al-stat-label">逾期任务</span>
              </div>
              <div class="al-stat">
                <span class="al-stat-num">${activeTasks}</span>
                <span class="al-stat-label">进行中</span>
              </div>
            </div>
            
            <div class="al-panel">
              <div class="al-panel-header">
                <span>📋</span>
                <span>今日任务</span>
                <span class="al-panel-count">${todayTasks.length}</span>
              </div>
              <div class="al-panel-body">
                ${todayTasks.length === 0 ? this.renderEmpty('📋', '暂无任务', '点击右上角按钮添加任务') : this.renderTasks(todayTasks)}
              </div>
            </div>
            
            <div class="al-panel">
              <div class="al-panel-header">
                <span>🎯</span>
                <span>目标概览</span>
                <span class="al-panel-count">${allGoals.length}</span>
              </div>
              <div class="al-panel-body">
                ${allGoals.length === 0 ? this.renderEmpty('🎯', '暂无目标', '点击右上角按钮创建目标') : this.renderGoals(allGoals)}
              </div>
            </div>
          </div>
          
          <div class="al-sidebar">
            ${overdueTasks.length > 0 ? `
            <div class="al-panel al-panel-overdue">
              <div class="al-panel-header">
                <span>⚠️</span>
                <span>逾期任务</span>
                <span class="al-panel-count al-count-overdue">${overdueTasks.length}</span>
              </div>
              <div class="al-panel-body">
                ${this.renderTasks(overdueTasks)}
              </div>
            </div>
            ` : ''}
            
            <div class="al-panel">
              <div class="al-panel-header">
                <span>⚡</span>
                <span>快捷操作</span>
              </div>
              <div class="al-panel-body">
                <button class="al-quick-btn" id="al-open-today">
                  <span>📝</span>
                  <span>今日日记</span>
                </button>
                <button class="al-quick-btn" id="al-open-weekly">
                  <span>📅</span>
                  <span>本周周记</span>
                </button>
                <button class="al-quick-btn" id="al-open-monthly">
                  <span>📆</span>
                  <span>本月月记</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.bindEvents();
    this.addStyles();
  }
  
  private calculateWeekComplete(completedTasks: Task[]): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return completedTasks.filter(t => {
      if (!t['A-completed']) return false;
      return new Date(t['A-completed']) >= weekAgo;
    }).length;
  }
  
  private renderEmpty(icon: string, title: string, desc: string): string {
    return `
      <div class="al-empty">
        <span>${icon}</span>
        <div>${title}</div>
        <div class="al-empty-desc">${desc}</div>
      </div>
    `;
  }
  
  private renderGoals(goals: Goal[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    return goals.slice(0, 5).map(goal => `
      <div class="al-goal">
        <div class="al-goal-top">
          <span class="al-goal-level" data-level="${goal['A-level']}">${levelNames[goal['A-level']]}</span>
          <span class="al-goal-status ${goal['A-status']}">${goal['A-status'] === 'active' ? '进行中' : '已完成'}</span>
        </div>
        <div class="al-goal-title">${goal['A-title']}</div>
        <div class="al-goal-progress">
          <div class="al-progress-bar">
            <div class="al-progress-fill" style="width: ${goal['A-progress']}%"></div>
          </div>
          <span>${goal['A-progress']}%</span>
        </div>
      </div>
    `).join('');
  }
  
  private renderTasks(tasks: Task[]): string {
    const priorityColors: Record<number, string> = {
      1: '--text-red', 2: '--text-orange', 3: '--text-yellow', 4: '--text-green', 5: '--text-muted'
    };
    return tasks.slice(0, 10).map(task => `
      <div class="al-task" data-task-id="${task['A-id']}">
        <div class="al-task-check ${task['A-status'] === 'completed' ? 'checked' : ''}">
          ${task['A-status'] === 'completed' ? '✓' : ''}
        </div>
        <div class="al-task-content">
          <div class="al-task-title ${task['A-status'] === 'completed' ? 'done' : ''}">${task['A-title']}</div>
          <div class="al-task-meta">
            <span style="color: var(${priorityColors[task['A-priority']]})">${['最高', '高', '中', '低', '最低'][task['A-priority'] - 1]}</span>
            ${task['A-due'] ? `<span class="al-task-due">${task['A-due']}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }
  
  private bindEvents(): void {
    const content = this.contentEl;
    
    content.querySelector('#al-refresh-btn')?.addEventListener('click', () => {
      new Notice('正在刷新...');
      this.loadAndRender();
    });
    
    content.querySelector('#al-create-goal-btn')?.addEventListener('click', () => {
      this.showCreateGoalModal();
    });
    
    content.querySelector('#al-create-task-btn')?.addEventListener('click', () => {
      this.showCreateTaskModal();
    });
    
    content.querySelector('#al-open-today')?.addEventListener('click', () => {
      this.openTodayNote();
    });
    
    content.querySelector('#al-open-weekly')?.addEventListener('click', () => {
      this.openWeeklyNote();
    });
    
    content.querySelector('#al-open-monthly')?.addEventListener('click', () => {
      this.openMonthlyNote();
    });
    
    content.querySelectorAll('.al-task-check').forEach(checkbox => {
      checkbox.addEventListener('click', async (e) => {
        const taskItem = (e.target as HTMLElement).closest('.al-task');
        const taskId = taskItem?.getAttribute('data-task-id');
        if (taskId) await this.toggleTaskStatus(taskId);
      });
    });
  }
  
  private async toggleTaskStatus(taskId: string): Promise<void> {
    const task = this.plugin.getTaskManager().getTask(taskId);
    if (!task) return;
    try {
      if (task['A-status'] === 'completed') {
        await this.plugin.getTaskManager().updateTask(taskId, { status: 'pending' });
      } else {
        await this.plugin.getTaskManager().completeTask(taskId);
      }
      this.loadAndRender();
    } catch (error) {
      new Notice('更新失败: ' + (error as Error).message);
    }
  }
  
  private showCreateGoalModal(): void {
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box">
        <div class="al-modal-header">
          <span>🎯 创建目标</span>
          <button class="al-modal-close">×</button>
        </div>
        <form id="al-goal-form">
          <div class="al-form-item">
            <label>目标名称</label>
            <input type="text" id="al-goal-title" required placeholder="例如：学习一门新语言">
          </div>
          <div class="al-form-item">
            <label>目标层级</label>
            <select id="al-goal-level">
              <option value="1">🏆 人生目标</option>
              <option value="2">📅 阶段目标</option>
              <option value="3" selected>📆 年度目标</option>
              <option value="4">⚡ 短期目标</option>
            </select>
          </div>
          <div class="al-form-item">
            <label>截止日期</label>
            <input type="date" id="al-goal-due">
          </div>
          <div class="al-form-actions">
            <button type="button" id="al-cancel-goal">取消</button>
            <button type="submit" class="mod-cta">创建</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-goal')?.addEventListener('click', close);
    
    modal.querySelector('#al-goal-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (modal.querySelector('#al-goal-title') as HTMLInputElement).value.trim();
      const level = Number((modal.querySelector('#al-goal-level') as HTMLSelectElement).value) as GoalLevel;
      const due = (modal.querySelector('#al-goal-due') as HTMLInputElement).value || null;
      
      if (!title) {
        new Notice('请输入目标名称');
        return;
      }
      
      try {
        await this.plugin.getGoalManager().createGoal({ title, level, due });
        new Notice('目标创建成功！');
        close();
        this.loadAndRender();
      } catch (error) {
        new Notice('创建失败: ' + (error as Error).message);
      }
    });
  }
  
  private showCreateTaskModal(): void {
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box">
        <div class="al-modal-header">
          <span>📋 创建任务</span>
          <button class="al-modal-close">×</button>
        </div>
        <form id="al-task-form">
          <div class="al-form-item">
            <label>任务名称</label>
            <input type="text" id="al-task-title" required placeholder="例如：完成项目报告">
          </div>
          <div class="al-form-item">
            <label>优先级</label>
            <select id="al-task-priority">
              <option value="1">🔴 最高</option>
              <option value="2">🟠 高</option>
              <option value="3" selected>🟡 中</option>
              <option value="4">🟢 低</option>
              <option value="5">⚪ 最低</option>
            </select>
          </div>
          <div class="al-form-item">
            <label>截止日期</label>
            <input type="date" id="al-task-due" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="al-form-actions">
            <button type="button" id="al-cancel-task">取消</button>
            <button type="submit" class="mod-cta">创建</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-task')?.addEventListener('click', close);
    
    modal.querySelector('#al-task-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (modal.querySelector('#al-task-title') as HTMLInputElement).value.trim();
      const priority = Number((modal.querySelector('#al-task-priority') as HTMLSelectElement).value) as TaskPriority;
      const due = (modal.querySelector('#al-task-due') as HTMLInputElement).value || null;
      
      if (!title) {
        new Notice('请输入任务名称');
        return;
      }
      
      try {
        await this.plugin.getTaskManager().createTask({ title, priority, due });
        new Notice('任务创建成功！');
        close();
        this.loadAndRender();
      } catch (error) {
        new Notice('创建失败: ' + (error as Error).message);
      }
    });
  }
  
  private async openTodayNote(): Promise<void> {
    try {
      await this.plugin.getNoteManager().getOrCreateTodayNote();
      new Notice('今日日记已打开');
    } catch (error) {
      new Notice('打开日记失败');
    }
  }
  
  private async openWeeklyNote(): Promise<void> {
    try {
      const weekKey = this.plugin.getNoteManager().getCurrentWeekKey();
      await this.plugin.getNoteManager().getOrCreateWeeklyNote(weekKey);
      new Notice('本周周记已打开');
    } catch (error) {
      new Notice('打开周记失败');
    }
  }
  
  private async openMonthlyNote(): Promise<void> {
    try {
      const yearMonth = this.plugin.getNoteManager().getCurrentYearMonth();
      await this.plugin.getNoteManager().getOrCreateMonthlyNote(yearMonth);
      new Notice('本月月记已打开');
    } catch (error) {
      new Notice('打开月记失败');
    }
  }
  
  private removeStyles(): void {
    const oldStyle = document.getElementById('al-dashboard-styles');
    if (oldStyle) oldStyle.remove();
  }
  
  private addStyles(): void {
    this.removeStyles();
    
    const style = document.createElement('style');
    style.id = 'al-dashboard-styles';
    style.textContent = `
      .al-dashboard {
        padding: 0;
        min-height: 100vh;
      }
      
      .al-page {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .al-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
      }
      
      .al-header-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .al-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .al-date {
        font-size: 12px;
        color: var(--text-secondary);
      }
      
      .al-header-actions {
        display: flex;
        gap: 8px;
      }
      
      .al-header-actions button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      
      .al-body {
        display: flex;
        flex-wrap: wrap;
        flex: 1;
        overflow: hidden;
      }
      
      .al-main {
        flex: 1;
        min-width: 300px;
        display: flex;
        flex-direction: column;
        padding: 16px;
        gap: 16px;
        overflow-y: auto;
      }
      
      .al-sidebar {
        flex: 0 0 auto;
        min-width: 280px;
        max-width: 360px;
        width: 40%;
        padding: 16px;
        border-left: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      }
      
      .al-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
      }
      
      .al-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        background: var(--background-secondary);
        border-radius: 10px;
        border: 1px solid var(--border-color);
      }
      
      .al-stat-warning {
        border-color: var(--text-red);
        background: color-mix(in srgb, var(--text-red) 5%, var(--background-secondary));
      }
      
      .al-stat-num {
        font-size: 32px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1;
      }
      
      .al-stat-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
      
      .al-panel {
        background: var(--background-secondary);
        border-radius: 10px;
        border: 1px solid var(--border-color);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .al-panel-overdue {
        border-color: var(--text-red);
        background: color-mix(in srgb, var(--text-red) 3%, var(--background-secondary));
      }
      
      .al-panel-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        background: var(--background-primary);
      }
      
      .al-panel-header span:first-child {
        font-size: 16px;
      }
      
      .al-panel-header span:nth-child(2) {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
      }
      
      .al-panel-count {
        margin-left: auto;
        font-size: 12px;
        padding: 2px 8px;
        background: var(--background-secondary);
        color: var(--text-secondary);
        border-radius: 10px;
      }
      
      .al-count-overdue {
        background: color-mix(in srgb, var(--text-red) 15%, transparent);
        color: var(--text-red);
      }
      
      .al-panel-body {
        padding: 8px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-height: 100px;
      }
      
      .al-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px;
        gap: 8px;
        color: var(--text-secondary);
      }
      
      .al-empty span {
        font-size: 40px;
        opacity: 0.5;
      }
      
      .al-empty-desc {
        font-size: 12px;
        color: var(--text-muted);
      }
      
      .al-goal {
        padding: 12px;
        background: var(--background-primary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
      }
      
      .al-goal-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      
      .al-goal-level {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--interactive-accent);
        color: white;
      }
      
      .al-goal-level[data-level="1"] { background: var(--text-purple); }
      .al-goal-level[data-level="2"] { background: var(--text-blue); }
      .al-goal-level[data-level="3"] { background: var(--interactive-accent); }
      .al-goal-level[data-level="4"] { background: var(--text-green); }
      
      .al-goal-status {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--text-green);
        color: white;
      }
      
      .al-goal-status.completed {
        background: var(--text-muted);
      }
      
      .al-goal-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 8px;
      }
      
      .al-goal-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .al-progress-bar {
        flex: 1;
        height: 6px;
        background: var(--background-modifier-border);
        border-radius: 3px;
        overflow: hidden;
      }
      
      .al-progress-fill {
        height: 100%;
        background: var(--interactive-accent);
        border-radius: 3px;
        transition: width 0.3s;
      }
      
      .al-task {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        background: var(--background-primary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: background 0.15s;
      }
      
      .al-task:hover {
        background: var(--background-modifier-hover);
      }
      
      .al-task-check {
        width: 18px;
        height: 18px;
        border: 2px solid var(--border-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: white;
        flex-shrink: 0;
        margin-top: 1px;
      }
      
      .al-task-check.checked {
        background: var(--text-green);
        border-color: var(--text-green);
      }
      
      .al-task-content {
        flex: 1;
        min-width: 0;
      }
      
      .al-task-title {
        font-size: 13px;
        color: var(--text-primary);
        margin-bottom: 4px;
      }
      
      .al-task-title.done {
        text-decoration: line-through;
        color: var(--text-muted);
      }
      
      .al-task-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 11px;
        color: var(--text-secondary);
      }
      
      .al-task-due {
        color: var(--text-red);
      }
      
      .al-quick-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        width: 100%;
        text-align: left;
      }
      
      .al-quick-btn span:first-child {
        font-size: 18px;
      }
      
      .al-quick-btn span:last-child {
        font-size: 13px;
        color: var(--text-secondary);
      }
      
      .al-modal {
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
      
      .al-modal-bg {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }
      
      .al-modal-box {
        position: relative;
        background: var(--background-primary);
        border-radius: 12px;
        width: 90%;
        max-width: 420px;
        border: 1px solid var(--border-color);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }
      
      .al-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .al-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary);
        line-height: 1;
      }
      
      #al-goal-form, #al-task-form {
        padding: 20px;
      }
      
      .al-form-item {
        margin-bottom: 16px;
      }
      
      .al-form-item label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
      }
      
      .al-form-item input,
      .al-form-item select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 14px;
        background: var(--background-secondary);
        color: var(--text-primary);
        box-sizing: border-box;
      }
      
      .al-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
      }
      
      @media (max-width: 1000px) {
        .al-stats {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .al-sidebar {
          width: 280px;
        }
      }
      
      @media (max-width: 800px) {
        .al-body {
          flex-direction: column;
        }
        
        .al-sidebar {
          width: 100%;
          border-left: none;
          border-top: 1px solid var(--border-color);
          padding: 16px;
        }
        
        .al-header-actions {
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .al-header-actions button {
          min-width: 80px;
        }
      }
      
      @media (max-width: 640px) {
        .al-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
        }
        
        .al-header-actions {
          width: 100%;
          justify-content: stretch;
        }
        
        .al-header-actions button {
          flex: 1;
          min-width: 0;
          justify-content: center;
          gap: 4px;
        }
        
        .al-header-actions button span:last-child {
          font-size: 11px;
        }
        
        .al-main {
          padding: 12px;
          gap: 12px;
        }
        
        .al-stats {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .al-stat {
          padding: 12px;
        }
        
        .al-stat-num {
          font-size: 24px;
        }
        
        .al-stat-label {
          font-size: 11px;
        }
        
        .al-panel-body {
          padding: 6px;
        }
        
        .al-task, .al-goal {
          padding: 10px;
        }
        
        .al-task-meta {
          flex-wrap: wrap;
          gap: 6px;
        }
      }
      
      @media (max-width: 480px) {
        .al-stats {
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        
        .al-stat {
          padding: 10px;
        }
        
        .al-stat-num {
          font-size: 20px;
        }
        
        .al-stat-label {
          font-size: 10px;
        }
        
        .al-title {
          font-size: 16px;
        }
        
        .al-date {
          font-size: 11px;
        }
        
        .al-header-actions button span:first-child {
          font-size: 14px;
        }
        
        .al-header-actions button span:last-child {
          font-size: 10px;
        }
        
        .al-panel-header {
          padding: 10px 12px;
        }
        
        .al-panel-header span:nth-child(2) {
          font-size: 13px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
