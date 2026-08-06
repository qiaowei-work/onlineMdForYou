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
            // 找直接子文件夹
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
}
