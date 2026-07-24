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

// 筛选操作符类型
export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal' | 'is_empty' | 'is_not_empty' | 'is_null' | 'is_not_null';

// 字段类型
export type FilterFieldType = 'string' | 'number' | 'select' | 'date' | 'array';

// 筛选字段定义
export interface FilterFieldDef {
  field: string;
  label: string;
  type: FilterFieldType;
  options?: { value: string | number; label: string }[]; // 对于select类型
  min?: number; // 对于number类型
  max?: number;
}

// 单一筛选条件
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | number | null;
}

// 筛选条件组合
export type FilterLogic = 'and' | 'or';

// 筛选视图（保存的筛选配置）
export interface SavedFilterView {
  id: string;
  name: string;
  conditions: FilterCondition[];
  logic: FilterLogic;
  viewType?: ViewType; // 可选，关联的视图类型
  createdAt: string;
  updatedAt: string;
}

// 筛选状态
export interface FilterState {
  conditions: FilterCondition[];
  logic: FilterLogic;
}

// 筛选操作符标签
export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  'equals': '等于',
  'not_equals': '不等于',
  'contains': '包含',
  'not_contains': '不包含',
  'starts_with': '开头是',
  'ends_with': '结尾是',
  'greater_than': '大于',
  'less_than': '小于',
  'greater_or_equal': '大于等于',
  'less_or_equal': '小于等于',
  'is_empty': '为空',
  'is_not_empty': '不为空',
  'is_null': '是null',
  'is_not_null': '不是null'
};

// 目标筛选字段定义
export const GOAL_FILTER_FIELDS: FilterFieldDef[] = [
  { field: 'A-level', label: '层级', type: 'select', options: [
    { value: 1, label: '人生' },
    { value: 2, label: '阶段' },
    { value: 3, label: '年度' },
    { value: 4, label: '短期' }
  ]},
  { field: 'A-title', label: '标题', type: 'string' },
  { field: 'A-status', label: '状态', type: 'select', options: [
    { value: 'active', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'abandoned', label: '已放弃' }
  ]},
  { field: 'A-progress', label: '进度', type: 'number', min: 0, max: 100 },
  { field: 'A-weight', label: '权重', type: 'number', min: 1 },
  { field: 'A-due', label: '截止日期', type: 'date' },
  { field: 'A-start', label: '开始日期', type: 'date' },
  { field: 'A-created', label: '创建时间', type: 'date' },
  { field: 'A-updated', label: '更新时间', type: 'date' },
  { field: 'A-parent', label: '父目标', type: 'string' }
];

// 任务筛选字段定义
export const TASK_FILTER_FIELDS: FilterFieldDef[] = [
  { field: 'A-title', label: '标题', type: 'string' },
  { field: 'A-status', label: '状态', type: 'select', options: [
    { value: 'pending', label: '待办' },
    { value: 'in-progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' }
  ]},
  { field: 'A-priority', label: '优先级', type: 'select', options: [
    { value: 1, label: '最高' },
    { value: 2, label: '高' },
    { value: 3, label: '中' },
    { value: 4, label: '低' },
    { value: 5, label: '最低' }
  ]},
  { field: 'A-due', label: '截止日期', type: 'date' },
  { field: 'A-created', label: '创建时间', type: 'date' },
  { field: 'A-completed', label: '完成时间', type: 'date' },
  { field: 'A-tags', label: '标签', type: 'array' }
];

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
  savedFilterViews: SavedFilterView[]; // 保存的筛选视图
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
  viewFields: DEFAULT_VIEW_FIELDS,
  savedFilterViews: []
};
