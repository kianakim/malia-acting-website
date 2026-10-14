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
