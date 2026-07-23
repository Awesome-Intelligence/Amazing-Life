/**
 * Tag Parser
 * Parses tags from diary content
 */

import { ParsedLine, PluginSettings } from '../../types';

export class TagParser {
  private goalTagPattern!: RegExp;
  private taskTagPattern!: RegExp;
  private noteworthyPattern!: RegExp;
  private taskCheckboxPattern!: RegExp;
  
  constructor(settings: PluginSettings) {
    this.updatePatterns(settings);
  }
  
  updatePatterns(settings: PluginSettings): void {
    // 目标标签: #目标/xxx
    this.goalTagPattern = new RegExp(`#${settings.goalTagPrefix}/([^\\s#]+)`, 'g');
    
    // 任务标签: #任务/xxx
    this.taskTagPattern = new RegExp(`#${settings.taskTagPrefix}/([^\\s#]+)`, 'g');
    
    // 重要标记: #noteworthy
    this.noteworthyPattern = new RegExp(`#${settings.noteworthyTag}`, 'gi');
    
    // 任务行: - [ ] 或 - [x] 或 - [>]
    this.taskCheckboxPattern = /^- \[([ x>])\]/;
  }
  
  /**
   * 解析文本中的所有行
   */
  parseLines(content: string): ParsedLine[] {
    const lines = content.split('\n');
    return lines.map((line, index) => this.parseLine(line, index + 1));
  }
  
  /**
   * 解析单行内容
   */
  parseLine(line: string, lineNumber: number): ParsedLine {
    const goalTags = this.extractGoalTags(line);
    const taskTags = this.extractTaskTags(line);
    const isNoteworthy = this.noteworthyPattern.test(line);
    const isTask = this.taskCheckboxPattern.test(line);
    
    let taskStatus: 'pending' | 'in-progress' | 'completed' | undefined;
    if (isTask) {
      const match = line.match(this.taskCheckboxPattern);
      if (match) {
        const checkbox = match[1];
        if (checkbox === 'x') {
          taskStatus = 'completed';
        } else if (checkbox === '>') {
          taskStatus = 'in-progress';
        } else {
          taskStatus = 'pending';
        }
      }
    }
    
    // 提取分类标签 (其他 #xxx 标签)
    const allTags = line.match(/#[\w/]+/g) || [];
    const categoryTags = allTags.filter(tag => {
      const tagName = tag.slice(1);
      return !tagName.startsWith('目标/') && 
             !tagName.startsWith('任务/') && 
             tagName.toLowerCase() !== 'noteworthy';
    }).map(tag => tag.slice(1));
    
    return {
      lineNumber,
      content: line,
      isTask,
      taskStatus,
      goalTags,
      taskTags,
      isNoteworthy,
      categoryTags
    };
  }
  
  /**
   * 提取所有目标标签
   */
  extractGoalTags(content: string): string[] {
    const matches = content.match(this.goalTagPattern);
    if (!matches) return [];
    return matches.map(tag => tag.slice(1)); // 去掉 # 号
  }
  
  /**
   * 提取所有任务标签
   */
  extractTaskTags(content: string): string[] {
    const matches = content.match(this.taskTagPattern);
    if (!matches) return [];
    return matches.map(tag => tag.slice(1)); // 去掉 # 号
  }
  
  /**
   * 提取所有 #noteworthy 标记的行
   */
  extractNoteworthyLines(content: string): ParsedLine[] {
    return this.parseLines(content).filter(line => line.isNoteworthy);
  }
  
  /**
   * 提取所有任务行
   */
  extractTaskLines(content: string): ParsedLine[] {
    return this.parseLines(content).filter(line => line.isTask);
  }
  
  /**
   * 检查内容是否包含目标标签
   */
  containsGoalTag(content: string, goalTitle: string): boolean {
    const tags = this.extractGoalTags(content);
    return tags.some(tag => tag.toLowerCase() === goalTitle.toLowerCase());
  }
  
  /**
   * 检查内容是否包含任务标签
   */
  containsTaskTag(content: string, taskTitle: string): boolean {
    const tags = this.extractTaskTags(content);
    return tags.some(tag => tag.toLowerCase() === taskTitle.toLowerCase());
  }
}
