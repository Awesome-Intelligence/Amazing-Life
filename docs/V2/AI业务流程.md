# AI 业务流程

**版本**: v2.0.0  
**创建日期**: 2026-07-22

---

## 一、AI 交互流程

### 1.1 目标分析流程

```
用户查看目标进度
    ↓
点击「AI 分析」按钮
    ↓
AI 分析关联任务完成情况
    ↓
生成分析报告和建议
    ↓
展示在目标记或仪表盘中
```

### 1.2 计划生成流程

```
用户选择目标
    ↓
点击「生成计划」
    ↓
AI 分析目标当前进度和剩余时间
    ↓
自动分解为周/日任务
    ↓
用户确认后可一键导入日记
```

### 1.3 报告生成流程

```
用户完成本周日记汇总
    ↓
点击「AI 生成周报」
    ↓
AI 分析 #noteworthy 内容
    ↓
生成结构化周报（成就/挑战/下周计划）
    ↓
用户编辑后可插入周记
```

---

## 二、提示词设计

### 2.1 目标分析提示词

```typescript
const PROMPTS = {
  analyzeGoal: `
作为一个目标管理专家，请分析以下目标的完成情况：

目标：{goalTitle}
目标描述：{goalDescription}
当前进度：{progress}%
开始日期：{startDate}
截止日期：{dueDate}

关联任务完成情况：
{taskSummary}

请提供以下分析（JSON格式）：
{
  "trend": "improving | stable | declining",
  "factors": ["成功因素1", "失败因素1"],
  "riskLevel": "low | medium | high",
  "suggestions": ["建议1", "建议2"],
  "predictedCompletion": "YYYY-MM-DD | null",
  "confidence": 0.85
}
`,

  generateSuggestions: `
作为一个效率专家，请根据以下上下文提供改进建议：

当前目标：{goalTitle}
当前进度：{progress}%
已完成任务：{completedTasks}
未完成任务：{pendingTasks}

请提供 3-5 条具体、可执行的改进建议。
`
};
```

### 2.2 计划生成提示词

```typescript
const PROMPTS = {
  generateWeeklyPlan: `
作为一个效率专家，请根据以下目标生成本周的任务计划：

目标：{goalTitle}
目标进度：{progress}%
截止日期：{dueDate}
本周可用时间：{availableHours} 小时
已安排任务：{existingTasks}

请生成任务计划（JSON格式）：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "priority": 1-5,
      "estimatedHours": 2,
      "reasoning": "为什么这个任务重要"
    }
  ],
  "reasoning": "整体计划思路",
  "tips": ["建议1", "建议2"]
}
`,

  decomposeGoal: `
请将以下目标分解为可执行的任务：

目标：{goalTitle}
目标描述：{goalDescription}
截止日期：{dueDate}

要求：
- 分解为 5-10 个具体任务
- 每个任务可在一周内完成
- 按优先级排序
- 考虑任务之间的依赖关系

请以 Markdown 格式输出。
`
};
```

### 2.3 报告生成提示词

```typescript
const PROMPTS = {
  generateWeeklyReport: `
请根据以下本周记录生成周报：

本周日期范围：{weekStart} ~ {weekEnd}

重要记录（#noteworthy）：
{noteworthyItems}

任务完成情况：
- 已完成：{completedTasks}
- 未完成：{pendingTasks}

请生成结构化周报（Markdown格式）：
## 本周成就
- 成就1
- 成就2

## 遇到的挑战
- 挑战1
- 挑战2

## 下周计划
- 计划1
- 计划2

## 反思与收获
- 收获1
`,

  generateMonthlyReport: `
请根据以下本月记录生成月报：

本月：{month} {year}

周报汇总：
{weeklyReports}

整体统计数据：
- 完成任务总数：{totalCompleted}
- 目标进度变化：{progressChange}%
- 重要记录数量：{noteworthyCount}

请生成月度总结报告（Markdown格式）。
`
};
```

---

## 三、错误处理流程

### 3.1 错误类型

| 错误类型 | 用户提示 |
|----------|----------|
| NETWORK_ERROR | 网络错误，请检查连接 |
| RATE_LIMIT | 请求过于频繁，请稍后再试 |
| QUOTA_EXCEEDED | API 配额已用完，请等待或升级 |
| INVALID_API_KEY | API 密钥无效，请检查配置 |
| MODEL_UNAVAILABLE | 模型暂时不可用，请稍后再试 |
| CONTENT_FILTERED | 内容被过滤，请修改后重试 |
| TIMEOUT | 请求超时，请重试 |

### 3.2 重试策略

```typescript
// 自动重试逻辑
最大重试次数：3
重试延迟：1s → 2s → 4s（指数退避）
可重试错误：网络错误、超时、频率限制
```

---

## 四、服务选择策略

```typescript
// 自动选择最优提供商
优先级：本地模型 > 云端模型
选择依据：
- 简单任务 → 响应快的模型
- 复杂任务 → 能力强的模型
- 隐私优先 → 本地模型
```

---

*本文档最后更新于 2026-07-22*
