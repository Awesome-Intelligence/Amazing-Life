/**
 * Amazing Life - Type Definitions
 * V0.1 Core Data Models
 */

// 目标层级
export type GoalLevel = 1 | 2 | 3 | 4;

// 目标状态
export type GoalStatus = 'active' | 'completed' | 'abandoned';

// 任务状态
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

// 任务优先级
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

// 目标模型（支持动态自定义字段）
export interface Goal {
  'A-id': string;
  'A-type': 'goal';
  'A-title': string;
  'A-level': GoalLevel;
  'A-parent': string | null;
  'A-status': GoalStatus;
  'A-progress': number;
  'A-weight': number;
  'A-starred': boolean;
  'A-start': string;
  'A-due': string | null;
  'A-description': string | null;
  'A-cover': string | null;     // 封面图片URL
  'A-created': string;
  'A-updated': string;
  // 动态自定义字段
  [key: string]: any;
}

// 任务模型（支持动态自定义字段）
export interface Task {
  'A-id': string;
  'A-type': 'task';
  'A-title': string;
  'A-status': TaskStatus;
  'A-priority': TaskPriority;
  'A-start': string | null;
  'A-due': string | null;
  'A-goal': string | null;
  'A-tags': string[];
  'A-source': string | null;
  'A-created': string;
  'A-completed': string | null;
  'A-description': string | null;
  // 动态自定义字段
  [key: string]: any;
}

// 联系人优先级
export type ContactPriority = 1 | 2 | 3 | 4;

// 联系人状态
export type ContactStatus = 'active' | 'archived';

// 联系人性别
export type ContactGender = 'male' | 'female' | 'other' | '';

// 关系类型（默认选项）
export const DEFAULT_CONTACT_RELATIONS = ['家人', '朋友', '同事', '客户', '导师', '同学', '邻居', '其他'];

// 联系人模型（支持动态自定义字段）
export interface Contact {
  'A-id': string;
  'A-type': 'contact';
  'A-title': string;
  'A-nickname': string;
  'A-relation': string;
  'A-priority': ContactPriority;
  'A-status': ContactStatus;
  'A-gender': ContactGender;
  'A-birthday': string | null;
  'A-company': string | null;
  'A-job-title': string | null;
  'A-tags': string[];
  'A-source': string | null;
  'A-met': string | null;
  'A-last-contact': string | null;
  'A-remind-interval': number;
  'A-goals': string[];
  'A-related': string[];
  'A-avatar': string | null;
  'A-phone': string | null;
  'A-email': string | null;
  'A-wechat': string | null;
  'A-description': string | null;
  'A-created': string;
  'A-updated': string;
  [key: string]: any;
}

// 联系人互动记录
export interface ContactInteraction {
  date: string;
  fileName: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
}

// 联系人字段
export type ContactField =
  | 'name' | 'nickname' | 'relation' | 'priority' | 'status'
  | 'gender' | 'birthday' | 'company' | 'jobTitle' | 'tags'
  | 'met' | 'lastContact' | 'remindInterval' | 'goals'
  | 'phone' | 'email' | 'wechat' | 'description';

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
  contactTags: string[];
  isNoteworthy: boolean;
  categoryTags: string[];
}

// 视图类型
export type ViewType = 'list' | 'kanban' | 'gallery' | 'calendar' | 'timeline' | 'dashboard';

// 目标字段
export type GoalField = 'level' | 'title' | 'status' | 'progress' | 'due' | 'created' | 'updated' | 'tasksCount' | 'completedTasksCount' | 'cover';

// 任务字段
export type TaskField = 'title' | 'status' | 'priority' | 'due' | 'goal' | 'tags' | 'created' | 'completed';

// 自定义字段配置
export interface CustomFieldConfig {
  key: string;           // 字段键名（如 'motto', 'color'）
  label: string;         // 显示标签
  type: 'text' | 'number' | 'color' | 'tags' | 'date' | 'url' | 'select';  // 字段类型
  showInViews: string[]; // 在哪些视图中显示 ['gallery', 'list', 'board']
  options?: string;      // select类型的选项，逗号分隔
}

// 视图字段配置
export interface ViewFieldsConfig {
  goal: GoalField[];      // 目标视图显示的字段
  task: TaskField[];      // 任务视图显示的字段
  dashboard: TaskField[]; // 仪表盘任务显示的字段
  board: GoalField[];     // 看板目标显示的字段
  list: GoalField[];      // 列表目标显示的字段
  gallery: GoalField[];   // 画廊目标显示的字段
  contact?: GoalField[];  // 联系人视图显示的字段（可选）
}

