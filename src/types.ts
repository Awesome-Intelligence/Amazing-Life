/**
 * Amazing Life - Type Definitions
 * V0.1 Core Data Models
 */

// 元数据前缀
export const PREFIX = 'A-';

// 目标层级
export type GoalLevel = 1 | 2 | 3 | 4;

// 目标状态
export type GoalStatus = 'active' | 'completed' | 'abandoned';

// 任务状态
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

// 任务优先级
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

// 目标模型
export interface Goal {
  'A-id': string;
  'A-type': 'goal';
  'A-title': string;
  'A-level': GoalLevel;
  'A-parent': string | null;
  'A-status': GoalStatus;
  'A-progress': number;
  'A-weight': number;
  'A-start': string;
  'A-due': string | null;
  'A-created': string;
  'A-updated': string;
}

// 任务模型
export interface Task {
  'A-id': string;
  'A-type': 'task';
  'A-title': string;
  'A-status': TaskStatus;
  'A-priority': TaskPriority;
  'A-due': string | null;
  'A-goal': string | null;
  'A-tags': string[];
  'A-source': string | null;
  'A-created': string;
  'A-completed': string | null;
}

// 目标树节点
export interface GoalTree {
  goal: Goal;
  children: GoalTree[];
  tasks: Task[];
  aggregatedProgress: number;
}

// 解析后的行
export interface ParsedLine {
  lineNumber: number;
  content: string;
  isTask: boolean;
  taskStatus?: 'pending' | 'in-progress' | 'completed';
  goalTags: string[];
  taskTags: string[];
  isNoteworthy: boolean;
  categoryTags: string[];
}

// 设置接口
export interface PluginSettings {
  dataPath: string;           // 插件数据目录
  dailyPath: string;          // 日记目录
  weeklyPath: string;         // 周记目录
  monthlyPath: string;        // 月记目录
  yearlyPath: string;         // 年记目录
  phasePath: string;          // 阶段性记录目录
  goalTagPrefix: string;      // 目标标签前缀
  taskTagPrefix: string;      // 任务标签前缀
  noteworthyTag: string;      // 重要标记
  autoProgressUpdate: boolean;// 自动更新进度
}

// 视图类型
export type ViewType = 'list' | 'kanban' | 'gallery' | 'calendar' | 'timeline' | 'dashboard';

// 层级名称映射
export const LEVEL_NAMES: Record<GoalLevel, string> = {
  1: '人生目标',
  2: '阶段目标',
  3: '年度目标',
  4: '短期目标'
};

// 状态名称映射
export const STATUS_NAMES: Record<TaskStatus, string> = {
  'pending': '待办',
  'in-progress': '进行中',
  'completed': '已完成',
  'cancelled': '已取消'
};

// 优先级名称映射
export const PRIORITY_NAMES: Record<TaskPriority, string> = {
  1: '最高',
  2: '高',
  3: '中',
  4: '低',
  5: '最低'
};

// 默认设置
export const DEFAULT_SETTINGS: PluginSettings = {
  dataPath: 'Amazing Life',
  dailyPath: 'Daily',
  weeklyPath: 'Weekly',
  monthlyPath: 'Monthly',
  yearlyPath: 'Yearly',
  phasePath: 'Phases',
  goalTagPrefix: '目标',
  taskTagPrefix: '任务',
  noteworthyTag: 'noteworthy',
  autoProgressUpdate: true
};
