/**
 * Dashboard View - Clean Layout Version with View Switching
 *
 * 主视图类。已将渲染/筛选/弹窗/事件/样式等逻辑拆分至：
 * - ./view-types：类型与常量
 * - ./modals：弹窗类（DeleteConfirmModal / CoverImagePickerModal）
 * - ./filters：FilterHelper（筛选逻辑）
 * - ./renderers/dashboard：DashboardRenderer（仪表盘 + 列表）
 * - ./renderers/board：BoardRenderer（看板 + 拖拽）
 * - ./renderers/gallery：GalleryRenderer（画廊）
 * - ./renderers/detail：DetailRenderer（目标/任务详情 + 空状态）
 * - ./renderers/calendar：CalendarRenderer（日历）
 * - ./view-modals：ViewModals（弹窗 + 字段内联编辑）
 * - ./events：EventManager（事件绑定 + 引用加载）
 * - ./styles：DASHBOARD_STYLES + inject/remove 函数
 *
 * 本类保留：生命周期、导航、标签页管理、数据访问、字段配置、工具方法、
 * 渲染入口（render）、Markdown 表格渲染、日历跳转、图标设置。
 */

import { ItemView, Notice, setIcon, TFile, Menu, MarkdownRenderer } from 'obsidian';
import { Goal, Task, TaskField, GoalField, FilterCondition, FilterLogic, ViewTab, ViewTabType, getDefaultViewTabs, CustomFieldConfig } from '../types';
import AmazingLife from '../main';
import { DASHBOARD_VIEW_TYPE } from './view-types';
import type { ViewType, CalendarViewMode, DashboardTaskMode } from './view-types';
import { DeleteConfirmModal, CoverImagePickerModal } from './modals';
import { FilterHelper } from './filters';
import { DashboardRenderer } from './renderers/dashboard';
import { BoardRenderer } from './renderers/board';
import { GalleryRenderer } from './renderers/gallery';
import { DetailRenderer } from './renderers/detail';
import { ContactRenderer } from './renderers/contacts';
import { CalendarRenderer } from './renderers/calendar';
import { ViewModals } from './view-modals';
import { EventManager } from './events';
import { injectDashboardStyles, removeDashboardStyles } from './styles';

// 为兼容 main.ts 的 `import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/DashboardView'`，
// 重新导出常量。
export { DASHBOARD_VIEW_TYPE } from './view-types';

export class DashboardView extends ItemView {
  public plugin: AmazingLife;
  public currentView: ViewType = 'dashboard';
  public selectedGoalId: string | null = null;
  public selectedTaskId: string | null = null;
  public selectedContactId: string | null = null;  public calendarMode: CalendarViewMode = 'day';
  public calendarDate: Date = new Date();
  public dashboardTaskMode: DashboardTaskMode = 'overdue';
  public selectedWeekStart: string | null = null;
  public selectedMonth: string | null = null;
  public selectedYear: string | null = null;
  public selectedDay: string | null = null;
  // 拖拽相关
  public draggingGoalId: string | null = null;
  public draggingGoalEl: HTMLElement | null = null;
  public dragGhost: HTMLElement | null = null;
  public dropTargetColumn: string | null = null;
  public dropTargetColumnType: string | null = null;
  // 导航历史
  private viewHistory: Array<{ view: ViewType; goalId?: string | null; taskId?: string | null; contactId?: string | null }> = [];
  // 临时筛选状态（用于渲染和事件处理）
  public tempFilterConditions: FilterCondition[] = [];
  public tempFilterLogic: FilterLogic = 'and';
  public tempShowFilterBuilder: boolean = false;
  public tempFilterModified: boolean = false;  // 标记是否有未保存的修改
  public tempFilterEditingId: string | null = null;  // 当前正在编辑的条件ID
  public tempFilterContactQuery: string = '';  // 联系人搜索关键字（视图内临时状态）

  // 各渲染/工具 helper（组合方式持有）
  public filterHelper: FilterHelper;
  public dashboardRenderer: DashboardRenderer;
  public boardRenderer: BoardRenderer;
  public galleryRenderer: GalleryRenderer;
  public detailRenderer: DetailRenderer;
  public calendarRenderer: CalendarRenderer;
  public contactRenderer: ContactRenderer;
  public modalHelper: ViewModals;
  public eventHelper: EventManager;

  // 生成唯一ID
  public generateFilterId(): string {
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
    this.contactRenderer = new ContactRenderer(this);
    this.modalHelper = new ViewModals(this);
    this.eventHelper = new EventManager(this);
  }

  getViewType(): string { return DASHBOARD_VIEW_TYPE; }
  getDisplayText(): string { return 'Amazing Life'; }
  getIcon(): string { return 'target'; }

  async onOpen(): Promise<void> { await this.loadAndRender(); }
  async onClose(): Promise<void> { removeDashboardStyles(); }

