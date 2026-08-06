package com.mdonline.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mdonline.entity.Folder;

/**
 * 文件夹 Service 接口
 */
public interface FolderService extends IService<Folder> {

    /**
     * 级联软删除：删除文件夹及其所有子文件夹和文章
     */
    void cascadeDelete(Long folderId);
}
