/**
 * Dashboard View - Gallery Renderer
 *
 * 从 DashboardView 类中抽出的画廊视图渲染逻辑：
 * - renderGalleryView：按层级/状态/父目标分组或不分组渲染画廊卡片
 *
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import type { DashboardView } from '../DashboardView';
import { Goal, Task } from '../../types';

export class GalleryRenderer {
  constructor(private view: DashboardView) {}

  renderGalleryView(allGoals: Goal[], allTasks: Task[]): string {
    const levelNames: Record<number, string> = { 1: '人生', 2: '阶段', 3: '年度', 4: '短期' };
    const levelColors: Record<number, string> = { 1: 'var(--text-purple)', 2: 'var(--text-blue)', 3: 'var(--interactive-accent)', 4: 'var(--text-green)' };
    const statusNames: Record<string, string> = { 'active': '进行中', 'completed': '已完成', 'abandoned': '已放弃' };
    const statusColors: Record<string, string> = { 'active': 'var(--interactive-accent)', 'completed': 'var(--text-green)', 'abandoned': 'var(--text-muted)' };

    if (allGoals.length === 0) return `<div class="al-gallery-view"><div class="al-gallery-section"><div class="al-gallery-section-title">目标 (0)</div><div class="al-gallery-grid"><div class="al-gallery-add-card" id="al-gallery-add-goal"><span class="al-gallery-add-icon">+</span><span>添加目标</span></div></div></div></div>`;

    const fields = this.view.getGoalFields();
    const currentFilters = this.view.getCurrentFilters();
    const groupBy = currentFilters.groupBy;

    // 渲染单个卡片
    const renderCard = (goal: Goal): string => {
      const gt = allTasks.filter(t => t['A-goal'] === goal['A-id']);
      const coverUrl = this.view.getCoverImageUrl(goal['A-cover']);
      const customFields = this.view.getEnabledCustomFields();
      let cardContent = `<div class="al-gallery-card al-gallery-goal" data-goal-id="${goal['A-id']}">`;

      if (fields.includes('cover') && coverUrl) {
        cardContent += `<div class="al-gallery-card-cover"><img src="${coverUrl}" alt="封面图"></div>`;
      }

      cardContent += `<div class="al-gallery-card-header"><span class="al-goal-level" data-level="${goal['A-level']}" style="background:${levelColors[goal['A-level']]}">${levelNames[goal['A-level']]}</span></div>`;

      if (fields.includes('title')) cardContent += `<div class="al-gallery-card-title">${goal['A-title']}</div>`;
      if (fields.includes('progress')) cardContent += `<div class="al-gallery-card-progress"><div class="al-progress-bar"><div class="al-progress-fill" style="width:${goal['A-progress']}%"></div></div><span>${goal['A-progress']}%</span></div>`;
      if (fields.includes('due') && goal['A-due']) cardContent += `<div class="al-gallery-card-meta">📅 ${goal['A-due']}</div>`;
      if (fields.includes('tasksCount')) cardContent += `<div class="al-gallery-card-tasks"><span>📋 ${gt.length} 个任务</span></div>`;
      if (fields.includes('completedTasksCount')) {
        const completed = gt.filter(t => t['A-status'] === 'completed').length;
        cardContent += `<div class="al-gallery-card-tasks"><span>✓ 已完成 ${completed} 个</span></div>`;
      }

      // 渲染自定义字段
      cardContent += this.view.renderCustomFields(goal, customFields);

      cardContent += '</div>';
      return cardContent;
    };

    // 不分组
    if (!groupBy) {
      const cardsHtml = allGoals.map(goal => renderCard(goal)).join('');
      return `<div class="al-gallery-view"><div class="al-gallery-section"><div class="al-gallery-section-title">目标 (${allGoals.length})</div><div class="al-gallery-grid">${cardsHtml}<div class="al-gallery-add-card" id="al-gallery-add-goal"><span class="al-gallery-add-icon">+</span><span>添加目标</span></div></div></div></div>`;
    }

    // 分组
    const groups = new Map<string, Goal[]>();

    if (groupBy === 'level') {
      // 按层级分组
      for (const goal of allGoals) {
        const key = String(goal['A-level']);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(goal);
      }
    } else if (groupBy === 'goalStatus') {
      // 按状态分组
      for (const goal of allGoals) {
        const key = goal['A-status'];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(goal);
      }
    } else if (groupBy === 'parent') {
      // 按父目标分组
      for (const goal of allGoals) {
        const key = goal['A-parent'] || '__root__';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(goal);
      }
    }

    // 定义分组顺序（统一为字符串）
    const levelOrder = ['1', '2', '3', '4'];
    const statusOrder = ['active', 'completed', 'abandoned'];
    const groupOrder = groupBy === 'level' ? levelOrder : (groupBy === 'goalStatus' ? statusOrder : Array.from(groups.keys()).sort());

    let sectionsHtml = '';
    for (const key of groupOrder) {
      const goals = groups.get(key) || [];
      if (goals.length === 0) continue;

      let groupLabel: string;
      let groupColor: string;
      if (groupBy === 'level') {
        groupLabel = levelNames[parseInt(key)];
        groupColor = levelColors[parseInt(key)];
      } else if (groupBy === 'goalStatus') {
        groupLabel = statusNames[key];
        groupColor = statusColors[key];
      } else {
        // 按父目标分组
        if (key === '__root__') {
          groupLabel = '顶级目标';
          groupColor = 'var(--text-muted)';
        } else {
          const parentGoal = this.view.getGoal(key);
          groupLabel = parentGoal ? parentGoal['A-title'] : '未知目标';
          groupColor = 'var(--interactive-accent)';
        }
      }

      const cardsHtml = goals.map(goal => renderCard(goal)).join('');

      sectionsHtml += `
        <div class="al-gallery-section">
          <div class="al-gallery-section-title">
            <span class="al-gallery-section-dot" style="background:${groupColor}"></span>
            ${groupLabel} (${goals.length})
          </div>
          <div class="al-gallery-grid">${cardsHtml}<div class="al-gallery-add-card" data-prefill-level="${groupBy === 'level' ? key : ''}" data-prefill-status="${groupBy === 'goalStatus' ? key : ''}" data-prefill-parent="${groupBy === 'parent' && key !== '__root__' ? key : ''}"><span class="al-gallery-add-icon">+</span><span>添加目标</span></div></div>
        </div>
      `;
    }

    return `<div class="al-gallery-view">${sectionsHtml}</div>`;
  }
}
