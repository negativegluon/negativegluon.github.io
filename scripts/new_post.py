#!/usr/bin/env python3
"""新建文章：python scripts/new_post.py my-post "文章标题" """
import sys
from datetime import date
from pathlib import Path

if len(sys.argv) < 2:
    sys.exit(__doc__)
slug = sys.argv[1]
title = sys.argv[2] if len(sys.argv) > 2 else slug
post = Path(__file__).resolve().parents[1] / "posts" / slug / "index.qmd"
if post.exists():
    sys.exit(f"{post} 已存在")
post.parent.mkdir(parents=True)
post.write_text(f'''---
title: "{title}"
description: ""
date: {date.today()}
categories: []
draft: true
---

''', encoding="utf-8")
print(f"已创建 {post.relative_to(post.parents[2])}，写完把 draft 改成 false")
