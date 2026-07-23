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

// 视图类型
export type ViewType = 'list' | 'kanban' | 'gallery' | 'calendar' | 'timeline' | 'dashboard';

// 目标字段
export type GoalField = 'level' | 'title' | 'status' | 'progress' | 'due' | 'created' | 'updated' | 'tasksCount' | 'completedTasksCount';

// 任务字段
export type TaskField = 'title' | 'status' | 'priority' | 'due' | 'goal' | 'tags' | 'created' | 'completed';

// 视图字段配置
export interface ViewFieldsConfig {
  goal: GoalField[];      // 目标视图显示的字段
  task: TaskField[];      // 任务视图显示的字段
  dashboard: TaskField[]; // 仪表盘任务显示的字段
  board: TaskField[];     // 看板任务显示的字段
  list: TaskField[];      // 列表任务显示的字段
  gallery: GoalField[];   // 画廊目标显示的字段
}

// 视图字段默认值
export const DEFAULT_VIEW_FIELDS: ViewFieldsConfig = {
  goal: ['level', 'title', 'status', 'progress', 'due'],
  task: ['title', 'priority', 'status', 'due', 'goal'],
  dashboard: ['title', 'priority', 'due'],
  board: ['title', 'priority'],
  list: ['title', 'priority', 'status', 'due', 'goal'],
  gallery: ['level', 'title', 'progress', 'tasksCount']
};

// 所有可用的目标字段
export const GOAL_FIELD_LABELS: Record<GoalField, string> = {
  'level': '层级',
  'title': '标题',
  'status': '状态',
  'progress': '进度',
  'due': '截止日期',
  'created': '创建时间',
  'updated': '更新时间',
  'tasksCount': '任务数量',
  'completedTasksCount': '已完成数'
};

// 所有可用的任务字段
export const TASK_FIELD_LABELS: Record<TaskField, string> = {
  'title': '标题',
  'status': '状态',
  'priority': '优先级',
  'due': '截止日期',
  'goal': '关联目标',
  'tags': '标签',
  'created': '创建时间',
  'completed': '完成时间'
};

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
  viewFields: ViewFieldsConfig; // 视图字段配置
}

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
  autoProgressUpdate: true,
  viewFields: DEFAULT_VIEW_FIELDS
};
