#!/usr/bin/env python3
"""新建文章：python scripts/new_post.py my-post "Post title" """
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def create_post(slug: str, title: str = "") -> Path:
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
        raise ValueError("slug 只能用小写字母、数字和连字符，例如 my-first-post")
    post = ROOT / "posts" / slug / "index.qmd"
    if post.exists():
        raise FileExistsError(f"posts/{slug} 已存在")
    post.parent.mkdir(parents=True)
    title = (title or slug).replace('"', "'")
    post.write_text(f'''---
title: "{title}"
description: ""
date: {date.today()}
categories: []
draft: true
---

::: {{.en}}

:::

::: {{.zh}}

:::
''', encoding="utf-8")
    return post


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    try:
        path = create_post(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "")
    except (ValueError, FileExistsError) as e:
        sys.exit(str(e))
    print(f"已创建 {path.relative_to(ROOT)}，写完把 draft 改成 false")
