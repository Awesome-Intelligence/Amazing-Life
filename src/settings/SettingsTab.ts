/**
 * Settings Tab
 * Plugin settings interface
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from '../types';

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
  }
}
