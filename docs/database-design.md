# mdOnline 数据库设计

> 版本: v1.0 | 数据库: PostgreSQL 17（生产）/ H2（开发）

---

## 概述

mdOnline 是一个在线 Markdown 编辑器，核心业务围绕**文章**的创建、编辑、组织、导出展开。以下为当前版本（v1.0）的表结构设计。

---

## ER 关系图

```
┌──────────┐       ┌────────────────────┐       ┌──────────┐
│  article │───────│ article_category   │───────│ category │
│          │  1:N  │                    │  N:1  │          │
└──────────┘       └────────────────────┘       └──────────┘
```

---

## 表结构

### 1. article（文章）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `BIGINT` | PK, AUTO_INCREMENT | 主键 |
| `title` | `VARCHAR(255)` | NOT NULL, DEFAULT '' | 文章标题 |
| `content` | `TEXT` | NOT NULL | Markdown 正文 |
| `summary` | `VARCHAR(500)` | DEFAULT '' | 摘要（列表页展示用） |
| `word_count` | `INT` | DEFAULT 0 | 字数统计 |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | 最后更新时间 |
| `deleted` | `BOOLEAN` | DEFAULT FALSE | 逻辑删除标志 |

**索引建议**：
- `idx_article_created_at` ON `(created_at DESC)` — 列表排序
- `idx_article_title` ON `(title)` — 标题搜索（后续需要全文索引）

### 2. category（分类）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `BIGINT` | PK, AUTO_INCREMENT | 主键 |
| `name` | `VARCHAR(100)` | NOT NULL | 分类名称 |
| `parent_id` | `BIGINT` | DEFAULT 0 | 父分类 ID，0 表示顶级 |
| `sort_order` | `INT` | DEFAULT 0 | 排序权重 |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `deleted` | `BOOLEAN` | DEFAULT FALSE | 逻辑删除 |

### 3. article_category（文章-分类关联）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `article_id` | `BIGINT` | PK, FK → article.id | 文章 ID |
| `category_id` | `BIGINT` | PK, FK → category.id | 分类 ID |

---

## PostgreSQL 建表语句

```sql
CREATE TABLE article (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    summary     VARCHAR(500) DEFAULT '',
    word_count  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted     BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_article_created_at ON article (created_at DESC);
CREATE INDEX idx_article_title ON article (title);

CREATE TABLE category (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   BIGINT DEFAULT 0,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted     BOOLEAN DEFAULT FALSE
);

CREATE TABLE article_category (
    article_id  BIGINT REFERENCES article(id),
    category_id BIGINT REFERENCES category(id),
    PRIMARY KEY (article_id, category_id)
);
```

---

## 后续计划（v1.1+）

| 表 | 用途 |
|----|------|
| `user` | 用户系统（OAuth 登录） |
| `attachment` | 图片/文件上传 |
| `export_record` | 导出历史（PDF/HTML） |
| `revision` | 文章版本历史 |
