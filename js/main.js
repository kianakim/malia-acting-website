// Malia Aiello — site scripts (shared by every page)

// 1. Mobile menu
//    Toggles a class on <body>; all the visual change lives in CSS.
//    aria-expanded tells screen readers whether the menu is open.
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');

if (toggle && nav) {
  const setOpen = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => {
    setOpen(!document.body.classList.contains('menu-open'));
  });

  // Close when a link is tapped or Escape is pressed
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

// 2. Keep the footer year current so it never needs a manual update
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// 3. Contact form (Formspree)
//    Sends the form in the background so visitors stay on the page and see
//    a confirmation. If JavaScript is off, the form still works as a normal
//    POST and Formspree shows its own thank-you page.
const form = document.querySelector('.contact-form');

if (form) {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('[type="submit"]');
  const buttonText = button.textContent;

  const show = (msg, type) => {
    status.textContent = msg;
    status.className = 'form-status ' + (type ? 'is-' + type : '');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-submitted');      // turns on error styling

    if (!form.checkValidity()) {
      form.reportValidity();                  // browser points to the missing field
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending…';
    show('', '');

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error();
      form.reset();
      form.classList.remove('was-submitted');
      show('Mahalo! Your message has been sent. Malia or her team will be in touch soon.', 'success');
    } catch {
      show('Sorry, something went wrong. Please try again, or email directly using the details below.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = buttonText;
    }
  });
}

// Shared helpers: turn a pasted YouTube (or Vimeo) link into a player.
// Paste links exactly as YouTube gives them; these all work:
//   https://youtu.be/ID   https://www.youtube.com/watch?v=ID
//   https://www.youtube.com/shorts/ID   (and ?t=1m30s start times)
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function toSeconds(t) {                     // "90", "90s" or "1m30s" → 90
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : 0;
}

function toEmbedUrl(link) {
  let u;
  try { u = new URL(link, location.href); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, '');

  // YouTube → privacy-enhanced player (youtube-nocookie.com sets no
  // tracking cookies until the visitor actually plays the video)
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/) || [])[1];
  }
  if (id) {
    const e = new URL('https://www.youtube-nocookie.com/embed/' + id);
    e.searchParams.set('autoplay', '1');
    e.searchParams.set('rel', '0');          // end screen suggests her own videos, not random ones
    e.searchParams.set('playsinline', '1');  // plays in the page on iPhone instead of jumping to fullscreen
    const start = toSeconds(u.searchParams.get('t') || u.searchParams.get('start'));
    if (start) e.searchParams.set('start', String(start));
    return e.toString();
  }

  // Vimeo still works if it's ever needed
  if (host === 'vimeo.com' && /^\/\d+/.test(u.pathname)) {
    return 'https://player.vimeo.com/video/' + u.pathname.split('/')[1] + '?autoplay=1&dnt=1';
  }
  return null;
}

function makeVideoFrame(link, title) {
  const src = toEmbedUrl(link);
  if (!src) return null;
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = title || 'Video player';
  frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  // YouTube refuses to play embeds that don't say which site they're on
  frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  return frame;
}

// 3b. Hero: "Watch Reel" opens the reel player above the name
//     The YouTube player loads only when the button is pressed. Pressing it
//     again (now "Close Reel") or the × closes it and stops the video.
const heroReel = document.querySelector('.hero__reel');
const heroReelBtn = document.querySelector('.hero__reel-btn');

if (heroReel && heroReelBtn) {
  const hero = heroReel.closest('.hero');
  const frameBox = heroReel.querySelector('.hero__reel-frame');
  const label = heroReelBtn.querySelector('.hero__reel-label');

  const openReel = () => {
    const frame = makeVideoFrame(heroReelBtn.href, 'Malia Aiello reel');
    if (!frame) return false;                  // not a video link: let it open normally
    frameBox.replaceChildren(frame);
    heroReel.hidden = false;
    hero.classList.add('is-playing');
    heroReelBtn.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Close Reel';
    heroReel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    return true;
  };
  const closeReel = () => {
    frameBox.replaceChildren();                // removing the player stops the video
    heroReel.hidden = true;
    hero.classList.remove('is-playing');
    heroReelBtn.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Watch Reel';
  };

  heroReelBtn.addEventListener('click', (e) => {
    if (!heroReel.hidden) { e.preventDefault(); closeReel(); return; }
    if (openReel()) e.preventDefault();
  });
  heroReel.querySelector('.hero__reel-close').addEventListener('click', () => { closeReel(); heroReelBtn.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !heroReel.hidden && !document.querySelector('dialog[open]')) closeReel();
  });
}

