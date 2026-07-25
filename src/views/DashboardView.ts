/**
 * Dashboard View - Clean Layout Version with View Switching
 */

import { ItemView, Notice, TFile, setIcon } from 'obsidian';
import { Goal, Task, GoalLevel, TaskStatus, TaskPriority, TaskField, GoalField, DEFAULT_VIEW_FIELDS, GOAL_FIELD_LABELS, TASK_FIELD_LABELS, FilterCondition, FilterLogic, FilterOperator, FilterState, SavedFilterView, FILTER_OPERATOR_LABELS, GOAL_FILTER_FIELDS, TASK_FILTER_FIELDS, ViewTab, ViewTabType, getDefaultViewTabs } from '../types';
import AmazingLife from '../main';

export const DASHBOARD_VIEW_TYPE = 'amazing-life-dashboard';

export type ViewType = 'dashboard' | 'list' | 'board' | 'gallery' | 'goal-detail' | 'task-detail';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';
export type BoardGroupBy = 'level' | 'goalStatus';

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
  private selectedDay: string | null = null;
  // 拖拽相关
  private draggingGoalId: string | null = null;
  private draggingGoalEl: HTMLElement | null = null;
  private dragGhost: HTMLElement | null = null;
  private dropTargetColumn: string | null = null;
  // 导航历史
  private viewHistory: Array<{ view: ViewType; goalId?: string | null; taskId?: string | null }> = [];
  // 临时筛选状态（用于渲染和事件处理）
  private tempFilterConditions: FilterCondition[] = [];
  private tempFilterLogic: FilterLogic = 'and';
  private tempShowFilterBuilder: boolean = false;
  
  // 生成唯一ID
  private generateFilterId(): string {
    return 'filter_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }
  
  private generateTabId(): string {
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }
  
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
  
  // 导航到新页面并记录历史
  private navigateTo(view: ViewType, goalId: string | null, taskId: string | null): void {
    // 记录当前状态到历史
    this.viewHistory.push({
      view: this.currentView,
      goalId: this.selectedGoalId,
      taskId: this.selectedTaskId
    });
    
    // 限制历史记录数量
    if (this.viewHistory.length > 20) {
      this.viewHistory.shift();
    }
    
    // 导航到新页面
    this.currentView = view;
    this.selectedGoalId = goalId;
    this.selectedTaskId = taskId;
    this.render();
  }
  
  // 返回上一页
  private goBack(): void {
    if (this.viewHistory.length > 0) {
      const prevState = this.viewHistory.pop()!;
      this.currentView = prevState.view;
      this.selectedGoalId = prevState.goalId ?? null;
      this.selectedTaskId = prevState.taskId ?? null;
      this.render();
    } else {
      // 没有历史记录，返回仪表盘
      this.currentView = 'dashboard';
      this.selectedGoalId = null;
      this.selectedTaskId = null;
      this.render();
    }
  }
  
  // ========== 标签页管理方法 ==========
  
  // 获取所有标签页
  private getViewTabs(): ViewTab[] {
    const settings = this.plugin.getSettings();
    // 如果没有标签页，初始化默认标签
    if (!settings.viewTabs || settings.viewTabs.length === 0) {
      settings.viewTabs = getDefaultViewTabs();
      this.plugin.saveSettings();
    }
    return settings.viewTabs;
  }
  
  // 获取当前活动标签
  private getActiveTab(): ViewTab | null {
    const settings = this.plugin.getSettings();
    const tabs = this.getViewTabs();
    if (settings.activeTabId) {
      return tabs.find(t => t.id === settings.activeTabId) || null;
    }
    // 默认返回第一个
    return tabs[0] || null;
  }
  
  // 切换到指定标签
  private switchTab(tabId: string): void {
    const settings = this.plugin.getSettings();
    settings.activeTabId = tabId;
    this.plugin.saveSettings();
    
    const tab = this.getViewTabs().find(t => t.id === tabId);
    if (tab) {
      this.currentView = tab.type;
      // 加载该标签的筛选条件到临时状态
      this.tempFilterConditions = [...(tab.filters || [])];
      this.tempFilterLogic = tab.filterLogic || 'and';
      this.tempShowFilterBuilder = false;
    }
    this.render();
  }
  
  // 添加新标签
  private async addTab(type: ViewTabType, name?: string): Promise<void> {
    const tabs = this.getViewTabs();
    const defaultNames: Record<ViewTabType, string> = {
      'list': '新列表',
      'board': '新看板',
      'gallery': '新画廊'
    };
    
    const newTab: ViewTab = {
      id: this.generateTabId(),
      name: name || defaultNames[type],
      type: type,
      groupBy: type === 'board' ? 'level' : undefined,
      filters: [],
      filterLogic: 'and'
    };
    
    tabs.push(newTab);
    const settings = this.plugin.getSettings();
    settings.viewTabs = tabs;
    settings.activeTabId = newTab.id;
    await this.plugin.saveSettings();
    
    this.currentView = type;
    this.render();
  }
  
  // 删除标签
  private async removeTab(tabId: string): Promise<void> {
    const settings = this.plugin.getSettings();
    let tabs = this.getViewTabs();
    
    // 不能删除最后一个
    if (tabs.length <= 1) {
      new Notice('至少保留一个视图标签');
      return;
    }
    
    tabs = tabs.filter(t => t.id !== tabId);
    settings.viewTabs = tabs;
    
    // 如果删除的是当前活动标签，切换到第一个
    if (settings.activeTabId === tabId) {
      settings.activeTabId = tabs[0].id;
      this.currentView = tabs[0].type;
    }
    
    await this.plugin.saveSettings();
    this.render();
  }
  
  // 重命名标签
  private async renameTab(tabId: string, newName: string): Promise<void> {
    const settings = this.plugin.getSettings();
    const tabs = this.getViewTabs();
    
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      tab.name = newName;
      settings.viewTabs = tabs;
      await this.plugin.saveSettings();
      this.render();
    }
  }
  
  // 显示标签上下文菜单（长按触发）
  private showTabContextMenu(nameEl: HTMLElement, tabId: string): void {
    const rect = nameEl.getBoundingClientRect();
    
    const existingMenu = document.querySelector('.al-tab-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'al-tab-context-menu show';
    menu.innerHTML = `
      <button class="al-tab-context-option" data-action="rename">
        <span class="al-tab-icon" data-icon="pencil"></span>
        <span>重命名</span>
      </button>
      <button class="al-tab-context-option" data-action="close">
        <span class="al-tab-icon" data-icon="x"></span>
        <span>关闭</span>
      </button>
    `;
    
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
      menu.querySelectorAll('.al-tab-icon').forEach(iconEl => {
        const iconName = iconEl.getAttribute('data-icon');
        if (iconName) {
          try {
            setIcon(iconEl as HTMLElement, iconName);
          } catch (e) {}
        }
      });
    }, 0);
    
    menu.querySelectorAll('.al-tab-context-option').forEach(opt => {
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = (opt as HTMLElement).getAttribute('data-action');
        if (action === 'rename') {
          menu.remove();
          this.editTabName(nameEl, tabId);
        } else if (action === 'close') {
          menu.remove();
          this.removeTab(tabId);
        }
      });
    });
    
    const closeHandler = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 0);
  }
  
  // 编辑标签名称（双击触发）
  private editTabName(nameEl: HTMLElement, tabId: string): void {
    const currentName = nameEl.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'al-tab-name-edit';
    
    // 替换为输入框
    nameEl.replaceWith(input);
    
    // 自动选中全部文本
    setTimeout(() => {
      input.select();
      input.focus();
    }, 0);
    
    // 确认修改（回车）
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          await this.renameTab(tabId, newName);
        } else {
          // 恢复原名称
          input.replaceWith(nameEl);
        }
      } else if (e.key === 'Escape') {
        // 取消编辑
        input.replaceWith(nameEl);
      }
    });
    
    // 点击外部取消编辑
    const blurHandler = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        await this.renameTab(tabId, newName);
      } else {
        input.replaceWith(nameEl);
      }
      document.removeEventListener('click', checkClickOutside);
    };
    
    const checkClickOutside = (e: MouseEvent) => {
      if (!input.contains(e.target as Node)) {
        blurHandler();
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', checkClickOutside);
    }, 0);
  }
  
  // 更新当前标签的筛选条件
  private async updateActiveTabFilters(conditions: FilterCondition[], logic: FilterLogic): Promise<void> {
    const settings = this.plugin.getSettings();
    const tabs = this.getViewTabs();
    const activeTab = this.getActiveTab();
    
    if (activeTab) {
      const tabIndex = tabs.findIndex(t => t.id === activeTab.id);
      if (tabIndex !== -1) {
        tabs[tabIndex].filters = conditions;
        tabs[tabIndex].filterLogic = logic;
        settings.viewTabs = tabs;
        await this.plugin.saveSettings();
      }
    }
  }
  
  // 更新当前标签的看板分组方式
  private async updateActiveTabGroupBy(groupBy: 'level' | 'goalStatus'): Promise<void> {
    const settings = this.plugin.getSettings();
    const tabs = this.getViewTabs();
    const activeTab = this.getActiveTab();
    
    if (activeTab) {
      const tabIndex = tabs.findIndex(t => t.id === activeTab.id);
      if (tabIndex !== -1) {
        tabs[tabIndex].groupBy = groupBy;
        settings.viewTabs = tabs;
        await this.plugin.saveSettings();
      }
    }
  }
  
  // 获取当前标签的筛选条件
  private getCurrentFilters(): { conditions: FilterCondition[]; logic: FilterLogic; groupBy: 'level' | 'goalStatus' } {
    const activeTab = this.getActiveTab();
    if (activeTab) {
      return {
        conditions: activeTab.filters || [],
        logic: activeTab.filterLogic || 'and',
        groupBy: activeTab.groupBy || 'level'
      };
    }
    return { conditions: [], logic: 'and', groupBy: 'level' };
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
    
    // 获取当前筛选和分组设置
    const currentFilters = this.getCurrentFilters();
    
    // 渲染视图标签页
    const tabs = this.getViewTabs();
    const activeTab = this.getActiveTab();
    const isDashboard = this.currentView === 'dashboard';
    const viewTabsHtml = tabs.map(tab => {
      // 在仪表盘首页时，所有视图标签都不显示 active 状态
      const isActive = !isDashboard && activeTab?.id === tab.id;
      const icons: Record<ViewTabType, string> = {
        'list': 'list',
        'board': 'columns',
        'gallery': 'gallery-horizontal'
      };
      return `
        <button class="al-view-tab ${isActive ? 'active' : ''}" data-tab-id="${tab.id}">
          <span class="al-tab-icon" data-icon="${icons[tab.type]}"></span>
          <span class="al-tab-name" data-tab-id="${tab.id}" title="右键菜单 / 长按菜单">${tab.name}</span>
        </button>
      `;
    }).join('');
    
    content.innerHTML = `
      <div class="al-page">
        <div class="al-header">
          <div class="al-header-left">
            <div class="al-title">Amazing Life</div>
            <div class="al-date">${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
          </div>
        </div>
        
        <div class="al-view-tabs">
          <button class="al-view-tab ${this.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard"><span class="al-tab-icon" data-icon="layout-grid"></span><span>仪表盘</span></button>
          ${viewTabsHtml}
          <button class="al-view-tab al-view-tab-add" id="al-add-view-tab" title="添加视图"><span class="al-tab-icon" data-icon="plus"></span></button>
        </div>
        
        ${['list', 'board', 'gallery'].includes(this.currentView) ? this.renderFilterBar(currentFilters) : ''}
        
        <div class="al-body">
          ${this.renderCurrentView(allGoals, allTasks, todayTasks, overdueTasks, weekComplete, activeTasks)}
        </div>
      </div>
    `;
     
     this.bindEvents();
     this.addStyles();
    this.setTabIcons();
  }
  
  private renderCurrentView(allGoals: Goal[], allTasks: Task[], todayTasks: Task[], overdueTasks: Task[], weekComplete: number, activeTasks: number): string {
    // 对目标进行筛选
    const filteredGoals = this.applyFilterConditions(allGoals);
    
    switch (this.currentView) {
      case 'goal-detail': return this.selectedGoalId ? this.renderGoalDetailView(this.selectedGoalId) : this.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
      case 'task-detail': return this.selectedTaskId ? this.renderTaskDetailView(this.selectedTaskId) : this.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
      case 'list': return this.renderListView(filteredGoals, allTasks);
      case 'board': return this.renderBoardView(filteredGoals, allTasks);
      case 'gallery': return this.renderGalleryView(filteredGoals, allTasks);
      default: return this.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
    }
  }
  
  // 应用筛选条件
  private applyFilterConditions(goals: Goal[]): Goal[] {
    if (this.tempFilterConditions.length === 0) {
      return goals;
    }
    
    return goals.filter(goal => {
      const results = this.tempFilterConditions.map(condition => {
        return this.evaluateCondition(goal, condition);
      });
      
      // 根据逻辑运算符决定最终结果
      if (this.tempFilterLogic === 'and') {
        return results.every(r => r);
      } else {
        return results.some(r => r);
      }
    });
  }
  
  // 评估单个条件
  private evaluateCondition(goal: Goal, condition: FilterCondition): boolean {
    const value = goal[condition.field as keyof Goal];
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        if (typeof value === 'string') {
          return value.toLowerCase().includes(String(condition.value).toLowerCase());
        }
        return false;
      case 'not_contains':
        if (typeof value === 'string') {
          return !value.toLowerCase().includes(String(condition.value).toLowerCase());
        }
        return true;
      case 'starts_with':
        if (typeof value === 'string') {
          return value.toLowerCase().startsWith(String(condition.value).toLowerCase());
        }
        return false;
      case 'ends_with':
        if (typeof value === 'string') {
          return value.toLowerCase().endsWith(String(condition.value).toLowerCase());
        }
        return false;
      case 'greater_than':
        return typeof value === 'number' && value > Number(condition.value);
      case 'less_than':
        return typeof value === 'number' && value < Number(condition.value);
      case 'greater_or_equal':
        return typeof value === 'number' && value >= Number(condition.value);
      case 'less_or_equal':
        return typeof value === 'number' && value <= Number(condition.value);
      case 'is_empty':
        return value === null || value === undefined || value === '';
      case 'is_not_empty':
        return value !== null && value !== undefined && value !== '';
      case 'is_null':
        return value === null || value === undefined;
      case 'is_not_null':
        return value !== null && value !== undefined;
      default:
        return true;
    }
  }
  
  // 获取字段的操作符选项
  private getOperatorsForFieldType(type: string): FilterOperator[] {
    switch (type) {
      case 'string':
        return ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'];
      case 'number':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'];
      case 'select':
        return ['equals', 'not_equals', 'is_empty', 'is_not_empty'];
      case 'date':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'];
      case 'array':
        return ['contains', 'not_contains', 'is_empty', 'is_not_empty'];
      default:
        return ['equals', 'not_equals'];
    }
  }
  
  // 获取字段类型
  private getFieldType(fieldName: string): string {
    const fieldDef = GOAL_FILTER_FIELDS.find(f => f.field === fieldName);
    return fieldDef?.type || 'string';
  }
  
  // 渲染筛选栏
  private renderFilterBar(currentFilters: { conditions: FilterCondition[]; logic: FilterLogic; groupBy: 'level' | 'goalStatus' }): string {
    const hasConditions = this.tempFilterConditions.length > 0;
    
    const groupByOptions = [
      { value: 'level', label: '按层级' },
      { value: 'goalStatus', label: '按状态' }
    ];
    
    return `
      <div class="al-filter-bar">
        <button id="al-toggle-filter-builder" class="al-filter-toggle ${this.tempShowFilterBuilder ? 'active' : ''}">
          ${this.tempShowFilterBuilder ? '收起' : '添加筛选条件'}
        </button>
        
        ${this.currentView === 'board' ? `
          <div class="al-board-group-inline">
            <span class="al-board-group-label">分组：</span>
            <select id="al-board-group-by" class="al-filter-select">
              ${groupByOptions.map(opt => `<option value="${opt.value}" ${currentFilters.groupBy === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
          </div>
        ` : ''}
        
        ${hasConditions ? `
          <button id="al-filter-save" class="al-filter-btn">保存</button>
          <button id="al-filter-clear" class="al-filter-btn al-filter-btn-danger">清除</button>
        ` : ''}
        
        ${hasConditions ? `<span class="al-filter-count">${this.tempFilterConditions.length} 个条件 (${this.tempFilterLogic === 'and' ? '且' : '或'})</span>` : ''}
        
        <div class="al-filter-spacer"></div>
        <button class="al-filter-settings-btn" id="al-open-field-settings" title="字段设置">
          <span class="al-tab-icon" data-icon="settings"></span>
          <span>字段</span>
        </button>
      </div>
      ${this.tempShowFilterBuilder ? this.renderFilterBuilder() : ''}
    `;
  }
  
  // 渲染筛选构建器
  private renderFilterBuilder(): string {
    const fields = GOAL_FILTER_FIELDS;
    
    return `
      <div class="al-filter-builder">
        <div class="al-filter-logic-row">
          <span class="al-filter-logic-label">条件组合：</span>
          <button class="al-filter-logic-btn ${this.tempFilterLogic === 'and' ? 'active' : ''}" data-logic="and">且 (AND)</button>
          <button class="al-filter-logic-btn ${this.tempFilterLogic === 'or' ? 'active' : ''}" data-logic="or">或 (OR)</button>
        </div>
        
        <div class="al-filter-conditions">
          ${this.tempFilterConditions.map((condition, index) => this.renderFilterCondition(condition, index, fields)).join('')}
        </div>
        
        <button id="al-add-filter-condition" class="al-filter-add-btn">+ 添加条件</button>
      </div>
    `;
  }
  
  // 渲染单个筛选条件
  private renderFilterCondition(condition: FilterCondition, index: number, fields: typeof GOAL_FILTER_FIELDS): string {
    const selectedField = fields.find(f => f.field === condition.field);
    const fieldType = selectedField?.type || 'string';
    const availableOperators = this.getOperatorsForFieldType(fieldType);
    const needsValue = !['is_empty', 'is_not_empty', 'is_null', 'is_not_null'].includes(condition.operator);
    
    return `
      <div class="al-filter-condition" data-condition-id="${condition.id}">
        <select class="al-filter-field-select" data-condition-index="${index}">
          ${fields.map(f => `<option value="${f.field}" ${f.field === condition.field ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
        
        <select class="al-filter-operator-select" data-condition-index="${index}">
          ${availableOperators.map(op => `<option value="${op}" ${op === condition.operator ? 'selected' : ''}>${FILTER_OPERATOR_LABELS[op]}</option>`).join('')}
        </select>
        
        ${needsValue ? this.renderConditionValue(condition, selectedField) : '<span class="al-filter-no-value">-</span>'}
        
        <button class="al-filter-remove-btn" data-condition-id="${condition.id}">✕</button>
      </div>
    `;
  }
  
  // 渲染条件值输入
  private renderConditionValue(condition: FilterCondition, fieldDef: typeof GOAL_FILTER_FIELDS[0] | undefined): string {
    if (!fieldDef) {
      return `<input type="text" class="al-filter-value-input" data-condition-id="${condition.id}" value="${condition.value || ''}" placeholder="输入值...">`;
    }
    
    if (fieldDef.type === 'select' && fieldDef.options) {
      return `
        <select class="al-filter-value-select" data-condition-id="${condition.id}">
          <option value="">请选择...</option>
          ${fieldDef.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
        </select>
      `;
    }
    
    if (fieldDef.type === 'number') {
      return `<input type="number" class="al-filter-value-input" data-condition-id="${condition.id}" value="${condition.value || ''}" min="${fieldDef.min || 0}" max="${fieldDef.max || 100}">`;
    }
    
    if (fieldDef.type === 'date') {
      return `<input type="date" class="al-filter-value-input al-filter-date-input" data-condition-id="${condition.id}" value="${condition.value || ''}">`;
    }
    
    return `<input type="text" class="al-filter-value-input" data-condition-id="${condition.id}" value="${condition.value || ''}" placeholder="输入值...">`;
  }
  
  // 删除筛选条件
  private removeFilterCondition(conditionId: string): void {
    this.tempFilterConditions = this.tempFilterConditions.filter(c => c.id !== conditionId);
    this.render();
  }
  
  // 更新筛选条件
  private updateFilterCondition(conditionId: string, updates: Partial<FilterCondition>): void {
    this.tempFilterConditions = this.tempFilterConditions.map(c => {
      if (c.id === conditionId) {
        return { ...c, ...updates };
      }
      return c;
    });
  }
  
  private renderGoalDetailView(goalId: string): string {
    const goal = this.getGoal(goalId);
    if (!goal) return `<div class="al-detail-view"><div class="al-empty">${this.renderEmpty('❌', '目标不存在', '')}</div></div>`;
    
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: '#8B5CF6', 2: '#3B82F6', 3: '#6366F1', 4: '#22C55E' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const goalTasks = this.getTasksByGoal(goalId);
    const pendingTasks = goalTasks.filter(t => t['A-status'] === 'pending');
    const inProgressTasks = goalTasks.filter(t => t['A-status'] === 'in-progress');
    const completedTasks = goalTasks.filter(t => t['A-status'] === 'completed');
    const priorityNames = ['最高', '高', '中', '低', '最低'];
    const priorityColors = ['var(--text-red)', 'var(--text-orange)', 'var(--text-yellow)', 'var(--text-green)', 'var(--text-muted)'];
    
    const parentGoal = goal['A-parent'] ? this.getGoal(goal['A-parent']) : null;
    
    return `
      <div class="al-detail-view">
        <div class="al-detail-header">
          <div class="al-detail-icon" id="al-back-btn" title="返回">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </div>
          <div class="al-detail-title">
            <h2>${goal['A-title']}</h2>
          </div>
        </div>
        <div class="al-detail-content">
          <div class="al-detail-main">
            <div class="al-detail-fields">
              <div class="al-field-row" data-field="level" data-value="${goal['A-level']}">
                <span class="al-field-icon">🎯</span>
                <span class="al-field-label">目标层级</span>
                <span class="al-field-value al-field-editable" data-field-type="select">${levelNames[goal['A-level']]}</span>
              </div>
              <div class="al-field-row" data-field="status" data-value="${goal['A-status']}">
                <span class="al-field-icon">📊</span>
                <span class="al-field-label">目标状态</span>
                <span class="al-field-value al-field-editable" data-field-type="select">${statusNames[goal['A-status']]}</span>
              </div>
              <div class="al-field-row" data-field="progress" data-value="${goal['A-progress']}">
                <span class="al-field-icon">📈</span>
                <span class="al-field-label">完成进度</span>
                <div class="al-field-value">
                  <div class="al-progress-slider-container">
                    <input type="range" class="al-progress-slider" min="0" max="100" value="${goal['A-progress']}" data-field="progress">
                    <span class="al-progress-value">${goal['A-progress']}%</span>
                  </div>
                </div>
              </div>
              <div class="al-field-row" data-field="start" data-value="${goal['A-start']}">
                <span class="al-field-icon">📅</span>
                <span class="al-field-label">开始时间</span>
                <span class="al-field-value al-field-editable" data-field-type="date">${goal['A-start'] || '-'}</span>
              </div>
              <div class="al-field-row" data-field="due" data-value="${goal['A-due'] || ''}">
                <span class="al-field-icon">⏰</span>
                <span class="al-field-label">截止时间</span>
                <span class="al-field-value al-field-editable" data-field-type="date">${goal['A-due'] || '-'}</span>
              </div>
              ${parentGoal ? `
              <div class="al-field-row">
                <span class="al-field-icon">🔗</span>
                <span class="al-field-label">上级目标</span>
                <span class="al-field-value al-field-link" data-goal-id="${parentGoal['A-id']}">${parentGoal['A-title']}</span>
              </div>
              ` : ''}

            </div>
            <div class="al-detail-description-block" data-field="description" data-value="${goal['A-description'] || ''}">
              <div class="al-detail-description-header">
                <span class="al-detail-description-icon">📝</span>
                <span class="al-detail-description-title">目标描述</span>
              </div>
              <div class="al-detail-description-content al-field-editable" data-field-type="textarea">${goal['A-description'] || '添加描述...'}</div>
            </div>
            <div class="al-detail-tasks-block">
              <div class="al-detail-tasks-header">
                <span class="al-detail-tasks-icon">📋</span>
                <span class="al-detail-tasks-title">关联任务</span>
                <span class="al-detail-tasks-count">${goalTasks.length}</span>
              </div>
              <div class="al-detail-task-summary">
                <span>待办 ${pendingTasks.length}</span>
                <span>进行中 ${inProgressTasks.length}</span>
                <span>已完成 ${completedTasks.length}</span>
              </div>
              ${goalTasks.length === 0 ? `<div class="al-detail-tasks-empty"><span class="al-empty-text">暂无任务，点击下方添加</span></div>` : `<div class="al-detail-tasks">${goalTasks.map(task => `
                <div class="al-detail-task" data-task-id="${task['A-id']}">
                  <input type="checkbox" class="task-list-item-checkbox" ${task['A-status'] === 'completed' ? 'checked' : ''} data-task-id="${task['A-id']}">
                  <div class="al-detail-task-title ${task['A-status'] === 'completed' ? 'done' : ''}">${task['A-title']}</div>
                  <div class="al-detail-task-priority" style="color: ${priorityColors[task['A-priority'] - 1]}">${['🔴', '🟠', '🟡', '🟢', '⚪'][task['A-priority'] - 1]} ${priorityNames[task['A-priority'] - 1]}</div>
                </div>
              `).join('')}</div>`}
              <div class="al-add-goal-link" id="al-add-task-to-goal">+ 添加任务</div>
            </div>
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
  
  private renderListView(allGoals: Goal[], allTasks: Task[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    
    if (allGoals.length === 0) return `<div class="al-table-view"><div class="al-table-empty">${this.renderEmpty('🎯', '暂无目标', '先创建目标')}</div></div>`;
    
    // 构建表头
    const headerHtml = `
      <th style="width:40px"></th>
      <th>目标名称</th>
      <th style="width:100px">层级</th>
      <th style="width:100px">状态</th>
      <th style="width:80px">进度</th>
      <th style="width:120px">截止日期</th>
    `;
    
    // 构建表格行
    const rowsHtml = allGoals.map(goal => {
      const tasks = allTasks.filter(t => t['A-goal'] === goal['A-id']);
      const completedCount = tasks.filter(t => t['A-status'] === 'completed').length;
      return `
        <tr class="al-table-row" data-goal-id="${goal['A-id']}">
          <td><span class="al-level-dot" style="background:${levelColors[goal['A-level']]}"></span></td>
          <td class="al-table-title">${goal['A-title']}</td>
          <td><span class="al-goal-level" data-level="${goal['A-level']}" style="background:${levelColors[goal['A-level']]}">${levelNames[goal['A-level']]}</span></td>
          <td><span class="al-status-badge status-${goal['A-status']}">${statusNames[goal['A-status']]}</span></td>
          <td><span class="al-progress-text">${goal['A-progress']}%</span></td>
          <td>${goal['A-due'] || '-'}</td>
        </tr>
      `;
    }).join('');
    
    return `<div class="al-table-view"><table class="al-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table><div class="al-add-goal-link" id="al-list-add-goal">+ 添加目标</div></div>`;
  }
  
  private renderBoardView(allGoals: Goal[], allTasks: Task[]): string {
    const currentFilters = this.getCurrentFilters();
    const boardGroupBy = currentFilters.groupBy;
    
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: '#8B5CF6', 2: '#3B82F6', 3: '#6366F1', 4: '#22C55E' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const statusColors: Record<string, string> = { 'active': 'var(--text-blue)', 'completed': 'var(--text-green)', 'abandoned': 'var(--text-muted)' };
    
    let columnsHtml = '';
    
    if (boardGroupBy === 'level') {
      // 按层级分组
      columnsHtml = [1, 2, 3, 4].map(level => {
        const goals = allGoals.filter(g => g['A-level'] === level);
        console.log('[AL Board] Rendering level', level, 'name:', levelNames[level], 'color:', levelColors[level], 'goals:', goals.length);
        return `<div class="al-board-column" data-column-type="level" data-column-value="${level}">
          <div class="al-board-column-header">
            <div class="al-board-column-title">
              <span class="al-level-badge" style="background:${levelColors[level]};color:#fff;font-size:14px;font-weight:700;padding:4px 12px;border-radius:6px;display:inline-block;min-width:40px;text-align:center">${levelNames[level]}</span>
            </div>
            <span class="al-list-count">${goals.length}</span>
          </div>
          <div class="al-board-column-body">
            ${goals.length === 0 ? this.renderEmpty('🎯', '暂无目标', '') : this.renderGoalsForBoard(goals, allTasks)}
          </div>
          <div class="al-board-column-footer">
            <div class="al-add-goal-btn" data-prefill-level="${level}">+ 添加目标</div>
          </div>
        </div>`;
      }).join('');
    } else if (boardGroupBy === 'goalStatus') {
      // 按目标状态分组
      const statusOrder = ['active', 'completed', 'abandoned'];
      columnsHtml = statusOrder.map(status => {
        const goals = allGoals.filter(g => g['A-status'] === status);
        return `<div class="al-board-column" data-column-type="goalStatus" data-column-value="${status}">
          <div class="al-board-column-header">
            <div class="al-board-column-title">
              <span class="al-status-dot" style="background:${statusColors[status]}"></span>
              <span>${statusNames[status]}</span>
            </div>
            <span class="al-list-count">${goals.length}</span>
          </div>
          <div class="al-board-column-body">
            ${goals.length === 0 ? this.renderEmpty('🎯', '暂无目标', '') : this.renderGoalsForBoard(goals, allTasks)}
          </div>
          <div class="al-board-column-footer">
            <div class="al-add-goal-btn" data-prefill-status="${status}">+ 添加目标</div>
          </div>
        </div>`;
      }).join('');
    }
    
    return `
      <div class="al-board-view">${columnsHtml}</div>
    `;
  }
  
  private renderGoalsForBoard(goals: Goal[], allTasks: Task[]): string {
    return goals.map(goal => {
      const tasks = allTasks.filter(t => t['A-goal'] === goal['A-id']);
      const completedCount = tasks.filter(t => t['A-status'] === 'completed').length;
      return `
        <div class="al-goal-card" data-goal-id="${goal['A-id']}">
          <div class="al-goal-card-title">${goal['A-title']}</div>
          <div class="al-goal-card-progress">
            <div class="al-progress-bar"><div class="al-progress-fill" style="width:${goal['A-progress']}%"></div></div>
            <span>${goal['A-progress']}%</span>
          </div>
          <div class="al-goal-card-meta">
            <span>📋 ${tasks.length} 个任务</span>
            <span>✓ ${completedCount} 已完成</span>
          </div>
        </div>
      `;
    }).join('');
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
    
    return `<div class="al-gallery-view"><div class="al-gallery-section"><div class="al-gallery-section-title">目标 (${allGoals.length})</div><div class="al-gallery-grid">${cardsHtml}<div class="al-gallery-add-card" id="al-gallery-add-goal"><span class="al-gallery-add-icon">+</span><span>添加目标</span></div></div></div></div>`;
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
      const isSelected = this.selectedDay === dateStr;
      const classes = ['al-cal-day'];
      if (isToday) classes.push('today');
      if (isSelected) classes.push('day-selected');
      cells += `<div class="${classes.join(' ')}" data-date="${dateStr}">${d}</div>`;
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
    if (fields.includes('priority')) metaHtml += `<div class="al-field-row"><span class="al-field-label">优先级</span><span class="al-field-value" style="color:var(${priorityColors[task['A-priority']]})">${['最高','高','中','低','最低'][task['A-priority']-1]}</span></div>`;
    if (fields.includes('status')) metaHtml += `<div class="al-field-row"><span class="al-field-label">状态</span><span class="al-status-badge status-${task['A-status']}">${statusNames[task['A-status']]}</span></div>`;
    if (fields.includes('due') && task['A-due']) metaHtml += `<div class="al-field-row"><span class="al-field-label">截止</span><span class="al-task-due">${task['A-due']}</span></div>`;
    if (fields.includes('goal')) metaHtml += `<div class="al-field-row"><span class="al-field-label">目标</span><span class="al-goal-tag">${this.getGoalTitle(task['A-goal'])}</span></div>`;
    if (fields.includes('tags') && task['A-tags'].length > 0) metaHtml += `<div class="al-field-row"><span class="al-field-label">标签</span><span>${task['A-tags'].map(t => '#' + t).join(' ')}</span></div>`;
    
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
    
    // Calendar events
    this.bindCalendarEvents(content);
    
    // 仪表盘标签点击（固定的）
    content.querySelectorAll('.al-view-tab[data-view]').forEach(tab => { 
      tab.addEventListener('click', () => { 
        const view = (tab as HTMLElement).getAttribute('data-view') as ViewType; 
        if (view === 'dashboard' && this.currentView !== 'dashboard') { 
          this.currentView = 'dashboard'; 
          this.selectedGoalId = null; 
          this.selectedTaskId = null; 
          this.render(); 
        }
      }); 
    });
    
    // 标签页点击事件
    content.querySelectorAll('.al-view-tab[data-tab-id]').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = (tab as HTMLElement).getAttribute('data-tab-id');
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
    
    // 标签页右键菜单（桌面端）和长按菜单（移动端）
    content.querySelectorAll('.al-tab-name').forEach(nameEl => {
      // 右键菜单
      nameEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const tabId = (nameEl as HTMLElement).getAttribute('data-tab-id');
        if (tabId) {
          this.showTabContextMenu(nameEl as HTMLElement, tabId);
        }
      });
      
      // 长按弹出菜单（移动端）
      let longPressTimer: number | null = null;
      nameEl.addEventListener('touchstart', (e) => {
        longPressTimer = window.setTimeout(() => {
          const tabId = (nameEl as HTMLElement).getAttribute('data-tab-id');
          if (tabId) {
            this.showTabContextMenu(nameEl as HTMLElement, tabId);
          }
        }, 500);
      });
      
      nameEl.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
      
      nameEl.addEventListener('touchcancel', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
    });
    
    // 添加视图按钮 - 显示下拉菜单
    content.querySelector('#al-add-view-tab')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showAddViewDropdown(e as MouseEvent);
    });
    
    // 看板分组选择
    content.querySelector('#al-board-group-by')?.addEventListener('change', (e) => {
      const groupBy = (e.target as HTMLSelectElement).value as 'level' | 'goalStatus';
      this.updateActiveTabGroupBy(groupBy);
      this.render();
    });
    
    // 返回按钮 - 返回上一页
    content.querySelector('#al-back-btn')?.addEventListener('click', () => { this.goBack(); });
    
    // Goal click events - 记录历史
    content.querySelectorAll('.al-goal, .al-gallery-goal').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.navigateTo('goal-detail', goalId, null); } }); });
    
    // Task click events (in detail views) - 记录历史
    content.querySelectorAll('.al-detail-task').forEach(el => { el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('.task-list-item-checkbox')) { return; } const taskId = (e.currentTarget as HTMLElement).getAttribute('data-task-id'); if (taskId) { this.showTaskDetailModal(taskId); } }); });
    
    // Goal row click in list view - 记录历史
    content.querySelectorAll('.al-table-row[data-goal-id]').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.navigateTo('goal-detail', goalId, null); } }); });
    
    // Goal tag click in list view
    content.querySelectorAll('.al-goal-tag').forEach(el => { el.addEventListener('click', (e) => { e.stopPropagation(); const goalId = (e.target as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.selectedGoalId = goalId; this.currentView = 'goal-detail'; this.render(); } }); });
    
    // Task goal card click
    content.querySelectorAll('.al-task-goal-card').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.navigateTo('goal-detail', goalId, null); } }); });
    
    content.querySelector('#al-add-task-to-goal')?.addEventListener('click', () => { if (this.selectedGoalId) this.showCreateTaskModalForGoal(this.selectedGoalId); });
    
    // 字段行内编辑事件
    content.querySelectorAll('.al-field-row[data-field], .al-detail-description-block[data-field]').forEach(row => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('al-field-link')) return;
        const field = row.getAttribute('data-field');
        const value = row.getAttribute('data-value');
        const fieldType = row.querySelector('.al-field-editable')?.getAttribute('data-field-type');
        if (field && fieldType && this.selectedGoalId) {
          this.startFieldEdit(row as HTMLElement, field, fieldType, value || '');
        }
      });
    });
    
    // 上级目标点击事件
    content.querySelectorAll('.al-field-link[data-goal-id]').forEach(link => {
      link.addEventListener('click', (e) => {
        const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id');
        if (goalId) this.navigateTo('goal-detail', goalId, null);
      });
    });
    
    // 进度滑块事件
    content.querySelectorAll('.al-progress-slider[data-field="progress"]').forEach(slider => {
      const valueEl = slider.parentElement?.querySelector('.al-progress-value');
      slider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (valueEl) valueEl.textContent = `${value}%`;
      });
      slider.addEventListener('change', async (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (this.selectedGoalId) {
          try {
            await this.plugin.getGoalManager().updateGoal(this.selectedGoalId, { progress: value });
            new Notice('进度已更新');
            this.loadAndRender();
          } catch (error) {
            new Notice('更新失败: ' + (error as Error).message);
          }
        }
      });
    });
    
    // 列表视图添加按钮
    content.querySelector('#al-list-add-goal')?.addEventListener('click', () => this.showCreateGoalModal());
    
    // 画廊视图添加按钮
    content.querySelector('#al-gallery-add-goal')?.addEventListener('click', () => this.showCreateGoalModal());
    
    // 看板列添加按钮（事件委托）
    content.querySelectorAll('.al-add-goal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const prefillLevel = el.getAttribute('data-prefill-level');
        const prefillStatus = el.getAttribute('data-prefill-status');
        if (prefillLevel) {
          this.showCreateGoalModal({ level: parseInt(prefillLevel) });
        } else if (prefillStatus) {
          this.showCreateGoalModal({ status: prefillStatus });
        } else {
          this.showCreateGoalModal();
        }
      });
    });
    
    // 筛选事件
    content.querySelector('#al-toggle-filter-builder')?.addEventListener('click', () => {
      this.tempShowFilterBuilder = !this.tempShowFilterBuilder;
      this.render();
    });
    
    content.querySelector('#al-filter-save')?.addEventListener('click', () => {
      this.updateActiveTabFilters(this.tempFilterConditions, this.tempFilterLogic);
      new Notice('筛选条件已保存');
    });
    
    content.querySelector('#al-filter-clear')?.addEventListener('click', () => {
      this.tempFilterConditions = [];
      this.tempFilterLogic = 'and';
      this.tempShowFilterBuilder = false;
      this.updateActiveTabFilters([], 'and');
      this.render();
    });
    
    content.querySelector('#al-add-filter-condition')?.addEventListener('click', () => {
      this.tempFilterConditions.push({
        id: this.generateFilterId(),
        field: 'A-title',
        operator: 'contains',
        value: ''
      });
      this.render();
    });
    
    // 条件逻辑切换
    content.querySelectorAll('.al-filter-logic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logic = (e.currentTarget as HTMLElement).getAttribute('data-logic') as FilterLogic;
        if (logic) {
          this.tempFilterLogic = logic;
          this.render();
        }
      });
    });
    
    // 字段选择变化
    content.querySelectorAll('.al-filter-field-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).closest('.al-filter-condition')?.getAttribute('data-condition-id');
        if (conditionId) {
          const newField = (e.target as HTMLSelectElement).value;
          this.updateFilterCondition(conditionId, { field: newField });
          this.render();
        }
      });
    });
    
    // 操作符变化
    content.querySelectorAll('.al-filter-operator-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).closest('.al-filter-condition')?.getAttribute('data-condition-id');
        if (conditionId) {
          const newOperator = (e.target as HTMLSelectElement).value as FilterOperator;
          this.updateFilterCondition(conditionId, { operator: newOperator });
          this.render();
        }
      });
    });
    
    // 值输入变化
    content.querySelectorAll('.al-filter-value-input, .al-filter-value-select').forEach(input => {
      input.addEventListener('change', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).getAttribute('data-condition-id');
        if (conditionId) {
          const newValue = (e.target as HTMLInputElement | HTMLSelectElement).value;
          this.updateFilterCondition(conditionId, { value: newValue || null });
        }
      });
    });
    
    // 删除条件
    content.querySelectorAll('.al-filter-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).getAttribute('data-condition-id');
        if (conditionId) {
          this.removeFilterCondition(conditionId);
        }
      });
    });
    
    // Board group by selector
    
    // Task actions
    content.querySelector('#al-complete-task')?.addEventListener('click', async () => { if (this.selectedTaskId) { await this.plugin.getTaskManager().completeTask(this.selectedTaskId); this.loadAndRender(); } });
    content.querySelector('#al-uncomplete-task')?.addEventListener('click', async () => { if (this.selectedTaskId) { await this.plugin.getTaskManager().updateTask(this.selectedTaskId, { status: 'pending' }); this.loadAndRender(); } });
    content.querySelector('#al-delete-task-btn')?.addEventListener('click', async () => { if (this.selectedTaskId && confirm('确定要删除这个任务吗？')) { await this.plugin.getTaskManager().deleteTask(this.selectedTaskId); this.currentView = 'dashboard'; this.selectedTaskId = null; this.loadAndRender(); } });
    
    // Task checkbox clicks
    content.querySelectorAll('.task-list-item-checkbox[data-task-id]').forEach(checkbox => { checkbox.addEventListener('click', async (e) => { e.stopPropagation(); }); checkbox.addEventListener('change', async (e) => { e.stopPropagation(); const taskId = (e.target as HTMLInputElement).getAttribute('data-task-id'); if (taskId) { await this.toggleTaskStatus(taskId); } }); });
    
    // Field settings button
    content.querySelector('#al-open-field-settings')?.addEventListener('click', () => this.showFieldSettingsModal());
    
    // Board drag and drop
    this.bindBoardDragEvents(content);
  }
  
  private bindBoardDragEvents(content: HTMLElement): void {
    // 拖拽目标卡片
    content.querySelectorAll('.al-board-view .al-goal-card').forEach(cardEl => {
      cardEl.addEventListener('mousedown', (e) => {
        const goalId = (cardEl as HTMLElement).getAttribute('data-goal-id');
        if (!goalId) return;
        
        this.startGoalDrag(cardEl as HTMLElement, goalId, e as MouseEvent);
      });
      
      // 点击进入详情页
      cardEl.addEventListener('click', (e) => {
        // 如果正在拖拽，不触发点击
        if (this.draggingGoalId) return;
        
        const goalId = (cardEl as HTMLElement).getAttribute('data-goal-id');
        if (goalId) {
          this.navigateTo('goal-detail', goalId, null);
        }
      });
    });
    
    // 列的放置区域
    content.querySelectorAll('.al-board-column').forEach(columnEl => {
      columnEl.addEventListener('mouseenter', () => {
        if (this.draggingGoalId) {
          this.dropTargetColumn = (columnEl as HTMLElement).getAttribute('data-column-value');
          columnEl.classList.add('drop-target');
        }
      });
      
      columnEl.addEventListener('mouseleave', () => {
        columnEl.classList.remove('drop-target');
        if (this.dropTargetColumn === (columnEl as HTMLElement).getAttribute('data-column-value')) {
          this.dropTargetColumn = null;
        }
      });
    });
    
    // 鼠标移动
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.dragGhost) {
        this.dragGhost.style.left = e.clientX + 'px';
        this.dragGhost.style.top = e.clientY + 'px';
      }
    });
    
    // 鼠标释放
    document.addEventListener('mouseup', () => {
      if (this.draggingGoalId && this.dropTargetColumn) {
        this.handleGoalDrop();
      }
      this.endGoalDrag();
    });
  }
  
  private startGoalDrag(cardEl: HTMLElement, goalId: string, e: MouseEvent): void {
    this.draggingGoalId = goalId;
    this.draggingGoalEl = cardEl;
    
    // 创建拖拽影子
    const rect = cardEl.getBoundingClientRect();
    this.dragGhost = cardEl.cloneNode(true) as HTMLElement;
    this.dragGhost.classList.add('drag-ghost');
    this.dragGhost.style.width = rect.width + 'px';
    this.dragGhost.style.left = e.clientX + 'px';
    this.dragGhost.style.top = e.clientY + 'px';
    document.body.appendChild(this.dragGhost);
    
    // 隐藏原卡片
    cardEl.classList.add('dragging');
  }
  
  private endGoalDrag(): void {
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
    if (this.draggingGoalEl) {
      this.draggingGoalEl.classList.remove('dragging');
      this.draggingGoalEl = null;
    }
    this.draggingGoalId = null;
    this.dropTargetColumn = null;
    
    // 移除所有列的 drop-target 类
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  }
  
  private async handleGoalDrop(): Promise<void> {
    if (!this.draggingGoalId || !this.dropTargetColumn) return;
    
    const goal = this.plugin.getGoalManager().getGoal(this.draggingGoalId);
    if (!goal) return;
    
    const currentFilters = this.getCurrentFilters();
    const columnType = currentFilters.groupBy;
    
    try {
      if (columnType === 'level') {
        // 按层级分组：拖动目标到不同层级列，更新目标层级
        const newLevel = parseInt(this.dropTargetColumn) as GoalLevel;
        if (goal['A-level'] !== newLevel) {
          await this.plugin.getGoalManager().updateGoal(this.draggingGoalId, { level: newLevel });
          new Notice('目标已移动到新层级');
        }
      } else if (columnType === 'goalStatus') {
        // 按状态分组：拖动目标到不同状态列，更新目标状态
        const newStatus = this.dropTargetColumn as 'active' | 'completed' | 'abandoned';
        if (goal['A-status'] !== newStatus) {
          await this.plugin.getGoalManager().updateGoal(this.draggingGoalId, { status: newStatus });
          new Notice('目标状态已更新');
        }
      }
      this.loadAndRender();
    } catch (error) {
      new Notice('更新失败');
    }
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
          this.selectedDay = dateStr;
          this.render();
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
      // 打开文件到新窗格
      await this.plugin.app.workspace.getLeaf(true).openFile(file);
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
      const file = await this.plugin.getNoteManager().getOrCreateWeeklyNote(weekKey);
      await this.plugin.app.workspace.getLeaf(true).openFile(file);
      new Notice(`已打开 ${weekKey} 周记`);
    } catch (error) {
      new Notice('打开周记失败');
    }
  }
  
  private async openMonthlyNoteByDate(yearMonth: string): Promise<void> {
    try {
      const file = await this.plugin.getNoteManager().getOrCreateMonthlyNote(yearMonth);
      await this.plugin.app.workspace.getLeaf(true).openFile(file);
      new Notice(`已打开 ${yearMonth} 月记`);
    } catch (error) {
      new Notice('打开月记失败');
    }
  }
  
  private async openYearlyNoteByDate(year: string): Promise<void> {
    try {
      const file = await this.plugin.getNoteManager().getOrCreateYearlyNote(year);
      await this.plugin.app.workspace.getLeaf(true).openFile(file);
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
  
  // 显示添加视图下拉菜单
  private showAddViewDropdown(e: MouseEvent): void {
    const addBtn = e.currentTarget as HTMLElement;
    const rect = addBtn.getBoundingClientRect();
    
    // 移除已存在的下拉菜单
    const existingDropdown = document.querySelector('.al-add-view-dropdown');
    if (existingDropdown) existingDropdown.remove();
    
    // 创建下拉菜单
    const dropdown = document.createElement('div');
    dropdown.className = 'al-add-view-dropdown show';
    dropdown.innerHTML = `
      <button class="al-add-view-option" data-type="list"><span class="al-tab-icon" data-icon="list"></span><span>列表视图</span></button>
      <button class="al-add-view-option" data-type="board"><span class="al-tab-icon" data-icon="columns"></span><span>看板视图</span></button>
      <button class="al-add-view-option" data-type="gallery"><span class="al-tab-icon" data-icon="gallery-horizontal"></span><span>画廊视图</span></button>
    `;
    
    // 设置位置
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    
    // 添加到 body
    document.body.appendChild(dropdown);
    
    // 设置图标
    setTimeout(() => {
      dropdown.querySelectorAll('.al-tab-icon').forEach(iconEl => {
        const iconName = iconEl.getAttribute('data-icon');
        if (iconName) {
          try {
            setIcon(iconEl as HTMLElement, iconName);
          } catch (e) {}
        }
      });
    }, 0);
    
    // 选项点击
    dropdown.querySelectorAll('.al-add-view-option').forEach(opt => {
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        const type = (opt as HTMLElement).getAttribute('data-type') as ViewTabType;
        if (type) {
          dropdown.remove();
          await this.addTab(type);
        }
      });
    });
    
    // 点击外部关闭
    const closeHandler = (event: MouseEvent) => {
      if (!dropdown.contains(event.target as Node)) {
        dropdown.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 0);
  }
  
  // 显示添加视图弹窗（已废弃，保留兼容性）
  private showAddViewModal(): void {
    const typeOptions = [
      { value: 'list', label: '列表视图', icon: 'list' },
      { value: 'board', label: '看板视图', icon: 'columns' },
      { value: 'gallery', label: '画廊视图', icon: 'gallery-horizontal' }
    ];
    
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box">
        <div class="al-modal-header">
          <span>添加视图</span>
          <button class="al-modal-close">×</button>
        </div>
        <div class="al-modal-body" style="padding:20px">
          <p style="margin:0 0 16px;font-size:13px;color:var(--text-secondary)">选择视图类型：</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${typeOptions.map(opt => `
              <button class="al-add-view-type-btn" data-type="${opt.value}">
                <span class="al-tab-icon" data-icon="${opt.icon}"></span>
                <span>${opt.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    
    // 设置图标
    setTimeout(() => {
      modal.querySelectorAll('.al-tab-icon').forEach(iconEl => {
        const iconName = iconEl.getAttribute('data-icon');
        if (iconName) {
          try {
            setIcon(iconEl as HTMLElement, iconName);
          } catch (e) {}
        }
      });
    }, 0);
    
    // 选择类型后显示名称输入
    modal.querySelectorAll('.al-add-view-type-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = (btn as HTMLElement).getAttribute('data-type') as ViewTabType;
        const name = prompt('请输入视图名称：');
        if (name !== null) {
          await this.addTab(type, name);
        }
        close();
      });
    });
  }
  
  private showCreateGoalModal(prefill?: { level?: number; status?: string }): void {
    const levelOptions = [1, 2, 3, 4].map(level => {
      const labels: Record<number, string> = { 1: '🏆 人生目标', 2: '📅 阶段目标', 3: '📆 年度目标', 4: '⚡ 短期目标' };
      const selected = prefill?.level === level ? 'selected' : (level === 3 && !prefill?.level ? 'selected' : '');
      return `<option value="${level}" ${selected}>${labels[level]}</option>`;
    }).join('');
    
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `<div class="al-modal-bg"></div><div class="al-modal-box"><div class="al-modal-header"><span>🎯 创建目标</span><button class="al-modal-close">×</button></div><form id="al-goal-form"><div class="al-form-item"><label>目标名称</label><input type="text" id="al-goal-title" required placeholder="例如：学习一门新语言"></div><div class="al-form-item"><label>目标层级</label><select id="al-goal-level">${levelOptions}</select></div><div class="al-form-item"><label>截止日期</label><input type="date" id="al-goal-due"></div><div class="al-form-actions"><button type="button" id="al-cancel-goal">取消</button><button type="submit" class="mod-cta">创建</button></div></form></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-goal')?.addEventListener('click', close);
    modal.querySelector('#al-goal-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const title = (modal.querySelector('#al-goal-title') as HTMLInputElement).value.trim(); const level = Number((modal.querySelector('#al-goal-level') as HTMLSelectElement).value) as GoalLevel; const due = (modal.querySelector('#al-goal-due') as HTMLInputElement).value || null; if (!title) { new Notice('请输入目标名称'); return; } try { await this.plugin.getGoalManager().createGoal({ title, level, due }); new Notice('目标创建成功！'); close(); this.loadAndRender(); } catch (error) { new Notice('创建失败: ' + (error as Error).message); } });
    
    // 自动聚焦到标题输入框
    setTimeout(() => (modal.querySelector('#al-goal-title') as HTMLInputElement)?.focus(), 100);
  }
  
  private showTaskDetailModal(taskId: string): void {
    const task = this.getTask(taskId);
    if (!task) { new Notice('任务不存在'); return; }
    
    const allGoals = this.plugin.getGoalManager().getAllGoals();
    const goalOptions = allGoals.map(goal => `<option value="${goal['A-id']}" ${goal['A-id'] === task['A-goal'] ? 'selected' : ''}>${goal['A-title']}</option>`).join('');
    const priorityOptions = [1, 2, 3, 4, 5].map(p => `<option value="${p}" ${p === task['A-priority'] ? 'selected' : ''}>${['🔴 最高', '🟠 高', '🟡 中', '🟢 低', '⚪ 最低'][p - 1]}</option>`).join('');
    const statusOptions = ['pending', 'in-progress', 'completed', 'cancelled'].map(s => `<option value="${s}" ${s === task['A-status'] ? 'selected' : ''}>${['待办', '进行中', '已完成', '已取消'][['pending', 'in-progress', 'completed', 'cancelled'].indexOf(s)]}</option>`).join('');
    
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box al-modal-task-detail">
        <div class="al-modal-header">
          <span>📋 任务详情</span>
          <button class="al-modal-close">×</button>
        </div>
        <div class="al-modal-body">
          <div class="al-task-detail-title">
            <input type="text" id="al-task-detail-title" value="${task['A-title']}" placeholder="任务名称">
          </div>
          <div class="al-task-detail-fields">
            <div class="al-task-detail-field">
              <label>📊 状态</label>
              <select id="al-task-detail-status">${statusOptions}</select>
            </div>
            <div class="al-task-detail-field">
              <label>⭐ 优先级</label>
              <select id="al-task-detail-priority">${priorityOptions}</select>
            </div>
            <div class="al-task-detail-field">
              <label>📅 开始时间</label>
              <input type="date" id="al-task-detail-start" value="${task['A-start'] || ''}">
            </div>
            <div class="al-task-detail-field">
              <label>⏰ 截止时间</label>
              <input type="date" id="al-task-detail-due" value="${task['A-due'] || ''}">
            </div>
            <div class="al-task-detail-field">
              <label>🎯 关联目标</label>
              <select id="al-task-detail-goal"><option value="">无</option>${goalOptions}</select>
            </div>
          </div>
          <div class="al-task-detail-desc-section">
            <label>📝 任务描述</label>
            <textarea id="al-task-detail-description" placeholder="添加任务描述...">${task['A-description'] || ''}</textarea>
          </div>
        </div>
        <div class="al-modal-footer">
          <button type="button" class="al-btn-danger" id="al-task-detail-delete">🗑️ 删除</button>
          <button type="button" class="al-btn-secondary" id="al-task-detail-cancel">取消</button>
          <button type="button" class="mod-cta" id="al-task-detail-save">💾 保存</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-task-detail-cancel')?.addEventListener('click', close);
    
    modal.querySelector('#al-task-detail-delete')?.addEventListener('click', async () => {
      if (confirm('确定要删除这个任务吗？')) {
        try {
          await this.plugin.getTaskManager().deleteTask(taskId);
          new Notice('任务已删除');
          close();
          this.loadAndRender();
        } catch (error) {
          new Notice('删除失败: ' + (error as Error).message);
        }
      }
    });
    
    modal.querySelector('#al-task-detail-save')?.addEventListener('click', async () => {
      const title = (modal.querySelector('#al-task-detail-title') as HTMLInputElement).value.trim();
      const status = (modal.querySelector('#al-task-detail-status') as HTMLSelectElement).value as TaskStatus;
      const priority = Number((modal.querySelector('#al-task-detail-priority') as HTMLSelectElement).value) as TaskPriority;
      const start = (modal.querySelector('#al-task-detail-start') as HTMLInputElement).value || null;
      const due = (modal.querySelector('#al-task-detail-due') as HTMLInputElement).value || null;
      const goal = (modal.querySelector('#al-task-detail-goal') as HTMLSelectElement).value || null;
      const description = (modal.querySelector('#al-task-detail-description') as HTMLTextAreaElement).value.trim() || null;
      
      if (!title) { new Notice('请输入任务名称'); return; }
      
      try {
        await this.plugin.getTaskManager().updateTask(taskId, { title, status, priority, start, due, goal, description });
        new Notice('任务已保存');
        close();
        this.loadAndRender();
      } catch (error) {
        new Notice('保存失败: ' + (error as Error).message);
      }
    });
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
  
  private startFieldEdit(row: HTMLElement, field: string, fieldType: string, currentValue: string): void {
    const editableEl = row.querySelector('.al-field-editable');
    if (!editableEl) return;
    
    let inputEl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    if (fieldType === 'select') {
      inputEl = document.createElement('select');
      inputEl.className = 'al-field-edit-select';
      if (field === 'level') {
        inputEl.innerHTML = '<option value="1">人生</option><option value="2">阶段</option><option value="3">年度</option><option value="4">短期</option>';
      } else if (field === 'status') {
        inputEl.innerHTML = '<option value="active">进行中</option><option value="completed">已完成</option><option value="abandoned">已放弃</option>';
      }
      inputEl.value = currentValue;
    } else if (fieldType === 'date') {
      inputEl = document.createElement('input');
      inputEl.type = 'date';
      inputEl.className = 'al-field-edit-input';
      inputEl.value = currentValue || '';
    } else if (fieldType === 'number') {
      inputEl = document.createElement('input');
      inputEl.type = 'number';
      inputEl.className = 'al-field-edit-input';
      inputEl.value = field === 'progress' ? currentValue.replace('%', '') : currentValue;
      if (field === 'progress') {
        inputEl.min = '0';
        inputEl.max = '100';
      }
      if (field === 'weight') {
        inputEl.min = '1';
        inputEl.max = '10';
      }
    } else if (fieldType === 'textarea') {
      inputEl = document.createElement('textarea');
      inputEl.className = 'al-field-edit-textarea';
      inputEl.rows = 3;
      inputEl.value = currentValue === '添加描述' ? '' : currentValue;
    } else {
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = 'al-field-edit-input';
      inputEl.value = currentValue;
    }
    
    editableEl.replaceWith(inputEl);
    
    const saveEdit = async () => {
      let saveValue: string | null = '';
      if (inputEl instanceof HTMLTextAreaElement) {
        saveValue = inputEl.value.trim() || null;
      } else {
        saveValue = inputEl.value;
      }
      
      try {
        const updateData: Record<string, unknown> = {};
        if (field === 'progress') {
          updateData[field] = parseInt(saveValue || '0') || 0;
        } else if (field === 'weight') {
          updateData[field] = parseInt(saveValue || '1') || 1;
        } else if (field === 'level') {
          updateData[field] = parseInt(saveValue || '3') || 3;
        } else {
          updateData[field] = saveValue;
        }
        
        await this.plugin.getGoalManager().updateGoal(this.selectedGoalId!, updateData);
        new Notice('更新成功');
        this.loadAndRender();
      } catch (error) {
        new Notice('更新失败: ' + (error as Error).message);
        this.loadAndRender();
      }
    };
    
    inputEl.addEventListener('blur', saveEdit);
    inputEl.addEventListener('keydown', (e) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' && fieldType !== 'textarea') {
        event.preventDefault();
        saveEdit();
      }
      if (event.key === 'Escape') {
        this.loadAndRender();
      }
    });
    
    inputEl.focus();
  }
  
  private async openTodayNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateTodayNote(); new Notice('今日日记已打开'); } catch (error) { new Notice('打开日记失败'); } }
  private async openWeeklyNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateWeeklyNote(this.plugin.getNoteManager().getCurrentWeekKey()); new Notice('本周周记已打开'); } catch (error) { new Notice('打开周记失败'); } }
  private async openMonthlyNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateMonthlyNote(this.plugin.getNoteManager().getCurrentYearMonth()); new Notice('本月月记已打开'); } catch (error) { new Notice('打开月记失败'); } }
  
  private removeStyles(): void { const oldStyle = document.getElementById('al-dashboard-styles'); if (oldStyle) oldStyle.remove(); }
  
  private async setTabIcons(): Promise<void> {
    const icons = this.contentEl.querySelectorAll('.al-tab-icon');
    for (const iconEl of icons) {
      const iconName = iconEl.getAttribute('data-icon');
      if (iconName) {
        try {
          setIcon(iconEl as HTMLElement, iconName);
        } catch (e) {
          // 忽略错误
        }
      }
    }
  }
  
  private addStyles(): void {
    this.removeStyles();
    const style = document.createElement('style');
    style.id = 'al-dashboard-styles';
    style.textContent = `
      .al-dashboard{padding:0;height:100%;display:flex;flex-direction:column;overflow:hidden}.al-page{display:flex;flex-direction:column;height:100%;overflow:hidden}.al-header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--border-color);flex-shrink:0}.al-header-left{display:flex;flex-direction:column;gap:2px}.al-title{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:600;color:var(--text-primary)}.al-date{font-size:12px;color:var(--text-secondary)}.al-header-actions{display:flex;gap:8px}.al-header-actions button{display:inline-flex;align-items:center;gap:4px}.al-view-tabs{display:flex;gap:4px;padding:8px 24px;background:var(--background-primary);border-bottom:1px solid var(--border-color);flex-shrink:0;overflow-x:auto;position:relative;z-index:999}.al-view-tab{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:13px;transition:all .15s;position:relative;white-space:nowrap}.al-view-tab:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-view-tab.active{background:var(--interactive-accent);color:#fff}.al-tab-name{margin-right:4px}.al-tab-name-edit{border:1px solid var(--interactive-accent);border-radius:4px;padding:4px 8px;background:var(--background-primary);color:var(--text-primary);font-size:13px;outline:none;min-width:60px;max-width:150px;box-shadow:0 0 0 2px color-mix(in srgb,var(--interactive-accent) 30%,transparent)}.al-tab-context-menu{display:none;position:fixed;top:0;left:0;background:var(--background-primary);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.25);z-index:100000;min-width:160px;padding:4px}.al-tab-context-menu.show{display:block}.al-tab-context-option{display:flex;align-items:center;gap:10px;width:100%;padding:6px 12px;border:none;background:transparent;color:var(--text-primary);cursor:pointer;font-size:13px;text-align:left;border-radius:4px;line-height:1.5}.al-tab-context-option:hover{background:var(--background-modifier-hover)}.al-tab-context-option .al-tab-icon{width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);flex-shrink:0}.al-tab-context-option:hover .al-tab-icon{color:var(--text-primary)}.al-view-tab-add{padding:8px 12px;opacity:0.6;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center}.al-view-tab-add:hover{opacity:1;background:var(--background-modifier-hover);color:var(--text-primary)}.al-add-view-dropdown{display:none;position:fixed;top:0;left:0;background:var(--background-primary);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.25);z-index:100000;min-width:160px;padding:4px}.al-add-view-dropdown.show{display:block}.al-add-view-option{display:flex;align-items:center;gap:10px;width:100%;padding:6px 12px;border:none;background:transparent;color:var(--text-primary);cursor:pointer;font-size:13px;text-align:left;border-radius:4px;line-height:1.5}.al-add-view-option:hover{background:var(--background-modifier-hover)}.al-add-view-option .al-tab-icon{width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);flex-shrink:0}.al-add-view-option:hover .al-tab-icon{color:var(--text-primary)}.al-tab-icon{width:16px;height:16px;display:flex;align-items:center;justify-content:center}.al-tab-icon svg{width:16px;height:16px}.al-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden}.al-main{padding:16px 24px;gap:16px;overflow-y:auto}.al-main-full{padding:16px 24px;gap:16px;overflow-y:auto}
      .al-detail-view{flex:1;display:flex;flex-direction:column;overflow:hidden}.al-detail-header{display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--background-secondary);border-bottom:1px solid var(--border-color);flex-shrink:0}.al-detail-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;color:var(--text-secondary);transition:all .15s}.al-detail-icon:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-detail-title{display:flex;align-items:center;gap:12px;flex:1}.al-detail-title h2{font-size:20px;font-weight:600;color:var(--text-primary);margin:0}.al-detail-content{flex:1;display:flex;overflow:hidden}.al-detail-main{flex:1;padding:24px;overflow-y:auto}.al-detail-section{margin-bottom:24px}.al-detail-section h3{font-size:14px;font-weight:600;color:var(--text-secondary);margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border-color)}.al-detail-progress-section{margin-bottom:20px;padding:16px;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color)}.al-detail-progress-label{font-size:13px;color:var(--text-secondary);margin-bottom:8px}.al-detail-progress-large{display:flex;align-items:center;gap:12px}.al-progress-bar-large{flex:1;height:12px;background:var(--background-modifier-border);border-radius:6px;overflow:hidden}.al-progress-fill-large{height:100%;background:var(--interactive-accent);border-radius:6px;transition:width .3s}.al-detail-progress-value{font-size:16px;font-weight:700;color:var(--text-primary);min-width:48px;text-align:right}.al-detail-description-section{margin-bottom:20px}.al-detail-action-row{display:flex;align-items:center;gap:10px;padding:12px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-detail-action-row:hover{border-color:var(--interactive-accent);background:var(--background-modifier-hover)}.al-detail-action-row-add{background:color-mix(in srgb,var(--interactive-accent) 10%,transparent);border-color:var(--interactive-accent);border-style:dashed}.al-detail-action-row-add:hover{background:color-mix(in srgb,var(--interactive-accent) 15%,transparent);border-style:solid}.al-detail-action-icon{font-size:18px}.al-detail-action-text{font-size:14px;color:var(--text-secondary);flex:1;text-align:left}.al-detail-stats{display:flex;gap:16px}.al-detail-stat{flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color)}.al-detail-stat-num{font-size:28px;font-weight:700;color:var(--text-primary)}.al-detail-stat-label{font-size:12px;color:var(--text-secondary);margin-top:4px}.al-detail-stat-success .al-detail-stat-num{color:var(--text-green)}.al-detail-tasks{display:flex;flex-direction:column;gap:8px}.al-detail-task{display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-detail-task:hover{border-color:var(--interactive-accent)}.al-detail-task-content{flex:1}.al-detail-task-title{font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:4px}.al-detail-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-detail-task-meta{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary)}.al-action-btn-success{background:var(--text-green);color:#fff;border:none;border-radius:6px;cursor:pointer}.al-action-btn-danger{background:transparent;color:var(--text-red);border:1px solid var(--text-red);border-radius:6px;cursor:pointer}.al-task-actions{display:flex;flex-direction:column;gap:8px}.al-task-goal-card{padding:16px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-task-goal-card:hover{border-color:var(--interactive-accent)}.al-task-goal-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}.al-task-goal-progress{display:flex;align-items:center;gap:8px}.al-task-goal-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-task-goal-progress .al-progress-fill{height:100%;background:var(--interactive-accent)}.al-task-goal-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}
      .al-table-view{flex:1;padding:16px;overflow:auto}.al-table-empty{display:flex;justify-content:center;align-items:center;height:100%}.al-table{width:100%;border-collapse:collapse;background:var(--background-secondary);border-radius:10px;overflow:hidden}.al-table th{text-align:left;padding:12px 16px;background:var(--background-primary);border-bottom:1px solid var(--border-color);font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px}.al-table td{padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:13px;color:var(--text-primary)}.al-table-row:hover{background:var(--background-modifier-hover);cursor:pointer}.al-table-row.completed td{color:var(--text-muted)}.al-table-row.completed .al-table-title{text-decoration:line-through}.al-table-title{font-weight:600}.al-goal-tag{font-weight:500;font-size:12px;cursor:pointer}.al-goal-tag:hover{text-decoration:underline}.al-status-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500}.al-status-badge.status-pending,.al-status-badge.status-active{background:var(--interactive-accent);color:#fff}.al-status-badge.status-in-progress{background:color-mix(in srgb,var(--text-blue) 20%,transparent);color:var(--text-blue)}.al-status-badge.status-completed{background:color-mix(in srgb,var(--text-green) 20%,transparent);color:var(--text-green)}.al-status-badge.status-abandoned,.al-status-badge.status-cancelled{background:var(--background-modifier-border);color:var(--text-muted)}.al-level-dot{width:10px;height:10px;border-radius:50%;display:inline-block}.al-progress-text{font-weight:500}
      .al-board-group-label{font-size:12px;color:var(--text-secondary)}.al-board-view{display:flex;flex-direction:row;flex:1;gap:12px;padding:16px;overflow-x:auto;min-height:0;background:var(--background-primary);align-items:stretch}.al-board-empty{display:flex;justify-content:center;align-items:center;width:100%}.al-board-column{flex:0 0 260px;display:flex;flex-direction:column;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);overflow:hidden;max-height:100%}.al-board-column-header{display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:2px solid var(--column-accent,var(--interactive-accent));background:var(--background-primary);flex-shrink:0}.al-board-column-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-primary);overflow:visible;flex-wrap:wrap;white-space:nowrap}.al-board-column-body{flex:1;padding:8px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:150px}.al-level-badge{font-size:12px;padding:3px 10px;border-radius:6px;color:#fff;font-weight:600;white-space:nowrap}.al-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.al-goal-card{padding:14px;background:var(--background-primary);border-radius:8px;border:1px solid var(--border-color);cursor:grab;transition:all .15s;margin-bottom:8px}.al-goal-card:hover{border-color:var(--interactive-accent);box-shadow:0 2px 8px rgba(0,0,0,0.1)}.al-goal-card-title{font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:10px;line-height:1.3}.al-goal-card-progress{display:flex;align-items:center;gap:8px;margin-bottom:10px}.al-goal-card-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-goal-card-progress .al-progress-fill{height:100%;background:var(--interactive-accent)}.al-goal-card-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}.al-goal-card-meta{display:flex;gap:12px;font-size:12px;color:var(--text-muted)}.al-goal-card.dragging{opacity:0.3;cursor:grabbing}.drag-ghost{position:fixed;z-index:9999;pointer-events:none;opacity:0.9;transform:rotate(2deg);box-shadow:0 8px 24px rgba(0,0,0,0.2)}.al-board-column.drop-target{border:2px dashed var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 10%,transparent)}
      .al-gallery-view{flex:1;padding:16px;overflow-y:auto}.al-gallery-empty{display:flex;justify-content:center;align-items:center;height:100%}.al-gallery-section{margin-bottom:24px}.al-gallery-section-title{font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color)}.al-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.al-gallery-card{position:relative;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);padding:16px;transition:all .2s;cursor:pointer}.al-gallery-card:hover{border-color:var(--interactive-accent);box-shadow:0 4px 12px rgba(0,0,0,.1);transform:translateY(-2px)}.al-gallery-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.al-gallery-card-title{font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:12px;line-height:1.4}.al-gallery-card-progress{display:flex;align-items:center;gap:8px;margin-bottom:8px}.al-gallery-card-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-gallery-card-progress .al-progress-fill{height:100%;background:var(--interactive-accent);border-radius:3px}.al-gallery-card-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}.al-gallery-card-meta{font-size:11px;color:var(--text-secondary)}.al-gallery-card-tasks{margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);font-size:12px;color:var(--text-secondary)}
      .al-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin:16px 0}.al-stat{flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:20px 16px;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color)}.al-stat-warning{border-color:var(--text-red);background:color-mix(in srgb,var(--text-red) 5%,var(--background-secondary))}.al-stat-num{font-size:32px;font-weight:700;color:var(--text-primary);line-height:1}.al-stat-label{font-size:12px;color:var(--text-secondary);margin-top:8px}
      .al-panel{flex-shrink:0;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);overflow:hidden;margin:16px 0}.al-panel-overdue{border-color:var(--text-red);background:color-mix(in srgb,var(--text-red) 3%,var(--background-secondary))}.al-panel-header{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--border-color);background:var(--background-primary);flex-shrink:0}.al-panel-header span:first-child{font-size:16px}.al-panel-header span:nth-child(2){font-size:14px;font-weight:500;color:var(--text-primary)}.al-panel-count{margin-left:auto;font-size:12px;padding:2px 8px;background:var(--background-secondary);color:var(--text-secondary);border-radius:10px}.al-count-overdue{background:color-mix(in srgb,var(--text-red) 15%,transparent);color:var(--text-red)}.al-panel-body{max-height:300px;padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}
      .al-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;gap:8px;color:var(--text-secondary)}.al-empty span{font-size:40px;opacity:.5}.al-empty-desc{font-size:12px;color:var(--text-muted)}
      .al-goal{padding:12px;background:var(--background-primary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-goal:hover{border-color:var(--interactive-accent)}.al-goal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.al-goal-level{font-size:11px;padding:2px 6px;border-radius:4px;background:var(--interactive-accent);color:#fff}.al-goal-level[data-level="1"]{background:var(--text-purple)}.al-goal-level[data-level="2"]{background:var(--text-blue)}.al-goal-level[data-level="3"]{background:var(--interactive-accent)}.al-goal-level[data-level="4"]{background:var(--text-green)}.al-goal-status{font-size:10px;padding:2px 6px;border-radius:4px;background:var(--text-green);color:#fff}.al-goal-status.completed{background:var(--text-muted)}.al-goal-title{font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:8px}.al-goal-progress{display:flex;align-items:center;gap:8px}.al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-progress-fill{height:100%;background:var(--interactive-accent);border-radius:3px;transition:width .3s}
      .al-task{display:flex;align-items:flex-start;gap:10px;padding:12px;background:var(--background-primary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:background .15s;margin-bottom:8px}.al-task:last-child{margin-bottom:0}.al-task:hover{background:var(--background-modifier-hover)}.al-task-check{width:18px;height:18px;border:2px solid var(--border-color);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;flex-shrink:0;margin-top:3px;cursor:pointer}.al-task-check.checked{background:var(--text-green);border-color:var(--text-green)}.al-task-content{flex:1;min-width:0}.al-task-title{font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px;line-height:1.3}.al-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-task-meta{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--text-secondary)}.al-field-row{display:flex;align-items:center;gap:8px}.al-field-label{color:var(--text-muted);min-width:32px}.al-field-value{color:var(--text-primary)}.al-task-due{color:var(--text-red)}
      .al-quick-btn{display:flex;align-items:center;gap:8px;padding:10px 12px;width:100%;text-align:left}.al-quick-btn span:first-child{font-size:18px}.al-quick-btn span:last-child{font-size:13px;color:var(--text-secondary)}
      .al-modal{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;display:flex;align-items:center;justify-content:center}.al-modal-bg{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5)}.al-modal-box{position:relative;background:var(--background-primary);border-radius:12px;width:90%;max-width:420px;max-height:90vh;border:1px solid var(--border-color);box-shadow:0 10px 40px rgba(0,0,0,.3);overflow:hidden;display:flex;flex-direction:column}.al-modal-header{flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-color);font-size:16px;font-weight:600;color:var(--text-primary)}.al-modal-close{background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-secondary);line-height:1}#al-goal-form,#al-task-form{padding:20px;overflow-y:auto;flex:1}#al-goal-form select,#al-task-form select{height:auto;padding:10px 12px}.al-form-item{margin-bottom:16px}.al-form-item label{display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:var(--text-secondary)}.al-form-item input,.al-form-item select{width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;font-size:14px;background:var(--background-secondary);color:var(--text-primary);box-sizing:border-box}.al-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px;flex-shrink:0}.al-view-spacer{flex:1}.al-field-settings-modal{max-width:480px}.al-field-settings-modal .al-modal-body{padding:20px}.al-field-settings-desc{font-size:13px;color:var(--text-secondary);margin:0 0 16px}.al-field-toggles{display:flex;flex-wrap:wrap;gap:8px}.al-field-toggle-btn{padding:8px 14px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-primary);cursor:pointer;font-size:13px;transition:all .15s}.al-field-toggle-btn:hover{border-color:var(--interactive-accent)}.al-field-toggle-btn.selected{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-modal-footer{display:flex;justify-content:flex-end;gap:10px;padding:16px 20px;border-top:1px solid var(--border-color)}.al-btn{padding:8px 16px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-primary);cursor:pointer;font-size:13px}.al-btn:hover{background:var(--background-modifier-hover)}
      @media(max-width:800px){.al-body{flex-direction:column}.al-sidebar{width:100%;max-width:none;border-left:none;border-top:1px solid var(--border-color);padding:16px}.al-header-actions{flex-wrap:wrap;gap:6px}.al-header-actions button{min-width:80px}.al-board-column{flex:0 0 220px}.al-detail-content{flex-direction:column}.al-detail-sidebar{width:100%;border-left:none;border-top:1px solid var(--border-color)}}
      @media(max-width:640px){.al-header{flex-direction:column;align-items:flex-start;gap:12px;padding:12px 16px}.al-view-tabs{padding:8px 12px;overflow-x:auto}.al-view-tab{padding:6px 12px;font-size:12px}.al-header-actions{width:100%;justify-content:stretch}.al-header-actions button{flex:1;min-width:0;justify-content:center;gap:4px;font-size:11px}.al-main{padding:12px;gap:12px}.al-stats{grid-template-columns:repeat(2,1fr);gap:8px}.al-stat{padding:12px}.al-stat-num{font-size:24px}.al-detail-header{flex-wrap:wrap;padding:12px 16px}.al-detail-title h2{font-size:16px}.al-detail-main{padding:16px}.al-detail-stats{flex-wrap:wrap}.al-detail-stat{min-width:80px}.al-board-view{padding:8px;gap:8px}.al-board-column{flex:0 0 180px}.al-gallery-view{padding:12px}.al-gallery-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}.al-gallery-card{padding:12px}.al-gallery-card-title{font-size:13px}}
      .al-calendar-body{padding:0}.al-calendar-modes{display:flex;gap:4px;padding:8px;border-bottom:1px solid var(--border-color)}.al-calendar-mode-btn{padding:4px 10px;border:1px solid var(--border-color);border-radius:4px;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:12px;transition:all .15s}.al-calendar-mode-btn:hover{color:var(--text-primary);border-color:var(--interactive-accent)}.al-calendar-mode-btn.active{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-calendar-content{padding:8px;min-width:280px;overflow-x:auto}.al-calendar-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.al-calendar-nav button{background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:4px 8px;border-radius:4px}.al-calendar-nav button:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-calendar-title{font-size:13px;font-weight:500;color:var(--text-primary)}
      .al-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;min-width:280px}.al-cal-day-header{font-size:11px;color:var(--text-secondary);padding:4px}.al-cal-day{font-size:12px;padding:6px;border-radius:4px;cursor:pointer;transition:all .15s;color:var(--text-primary)}.al-cal-day:hover{background:var(--background-modifier-hover)}.al-cal-day.empty{background:transparent;cursor:default}.al-cal-day.today{background:var(--interactive-accent);color:#fff}.al-cal-day.day-selected{background:var(--interactive-accent-faint,color-mix(in srgb,var(--interactive-accent) 20%,transparent));border:1px solid var(--interactive-accent)}.al-cal-day.today.day-selected{background:var(--interactive-accent);color:#fff}.al-cal-day.week-selected{background:var(--interactive-accent-faint,color-mix(in srgb,var(--interactive-accent) 20%,transparent));border:1px solid var(--interactive-accent)}.al-cal-day.today.week-selected{background:var(--interactive-accent);color:#fff}
      .al-cal-month-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;min-width:200px}.al-cal-month-item{padding:10px;text-align:center;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;font-size:12px;color:var(--text-secondary);transition:all .15s}.al-cal-month-item:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-cal-month-item.current{border-color:var(--interactive-accent);background:var(--interactive-accent);color:#fff}.al-cal-month-item.selected{border-color:var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 20%,transparent);color:var(--interactive-accent);font-weight:600}
      .al-cal-year-display{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 0;min-width:200px}.al-cal-year-item{padding:16px 8px;text-align:center;border-radius:8px;border:1px solid var(--border-color);cursor:pointer;font-size:16px;font-weight:600;color:var(--text-secondary);transition:all .15s}.al-cal-year-item:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-cal-year-item.current{font-size:20px;border-color:var(--interactive-accent);background:var(--interactive-accent);color:#fff}.al-cal-year-item.selected{border-color:var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 20%,transparent);color:var(--interactive-accent)}
      .al-filter-bar{display:flex;gap:10px;padding:10px 16px;background:var(--background-secondary);border-bottom:1px solid var(--border-color);align-items:center;flex-wrap:wrap}.al-filter-toggle{padding:6px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-toggle:hover{border-color:var(--interactive-accent)}.al-filter-toggle.active{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-filter-btn{padding:6px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-btn:hover{border-color:var(--interactive-accent)}.al-filter-btn-danger{color:var(--text-red);border-color:var(--text-red)}.al-filter-btn-danger:hover{background:color-mix(in srgb,var(--text-red) 10%,transparent)}.al-filter-count{padding:4px 10px;background:var(--interactive-accent);color:#fff;border-radius:10px;font-size:11px}.al-filter-spacer{flex:1}.al-filter-settings-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-secondary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-settings-btn:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-board-group-inline{display:flex;align-items:center;gap:6px}.al-filter-select{padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer}
      .al-filter-builder{padding:12px 16px;background:var(--background-primary);border-bottom:1px solid var(--border-color)}.al-filter-logic-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}.al-filter-logic-label{font-size:12px;color:var(--text-secondary)}.al-filter-logic-btn{padding:4px 10px;border:1px solid var(--border-color);border-radius:4px;background:transparent;color:var(--text-secondary);font-size:11px;cursor:pointer;transition:all .15s}.al-filter-logic-btn:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-filter-logic-btn.active{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-filter-conditions{display:flex;flex-direction:column;gap:8px}.al-filter-condition{display:flex;align-items:center;gap:8px;padding:8px;background:var(--background-secondary);border-radius:6px;border:1px solid var(--border-color)}.al-filter-field-select,.al-filter-operator-select,.al-filter-value-select{padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer}.al-filter-field-select:hover,.al-filter-operator-select:hover,.al-filter-value-select:hover{border-color:var(--interactive-accent)}.al-filter-value-input{padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;background:var(--background-primary);color:var(--text-primary);font-size:12px;min-width:120px}.al-filter-value-input:hover{border-color:var(--interactive-accent)}.al-filter-value-input:focus{outline:none;border-color:var(--interactive-accent)}.al-filter-date-input{min-width:140px}.al-filter-no-value{padding:6px 8px;color:var(--text-muted);font-size:12px}.al-filter-remove-btn{width:24px;height:24px;border:none;border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;margin-left:auto}.al-filter-remove-btn:hover{background:color-mix(in srgb,var(--text-red) 10%,transparent);color:var(--text-red)}.al-filter-add-btn{width:100%;padding:8px;margin-top:8px;border:1px dashed var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-add-btn:hover{border-color:var(--interactive-accent);color:var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 5%,transparent)}
      .al-board-column-footer{padding:8px;border-top:1px dashed var(--border-color)}.al-add-goal-btn{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px;border:1px dashed var(--border-color);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:12px;transition:all .15s}.al-add-goal-btn:hover{border-color:var(--interactive-accent);color:var(--interactive-accent);background:var(--background-modifier-hover)}
      .al-add-goal-link{display:block;padding:12px 16px;color:var(--text-muted);cursor:pointer;text-align:center;border-top:1px solid var(--border-color);font-size:13px;transition:all .15s}.al-add-goal-link:hover{color:var(--text-normal);background:var(--background-secondary)}
      .al-detail-fields{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-field-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:14px}.al-field-row:last-child{border-bottom:none}.al-field-row:hover{background:var(--background-modifier-hover)}.al-field-icon{font-size:16px;flex-shrink:0}.al-field-label{color:var(--text-secondary);min-width:80px;flex-shrink:0}.al-field-value{color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-field-editable{cursor:pointer;color:var(--text-muted)}.al-field-editable:hover{color:var(--text-primary)}.al-field-link{color:var(--interactive-accent);cursor:pointer;text-decoration:underline}.al-field-progress{display:flex;align-items:center;gap:8px;flex:1}.al-progress-bar-small{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden;max-width:150px}.al-progress-fill-small{height:100%;background:var(--interactive-accent);border-radius:3px}.al-field-progress-value{font-size:13px;font-weight:600;color:var(--text-primary);min-width:40px}
      .al-field-edit-input,.al-field-edit-select,.al-field-edit-textarea{flex:1;padding:6px 10px;border:1px solid var(--interactive-accent);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px;outline:none;box-sizing:border-box}.al-field-edit-select{max-width:150px}.al-field-edit-textarea{min-height:60px;resize:vertical}
      .al-detail-description-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-detail-description-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color)}.al-detail-description-icon{font-size:16px}.al-detail-description-title{font-size:13px;font-weight:600;color:var(--text-secondary)}.al-detail-description-content{padding:16px;color:var(--text-muted);font-size:14px;line-height:1.6;cursor:pointer;min-height:60px}.al-detail-description-content:hover{color:var(--text-primary)}.al-detail-description-block .al-field-edit-textarea{width:100%;max-width:none}
      .al-progress-slider-container{display:flex;align-items:center;gap:12px;width:100%;max-width:280px}.al-progress-slider{-webkit-appearance:none;width:100%;height:6px;border-radius:3px;background:var(--background-modifier-border);outline:none}.al-progress-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--interactive-accent);cursor:pointer;border:2px solid var(--background-primary);box-shadow:0 2px 4px rgba(0,0,0,0.2)}.al-progress-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--interactive-accent);cursor:pointer;border:2px solid var(--background-primary);box-shadow:0 2px 4px rgba(0,0,0,0.2)}.al-progress-value{font-size:14px;font-weight:500;color:var(--text-primary);min-width:40px;text-align:right}
      .al-detail-tasks-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-detail-tasks-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color)}.al-detail-tasks-icon{font-size:16px}.al-detail-tasks-title{font-size:13px;font-weight:600;color:var(--text-secondary);flex:1}.al-detail-tasks-count{background:var(--interactive-accent);color:#fff;font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px}.al-detail-task-summary{display:flex;gap:20px;padding:10px 16px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border-color)}.al-detail-tasks{display:flex;flex-direction:column;gap:2px;padding:8px 16px}.al-detail-task{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:all .15s}.al-detail-task:hover{background:var(--background-modifier-hover)}.al-detail-task .task-list-item-checkbox{margin:0 8px 0 0;width:16px;height:16px;cursor:pointer;vertical-align:middle}.al-detail-tasks-empty{text-align:center;padding:20px;color:var(--text-muted);font-size:14px}.al-detail-task-title{flex:1;font-size:14px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-detail-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-detail-task-priority{font-size:13px;font-weight:500;flex-shrink:0;min-width:50px;text-align:right}
      .al-gallery-add-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:120px;border:1px dashed var(--border-color);border-radius:10px;color:var(--text-muted);cursor:pointer;transition:all .15s}.al-gallery-add-card:hover{border-color:var(--interactive-accent);color:var(--interactive-accent);background:var(--background-secondary)}.al-gallery-add-card .al-gallery-add-icon{font-size:28px;opacity:.5}.al-gallery-add-card:hover .al-gallery-add-icon{opacity:1}
      .al-modal-task-detail .al-modal-box{max-width:500px;width:90%}.al-modal-task-detail .al-modal-body{padding:20px;max-height:70vh;overflow-y:auto}.al-task-detail-title input{width:100%;font-size:18px;font-weight:600;border:1px solid var(--border-color);border-radius:6px;padding:12px;background:var(--background-primary);color:var(--text-primary);box-sizing:border-box}.al-task-detail-title input:focus{outline:none;border-color:var(--interactive-accent)}.al-task-detail-fields{display:flex;flex-direction:column;gap:12px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)}.al-task-detail-field{display:flex;align-items:center;gap:12px}.al-task-detail-field label{width:100px;flex-shrink:0;font-size:14px;color:var(--text-secondary)}.al-task-detail-field select,.al-task-detail-field input{flex:1;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px}.al-task-detail-field select:focus,.al-task-detail-field input:focus{outline:none;border-color:var(--interactive-accent)}.al-task-detail-desc-section{margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)}.al-task-detail-desc-section label{display:block;font-size:14px;color:var(--text-secondary);margin-bottom:8px}.al-task-detail-desc-section textarea{width:100%;min-height:100px;padding:12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px;resize:vertical;box-sizing:border-box}.al-task-detail-desc-section textarea:focus{outline:none;border-color:var(--interactive-accent)}.al-modal-footer{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-top:1px solid var(--border-color);background:var(--background-secondary)}.al-modal-footer .al-btn-danger{background:transparent;border:1px solid var(--text-red);color:var(--text-red);padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px}.al-modal-footer .al-btn-danger:hover{background:var(--text-red);color:#fff}.al-modal-footer .al-btn-secondary{background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px}.al-modal-footer .al-btn-secondary:hover{background:var(--background-modifier-hover)}
      `;
    document.head.appendChild(style);
  }
}
