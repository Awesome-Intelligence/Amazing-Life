/**
 * Settings Tab
 * Plugin settings interface
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, TaskField, GoalField, TASK_FIELD_LABELS, GOAL_FIELD_LABELS } from '../types';

export class SettingsTab extends PluginSettingTab {
  private settings: PluginSettings;
  private onSettingsChange: (settings: PluginSettings) => void;
  
  constructor(
    app: App,
    plugin: any,
    settings: PluginSettings,
    onSettingsChange: (settings: PluginSettings) => void
  ) {
    super(app, plugin);
    this.settings = settings;
    this.onSettingsChange = onSettingsChange;
  }
  
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'Amazing Life 设置' });
    
    // 目录设置
    containerEl.createEl('h3', { text: '目录设置' });
    
    new Setting(containerEl)
      .setName('插件数据目录')
      .setDesc('存储目标和任务数据')
      .addText(text => {
        text.setValue(this.settings.dataPath);
        text.onChange(value => {
          this.settings.dataPath = value || DEFAULT_SETTINGS.dataPath;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('封面图目录')
      .setDesc('上传的封面图片存放位置')
      .addText(text => {
        text.setValue(this.settings.coverPath);
        text.onChange(value => {
          this.settings.coverPath = value || DEFAULT_SETTINGS.coverPath;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('日记目录')
      .setDesc('每日日记存放位置')
      .addText(text => {
        text.setValue(this.settings.dailyPath);
        text.onChange(value => {
          this.settings.dailyPath = value || DEFAULT_SETTINGS.dailyPath;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('周记目录')
      .addText(text => {
        text.setValue(this.settings.weeklyPath);
        text.onChange(value => {
          this.settings.weeklyPath = value || DEFAULT_SETTINGS.weeklyPath;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('月记目录')
      .addText(text => {
        text.setValue(this.settings.monthlyPath);
        text.onChange(value => {
          this.settings.monthlyPath = value || DEFAULT_SETTINGS.monthlyPath;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('年记目录')
      .addText(text => {
        text.setValue(this.settings.yearlyPath);
        text.onChange(value => {
          this.settings.yearlyPath = value || DEFAULT_SETTINGS.yearlyPath;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('阶段性记录目录')
      .setDesc('季度/阶段复盘存放位置')
      .addText(text => {
        text.setValue(this.settings.phasePath);
        text.onChange(value => {
          this.settings.phasePath = value || DEFAULT_SETTINGS.phasePath;
          this.onSettingsChange(this.settings);
        });
      });
    
    // 标签设置
    containerEl.createEl('h3', { text: '标签设置' });
    
    new Setting(containerEl)
      .setName('目标标签前缀')
      .setDesc('用于 #目标/xxx 标签')
      .addText(text => {
        text.setValue(this.settings.goalTagPrefix);
        text.onChange(value => {
          this.settings.goalTagPrefix = value || DEFAULT_SETTINGS.goalTagPrefix;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('任务标签前缀')
      .setDesc('用于 #任务/xxx 标签')
      .addText(text => {
        text.setValue(this.settings.taskTagPrefix);
        text.onChange(value => {
          this.settings.taskTagPrefix = value || DEFAULT_SETTINGS.taskTagPrefix;
          this.onSettingsChange(this.settings);
        });
      });
    
    new Setting(containerEl)
      .setName('重要标记')
      .setDesc('用于 #noteworthy 标签')
      .addText(text => {
        text.setValue(this.settings.noteworthyTag);
        text.onChange(value => {
          this.settings.noteworthyTag = value || DEFAULT_SETTINGS.noteworthyTag;
          this.onSettingsChange(this.settings);
        });
      });
    
    // 其他设置
    containerEl.createEl('h3', { text: '其他设置' });
    
    new Setting(containerEl)
      .setName('自动更新进度')
      .setDesc('完成任务时自动更新目标进度')
      .addToggle(toggle => {
        toggle.setValue(this.settings.autoProgressUpdate);
        toggle.onChange(value => {
          this.settings.autoProgressUpdate = value;
          this.onSettingsChange(this.settings);
        });
      });
    
    // 视图字段设置
    containerEl.createEl('h3', { text: '视图字段设置' });
    containerEl.createEl('p', { text: '设置各视图中显示的字段，可多选', cls: 'al-settings-desc' });
    
    // 仪表盘任务字段
    this.createFieldSettings(containerEl, '仪表盘任务', 'dashboard', 'task');
    
    // 看板目标字段
    this.createFieldSettings(containerEl, '看板目标', 'board', 'goal');
    
    // 列表目标字段
    this.createFieldSettings(containerEl, '列表目标', 'list', 'goal');
    
    // 画廊目标字段
    this.createFieldSettings(containerEl, '画廊目标', 'gallery', 'goal');
    
    // 目标详情字段
    this.createFieldSettings(containerEl, '目标详情', 'goal', 'goal');
  }
  
  private createFieldSettings(
    container: HTMLElement,
    title: string,
    viewKey: 'dashboard' | 'board' | 'list' | 'gallery' | 'goal',
    type: 'task' | 'goal'
  ): void {
    let fields: (TaskField | GoalField)[];
    let labels: Record<string, string>;
    let currentFields: (TaskField | GoalField)[];
    
    if (type === 'task') {
      fields = Object.keys(TASK_FIELD_LABELS) as TaskField[];
      labels = TASK_FIELD_LABELS;
      currentFields = this.settings.viewFields[viewKey] as TaskField[];
    } else {
      fields = Object.keys(GOAL_FIELD_LABELS) as GoalField[];
      labels = GOAL_FIELD_LABELS;
      currentFields = this.settings.viewFields[viewKey] as GoalField[];
    }
    
    const setting = new Setting(container)
      .setName(title)
      .setDesc('选择显示的字段');
    
    const fieldsContainer = setting.descEl.createDiv('al-fields-container');
    fieldsContainer.style.marginTop = '8px';
    fieldsContainer.style.display = 'flex';
    fieldsContainer.style.flexWrap = 'wrap';
    fieldsContainer.style.gap = '6px';
    
    fields.forEach(field => {
      const isSelected = currentFields.includes(field);
      const btn = fieldsContainer.createEl('button', {
        text: labels[field],
        cls: `al-field-btn ${isSelected ? 'selected' : ''}`
      });
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '4px';
      btn.style.border = isSelected ? '1px solid var(--interactive-accent)' : '1px solid var(--border-color)';
      btn.style.background = isSelected ? 'var(--interactive-accent)' : 'transparent';
      btn.style.color = isSelected ? '#fff' : 'var(--text-normal)';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '12px';
      
      btn.addEventListener('click', () => {
        if (isSelected) {
          if (currentFields.length > 1) {
            this.settings.viewFields[viewKey] = currentFields.filter(f => f !== field) as any;
          }
        } else {
          this.settings.viewFields[viewKey] = [...currentFields, field] as any;
        }
        this.onSettingsChange(this.settings);
        this.display();
      });
    });
  }
}
