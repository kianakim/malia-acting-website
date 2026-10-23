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

// 4. Photo strips: Headshots and Behind the Scenes
//    Each strip scrolls by swipe or trackpad on its own; the arrows move one
//    card at a time, dim at either end, and a thin bar shows the position.
//    Tapping a card opens the full-size viewer: a photo, a short clip (with
//    controls), or an unlisted YouTube video if the card has data-youtube.
document.querySelectorAll('.headshots, .bts').forEach((section) => {
  const track = section.querySelector('.carousel__track');
  const prev = section.querySelector('.carousel__btn--prev');
  const next = section.querySelector('.carousel__btn--next');
  if (!track) return;
  const items = [...track.querySelectorAll('.headshot, .story')];

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

  // Short clips loop silently, but only while they're actually on screen
  // (saves data and battery). Visitors who turn off animations see the still.
  const loops = [...track.querySelectorAll('video.story__media')];
  let viewerOpen = false;
  if (loops.length && !reduceMotion && 'IntersectionObserver' in window) {
    const watcher = new IntersectionObserver((entries) => entries.forEach((e) => {
      const v = e.target;
      v.dataset.inView = e.isIntersecting ? '1' : '';
      if (e.isIntersecting && !viewerOpen) v.play().catch(() => {});   // some browsers refuse; the still stays
      else v.pause();
    }), { threshold: 0.6 });
    loops.forEach((v) => { v.preload = 'metadata'; watcher.observe(v); });
  }
  const pauseLoops = () => loops.forEach((v) => v.pause());
  const resumeLoops = () => { if (!reduceMotion) loops.forEach((v) => { if (v.dataset.inView) v.play().catch(() => {}); }); };

  // Full-size viewer
  const dialog = section.querySelector('.lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const stage = dialog.querySelector('.lightbox__stage');
  const caption = dialog.querySelector('.lightbox__caption');
  let current = 0;
  let returnTo = null;        // where focus goes back to when the viewer closes

  const show = (n) => {
    current = (n + items.length) % items.length;
    const item = items[current];
    const thumb = item.querySelector('img, video');
    const label = item.querySelector('.story__caption');
    let media;
    const yt = item.dataset.youtube && makeVideoFrame(item.dataset.youtube, label ? label.textContent : 'Video');
    if (yt) {
      media = yt;
    } else if (item.dataset.video) {
      media = document.createElement('video');
      Object.assign(media, { src: item.dataset.video, controls: true, autoplay: true, loop: true, playsInline: true });
      media.poster = thumb.getAttribute('poster') || '';
      media.setAttribute('aria-label', item.dataset.alt || (label ? label.textContent : 'Clip'));
    } else {
      media = document.createElement('img');
      media.src = item.dataset.full || thumb.src;
      media.alt = thumb.alt;
    }
    stage.replaceChildren(media);              // swapping out the old one also stops any playing video
    if (caption) caption.textContent = label ? label.textContent : '';
  };

  const openViewer = (n, from) => {
    returnTo = from || null;
    viewerOpen = true;
    pauseLoops();
    show(n);
    dialog.showModal();
  };
  items.forEach((item, n) => item.addEventListener('click', () => openViewer(n)));
  // Lets a Film / TV project panel open one of these photos full-size
  section.openViewerFor = (item, from) => {
    const n = items.indexOf(item);
    if (n > -1) openViewer(n, from);
  };
  dialog.querySelector('.lightbox__btn--prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lightbox__btn--next').addEventListener('click', () => show(current + 1));
  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });   // click the dark area
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  dialog.addEventListener('close', () => {
    stage.replaceChildren();                   // stops video and YouTube playback
    viewerOpen = false;
    resumeLoops();
    if (returnTo) {                            // opened from a project panel: go back there
      returnTo.focus({ preventScroll: true });
      returnTo = null;
      return;
    }
    // bring the card they were looking at into view in the strip
    items[current].scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
    items[current].focus({ preventScroll: true });
  });
});

// 5. Featured Work filter tabs
//    Show/hide cards by their data-category. (The address bar is left alone:
//    on this one-page site the # in the address is for jumping to sections.)
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.video-card');

