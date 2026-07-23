/**
 * Note Manager
 * Manages daily, weekly, monthly, yearly notes
 */

import { FileStorage } from '../../storage/FileStorage';
import { PluginSettings } from '../../types';

export class NoteManager {
  constructor(
    private storage: FileStorage,
    private settings: PluginSettings
  ) {}
  
  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }
  
  /**
   * 获取今天的日期字符串
   */
  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  /**
   * 获取当前周键 (如 2026-W29)
   */
  getCurrentWeekKey(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }
  
  /**
   * 获取当前年月字符串 (如 2026-07)
   */
  getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  
  /**
   * 获取当前年份字符串
   */
  getCurrentYear(): string {
    return new Date().getFullYear().toString();
  }
  
  /**
   * 获取日记文件
   */
  async getDailyNote(date: string) {
    return this.storage.getDailyNote(date);
  }
  
  /**
   * 获取日记内容
   */
  async getDailyNoteContent(date: string): Promise<string | null> {
    return this.storage.readFile(this.storage.getDailyNotePath(date));
  }
  
  /**
   * 获取或创建今日日记
   */
  async getOrCreateTodayNote(): Promise<string> {
    const today = this.getToday();
    return this.getOrCreateDailyNote(today);
  }
  
  /**
   * 获取或创建指定日期的日记
   */
  async getOrCreateDailyNote(date: Date | string): Promise<string> {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const content = await this.getDailyNoteContent(dateStr);
    
    if (content !== null) {
      return content;
    }
    
    const newContent = this.generateDailyNoteTemplate(dateStr);
    await this.storage.createFile(this.storage.getDailyNotePath(dateStr), newContent);
    return newContent;
  }
  
  /**
   * 生成日记模板
   */
  private generateDailyNoteTemplate(date: string): string {
    const dateObj = new Date(date);
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()];
    
    return `---
date: ${date}
weekday: ${weekday}
---

# ${date} ${weekday}

## 今日计划


## 完成任务


## 记录


## 明日计划

`;
  }
  
  /**
   * 获取周记文件
   */
  async getWeeklyNote(weekKey: string) {
    return this.storage.getWeeklyNote(weekKey);
  }
  
  /**
   * 获取月记文件
   */
  async getMonthlyNote(yearMonth: string) {
    return this.storage.getMonthlyNote(yearMonth);
  }
  
  /**
   * 获取年记文件
   */
  async getYearlyNote(year: string) {
    return this.storage.getYearlyNote(year);
  }
  
  /**
   * 生成周记模板
   */
  async getOrCreateWeeklyNote(weekKey: string): Promise<string> {
    const file = await this.storage.getWeeklyNote(weekKey);
    if (file) {
      return await this.storage.readFile(file.path) || '';
    }
    
    const content = this.generateWeeklyNoteTemplate(weekKey);
    await this.storage.createFile(`${this.settings.weeklyPath}/${weekKey}.md`, content);
    return content;
  }
  
  private generateWeeklyNoteTemplate(weekKey: string): string {
    return `---
A-type: weekly
A-week: ${weekKey}
---

# ${weekKey} 周记

## 本周目标


## 本周成就
\`\`\`dataview
TABLE date, substring(source.ctext, 0, 150) as 内容
FROM "${this.settings.dailyPath}"
WHERE contains(source.ctext, "#noteworthy")
SORT date DESC
\`\`\`

## 下周计划

`;
  }
  
  /**
   * 生成月记模板
   */
  async getOrCreateMonthlyNote(yearMonth: string): Promise<string> {
    const file = await this.storage.getMonthlyNote(yearMonth);
    if (file) {
      return await this.storage.readFile(file.path) || '';
    }
    
    const content = this.generateMonthlyNoteTemplate(yearMonth);
    await this.storage.createFile(`${this.settings.monthlyPath}/${yearMonth}.md`, content);
    return content;
  }
  
  private generateMonthlyNoteTemplate(yearMonth: string): string {
    return `---
A-type: monthly
A-month: ${yearMonth}
---

# ${yearMonth} 月记

## 本月目标回顾


## 本月成就
\`\`\`dataview
TABLE date, substring(source.ctext, 0, 150) as 内容
FROM "${this.settings.dailyPath}"
WHERE date >= ${yearMonth}-01 AND date <= ${yearMonth}-31
WHERE contains(source.ctext, "#noteworthy")
SORT date DESC
\`\`\`

## 下月计划

`;
  }
  
  /**
   * 生成年记模板
   */
  async getOrCreateYearlyNote(year: string): Promise<string> {
    const file = await this.storage.getYearlyNote(year);
    if (file) {
      return await this.storage.readFile(file.path) || '';
    }
    
    const content = this.generateYearlyNoteTemplate(year);
    await this.storage.createFile(`${this.settings.yearlyPath}/${year}.md`, content);
    return content;
  }
  
  private generateYearlyNoteTemplate(year: string): string {
    return `---
A-type: yearly
A-year: ${year}
---

# ${year} 年记

## 年度目标


## 年度成就
\`\`\`dataview
TABLE date, substring(source.ctext, 0, 150) as 内容
FROM "${this.settings.dailyPath}"
WHERE date >= ${year}-01-01 AND date <= ${year}-12-31
WHERE contains(source.ctext, "#noteworthy")
SORT date DESC
LIMIT 50
\`\`\`

## 里程碑


## 明年展望

`;
  }
}
