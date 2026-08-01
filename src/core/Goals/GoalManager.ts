/**
 * Goal Manager
 * Manages goal CRUD operations and progress calculation
 */

import { TFile } from 'obsidian';
import { FileStorage } from '../../storage/FileStorage';
import { Goal, GoalTree, GoalLevel, GoalStatus, Task, PluginSettings } from '../../types';

export interface CreateGoalDTO {
  title: string;
  level: GoalLevel;
  parent?: string | null;
  description?: string;
  due?: string | null;
}

export interface UpdateGoalDTO {
  title?: string;
  description?: string | null;
  due?: string | null;
  status?: GoalStatus;
  progress?: number;
  level?: GoalLevel;
  start?: string;
  weight?: number;
  cover?: string | null;
  parent?: string | null;
  [key: string]: any;  // 支持自定义字段
}

export class GoalManager {
  private goals: Map<string, Goal> = new Map();
  private goalsByLevel: Map<GoalLevel, Goal[]> = new Map();
  
  constructor(
    private storage: FileStorage,
    private settings: PluginSettings
  ) {}
  
  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }
  
  /**
   * 加载所有目标
   */
  async loadGoals(): Promise<void> {
    this.goals.clear();
    this.goalsByLevel.clear();
    
    const files = this.storage.getFilesInFolder(this.storage.getGoalsPath());
    
    for (const file of files) {
      if (file.name === '_index.md') continue;
      
      const content = await this.storage.readFile(file.path);
      if (content) {
        const goal = this.parseGoalFromContent(file, content);
        if (goal) {
          this.goals.set(goal['A-id'], goal);
        }
      }
    }
    
    // 按层级分组
    for (const [id, goal] of this.goals) {
      const levelGoals = this.goalsByLevel.get(goal['A-level']) || [];
      levelGoals.push(goal);
      this.goalsByLevel.set(goal['A-level'], levelGoals);
    }
  }
  
  /**
   * 从文件内容解析目标
   */
  private parseGoalFromContent(file: TFile, fileContent: string): Goal | null {
    const frontmatter = this.parseFrontmatterFromContent(fileContent);
    
    if (frontmatter['A-type'] !== 'goal') {
      return null;
    }
    
    let description = null;
    if (fileContent) {
      const overviewMatch = fileContent.match(/## 概述\s*\n([\s\S]*?)(?=\n## |\n$)/);
      if (overviewMatch) {
        description = overviewMatch[1].trim() || null;
      }
    }
    
    // 构建目标对象，包含所有 frontmatter 字段（支持自定义字段）
    const goal: Goal = {
      'A-id': String(frontmatter['A-id'] || file.basename),
      'A-type': 'goal',
      'A-title': String(frontmatter['A-title'] || ''),
      'A-level': Number(frontmatter['A-level']) as GoalLevel,
      'A-parent': frontmatter['A-parent'] ? String(frontmatter['A-parent']) : null,
      'A-status': (frontmatter['A-status'] || 'active') as GoalStatus,
      'A-progress': Number(frontmatter['A-progress'] || 0),
      'A-weight': Number(frontmatter['A-weight'] || 1),
      'A-start': String(frontmatter['A-start'] || new Date().toISOString().split('T')[0]),
      'A-due': frontmatter['A-due'] ? String(frontmatter['A-due']) : null,
      'A-description': description,
      'A-cover': frontmatter['A-cover'] ? String(frontmatter['A-cover']) : null,
      'A-created': String(frontmatter['A-created'] || ''),
      'A-updated': String(frontmatter['A-updated'] || new Date().toISOString())
    };
    
    // 将所有 frontmatter 字段合并到 goal 对象中（支持自定义字段）
    for (const [key, value] of Object.entries(frontmatter)) {
      if (!(key in goal)) {
        goal[key] = value;
      }
    }
    
    return goal;
  }
  
  /**
   * 直接从文件内容解析 frontmatter
   */
  private parseFrontmatterFromContent(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return result;
    }
    
    const frontmatterContent = frontmatterMatch[1];
    const lines = frontmatterContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }
      
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      result[key] = value;
    }
    
    return result;
  }
  
  /**
   * 创建目标
   */
  async createGoal(dto: CreateGoalDTO): Promise<Goal> {
    // 生成安全的文件名校验
    const safeTitle = dto.title.replace(/[\\/:*?"<>|\s\n\r\t]/g, '_').trim();
    if (!safeTitle) {
      throw new Error('目标名称不能为空');
    }
    
    // 生成唯一ID（用于内部标识，不作为文件名）
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    const id = `${timestamp}${random}`;
    const now = new Date().toISOString().split('T')[0];
    
    const goal: Goal = {
      'A-id': id,
      'A-type': 'goal',
      'A-title': dto.title,
      'A-level': dto.level,
      'A-parent': dto.parent || null,
      'A-status': 'active',
      'A-progress': 0,
      'A-weight': 1,
      'A-start': now,
      'A-due': dto.due || null,
      'A-description': dto.description || null,
      'A-cover': null,
      'A-created': now,
      'A-updated': now
    };
    
    const content = this.generateGoalContent(goal, dto.description);
    // 使用标题作为文件名
    await this.storage.writeFile(this.storage.getGoalPathByTitle(safeTitle), content);
    
    this.goals.set(id, goal);
    
    const levelGoals = this.goalsByLevel.get(dto.level) || [];
    levelGoals.push(goal);
    this.goalsByLevel.set(dto.level, levelGoals);
    
    return goal;
  }
  
  /**
   * 生成目标文件内容
   */
  private generateGoalContent(goal: Goal, description?: string): string {
    const lines: string[] = [
      '---',
      `A-id: ${goal['A-id']}`,
      `A-type: ${goal['A-type']}`,
      `A-title: ${goal['A-title']}`,
      `A-level: ${goal['A-level']}`,
      `A-parent: ${goal['A-parent'] || ''}`,
      `A-status: ${goal['A-status']}`,
      `A-progress: ${goal['A-progress']}`,
      `A-weight: ${goal['A-weight']}`,
      `A-start: ${goal['A-start']}`,
      `A-due: ${goal['A-due'] || ''}`,
      `A-cover: ${goal['A-cover'] || ''}`,
      `A-created: ${goal['A-created']}`,
      `A-updated: ${goal['A-updated']}`,
      '---',
      '',
      `# ${goal['A-title']}`,
      ''
    ];
    
    if (description || goal['A-description']) {
      lines.push('## 概述', '', description || (goal['A-description'] || ''), '');
    }
    
    if (goal['A-parent']) {
      const parentGoal = this.goals.get(goal['A-parent']);
      if (parentGoal) {
        lines.push('## 父目标', '', `- [[${goal['A-parent']}|${parentGoal['A-title']}]]`, '');
      }
    }
    
    lines.push('## 关联任务', '', '## 进度记录', '');
    
    return lines.join('\n');
  }
  
  /**
   * 更新目标
   */
  async updateGoal(id: string, dto: UpdateGoalDTO): Promise<Goal | null> {
    const goal = this.goals.get(id);
    if (!goal) return null;
    
    const now = new Date().toISOString().split('T')[0];
    const oldTitle = goal['A-title'];
    
    if (dto.title !== undefined) goal['A-title'] = dto.title;
    if (dto.description !== undefined) goal['A-description'] = dto.description || null;
    if (dto.due !== undefined) goal['A-due'] = dto.due;
    if (dto.status !== undefined) goal['A-status'] = dto.status;
    if (dto.progress !== undefined) goal['A-progress'] = dto.progress;
    if (dto.level !== undefined) goal['A-level'] = dto.level;
    if (dto.start !== undefined) goal['A-start'] = dto.start;
    if (dto.weight !== undefined) goal['A-weight'] = dto.weight;
    if (dto.cover !== undefined) goal['A-cover'] = dto.cover || null;
    if (dto.parent !== undefined) goal['A-parent'] = dto.parent;
    
    // 处理自定义字段
    const systemFields = ['title', 'description', 'due', 'status', 'progress', 'level', 'start', 'weight', 'cover', 'parent'];
    for (const [key, value] of Object.entries(dto)) {
      if (!systemFields.includes(key)) {
        goal[key] = value;
      }
    }
    
    goal['A-updated'] = now;
    
    // 如果标题变了，需要重命名文件
    const titleChanged = dto.title !== undefined && dto.title !== oldTitle;
    
    const content = await this.storage.readFile(this.storage.getGoalPathByTitle(oldTitle));
    if (content) {
      const updatedContent = this.updateGoalInContent(content, goal);
      if (titleChanged) {
        // 删除旧文件，创建新文件
        const oldSafeTitle = oldTitle.replace(/[\\/:*?"<>|\s\n\r\t]/g, '_').trim();
        const newSafeTitle = goal['A-title'].replace(/[\\/:*?"<>|\s\n\r\t]/g, '_').trim();
        await this.storage.deleteFile(this.storage.getGoalPathByTitle(oldSafeTitle));
        await this.storage.writeFile(this.storage.getGoalPathByTitle(newSafeTitle), updatedContent);
      } else {
        await this.storage.writeFile(this.storage.getGoalPathByTitle(oldTitle), updatedContent);
      }
    }
    
    return goal;
  }
  
  /**
   * 更新文件内容中的目标信息
   */
  private updateGoalInContent(content: string, goal: Goal): string {
    const lines = content.split('\n');
    const updatedLines: string[] = [];
    
    let inFrontmatter = false;
    let inOverview = false;
    let frontmatterEndIndex = -1;
    const frontmatterFields: Record<string, boolean> = {};
    const systemFields = ['A-title', 'A-level', 'A-status', 'A-progress', 'A-due', 'A-start', 'A-weight', 'A-cover', 'A-updated', 'A-description', 'A-id', 'A-created', 'A-parent', 'A-tags'];
    
    for (const line of lines) {
      if (line === '---') {
        updatedLines.push(line);
        inFrontmatter = !inFrontmatter;
        if (!inFrontmatter) {
          frontmatterEndIndex = updatedLines.length - 1;
        }
        continue;
      }
      
      if (inFrontmatter) {
        if (line.startsWith('A-title:')) {
          updatedLines.push(`A-title: ${goal['A-title']}`);
          frontmatterFields['A-title'] = true;
        } else if (line.startsWith('A-level:')) {
          updatedLines.push(`A-level: ${goal['A-level']}`);
          frontmatterFields['A-level'] = true;
        } else if (line.startsWith('A-status:')) {
          updatedLines.push(`A-status: ${goal['A-status']}`);
          frontmatterFields['A-status'] = true;
        } else if (line.startsWith('A-progress:')) {
          updatedLines.push(`A-progress: ${goal['A-progress']}`);
          frontmatterFields['A-progress'] = true;
        } else if (line.startsWith('A-due:')) {
          updatedLines.push(`A-due: ${goal['A-due'] || ''}`);
          frontmatterFields['A-due'] = true;
        } else if (line.startsWith('A-updated:')) {
          updatedLines.push(`A-updated: ${goal['A-updated']}`);
          frontmatterFields['A-updated'] = true;
        } else if (line.startsWith('A-start:')) {
          updatedLines.push(`A-start: ${goal['A-start']}`);
          frontmatterFields['A-start'] = true;
        } else if (line.startsWith('A-weight:')) {
          updatedLines.push(`A-weight: ${goal['A-weight']}`);
          frontmatterFields['A-weight'] = true;
        } else if (line.startsWith('A-cover:')) {
          updatedLines.push(`A-cover: ${goal['A-cover'] || ''}`);
          frontmatterFields['A-cover'] = true;
        } else if (line.startsWith('A-parent:')) {
          updatedLines.push(`A-parent: ${goal['A-parent'] || ''}`);
          frontmatterFields['A-parent'] = true;
        } else {
          updatedLines.push(line);
        }
      } else {
        if (line.startsWith('## 概述')) {
          inOverview = true;
          updatedLines.push(line);
          continue;
        }
        if (line.startsWith('## ') && inOverview) {
          inOverview = false;
          if (goal['A-description']) {
            updatedLines.push('');
            updatedLines.push(goal['A-description']);
            updatedLines.push('');
          }
          updatedLines.push(line);
          continue;
        }
        if (inOverview) {
          continue;
        }
        if (line.startsWith('# ')) {
          updatedLines.push(`# ${goal['A-title']}`);
        } else {
          updatedLines.push(line);
        }
      }
    }
    
    if (inOverview) {
      if (goal['A-description']) {
        updatedLines.push('');
        updatedLines.push(goal['A-description']);
        updatedLines.push('');
      }
    } else if (goal['A-description'] && !updatedLines.some(l => l.startsWith('## 概述'))) {
      updatedLines.push('');
      updatedLines.push('## 概述');
      updatedLines.push('');
      updatedLines.push(goal['A-description']);
      updatedLines.push('');
    }
    
    // 处理自定义字段：在 frontmatter 结束后添加未在文件中的自定义字段
    if (frontmatterEndIndex > 0) {
      for (const [key, value] of Object.entries(goal)) {
        // 跳过系统字段
        if (systemFields.includes(key)) continue;
        // 跳过以 A- 开头的内部字段
        if (key.startsWith('A-')) continue;
        // 如果文件中没有这个字段，添加它
        if (value !== undefined && value !== null && value !== '' && !frontmatterFields[key]) {
          updatedLines.splice(frontmatterEndIndex, 0, `${key}: ${value}`);
          frontmatterEndIndex++;
        }
      }
    }
    
    return updatedLines.join('\n');
  }
  
  /**
   * 删除目标
   */
  async deleteGoal(id: string): Promise<void> {
    const goal = this.goals.get(id);
    if (!goal) return;
    
    const safeTitle = goal['A-title'].replace(/[\\/:*?"<>|\s\n\r\t]/g, '_').trim();
    await this.storage.deleteFile(this.storage.getGoalPathByTitle(safeTitle));
    
    this.goals.delete(id);
    
    const levelGoals = this.goalsByLevel.get(goal['A-level']);
    if (levelGoals) {
      const index = levelGoals.findIndex(g => g['A-id'] === id);
      if (index !== -1) {
        levelGoals.splice(index, 1);
      }
    }
  }
  
  /**
   * 获取目标
   */
  getGoal(id: string): Goal | null {
    return this.goals.get(id) || null;
  }
  
  /**
   * 按层级获取目标
   */
  getGoalsByLevel(level: GoalLevel): Goal[] {
    return this.goalsByLevel.get(level) || [];
  }
  
  /**
   * 获取所有目标
   */
  getAllGoals(): Goal[] {
    return Array.from(this.goals.values());
  }
  
  /**
   * 获取目标对应的文件
   */
  async getGoalFile(id: string): Promise<TFile | null> {
    const goal = this.goals.get(id);
    if (!goal) return null;
    
    const safeTitle = goal['A-title'].replace(/[\\/:*?"<>|\s\n\r\t]/g, '_').trim();
    return this.storage.getGoalFileByTitle(safeTitle);
  }
  
  /**
   * 获取目标树
   */
  getGoalTree(): GoalTree[] {
    const trees: GoalTree[] = [];
    
    // 找出所有顶级目标 (level 1 或没有父目标)
    for (const goal of this.goals.values()) {
      if (goal['A-level'] === 1 || !goal['A-parent']) {
        trees.push(this.buildGoalTree(goal));
      }
    }
    
    return trees;
  }
  
  /**
   * 构建目标树
   */
  private buildGoalTree(goal: Goal): GoalTree {
    const children: GoalTree[] = [];
    
    // 查找子目标
    for (const g of this.goals.values()) {
      if (g['A-parent'] === goal['A-id']) {
        children.push(this.buildGoalTree(g));
      }
    }
    
    return {
      goal,
      children,
      tasks: [], // 稍后填充
      aggregatedProgress: this.calculateAggregatedProgress(goal, children)
    };
  }
  
  /**
   * 计算聚合进度
   */
  private calculateAggregatedProgress(goal: Goal, children: GoalTree[]): number {
    if (children.length === 0) {
      return goal['A-progress'];
    }
    
    let totalWeight = goal['A-weight'];
    let weightedProgress = goal['A-progress'] * goal['A-weight'];
    
    for (const child of children) {
      totalWeight += child.goal['A-weight'];
      weightedProgress += child.aggregatedProgress * child.goal['A-weight'];
    }
    
    return Math.round(weightedProgress / totalWeight);
  }
  
  /**
   * 根据任务更新目标进度
   */
  async updateProgressFromTasks(goalId: string, tasks: Task[]): Promise<number> {
    const goalTasks = tasks.filter(t => t['A-goal'] === goalId);
    
    if (goalTasks.length === 0) {
      return 0;
    }
    
    const completed = goalTasks.filter(t => t['A-status'] === 'completed').length;
    const progress = Math.round((completed / goalTasks.length) * 100);
    
    await this.updateGoal(goalId, { progress });
    
    return progress;
  }
  
  /**
   * 获取目标的所有后代目标
   */
  getDescendants(goalId: string): Goal[] {
    const descendants: Goal[] = [];
    
    const findDescendants = (id: string) => {
      for (const goal of this.goals.values()) {
        if (goal['A-parent'] === id) {
          descendants.push(goal);
          findDescendants(goal['A-id']);
        }
      }
    };
    
    findDescendants(goalId);
    return descendants;
  }
  
  /**
   * 获取引用目标的记录
   */
  async getGoalReferences(goalId: string): Promise<Array<{
    fileName: string;
    filePath: string;
    lineContent: string;
    lineNumber: number;
  }>> {
    const goal = this.goals.get(goalId);
    if (!goal) return [];
    
    const safeTitle = goal['A-title'].replace(/[\\/:*?"<>|\s\n\r\t]/g, '_').trim();
    const backlinks = await this.storage.getBacklinksForGoal(safeTitle);
    const result: Array<{
      fileName: string;
      filePath: string;
      lineContent: string;
      lineNumber: number;
    }> = [];
    
    for (const backlink of backlinks) {
      const lines = backlink.content.split('\n');
      
      for (const lineNum of backlink.lines) {
        const lineContent = lines[lineNum]?.trim() || '';
        if (lineContent) {
          result.push({
            fileName: backlink.file.name.replace(/\.md$/, ''),
            filePath: backlink.file.path,
            lineContent,
            lineNumber: lineNum + 1
          });
        }
      }
    }
    
    result.sort((a, b) => b.lineNumber - a.lineNumber);
    
    return result;
  }
}
