/**
 * Dashboard View - Clean Layout Version with View Switching
 *
 * 主视图类。已将渲染/筛选/弹窗等逻辑拆分至：
 * - ./view-types：类型与常量
 * - ./modals：弹窗类（DeleteConfirmModal / CoverImagePickerModal）
 * - ./filters：FilterHelper（筛选逻辑）
 * - ./renderers/dashboard：DashboardRenderer（仪表盘 + 列表）
 * - ./renderers/board：BoardRenderer（看板 + 拖拽）
 * - ./renderers/gallery：GalleryRenderer（画廊）
 * - ./renderers/detail：DetailRenderer（目标/任务详情 + 空状态）
 * - ./renderers/calendar：CalendarRenderer（日历）
 *
 * 本类保留：生命周期、导航、标签页管理、数据访问、字段配置、工具方法、
 * 事件路由（bindEvents）、弹窗编排、引用加载、样式注入。
 */

import { ItemView, Notice, setIcon, TFile, Menu, MarkdownRenderer } from 'obsidian';
import { Goal, Task, GoalLevel, TaskStatus, TaskPriority, TaskField, GoalField, DEFAULT_VIEW_FIELDS, GOAL_FIELD_LABELS, TASK_FIELD_LABELS, FilterCondition, FilterLogic, FilterOperator, ViewTab, ViewTabType, getDefaultViewTabs, CustomFieldConfig } from '../types';
import AmazingLife from '../main';
import { DASHBOARD_VIEW_TYPE } from './view-types';
import type { ViewType, CalendarViewMode } from './view-types';
import { DeleteConfirmModal, CoverImagePickerModal } from './modals';
import { FilterHelper } from './filters';
import { DashboardRenderer } from './renderers/dashboard';
import { BoardRenderer } from './renderers/board';
import { GalleryRenderer } from './renderers/gallery';
import { DetailRenderer } from './renderers/detail';
import { CalendarRenderer } from './renderers/calendar';

// 为兼容 main.ts 的 `import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/DashboardView'`，
// 重新导出常量。
export { DASHBOARD_VIEW_TYPE } from './view-types';

export class DashboardView extends ItemView {
  public plugin: AmazingLife;
  public currentView: ViewType = 'dashboard';
  public selectedGoalId: string | null = null;
  public selectedTaskId: string | null = null;
  public calendarMode: CalendarViewMode = 'day';
  public calendarDate: Date = new Date();
  public selectedWeekStart: string | null = null;
  public selectedMonth: string | null = null;
  public selectedYear: string | null = null;
  public selectedDay: string | null = null;
  // 拖拽相关
  public draggingGoalId: string | null = null;
  public draggingGoalEl: HTMLElement | null = null;
  public dragGhost: HTMLElement | null = null;
  public dropTargetColumn: string | null = null;
  // 导航历史
  private viewHistory: Array<{ view: ViewType; goalId?: string | null; taskId?: string | null }> = [];
  // 临时筛选状态（用于渲染和事件处理）
  public tempFilterConditions: FilterCondition[] = [];
  public tempFilterLogic: FilterLogic = 'and';
  public tempShowFilterBuilder: boolean = false;

  // 各渲染/工具 helper（组合方式持有）
  public filterHelper: FilterHelper;
  public dashboardRenderer: DashboardRenderer;
  public boardRenderer: BoardRenderer;
  public galleryRenderer: GalleryRenderer;
  public detailRenderer: DetailRenderer;
  public calendarRenderer: CalendarRenderer;

