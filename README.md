# Quark 的月面通信室

用 Quarto 搭的个人主页 + 博客：https://negativegluon.github.io

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

## 发布

```bash
git add -A && git commit -m "..." && git push        # 保存源码
quarto publish gh-pages --no-prompt                  # 本地构建并发布网站
```

GitHub Pages 直接托管 `gh-pages` 分支（由 `quarto publish` 生成，不要手动改）。
`.github/workflows/publish.yml` 是 Actions 自动发布方案，目前因账户的 billing 锁定无法运行；
恢复后可在仓库 Settings → Pages 把来源改回 GitHub Actions，就不用手动 publish 了。
