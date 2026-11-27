(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    document.body.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries, current) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          current.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -25px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  document.querySelectorAll('a[data-transition]').forEach(link => {
    link.addEventListener('click', event => {
      if (reducedMotion || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      event.preventDefault();
      document.body.classList.add('is-leaving');
      window.setTimeout(() => { window.location.href = target.href; }, 260);
    });
  });

  const helpPanel = document.getElementById('help-panel');
  const helpToggle = document.getElementById('help-toggle');
  const helpClose = document.getElementById('help-close');
  const closeHelp = () => {
    if (!helpPanel || !helpToggle) return;
    helpPanel.hidden = true;
    helpToggle.setAttribute('aria-expanded', 'false');
  };
  if (helpPanel && helpToggle) {
    helpToggle.addEventListener('click', () => {
      const isOpening = helpPanel.hidden;
      helpPanel.hidden = !isOpening;
      helpToggle.setAttribute('aria-expanded', String(isOpening));
    });
    helpClose?.addEventListener('click', closeHelp);
    document.getElementById('help-faq-link')?.addEventListener('click', closeHelp);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeHelp();
    });
  }

  const menuToggle = document.getElementById('mobile-nav-toggle');
  const siteNav = document.getElementById('site-nav') || document.getElementById('client-nav');
  if (menuToggle && siteNav) {
    const closeMenu = () => {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Ouvrir le menu');
    };
    menuToggle.addEventListener('click', () => {
      const isOpening = !siteNav.classList.contains('is-open');
      siteNav.classList.toggle('is-open', isOpening);
      menuToggle.setAttribute('aria-expanded', String(isOpening));
      menuToggle.setAttribute('aria-label', isOpening ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    siteNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });
  }
})();
