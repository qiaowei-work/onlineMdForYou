-- 演示数据
INSERT INTO article (title, content, summary, word_count) VALUES
('欢迎使用 mdOnline', '# 欢迎 🎉\n\nmdOnline 是一个**在线 Markdown 编辑器**，专注写作体验。\n\n## 特性\n\n- 实时预览\n- 语法高亮\n- 文章管理\n- 分类标签', 'mdOnline 欢迎文章', 35),
('Markdown 语法指南', '# Markdown 语法指南\n\n## 标题\n\n使用 `#` 号标记标题，支持 1-6 级。\n\n## 代码块\n\n```java\npublic class Hello {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, mdOnline!\");\n    }\n}\n```\n\n## 表格\n\n| 功能 | 状态 |\n|------|------|\n| 编辑 | ✅ |\n| 预览 | ✅ |\n| 导出 | 🚧 |', '常用 Markdown 语法速查', 82);

INSERT INTO category (name, sort_order) VALUES ('技术笔记', 1);
INSERT INTO category (name, sort_order) VALUES ('随笔', 2);
INSERT INTO category (name, sort_order) VALUES ('日记', 3);

INSERT INTO article_category (article_id, category_id) VALUES (1, 1);
INSERT INTO article_category (article_id, category_id) VALUES (2, 1);
