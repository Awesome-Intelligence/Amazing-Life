/**
 * Settings Tab
 * Plugin settings interface
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from '../types';

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
  
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    new Setting(containerEl).setName('Amazing Life 设置').setHeading();
    
    // 目录设置
    new Setting(containerEl).setName('目录设置').setHeading();
    
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
    new Setting(containerEl).setName('标签设置').setHeading();
    
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
    

    // 联系人设置
    new Setting(containerEl).setName('联系人设置').setHeading();

    new Setting(containerEl)
      .setName('联系人目录')
      .setDesc('存储联系人数据')
      .addText(text => {
        text.setValue(this.settings.contactPath);
        text.onChange(value => {
          this.settings.contactPath = value || DEFAULT_SETTINGS.contactPath;
          this.onSettingsChange(this.settings);
        });
      });

    new Setting(containerEl)
      .setName('联系人标签前缀')
      .setDesc('用于 #人脉/xxx 标签')
      .addText(text => {
        text.setValue(this.settings.contactTagPrefix);
        text.onChange(value => {
          this.settings.contactTagPrefix = value || DEFAULT_SETTINGS.contactTagPrefix;
          this.onSettingsChange(this.settings);
        });
      });

    new Setting(containerEl)
      .setName('默认联系间隔')
      .setDesc('新建联系人时，多少天没联系就提醒（天）')
      .addText(text => {
        text.inputEl.type = 'number';
        text.setValue(String(this.settings.contactDefaultInterval));
        text.onChange(value => {
          const n = parseInt(value, 10);
          this.settings.contactDefaultInterval = isNaN(n) ? 90 : n;
          this.onSettingsChange(this.settings);
        });
      });

    new Setting(containerEl)
      .setName('关系类型')
      .setDesc('逗号分隔，如：家人,朋友,同事,客户,导师,同学,其他')
      .addText(text => {
        text.setValue((this.settings.contactRelations || []).join(','));
        text.onChange(value => {
          this.settings.contactRelations = value.split(',').map(s => s.trim()).filter(Boolean);
          this.onSettingsChange(this.settings);
        });
      });

    // 其他设置
    new Setting(containerEl).setName('其他设置').setHeading();
    
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
