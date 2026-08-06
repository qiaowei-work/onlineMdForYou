# mdOnline 数据库设计

> 版本: v2.0 | 数据库: PostgreSQL 17（生产）/ H2（开发）

---

## 概述

mdOnline 是一个在线 Markdown 编辑器，核心围绕**文章**的创作、组织和文件夹管理。v2.0 简化为 folder → article 的二级结构。

---

## ER 关系图

```
┌──────────┐        ┌──────────┐
│  folder  │───────▶│ article  │
│          │  1:N   │          │
└──────────┘        └──────────┘
  folder_id=0 → 根目录（未分类）
```

---

## 表结构

### 1. folder（文件夹）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `BIGINT` | PK, AUTO_INCREMENT | 主键 |
| `name` | `VARCHAR(100)` | NOT NULL | 文件夹名称 |
| `parent_id` | `BIGINT` | DEFAULT 0 | 父文件夹 ID，0=根目录 |
| `sort_order` | `INT` | DEFAULT 0 | 排序权重 |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `deleted` | `BOOLEAN` | DEFAULT FALSE | 逻辑删除 |

### 2. article（文章）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `BIGINT` | PK, AUTO_INCREMENT | 主键 |
| `title` | `VARCHAR(255)` | NOT NULL, DEFAULT '' | 文章标题 |
| `content` | `TEXT` | NOT NULL | Markdown 正文 |
| `summary` | `VARCHAR(500)` | DEFAULT '' | 摘要 |
| `folder_id` | `BIGINT` | DEFAULT 0 | 所属文件夹 ID，0=根目录 |
| `word_count` | `INT` | DEFAULT 0 | 字数统计 |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | 最后更新时间 |
| `deleted` | `BOOLEAN` | DEFAULT FALSE | 逻辑删除 |

**索引建议**：
- `idx_article_folder_id` ON `(folder_id)` — 按文件夹查询
- `idx_article_created_at` ON `(created_at DESC)` — 列表排序
- `idx_article_title` ON `(title)` — 标题搜索

---

## PostgreSQL 建表语句

```sql
CREATE TABLE folder (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   BIGINT DEFAULT 0,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted     BOOLEAN DEFAULT FALSE
);

CREATE TABLE article (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    summary     VARCHAR(500) DEFAULT '',
    folder_id   BIGINT DEFAULT 0 REFERENCES folder(id),
    word_count  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted     BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_article_folder_id ON article (folder_id);
CREATE INDEX idx_article_created_at ON article (created_at DESC);
CREATE INDEX idx_article_title ON article (title);
```

---

## 后续计划

| 表 | 用途 |
|----|------|
| `user` | 用户系统（OAuth 登录） |
| `article_revision` | 文章版本历史（每次保存快照） |
| `attachment` | 图片/文件上传 |
