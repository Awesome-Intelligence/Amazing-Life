/**
 * Dashboard View - Board Renderer
 *
 * 从 DashboardView 类中抽出的看板视图渲染与拖拽逻辑：
 * - renderBoardView：按层级/状态分组渲染看板列
 * - renderGoalsForBoard：渲染看板卡片
 * - bindBoardDragEvents / startGoalDrag / endGoalDrag / handleGoalDrop：拖拽交互
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import { Notice } from 'obsidian';
import type { DashboardView } from '../DashboardView';
import { Goal, Task, GoalLevel } from '../../types';

export class BoardRenderer {
  constructor(private view: DashboardView) {}

  renderBoardView(allGoals: Goal[], allTasks: Task[]): string {
    const currentFilters = this.view.getCurrentFilters();
    const boardGroupBy = currentFilters.groupBy;

    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: '#8B5CF6', 2: '#3B82F6', 3: '#6366F1', 4: '#22C55E' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const statusColors: Record<string, string> = { 'active': 'var(--text-blue)', 'completed': 'var(--text-green)', 'abandoned': 'var(--text-muted)' };

    let columnsHtml = '';

    if (boardGroupBy === 'level') {
      // 按层级分组
      columnsHtml = [1, 2, 3, 4].map(level => {
        const goals = allGoals.filter(g => g['A-level'] === level);
        return `<div class="al-board-column" data-column-type="level" data-column-value="${level}">
          <div class="al-board-column-header">
            <div class="al-board-column-title">
              <span class="al-level-badge" style="background:${levelColors[level]};color:#fff;font-size:14px;font-weight:700;padding:4px 12px;border-radius:6px;display:inline-block;min-width:40px;text-align:center">${levelNames[level]}</span>
            </div>
            <span class="al-list-count">${goals.length}</span>
          </div>
          <div class="al-board-column-body">
            ${goals.length === 0 ? this.view.detailRenderer.renderEmpty('🎯', '暂无目标', '') : this.renderGoalsForBoard(goals, allTasks)}
          </div>
          <div class="al-board-column-footer">
            <div class="al-add-goal-btn" data-prefill-level="${level}">+ 添加目标</div>
          </div>
        </div>`;
      }).join('');
    } else if (boardGroupBy === 'goalStatus') {
      // 按目标状态分组
      const statusOrder = ['active', 'completed', 'abandoned'];
      columnsHtml = statusOrder.map(status => {
        const goals = allGoals.filter(g => g['A-status'] === status);
        return `<div class="al-board-column" data-column-type="goalStatus" data-column-value="${status}">
          <div class="al-board-column-header">
            <div class="al-board-column-title">
              <span class="al-status-dot" style="background:${statusColors[status]}"></span>
              <span>${statusNames[status]}</span>
            </div>
            <span class="al-list-count">${goals.length}</span>
          </div>
          <div class="al-board-column-body">
            ${goals.length === 0 ? this.view.detailRenderer.renderEmpty('🎯', '暂无目标', '') : this.renderGoalsForBoard(goals, allTasks)}
          </div>
          <div class="al-board-column-footer">
            <div class="al-add-goal-btn" data-prefill-status="${status}">+ 添加目标</div>
          </div>
        </div>`;
      }).join('');
    }

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
          columnEl.classList.add('drop-target');
        }
      });

      columnEl.addEventListener('mouseleave', () => {
        columnEl.classList.remove('drop-target');
        if (this.view.dropTargetColumn === (columnEl as HTMLElement).getAttribute('data-column-value')) {
          this.view.dropTargetColumn = null;
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

    // 移除所有列的 drop-target 类
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  }

  async handleGoalDrop(): Promise<void> {
    if (!this.view.draggingGoalId || !this.view.dropTargetColumn) return;

    const goal = this.view.plugin.getGoalManager().getGoal(this.view.draggingGoalId);
    if (!goal) return;

    const currentFilters = this.view.getCurrentFilters();
    const columnType = currentFilters.groupBy;

    try {
      if (columnType === 'level') {
        // 按层级分组：拖动目标到不同层级列，更新目标层级
        const newLevel = parseInt(this.view.dropTargetColumn) as GoalLevel;
        if (goal['A-level'] !== newLevel) {
          await this.view.plugin.getGoalManager().updateGoal(this.view.draggingGoalId, { level: newLevel });
          new Notice('目标已移动到新层级');
        }
      } else if (columnType === 'goalStatus') {
        // 按状态分组：拖动目标到不同状态列，更新目标状态
        const newStatus = this.view.dropTargetColumn as 'active' | 'completed' | 'abandoned';
        if (goal['A-status'] !== newStatus) {
          await this.view.plugin.getGoalManager().updateGoal(this.view.draggingGoalId, { status: newStatus });
          new Notice('目标状态已更新');
        }
      }
      this.view.loadAndRender();
    } catch (error) {
      new Notice('更新失败');
    }
  }
}