if (filters.length && cards.length) {
  const empty = document.querySelector('.video-empty');
  filters.forEach((btn) => btn.addEventListener('click', () => {
    const name = btn.dataset.filter;
    let shown = 0;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    cards.forEach((card) => {
      const match = name === 'all' || card.dataset.category === name;
      card.hidden = !match;
      card.classList.toggle('is-entering', match);
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  }));
}

// 6. Featured Reel player
//    The poster's play button loads the reel. Clicking a Featured Work card
//    plays that video in the same player and scrolls back up to it.
const player = document.querySelector('.player__frame');

if (player) {
  const title = document.querySelector('.player__title');
  const meta = document.querySelector('.player__meta');
  const play = (link) => {
    const frame = makeVideoFrame(link, title && title.textContent);
    if (frame) player.replaceChildren(frame);
    return Boolean(frame);
  };

  const playButton = player.querySelector('.player__play');
  if (playButton) playButton.addEventListener('click', () => play(player.dataset.video));

  cards.forEach((card) => card.addEventListener('click', (e) => {
    if (!toEmbedUrl(card.href)) return;       // not a video link: open it normally
    e.preventDefault();                       // stay on the page; play here instead
    cards.forEach((c) => c.classList.remove('is-playing'));
    card.classList.add('is-playing');
    if (title) title.textContent = card.dataset.title;
    if (meta) meta.textContent = card.dataset.meta;
    play(card.href);
    document.querySelector('.player').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }));
}

// 7. Film / TV project panel
//    Each credit card has its project's details in a <template> right below
//    it. Opening a card copies that into the panel; the arrows step through
//    projects in order. The clip only loads when its play button is pressed.
document.querySelectorAll('.film-tv').forEach((section) => {
  const credits = [...section.querySelectorAll('.credit')];
  const dialog = section.querySelector('.project-panel');
  if (!credits.length || !dialog || typeof dialog.showModal !== 'function') return;
  const body = dialog.querySelector('.project-panel__body');
  const count = dialog.querySelector('.project-panel__count');
  let current = 0;

  const open = (n) => {
    current = (n + credits.length) % credits.length;
    const tpl = credits[current].querySelector('template');
    body.replaceChildren(tpl.content.cloneNode(true));          // also stops any clip that was playing
    count.textContent = `${current + 1} / ${credits.length}`;
    const title = body.querySelector('[data-panel-title]');
    if (title) { title.id = 'panel-title'; dialog.setAttribute('aria-labelledby', 'panel-title'); }
    dialog.scrollTop = 0;

    // Behind-the-scenes photos: every Behind the Scenes card tagged with this
    // project's id. They're entered once (in the strip) and shown here too.
    const slot = body.querySelector('[data-bts-slot]');
    const id = credits[current].dataset.project;
    const stripSection = document.querySelector('.bts');
    const tagged = id && stripSection ? [...stripSection.querySelectorAll(`.story[data-project="${id}"]`)] : [];
    if (slot && tagged.length) {
      const grid = slot.querySelector('.pd__bts');
      tagged.forEach((story) => {
        const media = story.querySelector('img, video');
        const label = story.querySelector('.story__caption');
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'pd__thumb' + (story.dataset.video ? ' pd__thumb--clip' : '');
        thumb.setAttribute('aria-label', (story.dataset.video ? 'Play clip: ' : 'View photo: ') + (label ? label.textContent : 'behind the scenes'));
        const img = document.createElement('img');
        img.src = media.tagName === 'VIDEO' ? media.getAttribute('poster') : media.getAttribute('src');
        img.alt = '';
        img.loading = 'lazy';
        thumb.appendChild(img);
        thumb.addEventListener('click', () => stripSection.openViewerFor && stripSection.openViewerFor(story, thumb));
        grid.appendChild(thumb);
      });
      slot.hidden = false;
    }

    const frame = body.querySelector('.player__frame[data-video]');
    const play = frame && frame.querySelector('.player__play');
    if (play) play.addEventListener('click', () => {
      const video = makeVideoFrame(frame.dataset.video, title ? title.textContent : 'Clip');
      if (video) frame.replaceChildren(video);
    });
  };

  credits.forEach((credit, n) => credit.querySelector('.credit__open').addEventListener('click', () => {
    open(n);
    dialog.showModal();
  }));
  dialog.querySelectorAll('.project-panel__step').forEach((btn) =>
    btn.addEventListener('click', () => open(current + Number(btn.dataset.step))));
  dialog.querySelector('.project-panel__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });   // click outside the panel
  dialog.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') open(current - 1);
    if (e.key === 'ArrowRight') open(current + 1);
  });
  dialog.addEventListener('close', () => {
    body.replaceChildren();
    credits[current].querySelector('.credit__open').focus({ preventScroll: true });
  });
});