  async loadAndRender(): Promise<void> {
    try {
      await this.plugin.getGoalManager().loadGoals();
      await this.plugin.getTaskManager().loadTasks();
      await this.plugin.getContactManager().loadContacts();
      this.render();
    } catch (error) {
      new Notice('加载数据失败: ' + (error as Error).message);
    }
  }

  // 导航到新页面并记录历史
  public navigateTo(view: ViewType, goalId: string | null = null, taskId: string | null = null, contactId: string | null = null): void {
    // 记录当前状态到历史
    this.viewHistory.push({
      view: this.currentView,
      goalId: this.selectedGoalId,
      taskId: this.selectedTaskId,
      contactId: this.selectedContactId
    });

    // 限制历史记录数量
    if (this.viewHistory.length > 20) {
      this.viewHistory.shift();
    }

    // 导航到新页面
    this.currentView = view;
    this.selectedGoalId = goalId;
    this.selectedTaskId = taskId;
    this.selectedContactId = contactId;
    this.render();
  }

  // 返回上一页
  public goBack(): void {
    if (this.viewHistory.length > 0) {
      const prevState = this.viewHistory.pop()!;
      this.currentView = prevState.view;
      this.selectedGoalId = prevState.goalId ?? null;
      this.selectedTaskId = prevState.taskId ?? null;
      this.selectedContactId = prevState.contactId ?? null;
      this.render();
    } else {
      // 没有历史记录，返回仪表盘
      this.currentView = 'dashboard';
      this.selectedGoalId = null;
      this.selectedTaskId = null;
      this.selectedContactId = null;
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
    // 一次性迁移：过滤掉旧的 contacts-* 标签页（已从默认配置中移除）
    const stale = settings.viewTabs.filter(t => (t.type as string) === 'contacts-list' || (t.type as string) === 'contacts-board' || (t.type as string) === 'contacts-gallery');
    if (stale.length > 0) {
      settings.viewTabs = settings.viewTabs.filter(t => (t.type as string) !== 'contacts-list' && (t.type as string) !== 'contacts-board' && (t.type as string) !== 'contacts-gallery');
      // 若当前激活的标签被移除，重置为第一个剩余标签或仪表盘
      if (settings.activeTabId && !settings.viewTabs.some(t => t.id === settings.activeTabId)) {
        settings.activeTabId = settings.viewTabs[0]?.id;
      }
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
  public switchTab(tabId: string): void {
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
      this.tempFilterModified = false;  // 切换标签时重置修改状态
      this.tempFilterEditingId = null;
    }
    this.render();
  }

  // 添加新标签
  public async addTab(type: ViewTabType, name?: string): Promise<void> {
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

  // 显示标签上下文菜单（右键/长按触发）- 使用 Obsidian 原生 Menu，与目标详情页省略号菜单风格一致
  public showTabContextMenu(nameEl: HTMLElement, tabId: string, event?: MouseEvent): void {
    event?.preventDefault();

    const menu = new Menu();
    menu.setUseNativeMenu(true);

    menu.addItem((item) => {
      item.setTitle('复制视图')
        .setIcon('copy')
        .onClick(async () => {
          await this.duplicateTab(tabId);
        });
    });

    menu.addItem((item) => {
      item.setTitle('重命名')
        .setIcon('pencil')
        .onClick(() => {
          this.editTabName(nameEl, tabId);
        });
    });

    menu.addItem((item) => {
      item.setTitle('删除视图')
        .setIcon('trash-2')
        .onClick(() => {
          this.removeTab(tabId);
        });
    });

    const rect = nameEl.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
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
  public async updateActiveTabFilters(conditions: FilterCondition[], logic: FilterLogic): Promise<void> {
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
  public async updateActiveTabGroupBy(groupBy: string | null): Promise<void> {
    const settings = this.plugin.getSettings();
    const tabs = this.getViewTabs();
    const activeTab = this.getActiveTab();

    if (activeTab) {
      const tabIndex = tabs.findIndex(t => t.id === activeTab.id);
      if (tabIndex !== -1) {
        tabs[tabIndex].groupBy = (groupBy as any) || undefined;
        settings.viewTabs = tabs;
        await this.plugin.saveSettings();
      }
    }
  }

  // 获取当前标签的筛选条件
  public getCurrentFilters(): { conditions: FilterCondition[]; logic: FilterLogic; groupBy: string | null } {
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

  public getCurrentViewType(): 'dashboard' | 'board' | 'gallery' | 'list' | 'goal' | 'contact' {
    if (this.currentView === 'board') return 'board';
    if (this.currentView === 'gallery') return 'gallery';
    if (this.currentView === 'goal-detail') return 'goal';
    if (this.currentView === 'list') return 'list';
    if (this.currentView === 'contact-detail') return 'contact';
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
    const importantTasks = this.plugin.getTaskManager().getImportantTasks();
    const focusGoals = allGoals
      .filter(goal => goal['A-starred'] === true)
      .sort((a, b) => (b['A-weight'] - a['A-weight']) || (b['A-progress'] - a['A-progress']));

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
          ${this.renderCurrentView(allGoals, allTasks, todayTasks, overdueTasks, importantTasks, focusGoals)}
        </div>
      </div>
    `;

     this.eventHelper.bindEvents();
     injectDashboardStyles();
    this.setTabIcons();
    this.eventHelper.loadGoalReferences();
    this.eventHelper.loadTaskReferences();
    void this.eventHelper.loadContactInteractions();
    void this.renderMarkdownTables();
  }

  private async renderMarkdownTables(): Promise<void> {
    if (this.currentView !== 'list') return;

    const placeholders = Array.from(
      this.containerEl.querySelectorAll<HTMLElement>('.al-markdown-placeholder')
    );

    for (const el of placeholders) {
      const markdown = decodeURIComponent(el.getAttribute('data-markdown') || '');
      const isContactTable = el.hasAttribute('data-contact-ids');
      const ids = (
        el.getAttribute(isContactTable ? 'data-contact-ids' : 'data-goal-ids') || ''
      ).split(',');

      el.innerHTML = '';
      await MarkdownRenderer.renderMarkdown(markdown, el, '', this.plugin);

      // The view may have been re-rendered while MarkdownRenderer was awaiting.
      if (!el.isConnected) continue;

      const rows = el.querySelectorAll<HTMLElement>('tbody tr');
      rows.forEach((row, index) => {
        row.style.cursor = 'pointer';
        row.style.transition = 'background 0.15s';
        row.addEventListener('mouseenter', () => {
          row.style.background = 'var(--background-modifier-hover)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = '';
        });
        row.addEventListener('click', () => {
          const id = ids[index];
          if (!id) return;
          if (isContactTable) {
            this.navigateTo('contact-detail', null, null, id);
          } else {
            this.navigateTo('goal-detail', id, null);
          }
        });
      });
    }
  }

  private renderCurrentView(allGoals: Goal[], allTasks: Task[], todayTasks: Task[], overdueTasks: Task[], importantTasks: Task[], focusGoals: Goal[]): string {
    const cm = this.plugin.getContactManager();
    const contactStats = cm.getStats();
    const recentContacts = cm.getAllContacts().slice().sort((a, b) => (b['A-updated'] || '').localeCompare(a['A-updated'] || ''));
    return this.routeRender(allGoals, allTasks, todayTasks, overdueTasks, importantTasks, focusGoals, recentContacts, contactStats.upcomingBirthdays, contactStats.needContact);
  }

  private routeRender(allGoals: Goal[], allTasks: Task[], todayTasks: Task[], overdueTasks: Task[], importantTasks: Task[], focusGoals: Goal[], recentContacts: import('../types').Contact[], upcomingBdays: import('../types').Contact[], needContact: import('../types').Contact[]): string {
    // 对目标进行筛选
    const filteredGoals = this.filterHelper.applyFilterConditions(allGoals);

    switch (this.currentView) {
      case 'goal-detail': return this.selectedGoalId ? this.detailRenderer.renderGoalDetailView(this.selectedGoalId) : this.dashboardRenderer.renderDashboardView(todayTasks, overdueTasks, importantTasks, focusGoals, this.dashboardTaskMode, recentContacts, upcomingBdays, needContact);
      case 'task-detail': return this.selectedTaskId ? this.detailRenderer.renderTaskDetailView(this.selectedTaskId) : this.dashboardRenderer.renderDashboardView(todayTasks, overdueTasks, importantTasks, focusGoals, this.dashboardTaskMode, recentContacts, upcomingBdays, needContact);
      case 'list': return this.dashboardRenderer.renderListView(filteredGoals, allTasks);
      case 'board': return this.boardRenderer.renderBoardView(filteredGoals, allTasks);
      case 'gallery': return this.galleryRenderer.renderGalleryView(filteredGoals, allTasks);
      case 'contact-detail': return this.selectedContactId ? this.contactRenderer.renderContactDetailView(this.selectedContactId) : this.dashboardRenderer.renderDashboardView(todayTasks, overdueTasks, importantTasks, focusGoals, this.dashboardTaskMode, recentContacts, upcomingBdays, needContact);
      default: return this.dashboardRenderer.renderDashboardView(todayTasks, overdueTasks, importantTasks, focusGoals, this.dashboardTaskMode, recentContacts, upcomingBdays, needContact);
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

  private async openTodayNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateTodayNote(); new Notice('今日日记已打开'); } catch (error) { new Notice('打开日记失败'); } }
  private async openWeeklyNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateWeeklyNote(this.plugin.getNoteManager().getCurrentWeekKey()); new Notice('本周周记已打开'); } catch (error) { new Notice('打开周记失败'); } }
  private async openMonthlyNote(): Promise<void> { try { await this.plugin.getNoteManager().getOrCreateMonthlyNote(this.plugin.getNoteManager().getCurrentYearMonth()); new Notice('本月月记已打开'); } catch (error) { new Notice('打开月记失败'); } }

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
}
