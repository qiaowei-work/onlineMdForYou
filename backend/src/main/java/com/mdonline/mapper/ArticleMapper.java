package com.mdonline.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mdonline.entity.Article;
import org.apache.ibatis.annotations.Mapper;

/**
 * 文章 Mapper
 */
@Mapper
public interface ArticleMapper extends BaseMapper<Article> {
}
