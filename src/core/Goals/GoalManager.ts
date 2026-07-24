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
  description?: string;
  due?: string | null;
  status?: GoalStatus;
  progress?: number;
  level?: GoalLevel;
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
  private parseGoalFromContent(file: TFile, content: string): Goal | null {
    const frontmatter = this.storage.parseFrontmatter(file);
    
    if (frontmatter['A-type'] !== 'goal') {
      return null;
    }
    
    return {
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
      'A-created': String(frontmatter['A-created'] || ''),
      'A-updated': String(frontmatter['A-updated'] || new Date().toISOString())
    };
  }
  
  /**
   * 创建目标
   */
  async createGoal(dto: CreateGoalDTO): Promise<Goal> {
    const id = this.storage.generateId('goal');
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
      'A-created': now,
      'A-updated': now
    };
    
    const content = this.generateGoalContent(goal, dto.description);
    await this.storage.writeFile(this.storage.getGoalPath(id), content);
    
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
      `A-created: ${goal['A-created']}`,
      `A-updated: ${goal['A-updated']}`,
      '---',
      '',
      `# ${goal['A-title']}`,
      ''
    ];
    
    if (description) {
      lines.push('## 概述', '', description, '');
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
    
    if (dto.title !== undefined) goal['A-title'] = dto.title;
    if (dto.due !== undefined) goal['A-due'] = dto.due;
    if (dto.status !== undefined) goal['A-status'] = dto.status;
    if (dto.progress !== undefined) goal['A-progress'] = dto.progress;
    if (dto.level !== undefined) goal['A-level'] = dto.level;
    goal['A-updated'] = now;
    
    const content = await this.storage.readFile(this.storage.getGoalPath(id));
    if (content) {
      const updatedContent = this.updateGoalInContent(content, goal);
      await this.storage.writeFile(this.storage.getGoalPath(id), updatedContent);
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
    
    for (const line of lines) {
      if (line === '---') {
        inFrontmatter = !inFrontmatter;
        updatedLines.push(line);
        continue;
      }
      
      if (inFrontmatter) {
        if (line.startsWith('A-title:')) {
          updatedLines.push(`A-title: ${goal['A-title']}`);
        } else if (line.startsWith('A-status:')) {
          updatedLines.push(`A-status: ${goal['A-status']}`);
        } else if (line.startsWith('A-progress:')) {
          updatedLines.push(`A-progress: ${goal['A-progress']}`);
        } else if (line.startsWith('A-due:')) {
          updatedLines.push(`A-due: ${goal['A-due'] || ''}`);
        } else if (line.startsWith('A-updated:')) {
          updatedLines.push(`A-updated: ${goal['A-updated']}`);
        } else {
          updatedLines.push(line);
        }
      } else {
        // 更新标题
        if (line.startsWith('# ')) {
          updatedLines.push(`# ${goal['A-title']}`);
        } else {
          updatedLines.push(line);
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
    
    await this.storage.deleteFile(this.storage.getGoalPath(id));
    
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
}