  // 生成唯一ID
  private generateFilterId(): string {
    return 'filter_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }

  private generateTabId(): string {
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }

  // 将封面图路径转换为可显示的 URL
  public getCoverImageUrl(path: string | null): string | null {
    if (!path) return null;

    // 如果已经是 http/https URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // 如果是 app:// 协议，直接返回
    if (path.startsWith('app://')) {
      return path;
    }

    // 如果是 vault 中的文件路径，使用 getResourcePath 转换
    try {
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      // getResourcePath 需要 TFile 对象
      if (file instanceof TFile) {
        return (this.plugin.app.vault as any).getResourcePath(file);
      }
    } catch (e) {
      console.warn('封面图文件不存在:', path);
    }

    return null;
  }

  constructor(leaf: any, plugin: AmazingLife) {
    super(leaf);
    this.plugin = plugin;
    // 实例化各 helper，传入自身引用以访问共享状态
    this.filterHelper = new FilterHelper(this);
    this.dashboardRenderer = new DashboardRenderer(this);
    this.boardRenderer = new BoardRenderer(this);
    this.galleryRenderer = new GalleryRenderer(this);
    this.detailRenderer = new DetailRenderer(this);
    this.calendarRenderer = new CalendarRenderer(this);
  }

  getViewType(): string { return DASHBOARD_VIEW_TYPE; }
  getDisplayText(): string { return 'Amazing Life'; }
  getIcon(): string { return 'target'; }

  async onOpen(): Promise<void> { await this.loadAndRender(); }
  async onClose(): Promise<void> { this.removeStyles(); }

  async loadAndRender(): Promise<void> {
    try {
      await this.plugin.getGoalManager().loadGoals();
      await this.plugin.getTaskManager().loadTasks();
      this.render();
    } catch (error) {
      new Notice('加载数据失败: ' + (error as Error).message);
    }
  }

  // 导航到新页面并记录历史
  public navigateTo(view: ViewType, goalId: string | null, taskId: string | null): void {
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
  public goBack(): void {
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

  // 复制标签
  private async duplicateTab(tabId: string): Promise<void> {
    const tabs = this.getViewTabs();
    const originalTab = tabs.find(t => t.id === tabId);
    if (!originalTab) return;

    const newTab: ViewTab = {
      id: this.generateTabId(),
      name: originalTab.name + ' (副本)',
      type: originalTab.type,
      groupBy: originalTab.groupBy,
      filters: [...(originalTab.filters || [])],
      filterLogic: originalTab.filterLogic || 'and'
    };

    tabs.push(newTab);
    const settings = this.plugin.getSettings();
    settings.viewTabs = tabs;
    settings.activeTabId = newTab.id;
    await this.plugin.saveSettings();

    this.currentView = newTab.type;
    this.tempFilterConditions = [...newTab.filters];
    this.tempFilterLogic = newTab.filterLogic;
    this.render();
    new Notice('视图已复制');
  }

  // 显示标签上下文菜单（长按触发）
  private showTabContextMenu(nameEl: HTMLElement, tabId: string, event?: MouseEvent): void {
    event?.preventDefault();

    this.closeTabContextMenu();

    const menu = document.createElement('div');
    menu.className = 'al-tab-context-menu';

    const copyOption = document.createElement('div');
    copyOption.className = 'al-tab-context-option';
    const copyIcon = document.createElement('span');
    copyIcon.className = 'al-tab-icon';
    setIcon(copyIcon, 'copy');
    copyOption.appendChild(copyIcon);
    const copyText = document.createElement('span');
    copyText.textContent = '复制视图';
    copyOption.appendChild(copyText);
    copyOption.addEventListener('click', async () => {
      this.closeTabContextMenu();
      await this.duplicateTab(tabId);
    });
    menu.appendChild(copyOption);

    const renameOption = document.createElement('div');
    renameOption.className = 'al-tab-context-option';
    const renameIcon = document.createElement('span');
    renameIcon.className = 'al-tab-icon';
    setIcon(renameIcon, 'pencil');
    renameOption.appendChild(renameIcon);
    const renameText = document.createElement('span');
    renameText.textContent = '重命名';
    renameOption.appendChild(renameText);
    renameOption.addEventListener('click', () => {
      this.closeTabContextMenu();
      this.editTabName(nameEl, tabId);
    });
    menu.appendChild(renameOption);

    const deleteOption = document.createElement('div');
    deleteOption.className = 'al-tab-context-option al-tab-context-option-danger';
    const deleteIcon = document.createElement('span');
    deleteIcon.className = 'al-tab-icon';
    setIcon(deleteIcon, 'trash-2');
    deleteOption.appendChild(deleteIcon);
    const deleteText = document.createElement('span');
    deleteText.textContent = '删除视图';
    deleteOption.appendChild(deleteText);
    deleteOption.addEventListener('click', () => {
      this.closeTabContextMenu();
      this.removeTab(tabId);
    });
    menu.appendChild(deleteOption);

    document.body.appendChild(menu);

    const rect = nameEl.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.classList.add('show');

    setTimeout(() => {
      document.addEventListener('click', this.closeTabContextMenu, { once: true });
      document.addEventListener('contextmenu', this.closeTabContextMenu, { once: true });
    }, 0);
  }

  private closeTabContextMenu = (): void => {
    const menu = document.querySelector('.al-tab-context-menu');
    if (menu) {
      menu.remove();
    }
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
  private async updateActiveTabGroupBy(groupBy: 'level' | 'goalStatus' | 'parent' | null): Promise<void> {
    const settings = this.plugin.getSettings();
    const tabs = this.getViewTabs();
    const activeTab = this.getActiveTab();

    if (activeTab) {
      const tabIndex = tabs.findIndex(t => t.id === activeTab.id);
      if (tabIndex !== -1) {
        tabs[tabIndex].groupBy = groupBy || undefined;
        settings.viewTabs = tabs;
        await this.plugin.saveSettings();
      }
    }
  }

  // 获取当前标签的筛选条件
  public getCurrentFilters(): { conditions: FilterCondition[]; logic: FilterLogic; groupBy: 'level' | 'goalStatus' | 'parent' | null } {
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

  public getTaskFields(): TaskField[] {
    return (this.plugin.getSettings().viewFields[this.getCurrentViewType()] || ['title', 'priority', 'due']) as TaskField[];
  }

  public getGoalFields(): GoalField[] {
    const viewType = this.currentView === 'gallery' ? 'gallery'
      : this.currentView === 'list' ? 'list'
      : this.currentView === 'board' ? 'board'
      : 'goal';
    return (this.plugin.getSettings().viewFields[viewType] || ['level', 'title', 'progress']) as GoalField[];
  }

  // 获取当前视图启用的自定义字段配置
  public getEnabledCustomFields(): CustomFieldConfig[] {
    const viewType = this.currentView;
    const allCustomFields = this.plugin.getSettings().customGoalFields || [];

    // 返回在当前视图中启用的自定义字段
    return allCustomFields.filter(field => {
      const fieldKey = `custom_${field.key}`;
      const goalFields = this.getGoalFields();
      return goalFields.includes(fieldKey as GoalField);
    });
  }

  // 根据字段类型格式化字段值显示
  public formatCustomFieldValue(value: any, type: string): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (type) {
      case 'color':
        return `<span style="display:inline-block;width:16px;height:16px;background:${value};border-radius:3px;margin-right:6px;vertical-align:middle;"></span>${value}`;
      case 'tags':
        if (Array.isArray(value)) {
          return value.map(tag => `<span class="al-custom-tag">#${tag}</span>`).join(' ');
        }
        return String(value);
      case 'url':
        return `<a href="${value}" target="_blank" class="al-custom-link">${value}</a>`;
      case 'date':
        return String(value).split('T')[0];
      default:
        return String(value);
    }
  }

  // 渲染自定义字段
  public renderCustomFields(goal: Goal, fields: CustomFieldConfig[]): string {
    if (fields.length === 0) return '';

    const fieldHtml = fields.map(field => {
      const value = goal[field.key];
      if (value === undefined || value === null || value === '') return '';

      const formattedValue = this.formatCustomFieldValue(value, field.type);
      return `<div class="al-custom-field"><span class="al-custom-field-label">${field.label}:</span><span class="al-custom-field-value">${formattedValue}</span></div>`;
    }).filter(html => html !== '').join('');

    return fieldHtml ? `<div class="al-custom-fields">${fieldHtml}</div>` : '';
  }

  public getGoalTitle(goalId: string | null): string {
    if (!goalId) return '未关联';
    const goal = this.plugin.getGoalManager().getGoal(goalId);
    return goal ? goal['A-title'] : '未知目标';
  }

  public getGoalLevel(goalId: string | null): number {
    if (!goalId) return 0;
    const goal = this.plugin.getGoalManager().getGoal(goalId);
    return goal ? goal['A-level'] : 0;
  }

  public getGoal(goalId: string): Goal | null { return this.plugin.getGoalManager().getGoal(goalId); }
  public getTask(taskId: string): Task | null { return this.plugin.getTaskManager().getTask(taskId); }
  public getTasksByGoal(goalId: string): Task[] { return this.plugin.getTaskManager().getAllTasks().filter(t => t['A-goal'] === goalId); }

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
          <div class="al-title">Amazing Life</div>
        </div>

        <div class="al-view-tabs">
          <button class="al-view-tab ${this.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard"><span class="al-tab-icon" data-icon="layout-grid"></span><span>仪表盘</span></button>
          ${viewTabsHtml}
          <button class="al-view-tab al-view-tab-add" id="al-add-view-tab" title="添加视图"><span class="al-tab-icon" data-icon="plus"></span></button>
        </div>

        ${['list', 'board', 'gallery'].includes(this.currentView) ? this.filterHelper.renderFilterBar(currentFilters) : ''}

        <div class="al-body">
          ${this.renderCurrentView(allGoals, allTasks, todayTasks, overdueTasks, weekComplete, activeTasks)}
        </div>
      </div>
    `;

     this.bindEvents();
     this.addStyles();
    this.setTabIcons();
    this.loadGoalReferences();
    this.loadTaskReferences();
    this.renderMarkdownTables();
  }

  private renderMarkdownTables(): void {
    if (this.currentView !== 'list') return;

    this.containerEl.querySelectorAll('.al-markdown-placeholder').forEach(el => {
      const markdown = decodeURIComponent(el.getAttribute('data-markdown') || '');
      const goalIds = (el.getAttribute('data-goal-ids') || '').split(',');

      el.innerHTML = '';
      MarkdownRenderer.renderMarkdown(markdown, el as HTMLElement, '', this.plugin);

      // 为表格行添加点击事件
      const rows = el.querySelectorAll('tbody tr');
      rows.forEach((row, index) => {
        const htmlRow = row as HTMLElement;
        htmlRow.style.cursor = 'pointer';
        htmlRow.style.transition = 'background 0.15s';
        row.addEventListener('mouseenter', () => {
          htmlRow.style.background = 'var(--background-modifier-hover)';
        });
        row.addEventListener('mouseleave', () => {
          htmlRow.style.background = '';
        });
        row.addEventListener('click', () => {
          const goalId = goalIds[index];
          if (goalId) {
            this.navigateTo('goal-detail', goalId, null);
          }
        });
      });
    });
  }

  private renderCurrentView(allGoals: Goal[], allTasks: Task[], todayTasks: Task[], overdueTasks: Task[], weekComplete: number, activeTasks: number): string {
    // 对目标进行筛选
    const filteredGoals = this.filterHelper.applyFilterConditions(allGoals);

    switch (this.currentView) {
      case 'goal-detail': return this.selectedGoalId ? this.detailRenderer.renderGoalDetailView(this.selectedGoalId) : this.dashboardRenderer.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
      case 'task-detail': return this.selectedTaskId ? this.detailRenderer.renderTaskDetailView(this.selectedTaskId) : this.dashboardRenderer.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
      case 'list': return this.dashboardRenderer.renderListView(filteredGoals, allTasks);
      case 'board': return this.boardRenderer.renderBoardView(filteredGoals, allTasks);
      case 'gallery': return this.galleryRenderer.renderGalleryView(filteredGoals, allTasks);
      default: return this.dashboardRenderer.renderDashboardView(todayTasks, overdueTasks, weekComplete, activeTasks);
    }
  }

  private calculateWeekComplete(completedTasks: Task[]): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return completedTasks.filter(t => { if (!t['A-completed']) return false; return new Date(t['A-completed']) >= weekAgo; }).length;
  }

  private bindEvents(): void {
    const content = this.contentEl;

    // Calendar events
    this.calendarRenderer.bindCalendarEvents(content);

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
    content.querySelectorAll('.al-view-tab[data-tab-id]').forEach(tabEl => {
      // 右键菜单
      tabEl.addEventListener('contextmenu', (e: Event) => {
        const tabId = (tabEl as HTMLElement).getAttribute('data-tab-id');
        if (tabId) {
          const nameEl = tabEl.querySelector('.al-tab-name') as HTMLElement;
          this.showTabContextMenu(nameEl || tabEl, tabId, e as MouseEvent);
        }
      });

      // 长按弹出菜单（移动端）
      let longPressTimer: number | null = null;
      tabEl.addEventListener('touchstart', (e) => {
        longPressTimer = window.setTimeout(() => {
          const tabId = (tabEl as HTMLElement).getAttribute('data-tab-id');
          if (tabId) {
            const nameEl = tabEl.querySelector('.al-tab-name') as HTMLElement;
            this.showTabContextMenu(nameEl || tabEl, tabId);
          }
        }, 500);
      });

      tabEl.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

      tabEl.addEventListener('touchcancel', () => {
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

    // 看板/画廊分组选择
    content.querySelector('#al-board-group-by')?.addEventListener('change', (e) => {
      const groupByValue = (e.target as HTMLSelectElement).value;
      const groupBy = groupByValue === '' ? null : groupByValue as 'level' | 'goalStatus' | 'parent';
      this.updateActiveTabGroupBy(groupBy);
      this.render();
    });

    // 返回按钮 - 返回上一页
    content.querySelector('#al-back-btn')?.addEventListener('click', () => { this.goBack(); });

    // 目标更多操作菜单 - 使用 Obsidian 原生 Menu
    const menuBtn = content.querySelector('#al-goal-menu-btn');

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = new Menu();
      menu.setUseNativeMenu(true);

      menu.addItem((item) => {
        item.setTitle('打开目标文件')
          .setIcon('file-text')
          .onClick(async () => {
            if (this.selectedGoalId) {
              try {
                const file = await this.plugin.getGoalManager().getGoalFile(this.selectedGoalId);
                if (file) {
                  await this.plugin.app.workspace.getLeaf(true).openFile(file);
                } else {
                  new Notice('未找到目标文件');
                }
              } catch (error) {
                new Notice('打开文件失败');
              }
            }
          });
      });

      menu.addItem((item) => {
        item.setTitle('刷新目标')
          .setIcon('refresh-cw')
          .onClick(async () => {
            if (this.selectedGoalId) {
              await this.plugin.getGoalManager().loadGoals();
              new Notice('已刷新目标');
              this.loadAndRender();
            }
          });
      });

      menu.addItem((item) => {
        item.setTitle('删除目标')
          .setIcon('trash-2')
          .onClick(() => {
            if (this.selectedGoalId) {
              const goal = this.getGoal(this.selectedGoalId);
              if (goal) {
                const subGoals = this.plugin.getGoalManager().getAllGoals().filter(g => g['A-parent'] === this.selectedGoalId);

                if (subGoals.length > 0) {
                  this.showDeleteGoalWithChildrenModal(goal, subGoals);
                } else {
                  new DeleteConfirmModal(this.plugin, goal['A-title'], () => {
                    this.plugin.getGoalManager().deleteGoal(this.selectedGoalId!).then(() => {
                      new Notice('目标已删除');
                      this.goBack();
                    }).catch(() => {
                      new Notice('删除目标失败');
                    });
                  }).open();
                }
              }
            }
          });
      });

      menu.showAtPosition({ x: (e.target as HTMLElement).getBoundingClientRect().right, y: (e.target as HTMLElement).getBoundingClientRect().bottom + 4 });
    });

    // Goal click events - 记录历史
    content.querySelectorAll('.al-goal, .al-gallery-goal').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.navigateTo('goal-detail', goalId, null); } }); });

    // Task click events (in detail views) - 记录历史
    content.querySelectorAll('.al-detail-task').forEach(el => { el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('.task-list-item-checkbox')) { return; } const taskId = (e.currentTarget as HTMLElement).getAttribute('data-task-id'); if (taskId) { this.showTaskDetailModal(taskId); } }); });

    // Task goal card click
    content.querySelectorAll('.al-task-goal-card').forEach(el => { el.addEventListener('click', (e) => { const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id'); if (goalId) { this.navigateTo('goal-detail', goalId, null); } }); });

    content.querySelector('#al-add-task-to-goal')?.addEventListener('click', () => { if (this.selectedGoalId) this.showCreateTaskModalForGoal(this.selectedGoalId); });

    // 封面图片点击事件
    content.querySelectorAll('.al-detail-add-cover, .al-detail-cover').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.selectedGoalId) {
          const goal = this.getGoal(this.selectedGoalId);
          if (goal) {
            const goalId = this.selectedGoalId;
            new CoverImagePickerModal(
              this.plugin,
              goalId,
              goal['A-cover'],
              async (imagePath) => {
                await this.plugin.getGoalManager().updateGoal(goalId, { cover: imagePath });
                this.loadAndRender();
              },
              async () => {
                await this.plugin.getGoalManager().updateGoal(goalId, { cover: null });
                this.loadAndRender();
              }
            ).open();
          }
        }
      });
    });

    // 字段行内编辑事件
    content.querySelectorAll('.al-field-row[data-field], .al-progress-field-row[data-field], .al-detail-description-block[data-field]').forEach(row => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('al-field-link')) return;
        const field = row.getAttribute('data-field');
        const value = row.getAttribute('data-value');
        const fieldType = row.querySelector('.al-field-editable')?.getAttribute('data-field-type');
        if (field && fieldType && field !== 'cover' && field !== 'parent' && this.selectedGoalId) {
          this.startFieldEdit(row as HTMLElement, field, fieldType, value || '');
        }
      });
    });

    // 上级目标点击 - 选择父目标
    content.querySelector('.al-parent-field-row')?.addEventListener('click', () => {
      this.showParentSelectorModal();
    });

    // 进度管理块折叠/展开
    content.querySelector('#al-progress-management-toggle')?.addEventListener('click', () => {
      const content = document.querySelector('#al-progress-management-content') as HTMLElement;
      const toggleIcon = document.querySelector('#al-progress-toggle-icon') as HTMLElement;
      if (content) {
        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggleIcon.classList.remove('collapsed');
          toggleIcon.textContent = '▼';
        } else {
          content.style.display = 'none';
          toggleIcon.classList.add('collapsed');
          toggleIcon.textContent = '▶';
        }
      }
    });

    // 子目标折叠面板折叠/展开
    content.querySelector('#al-subgoals-toggle')?.addEventListener('click', () => {
      const content = document.querySelector('#al-subgoals-content') as HTMLElement;
      const toggleIcon = document.querySelector('#al-subgoals-toggle-icon') as HTMLElement;
      if (content) {
        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggleIcon.classList.add('expanded');
          toggleIcon.textContent = '▼';
        } else {
          content.style.display = 'none';
          toggleIcon.classList.remove('expanded');
          toggleIcon.textContent = '▶';
        }
      }
    });

    // 子目标点击 - 跳转到子目标详情
    content.querySelectorAll('.al-subgoal-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const goalId = (e.currentTarget as HTMLElement).getAttribute('data-goal-id');
        if (goalId) this.navigateTo('goal-detail', goalId, null);
      });
    });

    // 添加子目标按钮
    content.querySelector('#al-add-subgoal-btn')?.addEventListener('click', () => {
      if (this.selectedGoalId) {
        this.showCreateGoalModal({ parent: this.selectedGoalId });
      }
    });

    // 关联任务折叠面板折叠/展开
    content.querySelector('#al-tasks-toggle')?.addEventListener('click', () => {
      const content = document.querySelector('#al-tasks-content') as HTMLElement;
      const toggleIcon = document.querySelector('#al-tasks-toggle-icon') as HTMLElement;
      if (content) {
        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggleIcon.classList.add('expanded');
          toggleIcon.textContent = '▼';
        } else {
          content.style.display = 'none';
          toggleIcon.classList.remove('expanded');
          toggleIcon.textContent = '▶';
        }
      }
    });

    // 任务点击事件
    content.querySelectorAll('.al-task-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('task-list-item-checkbox')) return;
        const taskId = (item as HTMLElement).getAttribute('data-task-id');
        if (taskId) this.showTaskDetailModal(taskId);
      });
    });

    // 自定义字段点击编辑事件
    content.querySelectorAll('.al-custom-field-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const fieldKey = el.getAttribute('data-field-key');
        const fieldType = el.getAttribute('data-field-type');
        if (fieldKey && this.selectedGoalId) {
          const goal = this.getGoal(this.selectedGoalId);
          const value = goal ? goal[fieldKey] : '';
          this.startCustomFieldEdit(el, fieldKey, fieldType || 'text', value);
        }
      });
    });

    // 添加自定义字段按钮
    content.querySelector('#al-add-custom-field-btn')?.addEventListener('click', () => {
      this.showAddCustomFieldModal();
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

    // 画廊视图添加按钮（事件委托，处理分组和不分组的添加按钮）
    content.querySelectorAll('.al-gallery-add-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const prefillLevel = el.getAttribute('data-prefill-level');
        const prefillStatus = el.getAttribute('data-prefill-status');
        const prefillParent = el.getAttribute('data-prefill-parent');
        if (prefillParent) {
          this.showCreateGoalModal({ parent: prefillParent });
        } else if (prefillLevel) {
          this.showCreateGoalModal({ level: parseInt(prefillLevel) });
        } else if (prefillStatus) {
          this.showCreateGoalModal({ status: prefillStatus as 'active' | 'completed' | 'abandoned' });
        } else {
          this.showCreateGoalModal();
        }
      });
    });

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
          this.filterHelper.updateFilterCondition(conditionId, { field: newField });
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
          this.filterHelper.updateFilterCondition(conditionId, { operator: newOperator });
          this.render();
        }
      });
    });

    // 值输入变化
    content.querySelectorAll('.al-filter-value-input, .al-filter-value-select').forEach(input => {
      input.addEventListener('change', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).getAttribute('data-condition-id');
        const yearPart = (e.currentTarget as HTMLElement).getAttribute('data-year-part');

        if (conditionId) {
          // 处理年份区间的特殊情况
          if (yearPart) {
            const condition = this.tempFilterConditions.find(c => c.id === conditionId);
            if (condition) {
              const currentValue = condition.value ? String(condition.value).split(',') : ['', ''];
              const newYear = (e.target as HTMLSelectElement).value;

              if (yearPart === 'start') {
                currentValue[0] = newYear;
              } else {
                currentValue[1] = newYear;
              }

              // 只有当两个值都有时才更新
              if (currentValue[0] && currentValue[1]) {
                this.filterHelper.updateFilterCondition(conditionId, { value: currentValue.join(',') });
              }
            }
          } else {
            const newValue = (e.target as HTMLInputElement | HTMLSelectElement).value;
            this.filterHelper.updateFilterCondition(conditionId, { value: newValue || null });
          }
        }
      });
    });

    // 删除条件
    content.querySelectorAll('.al-filter-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const conditionId = (e.currentTarget as HTMLElement).getAttribute('data-condition-id');
        if (conditionId) {
          this.filterHelper.removeFilterCondition(conditionId);
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
    this.boardRenderer.bindBoardDragEvents(content);
  }

  private async toggleTaskStatus(taskId: string): Promise<void> {
    const task = this.plugin.getTaskManager().getTask(taskId);
    if (!task) return;
    try { if (task['A-status'] === 'completed') { await this.plugin.getTaskManager().updateTask(taskId, { status: 'pending' }); } else { await this.plugin.getTaskManager().completeTask(taskId); } this.loadAndRender(); } catch (error) { new Notice('更新失败: ' + (error as Error).message); }
  }

  private async loadGoalReferences(): Promise<void> {
    if (this.currentView !== 'goal-detail' || !this.selectedGoalId) {
      return;
    }

    const container = this.contentEl.querySelector('#al-references-container');
    const contentEl = this.contentEl.querySelector('#al-references-content');
    const countEl = this.contentEl.querySelector('#al-references-count');

    if (!container || !contentEl || !countEl) {
      return;
    }

    try {
      const references = await this.plugin.getGoalManager().getGoalReferences(this.selectedGoalId);
      const goal = this.getGoal(this.selectedGoalId);
      const goalTitle = goal ? goal['A-title'] : '';

      countEl.textContent = references.length.toString();

      if (references.length === 0) {
        contentEl.innerHTML = `<div class="al-detail-references-empty"><span class="al-empty-text">暂无引用记录</span></div>`;
        return;
      }

      const referencesHtml = references.map(ref => {
        let lineContent = ref.lineContent;
        if (goalTitle) {
          lineContent = lineContent.replace(new RegExp(goalTitle, 'g'), `<span class="al-reference-highlight">${goalTitle}</span>`);
        }

        return `
          <div class="al-detail-reference-item" data-file-path="${ref.filePath}">
            <div class="al-reference-file-info">
              <span class="al-reference-file-icon">📄</span>
              <span class="al-reference-file-name">${ref.fileName}</span>
              <span class="al-reference-line-number">${ref.lineNumber}</span>
            </div>
            <div class="al-reference-content">${lineContent}</div>
          </div>
        `;
      }).join('');

      contentEl.innerHTML = referencesHtml;

      contentEl.querySelectorAll('.al-detail-reference-item').forEach(item => {
        item.addEventListener('click', () => {
          const filePath = item.getAttribute('data-file-path');
          if (filePath) {
            const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
            if (file) {
              this.plugin.app.workspace.openLinkText(file.path, '');
            }
          }
        });
      });
    } catch (error) {
      console.error('加载引用记录失败:', error);
      contentEl.innerHTML = `<div class="al-detail-references-error">加载引用记录失败</div>`;
    }
  }

  private async loadTaskReferences(): Promise<void> {
    if (this.currentView !== 'task-detail' || !this.selectedTaskId) {
      return;
    }

    const loadingEl = this.contentEl.querySelector('#al-task-references-loading');
    const contentEl = this.contentEl.querySelector('#al-task-references-container');
    const countEl = this.contentEl.querySelector('#al-task-references-count');

    if (!loadingEl || !contentEl || !countEl) {
      return;
    }

    try {
      const references = await this.plugin.getTaskManager().getTaskReferences(this.selectedTaskId);
      const task = this.getTask(this.selectedTaskId);
      const taskTitle = task ? task['A-title'] : '';

      countEl.textContent = references.length.toString();
      loadingEl.remove();

      if (references.length === 0) {
        contentEl.innerHTML = `<div class="al-detail-references-empty"><span class="al-empty-text">暂无引用记录</span></div>`;
        return;
      }

      const referencesHtml = references.map(ref => {
        let lineContent = ref.lineContent;
        if (taskTitle) {
          lineContent = lineContent.replace(new RegExp(taskTitle, 'g'), `<span class="al-reference-highlight">${taskTitle}</span>`);
        }

        return `
          <div class="al-detail-reference-item" data-file-path="${ref.filePath}">
            <div class="al-reference-file-info">
              <span class="al-reference-file-icon">📄</span>
              <span class="al-reference-file-name">${ref.fileName}</span>
              <span class="al-reference-line-number">${ref.lineNumber}</span>
            </div>
            <div class="al-reference-content">${lineContent}</div>
          </div>
        `;
      }).join('');

      contentEl.innerHTML = referencesHtml;

      contentEl.querySelectorAll('.al-detail-reference-item').forEach(item => {
        item.addEventListener('click', () => {
          const filePath = item.getAttribute('data-file-path');
          if (filePath) {
            const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
            if (file) {
              this.plugin.app.workspace.openLinkText(file.path, '');
            }
          }
        });
      });
    } catch (error) {
      console.error('加载引用记录失败:', error);
      loadingEl.remove();
      contentEl.innerHTML = `<div class="al-detail-references-error">加载引用记录失败</div>`;
    }
  }

  // 日历视图调用：打开日记
  public async openDailyNote(dateStr: string): Promise<void> {
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

  public async openWeeklyNoteByDate(weekStartStr: string): Promise<void> {
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

  public async openMonthlyNoteByDate(yearMonth: string): Promise<void> {
    try {
      const file = await this.plugin.getNoteManager().getOrCreateMonthlyNote(yearMonth);
      await this.plugin.app.workspace.getLeaf(true).openFile(file);
      new Notice(`已打开 ${yearMonth} 月记`);
    } catch (error) {
      new Notice('打开月记失败');
    }
  }

  public async openYearlyNoteByDate(year: string): Promise<void> {
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
    const isGoalView = viewKey === 'gallery' || viewKey === 'goal' || viewKey === 'board' || viewKey === 'list';
    const settings = this.plugin.getSettings();
    const currentFields = isGoalView
      ? (settings.viewFields[viewKey as 'gallery' | 'goal' | 'board' | 'list'] as GoalField[])
      : (settings.viewFields[viewKey as 'dashboard'] as TaskField[]);

    const fieldLabels = isGoalView ? GOAL_FIELD_LABELS : TASK_FIELD_LABELS;
    // 目标视图排除 title 字段（标题始终显示）
    const fields = Object.keys(fieldLabels).filter(f => !(isGoalView && f === 'title')) as (GoalField | TaskField)[];
    const viewNames: Record<string, string> = { dashboard: '仪表盘任务', board: '看板目标', list: '列表目标', gallery: '画廊目标', goal: '目标详情' };

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
      <div class="al-add-view-option" data-type="list">
        <span class="al-tab-icon" data-icon="list"></span>
        <span>列表视图</span>
      </div>
      <div class="al-add-view-option" data-type="board">
        <span class="al-tab-icon" data-icon="columns"></span>
        <span>看板视图</span>
      </div>
      <div class="al-add-view-option" data-type="gallery">
        <span class="al-tab-icon" data-icon="gallery-horizontal"></span>
        <span>画廊视图</span>
      </div>
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

  private showDeleteGoalWithChildrenModal(goal: Goal, subGoals: Goal[]): void {
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box" style="max-width:420px;">
        <div class="al-modal-header">
          <span>⚠️ 删除目标</span>
          <button class="al-modal-close">&times;</button>
        </div>
        <div style="padding:20px;">
          <p style="margin:0 0 16px;font-size:14px;color:var(--text-primary);">
            目标「<strong>${goal['A-title']}</strong>」有 <strong>${subGoals.length}</strong> 个子目标，请选择删除方式：
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;" class="al-delete-option">
              <input type="radio" name="delete-mode" value="cascade" checked style="margin-top:3px;">
              <div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);">级联删除</div>
                <div style="font-size:12px;color:var(--text-muted);">同时删除所有子目标</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;" class="al-delete-option">
              <input type="radio" name="delete-mode" value="promote" style="margin-top:3px;">
              <div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);">提升子目标</div>
                <div style="font-size:12px;color:var(--text-muted);">将子目标提升为顶级目标后再删除</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;" class="al-delete-option">
              <input type="radio" name="delete-mode" value="cancel" style="margin-top:3px;">
              <div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary);">取消</div>
                <div style="font-size:12px;color:var(--text-muted);">不删除目标</div>
              </div>
            </label>
          </div>
        </div>
        <div class="al-modal-footer">
          <button class="mod-cta" id="al-confirm-delete-with-children" style="padding:8px 16px;border:none;border-radius:6px;background:var(--text-red);color:#fff;cursor:pointer;">确认删除</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);

    // 选中样式
    modal.querySelectorAll('.al-delete-option').forEach(option => {
      option.addEventListener('click', () => {
        modal.querySelectorAll('.al-delete-option').forEach(o => (o as HTMLElement).style.borderColor = 'var(--border-color)');
        (option as HTMLElement).style.borderColor = 'var(--interactive-accent)';
      });
    });

    modal.querySelector('#al-confirm-delete-with-children')?.addEventListener('click', async () => {
      const selectedMode = (modal.querySelector('input[name="delete-mode"]:checked') as HTMLInputElement)?.value;

      if (selectedMode === 'cancel') {
        close();
        return;
      }

      try {
        if (selectedMode === 'promote') {
          // 提升子目标：移除所有子目标的父目标引用
          for (const subGoal of subGoals) {
            await this.plugin.getGoalManager().updateGoal(subGoal['A-id'], { parent: null });
          }
        }
        // 删除目标
        await this.plugin.getGoalManager().deleteGoal(goal['A-id']);
        new Notice('目标已删除');
        close();
        this.goBack();
      } catch (error) {
        new Notice('删除失败: ' + (error as Error).message);
      }
    });
  }

  private showParentSelectorModal(): void {
    if (!this.selectedGoalId) return;

    const currentGoal = this.getGoal(this.selectedGoalId);
    if (!currentGoal) return;

    const allGoals = this.plugin.getGoalManager().getAllGoals();
    // 排除自己和自己的子目标（防止循环引用）
    const descendants = this.plugin.getGoalManager().getDescendants(this.selectedGoalId);
    const excludeIds = new Set([this.selectedGoalId, ...descendants.map(g => g['A-id'])]);

    const levelNames: Record<number, string> = { 1: '🏆', 2: '📅', 3: '📆', 4: '⚡' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };

    const availableGoals = allGoals.filter(g => !excludeIds.has(g['A-id']));

    const goalOptions = availableGoals.map(goal => {
      const selected = goal['A-id'] === currentGoal['A-parent'] ? 'selected' : '';
      return `<option value="${goal['A-id']}" ${selected}>${levelNames[goal['A-level']]} ${goal['A-title']}</option>`;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box" style="max-width:400px;">
        <div class="al-modal-header">
          <span>选择上级目标</span>
          <button class="al-modal-close">&times;</button>
        </div>
        <div style="padding:20px;">
          <div class="al-form-item">
            <label>上级目标</label>
            <select id="al-parent-select" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;">
              <option value="">无（顶级目标）</option>
              ${goalOptions}
            </select>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin:0 0 16px;">提示：不能选择自己或子目标作为上级目标</p>
        </div>
        <div class="al-modal-footer">
          <button class="al-btn-secondary" id="al-parent-cancel" style="padding:8px 16px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);cursor:pointer;">取消</button>
          <button class="mod-cta" id="al-parent-save" style="padding:8px 16px;border:none;border-radius:6px;background:var(--interactive-accent);color:#fff;cursor:pointer;">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-parent-cancel')?.addEventListener('click', close);

    modal.querySelector('#al-parent-save')?.addEventListener('click', async () => {
      const parentId = (modal.querySelector('#al-parent-select') as HTMLSelectElement).value || null;

      try {
        await this.plugin.getGoalManager().updateGoal(this.selectedGoalId!, { parent: parentId });
        new Notice(parentId ? '已设置上级目标' : '已移除上级目标');
        close();
        this.loadAndRender();
      } catch (error) {
        new Notice('设置失败: ' + (error as Error).message);
      }
    });
  }

  private showCreateGoalModal(prefill?: { level?: number; status?: string; parent?: string }): void {
    const levelOptions = [1, 2, 3, 4].map(level => {
      const labels: Record<number, string> = { 1: '🏆 人生目标', 2: '📅 阶段目标', 3: '📆 年度目标', 4: '⚡ 短期目标' };
      const selected = prefill?.level === level ? 'selected' : (level === 3 && !prefill?.level ? 'selected' : '');
      return `<option value="${level}" ${selected}>${labels[level]}</option>`;
    }).join('');

    // 获取可选的父目标列表
    const allGoals = this.plugin.getGoalManager().getAllGoals();
    const levelNames: Record<number, string> = { 1: '🏆', 2: '📅', 3: '📆', 4: '⚡' };
    const parentOptions = allGoals.map(goal => {
      const selected = prefill?.parent === goal['A-id'] ? 'selected' : '';
      return `<option value="${goal['A-id']}" ${selected}>${levelNames[goal['A-level']]} ${goal['A-title']}</option>`;
    }).join('');

    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `<div class="al-modal-bg"></div><div class="al-modal-box"><div class="al-modal-header"><span>🎯 创建目标</span><button class="al-modal-close">×</button></div><form id="al-goal-form"><div class="al-form-item"><label>目标名称</label><input type="text" id="al-goal-title" required placeholder="例如：学习一门新语言"></div><div class="al-form-item"><label>目标层级</label><select id="al-goal-level">${levelOptions}</select></div><div class="al-form-item"><label>上级目标（可选）</label><select id="al-goal-parent"><option value="">无</option>${parentOptions}</select></div><div class="al-form-item"><label>截止日期</label><input type="date" id="al-goal-due"></div><div class="al-form-actions"><button type="button" id="al-cancel-goal">取消</button><button type="submit" class="mod-cta">创建</button></div></form></div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-cancel-goal')?.addEventListener('click', close);
    modal.querySelector('#al-goal-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const title = (modal.querySelector('#al-goal-title') as HTMLInputElement).value.trim(); const level = Number((modal.querySelector('#al-goal-level') as HTMLSelectElement).value) as GoalLevel; const parent = (modal.querySelector('#al-goal-parent') as HTMLSelectElement).value || null; const due = (modal.querySelector('#al-goal-due') as HTMLInputElement).value || null; if (!title) { new Notice('请输入目标名称'); return; } try { await this.plugin.getGoalManager().createGoal({ title, level, due, parent }); new Notice('目标创建成功！'); close(); this.loadAndRender(); } catch (error) { new Notice('创建失败: ' + (error as Error).message); } });

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

    const isProgressField = row.classList.contains('al-progress-field-row');

    let inputEl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (fieldType === 'select') {
      inputEl = document.createElement('select');
      inputEl.className = isProgressField ? 'al-field-edit-select al-progress-edit-input' : 'al-field-edit-select';
      if (field === 'level') {
        inputEl.innerHTML = '<option value="1">人生</option><option value="2">阶段</option><option value="3">年度</option><option value="4">短期</option>';
      } else if (field === 'status') {
        inputEl.innerHTML = '<option value="active">进行中</option><option value="completed">已完成</option><option value="abandoned">已放弃</option>';
      }
      inputEl.value = currentValue;
    } else if (fieldType === 'date') {
      inputEl = document.createElement('input');
      inputEl.type = 'date';
      inputEl.className = isProgressField ? 'al-field-edit-input al-progress-edit-input' : 'al-field-edit-input';
      inputEl.value = currentValue || '';
    } else if (fieldType === 'number') {
      inputEl = document.createElement('input');
      inputEl.type = 'number';
      inputEl.className = isProgressField ? 'al-field-edit-input al-progress-edit-input' : 'al-field-edit-input';
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
      inputEl.className = isProgressField ? 'al-field-edit-input al-progress-edit-input' : 'al-field-edit-input';
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

  // 自定义字段编辑
  private startCustomFieldEdit(element: HTMLElement, fieldKey: string, fieldType: string, currentValue: any): void {
    const valueSpan = element.querySelector('.al-custom-field-value');
    if (!valueSpan) return;

    const currentText = currentValue !== undefined && currentValue !== null && currentValue !== '' ? String(currentValue) : '';

    // 获取字段配置以获取选项
    const settings = this.plugin.getSettings();
    const fieldConfig = settings.customGoalFields?.find(f => f.key === fieldKey);
    const options = fieldConfig?.options?.split(',').map(o => o.trim()) || [];

    let inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    if (fieldType === 'select' && options.length > 0) {
      inputEl = document.createElement('select');
      inputEl.className = 'al-field-edit-select';
      inputEl.style.cssText = 'padding:6px 10px;border:1px solid var(--interactive-accent);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px;';
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === currentText) option.selected = true;
        (inputEl as HTMLSelectElement).appendChild(option);
      });
    } else if (fieldType === 'number') {
      inputEl = document.createElement('input');
      inputEl.type = 'number';
      inputEl.value = currentText;
      inputEl.className = 'al-field-edit-input';
    } else if (fieldType === 'textarea') {
      inputEl = document.createElement('textarea');
      inputEl.value = currentText;
      inputEl.className = 'al-field-edit-textarea';
      inputEl.rows = 3;
    } else {
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.value = currentText;
      inputEl.className = 'al-field-edit-input';
    }

    valueSpan.replaceWith(inputEl);
    inputEl.focus();
    if ('select' in inputEl && inputEl.tagName !== 'SELECT') {
      (inputEl as HTMLInputElement).select();
    }

    const saveEdit = async () => {
      const saveValue = inputEl.value;
      inputEl.remove();

      try {
        const updateData: Record<string, any> = {};
        updateData[fieldKey] = saveValue;
        await this.plugin.getGoalManager().updateGoal(this.selectedGoalId!, updateData);
        new Notice('更新成功');
        this.loadAndRender();
      } catch (error) {
        new Notice('更新失败: ' + (error as Error).message);
        this.loadAndRender();
      }
    };

    inputEl.addEventListener('blur', saveEdit);
    inputEl.addEventListener('keydown', (e: Event) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' && fieldType !== 'textarea') {
        event.preventDefault();
        saveEdit();
      }
      if (event.key === 'Escape') {
        this.loadAndRender();
      }
    });
  }

  // 添加自定义字段弹窗
  private showAddCustomFieldModal(): void {
    const modal = document.createElement('div');
    modal.className = 'al-modal';
    modal.innerHTML = `
      <div class="al-modal-bg"></div>
      <div class="al-modal-box" style="max-width:400px;">
        <div class="al-modal-header">
          <span>添加自定义字段</span>
          <button class="al-modal-close">&times;</button>
        </div>
        <div style="padding:20px;">
          <div class="al-form-item">
            <label>字段名称</label>
            <input type="text" id="al-custom-field-key" placeholder="输入字段名称（如：备注、标签）" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
          <div class="al-form-item">
            <label>显示标签</label>
            <input type="text" id="al-custom-field-label" placeholder="输入显示名称" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
          <div class="al-form-item">
            <label>字段类型</label>
            <select id="al-custom-field-type" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;">
              <option value="text">文本</option>
              <option value="number">数字</option>
              <option value="date">日期</option>
              <option value="select">单选</option>
            </select>
          </div>
          <div class="al-form-item" id="al-custom-field-options-row" style="display:none;">
            <label>选项（逗号分隔）</label>
            <input type="text" id="al-custom-field-options" placeholder="如：重要,普通,紧急" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
          <div class="al-form-item">
            <label>字段值（可选）</label>
            <input type="text" id="al-custom-field-value" placeholder="输入字段值" style="width:100%;padding:10px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-secondary);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
          </div>
        </div>
        <div class="al-modal-footer">
          <button class="al-btn-secondary" id="al-custom-field-cancel" style="padding:8px 16px;border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);cursor:pointer;">取消</button>
          <button class="mod-cta" id="al-custom-field-save" style="padding:8px 16px;border:none;border-radius:6px;background:var(--interactive-accent);color:#fff;cursor:pointer;">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const keyInput = modal.querySelector('#al-custom-field-key') as HTMLInputElement;
    const labelInput = modal.querySelector('#al-custom-field-label') as HTMLInputElement;
    const typeSelect = modal.querySelector('#al-custom-field-type') as HTMLSelectElement;
    const optionsRow = modal.querySelector('#al-custom-field-options-row') as HTMLElement;
    const optionsInput = modal.querySelector('#al-custom-field-options') as HTMLInputElement;
    const valueInput = modal.querySelector('#al-custom-field-value') as HTMLInputElement;

    // 类型选择时显示/隐藏选项输入框
    typeSelect.addEventListener('change', () => {
      optionsRow.style.display = typeSelect.value === 'select' ? 'block' : 'none';
    });

    const close = () => modal.remove();
    modal.querySelector('.al-modal-bg')?.addEventListener('click', close);
    modal.querySelector('.al-modal-close')?.addEventListener('click', close);
    modal.querySelector('#al-custom-field-cancel')?.addEventListener('click', close);

    modal.querySelector('#al-custom-field-save')?.addEventListener('click', async () => {
      const fieldKey = keyInput.value.trim();
      const fieldLabel = labelInput.value.trim() || fieldKey;
      const fieldType = typeSelect.value;
      const fieldOptions = typeSelect.value === 'select' ? optionsInput.value.trim() : '';
      const fieldValue = valueInput.value.trim();

      if (!fieldKey) {
        new Notice('请输入字段名称');
        return;
      }

      // 检查是否已存在
      const settings = this.plugin.getSettings();
      const existingFields = settings.customGoalFields || [];
      if (existingFields.some(f => f.key === fieldKey)) {
        new Notice('该字段已存在');
        return;
      }

      // 添加到设置
      const newField: CustomFieldConfig = {
        key: fieldKey,
        label: fieldLabel,
        type: fieldType as 'text' | 'number' | 'date' | 'select',
        options: fieldOptions,
        showInViews: ['gallery', 'list', 'board']
      };

      existingFields.push(newField);
      settings.customGoalFields = existingFields;
      await this.plugin.saveSettings();

      // 如果有值，更新目标
      if (fieldValue && this.selectedGoalId) {
        const updateData: Record<string, any> = {};
        updateData[fieldKey] = fieldValue;
        await this.plugin.getGoalManager().updateGoal(this.selectedGoalId, updateData);
      }

      new Notice('自定义字段已添加');
      close();
      this.loadAndRender();
    });

    keyInput.focus();
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
      .al-dashboard{padding:0;height:100%;display:flex;flex-direction:column;overflow:hidden}.al-page{display:flex;flex-direction:column;height:100%;overflow:hidden}.al-header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--border-color);flex-shrink:0}.al-header-left{display:flex;flex-direction:column;gap:2px}.al-title{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:600;color:var(--text-primary)}.al-date{font-size:12px;color:var(--text-secondary)}.al-header-actions{display:flex;gap:8px}.al-header-actions button{display:inline-flex;align-items:center;gap:4px}.al-view-tabs{display:flex;gap:4px;padding:8px 24px;background:var(--background-primary);border-bottom:1px solid var(--border-color);flex-shrink:0;overflow-x:auto;position:relative;z-index:999}.al-view-tab{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;font-size:13px;transition:all .15s;position:relative;white-space:nowrap}.al-view-tab:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-view-tab.active{background:var(--interactive-accent);color:#fff}.al-tab-name{margin-right:4px}.al-tab-name-edit{border:1px solid var(--interactive-accent);border-radius:4px;padding:4px 8px;background:var(--background-primary);color:var(--text-primary);font-size:13px;outline:none;min-width:60px;max-width:150px;box-shadow:0 0 0 2px color-mix(in srgb,var(--interactive-accent) 30%,transparent)}.al-tab-context-menu{display:none;position:fixed;top:0;left:0;background:var(--background-primary);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.25);z-index:100000;min-width:160px;padding:4px}.al-tab-context-menu.show{display:block}.al-tab-context-option{display:flex;align-items:center;gap:10px;width:100%;padding:6px 12px;color:var(--text-primary);cursor:pointer;font-size:13px;text-align:left;line-height:1.5}.al-tab-context-option:hover{background:var(--background-modifier-hover)}.al-tab-context-option .al-tab-icon{width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);flex-shrink:0}.al-tab-context-option:hover .al-tab-icon{color:var(--text-primary)}.al-tab-context-option.al-tab-context-option-danger{color:var(--text-red)!important}.al-tab-context-option.al-tab-context-option-danger .al-tab-icon{color:var(--text-red)!important}.al-tab-context-option.al-tab-context-option-danger .al-tab-icon svg{color:var(--text-red)!important;fill:var(--text-red)!important;stroke:var(--text-red)!important}.al-view-tab-add{padding:8px 12px;opacity:0.6;border:none;background:transparent;color:var(--text-secondary);border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center}.al-view-tab-add:hover{opacity:1;background:var(--background-modifier-hover);color:var(--text-primary)}.al-add-view-dropdown{display:none;position:fixed;top:0;left:0;background:var(--background-primary);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.25);z-index:100000;min-width:160px;padding:4px}.al-add-view-dropdown.show{display:block}.al-add-view-option{display:flex;align-items:center;gap:10px;width:100%;padding:6px 12px;color:var(--text-primary);cursor:pointer;font-size:13px;text-align:left;line-height:1.5}.al-add-view-option:hover{background:var(--background-modifier-hover)}.al-add-view-option .al-tab-icon{width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);flex-shrink:0}.al-add-view-option:hover .al-tab-icon{color:var(--text-primary)}.al-tab-icon{width:16px;height:16px;display:flex;align-items:center;justify-content:center}.al-tab-icon svg{width:16px;height:16px}.al-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden}.al-main{padding:16px 24px;gap:16px;overflow-y:auto}.al-main-full{padding:16px 24px;gap:16px;overflow-y:auto}
      .al-detail-view{flex:1;display:flex;flex-direction:column;overflow:hidden}.al-detail-header{display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--background-secondary);border-bottom:1px solid var(--border-color);flex-shrink:0}.al-detail-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;color:var(--text-secondary);transition:all .15s}.al-detail-icon:hover{background:var(--background-modifier-hover);color:var(--text-primary)}.al-detail-delete-btn{color:var(--text-red)}.al-detail-delete-btn:hover{background:color-mix(in srgb,var(--text-red) 10%,transparent);color:var(--text-red)}.al-detail-title{display:flex;align-items:center;gap:12px;flex:1}.al-detail-title h2{font-size:20px;font-weight:600;color:var(--text-primary);margin:0}.al-detail-content{flex:1;display:flex;overflow:hidden}.al-detail-main{flex:1;padding:24px;overflow-y:auto}.al-detail-section{margin-bottom:24px}.al-detail-section h3{font-size:14px;font-weight:600;color:var(--text-secondary);margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border-color)}.al-detail-progress-section{margin-bottom:20px;padding:16px;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color)}.al-detail-progress-label{font-size:13px;color:var(--text-secondary);margin-bottom:8px}.al-detail-progress-large{display:flex;align-items:center;gap:12px}.al-progress-bar-large{flex:1;height:12px;background:var(--background-modifier-border);border-radius:6px;overflow:hidden}.al-progress-fill-large{height:100%;background:var(--interactive-accent);border-radius:6px;transition:width .3s}.al-detail-progress-value{font-size:16px;font-weight:700;color:var(--text-primary);min-width:48px;text-align:right}.al-detail-description-section{margin-bottom:20px}.al-detail-action-row{display:flex;align-items:center;gap:10px;padding:12px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-detail-action-row:hover{border-color:var(--interactive-accent);background:var(--background-modifier-hover)}.al-detail-action-row-add{background:color-mix(in srgb,var(--interactive-accent) 10%,transparent);border-color:var(--interactive-accent);border-style:dashed}.al-detail-action-row-add:hover{background:color-mix(in srgb,var(--interactive-accent) 15%,transparent);border-style:solid}.al-detail-action-icon{font-size:18px}.al-detail-action-text{font-size:14px;color:var(--text-secondary);flex:1;text-align:left}.al-detail-stats{display:flex;gap:16px}.al-detail-stat{flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color)}.al-detail-stat-num{font-size:28px;font-weight:700;color:var(--text-primary)}.al-detail-stat-label{font-size:12px;color:var(--text-secondary);margin-top:4px}.al-detail-stat-success .al-detail-stat-num{color:var(--text-green)}.al-detail-tasks{display:flex;flex-direction:column;gap:8px}.al-detail-task{display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-detail-task:hover{border-color:var(--interactive-accent)}.al-detail-task-content{flex:1}.al-detail-task-title{font-size:14px;font-weight:500;color:var(--text-primary);margin-bottom:4px}.al-detail-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-detail-task-meta{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary)}.al-action-btn-success{background:var(--text-green);color:#fff;border:none;border-radius:6px;cursor:pointer}.al-action-btn-danger{background:transparent;color:var(--text-red);border:1px solid var(--text-red);border-radius:6px;cursor:pointer}.al-task-actions{display:flex;flex-direction:column;gap:8px}.al-task-goal-card{padding:16px;background:var(--background-secondary);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;transition:all .15s}.al-task-goal-card:hover{border-color:var(--interactive-accent)}.al-task-goal-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}.al-task-goal-progress{display:flex;align-items:center;gap:8px}.al-task-goal-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-task-goal-progress .al-progress-fill{height:100%;background:var(--interactive-accent)}.al-task-goal-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}
      .al-table-view{flex:1;padding:16px;overflow:auto}.al-table-empty{display:flex;justify-content:center;align-items:center;height:100%}.al-markdown-table-wrapper{background:var(--background-secondary);border-radius:10px;overflow:hidden;padding:12px}.al-markdown-placeholder table{width:100%;border-collapse:collapse;margin:0}.al-markdown-placeholder th{text-align:left;padding:10px 14px;background:var(--background-primary);border-bottom:1px solid var(--border-color);font-size:12px;font-weight:600;color:var(--text-secondary)}.al-markdown-placeholder td{padding:10px 14px;border-bottom:1px solid var(--border-color);font-size:13px;color:var(--text-primary)}.al-markdown-placeholder tbody tr:last-child td{border-bottom:none}.al-markdown-placeholder blockquote{margin:0}.al-goal-tag{font-weight:500;font-size:12px;cursor:pointer}.al-goal-tag:hover{text-decoration:underline}
      .al-board-group-label{font-size:12px;color:var(--text-secondary)}.al-board-view{display:flex;flex-direction:row;flex:1;gap:12px;padding:16px;overflow-x:auto;min-height:0;background:var(--background-primary);align-items:stretch}.al-board-empty{display:flex;justify-content:center;align-items:center;width:100%}.al-board-column{flex:0 0 260px;display:flex;flex-direction:column;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);overflow:hidden;max-height:100%}.al-board-column-header{display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:2px solid var(--column-accent,var(--interactive-accent));background:var(--background-primary);flex-shrink:0}.al-board-column-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-primary);overflow:visible;flex-wrap:wrap;white-space:nowrap}.al-board-column-body{flex:1;padding:8px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:150px}.al-level-badge{font-size:12px;padding:3px 10px;border-radius:6px;color:#fff;font-weight:600;white-space:nowrap}.al-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.al-goal-card{padding:14px;background:var(--background-primary);border-radius:8px;border:1px solid var(--border-color);cursor:grab;transition:all .15s;margin-bottom:8px}.al-goal-card:hover{border-color:var(--interactive-accent);box-shadow:0 2px 8px rgba(0,0,0,0.1)}.al-goal-card-title{font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:10px;line-height:1.3}.al-goal-card-progress{display:flex;align-items:center;gap:8px;margin-bottom:10px}.al-goal-card-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-goal-card-progress .al-progress-fill{height:100%;background:var(--interactive-accent)}.al-goal-card-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}.al-goal-card-meta{display:flex;gap:12px;font-size:12px;color:var(--text-muted)}.al-goal-card-cover{width:100%;height:80px;overflow:hidden;border-radius:6px;margin-bottom:10px}.al-goal-card-cover img{width:100%;height:100%;object-fit:cover}.al-goal-card.dragging{opacity:0.3;cursor:grabbing}.drag-ghost{position:fixed;z-index:9999;pointer-events:none;opacity:0.9;transform:rotate(2deg);box-shadow:0 8px 24px rgba(0,0,0,0.2)}.al-board-column.drop-target{border:2px dashed var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 10%,transparent)}
      .al-gallery-view{flex:1;padding:16px;overflow-y:auto}.al-gallery-empty{display:flex;justify-content:center;align-items:center;height:100%}.al-gallery-section{margin-bottom:24px}.al-gallery-section-title{font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:8px}.al-gallery-section-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.al-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.al-gallery-card{position:relative;background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);padding:16px;transition:all .2s;cursor:pointer}.al-gallery-card:hover{border-color:var(--interactive-accent);box-shadow:0 4px 12px rgba(0,0,0,.1);transform:translateY(-2px)}.al-gallery-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.al-gallery-card-title{font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:12px;line-height:1.4}.al-gallery-card-progress{display:flex;align-items:center;gap:8px;margin-bottom:8px}.al-gallery-card-progress .al-progress-bar{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden}.al-gallery-card-progress .al-progress-fill{height:100%;background:var(--interactive-accent);border-radius:3px}.al-gallery-card-progress span{font-size:11px;color:var(--text-secondary);min-width:36px}.al-gallery-card-meta{font-size:11px;color:var(--text-secondary)}.al-gallery-card-tasks{margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);font-size:12px;color:var(--text-secondary)}.al-gallery-card-cover{width:calc(100% + 32px);height:120px;overflow:hidden;margin:-16px -16px 12px;border-radius:10px 10px 0 0}.al-gallery-card-cover img{width:100%;height:100%;object-fit:cover}
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
      .al-filter-bar{display:flex;gap:10px;padding:10px 16px;background:var(--background-primary);border-bottom:1px solid var(--border-color);align-items:center;flex-wrap:wrap}.al-filter-toggle{padding:6px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-toggle:hover{border-color:var(--interactive-accent)}.al-filter-toggle.active{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-filter-btn{padding:6px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-btn:hover{border-color:var(--interactive-accent)}.al-filter-btn-danger{color:var(--text-red);border-color:var(--text-red)}.al-filter-btn-danger:hover{background:color-mix(in srgb,var(--text-red) 10%,transparent)}.al-filter-count{padding:4px 10px;background:var(--interactive-accent);color:#fff;border-radius:10px;font-size:11px}.al-filter-spacer{flex:1}.al-filter-settings-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-secondary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-settings-btn:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-board-group-inline{display:flex;align-items:center;gap:6px}.al-filter-select{padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer}
      .al-filter-builder{padding:12px 16px;background:var(--background-primary);border-bottom:1px solid var(--border-color)}.al-filter-logic-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}.al-filter-logic-label{font-size:12px;color:var(--text-secondary)}.al-filter-logic-btn{padding:4px 10px;border:1px solid var(--border-color);border-radius:4px;background:transparent;color:var(--text-secondary);font-size:11px;cursor:pointer;transition:all .15s}.al-filter-logic-btn:hover{border-color:var(--interactive-accent);color:var(--text-primary)}.al-filter-logic-btn.active{background:var(--interactive-accent);border-color:var(--interactive-accent);color:#fff}.al-filter-conditions{display:flex;flex-direction:column;gap:8px}.al-filter-condition{display:flex;align-items:center;gap:8px;padding:8px;background:var(--background-secondary);border-radius:6px;border:1px solid var(--border-color)}.al-filter-field-select,.al-filter-operator-select,.al-filter-value-select{padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;background:var(--background-primary);color:var(--text-primary);font-size:12px;cursor:pointer}.al-filter-field-select:hover,.al-filter-operator-select:hover,.al-filter-value-select:hover{border-color:var(--interactive-accent)}.al-filter-value-input{padding:6px 8px;border:1px solid var(--border-color);border-radius:4px;background:var(--background-primary);color:var(--text-primary);font-size:12px;min-width:120px}.al-filter-value-input:hover{border-color:var(--interactive-accent)}.al-filter-value-input:focus{outline:none;border-color:var(--interactive-accent)}.al-filter-date-input{min-width:140px}.al-filter-no-value{padding:6px 8px;color:var(--text-muted);font-size:12px}.al-filter-remove-btn{width:24px;height:24px;border:none;border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;margin-left:auto}.al-filter-remove-btn:hover{background:color-mix(in srgb,var(--text-red) 10%,transparent);color:var(--text-red)}.al-filter-add-btn{width:100%;padding:8px;margin-top:8px;border:1px dashed var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;transition:all .15s}.al-filter-add-btn:hover{border-color:var(--interactive-accent);color:var(--interactive-accent);background:color-mix(in srgb,var(--interactive-accent) 5%,transparent)}
      .al-board-column-footer{padding:8px;border-top:1px dashed var(--border-color)}.al-add-goal-btn{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px;border:1px dashed var(--border-color);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:12px;transition:all .15s}.al-add-goal-btn:hover{border-color:var(--interactive-accent);color:var(--interactive-accent);background:var(--background-modifier-hover)}
      .al-add-goal-link{display:block;padding:12px 16px;color:var(--text-muted);cursor:pointer;text-align:center;border-top:1px solid var(--border-color);font-size:13px;transition:all .15s}.al-add-goal-link:hover{color:var(--text-normal);background:var(--background-secondary)}
      .al-detail-fields{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-field-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-color);font-size:14px}.al-field-row:last-child{border-bottom:none}.al-field-row:hover{background:var(--background-modifier-hover)}.al-field-icon{font-size:16px;flex-shrink:0}.al-field-label{color:var(--text-secondary);min-width:80px;flex-shrink:0}.al-field-value{color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-field-editable{cursor:pointer;color:var(--text-muted)}.al-field-editable:hover{color:var(--text-primary)}.al-field-link{color:var(--interactive-accent);cursor:pointer;text-decoration:underline}.al-field-progress{display:flex;align-items:center;gap:8px;flex:1}.al-progress-bar-small{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden;max-width:150px}.al-progress-fill-small{height:100%;background:var(--interactive-accent);border-radius:3px}.al-field-progress-value{font-size:13px;font-weight:600;color:var(--text-primary);min-width:40px}
      .al-detail-cover{width:100%;max-height:300px;overflow:hidden;border-radius:10px;margin-bottom:20px;cursor:pointer}.al-detail-cover img{width:100%;height:100%;object-fit:cover}.al-detail-add-cover{display:flex;align-items:center;gap:12px;padding:12px 16px;border:2px dashed var(--border-color);border-radius:10px;margin-bottom:20px;cursor:pointer;color:var(--text-muted);font-size:14px;transition:all .15s}.al-detail-add-cover:hover{opacity:1;border-color:var(--interactive-accent);background:var(--background-secondary)}
      .al-detail-add-cover .al-field-label{color:var(--text-secondary);min-width:80px}
      .al-field-edit-input,.al-field-edit-select,.al-field-edit-textarea{flex:1;padding:6px 10px;border:1px solid var(--interactive-accent);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px;outline:none;box-sizing:border-box}.al-field-edit-select{max-width:150px}.al-field-edit-textarea{min-height:60px;resize:vertical}
      .al-detail-description-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-detail-description-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color)}.al-detail-description-icon{font-size:16px}.al-detail-description-title{font-size:13px;font-weight:600;color:var(--text-secondary)}.al-detail-description-content{padding:16px;color:var(--text-muted);font-size:14px;line-height:1.6;cursor:pointer;min-height:60px}.al-detail-description-content:hover{color:var(--text-primary)}.al-detail-description-block .al-field-edit-textarea{width:100%;max-width:none}
      .al-progress-slider-container{display:flex;align-items:center;gap:12px;width:100%;max-width:280px}.al-progress-slider{-webkit-appearance:none;width:100%;height:6px;border-radius:3px;background:var(--background-modifier-border);outline:none}.al-progress-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--interactive-accent);cursor:pointer;border:2px solid var(--background-primary);box-shadow:0 2px 4px rgba(0,0,0,0.2)}.al-progress-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--interactive-accent);cursor:pointer;border:2px solid var(--background-primary);box-shadow:0 2px 4px rgba(0,0,0,0.2)}.al-progress-value{font-size:14px;font-weight:500;color:var(--text-primary);min-width:40px;text-align:right}
      .al-detail-tasks-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-detail-tasks-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color)}.al-detail-tasks-icon{font-size:16px}.al-detail-tasks-title{font-size:13px;font-weight:600;color:var(--text-secondary);flex:1}.al-detail-tasks-count{background:var(--interactive-accent);color:#fff;font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px}.al-detail-task-summary{display:flex;gap:20px;padding:10px 16px;font-size:12px;color:var(--text-secondary);border-bottom:1px solid var(--border-color)}.al-detail-tasks{display:flex;flex-direction:column;gap:2px;padding:8px 16px}.al-detail-task{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:all .15s}.al-detail-task:hover{background:var(--background-modifier-hover)}.al-detail-task .task-list-item-checkbox{margin:0 8px 0 0;width:16px;height:16px;cursor:pointer;vertical-align:middle;align-self:center}.al-detail-tasks-empty{text-align:center;padding:20px;color:var(--text-muted);font-size:14px}.al-detail-task-title{flex:1;font-size:14px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-detail-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-detail-task-priority{font-size:13px;font-weight:500;flex-shrink:0;min-width:50px;text-align:right}
      .al-detail-references-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-detail-references-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color)}.al-detail-references-icon{font-size:16px}.al-detail-references-title{font-size:13px;font-weight:600;color:var(--text-secondary);flex:1}.al-detail-references-count{background:var(--interactive-accent);color:#fff;font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px}.al-detail-references-content{padding:8px 16px;max-height:280px;overflow-y:auto}.al-detail-references-loading{text-align:center;padding:20px;color:var(--text-muted);font-size:14px}.al-detail-references-empty{text-align:center;padding:20px;color:var(--text-muted);font-size:14px}.al-detail-reference-item{padding:10px 12px;border-radius:6px;cursor:pointer;transition:all .15s;margin-bottom:4px}.al-detail-reference-item:hover{background:var(--background-modifier-hover)}.al-reference-file-info{display:flex;align-items:center;gap:6px;margin-bottom:6px}.al-reference-file-icon{font-size:12px;color:var(--text-muted)}.al-reference-file-name{font-size:12px;color:var(--interactive-accent);font-weight:500}.al-reference-line-number{font-size:11px;color:var(--text-muted);padding:1px 4px;background:var(--background-primary);border-radius:3px}.al-reference-content{font-size:13px;color:var(--text-secondary);line-height:1.5;white-space:pre-wrap;word-break:break-all}.al-reference-highlight{background:color-mix(in srgb,var(--interactive-accent) 20%,transparent);color:var(--interactive-accent);padding:1px 3px;border-radius:3px;font-weight:500}.al-detail-subgoals-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-detail-subgoals-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color)}.al-detail-subgoals-icon{font-size:16px}.al-detail-subgoals-title{font-size:13px;font-weight:600;color:var(--text-secondary);flex:1}.al-detail-subgoals-count{background:var(--interactive-accent);color:#fff;font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px}.al-detail-subgoals-list{padding:8px 16px;max-height:300px;overflow-y:auto}.al-detail-subgoal-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:all .15s;margin-bottom:4px}.al-detail-subgoal-item:hover{background:var(--background-modifier-hover)}.al-subgoal-level{font-size:11px;padding:2px 8px;border-radius:4px;color:#fff;font-weight:600;flex-shrink:0}.al-subgoal-title{font-size:14px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-subgoal-progress{display:flex;align-items:center;gap:8px;flex-shrink:0}.al-subgoal-progress .al-progress-bar-small{flex:1;height:6px;background:var(--background-modifier-border);border-radius:3px;overflow:hidden;max-width:80px}.al-subgoal-progress .al-progress-fill-small{height:100%;background:var(--interactive-accent);border-radius:3px}.al-subgoal-progress span{font-size:12px;color:var(--text-secondary);min-width:40px;text-align:right}.al-detail-subgoals-empty{text-align:center;padding:20px;color:var(--text-muted);font-size:14px}.al-parent-field-row{cursor:pointer}.al-parent-field-row:hover{background:var(--background-modifier-hover)}.al-parent-value{color:var(--text-muted)}.al-parent-value.has-parent{color:var(--interactive-accent);text-decoration:underline}
      .al-gallery-add-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:120px;border:1px dashed var(--border-color);border-radius:10px;color:var(--text-muted);cursor:pointer;transition:all .15s}.al-gallery-add-card:hover{border-color:var(--interactive-accent);color:var(--interactive-accent);background:var(--background-secondary)}.al-gallery-add-card .al-gallery-add-icon{font-size:28px;opacity:.5}.al-gallery-add-card:hover .al-gallery-add-icon{opacity:1}
      .al-modal-task-detail .al-modal-box{max-width:500px;width:90%}.al-modal-task-detail .al-modal-body{padding:20px;max-height:70vh;overflow-y:auto}.al-task-detail-title input{width:100%;font-size:18px;font-weight:600;border:1px solid var(--border-color);border-radius:6px;padding:12px;background:var(--background-primary);color:var(--text-primary);box-sizing:border-box}.al-task-detail-title input:focus{outline:none;border-color:var(--interactive-accent)}.al-task-detail-fields{display:flex;flex-direction:column;gap:12px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)}.al-task-detail-field{display:flex;align-items:center;gap:12px}.al-task-detail-field label{width:100px;flex-shrink:0;font-size:14px;color:var(--text-secondary)}.al-task-detail-field select,.al-task-detail-field input{flex:1;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px}.al-task-detail-field select:focus,.al-task-detail-field input:focus{outline:none;border-color:var(--interactive-accent)}.al-task-detail-desc-section{margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)}.al-task-detail-desc-section label{display:block;font-size:14px;color:var(--text-secondary);margin-bottom:8px}.al-task-detail-desc-section textarea{width:100%;min-height:100px;padding:12px;border:1px solid var(--border-color);border-radius:6px;background:var(--background-primary);color:var(--text-primary);font-size:14px;resize:vertical;box-sizing:border-box}.al-task-detail-desc-section textarea:focus{outline:none;border-color:var(--interactive-accent)}.al-modal-footer{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-top:1px solid var(--border-color);background:var(--background-secondary)}.al-modal-footer .al-btn-danger{background:transparent;border:1px solid var(--text-red);color:var(--text-red);padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px}.al-modal-footer .al-btn-danger:hover{background:var(--text-red);color:#fff}.al-modal-footer .al-btn-secondary{background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px}.al-modal-footer .al-btn-secondary:hover{background:var(--background-modifier-hover)}
      .al-custom-fields{margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-color)}.al-custom-field{display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:4px}.al-custom-field-label{color:var(--text-muted);min-width:60px}.al-custom-field-value{color:var(--text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-custom-tag{display:inline-block;padding:2px 6px;background:var(--background-primary);border-radius:4px;font-size:11px;color:var(--interactive-accent);margin-right:4px}.al-custom-link{color:var(--interactive-accent);text-decoration:none}.al-custom-link:hover{text-decoration:underline}.al-custom-field-cell{font-size:12px;color:var(--text-secondary)}.al-settings-desc{font-size:12px;color:var(--text-muted);margin:4px 0}
      .al-detail-custom-fields-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-detail-custom-fields-header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border-color);cursor:pointer}.al-detail-custom-fields-header:hover{background:var(--background-modifier-hover)}.al-detail-custom-fields-icon{font-size:16px}.al-detail-custom-fields-title{font-size:13px;font-weight:600;color:var(--text-secondary);flex:1}.al-detail-custom-fields-count{background:var(--interactive-accent);color:#fff;font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px}.al-detail-custom-fields-content{padding:12px 16px}.al-custom-field-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:all .15s;margin-bottom:4px}.al-custom-field-item:hover{background:var(--background-modifier-hover)}.al-custom-field-label{font-size:13px;color:var(--text-secondary);min-width:80px;flex-shrink:0}.al-custom-field-value{font-size:14px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-custom-field-value.empty{color:var(--text-muted);font-style:italic}.al-goal-context-menu{display:none;position:fixed;z-index:10000;min-width:180px;padding:4px 0}.al-goal-context-menu.show{display:block}.al-goal-context-menu .menu-item-icon{margin-right:8px}
      .al-progress-management-block{background:var(--background-secondary);border-radius:10px;border:1px solid var(--border-color);margin-bottom:20px;overflow:hidden}.al-progress-management-header{display:flex;align-items:center;gap:8px;padding:12px 16px;cursor:pointer}.al-progress-management-header:hover{background:var(--background-modifier-hover)}.al-progress-management-icon{font-size:16px}.al-progress-management-title{font-size:13px;font-weight:600;color:var(--text-secondary);flex:1}.al-progress-management-toggle-icon{font-size:12px;color:var(--text-muted);transition:transform .2s}.al-progress-management-toggle-icon.collapsed{transform:rotate(-90deg)}.al-progress-management-content{padding:0}.al-progress-management-fields{padding:12px 16px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--border-color)}.al-progress-field-row{display:flex;align-items:center;gap:12px;padding:4px 0}.al-progress-field-label{font-size:14px;color:var(--text-secondary);min-width:80px;flex-shrink:0}.al-progress-field-value{font-size:14px;color:var(--text-primary);flex:1;display:flex;align-items:center;justify-content:flex-start}.al-progress-field-value .al-progress-slider-container{max-width:200px}.al-progress-edit-input{text-align:left!important;justify-content:flex-start!important}.al-subgoals-panel{border-top:1px dashed var(--border-color)}.al-subgoals-panel-header{display:flex;align-items:center;gap:8px;padding:12px 16px;cursor:pointer}.al-subgoals-panel-header:hover{background:var(--background-modifier-hover)}.al-subgoals-toggle-icon{font-size:12px;color:var(--text-muted);transition:transform .2s}.al-subgoals-toggle-icon.expanded{transform:rotate(90deg)}.al-subgoals-panel-title{font-size:13px;color:var(--text-secondary);flex:1}.al-subgoals-count{background:var(--interactive-accent);color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px}.al-subgoals-panel-content{padding:8px 16px 16px}.al-subgoals-list{display:flex;flex-direction:column;gap:8px}.al-subgoal-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--background-primary);border-radius:6px;cursor:pointer;transition:all .15s}.al-subgoal-item:hover{background:var(--background-modifier-hover)}.al-subgoal-level{font-size:10px;padding:2px 6px;border-radius:4px;color:#fff;font-weight:600;flex-shrink:0}.al-subgoal-title{font-size:13px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-subgoal-progress{display:flex;align-items:center;gap:8px;flex-shrink:0}.al-subgoal-progress .al-progress-bar-small{width:60px;height:4px;background:var(--background-modifier-border);border-radius:2px;overflow:hidden}.al-subgoal-progress .al-progress-fill-small{height:100%;background:var(--interactive-accent)}.al-subgoal-progress span{font-size:11px;color:var(--text-muted);min-width:32px;text-align:right}.al-subgoals-empty{text-align:center;padding:16px;color:var(--text-muted);font-size:13px}.al-tasks-panel{border-top:1px dashed var(--border-color)}.al-tasks-panel-header{display:flex;align-items:center;gap:8px;padding:12px 16px;cursor:pointer}.al-tasks-panel-header:hover{background:var(--background-modifier-hover)}.al-tasks-toggle-icon{font-size:12px;color:var(--text-muted);transition:transform .2s}.al-tasks-toggle-icon.expanded{transform:rotate(90deg)}.al-tasks-panel-title{font-size:13px;color:var(--text-secondary);flex:1}.al-tasks-count{background:var(--interactive-accent);color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px}.al-tasks-summary{font-size:11px;color:var(--text-muted);margin-left:auto}.al-tasks-panel-content{padding:8px 16px 16px}.al-tasks-list{display:flex;flex-direction:column;gap:8px}.al-task-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--background-primary);border-radius:6px;cursor:pointer;transition:all .15s}.al-task-item:hover{background:var(--background-modifier-hover)}.al-task-title{font-size:13px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.al-task-title.done{text-decoration:line-through;color:var(--text-muted)}.al-task-priority{font-size:14px;flex-shrink:0}.al-tasks-empty{text-align:center;padding:16px;color:var(--text-muted);font-size:13px}
    `;
    document.head.appendChild(style);
  }
}
