/**
 * Dashboard View - Clean Layout Version with View Switching
 */

import { ItemView, Notice } from 'obsidian';
import { Goal, Task, GoalLevel, TaskPriority, TaskField, GoalField, DEFAULT_VIEW_FIELDS, GOAL_FIELD_LABELS, TASK_FIELD_LABELS } from '../types';
import AmazingLife from '../main';

export const DASHBOARD_VIEW_TYPE = 'amazing-life-dashboard';

export type ViewType = 'dashboard' | 'list' | 'board' | 'gallery' | 'goal-detail' | 'task-detail';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

export class DashboardView extends ItemView {
  private plugin: AmazingLife;
  private currentView: ViewType = 'dashboard';
  private selectedGoalId: string | null = null;
  private selectedTaskId: string | null = null;
  private calendarMode: CalendarViewMode = 'day';
  private calendarDate: Date = new Date();
  private selectedWeekStart: string | null = null;
  private selectedMonth: string | null = null;
  private selectedYear: string | null = null;
  
  constructor(leaf: any, plugin: AmazingLife) {
    super(leaf);
    this.plugin = plugin;
  }
  
  getViewType(): string { return DASHBOARD_VIEW_TYPE; }
  getDisplayText(): string { return 'Amazing Life'; }
  getIcon(): string { return 'target'; }
  
  async onOpen(): Promise<void> { await this.loadAndRender(); }
  async onClose(): Promise<void> { this.removeStyles(); }
  
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
  
  private getCurrentViewType(): 'dashboard' | 'board' | 'gallery' | 'list' | 'goal' {
    if (this.currentView === 'board') return 'board';
    if (this.currentView === 'gallery') return 'gallery';
    if (this.currentView === 'goal-detail') return 'goal';
    if (this.currentView === 'list') return 'list';
    return 'dashboard';
  }
  
  private getTaskFields(): TaskField[] {
    return (this.plugin.getSettings().viewFields[this.getCurrentViewType()] || ['title', 'priority', 'due']) as TaskField[];
  }
  
  private getGoalFields(): GoalField[] {
    const viewType = this.currentView === 'gallery' ? 'gallery' : 'goal';
    return (this.plugin.getSettings().viewFields[viewType] || ['level', 'title', 'progress']) as GoalField[];
  }
  
  private getGoalTitle(goalId: string | null): string {
    if (!goalId) return '未关联';
    const goal = this.plugin.getGoalManager().getGoal(goalId);
    return goal ? goal['A-title'] : '未知目标';
  }
  
  private getGoalLevel(goalId: string | null): number {
    if (!goalId) return 0;
    const goal = this.plugin.getGoalManager().getGoal(goalId);
    return goal ? goal['A-level'] : 0;
  }
  
