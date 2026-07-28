/**
 * File Storage
 * Handles file operations for goals and tasks
 */

import { App, TFile, CachedMetadata } from 'obsidian';
import { Goal, Task, PluginSettings } from '../types';

export class FileStorage {
  private app: App;
  private settings: PluginSettings;
  
  constructor(app: App, settings: PluginSettings) {
    this.app = app;
    this.settings = settings;
  }
  
  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }
  
  /**
   * 获取插件数据目录
   */
  getDataPath(): string {
    return this.settings.dataPath;
  }
  
  /**
   * 获取目标目录
   */
  getGoalsPath(): string {
    return `${this.settings.dataPath}/goals`;
  }
  
  /**
   * 获取任务目录
   */
  getTasksPath(): string {
    return `${this.settings.dataPath}/tasks`;
  }
  
  /**
   * 确保目录存在
   */
  async ensureDirectory(path: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!folder) {
      await this.app.vault.createFolder(path);
    }
  }
  
  /**
   * 确保所有必要目录存在
   */
  async ensureDirectories(): Promise<void> {
    await this.ensureDirectory(this.settings.dataPath);
    await this.ensureDirectory(this.getGoalsPath());
    await this.ensureDirectory(this.getTasksPath());
    await this.ensureDirectory(this.settings.dailyPath);
    await this.ensureDirectory(this.settings.weeklyPath);
    await this.ensureDirectory(this.settings.monthlyPath);
    await this.ensureDirectory(this.settings.yearlyPath);
    await this.ensureDirectory(this.settings.phasePath);
  }
  
  /**
   * 读取文件内容
   */
  async readFile(path: string): Promise<string | null> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return await this.app.vault.read(file);
    }
    return null;
  }
  
  /**
   * 写入文件
   */
  async writeFile(path: string, content: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
    } else {
      await this.app.vault.create(path, content);
    }
  }
  
  /**
   * 创建文件
   */
  async createFile(path: string, content: string): Promise<TFile> {
    return await this.app.vault.create(path, content);
  }
  
  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.delete(file);
    }
  }
  
  /**
   * 获取目录下的所有文件
   */
  getFilesInFolder(folderPath: string): TFile[] {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) return [];
    
    const files: TFile[] = [];
    for (const child of this.app.vault.getAllLoadedFiles()) {
      if (child.path.startsWith(folderPath + '/') && child instanceof TFile) {
        files.push(child);
      }
    }
    
    return files;
  }
  
  /**
   * 获取文件的前缀信息
   */
  getFileCache(file: TFile): CachedMetadata | null {
    return this.app.metadataCache.getFileCache(file);
  }
  
  /**
   * 解析 Markdown 文件的 frontmatter
   */
  parseFrontmatter(file: TFile): Record<string, unknown> {
    const cache = this.getFileCache(file);
    if (cache?.frontmatter) {
      return cache.frontmatter;
    }
    return {};
  }
  
  /**
   * 生成唯一的 ID
   */
  generateId(type: 'goal' | 'task'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${type}-${timestamp}${random}`;
  }
  
  /**
   * 获取日记文件
   */
  getDailyNote(date: string): TFile | null {
    const path = `${this.settings.dailyPath}/${date}.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }
  
  /**
   * 获取周记文件
   */
  getWeeklyNote(weekKey: string): TFile | null {
    const path = `${this.settings.weeklyPath}/${weekKey}.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }
  
  /**
   * 获取月记文件
   */
  getMonthlyNote(yearMonth: string): TFile | null {
    const path = `${this.settings.monthlyPath}/${yearMonth}.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }
  
  /**
   * 获取年记文件
   */
  getYearlyNote(year: string): TFile | null {
    const path = `${this.settings.yearlyPath}/${year}.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }
  
  /**
   * 生成日记路径
   */
  getDailyNotePath(date: string): string {
    return `${this.settings.dailyPath}/${date}.md`;
  }
  
  /**
   * 生成目标文件路径
   */
  getGoalPath(id: string): string {
    return `${this.getGoalsPath()}/${id}.md`;
  }
  
  /**
   * 根据目标标题生成文件路径（用于创建新目标）
   */
  getGoalPathByTitle(title: string): string {
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
    return `${this.getGoalsPath()}/${safeTitle}.md`;
  }
  
  /**
   * 根据目标标题获取目标文件
   */
  getGoalFileByTitle(title: string): TFile | null {
    const path = this.getGoalPathByTitle(title);
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }
  
  /**
   * 根据目标ID获取目标文件
   */
  getGoalFile(id: string): TFile | null {
    const path = this.getGoalPath(id);
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }
  
  /**
   * 生成任务文件路径
   */
  getTaskPath(id: string): string {
    return `${this.getTasksPath()}/${id}.md`;
  }
  
  /**
   * 获取引用目标文件的反向链接
   */
  async getBacklinksForGoal(goalId: string): Promise<Array<{
    file: TFile;
    content: string;
    lines: number[];
  }>> {
    const goalPath = this.getGoalPath(goalId);
    const goalFile = this.app.vault.getAbstractFileByPath(goalPath);
    
    if (!(goalFile instanceof TFile)) {
      return [];
    }
    
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    const result: Array<{
      file: TFile;
      content: string;
      lines: number[];
    }> = [];
    
    for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
      if (links[goalPath]) {
        const file = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) continue;
        
        const fileContent = await this.app.vault.read(file);
        const cache = this.app.metadataCache.getFileCache(file);
        const linksArray = cache?.links || [];
        const lines: number[] = [];
        
        for (const link of linksArray) {
          const linkPath = this.app.metadataCache.getFirstLinkpathDest(link.link, sourcePath);
          if (linkPath && linkPath.path === goalPath) {
            lines.push(link.position.start.line);
          }
        }
        
        if (lines.length > 0) {
          result.push({ file, content: fileContent, lines });
        }
      }
    }
    
    return result;
  }

  /**
   * 获取引用任务文件的反向链接
   */
  async getBacklinksForTask(taskId: string): Promise<Array<{
    file: TFile;
    content: string;
    lines: number[];
  }>> {
    const taskPath = this.getTaskPath(taskId);
    const taskFile = this.app.vault.getAbstractFileByPath(taskPath);
    
    if (!(taskFile instanceof TFile)) {
      return [];
    }
    
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    const result: Array<{
      file: TFile;
      content: string;
      lines: number[];
    }> = [];
    
    for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
      if (links[taskPath]) {
        const file = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) continue;
        
        const fileContent = await this.app.vault.read(file);
        const cache = this.app.metadataCache.getFileCache(file);
        const linksArray = cache?.links || [];
        const lines: number[] = [];
        
        for (const link of linksArray) {
          const linkPath = this.app.metadataCache.getFirstLinkpathDest(link.link, sourcePath);
          if (linkPath && linkPath.path === taskPath) {
            lines.push(link.position.start.line);
          }
        }
        
        if (lines.length > 0) {
          result.push({ file, content: fileContent, lines });
        }
      }
    }
    
    return result;
  }
}
