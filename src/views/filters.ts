/**
 * Dashboard View - Filter Helper
 *
 * 从 DashboardView 类中抽出的筛选相关方法。
 * 通过组合方式持有 DashboardView 实例引用，访问共享状态。
 */

import type { DashboardView } from './DashboardView';
import { FilterCondition, FilterLogic, FilterOperator, FILTER_OPERATOR_LABELS, GOAL_FILTER_FIELDS, GOAL_GROUP_BY_FIELDS } from '../types';

export class FilterHelper {
  constructor(private view: DashboardView) {}

  // 应用筛选条件
  applyFilterConditions(goals: import('../types').Goal[]): import('../types').Goal[] {
    if (this.view.tempFilterConditions.length === 0) {
      return goals;
    }

    return goals.filter(goal => {
      const results = this.view.tempFilterConditions.map(condition => {
        return this.evaluateCondition(goal, condition);
      });

      // 根据逻辑运算符决定最终结果
      if (this.view.tempFilterLogic === 'and') {
        return results.every(r => r);
      } else {
        return results.some(r => r);
      }
    });
  }

  // 评估单个条件
  evaluateCondition(goal: import('../types').Goal, condition: FilterCondition): boolean {
    let value = goal[condition.field as keyof import('../types').Goal];

    // 对于虚拟年份字段，需要从对应的日期字段提取年份
    if (condition.field.endsWith('-year')) {
      const dateField = condition.field.replace('-year', '') as keyof import('../types').Goal;
      const dateValue = goal[dateField];
      if (typeof dateValue === 'string' && dateValue) {
        value = new Date(dateValue).getFullYear();
      } else {
        value = null;
      }
    }

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        if (typeof value === 'string') {
          return value.toLowerCase().includes(String(condition.value).toLowerCase());
        }
        return false;
      case 'not_contains':
        if (typeof value === 'string') {
          return !value.toLowerCase().includes(String(condition.value).toLowerCase());
        }
        return true;
      case 'starts_with':
        if (typeof value === 'string') {
          return value.toLowerCase().startsWith(String(condition.value).toLowerCase());
        }
        return false;
      case 'ends_with':
        if (typeof value === 'string') {
          return value.toLowerCase().endsWith(String(condition.value).toLowerCase());
        }
        return false;
      case 'greater_than':
        return typeof value === 'number' && value > Number(condition.value);
      case 'less_than':
        return typeof value === 'number' && value < Number(condition.value);
      case 'greater_or_equal':
        return typeof value === 'number' && value >= Number(condition.value);
      case 'less_or_equal':
        return typeof value === 'number' && value <= Number(condition.value);
      case 'is_empty':
        return value === null || value === undefined || value === '';
      case 'is_not_empty':
        return value !== null && value !== undefined && value !== '';
      case 'is_null':
        return value === null || value === undefined;
      case 'is_not_null':
        return value !== null && value !== undefined;
      case 'year_equals':
        return typeof value === 'number' && value === Number(condition.value);
      case 'year_not_equals':
        return typeof value === 'number' && value !== Number(condition.value);
      case 'year_before':
        return typeof value === 'number' && value < Number(condition.value);
      case 'year_after':
        return typeof value === 'number' && value > Number(condition.value);
      case 'year_between':
        // condition.value 格式为 "2020,2025"，表示 2020 到 2025 之间
        if (typeof value === 'number' && typeof condition.value === 'string') {
          const [start, end] = condition.value.split(',').map(Number);
          return value >= start && value <= end;
        }
        return false;
      default:
        return true;
    }
  }

  // 获取字段的操作符选项
  getOperatorsForFieldType(type: string): FilterOperator[] {
    switch (type) {
      case 'string':
        return ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'];
      case 'number':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'];
      case 'select':
        return ['equals', 'not_equals', 'is_empty', 'is_not_empty'];
      case 'date':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'];
      case 'array':
        return ['contains', 'not_contains', 'is_empty', 'is_not_empty'];
      case 'year':
        return ['year_equals', 'year_not_equals', 'year_before', 'year_after', 'year_between', 'is_empty', 'is_not_empty'];
      default:
        return ['equals', 'not_equals'];
    }
  }

  // 获取字段类型
  getFieldType(fieldName: string): string {
    const fieldDef = GOAL_FILTER_FIELDS.find(f => f.field === fieldName);
    return fieldDef?.type || 'string';
  }

  // 渲染筛选栏 - 新设计
  renderFilterBar(currentFilters: { conditions: FilterCondition[]; logic: FilterLogic; groupBy: string | null }): string {
    const hasConditions = this.view.tempFilterConditions.length > 0;
    const isModified = this.view.tempFilterModified;
    const isExpanded = this.view.tempShowFilterBuilder;

    // 获取分组选项（包括标准字段和自定义字段）
    const groupByOptions = this.getGroupByOptions();

    const showGroupBy = ['board', 'gallery'].includes(this.view.currentView);

    // 生成条件摘要（用于折叠状态下的显示）
    const conditionsSummary = this.renderConditionsSummary();

    // 根据是否有条件决定主按钮文案
    const mainButtonText = hasConditions ? '添加' : '添加筛选';
    const conditionsCountText = hasConditions ? `${this.view.tempFilterConditions.length}个条件` : '';

    return `
      <div class="al-filter-bar">
        ${hasConditions ? `
          <button id="al-toggle-filter-bar" class="al-filter-toggle ${isExpanded ? 'active' : ''}">
            <svg class="al-filter-toggle-icon ${isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span class="al-filter-toggle-text">${conditionsCountText}</span>
          </button>
          <span class="al-filter-summary">${conditionsSummary}</span>
          <button id="al-add-filter-condition-inline" class="al-filter-add-inline" title="添加条件">+</button>
        ` : ''}
        
        ${!hasConditions ? `
          <button id="al-add-filter-start" class="al-filter-add-start">+ ${mainButtonText}</button>
        ` : ''}

        <div class="al-filter-spacer"></div>

        ${isModified ? `
          <button id="al-filter-save" class="al-filter-btn al-filter-btn-primary">保存</button>
          <button id="al-filter-clear" class="al-filter-btn al-filter-btn-danger">清除</button>
        ` : ''}

        ${showGroupBy ? `
          <div class="al-board-group-inline">
            <select id="al-board-group-by" class="al-filter-select">
              ${groupByOptions.map(opt => `<option value="${opt.value}" ${currentFilters.groupBy === opt.value || (opt.value === '' && !currentFilters.groupBy) ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
          </div>
        ` : ''}

        <button class="al-filter-settings-btn" id="al-open-field-settings" title="字段设置">
          <span class="al-tab-icon" data-icon="settings"></span>
        </button>
      </div>
      
      ${isExpanded ? this.renderFilterBuilder() : ''}
    `;
  }

  // 渲染条件摘要（用于折叠状态下的显示）
  renderConditionsSummary(): string {
    const fields = GOAL_FILTER_FIELDS;
    return this.view.tempFilterConditions.map((condition, index) => {
      const fieldDef = fields.find(f => f.field === condition.field);
      const fieldLabel = fieldDef?.label || condition.field;
      const operatorLabel = FILTER_OPERATOR_LABELS[condition.operator] || condition.operator;
      const valueDisplay = this.getConditionValueDisplay(condition);
      return `<span class="al-filter-summary-item">${fieldLabel} ${operatorLabel} ${valueDisplay}</span>`;
    }).join(' ');
  }

  // 获取条件的值显示
  getConditionValueDisplay(condition: FilterCondition): string {
    // 不需要值的操作符
    if (['is_empty', 'is_not_empty', 'is_null', 'is_not_null'].includes(condition.operator)) {
      return '';
    }

    if (condition.value === null || condition.value === undefined || condition.value === '') {
      return '(空)';
    }

    const fieldDef = GOAL_FILTER_FIELDS.find(f => f.field === condition.field);
    
    // select 类型显示选项标签
    if (fieldDef?.type === 'select' && fieldDef.options) {
      const option = fieldDef.options.find(o => o.value === condition.value);
      return option?.label || String(condition.value);
    }

    // 数组类型（如 tags）
    if (fieldDef?.type === 'array') {
      const values: string[] = Array.isArray(condition.value) 
        ? condition.value.map(v => String(v)) 
        : String(condition.value || '').split(',');
      return values.slice(0, 2).join(', ') + (values.length > 2 ? '...' : '');
    }

    return String(condition.value);
  }

  // 渲染筛选构建器（展开状态）
  renderFilterBuilder(): string {
    const fields = GOAL_FILTER_FIELDS;

    return `
      <div class="al-filter-builder">
        <div class="al-filter-logic-row">
          <span class="al-filter-logic-label">条件组合：</span>
          <button class="al-filter-logic-btn ${this.view.tempFilterLogic === 'and' ? 'active' : ''}" data-logic="and">且 (AND)</button>
          <button class="al-filter-logic-btn ${this.view.tempFilterLogic === 'or' ? 'active' : ''}" data-logic="or">或 (OR)</button>
        </div>

        <div class="al-filter-conditions">
          ${this.view.tempFilterConditions.map((condition, index) => {
            // 如果是当前编辑的条件，渲染编辑模式；否则渲染卡片模式
            if (this.view.tempFilterEditingId === condition.id) {
              return this.renderFilterCondition(condition, index, fields);
            }
            return this.renderFilterConditionCard(condition, index, fields);
          }).join('')}
        </div>

        <button id="al-add-filter-condition" class="al-filter-add-btn">+ 添加条件</button>
      </div>
    `;
  }

  // 渲染单个筛选条件卡片（摘要模式，点击编辑）
  renderFilterConditionCard(condition: FilterCondition, index: number, fields: typeof GOAL_FILTER_FIELDS): string {
    const selectedField = fields.find(f => f.field === condition.field);
    const fieldLabel = selectedField?.label || condition.field;
    const operatorLabel = FILTER_OPERATOR_LABELS[condition.operator] || condition.operator;
    const valueDisplay = this.getConditionValueDisplay(condition);

    return `
      <div class="al-filter-condition-card" data-condition-id="${condition.id}">
        <div class="al-filter-condition-summary">
          <span class="al-filter-condition-field">${fieldLabel}</span>
          <span class="al-filter-condition-op">${operatorLabel}</span>
          <span class="al-filter-condition-value">${valueDisplay}</span>
          <div class="al-filter-condition-actions">
            <button class="al-filter-edit-btn" data-condition-id="${condition.id}">编辑</button>
            <button class="al-filter-remove-btn" data-condition-id="${condition.id}">✕</button>
          </div>
        </div>
      </div>
    `;
  }

  // 渲染单个筛选条件的编辑模式（使用 Obsidian 风格按钮，点击弹出 Menu）
  renderFilterCondition(condition: FilterCondition, index: number, fields: typeof GOAL_FILTER_FIELDS): string {
    const selectedField = fields.find(f => f.field === condition.field);
    const fieldType = selectedField?.type || 'string';
    const availableOperators = this.getOperatorsForFieldType(fieldType);
    const needsValue = !['is_empty', 'is_not_empty', 'is_null', 'is_not_null'].includes(condition.operator);
    const operatorLabel = FILTER_OPERATOR_LABELS[condition.operator] || condition.operator;

    return `
      <div class="al-filter-condition" data-condition-id="${condition.id}">
        <button class="al-filter-field-btn" data-condition-id="${condition.id}">
          ${selectedField?.label || '选择字段'}
          <span class="al-filter-dropdown-arrow">▾</span>
        </button>

        <button class="al-filter-operator-btn" data-condition-id="${condition.id}">
          ${operatorLabel}
          <span class="al-filter-dropdown-arrow">▾</span>
        </button>

        ${needsValue ? this.renderConditionValue(condition, selectedField) : '<span class="al-filter-no-value">-</span>'}

        <button class="al-filter-remove-btn" data-condition-id="${condition.id}">✕</button>
      </div>
    `;
  }

  // 渲染条件值输入（使用按钮风格，点击弹出 Menu）
  renderConditionValue(condition: FilterCondition, fieldDef: typeof GOAL_FILTER_FIELDS[0] | undefined): string {
    if (!fieldDef) {
      return `<input type="text" class="al-filter-value-input" data-condition-id="${condition.id}" value="${condition.value || ''}" placeholder="输入值...">`;
    }

    // select 类型 - 显示按钮，点击弹出选项
    if (fieldDef.type === 'select' && fieldDef.options) {
      const selectedOption = fieldDef.options.find(o => o.value === condition.value);
      return `
        <button class="al-filter-value-btn" data-condition-id="${condition.id}" data-value-type="select">
          ${selectedOption?.label || '请选择...'}
          <span class="al-filter-dropdown-arrow">▾</span>
        </button>
      `;
    }

    // number 类型 - 输入框
    if (fieldDef.type === 'number') {
      return `<input type="number" class="al-filter-value-input" data-condition-id="${condition.id}" value="${condition.value || ''}" min="${fieldDef.min || 0}" max="${fieldDef.max || 100}">`;
    }

    // date 类型 - 输入框
    if (fieldDef.type === 'date') {
      return `<input type="date" class="al-filter-value-input al-filter-date-input" data-condition-id="${condition.id}" value="${condition.value || ''}">`;
    }

    // year 类型 - 按钮，点击弹出年份选择
    if (fieldDef.type === 'year') {
      const displayValue = condition.value ? `${condition.value}年` : '请选择年份';
      return `
        <button class="al-filter-value-btn" data-condition-id="${condition.id}" data-value-type="year">
          ${displayValue}
          <span class="al-filter-dropdown-arrow">▾</span>
        </button>
      `;
    }

    // 默认 - 文本输入框
    return `<input type="text" class="al-filter-value-input" data-condition-id="${condition.id}" value="${condition.value || ''}" placeholder="输入值...">`;
  }

  // 删除筛选条件
  removeFilterCondition(conditionId: string): void {
    this.view.tempFilterConditions = this.view.tempFilterConditions.filter(c => c.id !== conditionId);
    this.view.tempFilterModified = true;
    this.view.render();
  }

  // 更新筛选条件
  updateFilterCondition(conditionId: string, updates: Partial<FilterCondition>): void {
    this.view.tempFilterConditions = this.view.tempFilterConditions.map(c => {
      if (c.id === conditionId) {
        const updated = { ...c, ...updates };

        // 如果字段改变，重置操作符为新字段的第一个有效操作符
        if (updates.field && updates.field !== c.field) {
          const fieldDef = GOAL_FILTER_FIELDS.find(f => f.field === updates.field);
          const fieldType = fieldDef?.type || 'string';
          const availableOperators = this.getOperatorsForFieldType(fieldType);
          updated.operator = availableOperators[0] || 'equals';
          updated.value = null; // 清空值
        }

        return updated;
      }
      return c;
    });
    this.view.tempFilterModified = true;
  }

  // 获取所有可用的分组选项（包括标准字段和自定义字段）
  getGroupByOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [
      { value: '', label: '不分组' }
    ];

    // 添加标准分组字段
    for (const field of GOAL_GROUP_BY_FIELDS) {
      options.push({ value: field.field, label: `按${field.label}` });
    }

    // 添加自定义字段中的可分组字段
    const customFields = this.view.plugin.getSettings().customGoalFields || [];
    for (const cf of customFields) {
      // 跳过已在标准字段中定义的
      if (GOAL_GROUP_BY_FIELDS.some(f => f.field === cf.key)) continue;

      if (cf.type === 'select' || cf.type === 'number' || cf.type === 'date') {
        options.push({ value: cf.key, label: `按${cf.label}` });
      }
    }

    return options;
  }
}
