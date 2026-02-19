/**
 * RIPlay Main Site — Script
 *
 * Pure vanilla JS for the landing pages (index.html, en.html, de.html).
 * Handles mobile navigation, scroll effects, smooth scrolling,
 * intersection-observer animations, contact form UX, language detection,
 * and a terminal-style typing effect in the hero section.
 *
 * @version 2.0.0
 */
;(function () {
  'use strict';

  /* ========================================================================
     0. CONSTANTS
     ======================================================================== */

  /** Height of the fixed navbar in pixels — used for scroll offsets. */
  const NAV_HEIGHT = 80;

  /** Scroll threshold (px) before adding the scrolled class to the nav. */
  const SCROLL_THRESHOLD = 50;

  /** Delay between each typed character (ms). */
  const TYPING_SPEED = 55;

  /** Pause at end of typed text before cursor stays blinking (ms). */
  const TYPING_END_PAUSE = 1200;

  /** localStorage key for language preference. */
  const LANG_STORAGE_KEY = 'riplay_lang';

  /* ========================================================================
     1. MOBILE NAVIGATION TOGGLE
     ======================================================================== */

  /**
   * Initialises the hamburger menu toggle for mobile viewports.
   * Toggles `.active` on the hamburger and `.open` on the nav-links
   * container. Also prevents body scroll while the menu is open.
   */
  function initMobileNav() {
    const hamburger = document.querySelector('.rds-hamburger');
    const navLinks = document.querySelector('.rds-nav-links');

    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = hamburger.classList.toggle('active');
      navLinks.classList.toggle('open', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('.rds-nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu(hamburger, navLinks);
      });
    });

    // Close menu when clicking outside the nav
    document.addEventListener('click', function (e) {
      if (!navLinks.classList.contains('open')) return;
      if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu(hamburger, navLinks);
      }
    });
  }

  /**
   * Helper — close the mobile menu and restore body scroll.
   * @param {HTMLElement} hamburger - The hamburger button element.
   * @param {HTMLElement} navLinks  - The nav-links container element.
   */
  function closeMenu(hamburger, navLinks) {
    hamburger.classList.remove('active');
    navLinks.classList.remove('open');
    document.body.classList.remove('nav-open');
  }

  /* ========================================================================
     2. NAVBAR SCROLL EFFECT
     ======================================================================== */

  /**
   * Toggles `.scrolled` on `.rds-nav` when the user scrolls past the
   * defined threshold, giving the navbar a more opaque background.
   */
  function initNavbarScroll() {
    const nav = document.querySelector('.rds-nav');
    if (!nav) return;

    function onScroll() {
      nav.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once on load in case page is already scrolled (e.g. refresh)
    onScroll();
  }

  /* ========================================================================
     3. SMOOTH SCROLL FOR ANCHOR LINKS
     ======================================================================== */

  /**
   * Hijacks clicks on in-page anchor links (`a[href^="#"]`) and performs a
   * smooth scroll to the target element, accounting for the fixed navbar.
   */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ========================================================================
     4. INTERSECTION OBSERVER ANIMATIONS
     ======================================================================== */

  /**
   * Selects all `.rds-fade-in` elements and, when they enter the viewport,
   * adds `.rds-visible` to trigger the CSS transition. If a parent has
   * `.rds-stagger`, each child receives a `--rds-stagger-index` custom
   * property so CSS can apply incremental transition-delay.
   */
  function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.rds-fade-in');
    if (!fadeElements.length) return;

    // Pre-set stagger indices on children of .rds-stagger parents
    document.querySelectorAll('.rds-stagger').forEach(function (parent) {
      const children = parent.querySelectorAll(':scope > .rds-fade-in');
      children.forEach(function (child, index) {
        child.style.setProperty('--rds-stagger-index', index);
      });
    });

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('rds-visible');
            observer.unobserve(entry.target); // animate only once
          }
        });
      },
      { threshold: 0.1 }
    );

    fadeElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ========================================================================
     5. CONTACT FORM HANDLER
     ======================================================================== */

  /**
   * Adds a visual loading state to the contact form's submit button when the
   * form is submitted (Formspree handles the actual submission via its native
   * `action` attribute — we do NOT intercept it).
   *
   * Also checks the URL on load for `?submitted=true` to show a success
   * message (Formspree can redirect back with this param).
   */
  function initContactForm() {
    const form = document.querySelector('.contact-form');

    if (form) {
      form.addEventListener('submit', function () {
        const btn = form.querySelector('.rds-btn-primary');
        if (!btn) return;

        btn.classList.add('is-loading');
        btn.setAttribute('disabled', 'disabled');

        // Preserve the original text and insert a spinner
        const originalHTML = btn.innerHTML;
        btn.innerHTML =
          '<span class="btn-text" style="visibility:hidden;">' +
          originalHTML +
          '</span><span class="rds-spinner" style="position:absolute;"></span>';
      });
    }

    // Show success message if redirected with ?submitted=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('submitted') === 'true') {
      const msg = document.querySelector('.contact-success');
      if (msg) {
        msg.classList.add('visible');
        // Clean up the URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('submitted');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }

  /* ========================================================================
     6. LANGUAGE DETECTION (optional enhancement)
     ======================================================================== */

  /**
   * On first visit (no stored language preference), detects the browser
   * language and redirects to the appropriate page:
   * - `cs` → `index.html` (Czech default)
   * - `de` → `de.html`
   * - everything else → `en.html`
   *
   * Stores the preference in localStorage so the redirect only fires once.
   * Skips detection if the user is already on the correct page.
   */
  function initLanguageDetection() {
    // If a preference is already stored, do nothing
    if (localStorage.getItem(LANG_STORAGE_KEY)) return;

    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase().slice(0, 2);
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'index.html';

    /** @type {Record<string, string>} */
    const langMap = {
      cs: 'index.html',
      de: 'de.html'
    };

    const targetFile = langMap[browserLang] || 'en.html';

    // Store the detected language so we never redirect again
    localStorage.setItem(LANG_STORAGE_KEY, browserLang);

    // Only redirect if the user is NOT already on the target page
    if (currentFile !== targetFile) {
      // Build the redirect URL relative to the current path
      const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      window.location.replace(basePath + targetFile);
    }
  }

  /* ========================================================================
     7. TERMINAL TYPING EFFECT (hero section)
     ======================================================================== */

  /**
   * Simulates a typing effect for the `.hero-typed` element. The text to
   * type is read from the `data-typed-text` attribute. Uses the mono font
   * defined in the design system, with a blinking cursor appended.
   */
  function initTypingEffect() {
    const el = document.querySelector('.hero-typed');
    if (!el) return;

    const text = el.getAttribute('data-typed-text');
    if (!text) return;

    // Clear any existing content and add cursor
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);

    let charIndex = 0;

    /**
     * Types the next character and schedules itself until done.
     */
    function typeChar() {
      if (charIndex < text.length) {
        // Insert character before the cursor
        const charNode = document.createTextNode(text.charAt(charIndex));
        el.insertBefore(charNode, cursor);
        charIndex++;
        setTimeout(typeChar, TYPING_SPEED);
      }
      // Cursor keeps blinking via CSS animation after typing completes
    }

    // Start typing after a short delay so the hero is visible first
    setTimeout(typeChar, 600);
  }

  /* ========================================================================
     8. ACTIVE NAV LINK HIGHLIGHT (scroll-spy)
     ======================================================================== */

  /**
   * Watches sections with an `id` that matches a nav link's `href` and
   * toggles the `.active` class on the corresponding `.rds-nav-link`.
   */
  function initScrollSpy() {
    const navLinks = document.querySelectorAll('.rds-nav-link[href^="#"]');
    if (!navLinks.length) return;

    const sections = [];
    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const section = document.querySelector(href);
      if (section) {
        sections.push({ el: section, link: link });
      }
    });

    if (!sections.length) return;

    function onScroll() {
      const scrollPos = window.scrollY + NAV_HEIGHT + 40; // slight offset

      let current = null;
      sections.forEach(function (s) {
        if (s.el.offsetTop <= scrollPos) {
          current = s;
        }
      });

      navLinks.forEach(function (link) {
        link.classList.remove('active');
      });
      if (current) {
        current.link.classList.add('active');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ========================================================================
     BOOT
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initNavbarScroll();
    initSmoothScroll();
    initScrollAnimations();
    initContactForm();
    initTypingEffect();
    initScrollSpy();

    // Language detection runs last — may trigger a redirect
    initLanguageDetection();
  });
})();
