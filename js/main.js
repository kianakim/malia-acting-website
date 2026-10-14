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

// 4. Work page: filter tabs + play-in-hero
//    Filters show/hide cards by their data-category. Clicking a card swaps
//    its video into the featured player at the top instead of leaving the page.
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.video-card');
const player = document.querySelector('.player__frame');

if (filters.length && cards.length) {
  const empty = document.querySelector('.video-empty');

  const applyFilter = (name) => {
    let shown = 0;
    filters.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.filter === name)));
    cards.forEach((card) => {
      const match = name === 'all' || card.dataset.category === name;
      card.hidden = !match;
      card.classList.toggle('is-entering', match);
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  };

  filters.forEach((btn) => btn.addEventListener('click', () => {
    applyFilter(btn.dataset.filter);
    // Keep the address bar in sync so a filtered view can be shared
    history.replaceState(null, '', btn.dataset.filter === 'all' ? location.pathname : '#' + btn.dataset.filter);
  }));

  // Open a category straight from a link like work.html#hosting
  const fromHash = location.hash.slice(1);
  if ([...filters].some((b) => b.dataset.filter === fromHash)) applyFilter(fromHash);
}

if (player) {
  const title = document.querySelector('.player__title');
  const meta = document.querySelector('.player__meta');

  // Builds the iframe only when needed, with autoplay so one tap starts it
  const play = (embedUrl) => {
    const url = new URL(embedUrl);
    url.searchParams.set('autoplay', '1');
    if (url.hostname.includes('vimeo')) url.searchParams.set('dnt', '1');   // no tracking cookies
    player.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.src = url.toString();
    frame.title = title ? title.textContent : 'Video player';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    player.appendChild(frame);
  };

  const playButton = player.querySelector('.player__play');
  if (playButton) playButton.addEventListener('click', () => play(player.dataset.embed));

  cards.forEach((card) => card.addEventListener('click', (e) => {
    e.preventDefault();                       // stay on the page; play here instead
    cards.forEach((c) => c.classList.remove('is-playing'));
    card.classList.add('is-playing');
    if (title) title.textContent = card.dataset.title;
    if (meta) meta.textContent = card.dataset.meta;
    play(card.dataset.embed);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('.player').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));
}