// 筛选操作符类型
export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal' | 'is_empty' | 'is_not_empty' | 'is_null' | 'is_not_null' | 'year_equals' | 'year_not_equals' | 'year_before' | 'year_after' | 'year_between';

// 字段类型
export type FilterFieldType = 'string' | 'number' | 'select' | 'date' | 'array' | 'year';

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
  'is_not_null': '不是null',
  'year_equals': '年份等于',
  'year_not_equals': '年份不等于',
  'year_before': '年份早于',
  'year_after': '年份晚于',
  'year_between': '年份区间'
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
  { field: 'A-due-year', label: '截止年份', type: 'year' },
  { field: 'A-start-year', label: '开始年份', type: 'year' },
  { field: 'A-created-year', label: '创建年份', type: 'year' },
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

// 联系人筛选字段定义
export const CONTACT_FILTER_FIELDS: FilterFieldDef[] = [
  { field: 'A-title', label: '姓名', type: 'string' },
  { field: 'A-relation', label: '关系', type: 'select', options: DEFAULT_CONTACT_RELATIONS.map(r => ({ value: r, label: r })) },
  { field: 'A-priority', label: '优先级', type: 'select', options: [
    { value: 1, label: '核心' },
    { value: 2, label: '重要' },
    { value: 3, label: '一般' },
    { value: 4, label: '偶尔' }
  ]},
  { field: 'A-status', label: '状态', type: 'select', options: [
    { value: 'active', label: '活跃' },
    { value: 'archived', label: '已归档' }
  ]},
  { field: 'A-gender', label: '性别', type: 'select', options: [
    { value: 'male', label: '男' },
    { value: 'female', label: '女' },
    { value: 'other', label: '其他' }
  ]},
  { field: 'A-birthday', label: '生日', type: 'date' },
  { field: 'A-last-contact', label: '最近联系', type: 'date' },
  { field: 'A-met', label: '认识日期', type: 'date' },
  { field: 'A-company', label: '公司', type: 'string' },
  { field: 'A-tags', label: '话题标签', type: 'array' }
];

