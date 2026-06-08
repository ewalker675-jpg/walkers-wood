/* =================================================================
   WALKERS WOOD — SHARED JS
   Injected header, footer, cookie banner, scroll animations.
   Loaded on every page via <script src="/js/main.js" defer></script>
   ================================================================= */

(function () {
  'use strict';

  // ── CURRENT PAGE DETECTION ──
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const page = path.split('/').pop().replace('.html', '') || 'index';
  function isActive(p) {
    if (p === '/' || p === 'index') return page === 'index' || path === '/';
    return page === p;
  }

  // ── HEADER ──
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="header-inner">
      <a href="/" class="header-logo"><img src="/images/logo.png" alt="Walkers Wood" width="140" height="40"></a>
      <nav class="header-nav">
        <a href="/"${isActive('index') ? ' class="active"' : ''}>Home</a>
        <a href="/firewood.html"${isActive('firewood') ? ' class="active"' : ''}>Buy Firewood</a>
        <a href="/services.html"${isActive('services') ? ' class="active"' : ''}>Forestry</a>
        <a href="/about.html"${isActive('about') ? ' class="active"' : ''}>About</a>
        <a href="/faqs.html"${isActive('faqs') ? ' class="active"' : ''}>FAQs</a>
        <a href="/contact.html"${isActive('contact') ? ' class="active"' : ''}>Contact</a>
      </nav>
      <div class="header-actions" style="display: flex; align-items: center; gap: 0.8rem;">
        <a href="/firewood.html?checkout=open" class="header-cart" id="headerCart" aria-label="View basket" style="position: relative; display: inline-flex; align-items: center; justify-content: center; color: var(--c2); padding: 0.5rem; transition: var(--ease);">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span class="cart-count" id="cartCount" style="position: absolute; top: -2px; right: -2px; background: var(--c6); color: white; font-size: 0.65rem; font-weight: 700; border-radius: 50%; width: 16px; height: 16px; display: none; align-items: center; justify-content: center; line-height: 1;">0</span>
        </a>
        <a href="/firewood.html" class="header-cta">Order now</a>
      </div>
      <button class="hamburger" id="hamburger" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;
  document.body.prepend(header);

  // ── MOBILE NAV ──
  const mobileNav = document.createElement('div');
  mobileNav.className = 'mobile-nav';
  mobileNav.id = 'mobileNav';
  mobileNav.innerHTML = `
    <a href="/"${isActive('index') ? ' class="active"' : ''}>Home</a>
    <a href="/firewood.html"${isActive('firewood') ? ' class="active"' : ''}>Buy Firewood</a>
    <a href="/firewood.html?checkout=open" class="mobile-cart-link" style="display: flex; align-items: center; justify-content: space-between; font-weight: 600;">
      <span>🛒 View Basket</span>
      <span class="cart-count" id="mobileCartCount" style="background: var(--c6); color: white; font-size: 0.7rem; font-weight: 700; border-radius: 50%; width: 18px; height: 18px; display: none; align-items: center; justify-content: center; line-height: 1;">0</span>
    </a>
    <a href="/services.html"${isActive('services') ? ' class="active"' : ''}>Forestry</a>
    <a href="/about.html"${isActive('about') ? ' class="active"' : ''}>About</a>
    <a href="/faqs.html"${isActive('faqs') ? ' class="active"' : ''}>FAQs</a>
    <a href="/contact.html"${isActive('contact') ? ' class="active"' : ''}>Contact</a>
    <a href="tel:07583338879" style="color:var(--c7); margin-top:1rem; font-size:0.9rem;">07583 338879</a>
  `;
  document.body.appendChild(mobileNav);

  const hamburger = document.getElementById('hamburger');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
    document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
  });
  // Close mobile nav on link click
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ── FOOTER ──
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a href="/" class="footer-logo"><img src="/images/logo.png" alt="Walkers Wood"></a>
          <p class="footer-desc">Premium hardwood firewood, sustainably sourced from our farm and local farms across Worcestershire and Herefordshire — all split and dried on site.</p>
          <div class="footer-badges">
            <img src="/images/woodsure-badge.png" alt="Woodsure Ready to Burn certified" height="55">
            <img src="/images/lantra-badge.png" alt="Lantra certified" height="55">
          </div>
        </div>
        <div>
          <h4 class="footer-heading">Navigate</h4>
          <div class="footer-links">
            <a href="/">Home</a>
            <a href="/firewood.html">Buy firewood</a>
            <a href="/services.html">Forestry</a>
            <a href="/about.html">About us</a>
            <a href="/faqs.html">FAQs</a>
            <a href="/contact.html">Contact</a>
          </div>
        </div>
        <div>
          <h4 class="footer-heading">Forestry</h4>
          <div class="footer-links">
            <a href="/firewood.html">Hardwood firewood</a>
            <a href="/services.html">Woodland clearance</a>
            <a href="/services.html">Wood processing</a>
            <a href="/services.html">Fire pit hire</a>
            <a href="/services.html">Log stacking</a>
          </div>
        </div>
        <div>
          <h4 class="footer-heading">Get in touch</h4>
          <div class="footer-contact">
            <p><a href="tel:07583338879">07583 338879</a></p>
            <p><a href="mailto:edwardwalkerfarms@gmail.com">edwardwalkerfarms@gmail.com</a></p>
            <p>Clifton upon Teme<br>Worcestershire, WR6 6DT</p>
          </div>
          <div class="footer-socials">
            <a href="https://www.instagram.com/_walkers_wood/" target="_blank" rel="noopener" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
            </a>
            <a href="https://www.facebook.com/p/Walkers-Wood-100087309461765/" target="_blank" rel="noopener" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@walkers.wood" target="_blank" rel="noopener" aria-label="TikTok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
            </a>
            <a href="https://wa.me/447583338879" target="_blank" rel="noopener" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">© ${year} Walkers Wood. All rights reserved.</p>
        <div class="footer-legal">
          <a href="/privacy-policy.html">Privacy Policy</a>
          <a href="/cookie-policy.html">Cookie Policy</a>
          <a href="/terms-and-conditions.html">Terms & Conditions</a>
          <a href="/terms-of-use.html">Terms of Use</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(footer);

  // ── COOKIE BANNER ──
  if (!localStorage.getItem('ww_cookie_consent')) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner show';
    banner.innerHTML = `
      <div class="cookie-inner">
        <p class="cookie-text">
          We use cookies to improve your experience on our website. By continuing to browse, you agree to our use of cookies.
          <a href="/cookie-policy.html">Cookie Policy</a> · <a href="/privacy-policy.html">Privacy Policy</a>
        </p>
        <div class="cookie-btns">
          <button class="cookie-accept" id="cookieAccept">Accept</button>
          <button class="cookie-decline" id="cookieDecline">Decline</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('cookieAccept').addEventListener('click', () => {
      localStorage.setItem('ww_cookie_consent', 'accepted');
      banner.remove();
    });
    document.getElementById('cookieDecline').addEventListener('click', () => {
      localStorage.setItem('ww_cookie_consent', 'declined');
      banner.remove();
    });
  }

  // ── SCROLL FADE ANIMATIONS ──
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll('.fade').forEach((el) => observer.observe(el));

  // ── SMOOTH SCROLL FOR ANCHOR LINKS ──
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── CART EVENT AND UPDATE ──
  function getCartItemCount() {
    try {
      const raw = localStorage.getItem('ww_basket');
      if (!raw) return 0;
      const basket = JSON.parse(raw);
      if (!basket || !basket.selectedProduct) return 0;
      return 1 + (basket.stacking ? 1 : 0) + (basket.kindlingBags || 0);
    } catch (e) {
      return 0;
    }
  }

  function updateCartUI() {
    const count = getCartItemCount();
    
    // Update badge in header
    const badge = document.getElementById('cartCount');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // Update badge in mobile nav if present
    const mobileBadge = document.getElementById('mobileCartCount');
    if (mobileBadge) {
      mobileBadge.textContent = count;
      mobileBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    // Check basket prompt display
    showOrHideBasketPrompt(count);
  }

  function showOrHideBasketPrompt(count) {
    const isFirewoodPage = window.location.pathname.includes('firewood.html');
    const isDismissed = sessionStorage.getItem('ww_basket_prompt_dismissed') === 'true';

    let promptEl = document.getElementById('basketPrompt');
    if (count > 0 && !isFirewoodPage && !isDismissed) {
      if (!promptEl) {
        promptEl = document.createElement('div');
        promptEl.id = 'basketPrompt';
        promptEl.className = 'basket-prompt';
        promptEl.innerHTML = `
          <span>You have items in your basket — ready to checkout?</span>
          <div class="basket-prompt-btns">
            <a href="/firewood.html?checkout=open" class="btn-primary btn-sm" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">Checkout</a>
            <button class="basket-prompt-close" id="closeBasketPrompt" style="background: none; border: none; font-size: 1.2rem; color: var(--c7); cursor: pointer; padding: 0 0.2rem;">×</button>
          </div>
        `;
        document.body.appendChild(promptEl);
        
        document.getElementById('closeBasketPrompt').addEventListener('click', () => {
          sessionStorage.setItem('ww_basket_prompt_dismissed', 'true');
          promptEl.remove();
        });
      }
    } else if (promptEl) {
      promptEl.remove();
    }
  }

  // Initial load cart UI
  updateCartUI();

  // Listen for storage events (updates across tabs)
  window.addEventListener('storage', updateCartUI);
  // Custom event for updates within same tab
  window.addEventListener('cartUpdated', updateCartUI);

})();
