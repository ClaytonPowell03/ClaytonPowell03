/* ═══════════════════════════════════════════════════════
   scAId — Landing Page JS (v5: clean, no slop)
   ═══════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

function runWhenIdle(task, timeout = 1200) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => task(), { timeout });
    return;
  }
  window.setTimeout(task, 16);
}

function initAnalytics() {
  runWhenIdle(() => {
    inject();
    injectSpeedInsights();
  }, 2000);
}

// ── Animations ───────────────────────────────────────
function initAnimations() {
  // Scroll reveals using IntersectionObserver (reliable)
  const fadeEls = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        gsap.to(entry.target, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });
  fadeEls.forEach(el => { gsap.set(el, { opacity: 0, y: 30 }); observer.observe(el); });
}

// ── Nav ──────────────────────────────────────────────
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 40);
  });

  const hamburger = document.getElementById('hamburger-btn');
  const mobile = document.getElementById('mobile-nav');
  if (hamburger && mobile) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobile.classList.toggle('visible');
      document.body.style.overflow = mobile.classList.contains('visible') ? 'hidden' : '';
    });
    mobile.querySelectorAll('.mobile-nav__link').forEach(l => {
      l.addEventListener('click', () => { hamburger.classList.remove('active'); mobile.classList.remove('visible'); document.body.style.overflow = ''; });
    });
  }
}

// ── Page Transition ──────────────────────────────────
function initPageTransitions() {
  document.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = link.getAttribute('href');
      document.getElementById('page-transition')?.classList.add('active');
      setTimeout(() => { window.location.href = href; }, 400);
    });
  });
}

// ── Smooth Scroll ────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

// ── Loading ──────────────────────────────────────────
function hideLoading() {
  setTimeout(() => document.getElementById('loading-screen')?.classList.add('hidden'), 300);
}

// ── Counters ─────────────────────────────────────────
function initCounters() {
  document.querySelectorAll('.metric__value[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        gsap.to({ v: 0 }, {
          v: target, duration: 1.5, ease: 'power2.out',
          onUpdate() { el.textContent = Math.round(this.targets()[0].v); }
        });
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(el);
  });
}

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAnalytics();
  initAnimations();
  initNavbar();
  initSmoothScroll();
  initCounters();
  initPageTransitions();
  hideLoading();
});
