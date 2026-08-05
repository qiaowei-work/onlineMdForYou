package com.mdonline.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mdonline.entity.Article;
import com.mdonline.mapper.ArticleMapper;
import com.mdonline.service.ArticleService;
import org.springframework.stereotype.Service;

/**
 * 文章 Service 实现
 */
@Service
public class ArticleServiceImpl extends ServiceImpl<ArticleMapper, Article> implements ArticleService {
}
