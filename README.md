# Quark 的月面通信室

用 Quarto 搭的个人主页 + 博客，推送到 `main` 后由 GitHub Actions 发布到 GitHub Pages。

## 本地预览

```bash
quarto preview
```

## 写文章

```bash
python scripts/editor.py
```

本地编辑器（只在本机运行，不会发布）：左边编辑，右边实时预览，可以新建文章、拖入图片、一键发布草稿，也能生成给 AI 的提示词并粘贴结果。写作和双语约定见 [WRITING.md](WRITING.md)。

只想新建文件也可以：`python scripts/new_post.py my-post "Post title"`。

## 目录

| 位置 | 内容 |
|---|---|
| `index.qmd` | 首页（访客计数、公告、目录） |
| `updates.yml` | 首页更新记录的手写条目（文章会自动加入） |
| `about.qmd` / `projects.qmd` / `writing.qmd` | 关于我 / 项目 / 文章列表 |
| `posts/`、`projects/` | 文章与项目详情页 |
| `assets/css/retro.css` | 全站样式 |
| `assets/js/site.js` | 中英切换、站内无刷新跳转（BGM 不中断）、访客计数、拍手、BGM 播放器（曲目列表在文件开头） |
| `assets/images/`、`assets/music/` | 图片与配乐 |
