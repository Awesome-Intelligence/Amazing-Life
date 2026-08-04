/**
 * Dashboard View - Shared Types and Constants
 *
 * 从 DashboardView.ts 抽出的视图类型与常量定义。
 * 仅包含类型与常量，不包含运行时逻辑。
 */

export const DASHBOARD_VIEW_TYPE = 'amazing-life-dashboard';

export type ViewType = 'dashboard' | 'list' | 'board' | 'gallery' | 'goal-detail' | 'task-detail';
export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';
export type BoardGroupBy = 'level' | 'goalStatus' | 'parent';
export type DashboardTaskMode = 'important' | 'today' | 'overdue';
