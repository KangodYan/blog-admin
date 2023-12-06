import { Button, Input, Message, Select } from '@arco-design/web-react';
import { useTitle } from 'ahooks';
import classNames from 'classnames';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import MarkDown from '@/components/MarkDown';
import { ArticleInputType, ArticleOutputType, getMdFileData, useCreateArticle, useUpdateArticle } from '@/services/article';
import { useGetAllClasses } from '@/services/classes';
import { useGetAllTag } from '@/services/tag';
import { siteTitle } from '@/utils/constant';
import {
  classCountChange,
  containsChineseCharacters,
  isValidDateString
} from '@/utils/functions';
import { useScrollSync } from '@/utils/hooks/useScrollSync';

import { Title } from '../titleConfig';
import s from './index.module.scss';

const AddArticle: React.FC = () => {
  useTitle(`${siteTitle} | ${Title.AddArticle}`);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();


  // 同步左右两边屏幕滚动，让它们一直处于同等位置
  const { leftRef, rightRef, handleScrollRun } = useScrollSync();

  // 接收跳转的前一页面传值（列表数据）为默认值
  const from = searchParams.get('from');
  const articleOutput: ArticleOutputType = location.state || {};
  const id = Number(articleOutput.id || undefined);
  // 使用useState可修改传值
  const [titleEng, setTitleEng] = useState(articleOutput.titleEng || '');
  const [defaultClassText, setDefaultClassText] = useState('');
  const [title, setTitle] = useState(articleOutput.title || '');
  const [classes, setClasses] = useState(articleOutput.classes || '');
  const [tags, setTags] = useState<string[]>(articleOutput.tags || []);
  const postedAt = articleOutput.postedAt;
  const dateInitialValue = postedAt ? dayjs(postedAt).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss');
  const [localDate, setLocalDate] = useState(dateInitialValue);

  // 请求 API 获取md文件数据
  const { data: content } = getMdFileData(titleEng, !!id);
  const [localContent, setLocalContent] = useState<string>('');
  // 监听content变化，直到有值为止，防止异步请求结果返回，晚于初始页面渲染的时间
  useEffect(() => {
    if (content) {
      setLocalContent(typeof content === 'string' ? content : '');
    }
  }, [content]);

  // API hooks
  const { mutateAsync: createMutateAsync } = useCreateArticle();
  const { mutateAsync: updateMutateAsync } = useUpdateArticle();
  const { tagList, tagIsLoading } = useGetAllTag();
  const { classesList, classesIsLoading } = useGetAllClasses();

  const addData = (type: 'post' | 'draft', data: ArticleInputType) => {
    createMutateAsync(data);
    navigate(
      `${
        type === 'post' ? '/admin/article' : '/admin/draft'
      }?page=1&updated=1&clearOther=1`
    );
  };

  const updateData = (type: 'post' | 'draft', data: ArticleInputType) => {
    updateMutateAsync(data);
    navigate(
      `${
        type === 'post' ? '/admin/article' : '/admin/draft'
      }?page=1&updated=1&clearOther=1`
    );
  };

  // const isArticleUnique = async () => {
  //   const res = await getWhereDataAPI(DB.Article, {
  //     // titleEng: _.eq(titleEng)
  //   });
  //   const sameEngInArticles = res.data.filter(({ _id }: { _id: string }) => _id !== id);
  //   return !sameEngInArticles.length;
  // };

  // 新建页面：
  //   发布：
  //     选择了分类：classCount++
  //     未选择分类：
  //   存草稿：

  // 编辑页面：
  //   文章页进来：
  //     发布：
  //       修改了分类：
  //         新的不为空：old--，new++
  //         新的为空：old--
  //       未修改分类：
  //     存草稿：非空old--
  //   草稿页进来：
  //     发布：
  //       选择了分类：classCount++
  //       未选择分类：
  //     存草稿：

  const postArticle = async (type: 'post' | 'draft') => {
    if (!title || !localDate || !localContent) {
      Message.info('请至少输入中文标题、时间、正文');
      return;
    }
    if (containsChineseCharacters(titleEng)) {
      Message.info('英文标题不能含有中文字符！');
      return;
    }
    if (!isValidDateString(localDate, true)) {
      Message.info('日期字符串不合法！');
      return;
    }

    const data: ArticleInputType = {
      id,
      title,
      titleEng,
      content: localContent,
      tags,
      classes,
      postedAt: localDate,
      url: `https://panlore.top/blog/${titleEng}`,
      post: type === 'post'
    };

    // if (!(await isArticleUnique())) {
    //   Message.warning('英文标题已存在！');
    //   return;
    // }

    if (!id) {
      // 新建页面
      addData(type, data);
      if (type === 'post') {
        // 发布
        classCountChange(classes, 'add', () => {
          // dispatch(resetClasses());
        });
      } else {
        // dispatch(resetClasses());
      }
    } else {
      // 编辑页面
      updateData(type, data);
      if (from === 'article') {
        // 文章页进来
        if (type === 'post') {
          // 发布
          if (classes !== defaultClassText) {
            classCountChange(classes, 'add', () => {
              // dispatch(resetClasses());
            });
            classCountChange(defaultClassText, 'min', () => {
              // dispatch(resetClasses());
            });
          } else {
            // dispatch(resetClasses());
          }
        } else {
          // 存草稿
          classCountChange(defaultClassText, 'min', () => {
            // dispatch(resetClasses());
          });
        }
      } else {
        // 草稿页进来
        if (type === 'post') {
          // 发布
          classCountChange(classes, 'add', () => {
            // dispatch(resetClasses());
          });
        } else {
          // dispatch(resetClasses());
        }
      }
    }
  };

  return (
    <>
      <div className={s.addArticleHeader}>
        <div className={s.top}>
          <Input
            className={s.chineseTitle}
            style={{ width: 600 }}
            addBefore='中文标题'
            allowClear
            size='large'
            value={title}
            onChange={value => setTitle(value)}
          />
          <Input
            style={{ width: 400, marginRight: 10 }}
            addBefore='英文标题'
            allowClear
            size='large'
            value={titleEng}
            onChange={value => setTitleEng(value)}
          />
          <Button
            size='large'
            type='primary'
            style={{ marginRight: 10 }}
            onClick={() => postArticle('draft')}
          >
            存为草稿
          </Button>
          <Button
            size='large'
            type='primary'
            status='success'
            onClick={() => postArticle('post')}
          >
            {id ? '更新' : '发布'}文章
          </Button>
        </div>
        <div className={s.bottom}>
          <Select
            addBefore='分类'
            size='large'
            className={s.classes}
            allowCreate={false}
            showSearch
            allowClear
            unmountOnExit={false}
            value={classes}
            onChange={value => setClasses(value)}
            disabled={classesIsLoading}
            options={classesList.map((item) => ({
                value: item.content,
                label: item.content
              })
            )}
          />
          <Select
            addBefore='标签'
            size='large'
            className={s.tags}
            maxTagCount={6}
            mode='multiple'
            allowCreate={false}
            showSearch
            allowClear
            unmountOnExit={false}
            value={tags}
            onChange={value => setTags(value)}
            disabled={tagIsLoading}
            options={tagList.map(item => ({
              value: item.content,
              label: item.content
            }))}
          />
          <Input
            addBefore='时间'
            value={localDate}
            placeholder='YYYY-MM-DD HH:mm:ss'
            onChange={value => setLocalDate(value)}
            className={s.time}
            allowClear
            size='large'
          />
        </div>
      </div>
      <div className={s.contentEdit}>
        <textarea
          ref={leftRef}
          className={classNames(s.markedEdit, s.input)}
          value={localContent}
          onChange={e => setLocalContent(e.target.value)}
          onScroll={handleScrollRun}
        />
        <MarkDown
          ref={rightRef}
          className={s.markedEdit}
          content={localContent}
          onScroll={handleScrollRun}
        />
      </div>
    </>
  );
};

export default AddArticle;
