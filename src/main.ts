/**
 * Amazing Life - Main Plugin Entry
 * V0.1 - Core life management plugin for Obsidian
 */

import { App, Plugin, Notice, WorkspaceLeaf } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from './types';
import { TagParser } from './core/Tags/TagParser';
import { FileStorage } from './storage/FileStorage';
import { GoalManager } from './core/Goals/GoalManager';
import { TaskManager } from './core/Tasks/TaskManager';
import { NoteManager } from './core/Notes/NoteManager';
import { ContactManager } from './core/Contacts/ContactManager';
import { SettingsTab } from './settings/SettingsTab';
import { DashboardView, DASHBOARD_VIEW_TYPE } from './views/DashboardView';

export default class AmazingLife extends Plugin {
  private lifeSettings!: PluginSettings;
  private storage!: FileStorage;
  private tagParser!: TagParser;
  private goalManager!: GoalManager;
  private taskManager!: TaskManager;
  private noteManager!: NoteManager;
  private contactManager!: ContactManager;
  
  async onload(): Promise<void> {
    console.log('Amazing Life loaded');
    
    // Load settings
    this.lifeSettings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    
    // Initialize components
    this.initializeComponents();
    
    // 设置 GoalManager 的 settings 保存回调（用于自动清理未使用的自定义字段）
    this.goalManager.setOnSettingsChange(async (settings) => {
      this.lifeSettings = settings;
      await this.saveData(this.lifeSettings);
    });
    
    // Register dashboard view
    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    
    // Add settings tab
    this.addSettingTab(new SettingsTab(
      this.app,
      this,
      this.lifeSettings,
      async (newSettings) => {
        this.lifeSettings = newSettings;
        await this.saveData(this.lifeSettings);
        
        // Update components with new settings
        this.storage.updateSettings(this.lifeSettings);
        this.tagParser.updatePatterns(this.lifeSettings);
        this.goalManager.updateSettings(this.lifeSettings);
        this.taskManager.updateSettings(this.lifeSettings);
        this.noteManager.updateSettings(this.lifeSettings);
        this.contactManager.updateSettings(this.lifeSettings);
        
        new Notice('设置已保存');
      }
    ));
    
    // Add ribbon icon
    this.addRibbonIcon('target', 'Amazing Life', () => {
      this.showDashboard();
    });
    
    // Add command: Open dashboard
    this.addCommand({
      id: 'open-dashboard',
      name: '打开仪表盘',
      callback: () => this.showDashboard()
    });
    
    // Add command: Create goal
    this.addCommand({
      id: 'create-goal',
      name: '创建目标',
      callback: () => this.showCreateGoalModal()
    });
    
    // Add command: Create task
    this.addCommand({
      id: 'create-task',
      name: '创建任务',
      callback: () => this.showCreateTaskModal()
    });
    
    // Add command: Show today's tasks
    this.addCommand({
      id: 'show-today-tasks',
      name: '今日任务',
      callback: () => this.showTodayTasks()
    });
    
    // Add command: Open today note
    this.addCommand({
      id: 'open-today-note',
      name: '打开今日日记',
      callback: () => this.openTodayNote()
    });
    
    // Initialize directories
    await this.storage.ensureDirectories();
    
    // Load data
    await this.goalManager.loadGoals();
    await this.taskManager.loadTasks();
    await this.contactManager.loadContacts();
  }
  
  onunload(): void {}
  
  private initializeComponents(): void {
    this.storage = new FileStorage(this.app, this.lifeSettings);
    this.tagParser = new TagParser(this.lifeSettings);
    this.goalManager = new GoalManager(this.storage, this.lifeSettings);
    this.taskManager = new TaskManager(this.storage, this.lifeSettings);
    this.noteManager = new NoteManager(this.storage, this.lifeSettings);
    this.contactManager = new ContactManager(this.storage, this.lifeSettings);
  }
  
  async showDashboard(): Promise<void> {
    const { workspace } = this.app;
    
    // Check if dashboard is already open
    let dashboardLeaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0];
    
    if (!dashboardLeaf) {
      // Create new leaf in main workspace
      dashboardLeaf = workspace.getLeaf('split', 'vertical');
      await dashboardLeaf.setViewState({
        type: DASHBOARD_VIEW_TYPE,
        active: true
      });
    }
    
    // Activate the leaf
    workspace.revealLeaf(dashboardLeaf);
  }
  
  async showCreateGoalModal(): Promise<void> {
    // Open dashboard first, which has the modal
    await this.showDashboard();
  }
  
  async showCreateTaskModal(): Promise<void> {
    // Open dashboard first, which has the modal
    await this.showDashboard();
  }
  
  async showTodayTasks(): Promise<void> {
    const todayTasks = this.taskManager.getTodayTasks();
    const overdueTasks = this.taskManager.getOverdueTasks();
    
    let message = `今日任务: ${todayTasks.length} 个`;
    if (overdueTasks.length > 0) {
      message += ` | 逾期: ${overdueTasks.length} 个`;
    }
    
    new Notice(message);
  }
  
  async openTodayNote(): Promise<void> {
    const today = this.noteManager.getToday();
    const notePath = this.storage.getDailyNotePath(today);
    
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (file) {
      const leaf = this.app.workspace.getLeaf('split', 'vertical');
      await leaf.openFile(file as any);
    } else {
      new Notice('今日日记不存在');
    }
  }
  
  // Getters for components
  getGoalManager(): GoalManager {
    return this.goalManager;
  }
  
  getTaskManager(): TaskManager {
    return this.taskManager;
  }
  
  getNoteManager(): NoteManager {
    return this.noteManager;
  }

  getContactManager(): ContactManager {
    return this.contactManager;
  }
  
  getTagParser(): TagParser {
    return this.tagParser;
  }
  
  getSettings(): PluginSettings {
    return this.lifeSettings;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.lifeSettings);
  }
}
