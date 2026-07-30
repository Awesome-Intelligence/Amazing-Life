/**
 * Settings Tab
 * Plugin settings interface
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, CustomFieldConfig } from '../types';

export class SettingsTab extends PluginSettingTab {
  private settings: PluginSettings;
  private onSettingsChange: (settings: PluginSettings) => void;
  private plugin: any;
  
  constructor(
    app: App,
    plugin: any,
    settings: PluginSettings,
    onSettingsChange: (settings: PluginSettings) => void
  ) {
    super(app, plugin);
    this.settings = settings;
    this.onSettingsChange = onSettingsChange;
    this.plugin = plugin;
  }
  
  // 获取所有目标中发现的非系统字段
  private getDiscoveredCustomFields(): CustomFieldConfig[] {
    const systemFields = [
      'A-id', 'A-type', 'A-title', 'A-level', 'A-parent', 'A-status',
      'A-progress', 'A-weight', 'A-start', 'A-due', 'A-description',
      'A-cover', 'A-created', 'A-updated'
    ];
    
    const discoveredFields = new Map<string, { key: string; label: string; type: string }>();
    
    try {
      const goals = this.plugin.getGoalManager().getAllGoals();
      
      for (const goal of goals) {
        for (const [key, value] of Object.entries(goal)) {
          // 跳过系统字段
          if (systemFields.includes(key)) continue;
          // 跳过已经是自定义字段配置的
          if (this.settings.customGoalFields.some(f => f.key === key)) continue;
          
          // 推断字段类型
          let type = 'text';
          if (typeof value === 'number') type = 'number';
          else if (key.toLowerCase().includes('color')) type = 'color';
          else if (key.toLowerCase().includes('tag')) type = 'tags';
          else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) type = 'date';
          else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) type = 'url';
          
          // 生成标签（美化字段名）
          const label = key
            .replace(/^custom-/, '')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
          
          discoveredFields.set(key, { key, label, type });
        }
      }
    } catch (e) {
      console.warn('无法获取目标自定义字段:', e);
    }
    
    return Array.from(discoveredFields.values()).map(f => ({
      key: f.key,
      label: f.label,
      type: f.type as 'text' | 'number' | 'color' | 'tags' | 'date' | 'url',
      showInViews: ['gallery', 'list', 'board']
    }));
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
    
    // 自定义字段设置
    containerEl.createEl('h3', { text: '自定义字段' });
    containerEl.createEl('p', { text: '自动发现的目标自定义字段（需要在目标文件中添加这些字段）', cls: 'al-settings-desc' });
    
    const discoveredFields = this.getDiscoveredCustomFields();
    
    if (discoveredFields.length === 0) {
      containerEl.createEl('p', { text: '暂无发现的自定义字段。请在目标文件中添加 frontmatter 字段。', cls: 'al-settings-desc' });
    } else {
      // 显示发现的自定义字段
      const customFieldsContainer = containerEl.createDiv('al-custom-fields-container');
      customFieldsContainer.style.marginBottom = '16px';
      
      discoveredFields.forEach(field => {
        const isEnabled = this.settings.customGoalFields.some(f => f.key === field.key);
        const fieldEl = customFieldsContainer.createDiv('al-custom-field-item');
        fieldEl.style.display = 'flex';
        fieldEl.style.alignItems = 'center';
        fieldEl.style.gap = '8px';
        fieldEl.style.padding = '8px';
        fieldEl.style.borderBottom = '1px solid var(--border-color)';
        
        const checkbox = fieldEl.createEl('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isEnabled;
        checkbox.style.cursor = 'pointer';
        
        const label = fieldEl.createEl('span');
        label.textContent = `${field.label} (${field.key})`;
        label.style.flex = '1';
        
        const typeBadge = fieldEl.createEl('span');
        typeBadge.textContent = field.type;
        typeBadge.style.fontSize = '11px';
        typeBadge.style.padding = '2px 6px';
        typeBadge.style.background = 'var(--background-secondary)';
        typeBadge.style.borderRadius = '4px';
        typeBadge.style.color = 'var(--text-secondary)';
        
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            // 添加到配置
            if (!this.settings.customGoalFields.some(f => f.key === field.key)) {
              this.settings.customGoalFields.push(field);
            }
          } else {
            // 从配置中移除
            this.settings.customGoalFields = this.settings.customGoalFields.filter(f => f.key !== field.key);
          }
          this.onSettingsChange(this.settings);
        });
      });
    }
  }
}
