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

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

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
      out.textContent = `信号收到！× ${claps}`;
      button.classList.remove('bump');
      void button.offsetWidth;
      button.classList.add('bump');
    });
  }

  /* ---------- 侧栏：BGM 播放器 + 小徽章 ---------- */

  function initSidebar() {
    const menu = document.querySelector('#quarto-sidebar .sidebar-menu-container');
    if (!menu) return;
    const box = document.createElement('div');
    box.className = 'sidebar-extra';
    box.innerHTML = `
      <section class="bgm" aria-label="背景音乐">
        <div class="bgm-head">♪ BGM <span class="bgm-eq" aria-hidden="true"><i></i><i></i><i></i></span></div>
        <div class="bgm-now" aria-live="polite"></div>
        <div class="bgm-buttons">
          <button type="button" data-act="prev" aria-label="上一首">⏮</button>
          <button type="button" data-act="toggle">▶ 播放</button>
          <button type="button" data-act="next" aria-label="下一首">⏭</button>
        </div>
        <input class="bgm-volume" type="range" min="0" max="1" step="0.05" aria-label="音量">
      </section>
      <div class="badges" aria-hidden="true">
        <span class="badge b-moon">☽ MOON<br>NET</span>
        <span class="badge b-free">LINK<br>FREE!</span>
        <span class="badge b-rss">RSS<br>OK</span>
      </div>`;
    menu.appendChild(box);
    initMusic(box.querySelector('.bgm'));
  }

  function initMusic(player) {
    const now = player.querySelector('.bgm-now');
    const toggle = player.querySelector('[data-act="toggle"]');
    const volume = player.querySelector('.bgm-volume');
    const audio = new Audio();
    audio.preload = 'none';

    let index = store.get('quark-bgm-index', Math.floor(Math.random() * PLAYLIST.length)) % PLAYLIST.length;

    const load = (i, at = 0) => {
      index = (i + PLAYLIST.length) % PLAYLIST.length;
      const t = PLAYLIST[index];
      audio.src = new URL(`assets/music/${t.src}`, root).href;
      if (at) audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; }, { once: true });
      now.textContent = `${t.title} / ${t.artist}`;
      store.set('quark-bgm-index', index);
    };

    const render = () => {
      toggle.textContent = audio.paused ? '▶ 播放' : '■ 停止';
      player.classList.toggle('playing', !audio.paused);
    };

    const play = () => audio.play().then(() => store.set('quark-bgm-on', true)).catch(() => {}).finally(render);

    toggle.addEventListener('click', () => {
      if (audio.paused) play();
      else { audio.pause(); store.set('quark-bgm-on', false); }
    });
    player.querySelector('[data-act="next"]').addEventListener('click', () => { load(index + 1); play(); });
    player.querySelector('[data-act="prev"]').addEventListener('click', () => { load(index - 1); play(); });
    audio.addEventListener('ended', () => { load(index + 1); play(); });
    audio.addEventListener('play', render);
    audio.addEventListener('pause', render);

    audio.volume = store.get('quark-bgm-volume', 0.3);
    volume.value = audio.volume;
    volume.addEventListener('input', () => {
      audio.volume = Number(volume.value);
      store.set('quark-bgm-volume', audio.volume);
    });

    // 换页时记住播放进度，下一页接着放
    window.addEventListener('pagehide', () => store.set('quark-bgm-time', audio.currentTime || 0));

    load(index, store.get('quark-bgm-time', 0));
    render();
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
    box.innerHTML = '<summary>◆ 本页导航</summary>';
    box.appendChild(toc);
    const title = main.querySelector(':scope > .quarto-title-block, :scope > header');
    if (title) title.after(box); else main.prepend(box);
    margin.remove();
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

  initInlineToc();
  initCounter();
  initClap();
  initSidebar();
  initSparkles();
})();