  private getGoal(goalId: string): Goal | null { return this.plugin.getGoalManager().getGoal(goalId); }
  private getTask(taskId: string): Task | null { return this.plugin.getTaskManager().getTask(taskId); }
  private getTasksByGoal(goalId: string): Task[] { return this.plugin.getTaskManager().getAllTasks().filter(t => t['A-goal'] === goalId); }
  
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
            <div class="al-title"><span>🎯</span><span>Amazing Life</span></div>
            <div class="al-date">${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
          </div>
          <div class="al-header-actions">
            <button id="al-refresh-btn"><span>🔄</span><span>刷新</span></button>
            <button class="mod-cta" id="al-create-goal-btn"><span>+</span><span>创建目标</span></button>
            <button class="mod-cta" id="al-create-task-btn"><span>+</span><span>创建任务</span></button>
          </div>
        </div>
        
        <div class="al-view-tabs">
          <button class="al-view-tab ${this.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard"><span>📊</span><span>仪表盘</span></button>
          <button class="al-view-tab ${this.currentView === 'list' ? 'active' : ''}" data-view="list"><span>📋</span><span>列表</span></button>
          <button class="al-view-tab ${this.currentView === 'board' ? 'active' : ''}" data-view="board"><span>📌</span><span>看板</span></button>
          <button class="al-view-tab ${this.currentView === 'gallery' ? 'active' : ''}" data-view="gallery"><span>🖼️</span><span>画廊</span></button>
          <div class="al-view-spacer"></div>
          <button class="al-view-settings-btn" id="al-open-field-settings" title="字段设置"><span>⚙️</span><span>字段</span></button>
        </div>
        
        <div class="al-body">
          ${this.renderCurrentView(allGoals, allTasks, todayTasks, overdueTasks, weekComplete, activeTasks)}
        </div>
      </div>
    `;
    
    this.bindEvents();
    this.addStyles();
  }
  
  private renderCurrentView(allGoals: Goal[], allTasks: Task[], todayTasks: Task[], overdueTasks: Task[], weekComplete: number, activeTasks: number): string {
    switch (this.currentView) {
      case 'goal-detail': return this.selectedGoalId ? this.renderGoalDetailView(this.selectedGoalId) : this.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
      case 'task-detail': return this.selectedTaskId ? this.renderTaskDetailView(this.selectedTaskId) : this.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
      case 'list': return this.renderListView(allTasks);
      case 'board': return this.renderBoardView(allGoals, allTasks);
      case 'gallery': return this.renderGalleryView(allGoals, allTasks);
      default: return this.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
    }
  }
  
  private renderGoalDetailView(goalId: string): string {
    const goal = this.getGoal(goalId);
    if (!goal) return `<div class="al-detail-view"><div class="al-empty">${this.renderEmpty('❌', '目标不存在', '')}</div></div>`;
    
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const goalTasks = this.getTasksByGoal(goalId);
    const pendingTasks = goalTasks.filter(t => t['A-status'] === 'pending');
    const inProgressTasks = goalTasks.filter(t => t['A-status'] === 'in-progress');
    const completedTasks = goalTasks.filter(t => t['A-status'] === 'completed');
    const priorityNames = ['最高', '高', '中', '低', '最低'];
    const priorityColors = ['var(--text-red)', 'var(--text-orange)', 'var(--text-yellow)', 'var(--text-green)', 'var(--text-muted)'];
    
    return `
      <div class="al-detail-view">
        <div class="al-detail-header">
          <div class="al-detail-icon" id="al-back-btn" title="返回">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </div>
          <div class="al-detail-title">
            <span class="al-goal-level" data-level="${goal['A-level']}" style="background: ${levelColors[goal['A-level']]}">${levelNames[goal['A-level']]}</span>
            <h2>${goal['A-title']}</h2>
          </div>
          <div class="al-detail-status ${goal['A-status']}">${statusNames[goal['A-status']]}</div>
        </div>
        <div class="al-detail-content">
          <div class="al-detail-main">
            <div class="al-detail-section">
              <h3>📊 目标信息</h3>
              <div class="al-detail-info-grid">
                <div class="al-detail-info-item"><span class="al-detail-info-label">创建时间</span><span class="al-detail-info-value">${goal['A-created']}</span></div>
                ${goal['A-due'] ? `<div class="al-detail-info-item"><span class="al-detail-info-label">截止日期</span><span class="al-detail-info-value">${goal['A-due']}</span></div>` : ''}
              </div>
              <div class="al-detail-progress-row">
                <span class="al-detail-info-label">完成进度</span>
                <div class="al-detail-progress"><div class="al-progress-bar"><div class="al-progress-fill" style="width: ${goal['A-progress']}%"></div></div><span>${goal['A-progress']}%</span></div>
              </div>
            </div>
            <div class="al-detail-section">
              <h3>📈 任务统计</h3>
              <div class="al-detail-stats">
                <div class="al-detail-stat"><span class="al-detail-stat-num">${pendingTasks.length}</span><span class="al-detail-stat-label">待办</span></div>
                <div class="al-detail-stat"><span class="al-detail-stat-num">${inProgressTasks.length}</span><span class="al-detail-stat-label">进行中</span></div>
                <div class="al-detail-stat al-detail-stat-success"><span class="al-detail-stat-num">${completedTasks.length}</span><span class="al-detail-stat-label">已完成</span></div>
              </div>
            </div>
            <div class="al-detail-section">
              <h3>📋 关联任务 (${goalTasks.length})</h3>
              ${goalTasks.length === 0 ? this.renderEmpty('📋', '暂无任务', '点击右侧添加任务') : `<div class="al-detail-tasks">${goalTasks.map(task => `
                <div class="al-detail-task" data-task-id="${task['A-id']}">
                  <div class="al-task-check ${task['A-status'] === 'completed' ? 'checked' : ''}" data-task-id="${task['A-id']}">${task['A-status'] === 'completed' ? '✓' : ''}</div>
                  <div class="al-detail-task-content">
                    <div class="al-detail-task-title ${task['A-status'] === 'completed' ? 'done' : ''}">${task['A-title']}</div>
                    <div class="al-detail-task-meta">
                      <span style="color: ${priorityColors[task['A-priority'] - 1]}">${priorityNames[task['A-priority'] - 1]}</span>
                      <span class="al-status-badge status-${task['A-status']}">${['待办', '进行中', '已完成', '已取消'][['pending', 'in-progress', 'completed', 'cancelled'].indexOf(task['A-status'])]}</span>
                      ${task['A-due'] ? `<span>📅 ${task['A-due']}</span>` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}</div>`}
            </div>
          </div>
          <div class="al-detail-sidebar">
            <div class="al-detail-actions">
              <button class="mod-cta" id="al-add-task-to-goal"><span>+</span><span>添加任务</span></button>
            </div>
            ${inProgressTasks.length > 0 ? `
            <div class="al-detail-section">
              <h3>🔄 进行中</h3>
              <div class="al-detail-tasks">${inProgressTasks.map(task => `
                <div class="al-detail-task" data-task-id="${task['A-id']}">
                  <div class="al-task-check" data-task-id="${task['A-id']}"></div>
                  <div class="al-detail-task-content">
                    <div class="al-detail-task-title">${task['A-title']}</div>
                    ${task['A-due'] ? `<div class="al-detail-task-meta"><span>📅 ${task['A-due']}</span></div>` : ''}
                  </div>
                </div>
              `).join('')}</div>
            </div>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  private renderTaskDetailView(taskId: string): string {
    const task = this.getTask(taskId);
    if (!task) return `<div class="al-detail-view"><div class="al-empty">${this.renderEmpty('❌', '任务不存在', '')}</div></div>`;
    
    const goal = task['A-goal'] ? this.getGoal(task['A-goal']) : null;
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    const priorityNames = ['最高', '高', '中', '低', '最低'];
    const priorityColors = ['var(--text-red)', 'var(--text-orange)', 'var(--text-yellow)', 'var(--text-green)', 'var(--text-muted)'];
    const statusNames: Record<string, string> = { 'pending': '待办', 'in-progress': '进行中', 'completed': '已完成', 'cancelled': '已取消' };
    
    return `
      <div class="al-detail-view">
        <div class="al-detail-header">
          <div class="al-detail-icon" id="al-back-btn" title="返回">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </div>
          <div class="al-detail-title">
            <span style="color: ${priorityColors[task['A-priority'] - 1]}; font-size: 20px;">${['🔴', '🟠', '🟡', '🟢', '⚪'][task['A-priority'] - 1]}</span>
            <h2>${task['A-title']}</h2>
          </div>
          <div class="al-detail-status status-${task['A-status']}">${statusNames[task['A-status']]}</div>
        </div>
        <div class="al-detail-content">
          <div class="al-detail-main">
            <div class="al-detail-section">
              <h3>📊 任务信息</h3>
              <div class="al-detail-info-grid">
                <div class="al-detail-info-item"><span class="al-detail-info-label">优先级</span><span class="al-detail-info-value" style="color: ${priorityColors[task['A-priority'] - 1]}">${priorityNames[task['A-priority'] - 1]}</span></div>
                <div class="al-detail-info-item"><span class="al-detail-info-label">状态</span><span class="al-detail-info-value"><span class="al-status-badge status-${task['A-status']}">${statusNames[task['A-status']]}</span></span></div>
                <div class="al-detail-info-item"><span class="al-detail-info-label">创建时间</span><span class="al-detail-info-value">${task['A-created']}</span></div>
                ${task['A-due'] ? `<div class="al-detail-info-item"><span class="al-detail-info-label">截止日期</span><span class="al-detail-info-value">${task['A-due']}</span></div>` : ''}
                ${task['A-completed'] ? `<div class="al-detail-info-item"><span class="al-detail-info-label">完成时间</span><span class="al-detail-info-value">${task['A-completed']}</span></div>` : ''}
              </div>
            </div>
            
            <div class="al-detail-section">
              <h3>🎯 关联目标</h3>
              ${goal ? `
              <div class="al-task-goal-card" data-goal-id="${goal['A-id']}">
                <div class="al-task-goal-header">
                  <span class="al-goal-level" data-level="${goal['A-level']}" style="background: ${levelColors[goal['A-level']]}">${levelNames[goal['A-level']]}</span>
                  <span class="al-detail-info-label">${goal['A-title']}</span>
                </div>
                <div class="al-task-goal-progress">
                  <div class="al-progress-bar"><div class="al-progress-fill" style="width: ${goal['A-progress']}%"></div></div>
                  <span>${goal['A-progress']}%</span>
                </div>
              </div>
              ` : this.renderEmpty('🎯', '未关联目标', '')}
            </div>
            
            <div class="al-detail-section">
              <h3>⚡ 快捷操作</h3>
              <div class="al-task-actions">
                ${task['A-status'] === 'completed' 
                  ? `<button class="al-action-btn" id="al-uncomplete-task"><span>↩️</span><span>标记为未完成</span></button>`
                  : `<button class="al-action-btn al-action-btn-success" id="al-complete-task"><span>✓</span><span>完成任务</span></button>`
                }
              </div>
            </div>
          </div>
          <div class="al-detail-sidebar">
            <div class="al-detail-actions">
              <button class="mod-cta" id="al-edit-task-btn"><span>✏️</span><span>编辑任务</span></button>
              <button class="al-action-btn-danger" id="al-delete-task-btn"><span>🗑️</span><span>删除任务</span></button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  private renderDashboardView(todayTasks: Task[], overdueTasks: Task[], weekComplete: number, activeTasks: number): string {
    const calendarHtml = this.renderCalendar();
    return `
      <div class="al-main-full">
        <div class="al-panel al-panel-calendar">
          <div class="al-panel-header"><span>📅</span><span>日历</span></div>
          <div class="al-panel-body al-calendar-body">${calendarHtml}</div>
        </div>
        <div class="al-stats">
          <div class="al-stat"><span class="al-stat-num">${todayTasks.length}</span><span class="al-stat-label">今日待办</span></div>
          <div class="al-stat"><span class="al-stat-num">${weekComplete}</span><span class="al-stat-label">本周完成</span></div>
          <div class="al-stat ${overdueTasks.length > 0 ? 'al-stat-warning' : ''}"><span class="al-stat-num">${overdueTasks.length}</span><span class="al-stat-label">逾期任务</span></div>
          <div class="al-stat"><span class="al-stat-num">${activeTasks}</span><span class="al-stat-label">进行中</span></div>
        </div>
        <div class="al-panel">
          <div class="al-panel-header"><span>📋</span><span>今日任务</span><span class="al-panel-count">${todayTasks.length}</span></div>
          <div class="al-panel-body">${todayTasks.length === 0 ? this.renderEmpty('📋', '暂无任务', '点击右上角按钮添加任务') : this.renderTasks(todayTasks)}</div>
        </div>
        ${overdueTasks.length > 0 ? `<div class="al-panel al-panel-overdue"><div class="al-panel-header"><span>⚠️</span><span>逾期任务</span><span class="al-panel-count al-count-overdue">${overdueTasks.length}</span></div><div class="al-panel-body">${this.renderTasks(overdueTasks)}</div></div>` : ''}
      </div>
    `;
  }
  
  private renderListView(allTasks: Task[]): string {
    const priorityNames = ['最高', '高', '中', '低', '最低'];
    const priorityColors = ['var(--text-red)', 'var(--text-orange)', 'var(--text-yellow)', 'var(--text-green)', 'var(--text-muted)'];
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    const statusNames: Record<string, string> = { 'pending': '待办', 'in-progress': '进行中', 'completed': '已完成', 'cancelled': '已取消' };
    const fields = this.getTaskFields();
    if (allTasks.length === 0) return `<div class="al-table-view"><div class="al-table-empty">${this.renderEmpty('📋', '暂无任务', '先创建目标，再添加任务')}</div></div>`;
    
    // 构建表头
    let headerHtml = '<th style="width:40px"></th>';
    if (fields.includes('title')) headerHtml += '<th>任务名称</th>';
    if (fields.includes('goal')) headerHtml += '<th style="width:120px">关联目标</th>';
    if (fields.includes('priority')) headerHtml += '<th style="width:80px">优先级</th>';
    if (fields.includes('status')) headerHtml += '<th style="width:100px">状态</th>';
    if (fields.includes('due')) headerHtml += '<th style="width:120px">截止日期</th>';
    
    // 构建表格行
    const rowsHtml = allTasks.map(task => {
      const goalLevel = this.getGoalLevel(task['A-goal']);
      let rowHtml = `<tr class="al-table-row ${task['A-status']==='completed'?'completed':''}" data-task-id="${task['A-id']}"><td><div class="al-task-check ${task['A-status']==='completed'?'checked':''}" data-task-id="${task['A-id']}">${task['A-status']==='completed'?'✓':''}</div></td>`;
      if (fields.includes('title')) rowHtml += `<td class="al-table-title">${task['A-title']}</td>`;
      if (fields.includes('goal')) rowHtml += `<td><span class="al-goal-tag" style="color:${levelColors[goalLevel]||'var(--text-muted)'}" data-goal-id="${task['A-goal']}">${this.getGoalTitle(task['A-goal'])}</span></td>`;
      if (fields.includes('priority')) rowHtml += `<td><span style="color:${priorityColors[task['A-priority']-1]}">${priorityNames[task['A-priority']-1]}</span></td>`;
      if (fields.includes('status')) rowHtml += `<td><span class="al-status-badge status-${task['A-status']}">${statusNames[task['A-status']]}</span></td>`;
      if (fields.includes('due')) rowHtml += `<td>${task['A-due']||'-'}</td>`;
      rowHtml += '</tr>';
      return rowHtml;
    }).join('');
    
    return `<div class="al-table-view"><table class="al-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
  }
  
  private renderBoardView(allGoals: Goal[], allTasks: Task[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    if (allGoals.length === 0) return `<div class="al-board-view"><div class="al-board-empty">${this.renderEmpty('📌', '暂无目标', '先创建目标来组织任务')}</div></div>`;
    return `<div class="al-board-view">${allGoals.map(goal => {const gt=allTasks.filter(t=>t['A-goal']===goal['A-id']);return `<div class="al-board-column" style="--column-accent:${levelColors[goal['A-level']]}"><div class="al-board-column-header"><div class="al-board-column-title"><span class="al-goal-level" data-level="${goal['A-level']}" style="background:${levelColors[goal['A-level']]}">${levelNames[goal['A-level']]}</span><span>${goal['A-title']}</span></div><span class="al-list-count">${gt.length}</span></div><div class="al-board-column-body">${gt.length===0?this.renderEmpty('📋','暂无任务',''):this.renderTasks(gt)}</div></div>`}).join('')}</div>`;
  }
  
  private renderGalleryView(allGoals: Goal[], allTasks: Task[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    if (allGoals.length === 0) return `<div class="al-gallery-view"><div class="al-gallery-empty">${this.renderEmpty('🖼️', '暂无内容', '创建目标来开始规划')}</div></div>`;
    
    const fields = this.getGoalFields();
    const cardsHtml = allGoals.map(goal => {
      const gt = allTasks.filter(t => t['A-goal'] === goal['A-id']);
      let cardContent = `<div class="al-gallery-card al-gallery-goal" data-goal-id="${goal['A-id']}"><div class="al-gallery-card-header"><span class="al-goal-level" data-level="${goal['A-level']}" style="background:${levelColors[goal['A-level']]}">${levelNames[goal['A-level']]}</span></div>`;
      
      if (fields.includes('title')) cardContent += `<div class="al-gallery-card-title">${goal['A-title']}</div>`;
      if (fields.includes('progress')) cardContent += `<div class="al-gallery-card-progress"><div class="al-progress-bar"><div class="al-progress-fill" style="width:${goal['A-progress']}%"></div></div><span>${goal['A-progress']}%</span></div>`;
      if (fields.includes('due') && goal['A-due']) cardContent += `<div class="al-gallery-card-meta">📅 ${goal['A-due']}</div>`;
      if (fields.includes('tasksCount')) cardContent += `<div class="al-gallery-card-tasks"><span>📋 ${gt.length} 个任务</span></div>`;
      if (fields.includes('completedTasksCount')) {
        const completed = gt.filter(t => t['A-status'] === 'completed').length;
        cardContent += `<div class="al-gallery-card-tasks"><span>✓ 已完成 ${completed} 个</span></div>`;
      }
      
      cardContent += '</div>';
      return cardContent;
    }).join('');
    
    return `<div class="al-gallery-view"><div class="al-gallery-section"><div class="al-gallery-section-title">🎯 目标 (${allGoals.length})</div><div class="al-gallery-grid">${cardsHtml}</div></div></div>`;
  }
  
  private calculateWeekComplete(completedTasks: Task[]): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return completedTasks.filter(t => { if (!t['A-completed']) return false; return new Date(t['A-completed']) >= weekAgo; }).length;
  }
  
  private renderEmpty(icon: string, title: string, desc: string): string { return `<div class="al-empty"><span>${icon}</span><div>${title}</div><div class="al-empty-desc">${desc}</div></div>`; }
  
  private renderGoalFields(goal: Goal, fields: GoalField[], allTasks: Task[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const goalTasks = allTasks.filter(t => t['A-goal'] === goal['A-id']);
    const completedCount = goalTasks.filter(t => t['A-status'] === 'completed').length;
    
    let html = '';
    if (fields.includes('level')) html += `<span class="al-goal-level" data-level="${goal['A-level']}">${levelNames[goal['A-level']]}</span>`;
    if (fields.includes('status')) html += `<span class="al-goal-status ${goal['A-status']}">${statusNames[goal['A-status']]}</span>`;
    if (fields.includes('title')) html += `<div class="al-goal-title">${goal['A-title']}</div>`;
    if (fields.includes('progress')) html += `<div class="al-goal-progress"><div class="al-progress-bar"><div class="al-progress-fill" style="width:${goal['A-progress']}%"></div></div><span>${goal['A-progress']}%</span></div>`;
    if (fields.includes('due') && goal['A-due']) html += `<div class="al-goal-due">📅 ${goal['A-due']}</div>`;
    if (fields.includes('tasksCount')) html += `<div class="al-goal-meta">📋 ${goalTasks.length} 个任务</div>`;
    if (fields.includes('completedTasksCount')) html += `<div class="al-goal-meta">✓ 已完成 ${completedCount} 个</div>`;
    
    return html;
  }
  
  private renderGoals(goals: Goal[]): string {
    const fields = this.getGoalFields();
    const allTasks = this.plugin.getTaskManager().getAllTasks();
    return goals.slice(0, 5).map(goal => `<div class="al-goal" data-goal-id="${goal['A-id']}"><div class="al-goal-top">${this.renderGoalFields(goal, fields, allTasks)}</div></div>`).join('');
  }
  
  private renderCalendar(): string {
    const modes: CalendarViewMode[] = ['day', 'week', 'month', 'year'];
    const modeLabels: Record<CalendarViewMode, string> = { day: '日', week: '周', month: '月', year: '年' };
    
    let content = '';
    
    switch (this.calendarMode) {
      case 'day':
        content = this.renderDayView(this.calendarDate);
        break;
      case 'week':
        content = this.renderWeekView(this.calendarDate);
        break;
      case 'month':
        content = this.renderMonthView(this.calendarDate);
        break;
      case 'year':
        content = this.renderYearView(this.calendarDate);
        break;
    }
    
    return `
      <div class="al-calendar-modes">
        ${modes.map(m => `<button class="al-calendar-mode-btn ${this.calendarMode === m ? 'active' : ''}" data-mode="${m}">${modeLabels[m]}</button>`).join('')}
      </div>
      <div class="al-calendar-content">${content}</div>
    `;
  }
  
  private renderDayView(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let cells = '';
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(d => cells += `<div class="al-cal-day-header">${d}</div>`);
    
    for (let i = 0; i < startDay; i++) {
      cells += `<div class="al-cal-day empty"></div>`;
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = todayStr === dateStr;
      cells += `<div class="al-cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}">${d}</div>`;
    }
    
    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-day">◀</button><span class="al-calendar-title">${year}年${month + 1}月</span><button class="al-calendar-next" id="al-cal-next-day">▶</button></div>
      <div class="al-cal-grid">${cells}</div>
    `;
  }
  
  private renderWeekView(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let cells = '';
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(d => cells += `<div class="al-cal-day-header">${d}</div>`);
    
    for (let i = 0; i < startDay; i++) {
      cells += `<div class="al-cal-day empty"></div>`;
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const weekStart = new Date(dayDate);
      weekStart.setDate(dayDate.getDate() - dayDate.getDay());
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const isToday = todayStr === dateStr;
      const isSelected = this.selectedWeekStart === weekStartStr;
      const classes = ['al-cal-day'];
      if (isToday) classes.push('today');
      if (isSelected) classes.push('week-selected');
      cells += `<div class="${classes.join(' ')}" data-week-start="${weekStartStr}" data-date="${dateStr}">${d}</div>`;
    }
    
    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-week">◀</button><span class="al-calendar-title">${year}年${month + 1}月</span><button class="al-calendar-next" id="al-cal-next-week">▶</button></div>
      <div class="al-cal-grid">${cells}</div>
    `;
  }
  
  private renderMonthView(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    let months = '';
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    
    for (let m = 0; m < 12; m++) {
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;
      const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
      const isSelected = this.selectedMonth === monthKey;
      const classes = ['al-cal-month-item'];
      if (isCurrentMonth) classes.push('current');
      if (isSelected) classes.push('selected');
      months += `<div class="${classes.join(' ')}" data-year="${year}" data-month="${m + 1}" data-month-key="${monthKey}">${monthNames[m]}</div>`;
    }
    
    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-month">◀</button><span class="al-calendar-title">${year}年</span><button class="al-calendar-next" id="al-cal-next-month">▶</button></div>
      <div class="al-cal-month-grid">${months}</div>
    `;
  }
  
  private renderYearView(date: Date): string {
    const year = date.getFullYear();
    const prevYear = year - 1;
    const nextYear = year + 1;
    const today = new Date();
    const isCurrentYear = today.getFullYear() === year;
    
    const prevYearSel = this.selectedYear === prevYear.toString();
    const currentYearSel = this.selectedYear === year.toString();
    const nextYearSel = this.selectedYear === nextYear.toString();
    
    return `
      <div class="al-calendar-nav"><button class="al-calendar-prev" id="al-cal-prev-year">◀</button><span class="al-calendar-title">选择年份</span><button class="al-calendar-next" id="al-cal-next-year">▶</button></div>
      <div class="al-cal-year-display">
        <div class="al-cal-year-item ${prevYearSel ? 'selected' : ''}" data-year="${prevYear}">${prevYear}</div>
        <div class="al-cal-year-item current ${isCurrentYear && !this.selectedYear ? '' : (currentYearSel ? 'selected' : '')}" data-year="${year}">${year}</div>
        <div class="al-cal-year-item ${nextYearSel ? 'selected' : ''}" data-year="${nextYear}">${nextYear}</div>
      </div>
    `;
  }
  
  private renderTaskFields(task: Task, fields: TaskField[]): string {
    const priorityColors: Record<number, string> = { 1: '--text-red', 2: '--text-orange', 3: '--text-yellow', 4: '--text-green', 5: '--text-muted' };
    const statusNames: Record<string, string> = { 'pending': '待办', 'in-progress': '进行中', 'completed': '已完成', 'cancelled': '已取消' };
    
    let metaHtml = '';
    if (fields.includes('priority')) metaHtml += `<span style="color:var(${priorityColors[task['A-priority']]})">${['最高','高','中','低','最低'][task['A-priority']-1]}</span>`;
    if (fields.includes('status')) metaHtml += `<span class="al-status-badge status-${task['A-status']}">${statusNames[task['A-status']]}</span>`;
    if (fields.includes('due') && task['A-due']) metaHtml += `<span class="al-task-due">${task['A-due']}</span>`;
    if (fields.includes('goal')) metaHtml += `<span class="al-goal-tag">${this.getGoalTitle(task['A-goal'])}</span>`;
    if (fields.includes('tags') && task['A-tags'].length > 0) metaHtml += `<span>${task['A-tags'].map(t => '#' + t).join(' ')}</span>`;
    
    let titleHtml = '';
    if (fields.includes('title')) titleHtml = `<div class="al-task-title ${task['A-status']==='completed'?'done':''}">${task['A-title']}</div>`;
    
    return `${titleHtml}${metaHtml ? `<div class="al-task-meta">${metaHtml}</div>` : ''}`;
  }
  
  private renderTasks(tasks: Task[]): string {
    const fields = this.getTaskFields();
    return tasks.slice(0, 10).map(task => `<div class="al-task" data-task-id="${task['A-id']}"><div class="al-task-check ${task['A-status']==='completed'?'checked':''}" data-task-id="${task['A-id']}">${task['A-status']==='completed'?'✓':''}</div><div class="al-task-content">${this.renderTaskFields(task, fields)}</div></div>`).join('');
  }
  
  private bindEvents(): void {
    const content = this.contentEl;
    
    // View tab switching
    content.querySelectorAll('.al-view-tab').forEach(tab => { tab.addEventListener('click', (e) => { const view = (e.currentTarget as HTMLElement).getAttribute('data-view') as ViewType; if (view && view !== this.currentView) { this.currentView = view; if (view !== 'goal-detail' && view !== 'task-detail') { this.selectedGoalId = null; this.selectedTaskId = null; } this.render(); } }); });
    
    // Back button
    content.querySelector('#al-back-btn')?.addEventListener('click', () => { this.currentView = 'dashboard'; this.selectedGoalId = null; this.selectedTaskId = null; this.render(); });
    
    // Goal click events
    content.querySelectorAll('.al-goal, .al-gallery-goal').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.selectedGoalId = goalId; this.currentView = 'goal-detail'; this.render(); } }); });
    
    // Task click events
    content.querySelectorAll('.al-task, .al-detail-task').forEach(el => { el.addEventListener('click', (e) => { const taskId = (e.currentTarget as HTMLElement).getAttribute('data-task-id'); if (taskId) { this.selectedTaskId = taskId; this.currentView = 'task-detail'; this.render(); } }); });
    
    // Goal tag click in list view
    content.querySelectorAll('.al-goal-tag').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); const goalId = (e.target as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.selectedGoalId = goalId; this.currentView = 'goal-detail'; this.render(); } }); });
    
    // Task goal card click
    content.querySelectorAll('.al-task-goal-card').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.selectedGoalId = goalId; this.currentView = 'goal-detail'; this.render(); } }); });
    
    content.querySelector('#al-refresh-btn')?.addEventListener('click', () => { new Notice('正在刷新...'); this.loadAndRender(); });
    content.querySelector('#al-create-goal-btn')?.addEventListener('click', () => this.showCreateGoalModal());
    content.querySelector('#al-create-task-btn')?.addEventListener('click', () => this.showCreateTaskModal());
    content.querySelector('#al-add-task-to-goal')?.addEventListener('click', () => { if (this.selectedGoalId) this.showCreateTaskModalForGoal(this.selectedGoalId); });
    
    // Calendar events
    this.bindCalendarEvents(content);
    
    // Task actions
    content.querySelector('#al-complete-task')?.addEventListener('click', async () => { if (this.selectedTaskId) { await this.plugin.getTaskManager().completeTask(this.selectedTaskId); this.loadAndRender(); } });
    content.querySelector('#al-uncomplete-task')?.addEventListener('click', async () => { if (this.selectedTaskId) { await this.plugin.getTaskManager().updateTask(this.selectedTaskId, { status: 'pending' }); this.loadAndRender(); } });
    content.querySelector('#al-delete-task-btn')?.addEventListener('click', async () => { if (this.selectedTaskId && confirm('确定要删除这个任务吗？')) { await this.plugin.getTaskManager().deleteTask(this.selectedTaskId); this.currentView = 'dashboard'; this.selectedTaskId = null; this.loadAndRender(); } });
    
    // Task checkbox clicks
    content.querySelectorAll('.al-task-check').forEach(checkbox => { checkbox.addEventListener('click', async (e) => { e.stopPropagation(); const taskId = (e.target as HTMLElement).getAttribute('data-task-id'); if (taskId) { await this.toggleTaskStatus(taskId); } }); });
    
    // Field settings button
    content.querySelector('#al-open-field-settings')?.addEventListener('click', () => this.showFieldSettingsModal());
  }
  
  private async toggleTaskStatus(taskId: string): Promise<void> {
    const task = this.plugin.getTaskManager().getTask(taskId);
    if (!task) return;
    try { if (task['A-status'] === 'completed') { await this.plugin.getTaskManager().updateTask(taskId, { status: 'pending' }); } else { await this.plugin.getTaskManager().completeTask(taskId); } this.loadAndRender(); } catch (error) { new Notice('更新失败: ' + (error as Error).message); }
  }
  
  private bindCalendarEvents(content: HTMLElement): void {
    // 模式切换
    content.querySelectorAll('.al-calendar-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode') as CalendarViewMode;
        this.calendarMode = mode;
        this.render();
      });
    });
    
    // 上一个
    content.querySelector('#al-cal-prev-day')?.addEventListener('click', () => { this.calendarDate.setMonth(this.calendarDate.getMonth() - 1); this.selectedWeekStart = null; this.render(); });
    content.querySelector('#al-cal-prev-week')?.addEventListener('click', () => { this.calendarDate.setMonth(this.calendarDate.getMonth() - 1); this.selectedWeekStart = null; this.render(); });
    content.querySelector('#al-cal-prev-month')?.addEventListener('click', () => { this.calendarDate.setFullYear(this.calendarDate.getFullYear() - 1); this.selectedWeekStart = null; this.render(); });
    content.querySelector('#al-cal-prev-year')?.addEventListener('click', () => { this.calendarDate.setFullYear(this.calendarDate.getFullYear() - 1); this.selectedWeekStart = null; this.render(); });
    
    // 下一个
    content.querySelector('#al-cal-next-day')?.addEventListener('click', () => { this.calendarDate.setMonth(this.calendarDate.getMonth() + 1); this.selectedWeekStart = null; this.render(); });
    content.querySelector('#al-cal-next-week')?.addEventListener('click', () => { this.calendarDate.setMonth(this.calendarDate.getMonth() + 1); this.selectedWeekStart = null; this.render(); });
    content.querySelector('#al-cal-next-month')?.addEventListener('click', () => { this.calendarDate.setFullYear(this.calendarDate.getFullYear() + 1); this.selectedWeekStart = null; this.render(); });
    content.querySelector('#al-cal-next-year')?.addEventListener('click', () => { this.calendarDate.setFullYear(this.calendarDate.getFullYear() + 1); this.selectedWeekStart = null; this.render(); });
    
    // 日视图：点击日期打开日记（排除有 data-week-start 的元素）
    content.querySelectorAll('.al-cal-day:not(.empty):not([data-week-start])').forEach(day => {
      day.addEventListener('click', () => {
        const dateStr = day.getAttribute('data-date');
        if (dateStr) {
          this.openDailyNote(dateStr);
        }
      });
    });
    
    // 周视图：点击选中整行并打开周记
    content.querySelectorAll('.al-cal-day[data-week-start]').forEach(day => {
      day.addEventListener('click', () => {
        const weekStart = day.getAttribute('data-week-start');
        if (weekStart) {
          this.selectedWeekStart = weekStart;
          // 重新渲染以显示选中效果
          this.render();
          this.openWeeklyNoteByDate(weekStart);
        }
      });
    });
    
    // 月视图：点击月份打开月记
    content.querySelectorAll('.al-cal-month-item').forEach(month => {
      month.addEventListener('click', () => {
        const yearNum = parseInt(month.getAttribute('data-year') || this.calendarDate.getFullYear().toString());
        const monthNum = parseInt(month.getAttribute('data-month') || '1');
        const yearMonth = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
        this.selectedMonth = yearMonth;
        this.render();
        this.openMonthlyNoteByDate(yearMonth);
      });
    });
    
    // 年视图：点击年份打开年记
    content.querySelectorAll('.al-cal-year-item').forEach(yearEl => {
      yearEl.addEventListener('click', () => {
        const yearNum = parseInt(yearEl.getAttribute('data-year') || this.calendarDate.getFullYear().toString());
        this.selectedYear = yearNum.toString();
        this.render();
        this.openYearlyNoteByDate(yearNum.toString());
      });
    });
  }
  
  private async openDailyNote(dateStr: string): Promise<void> {
    try {
      const date = new Date(dateStr);
      const noteManager = this.plugin.getNoteManager();
      const file = await noteManager.getOrCreateDailyNote(date);
      new Notice(`已打开 ${dateStr} 日记`);
    } catch (error) {
      new Notice('打开日记失败');
    }
  }
  
  private async openWeeklyNoteByDate(weekStartStr: string): Promise<void> {
    try {
      const weekStart = new Date(weekStartStr);
      const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
      const days = Math.floor((weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      const weekKey = `${weekStart.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      await this.plugin.getNoteManager().getOrCreateWeeklyNote(weekKey);
      new Notice(`已打开 ${weekKey} 周记`);
    } catch (error) {
      new Notice('打开周记失败');
    }
  }
  
  private async openMonthlyNoteByDate(yearMonth: string): Promise<void> {
    try {
      await this.plugin.getNoteManager().getOrCreateMonthlyNote(yearMonth);
      new Notice(`已打开 ${yearMonth} 月记`);
    } catch (error) {
      new Notice('打开月记失败');
    }
  }
  
  private async openYearlyNoteByDate(year: string): Promise<void> {
    try {
      await this.plugin.getNoteManager().getOrCreateYearlyNote(year);
      new Notice(`已打开 ${year} 年记`);
    } catch (error) {
      new Notice('打开年记失败');
    }
  }
  
  private showFieldSettingsModal(): void {
    const viewKey = this.getCurrentViewType();
    const isGoalView = viewKey === 'gallery' || viewKey === 'goal';
    const settings = this.plugin.getSettings();
    const currentFields = isGoalView 
      ? (settings.viewFields[viewKey as 'gallery' | 'goal'] as GoalField[])
      : (settings.viewFields[viewKey as 'dashboard' | 'board' | 'list'] as TaskField[]);
    
    const fieldLabels = isGoalView ? GOAL_FIELD_LABELS : TASK_FIELD_LABELS;
    const fields = Object.keys(fieldLabels) as (GoalField | TaskField)[];
    const viewNames: Record<string, string> = { dashboard: '仪表盘任务', board: '看板任务', list: '列表任务', gallery: '画廊目标', goal: '目标详情' };
    
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    
    const fieldsHtml = fields.map(field => {
      const isSelected = currentFields.includes(field as any);
      return `<button class="al-field-toggle-btn ${isSelected ? 'selected' : ''}" data-field="${field}">${fieldLabels[field as keyof typeof fieldLabels]}</button>`;
    }).join('');
    
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box al-field-settings-modal">
        <div class="al-modal-header">
          <span>⚙️ 字段设置 - ${viewNames[viewKey]}</span>
          <button class="al-modal-close">×</button>
        </div>
        <div class="al-modal-body">
          <p class="al-field-settings-desc">选择在此视图中显示的字段：</p>
          <div class="al-field-toggles">${fieldsHtml}</div>
        </div>
        <div class="al-modal-footer">
          <button class="al-btn" id="al-reset-fields">恢复默认</button>
          <button class="mod-cta" id="al-save-fields">保存</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    
    // Field toggle clicks
    modal.querySelectorAll('.al-field-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-field')!;
        const idx = currentFields.indexOf(field as any);
        if (idx >= 0 && currentFields.length > 1) {
          currentFields.splice(idx, 1);
          btn.classList.remove('selected');
        } else if (idx < 0) {
          currentFields.push(field as any);
          btn.classList.add('selected');
        }
      });
    });
    
    // Reset button
    modal.querySelector('#al-reset-fields')?.addEventListener('click', () => {
      const defaults = DEFAULT_VIEW_FIELDS[viewKey as keyof typeof DEFAULT_VIEW_FIELDS];
      currentFields.length = 0;
      currentFields.push(...defaults as any);
      modal.querySelectorAll('.al-field-toggle-btn').forEach(btn => {
        const field = btn.getAttribute('data-field')!;
        if (currentFields.includes(field as any)) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    });
    
    // Save button
    modal.querySelector('#al-save-fields')?.addEventListener('click', async () => {
      settings.viewFields[viewKey as keyof typeof settings.viewFields] = [...currentFields] as any;
      await this.plugin.saveData(settings);
      // 刷新插件设置缓存
      this.plugin.getSettings().viewFields = settings.viewFields;
      new Notice('字段设置已保存');
      close();
      this.render();
    });
  }
  
  private showCreateGoalModal(): void {
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `<div class="al-modal-bg"></div><div class="al-modal-box"><div class="al-modal-header"><span>🎯 创建目标</span><button class="al-modal-close">×</button></div><form id="al-goal-form"><div class="al-form-item"><label>目标名称</label><input type="text" id="al-goal-title" required placeholder="例如：学习一门新语言"></div><div class="al-form-item"><label>目标层级</label><select id="al-goal-level"><option value="1">🏆 人生目标</option><option value="2">📅 阶段目标</option><option value="3" selected>📆 年度目标</option><option value="4">⚡ 短期目标</option></select></div><div class="al-form-item"><label>截止日期</label><input type="date" id="al-goal-due"></div><div class="al-form-actions"><button type="button" id="al-cancel-goal">取消</button><button type="submit" class="mod-cta">创建</button></div></form></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-goal')?.addEventListener('click', close);
    modal.querySelector('#al-goal-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const title = (modal.querySelector('#al-goal-title') as HTMLInputElement).value.trim(); const level = Number((modal.querySelector('#al-goal-level') as HTMLSelectElement).value) as GoalLevel; const due = (modal.querySelector('#al-goal-due') as HTMLInputElement).value || null; if (!title) { new Notice('请输入目标名称'); return; } try { await this.plugin.getGoalManager().createGoal({ title, level, due }); new Notice('目标创建成功！'); close(); this.loadAndRender(); } catch (error) { new Notice('创建失败: ' + (error as Error).message); } });
  }
  
  private showCreateTaskModal(): void {
    const allGoals = this.plugin.getGoalManager().getAllGoals();
    if (allGoals.length === 0) { new Notice('请先创建目标，再添加任务'); this.showCreateGoalModal(); return; }
    this.showCreateTaskModalForGoal(null);
  }
  
  private showCreateTaskModalForGoal(goalId: string | null): void {
    const allGoals = this.plugin.getGoalManager().getAllGoals();
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const goalsByLevel: Record<number, Goal[]> = { 1: [], 2: [], 3: [], 4: [] };
    allGoals.forEach(goal => goalsByLevel[goal['A-level']].push(goal));
    const goalOptions = [1, 2, 3, 4].filter(level => goalsByLevel[level].length > 0).map(level => `<optgroup label="${levelNames[level]}">${goalsByLevel[level].map(goal => `<option value="${goal['A-id']}" ${goal['A-id'] === goalId ? 'selected' : ''}>${goal['A-title']}</option>`).join('')}</optgroup>`).join('');
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `<div class="al-modal-bg"></div><div class="al-modal-box"><div class="al-modal-header"><span>📋 创建任务</span><button class="al-modal-close">×</button></div><form id="al-task-form"><div class="al-form-item"><label>任务名称</label><input type="text" id="al-task-title" required placeholder="例如：完成项目报告"></div><div class="al-form-item"><label>关联目标 *</label><select id="al-task-goal" required><option value="">请选择目标...</option>${goalOptions}</select></div><div class="al-form-item"><label>优先级</label><select id="al-task-priority"><option value="1">🔴 最高</option><option value="2">🟠 高</option><option value="3" selected>🟡 中</option><option value="4">🟢 低</option><option value="5">⚪ 最低</option></select></div><div class="al-form-item"><label>截止日期</label><input type="date" id="al-task-due" value="${new Date().toISOString().split('T')[0]}"></div><div class="al-form-actions"><button type="button" id="al-cancel-task">取消</button><button type="submit" class="mod-cta">创建</button></div></form></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-task')?.addEventListener('click', close);
    modal.querySelector('#al-task-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const title = (modal.querySelector('#al-task-title') as HTMLInputElement).value.trim(); const selectedGoalId = (modal.querySelector('#al-task-goal') as HTMLSelectElement).value; const priority = Number((modal.querySelector('#al-task-priority') as HTMLSelectElement).value) as TaskPriority; const due = (modal.querySelector('#al-task-due') as HTMLInputElement).value || null; if (!title) { new Notice('请输入任务名称'); return; } if (!selectedGoalId) { new Notice('请选择关联目标'); return; } try { await this.plugin.getTaskManager().createTask({ title, priority, due, goal: selectedGoalId }); new Notice('任务创建成功！'); close(); this.loadAndRender(); } catch (error) { new Notice('创建失败: ' + (error as Error).message); } });
  }
  
  private async openTodayNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateTodayNote(); new Notice('今日日记已打开'); } catch (error) { new Notice('打开日记失败'); } }
  private async openWeeklyNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateWeeklyNote(this.plugin.getNoteManager().getCurrentWeekKey()); new Notice('本周周记已打开'); } catch (error) { new Notice('打开周记失败'); } }
  private async openMonthlyNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateMonthlyNote(this.plugin.getNoteManager().getCurrentYearMonth()); new Notice('本月月记已打开'); } catch (error) { new Notice('打开月记失败'); } }
  
  private removeStyles(): void { const oldStyle = document.getElementById('al-dashboard-styles'); if (oldStyle) oldStyle.remove(); }
  
  private addStyles(): void {
    this.removeStyles();
    const style = document.createElement('style');
    style.id = 'al-dashboard-styles';
    style.textContent = `
      .al-dashboard{padding:0;height:100%;display:flex;flex-direction:column;overflow:hidden}.al-page{display:flex;flex-direction:column;height:100%;overflow:hidden}.al-header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:var(--background-secondary);border-bottom:1px solid var(--border-color);flex-shrink:0}.al-header-left{display:flex;flex-direction:column;gap:2px}.al-title{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:600;color:var(--text-primary)}.al-date{font-size:12px;color:var(--text-secondary)}.al-header-actions{display:flex;gap:8px}.al-header-actions button{display:inline-flex;align-items:center;gap:4px}.al-view-tabs{display:flex;gap:4px;padding:8px 24px;background:var(--background-primary);border-bottom:1px solid var(--border-color);flex-shrink:0}.al-view-tab{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:13px;transition:all .15s}.al-view-tab:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-view-tab.active{background:var(--interactive-accent);color:#fff}.al-view-tab span:first-child{font-size:16px}.al-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden}.al-main{padding:16px 24px;gap:16px;overflow-y:auto}.al-main-full{padding:16px 24px;gap:16px;overflow-y:auto}
      .al-detail-view{flex:1;display:flex;flex-direction:column;overflow:hidden}.al-detail-header{display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--background-secondary);border-bottom:1px solid var(--border-color);flex-shrink:0}.al-detail-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;color:var(--text-secondary);transition:all .15s}.al-detail-icon:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-detail-title{display:flex;align-items:center;gap:12px;flex:1}.al-detail-title h2{font-size:20px;font-weight:600;color:var(--text-primary);margin:0}.al-detail-status{font-size:12px;padding:4px 12px;border-radius:12px;background:var(--text-green);color:#fff}.al-detail-status.status-completed{background:var(--text-muted)}.al-detail-status.status-cancelled{background:var(--text-red)}.al-detail-status.status-pending{background:var(--background-modifier-border);color:var(--text-secondary)}.al-detail-status.status-in-progress{background:var(--text-blue);color:#fff}.al-detail-content{flex:1;display:flex;overflow:hidden}.al-detail-main{flex:1;padding:24px;overflow-y:auto}.al-detail-sidebar{width:300px;padding:24px;border-left:1px solid var(--border-color);background:var(--background-secondary);overflow-y:auto;flex-shrink:0}.al-detail-section{margin-bottom:24px}.al-detail-section h3{font-size:14px;font-weight:600;color:var(--text-secondary);margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border-color)}.al-detail-info-grid{display:grid;gap:12px;margin-bottom:16px}.al-detail-info-item{display:flex;justify-content:space-between;align-items:center}.al-detail-info-label{font-size:13px;color:var(--text-secondary)}.al-detail-info-value{font-size:13px;color:var(--text-primary);font-weight:500}.al-detail-progress-row{display:flex;justify-content:space-between;align-items:center}.al-detail-progress{display:flex;align-items:center;gap:8px}.al-detail-progress .al-progress-bar{width:120px;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-detail-progress .al-progress-fill{height:100%;background:var(--interactive-accent)}.al-detail-stats{display:flex;gap:16px}.al-detail-stat{flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color)}.al-detail-stat-num{font-size:28px;font-weight:700;color:var(--text-primary)}.al-detail-stat-label{font-size:12px;color:var(--text-secondary);margin-top:4px}.al-detail-stat-success .al-detail-stat-num{color:var(--text-green)}.al-detail-tasks{display:flex;flex-direction:column;gap:8px}.al-detail-task{display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-detail-task:hover{border-color:var(--interactive-accent)}.al-detail-task-content{flex:1}.al-detail-task-title{font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:4px}.al-detail-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-detail-task-meta{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary)}.al-detail-actions{display:flex;flex-direction:column;gap:8px;margin-bottom:24px}.al-detail-actions button,.al-action-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px}.al-action-btn-success{background:var(--text-green);color:#fff;border:none;border-radius:6px;cursor:pointer}.al-action-btn-danger{background:transparent;color:var(--text-red);border:1px solid var(--text-red);border-radius:6px;cursor:pointer}.al-task-actions{display:flex;flex-direction:column;gap:8px}.al-task-goal-card{padding:16px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-task-goal-card:hover{border-color:var(--interactive-accent)}.al-task-goal-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}.al-task-goal-progress{display:flex;align-items:center;gap:8px}.al-task-goal-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-task-goal-progress .al-progress-fill{height:100%;background:var(--interactive-accent)}.al-task-goal-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}
      .al-table-view{flex:1;padding:16px;overflow:auto}.al-table-empty{display:flex;justify-content:center;align-items:center;height:100%}.al-table{width:100%;border-collapse:collapse;background:var(--background-secondary);border-radius:10px;overflow:hidden}.al-table th{text-align:left;padding:12px 16px;background:var(--background-primary);border-bottom:1px solid var(--border-color);font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px}.al-table td{padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:13px;color:var(--text-primary)}.al-table-row:hover{background:var(--background-modifier-hover);cursor:pointer}.al-table-row.completed td{color:var(--text-muted)}.al-table-row.completed .al-table-title{text-decoration:line-through}.al-table-title{font-weight:500}.al-goal-tag{font-weight:500;font-size:12px;cursor:pointer}.al-goal-tag:hover{text-decoration:underline}.al-status-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500}.al-status-badge.status-pending{background:var(--background-modifier-border);color:var(--text-secondary)}.al-status-badge.status-in-progress{background:color-mix(in srgb,var(--text-blue) 20%,transparent);color:var(--text-blue)}.al-status-badge.status-completed{background:color-mix(in srgb,var(--text-green) 20%,transparent);color:var(--text-green)}.al-status-badge.status-cancelled{background:var(--background-modifier-border);color:var(--text-muted)}
      .al-board-view{display:flex;flex-direction:row;flex:1;gap:12px;padding:16px;overflow-x:auto;min-height:0;background:var(--background-primary);align-items:stretch}.al-board-empty{display:flex;justify-content:center;align-items:center;width:100%}.al-board-column{flex:0 0 260px;display:flex;flex-direction:column;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);overflow:hidden;max-height:100%}.al-board-column-header{display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:2px solid var(--column-accent,var(--interactive-accent));background:var(--background-primary);flex-shrink:0}.al-board-column-title{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--text-primary);overflow:hidden}.al-board-column-title span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-board-column-body{flex:1;padding:8px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:150px}
      .al-gallery-view{flex:1;padding:16px;overflow-y:auto}.al-gallery-empty{display:flex;justify-content:center;align-items:center;height:100%}.al-gallery-section{margin-bottom:24px}.al-gallery-section-title{font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color)}.al-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.al-gallery-card{position:relative;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);padding:16px;transition:all .2s;cursor:pointer}.al-gallery-card:hover{border-color:var(--interactive-accent);box-shadow:0 4px 12px rgba(0,0,0,.1);transform:translateY(-2px)}.al-gallery-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.al-gallery-card-title{font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:12px;line-height:1.4}.al-gallery-card-progress{display:flex;align-items:center;gap:8px;margin-bottom:8px}.al-gallery-card-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-gallery-card-progress .al-progress-fill{height:100%;background:var(--interactive-accent);border-radius:3px}.al-gallery-card-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}.al-gallery-card-meta{font-size:11px;color:var(--text-secondary)}.al-gallery-card-tasks{margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);font-size:12px;color:var(--text-secondary)}
      .al-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin:16px 0}.al-stat{flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:20px 16px;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color)}.al-stat-warning{border-color:var(--text-red);background:color-mix(in srgb,var(--text-red) 5%,var(--background-secondary))}.al-stat-num{font-size:32px;font-weight:700;color:var(--text-primary);line-height:1}.al-stat-label{font-size:12px;color:var(--text-secondary);margin-top:8px}
      .al-panel{flex-shrink:0;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);overflow:hidden;margin:16px 0}.al-panel-overdue{border-color:var(--text-red);background:color-mix(in srgb,var(--text-red) 3%,var(--background-secondary))}.al-panel-header{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--border-color);background:var(--background-primary);flex-shrink:0}.al-panel-header span:first-child{font-size:16px}.al-panel-header span:nth-child(2){font-size:14px;font-weight:500;color:var(--text-primary)}.al-panel-count{margin-left:auto;font-size:12px;padding:2px 8px;background:var(--background-secondary);color:var(--text-secondary);border-radius:10px}.al-count-overdue{background:color-mix(in srgb,var(--text-red) 15%,transparent);color:var(--text-red)}.al-panel-body{max-height:300px;padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
      .al-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;gap:8px;color:var(--text-secondary)}.al-empty span{font-size:40px;opacity:.5}.al-empty-desc{font-size:12px;color:var(--text-muted)}
      .al-goal{padding:12px;background:var(--background-primary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-goal:hover{border-color:var(--interactive-accent)}.al-goal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.al-goal-level{font-size:11px;padding:2px 6px;border-radius:4px;background:var(--interactive-accent);color:#fff}.al-goal-level[data-level="1"]{background:var(--text-purple)}.al-goal-level[data-level="2"]{background:var(--text-blue)}.al-goal-level[data-level="3"]{background:var(--interactive-accent)}.al-goal-level[data-level="4"]{background:var(--text-green)}.al-goal-status{font-size:10px;padding:2px 6px;border-radius:4px;background:var(--text-green);color:#fff}.al-goal-status.completed{background:var(--text-muted)}.al-goal-title{font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:8px}.al-goal-progress{display:flex;align-items:center;gap:8px}.al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-progress-fill{height:100%;background:var(--interactive-accent);border-radius:3px;transition:width .3s}
      .al-task{display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--background-primary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:background .15s;margin-bottom:8px}.al-task:last-child{margin-bottom:0}.al-task:hover{background:var(--background-modifier-hover)}.al-task-check{width:20px;height:20px;border:2px solid var(--border-color);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;flex-shrink:0;margin-top:1px;cursor:pointer}.al-task-check.checked{background:var(--text-green);border-color:var(--text-green)}.al-task-content{flex:1;min-width:0}.al-task-title{font-size:14px;color:var(--text-primary);margin-bottom:6px}.al-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-task-meta{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-secondary)}.al-task-due{color:var(--text-red)}
      .al-quick-btn{display:flex;align-items:center;gap:8px;padding:10px 12px;width:100%;text-align:left}.al-quick-btn span:first-child{font-size:18px}.al-quick-btn span:last-child{font-size:13px;color:var(--text-secondary)}
      .al-modal{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;display:flex;align-items:center;justify-content:center}.al-modal-bg{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5)}.al-modal-box{position:relative;background:var(--background-primary);border-radius:12px;width:90%;max-width:420px;border:1px solid var(--border-color);box-shadow:0 10px 40px rgba(0,0,0,.3);overflow:hidden}.al-modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-color);font-size:16px;font-weight:600;color:var(--text-primary)}.al-modal-close{background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-secondary);line-height:1}#al-goal-form,#al-task-form{padding:20px}.al-form-item{margin-bottom:16px}.al-form-item label{display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:var(--text-secondary)}.al-form-item input,.al-form-item select{width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--background-secondary);color:var(--text-primary);box-sizing:border-box}.al-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.al-view-spacer{flex:1}.al-view-settings-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:13px;transition:all .15s;margin-left:auto}.al-view-settings-btn:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-field-settings-modal{max-width:480px}.al-field-settings-modal .al-modal-body{padding:20px}.al-field-settings-desc{font-size:13px;color:var(--text-secondary);margin:0 0 16px}.al-field-toggles{display:flex;flex-wrap:wrap;gap:8px}.al-field-toggle-btn{padding:8px 14px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-primary);cursor:pointer;font-size:13px;transition:all .15s}.al-field-toggle-btn:hover{border-color:var(--interactive-accent)}.al-field-toggle-btn.selected{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-modal-footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 20px;border-top:1px solid var(--border-color)}.al-btn{padding:8px 16px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-primary);cursor:pointer;font-size:13px}.al-btn:hover{background:var(--background-modifier-hover)}
      @media(max-width:800px){.al-body{flex-direction:column}.al-sidebar{width:100%;max-width:none;border-left:none;border-top:1px solid var(--border-color);padding:16px}.al-header-actions{flex-wrap:wrap;gap:6px}.al-header-actions button{min-width:80px}.al-board-column{flex:0 0 220px}.al-detail-content{flex-direction:column}.al-detail-sidebar{width:100%;border-left:none;border-top:1px solid var(--border-color)}}
      @media(max-width:640px){.al-header{flex-direction:column;align-items:flex-start;gap:12px;padding:12px 16px}.al-view-tabs{padding:8px 12px;overflow-x:auto}.al-view-tab{padding:6px 12px;font-size:12px}.al-header-actions{width:100%;justify-content:stretch}.al-header-actions button{flex:1;min-width:0;justify-content:center;gap:4px;font-size:11px}.al-main{padding:12px;gap:12px}.al-stats{grid-template-columns:repeat(2,1fr);gap:8px}.al-stat{padding:12px}.al-stat-num{font-size:24px}.al-detail-header{flex-wrap:wrap;padding:12px 16px}.al-detail-title h2{font-size:16px}.al-detail-main{padding:16px}.al-detail-stats{flex-wrap:wrap}.al-detail-stat{min-width:80px}.al-board-view{padding:8px;gap:8px}.al-board-column{flex:0 0 180px}.al-gallery-view{padding:12px}.al-gallery-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}.al-gallery-card{padding:12px}.al-gallery-card-title{font-size:13px}}
      .al-calendar-body{padding:0}.al-calendar-modes{display:flex;gap:4px;padding:8px;border-bottom:1px solid var(--border-color)}.al-calendar-mode-btn{padding:4px 10px;border:1px solid var(--border-color);border-radius:4px;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:12px;transition:all .15s}.al-calendar-mode-btn:hover{color:var(--text-primary);border-color:var(--interactive-accent)}.al-calendar-mode-btn.active{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-calendar-content{padding:8px;min-width:280px;overflow-x:auto}.al-calendar-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.al-calendar-nav button{background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:4px 8px;border-radius:4px}.al-calendar-nav button:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-calendar-title{font-size:13px;font-weight:500;color:var(--text-primary)}
      .al-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;min-width:280px}.al-cal-day-header{font-size:11px;color:var(--text-secondary);padding:4px}.al-cal-day{font-size:12px;padding:6px;border-radius:4px;cursor:pointer;transition:all .15s;color:var(--text-primary)}.al-cal-day:hover{background:var(--background-modifier-hover)}.al-cal-day.empty{background:transparent;cursor:default}.al-cal-day.today{background:var(--interactive-accent);color:#fff}.al-cal-day.week-selected{background:var(--interactive-accent-faint,color-mix(in srgb,var(--interactive-accent) 20%,transparent));border:1px solid var(--interactive-accent)}.al-cal-day.today.week-selected{background:var(--interactive-accent);color:#fff}
      .al-cal-month-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;min-width:200px}.al-cal-month-item{padding:10px;text-align:center;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;font-size:12px;color:var(--text-secondary);transition:all .15s}.al-cal-month-item:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-cal-month-item.current{border-color:var(--interactive-accent);background:var(--interactive-accent);color:#fff}.al-cal-month-item.selected{border-color:var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 20%,transparent);color:var(--interactive-accent);font-weight:600}
      .al-cal-year-display{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 0;min-width:200px}.al-cal-year-item{padding:16px 8px;text-align:center;border-radius:8px;border:1px solid var(--border-color);cursor:pointer;font-size:16px;font-weight:600;color:var(--text-secondary);transition:all .15s}.al-cal-year-item:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-cal-year-item.current{font-size:20px;border-color:var(--interactive-accent);background:var(--interactive-accent);color:#fff}.al-cal-year-item.selected{border-color:var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 20%,transparent);color:var(--interactive-accent)}
    `;
    document.head.appendChild(style);
  }
}
