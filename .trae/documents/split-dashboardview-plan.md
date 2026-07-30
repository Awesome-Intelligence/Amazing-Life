# DashboardView.ts 拆分计划

## Context（背景）

`src/views/DashboardView.ts` 当前约 3600 行（207KB），包含主视图类 `DashboardView`（~70 个方法）以及两个弹窗类 `DeleteConfirmModal`、`CoverImagePickerModal`。单文件过大导致：定位代码困难、修改易引入冲突、难以并行开发。本次目标是在**不改变运行时行为**的前提下，按职责将文件拆分为 9 个模块，主类控制在 ~800 行。

## 拆分模式：组合 + 类型导入

TypeScript 不支持 partial class，且渲染方法大量依赖 `this`（访问 `this.plugin`、`this.selectedGoalId`、`this.currentView` 等状态）。采用**组合模式**：

- 每个渲染/工具模块导出一个 `XxxHelper` 类，构造函数接收 `DashboardView` 实例，通过 `this.view` 访问共享状态。
- 为避免循环依赖，helper 模块使用 `import type { DashboardView }` 仅导入类型（编译期擦除），DashboardView 单向 import helper 类。
- DashboardView 当前 `private` 的共享成员（`plugin`、`selectedGoalId`、`currentView`、`tempFilterConditions` 等）改为 `public`，供 helper 访问。内部插件可接受。

## 目标文件结构

```
src/views/
├── DashboardView.ts          # 主类：状态、生命周期、render() 编排、事件绑定、show*Modal 方法
├── view-types.ts             # 类型 + 常量（ViewType, CalendarViewMode, BoardGroupBy, DASHBOARD_VIEW_TYPE）
├── modals.ts                 # DeleteConfirmModal, CoverImagePickerModal（已独立的弹窗类）
├── filters.ts                # 筛选逻辑：applyFilterConditions, evaluateCondition, renderFilter*, getOperatorsForFieldType
└── renderers/
    ├── dashboard.ts          # renderDashboardView, renderListView
    ├── board.ts              # renderBoardView, renderGoalsForBoard, bindBoardDragEvents, startGoalDrag, endGoalDrag
    ├── gallery.ts            # renderGalleryView
    ├── detail.ts             # renderGoalDetailView, renderTaskDetailView, renderGoalFields, renderTaskFields, renderEmpty
    └── calendar.ts           # renderCalendar, renderDayView, renderWeekView, renderMonthView, renderYearView, bindCalendarEvents
```

## 各模块职责

### 1. `view-types.ts`（新增）
从 DashboardView.ts 顶部抽出：
- 常量 `DASHBOARD_VIEW_TYPE`
- 类型 `ViewType`、`CalendarViewMode`、`BoardGroupBy`

### 2. `modals.ts`（新增）
原样搬迁两个**已独立**的类，零风险：
- `DeleteConfirmModal`（原 L3366-L3401）
- `CoverImagePickerModal`（原 L3403-L3597）
- 注意：`CoverImagePickerModal` 内的 `getCoverImageUrl` 是 DashboardView 同名方法的副本，后续可统一引用 DashboardView 的实现，本次先保留原样避免行为变化。

### 3. `filters.ts`（新增）
导出 `FilterHelper` 类，封装筛选相关方法（均需访问 `this.view.tempFilterConditions` 等状态）：
- `applyFilterConditions`、`evaluateCondition`
- `renderFilterBar`、`renderFilterBuilder`、`renderFilterCondition`、`renderConditionValue`
- `getOperatorsForFieldType`、`getFieldType`

### 4. `renderers/dashboard.ts`（新增）
导出 `DashboardRenderer` 类：
- `renderDashboardView`、`renderListView`

### 5. `renderers/board.ts`（新增）
导出 `BoardRenderer` 类：
- `renderBoardView`、`renderGoalsForBoard`
- `bindBoardDragEvents`、`startGoalDrag`、`endGoalDrag`

### 6. `renderers/gallery.ts`（新增）
导出 `GalleryRenderer` 类：
- `renderGalleryView`

### 7. `renderers/detail.ts`（新增）
导出 `DetailRenderer` 类：
- `renderGoalDetailView`、`renderTaskDetailView`
- `renderGoalFields`、`renderTaskFields`、`renderEmpty`

### 8. `renderers/calendar.ts`（新增）
导出 `CalendarRenderer` 类：
- `renderCalendar`、`renderDayView`、`renderWeekView`、`renderMonthView`、`renderYearView`
- `bindCalendarEvents`

