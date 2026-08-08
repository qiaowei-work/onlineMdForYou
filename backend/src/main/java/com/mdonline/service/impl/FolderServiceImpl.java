package com.mdonline.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mdonline.entity.Article;
import com.mdonline.entity.Folder;
import com.mdonline.mapper.ArticleMapper;
import com.mdonline.mapper.FolderMapper;
import com.mdonline.service.FolderService;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * 文件夹 Service 实现
 */
@Service
public class FolderServiceImpl extends ServiceImpl<FolderMapper, Folder> implements FolderService {

    private final ArticleMapper articleMapper;

    public FolderServiceImpl(ArticleMapper articleMapper) {
        this.articleMapper = articleMapper;
    }

    @Override
    public void cascadeDelete(Long folderId) {
        // 1. 收集所有需要删除的文件夹 ID（BFS 遍历子树）
        List<Long> folderIds = new ArrayList<>();
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(folderId);

        while (!queue.isEmpty()) {
            Long currentId = queue.poll();
            folderIds.add(currentId);
            List<Folder> children = list(new LambdaQueryWrapper<Folder>()
                    .eq(Folder::getParentId, currentId));
            for (Folder child : children) {
                queue.add(child.getId());
            }
        }

        // 2. 软删除所有子文件夹
        if (!folderIds.isEmpty()) {
            update(new LambdaUpdateWrapper<Folder>()
                    .in(Folder::getId, folderIds)
                    .set(Folder::getDeleted, true));
        }

        // 3. 软删除这些文件夹下的所有文章
        articleMapper.update(null,
                new LambdaUpdateWrapper<Article>()
                        .in(Article::getFolderId, folderIds)
                        .set(Article::getDeleted, true));
    }

    @Override
    public void moveFolder(Long folderId, Long newParentId) {
        // 循环校验：newParentId 不能是 folderId 自身或其子孙
        if (newParentId.equals(folderId)) return;
        List<Long> descendants = new ArrayList<>();
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(folderId);
        while (!queue.isEmpty()) {
            Long currentId = queue.poll();
            descendants.add(currentId);
            list(new LambdaQueryWrapper<Folder>().eq(Folder::getParentId, currentId))
                    .forEach(f -> queue.add(f.getId()));
        }
        if (descendants.contains(newParentId)) return; // 循环引用，拒绝

        Folder folder = getById(folderId);
        if (folder == null) return;
        folder.setParentId(newParentId);
        updateById(folder);
    }

    @Override
    public void updateSort(Long folderId, Integer sortOrder) {
        Folder folder = getById(folderId);
        if (folder == null) return;
        folder.setSortOrder(sortOrder);
        updateById(folder);
    }
}
