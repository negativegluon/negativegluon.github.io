# Quark 的月面通信室

用 Quarto 搭的个人主页 + 博客，推送到 `main` 后由 GitHub Actions 发布到 GitHub Pages。

## 本地预览

```bash
quarto preview
```

## 写文章

```bash
python scripts/new_post.py my-post "文章标题"
```

在 `posts/my-post/index.qmd` 里写正文，图片放同一目录；写完把 `draft` 改成 `false`。

## 目录

| 位置 | 内容 |
|---|---|
| `index.qmd` | 首页（访客计数、更新记录、公告、目录） |
| `about.qmd` / `projects.qmd` / `writing.qmd` | 关于我 / 项目 / 文章列表 |
| `posts/`、`projects/` | 文章与项目详情页 |
| `assets/css/retro.css` | 全站样式 |
| `assets/js/site.js` | 访客计数、拍手、BGM 播放器（曲目列表在文件开头）、鼠标星屑 |
| `assets/images/`、`assets/music/` | 图片与配乐 |