// 4. Sideways strips: Headshots and Featured Work
//    Each strip scrolls by swipe or trackpad on its own; the arrows move one
//    card at a time, dim at either end, and a thin bar shows the position.
//    Headshots also open full-size; Featured Work cards open the video player.
document.querySelectorAll('.headshots, .work-section').forEach((section) => {
  const track = section.querySelector('.carousel__track');
  const prev = section.querySelector('.carousel__btn--prev');
  const next = section.querySelector('.carousel__btn--next');
  if (!track) return;
  const items = [...track.querySelectorAll('.headshot')];

  const bar = document.createElement('div');
  bar.className = 'carousel__progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<span></span>';
  track.after(bar);
  const fill = bar.firstElementChild;

  const step = () => {
    const item = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
  };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const shown = track.clientWidth / track.scrollWidth;      // share of the set on screen
    const pos = max > 0 ? track.scrollLeft / max : 0;
    fill.style.width = (shown * 100) + '%';
    fill.style.transform = `translateX(${pos * (1 / shown - 1) * 100}%)`;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
  };

  const behavior = reduceMotion ? 'auto' : 'smooth';
  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();

  // Full-size view (Headshots only)
  if (!section.classList.contains('headshots')) return;
  const dialog = section.querySelector('.lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const stage = dialog.querySelector('.lightbox__stage');
  let current = 0;

  const show = (n) => {
    current = (n + items.length) % items.length;
    const thumb = items[current].querySelector('img');
    const img = document.createElement('img');
    img.src = items[current].dataset.full || thumb.src;
    img.alt = thumb.alt;
    stage.replaceChildren(img);
  };
  items.forEach((item, n) => item.addEventListener('click', () => { show(n); dialog.showModal(); }));
  dialog.querySelector('.lightbox__btn--prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lightbox__btn--next').addEventListener('click', () => show(current + 1));
  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });   // click the dark area
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  dialog.addEventListener('close', () => {
    stage.replaceChildren();
    // bring the photo they were looking at into view in the strip
    items[current].scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
    items[current].focus({ preventScroll: true });
  });
});

// 5. Pop-up viewer for Featured Work
//    One dialog shows a YouTube video (or a short MP4 clip or a photo), with a
//    caption. Closing it stops playback and returns focus to what opened it.
const viewer = document.querySelector('.video-viewer');
let openInViewer = () => false;

if (viewer && typeof viewer.showModal === 'function') {
  const stage = viewer.querySelector('.lightbox__stage');
  const caption = viewer.querySelector('.lightbox__caption');
  let returnTo = null;

  openInViewer = ({ youtube, video, photo, alt, text }, from) => {
    let media = null;
    if (youtube) {
      media = makeVideoFrame(youtube, text || 'Video');
      if (!media) return false;
      viewer.classList.add('is-wide');                  // 16:9 player
    } else if (video) {
      media = document.createElement('video');
      Object.assign(media, { src: video, controls: true, autoplay: true, loop: true, playsInline: true });
      viewer.classList.remove('is-wide');
    } else if (photo) {
      media = document.createElement('img');
      media.src = photo;
      media.alt = alt || '';
      viewer.classList.remove('is-wide');
    }
    if (!media) return false;
    stage.replaceChildren(media);
    caption.textContent = text || '';
    returnTo = from || null;
    if (!viewer.open) viewer.showModal();
    return true;
  };

  viewer.querySelector('.lightbox__close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });   // click the dark area
  viewer.addEventListener('close', () => {
    stage.replaceChildren();                   // stops the video
    if (returnTo) returnTo.focus({ preventScroll: true });
    returnTo = null;
  });
}

// 6. Featured Work cards open in the pop-up player
const cards = document.querySelectorAll('.video-card');
cards.forEach((card) => card.addEventListener('click', (e) => {
  const text = [card.dataset.title, card.dataset.meta].filter(Boolean).join('  ·  ');
  if (openInViewer({ youtube: card.href, text }, card)) e.preventDefault();   // otherwise it opens YouTube
}));

// 7. Footer gallery: 3×3 grid with a pop-out full view
//    The full photo grows out of the tile that was clicked and shrinks back
//    into it on close. Arrows / arrow keys step through; Esc or a click on
//    the dark area closes. Visitors who turn off animations get no zoom.
document.querySelectorAll('.gallery--grid').forEach((section) => {
  const tiles = [...section.querySelectorAll('.grid-photo')];
  const dialog = section.querySelector('.photo-pop');
  if (!tiles.length || !dialog || typeof dialog.showModal !== 'function') return;
  const img = dialog.querySelector('.photo-pop__img');
  const caption = dialog.querySelector('.lightbox__caption');
  const count = dialog.querySelector('.photo-pop__count');
  let current = 0;
  let closing = false;

  // Animate between the tile and the big image (both directions)
  const morph = (fromRect, toRect, reverse) => {
    if (reduceMotion || !fromRect || !toRect.width) return Promise.resolve();
    const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (toRect.top + toRect.height / 2);
    const s = Math.max(fromRect.width / toRect.width, fromRect.height / toRect.height);
    const small = { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6 };
    const big = { transform: 'none', opacity: 1 };
    return img.animate(reverse ? [big, small] : [small, big],
      { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' }).finished.catch(() => {});
  };

  const show = (n) => {
    current = (n + tiles.length) % tiles.length;
    const tile = tiles[current];
    const thumb = tile.querySelector('img');
    img.src = tile.dataset.full || thumb.src;
    img.alt = thumb.alt;
    caption.textContent = tile.dataset.caption || '';
    count.textContent = `${current + 1} / ${tiles.length}`;
  };

  const open = async (n) => {
    show(n);
    dialog.showModal();
    if (!img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
    morph(tiles[current].getBoundingClientRect(), img.getBoundingClientRect(), false);
  };

  const close = async () => {
    if (closing || !dialog.open) return;
    closing = true;
    tiles[current].scrollIntoView({ block: 'nearest' });
    await morph(tiles[current].getBoundingClientRect(), img.getBoundingClientRect(), true);
    dialog.close();
    closing = false;
  };

  tiles.forEach((tile, n) => tile.addEventListener('click', () => open(n)));
  dialog.querySelector('.lightbox__btn--prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lightbox__btn--next').addEventListener('click', () => show(current + 1));
  dialog.querySelector('.lightbox__close').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.classList.contains('lightbox__stage')) close(); });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });   // Esc shrinks it back too
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  dialog.addEventListener('close', () => tiles[current].focus({ preventScroll: true }));

  // Swipe between photos on touch screens
  let startX = null;
  dialog.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
});

