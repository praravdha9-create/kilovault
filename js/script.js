/* =========================================================
   KILOVAULT — shared front-end behavior
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initCart();
  initShopFilters();
  initContactForm();
  initNewsletterForm();
});

/* =========================================================
   Cart — stored in localStorage, no backend. Adding an item
   just builds up a list; checkout happens by messaging us on
   social media (see cart.html), so this never touches payment.
   ========================================================= */

const CART_KEY = 'kilovault_cart_v1';
const SOCIAL_URL = 'https://instagram.com';

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch (e) {
    /* storage unavailable — cart simply won't persist */
  }
}

function cartCount(items) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadges() {
  const items = readCart();
  const count = cartCount(items);
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = String(count);
  });
}

function initCart() {
  updateCartBadges();

  document.querySelectorAll('.add-btn[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const items = readCart();
      const id = btn.dataset.id;
      const existing = items.find((i) => i.id === id);

      if (existing) {
        existing.qty += 1;
      } else {
        items.push({
          id,
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          spec: btn.dataset.spec,
          image: btn.dataset.image,
          qty: 1
        });
      }

      writeCart(items);
      updateCartBadges();

      const original = btn.textContent;
      btn.textContent = 'Added ✓';
      btn.classList.add('is-added');
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('is-added');
        btn.disabled = false;
      }, 1100);
    });
  });

  if (document.getElementById('cart-root')) {
    renderCartPage();
  }
}

function renderCartPage() {
  const root = document.getElementById('cart-root');
  const summaryEl = document.getElementById('cart-summary');
  const items = readCart();

  if (!items.length) {
    root.innerHTML = `
      <div class="cart-empty">
        <div class="icon">⚡</div>
        <h2>Your Cart Is Empty</h2>
        <p>Nothing picked out yet. Browse the shop and add a few pieces — we'll help you sort sizing and stock over DM when you're ready.</p>
        <a href="shop.html" class="btn btn-primary">Browse the Shop <span class="btn-arrow">→</span></a>
      </div>
    `;
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  root.innerHTML = items.map((item) => `
    <div class="cart-item" data-cart-id="${item.id}">
      <img src="${item.image}" alt="${item.name}">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-spec">${item.spec}</div>
        <button class="cart-remove" data-remove="${item.id}">Remove</button>
      </div>
      <div class="qty-control">
        <button type="button" data-qty-down="${item.id}" aria-label="Decrease quantity">−</button>
        <span class="qty-value">${item.qty}</span>
        <button type="button" data-qty-up="${item.id}" aria-label="Increase quantity">+</button>
      </div>
      <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
    </div>
  `).join('');

  root.querySelectorAll('[data-qty-up]').forEach((btn) => {
    btn.addEventListener('click', () => changeQty(btn.dataset.qtyUp, 1));
  });
  root.querySelectorAll('[data-qty-down]').forEach((btn) => {
    btn.addEventListener('click', () => changeQty(btn.dataset.qtyDown, -1));
  });
  root.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeItem(btn.dataset.remove));
  });

  renderCartSummary(items);
}

function changeQty(id, delta) {
  const items = readCart();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  const next = item.qty <= 0 ? items.filter((i) => i.id !== id) : items;
  writeCart(next);
  updateCartBadges();
  renderCartPage();
}

function removeItem(id) {
  const items = readCart().filter((i) => i.id !== id);
  writeCart(items);
  updateCartBadges();
  renderCartPage();
}

