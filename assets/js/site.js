(() => {
  'use strict';

  const root = new URL('../../', document.currentScript.src);

  // 曲目放在 assets/music/，在这里登记即可
  const PLAYLIST = [
    { title: 'うつし世の姫', artist: 'コーニッシュ', src: 'utsushiyo-no-hime.aac' },
    { title: 'FUSHI', artist: 'コーニッシュ', src: 'fushi.aac' },
    { title: '満ちる月のセレナーデ ～八千年の旅～', artist: 'コーニッシュ', src: 'michiru-tsuki-no-serenade.aac' },
    { title: '超かぐや姫！', artist: 'コーニッシュ', src: 'chou-kaguyahime.aac' },
  ];

  // 站点外壳（侧栏、页脚、Quarto 自带文字）的中文翻译；正文用 .en / .zh 块
  const ZH = {
    'Home': '首页', 'About': '关于我', 'Blog': '博客文章', 'Projects': '项目记录',
    'Author': '作者', 'Published': '发布于', 'Modified': '修改于', 'Categories': '分类', 'All': '全部',
    'Back to top': '回到顶部', 'On this page': '本页导航', 'No matching items': '无匹配项',
    'Since 2026 · Best viewed with any browser': '2026 年开站 · 任意浏览器皆可浏览',
    'Page not found': '页面未找到',
  };

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  /* ---------- 语言 ---------- */

  const lang = () => (document.documentElement.classList.contains('lang-zh') ? 'zh' : 'en');
  const t = (en, zh) => (lang() === 'zh' ? zh : en);

  function translateChrome() {
    const zh = lang() === 'zh';
    const nodes = document.querySelectorAll(
      '.menu-text, .quarto-title-block .title, .quarto-title-meta-heading, .nav-page-text, '
      + '.nav-footer a, .nav-footer-right, .nav-footer-center, #quarto-back-to-top, #toc-title, .listing-no-matching, '
      + '.quarto-listing-category .category, .inline-toc summary',
    );
    // 只换纯文本节点，保留里面的图标等元素
    nodes.forEach((el) => el.childNodes.forEach((n) => { if (n.nodeType === 3) swapText(n, zh); }));
    const filter = document.querySelector('#listing-listing-search, .quarto-listing-filter input');
    if (filter) filter.placeholder = zh ? '筛选' : 'Filter';
    document.querySelectorAll('.lang-switch button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang()));
  }

  function swapText(node, zh) {
    const raw = node.__en ?? node.textContent;
    node.__en = raw;
    const lead = raw.match(/^[\s◆]*/)[0];
    const core = raw.slice(lead.length).trim();
    const tail = raw.slice(lead.length + core.length);
    node.textContent = zh && ZH[core] ? lead + ZH[core] + tail : raw;
  }

  function setLang(next) {
    document.documentElement.classList.toggle('lang-zh', next === 'zh');
    try { localStorage.setItem('quark-lang', next); } catch {}
    translateChrome();
    renderBgm();
  }

  /* ---------- 首页：访客计数 & 拍手 ---------- */

  function initCounter() {
    const el = document.querySelector('.visitor-count');
    if (!el) return;
    let n = store.get('quark-visitor-count', Number(el.dataset.start) || 1337);
    try {
      if (!sessionStorage.getItem('quark-visited')) {
        n += 1;
        store.set('quark-visitor-count', n);
        sessionStorage.setItem('quark-visited', '1');
      }
    } catch {}
    el.replaceChildren(...String(n).padStart(6, '0').split('').map((d) => {
      const span = document.createElement('span');
      span.textContent = d;
      return span;
    }));
  }

  function initClap() {
    const button = document.querySelector('.web-clap');
    const out = document.querySelector('.clap-result');
    if (!button || !out) return;
    let claps = store.get('quark-claps', 0);
    button.addEventListener('click', () => {
      claps += 1;
      store.set('quark-claps', claps);
      out.textContent = `${t('Signal received!', '信号收到！')} × ${claps}`;
      button.classList.remove('bump');
      void button.offsetWidth;
      button.classList.add('bump');
    });
  }

  /* ---------- 侧栏：语言切换 + BGM 播放器 + 小徽章 ---------- */

  function initSidebar() {
    const menu = document.querySelector('#quarto-sidebar .sidebar-menu-container');
    if (!menu || menu.querySelector('.sidebar-extra')) return;
    const box = document.createElement('div');
    box.className = 'sidebar-extra';
    box.innerHTML = `
      <div class="lang-switch" role="group" aria-label="Language">
        <button type="button" data-lang="en">EN</button><button type="button" data-lang="zh">中文</button>
      </div>
      <section class="bgm" aria-label="BGM">
        <div class="bgm-head">♪ BGM <span class="bgm-eq" aria-hidden="true"><i></i><i></i><i></i></span></div>
        <div class="bgm-now" aria-live="polite"></div>
        <div class="bgm-buttons">
          <button type="button" data-act="prev" aria-label="Previous">⏮</button>
          <button type="button" data-act="toggle"></button>
          <button type="button" data-act="next" aria-label="Next">⏭</button>
        </div>
        <input class="bgm-volume" type="range" min="0" max="1" step="0.05" aria-label="Volume">
      </section>
      <div class="badges" aria-hidden="true">
        <span class="badge b-moon">☽ MOON<br>NET</span>
        <span class="badge b-free">LINK<br>FREE!</span>
        <span class="badge b-rss">RSS<br>OK</span>
      </div>`;
    menu.appendChild(box);
    box.querySelectorAll('.lang-switch button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
    initMusic(box.querySelector('.bgm'));
  }

  let renderBgm = () => {};

  function initMusic(player) {
    const now = player.querySelector('.bgm-now');
    const toggle = player.querySelector('[data-act="toggle"]');
    const volume = player.querySelector('.bgm-volume');
    const audio = new Audio();
    audio.preload = 'none';

    let index = store.get('quark-bgm-index', Math.floor(Math.random() * PLAYLIST.length)) % PLAYLIST.length;

    const load = (i, at = 0) => {
      index = (i + PLAYLIST.length) % PLAYLIST.length;
      const track = PLAYLIST[index];
      audio.src = new URL(`assets/music/${track.src}`, root).href;
      if (at) audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; }, { once: true });
      now.textContent = `${track.title} / ${track.artist}`;
      store.set('quark-bgm-index', index);
    };

    renderBgm = () => {
      toggle.textContent = audio.paused ? t('▶ Play', '▶ 播放') : t('■ Stop', '■ 停止');
      player.classList.toggle('playing', !audio.paused);
    };

    const play = () => audio.play().then(() => store.set('quark-bgm-on', true)).catch(() => {}).finally(renderBgm);

    toggle.addEventListener('click', () => {
      if (audio.paused) play();
      else { audio.pause(); store.set('quark-bgm-on', false); }
    });
    player.querySelector('[data-act="next"]').addEventListener('click', () => { load(index + 1); play(); });
    player.querySelector('[data-act="prev"]').addEventListener('click', () => { load(index - 1); play(); });
    audio.addEventListener('ended', () => { load(index + 1); play(); });
    audio.addEventListener('play', renderBgm);
    audio.addEventListener('pause', renderBgm);

    audio.volume = store.get('quark-bgm-volume', 0.3);
    volume.value = audio.volume;
    volume.addEventListener('input', () => {
      audio.volume = Number(volume.value);
      store.set('quark-bgm-volume', audio.volume);
    });

    // 站内跳转不会刷新页面；只有真正离开（关闭、外链、刷新）时才记进度
    window.addEventListener('pagehide', () => store.set('quark-bgm-time', audio.currentTime || 0));

    load(index, store.get('quark-bgm-time', 0));
    renderBgm();
    if (store.get('quark-bgm-on', true)) play();
  }

  /* ---------- 文章页：目录折叠进正文 ---------- */

  function initInlineToc() {
    const margin = document.querySelector('#quarto-margin-sidebar');
    const toc = margin?.querySelector('#TOC');
    const main = document.querySelector('main.content');
    if (!toc || !main || !toc.querySelector('li')) return;
    const box = document.createElement('details');
    box.className = 'inline-toc';
    box.innerHTML = '<summary>◆ On this page</summary>';
    box.appendChild(toc);
    const title = main.querySelector(':scope > .quarto-title-block, :scope > header');
    if (title) title.after(box); else main.prepend(box);
    margin.remove();
  }

  /* ---------- 站内无刷新跳转：侧栏和 BGM 保持不动 ---------- */

  const isInternal = (a) => {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.href.startsWith(root.href)) return false;
    if (!/(\.html|\/)$/.test(url.pathname)) return false;
    if (url.pathname === location.pathname && url.hash) return false; // 页内锚点
    return url;
  };

  const loaded = new Set([...document.querySelectorAll('script[src], link[rel="stylesheet"]')]
    .map((el) => el.src || el.href));

  function addAsset(el, base) {
    const isScript = el.tagName === 'SCRIPT';
    const href = new URL(el.getAttribute(isScript ? 'src' : 'href'), base).href;
    if (loaded.has(href)) return Promise.resolve();
    loaded.add(href);
    const node = document.createElement(isScript ? 'script' : 'link');
    if (isScript) node.src = href; else { node.rel = 'stylesheet'; node.href = href; }
    return new Promise((ok) => { node.onload = ok; node.onerror = ok; document.head.appendChild(node); });
  }

  // 新页面里的 Quarto 脚本都挂在 DOMContentLoaded 上：执行它们时让这个事件立即触发
  async function withInstantReady(work) {
    const original = document.addEventListener;
    document.addEventListener = function (type, fn, opts) {
      if (type === 'DOMContentLoaded') { try { fn.call(document, new Event(type)); } catch (e) { console.error(e); } return; }
      return original.call(this, type, fn, opts);
    };
    try { await work(); } finally { document.addEventListener = original; }
  }

  function runInline(script) {
    const code = script.textContent;
    if (!code.trim() || /retro\.css|quarto-preview|WebSocket|devserver/.test(code)) return;
    const node = document.createElement('script');
    node.textContent = `(()=>{${code}\n})();`;
    document.body.appendChild(node);
    node.remove();
  }

  let navigating = 0;

  async function navigate(url, push) {
    const ticket = ++navigating;
    document.body.classList.add('is-loading');
    try {
      const res = await fetch(url.href);
      if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) throw new Error(res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      if (ticket !== navigating) return;
      const nextContent = doc.querySelector('#quarto-content');
      const curContent = document.querySelector('#quarto-content');
      if (!nextContent || !curContent) throw new Error('layout');

      if (push) history.pushState({}, '', url.href);

      // Quarto 的列表注册表是全局的，清掉上一页留下的条目
      window['quarto-listings'] = {};

      await withInstantReady(async () => {
        for (const el of doc.head.querySelectorAll('link[rel="stylesheet"], script[src]')) {
          await addAsset(el, url);
        }

        // 换掉除侧栏外的主体，同步侧栏的「当前页」高亮和手机端顶栏
        [...curContent.children].forEach((el) => { if (el.id !== 'quarto-sidebar') el.remove(); });
        [...nextContent.children].forEach((el) => { if (el.id !== 'quarto-sidebar') curContent.appendChild(document.adoptNode(el)); });
        const nextMenu = doc.querySelector('#quarto-sidebar .sidebar-menu-container > ul');
        const curMenu = document.querySelector('#quarto-sidebar .sidebar-menu-container > ul');
        if (nextMenu && curMenu) curMenu.replaceWith(document.adoptNode(nextMenu));
        const nextCrumbs = doc.querySelector('.quarto-page-breadcrumbs');
        const curCrumbs = document.querySelector('.quarto-page-breadcrumbs');
        if (nextCrumbs && curCrumbs) curCrumbs.replaceWith(document.adoptNode(nextCrumbs));
        document.body.className = doc.body.className;
        document.title = doc.title;

        doc.head.querySelectorAll('script:not([src])').forEach((s) => {
          if (/quarto-listing|listing-/.test(s.textContent)) runInline(s);
        });
        doc.body.querySelectorAll('script:not([src])').forEach(runInline);
      });

      initPage();
      if (url.hash) document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
      else window.scrollTo(0, 0);
    } catch (err) {
      console.warn('in-page navigation failed, doing a full load', err);
      location.href = url.href;
    } finally {
      if (ticket === navigating) document.body.classList.remove('is-loading');
    }
  }

  function initRouter() {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = isInternal(e.target.closest('a[href]'));
      if (!url) return;
      e.preventDefault();
      navigate(url, true);
    });
    window.addEventListener('popstate', () => navigate(new URL(location.href), false));
  }

  /* ---------- 鼠标星屑 ---------- */

  function initSparkles() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return;
    let last = 0;
    document.addEventListener('pointermove', (e) => {
      if (e.timeStamp - last < 70) return;
      last = e.timeStamp;
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = `${e.clientX}px`;
      s.style.top = `${e.clientY}px`;
      s.style.setProperty('--c', ['#fff59a', '#ff9ec4', '#a9fff0'][Math.floor(Math.random() * 3)]);
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }, { passive: true });
  }

  // 文章页的分类标签 → 博客页对应分类（Quarto 只在整页加载时生成这些链接）
  function initCategoryLinks() {
    document.querySelectorAll('.quarto-title-block .quarto-category').forEach((el) => {
      const name = el.textContent.trim();
      const href = new URL(`writing.html#category=${encodeURIComponent(name)}`, root).href;
      const a = el.querySelector('a') || el.appendChild(Object.assign(document.createElement('a'), { textContent: name }));
      if (a.parentNode === el && el.firstChild !== a) el.replaceChildren(a);
      a.href = href;
    });
  }

  function initPage() {
    initCategoryLinks();
    initInlineToc();
    initCounter();
    initClap();
    translateChrome();
    renderBgm();
  }

  initSidebar();
  initPage();
  initRouter();
  initSparkles();
})();
