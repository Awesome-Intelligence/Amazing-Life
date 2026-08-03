/**
 * Dashboard View - Board Renderer
 *
 * 从 DashboardView 类中抽出的看板视图渲染与拖拽逻辑：
 * - renderBoardView：按动态字段分组渲染看板列
 * - renderGoalsForBoard：渲染看板卡片
 * - bindBoardDragEvents / startGoalDrag / endGoalDrag / handleGoalDrop：拖拽交互
 * - getGroupByFields：获取所有可用的分组字段（包括自定义字段）
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import { Notice } from 'obsidian';
import type { DashboardView } from '../DashboardView';
import { Goal, Task, GoalLevel, GroupByField, GOAL_GROUP_BY_FIELDS } from '../../types';

export class BoardRenderer {
  constructor(private view: DashboardView) {}

  /**
   * 获取所有可用的分组字段（包括动态生成和自定义字段）
   */
  getGroupByFields(): GroupByField[] {
    const fields: GroupByField[] = [...GOAL_GROUP_BY_FIELDS];
    
    // 动态生成父目标选项
    const parentField = fields.find(f => f.field === 'A-parent');
    if (parentField) {
      const allGoals = this.view.plugin.getGoalManager().getAllGoals();
      const uniqueParents = [...new Set(allGoals.filter(g => g['A-parent']).map(g => g['A-parent']).filter((p): p is string => p !== null))];
      parentField.options = uniqueParents.map(parentId => {
        const parentGoal = allGoals.find(g => g['A-id'] === parentId);
        return {
          value: parentId,
          label: parentGoal ? parentGoal['A-title'] : parentId
        };
      });
    }
    
    // 从自定义字段中添加可分组的字段
    const customFields = this.view.plugin.getSettings().customGoalFields || [];
    for (const cf of customFields) {
      // 跳过已在标准字段中定义的
      if (fields.some(f => f.field === cf.key)) continue;
      
      // 根据自定义字段类型添加分组配置
      if (cf.type === 'select' && cf.options) {
        fields.push({
          field: cf.key,
          label: cf.label,
          type: 'select',
          draggable: true,
          targetField: cf.key,
          options: cf.options.split(',').map(opt => ({ value: opt.trim(), label: opt.trim() }))
        });
      } else if (cf.type === 'number') {
        fields.push({
          field: cf.key,
          label: cf.label,
          type: 'range',
          draggable: true,
          targetField: cf.key,
          ranges: [
            { min: 0, max: 33, label: '低 (0-33)' },
            { min: 33, max: 66, label: '中 (33-66)' },
            { min: 66, max: 101, label: '高 (66-100)' }
          ]
        });
      } else if (cf.type === 'date') {
        fields.push({
          field: cf.key,
          label: cf.label,
          type: 'date',
          draggable: true,
          targetField: cf.key,
          dateMode: 'year'
        });
      }
    }
    
    return fields;
  }

  /**
   * 根据分组字段获取列配置
   */
  getColumnsForGroupBy(groupByField: GroupByField, allGoals: Goal[]): { value: string; label: string; color?: string; goals: Goal[] }[] {
    if (groupByField.type === 'select' && groupByField.options) {
      return groupByField.options.map(opt => ({
        value: opt.value,
        label: opt.label,
        color: opt.color,
        goals: allGoals.filter(g => String(g[groupByField.field] || '') === opt.value)
      }));
    }
    
    if (groupByField.type === 'range' && groupByField.ranges) {
      return groupByField.ranges.map(range => ({
        value: `${range.min}-${range.max}`,
        label: range.label,
        goals: allGoals.filter(g => {
          const val = g[groupByField.field] as number;
          return val >= range.min && val < range.max;
        })
      }));
    }
    
    if (groupByField.type === 'date') {
      const dateField = groupByField.field.replace('-year', '').replace('-month', '');
      const mode = groupByField.dateMode || 'year';
      
      // 收集所有唯一的日期值
      const dateValues = new Map<string, Goal[]>();
      
      for (const goal of allGoals) {
        const dateVal = goal[dateField] as string;
        if (!dateVal) {
          const key = '无日期';
          if (!dateValues.has(key)) dateValues.set(key, []);
          dateValues.get(key)!.push(goal);
        } else {
          const date = new Date(dateVal);
          if (isNaN(date.getTime())) {
            const key = '无效日期';
            if (!dateValues.has(key)) dateValues.set(key, []);
            dateValues.get(key)!.push(goal);
          } else {
            let key: string;
            if (mode === 'year') {
              key = date.getFullYear().toString();
            } else {
              key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            if (!dateValues.has(key)) dateValues.set(key, []);
            dateValues.get(key)!.push(goal);
          }
        }
      }
      
      // 排序并返回
      const sortedKeys = [...dateValues.keys()].sort().reverse();
      return sortedKeys.map(key => ({
        value: key,
        label: key,
        goals: dateValues.get(key)!
      }));
    }
    
    return [];
  }

  /**
   * 获取目标对应的分组值
   */
  getGoalGroupValue(goal: Goal, groupByField: GroupByField): string {
    if (groupByField.type === 'select') {
      return String(goal[groupByField.field] || '');
    }
    
    if (groupByField.type === 'range' && groupByField.ranges) {
      const val = goal[groupByField.field] as number;
      for (const range of groupByField.ranges) {
        if (val >= range.min && val < range.max) {
          return `${range.min}-${range.max}`;
        }
      }
      return 'other';
    }
    
    if (groupByField.type === 'date') {
      const dateField = groupByField.field.replace('-year', '').replace('-month', '');
      const dateVal = goal[dateField] as string;
      if (!dateVal) return '无日期';
      
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) return '无效日期';
      
      if (groupByField.dateMode === 'year') {
        return date.getFullYear().toString();
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    }
    
    return '';
  }

  renderBoardView(allGoals: Goal[], allTasks: Task[]): string {
    const currentFilters = this.view.getCurrentFilters();
    const boardGroupBy = currentFilters.groupBy || 'A-level';
    
    // 获取分组字段配置
    const groupByFields = this.getGroupByFields();
    const groupByField = groupByFields.find(f => f.field === boardGroupBy) || groupByFields[0];
    
    // 获取所有列
    const columns = this.getColumnsForGroupBy(groupByField, allGoals);
    
    // 渲染列
    const columnsHtml = columns.map(column => {
      const headerStyle = column.color ? `border-bottom-color: ${column.color}` : '';
      const headerBadgeStyle = column.color ? `background: ${column.color}` : '';
      
      return `<div class="al-board-column" data-column-type="${groupByField.field}" data-column-value="${column.value}">
        <div class="al-board-column-header" ${column.color ? `style="border-bottom: 2px solid ${column.color}"` : ''}>
          <div class="al-board-column-title">
            ${column.color ? `<span class="al-status-dot" style="background: ${column.color}"></span>` : ''}
            <span>${column.label}</span>
          </div>
          <span class="al-list-count">${column.goals.length}</span>
        </div>
        <div class="al-board-column-body">
          ${column.goals.length === 0 ? '<div class="al-board-empty-text">暂无目标</div>' : this.renderGoalsForBoard(column.goals, allTasks)}
        </div>
        ${groupByField.draggable ? `<div class="al-board-column-footer">
          <div class="al-add-goal-btn" data-prefill-group="${groupByField.field}" data-prefill-value="${column.value}">+ 添加目标</div>
        </div>` : ''}
      </div>`;
    }).join('');

    return `
      <div class="al-board-view">${columnsHtml}</div>
    `;
  }

  renderGoalsForBoard(goals: Goal[], allTasks: Task[]): string {
    const fields = this.view.getGoalFields();
    const showCover = fields.includes('cover');
    const showProgress = fields.includes('progress');
    const showTasksCount = fields.includes('tasksCount');

    return goals.map(goal => {
      const tasks = allTasks.filter(t => t['A-goal'] === goal['A-id']);
      const completedCount = tasks.filter(t => t['A-status'] === 'completed').length;
      const coverUrl = this.view.getCoverImageUrl(goal['A-cover']);
      const customFields = this.view.getEnabledCustomFields();
      let cardContent = `<div class="al-goal-card" data-goal-id="${goal['A-id']}">`;

      if (showCover && coverUrl) {
        cardContent += `<div class="al-goal-card-cover"><img src="${coverUrl}" alt="封面图"></div>`;
      }

      cardContent += `<div class="al-goal-card-title">${goal['A-title']}</div>`;

      if (showProgress) {
        cardContent += `
          <div class="al-goal-card-progress">
            <div class="al-progress-bar"><div class="al-progress-fill" style="width:${goal['A-progress']}%"></div></div>
            <span>${goal['A-progress']}%</span>
          </div>
        `;
      }

      if (showTasksCount) {
        cardContent += `
          <div class="al-goal-card-meta">
            <span>📋 ${tasks.length} 个任务</span>
            <span>✓ ${completedCount} 已完成</span>
          </div>
        `;
      }

      // 渲染自定义字段
      cardContent += this.view.renderCustomFields(goal, customFields);

      cardContent += '</div>';
      return cardContent;
    }).join('');
  }

  bindBoardDragEvents(content: HTMLElement): void {
    // 拖拽目标卡片
    content.querySelectorAll('.al-board-view .al-goal-card').forEach(cardEl => {
      cardEl.addEventListener('mousedown', (e) => {
        const goalId = (cardEl as HTMLElement).getAttribute('data-goal-id');
        if (!goalId) return;

        this.startGoalDrag(cardEl as HTMLElement, goalId, e as MouseEvent);
      });

      // 点击进入详情页
      cardEl.addEventListener('click', (e) => {
        // 如果正在拖拽，不触发点击
        if (this.view.draggingGoalId) return;

        const goalId = (cardEl as HTMLElement).getAttribute('data-goal-id');
        if (goalId) {
          this.view.navigateTo('goal-detail', goalId, null);
        }
      });
    });

    // 列的放置区域
    content.querySelectorAll('.al-board-column').forEach(columnEl => {
      columnEl.addEventListener('mouseenter', () => {
        if (this.view.draggingGoalId) {
          this.view.dropTargetColumn = (columnEl as HTMLElement).getAttribute('data-column-value');
          this.view.dropTargetColumnType = (columnEl as HTMLElement).getAttribute('data-column-type');
          columnEl.classList.add('drop-target');
        }
      });

      columnEl.addEventListener('mouseleave', () => {
        columnEl.classList.remove('drop-target');
        if (this.view.dropTargetColumn === (columnEl as HTMLElement).getAttribute('data-column-value')) {
          this.view.dropTargetColumn = null;
          this.view.dropTargetColumnType = null;
        }
      });
    });

    // 鼠标移动
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.view.dragGhost) {
        this.view.dragGhost.style.left = e.clientX + 'px';
        this.view.dragGhost.style.top = e.clientY + 'px';
      }
    });

    // 鼠标释放
    document.addEventListener('mouseup', () => {
      if (this.view.draggingGoalId && this.view.dropTargetColumn) {
        this.handleGoalDrop();
      }
      this.endGoalDrag();
    });
  }

  startGoalDrag(cardEl: HTMLElement, goalId: string, e: MouseEvent): void {
    this.view.draggingGoalId = goalId;
    this.view.draggingGoalEl = cardEl;

    // 创建拖拽影子
    const rect = cardEl.getBoundingClientRect();
    this.view.dragGhost = cardEl.cloneNode(true) as HTMLElement;
    this.view.dragGhost.classList.add('drag-ghost');
    this.view.dragGhost.style.width = rect.width + 'px';
    this.view.dragGhost.style.left = e.clientX + 'px';
    this.view.dragGhost.style.top = e.clientY + 'px';
    document.body.appendChild(this.view.dragGhost);

    // 隐藏原卡片
    cardEl.classList.add('dragging');
  }

  endGoalDrag(): void {
    if (this.view.dragGhost) {
      this.view.dragGhost.remove();
      this.view.dragGhost = null;
    }
    if (this.view.draggingGoalEl) {
      this.view.draggingGoalEl.classList.remove('dragging');
      this.view.draggingGoalEl = null;
    }
    this.view.draggingGoalId = null;
    this.view.dropTargetColumn = null;
    this.view.dropTargetColumnType = null;

    // 移除所有列的 drop-target 类
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  }

  async handleGoalDrop(): Promise<void> {
    if (!this.view.draggingGoalId || !this.view.dropTargetColumn || !this.view.dropTargetColumnType) return;

    const goal = this.view.plugin.getGoalManager().getGoal(this.view.draggingGoalId);
    if (!goal) return;

    // 获取分组字段配置
    const groupByFields = this.getGroupByFields();
    const groupByField = groupByFields.find(f => f.field === this.view.dropTargetColumnType);
    
    if (!groupByField) return;

    // 检查是否支持拖拽更新
    if (!groupByField.draggable) {
      new Notice('该分组字段不支持拖拽更新');
      return;
    }

    try {
      if (groupByField.type === 'select') {
        // 对于 select 类型，直接使用列的值
        let updateValue: any = this.view.dropTargetColumn;
        
        // 对于 A-level，需要转换为数字
        if (groupByField.targetField === 'level') {
          updateValue = parseInt(updateValue);
        }
        
        await this.view.plugin.getGoalManager().updateGoal(this.view.draggingGoalId, {
          [groupByField.targetField!]: updateValue
        });
        new Notice('目标已更新');
        
      } else if (groupByField.type === 'range') {
        // 对于 range 类型，使用区间中值
        const [min, max] = this.view.dropTargetColumn.split('-').map(Number);
        const newValue = Math.round((min + max) / 2);
        
        await this.view.plugin.getGoalManager().updateGoal(this.view.draggingGoalId, {
          [groupByField.targetField!]: newValue
        });
        new Notice(`进度已更新为 ${newValue}%`);
        
      } else if (groupByField.type === 'date') {
        // 对于 date 类型，更新日期字段
        const dateField = groupByField.field.replace('-year', '').replace('-month', '');
        const newDate = groupByField.dateMode === 'year' 
          ? `${this.view.dropTargetColumn}-01-01`
          : `${this.view.dropTargetColumn}-01`;
        
        await this.view.plugin.getGoalManager().updateGoal(this.view.draggingGoalId, {
          [dateField]: newDate
        });
        new Notice('日期已更新');
      }
      
      this.view.loadAndRender();
    } catch (error) {
      new Notice('更新失败');
    }
  }
}