// 8. Up Next slides
//    Each slide flips in after the current one's indicator line fills up
//    (data-interval on the section). The line pauses, and so does the
//    carousel, while the pointer is over it, while it has keyboard focus,
//    while it's scrolled out of view, or after the pause button is pressed.
//    Visitors who turn off animations start paused and get a fade.
document.querySelectorAll('.up-next').forEach((root) => {
  const slides = [...root.querySelectorAll('.up-next__slide')];
  const controls = root.querySelector('.up-next__controls');
  if (slides.length < 2) { if (controls) controls.hidden = true; return; }

  const dotsBox = root.querySelector('.up-next__dots');
  const pauseBtn = root.querySelector('.up-next__pause');
  const track = root.querySelector('.up-next__slides');
  const speed = 1000;                                  // flip length in ms (matches --speed)
  let current = 0;
  let busy = false;

  root.style.setProperty('--interval', (Number(root.dataset.interval) || 6000) + 'ms');
  root.style.setProperty('--speed', speed + 'ms');
  const setDepth = () => root.style.setProperty('--depth', (root.clientWidth / 2) + 'px');
  setDepth();
  addEventListener('resize', setDepth);

  // One indicator per slide
  const dots = slides.map((slide, n) => {
    const name = slide.querySelector('.up-next__name');
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'up-next__dot';
    dot.setAttribute('aria-label', `Show slide ${n + 1}${name ? ': ' + name.textContent : ''}`);
    dot.addEventListener('click', () => go(n));
    dotsBox.appendChild(dot);
    return dot;
  });

  const setVisible = (slide, on) => {
    slide.inert = !on;                                 // hidden slides can't be tabbed into
    slide.setAttribute('aria-hidden', String(!on));
  };
  const markDot = (n) => dots.forEach((d, i) => {
    d.removeAttribute('aria-current');
    if (i === n) { void d.offsetWidth; d.setAttribute('aria-current', 'true'); }   // restarts the fill
  });

  slides.forEach((s, n) => { s.hidden = false; setVisible(s, n === 0); });
  slides[0].classList.add('is-active');
  root.classList.add('is-ready');
  markDot(0);

  function go(n, dir) {
    n = (n + slides.length) % slides.length;
    if (busy || n === current) return;
    dir = dir || (n > current ? 'next' : 'prev');
    busy = true;
    const out = slides[current];
    const inn = slides[n];
    out.classList.remove('is-active');
    out.classList.add('is-leaving', 'anim-out-' + dir);
    inn.classList.add('is-active', 'anim-in-' + dir);
    setVisible(inn, true);
    current = n;
    markDot(n);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      out.classList.remove('is-leaving', 'anim-out-next', 'anim-out-prev');
      inn.classList.remove('anim-in-next', 'anim-in-prev');
      setVisible(out, false);
      busy = false;
    };
    inn.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, speed + 150);                   // safety net if no animation runs
  }

  // Auto-advance when the current indicator finishes filling
  dotsBox.addEventListener('animationend', (e) => {
    if (e.target === dots[current]) go(current + 1, 'next');
  });

  // Pause button
  const setPaused = (on) => {
    root.classList.toggle('is-paused', on);
    pauseBtn.setAttribute('aria-label', on ? 'Play slides' : 'Pause slides');
    track.setAttribute('aria-live', on ? 'polite' : 'off');   // announce changes only when not rotating
  };
  pauseBtn.addEventListener('click', () => setPaused(!root.classList.contains('is-paused')));
  setPaused(reduceMotion);

  // Hold while hovered or focused; pause while off screen
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') root.classList.add('is-held'); });
  root.addEventListener('pointerleave', () => root.classList.remove('is-held'));
  root.addEventListener('focusin', () => root.classList.add('is-held'));
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) root.classList.remove('is-held'); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => root.classList.toggle('is-offscreen', !entry.isIntersecting), { threshold: 0.4 }).observe(root);
  }

  // Swipe on touch screens, arrow keys when the carousel has focus
  let startX = null;
  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
    startX = null;
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(current + 1, 'next');
    if (e.key === 'ArrowLeft') go(current - 1, 'prev');
  });
});