function renderCartSummary(items) {
  const summaryEl = document.getElementById('cart-summary');
  if (!summaryEl) return;
  summaryEl.style.display = '';

  const count = cartCount(items);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  summaryEl.innerHTML = `
    <h3>Your Selection</h3>
    <div class="summary-row"><span>Items</span><span>${count}</span></div>
    <div class="summary-row total"><span>Estimated Total</span><span class="amt">$${subtotal.toFixed(2)}</span></div>

    <div class="social-cta-card">
      <span class="eyebrow">Next Step</span>
      <p>We keep ordering personal — message us your list on Instagram and we'll confirm sizing, current stock, and get you sorted directly.</p>
      <a href="${SOCIAL_URL}" target="_blank" rel="noopener" class="btn btn-primary">Message Us on Instagram <span class="btn-arrow">→</span></a>
      <button type="button" id="copy-summary" class="btn copy-btn">Copy My List</button>
    </div>

    <div class="reassure-row">
      <div class="reassure-item"><div class="ic">⚡</div><div class="txt">Real Reply<br>Not a Bot</div></div>
      <div class="reassure-item"><div class="ic">✓</div><div class="txt">Live Stock<br>Check</div></div>
      <div class="reassure-item"><div class="ic">↻</div><div class="txt">Easy Size<br>Swaps</div></div>
    </div>
  `;

  const copyBtn = document.getElementById('copy-summary');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const lines = items.map((i) => `${i.qty}x ${i.name} — $${(i.price * i.qty).toFixed(2)}`);
      lines.push(`Total: $${subtotal.toFixed(2)}`);
      const text = `Hey Kilovault! I'd like to order:\n${lines.join('\n')}`;

      const done = () => {
        copyBtn.textContent = 'Copied ✓';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy My List';
          copyBtn.classList.remove('copied');
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        done();
      }
    });
  }
}

/* ---------- Mobile nav toggle ---------- */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => links.classList.remove('open'));
  });
}

/* ---------- Shop filter buttons ---------- */
function initShopFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('[data-category]');
  if (!filterBtns.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.dataset.filter;

      cards.forEach((card) => {
        const show = category === 'all' || card.dataset.category === category;
        card.style.display = show ? '' : 'none';
      });
    });
  });
}

/* ---------- Contact form validation ---------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.getElementById('form-status');

  const validators = {
    name: (v) => v.trim().length >= 2 || 'Enter your full name.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address.',
    subject: (v) => v.trim().length >= 2 || 'Let us know what this is about.',
    message: (v) => v.trim().length >= 10 || 'Message should be at least 10 characters.'
  };

  const showError = (field, message) => {
    const wrapper = field.closest('.field');
    if (!wrapper) return;
    wrapper.classList.add('has-error');
    const errorEl = wrapper.querySelector('.field-error');
    if (errorEl) errorEl.textContent = message;
  };

  const clearError = (field) => {
    const wrapper = field.closest('.field');
    if (!wrapper) return;
    wrapper.classList.remove('has-error');
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    Object.keys(validators).forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      const result = validators[name](field.value);
      if (result !== true) {
        showError(field, result);
        valid = false;
      } else {
        clearError(field);
      }
    });

    if (!valid) {
      if (status) {
        status.textContent = 'Please fix the highlighted fields.';
        status.classList.add('visible');
        status.style.color = '#FF6B6B';
      }
      return;
    }

    // No backend wired up yet — this is where a form endpoint or
    // fetch() call to your provider (e.g. Formspree, Netlify Forms) goes.
    if (status) {
      status.textContent = 'Message sent. We\u2019ll reply within 1\u20132 business days.';
      status.classList.add('visible');
      status.style.color = 'var(--lime)';
    }
    form.reset();
  });

  Object.keys(validators).forEach((name) => {
    const field = form.elements[name];
    if (!field) return;
    field.addEventListener('blur', () => {
      const result = validators[name](field.value);
      if (result !== true) {
        showError(field, result);
      } else {
        clearError(field);
      }
    });
  });
}

/* ---------- Newsletter form (demo) ---------- */
function initNewsletterForm() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    if (!input || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      input.style.borderColor = '#B3261E';
      return;
    }
    input.style.borderColor = '';
    const btn = form.querySelector('button');
    const original = btn.textContent;
    btn.textContent = 'Subscribed';
    input.value = '';
    setTimeout(() => { btn.textContent = original; }, 1800);
  });
}