### 9. `DashboardView.ts`（精简）
保留：
- 类定义、字段声明、构造函数
- 生命周期：`onOpen`、`onClose`、`loadAndRender`、`render`（编排，委托各 renderer）、`removeStyles`
- 导航与标签页：`navigateTo`、`goBack`、`switchTab`、`addTab`、`removeTab`、`renameTab`、`duplicateTab`、`showTabContextMenu`、`editTabName`、`getViewTabs`、`getActiveTab`、`updateActiveTabFilters`、`updateActiveTabGroupBy`、`getCurrentFilters`
- 数据访问：`getGoal`、`getTask`、`getTasksByGoal`、`getGoalTitle`、`getGoalLevel`
- 字段配置：`getCurrentViewType`、`getTaskFields`、`getGoalFields`、`getEnabledCustomFields`
- 工具：`getCoverImageUrl`、`formatCustomFieldValue`、`renderCustomFields`、`generateFilterId`、`generateTabId`
- 事件绑定：`bindEvents`（核心事件路由，调用各 renderer 的 bind 方法）
- 弹窗编排：`showDeleteGoalWithChildrenModal`、`showParentSelectorModal`、`showCreateGoalModal`、`showTaskDetailModal`、`showCreateTaskModal`、`showCreateTaskModalForGoal`、`startFieldEdit`、`startCustomFieldEdit`、`showAddCustomFieldModal`、`showFieldSettingsModal`、`showAddViewDropdown`

构造函数中实例化各 helper：
```typescript
this.filterHelper = new FilterHelper(this);
this.dashboardRenderer = new DashboardRenderer(this);
this.boardRenderer = new BoardRenderer(this);
this.galleryRenderer = new GalleryRenderer(this);
this.detailRenderer = new DetailRenderer(this);
this.calendarRenderer = new CalendarRenderer(this);
```

`render()` 编排逻辑中按 `currentView` 委托对应 renderer，例如：
```typescript
case 'board':
  this.boardRenderer.renderBoardView(goals, tasks);
  break;
```

## 实施步骤

1. **新建 `view-types.ts`**：抽出常量与类型，DashboardView.ts 改为 `import`。
2. **新建 `modals.ts`**：原样搬迁 `DeleteConfirmModal`、`CoverImagePickerModal`，DashboardView.ts 改为 `import`。
3. **新建 `renderers/` 目录及 5 个文件**：每个 renderer 类搬迁对应方法，方法体保持不变，内部 `this.xxx` 改为 `this.view.xxx`（仅限访问 DashboardView 成员；方法内局部变量不变）。
4. **新建 `filters.ts`**：搬迁筛选方法为 `FilterHelper` 类。
5. **改造 `DashboardView.ts`**：
   - 字段 `private` → `public`（仅 helper 需访问的：`plugin`、`selectedGoalId`、`selectedTaskId`、`currentView`、`tempFilterConditions`、`tempFilterLogic`、`tempShowFilterBuilder`、`calendarDate`、`calendarMode`、`viewHistory` 等）
   - 构造函数实例化各 helper
   - 删除已搬迁方法，`render()` 与 `bindEvents()` 改为委托调用
6. **构建验证**：`npm run build`（tsc 类型检查 + esbuild 打包）必须通过。
7. **安装到测试库**：复制 `main.js`、`manifest.json` 到 `reference/obsidian-test/.obsidian/plugins/amazing-life/`。

## 验证方式

1. **编译验证**：`npm run build` 无类型错误、打包成功。
2. **行为验证**（在 Obsidian 测试库中）：
   - 打开仪表盘，切换 6 种视图（仪表盘/列表/看板/画廊/目标详情/任务详情）均正常渲染
   - 看板拖拽功能正常
   - 日历日/周/月/年视图切换正常
   - 筛选器条件构建、应用正常
   - 创建目标/任务弹窗、删除确认弹窗、封面图选择弹窗正常
   - 字段内联编辑正常
3. **回归点**：本次为纯结构重构，不改逻辑，重点验证上述视图切换与交互无回归。

## 风险与注意

- **`this` → `this.view` 改写**：搬迁方法时需逐一核对，遗漏会导致运行时 `undefined`。tsc 能捕获大部分类型错误。
- **循环依赖**：helper 用 `import type` 导入 DashboardView，避免运行时循环。
- **事件绑定**：`bindEvents` 中部分事件调用了 renderer 内部方法，需确保委托路径正确。
- **封面图上传**：刚修复的移动端封面图逻辑位于 `CoverImagePickerModal`，原样搬迁不受影响。