// 视图字段默认值
export const DEFAULT_VIEW_FIELDS: ViewFieldsConfig = {
  goal: ['level', 'title', 'status', 'progress', 'due'],
  task: ['title', 'priority', 'status', 'due', 'goal'],
  dashboard: ['title', 'priority', 'due'],
  board: ['level', 'title', 'status', 'progress'],
  list: ['level', 'title', 'status', 'progress', 'due'],
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
  'completedTasksCount': '已完成数',
  'cover': '封面图'
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

// 视图标签页类型
export type ViewTabType = 'list' | 'board' | 'gallery';

// 视图标签页配置
export interface ViewTab {
  id: string;
  name: string;               // 用户自定义名称
  type: ViewTabType;          // 视图类型
  groupBy?: string;           // 看板分组方式（字段名）
  filters: FilterCondition[];  // 筛选条件
  filterLogic: FilterLogic;    // 筛选逻辑
}

// 分组选项配置
export interface GroupByOption {
  value: string;              // 选项值
  label: string;              // 显示名称
  color?: string;             // 可选颜色
}

// 分组区间配置
export interface GroupByRange {
  min: number;                // 最小值（包含）
  max: number;                // 最大值（不包含）
  label: string;              // 显示名称
}

// 分组字段定义
export interface GroupByField {
  field: string;              // 字段键名（如 'A-level' 或自定义字段 key）
  label: string;              // 显示名称
  type: 'select' | 'range' | 'date';  // 分组类型
  draggable?: boolean;        // 是否支持拖拽更新
  // select 类型：预定义选项
  options?: GroupByOption[];
  // range 类型：区间配置
  ranges?: GroupByRange[];
  // date 类型：日期分组模式
  dateMode?: 'year' | 'month' | 'year-month';
  // 映射到目标字段（用于拖拽更新）
  targetField?: string;
}

// 标准目标分组字段配置
export const GOAL_GROUP_BY_FIELDS: GroupByField[] = [
  {
    field: 'A-level',
    label: '层级',
    type: 'select',
    draggable: true,
    targetField: 'level',
    options: [
      { value: '1', label: '人生', color: '#8B5CF6' },
      { value: '2', label: '阶段', color: '#3B82F6' },
      { value: '3', label: '年度', color: '#6366F1' },
      { value: '4', label: '短期', color: '#22C55E' }
    ]
  },
  {
    field: 'A-status',
    label: '状态',
    type: 'select',
    draggable: true,
    targetField: 'status',
    options: [
      { value: 'active', label: '进行中', color: '#3B82F6' },
      { value: 'completed', label: '已完成', color: '#22C55E' },
      { value: 'abandoned', label: '已放弃', color: '#9CA3AF' }
    ]
  },
  {
    field: 'A-progress',
    label: '进度',
    type: 'range',
    draggable: true,
    targetField: 'progress',
    ranges: [
      { min: 0, max: 25, label: '0-25%' },
      { min: 25, max: 50, label: '25-50%' },
      { min: 50, max: 75, label: '50-75%' },
      { min: 75, max: 101, label: '75-100%' }
    ]
  },
  {
    field: 'A-weight',
    label: '权重',
    type: 'range',
    draggable: true,
    targetField: 'weight',
    ranges: [
      { min: 1, max: 4, label: '低 (1-3)' },
      { min: 4, max: 7, label: '中 (4-6)' },
      { min: 7, max: 11, label: '高 (7-10)' }
    ]
  },
  {
    field: 'A-due-year',
    label: '截止年份',
    type: 'date',
    draggable: false,
    dateMode: 'year'
  },
  {
    field: 'A-start-year',
    label: '开始年份',
    type: 'date',
    draggable: false,
    dateMode: 'year'
  },
  {
    field: 'A-created-year-month',
    label: '创建月份',
    type: 'date',
    draggable: false,
    dateMode: 'year-month'
  },
  {
    field: 'A-due-year-month',
    label: '截止月份',
    type: 'date',
    draggable: false,
    dateMode: 'year-month'
  },
  {
    field: 'A-parent',
    label: '父目标',
    type: 'select',
    draggable: false,
    options: []  // 动态生成
  }
];

// 设置接口
export interface PluginSettings {
  dataPath: string;           // 插件数据目录
  coverPath: string;          // 封面图存储目录
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
  viewTabs: ViewTab[];         // 视图标签页配置
  activeTabId: string | null;  // 当前活动的标签页ID
  customGoalFields: CustomFieldConfig[];  // 自定义目标字段配置
  contactPath: string;              // 联系人目录
  contactTagPrefix: string;        // 联系人标签前缀（默认：人脉）
  contactDefaultInterval: number;  // 默认联系间隔（天）
  contactRelations: string[];      // 自定义关系类型
  customContactFields: CustomFieldConfig[]; // 自定义联系人字段
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

// 联系人字段标签
export const CONTACT_FIELD_LABELS: Record<ContactField, string> = {
  name: '姓名',
  nickname: '昵称',
  relation: '关系',
  priority: '优先级',
  status: '状态',
  gender: '性别',
  birthday: '生日',
  company: '公司',
  jobTitle: '职位',
  tags: '话题',
  met: '认识日期',
  lastContact: '最近联系',
  remindInterval: '联系间隔',
  goals: '关联目标',
  phone: '电话',
  email: '邮箱',
  wechat: '微信',
  description: '备注'
};

export const CONTACT_PRIORITY_LABELS: Record<ContactPriority, string> = {
  1: '核心',
  2: '重要',
  3: '一般',
  4: '偶尔'
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  'active': '活跃',
  'archived': '已归档'
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
  coverPath: 'Amazing Life/Covers',
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
  viewTabs: [],  // 默认空，用户可以添加
  activeTabId: null,
  customGoalFields: [],            // 自定义目标字段配置，默认空
  contactPath: 'Amazing Life/contacts',
  contactTagPrefix: '人脉',
  contactDefaultInterval: 90,
  contactRelations: DEFAULT_CONTACT_RELATIONS,
  customContactFields: []
};

// 默认视图标签页
export function getDefaultViewTabs(): ViewTab[] {
  return [
    {
      id: 'tab_list',
      name: '列表',
      type: 'list',
      filters: [],
      filterLogic: 'and'
    },
    {
      id: 'tab_board',
      name: '看板',
      type: 'board',
      groupBy: 'level',
      filters: [],
      filterLogic: 'and'
    },
    {
      id: 'tab_gallery',
      name: '画廊',
      type: 'gallery',
      filters: [],
      filterLogic: 'and'
    }
  ];
}
