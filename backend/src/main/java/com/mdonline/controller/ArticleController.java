package com.mdonline.controller;

import com.mdonline.common.Result;
import com.mdonline.entity.Article;
import com.mdonline.service.ArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 文章控制器 — 演示 CRUD 接口
 */
@Tag(name = "文章管理", description = "文章的增删改查接口")
@RestController
@RequestMapping("/api/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @Operation(summary = "获取文章列表")
    @GetMapping
    public Result<List<Article>> list() {
        return Result.ok(articleService.list());
    }

    @Operation(summary = "获取文章详情")
    @GetMapping("/{id}")
    public Result<Article> getById(
            @Parameter(description = "文章 ID", example = "1")
            @PathVariable Long id) {
        Article article = articleService.getById(id);
        if (article == null) {
            return Result.fail(404, "文章不存在");
        }
        return Result.ok(article);
    }

    @Operation(summary = "创建文章")
    @PostMapping
    public Result<Article> create(@RequestBody Article article) {
        // 自动计算字数
        if (article.getContent() != null) {
            article.setWordCount(article.getContent().length());
        }
        articleService.save(article);
        return Result.ok(article);
    }

    @Operation(summary = "更新文章")
    @PutMapping("/{id}")
    public Result<Article> update(
            @Parameter(description = "文章 ID") @PathVariable Long id,
            @RequestBody Article article) {
        Article existing = articleService.getById(id);
        if (existing == null) {
            return Result.fail(404, "文章不存在");
        }
        article.setId(id);
        if (article.getContent() != null) {
            article.setWordCount(article.getContent().length());
        }
        articleService.updateById(article);
        return Result.ok(articleService.getById(id));
    }

    @Operation(summary = "删除文章（逻辑删除）")
    @DeleteMapping("/{id}")
    public Result<Void> delete(
            @Parameter(description = "文章 ID") @PathVariable Long id) {
        boolean removed = articleService.removeById(id);
        return removed ? Result.ok() : Result.fail(404, "文章不存在");
    }
}
