package com.mdonline.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.mdonline.common.Result;
import com.mdonline.entity.Folder;
import com.mdonline.service.FolderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 文件夹管理
 */
@Tag(name = "文件夹管理", description = "文件夹的增删改查")
@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @Operation(summary = "获取文件夹列表")
    @GetMapping
    public Result<List<Folder>> list(
            @Parameter(description = "父文件夹 ID，0=根目录")
            @RequestParam(defaultValue = "0") Long parentId) {
        List<Folder> list = folderService.list(
                new LambdaQueryWrapper<Folder>()
                        .eq(Folder::getParentId, parentId)
                        .orderByAsc(Folder::getSortOrder));
        return Result.ok(list);
    }

    @Operation(summary = "获取完整文件夹树")
    @GetMapping("/tree")
    public Result<List<Map<String, Object>>> tree() {
        List<Map<String, Object>> tree = buildTree(0L);
        return Result.ok(tree);
    }

    @Operation(summary = "新建文件夹")
    @PostMapping
    public Result<Folder> create(@RequestBody Folder folder) {
        folderService.save(folder);
        return Result.ok(folder);
    }

    @Operation(summary = "重命名文件夹")
    @PutMapping("/{id}")
    public Result<Folder> rename(
            @Parameter(description = "文件夹 ID") @PathVariable Long id,
            @RequestBody Folder folder) {
        Folder existing = folderService.getById(id);
        if (existing == null) {
            return Result.fail(404, "文件夹不存在");
        }
        existing.setName(folder.getName());
        folderService.updateById(existing);
        return Result.ok(existing);
    }

    @Operation(summary = "移动文件夹到新父节点")
    @PutMapping("/{id}/move")
    public Result<Void> move(
            @Parameter(description = "文件夹 ID") @PathVariable Long id,
            @Parameter(description = "新父文件夹 ID") @RequestParam Long parentId) {
        Folder existing = folderService.getById(id);
        if (existing == null) return Result.fail(404, "文件夹不存在");
        folderService.moveFolder(id, parentId);
        return Result.ok();
    }

    @Operation(summary = "更新文件夹排序")
    @PutMapping("/{id}/sort")
    public Result<Void> sort(
            @Parameter(description = "文件夹 ID") @PathVariable Long id,
            @Parameter(description = "新排序值") @RequestParam Integer sortOrder) {
        Folder existing = folderService.getById(id);
        if (existing == null) return Result.fail(404, "文件夹不存在");
        folderService.updateSort(id, sortOrder);
        return Result.ok();
    }

    @Operation(summary = "删除文件夹（级联软删除子文件夹和文章）")
    @DeleteMapping("/{id}")
    public Result<Void> delete(
            @Parameter(description = "文件夹 ID") @PathVariable Long id) {
        Folder existing = folderService.getById(id);
        if (existing == null) {
            return Result.fail(404, "文件夹不存在");
        }
        folderService.cascadeDelete(id);
        return Result.ok();
    }

    /**
     * 递归构建文件夹树
     */
    private List<Map<String, Object>> buildTree(Long parentId) {
        List<Folder> folders = folderService.list(
                new LambdaQueryWrapper<Folder>()
                        .eq(Folder::getParentId, parentId)
                        .orderByAsc(Folder::getSortOrder));

        return folders.stream().map(f -> {
            Map<String, Object> node = new java.util.LinkedHashMap<>();
            node.put("id", f.getId());
            node.put("name", f.getName());
            node.put("parentId", f.getParentId());
            node.put("sortOrder", f.getSortOrder());
            node.put("children", buildTree(f.getId()));
            return node;
        }).toList();
    }
}
