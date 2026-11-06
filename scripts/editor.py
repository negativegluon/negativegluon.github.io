#!/usr/bin/env python3
"""本地编辑器（只在本机运行，不会发布到网站）。

    python scripts/editor.py            # 打开 http://127.0.0.1:8765
    python scripts/editor.py --no-preview

同时会在 4321 端口启动 `quarto preview`，编辑器右侧显示实时网站。
"""
import argparse
import json
import shutil
import subprocess
import sys
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from new_post import ROOT, create_post  # noqa: E402

PAGE = Path(__file__).with_name("editor.html")
TEXT_SUFFIXES = {".qmd", ".md", ".yml"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
EDITABLE = ["about.qmd", "index.qmd", "projects.qmd", "updates.yml", "WRITING.md"]


def list_files():
    files = [p for p in EDITABLE if (ROOT / p).exists()]
    for folder in ("posts", "projects"):
        files += sorted(str(p.relative_to(ROOT)) for p in (ROOT / folder).glob("*/index.qmd"))
    return files


def safe_path(rel: str, suffixes) -> Path:
    path = (ROOT / unquote(rel)).resolve()
    if ROOT not in path.parents or path.suffix.lower() not in suffixes:
        raise PermissionError(rel)
    if any(part.startswith(("_", ".")) for part in path.relative_to(ROOT).parts):
        raise PermissionError(rel)
    return path


def preview_url(rel: str) -> str:
    if rel in ("updates.yml", "index.qmd", "WRITING.md"):
        return "index.html"
    return rel.removesuffix(".qmd") + ".html"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send(self, body, status=HTTPStatus.OK, kind="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self) -> bytes:
        return self.rfile.read(int(self.headers.get("Content-Length", 0)))

    def do_GET(self):
        url = urlparse(self.path)
        query = parse_qs(url.query)
        try:
            if url.path == "/":
                self.send(PAGE.read_bytes(), kind="text/html; charset=utf-8")
            elif url.path == "/api/files":
                self.send({"files": [{"path": f, "preview": preview_url(f)} for f in list_files()],
                           "previewPort": self.server.preview_port})
            elif url.path == "/api/file":
                path = safe_path(query["path"][0], TEXT_SUFFIXES)
                self.send({"content": path.read_text(encoding="utf-8")})
            else:
                self.send({"error": "not found"}, HTTPStatus.NOT_FOUND)
        except (PermissionError, KeyError, FileNotFoundError) as e:
            self.send({"error": f"无法读取：{e}"}, HTTPStatus.BAD_REQUEST)

    def do_POST(self):
        url = urlparse(self.path)
        query = parse_qs(url.query)
        try:
            if url.path == "/api/file":
                data = json.loads(self.body())
                path = safe_path(data["path"], TEXT_SUFFIXES)
                path.write_text(data["content"], encoding="utf-8")
                self.send({"ok": True})
            elif url.path == "/api/new-post":
                data = json.loads(self.body())
                path = create_post(data["slug"].strip(), data.get("title", "").strip())
                self.send({"path": str(path.relative_to(ROOT))})
            elif url.path == "/api/upload":
                # 图片放进当前文章所在目录
                folder = safe_path(query["file"][0], TEXT_SUFFIXES).parent
                name = Path(query["name"][0]).name.replace(" ", "-")
                target = safe_path(str((folder / name).relative_to(ROOT)), IMAGE_SUFFIXES)
                target.write_bytes(self.body())
                self.send({"name": name})
            else:
                self.send({"error": "not found"}, HTTPStatus.NOT_FOUND)
        except (ValueError, FileExistsError, PermissionError, KeyError) as e:
            self.send({"error": str(e)}, HTTPStatus.BAD_REQUEST)


def start_preview(port: int):
    quarto = shutil.which("quarto")
    if not quarto:
        print("没找到 quarto，右侧预览不可用（编辑和保存不受影响）。")
        return None
    print(f"启动 quarto preview（端口 {port}）……")
    return subprocess.Popen([quarto, "preview", "--port", str(port), "--no-browser"], cwd=ROOT,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--preview-port", type=int, default=4321)
    parser.add_argument("--no-preview", action="store_true", help="不启动 quarto preview")
    args = parser.parse_args()

    preview = None if args.no_preview else start_preview(args.preview_port)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.preview_port = args.preview_port
    url = f"http://127.0.0.1:{args.port}/"
    print(f"编辑器：{url}   （Ctrl+C 退出）")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if preview:
            preview.terminate()


if __name__ == "__main__":
    main()
