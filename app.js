const API = 'api.php';
let allItems = [], filtered = [], visibleCount = 8, appliedDiscount = 0;

/* ── Dark Mode ── */
function toggleDarkMode() {
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icon = document.getElementById('darkModeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

/* ── Toast ── */
function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), dur);
}

/* ── Cart (localStorage) ── */
function getCart() { return JSON.parse(localStorage.getItem('qb_cart') || '[]'); }
function saveCart(c) { localStorage.setItem('qb_cart', JSON.stringify(c)); updateCartUI(); }
function cartTotal() { return getCart().reduce((s, i) => s + i.price * i.qty, 0); }

function addToCart(item) {
  const cart = getCart();
  const normalizedSize = (item.size ?? '');
  const idx = cart.findIndex(c => c.id === item.id && (c.size ?? '') === normalizedSize);
  if (idx > -1) cart[idx].qty++;
  else cart.push({ ...item, size: normalizedSize, qty: 1 });
  saveCart(cart);
  showToast('✅ Added to cart!');
}


function updateCartUI() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cartTotal();
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
  const fc = document.getElementById('floatingCart');
  if (fc) {
    document.getElementById('cart-total-price').textContent = 'Rs ' + total.toLocaleString();
    document.getElementById('cart-item-count').textContent = count + ' item' + (count !== 1 ? 's' : '');
    fc.classList.toggle('hidden', count === 0);
  }
}

/* ── Fetch menu from API ── */
async function fetchMenu() {
  renderShimmer();
  try {
    const res = await fetch(API + '?action=menu');
    const data = await res.json();
    allItems = data.items || [];
    renderCategories([...new Set(allItems.map(i => i.category))]);
    filtered = [...allItems];
    renderItems();
  } catch {
    document.getElementById('foodList').innerHTML =
      '<div class="no-results"><span class="no-results-icon">⚠️</span><p>Could not load menu. Please try again.</p></div>';
  }
}

/* ── Shimmer placeholder ── */
function renderShimmer() {
  const grid = document.getElementById('foodList');
  if (!grid) return;
  grid.innerHTML = Array(8).fill(`
    <div class="shimmer-card">
      <div class="shimmer-img"></div>
      <div class="shimmer-body">
        <div class="shimmer-line"></div>
        <div class="shimmer-line short"></div>
      </div>
    </div>`).join('');
}

/* ── Render categories ── */
function renderCategories(cats) {
  const nav = document.getElementById('categories');
  if (!nav) return;
  nav.innerHTML = ['All', ...cats].map(c =>
    `<button class="category-chip${c==='All'?' active':''}" onclick="filterCat('${c}',this)">${catEmoji(c)} ${c}</button>`
  ).join('');
}

function catEmoji(c) {
  return { All:'🍽️', Burgers:'🍔', Pizza:'🍕', Biryani:'🍛', Drinks:'🥤', Fries:'🍟', Wraps:'🌯', Desserts:'🍰' }[c] || '🍴';
}

/* ── Filter by category ── */
function filterCat(cat, btn) {
  document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtered = cat === 'All' ? [...allItems] : allItems.filter(i => i.category === cat);
  const title = document.getElementById('section-title');
  if (title) title.textContent = cat === 'All' ? 'All Items' : cat;
  visibleCount = 8;
  renderItems();
}

/* ── Sort ── */
document.addEventListener('change', e => {
  if (e.target.id !== 'sort-select') return;
  const v = e.target.value;
  if (v === 'price-asc')  filtered.sort((a,b) => a.price - b.price);
  if (v === 'price-desc') filtered.sort((a,b) => b.price - a.price);
  if (v === 'rating')     filtered.sort((a,b) => b.rating - a.rating);
  if (v === 'default')    filtered = [...allItems].filter(i => document.querySelector('.category-chip.active')?.textContent.trim().includes(i.category) || document.querySelector('.category-chip.active')?.textContent.includes('All'));
  visibleCount = 8;
  renderItems();
});

/* ── Render food cards ── */
function renderItems() {
  const grid = document.getElementById('foodList');
  const count = document.getElementById('section-count');
  const lmw   = document.getElementById('loadMoreWrapper');
  if (!grid) return;
  const slice = filtered.slice(0, visibleCount);
  if (!slice.length) {
    grid.innerHTML = '<div class="no-results"><span class="no-results-icon">🔍</span><p>No items found.</p></div>';
    if (count) count.textContent = '0 items';
    if (lmw) lmw.hidden = true;
    return;
  }
  if (count) count.textContent = filtered.length + ' item' + (filtered.length !== 1 ? 's' : '');
  grid.innerHTML = slice.map(item => `
    <div class="food-card" onclick="openModal(${item.id})">
      <div class="card-img-wrapper">
        <img src="${item.image || 'https://placehold.co/400x220/f2efe9/ff4d00?text='+encodeURIComponent(item.name)}" alt="${item.name}" loading="lazy">
        <span class="card-badge">${item.category}</span>
      </div>
      <div class="card-info">
        <div class="card-title">${item.name}</div>
        <div class="rating-row">
          <span class="stars">★ ${item.rating}</span>
          <span>· ${item.delivery_time} min</span>
        </div>
        <div class="card-footer">
          <span class="card-price">Rs ${Number(item.price).toLocaleString()}</span>
          <button class="add-btn" onclick="event.stopPropagation();quickAdd(${item.id})">
            <i class="fas fa-plus"></i> Add
          </button>
        </div>
      </div>
    </div>`).join('');
  if (lmw) lmw.hidden = filtered.length <= visibleCount;
}

function loadMore() { visibleCount += 8; renderItems(); }

/* ── Quick add (without modal) ── */
function quickAdd(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  if (item.sizes && item.sizes.length) return openModal(id); // needs size selection
  addToCart({ id: item.id, name: item.name, price: item.price, image: item.image });
}

/* ── Product Modal ── */
let modalQty = 1, modalItem = null, selectedSize = null;

function openModal(id) {
  modalItem = allItems.find(i => i.id === id);
  if (!modalItem) return;
  modalQty = 1; selectedSize = null;

  document.getElementById('modal-img').src = modalItem.image || 'https://placehold.co/480x220/f2efe9/ff4d00?text='+encodeURIComponent(modalItem.name);
  document.getElementById('modal-img').alt = modalItem.name;
  document.getElementById('modal-title').textContent = modalItem.name;
  document.getElementById('modal-rating').textContent = '★ ' + modalItem.rating;
  document.getElementById('modal-time').textContent = '⏱ ' + modalItem.delivery_time + ' min';
  document.getElementById('modal-cat').textContent = modalItem.category;
  document.getElementById('modal-desc').textContent = modalItem.description || '';
  document.getElementById('modal-price').textContent = 'Rs ' + Number(modalItem.price).toLocaleString();
  document.getElementById('modal-qty-val').textContent = 1;

  // Sizes
  const sw = document.getElementById('sizeSelectorWrap');
  const so = document.getElementById('sizeOptions');
  const sizes = modalItem.sizes ? JSON.parse(modalItem.sizes) : [];
  if (sizes.length && sw && so) {
    sw.hidden = false;
    so.innerHTML = sizes.map(s =>
      `<button class="size-btn" onclick="selectSize('${s.label}',${s.price},this)">${s.label} — Rs ${Number(s.price).toLocaleString()}</button>`
    ).join('');
  } else if (sw) sw.hidden = true;

  // WhatsApp link
  const waMsg = encodeURIComponent(`Hi! I want to order: ${modalItem.name} (Rs ${modalItem.price})`);
  document.getElementById('modal-wa-btn').href = `https://wa.me/923227644982?text=${waMsg}`;

  document.getElementById('modalOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function selectSize(label, price, btn) {
  selectedSize = { label, price };
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('modal-price').textContent = 'Rs ' + Number(price).toLocaleString();
}

function closeModal() {
  document.getElementById('modalOverlay').hidden = true;
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  // Modal close
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });

  // Modal qty
  document.getElementById('modal-minus')?.addEventListener('click', () => {
    if (modalQty > 1) { modalQty--; document.getElementById('modal-qty-val').textContent = modalQty; }
  });
  document.getElementById('modal-plus')?.addEventListener('click', () => {
    modalQty++; document.getElementById('modal-qty-val').textContent = modalQty;
  });

  // Modal add to cart
  document.getElementById('modal-add-btn')?.addEventListener('click', () => {
    if (!modalItem) return;
    const sizes = modalItem.sizes ? JSON.parse(modalItem.sizes) : [];
    if (sizes.length && !selectedSize) { showToast('⚠️ Please select a size!'); return; }
    const price = selectedSize ? selectedSize.price : modalItem.price;
    for (let i = 0; i < modalQty; i++) {
      addToCart({ id: modalItem.id, name: modalItem.name, price: Number(price), image: modalItem.image, size: selectedSize?.label || '' });
    }
    closeModal();
  });

  // Keyboard close
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Restore theme
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const icon = document.getElementById('darkModeIcon');
  if (icon) icon.className = saved === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

  updateCartUI();
// Mobile search toggle
const searchToggle = document.getElementById('searchToggle');
const searchContainer = document.getElementById('searchContainer');
searchToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  searchContainer.classList.toggle('open');
  if (searchContainer.classList.contains('open')) {
    document.getElementById('search')?.focus();
  }
});
document.addEventListener('click', (e) => {
  if (searchContainer && !searchContainer.contains(e.target)) {
    searchContainer.classList.remove('open');
  }
});

  // Page-specific init
if (document.getElementById('foodList')) fetchMenu();
if (document.getElementById('cartBox')) renderCart();


  const searchInput = document.getElementById('search');
    const dropdown = document.getElementById('searchDropdown');
  const dropdownInner = document.getElementById('searchDropdownInner');
  const clearBtn = document.getElementById('searchClear');
  if (searchInput && dropdown && dropdownInner) {
    let t = null;

const hide = () => {
  dropdown.setAttribute('hidden', '');
  dropdownInner.innerHTML = '';
};

const show = () => {
  dropdown.removeAttribute('hidden');
};
    const renderResults = (q) => {
      const query = q.trim().toLowerCase();
      if (!query || !allItems.length) {
        hide();
        return;
      }

      const results = allItems
        .filter(i => {
          const hay = ((i.name || '') + ' ' + (i.description || '')).toLowerCase();
          return hay.includes(query);
        })
        .slice(0, 8);

      if (!results.length) {
        dropdownInner.innerHTML = `
          <div class="search-no-results">
            <i class="fas fa-circle-exclamation"></i>
            <div style="margin-top:.35rem">No results found</div>
          </div>`;
        show();
        return;
      }

      dropdownInner.innerHTML = results.map(i => {
        const price = Number(i.price || 0).toLocaleString();
        return `
          <div class="search-result-item" role="button" tabindex="0" data-id="${i.id}">
            <img class="search-result-img" src="${i.image || 'https://placehold.co/96x96/f2efe9/ff4d00?text='+encodeURIComponent(i.name)}" alt="${i.name}">
            <div class="search-result-info">
              <div class="search-result-name">${i.name}</div>
              <div class="search-result-meta">${i.category} · ${i.delivery_time} min</div>
            </div>
            <div class="search-result-price">Rs ${price}</div>
          </div>`;
      }).join('');

      show();
    };

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      clearTimeout(t);
      t = setTimeout(() => renderResults(q), 120);

      if (clearBtn) {
        const hasVal = (q || '').trim().length > 0;
        clearBtn.classList.toggle('visible', hasVal);
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        searchInput.value = '';
        clearBtn.classList.remove('visible');
        hide();
        searchInput.focus();
      });
    }

    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!dropdown || dropdown.hidden) return;
      if (target === searchInput || searchInput.contains(target)) return;
      if (dropdown.contains(target)) return;
      hide();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
    });

    dropdownInner.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.search-result-item');
      if (!itemEl) return;
      const id = Number(itemEl.dataset.id);
      if (!Number.isFinite(id)) return;
      hide();
      // Open modal for full options
      openModal(id);
    });
  }
});


/* ============================================================
   CART PAGE
   ============================================================ */
function renderCart() {
  const box   = document.getElementById('cartBox');
  const hc    = document.getElementById('cart-header-count');
  if (!box) return;
  const cart  = getCart();
  const count = cart.reduce((s,i) => s+i.qty, 0);
  if (hc) hc.textContent = count;

  if (!cart.length) {
    box.innerHTML = `
      <li class="empty-cart">
        <span style="font-size:3.5rem">🛒</span>
        <h3>Your cart is empty</h3>
        <p>Add some delicious food first!</p>
        <a href="index.html" class="btn-primary">← Browse Menu</a>
      </li>`;
    updateSummary(0);
    return;
  }

  box.innerHTML = cart.map(item => `
    <li class="cart-item">
      <img src="${item.image || 'https://placehold.co/80x80/f2efe9/ff4d00?text=Food'}" alt="${item.name}">
      <div class="item-info">
        <h3>${item.name}${item.size ? ' <small>('+item.size+')</small>' : ''}</h3>
        <div class="item-cuisine">Rs ${Number(item.price).toLocaleString()} each</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty(${item.id},'${item.size}',-1)">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id},'${item.size}',1)">+</button>
        </div>
      </div>
      <div class="item-right">
        <span class="item-total">Rs ${(item.price * item.qty).toLocaleString()}</span>
        <button class="remove-btn" onclick="removeItem(${item.id},'${item.size}')"><i class="fas fa-trash"></i> Remove</button>
      </div>
    </li>`).join('');

  updateSummary(cartTotal());
}

function changeQty(id, size, delta) {
  const cart = getCart();
  const normalizedSize = (size ?? '');
  const idx = cart.findIndex(c => c.id === id && (c.size ?? '') === normalizedSize);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(cart);
  renderCart();
}

function removeItem(id, size) {
  const normalizedSize = (size ?? '');
  const cart = getCart().filter(c => !(c.id === id && (c.size ?? '') === normalizedSize));
  saveCart(cart);
  renderCart();
  showToast('🗑️ Item removed');
}


function updateSummary(sub) {
  const delivery = sub >= 1500 ? 0 : (sub > 0 ? 99 : 0);
  const discount = appliedDiscount || 0;
  const grand    = Math.max(0, sub + delivery - discount);
  const fmt = n => 'Rs ' + n.toLocaleString();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('summary-subtotal', fmt(sub));
  set('summary-delivery', sub === 0 ? '—' : (delivery === 0 ? 'FREE 🎉' : fmt(delivery)));
  set('summary-discount', discount > 0 ? '— ' + fmt(discount) : '— Rs 0');
  set('grand-total', fmt(grand));
}

/* ── Promo Code ── */
const PROMO_CODES = { QUICKBITE10: 0.10 };
function applyPromo() {
  const input = document.getElementById('promo-input');
  const code  = input?.value.trim().toUpperCase();
  if (!code) return showToast('Enter a promo code first.');
  if (PROMO_CODES[code]) {
    const sub = cartTotal();
    appliedDiscount = Math.round(sub * PROMO_CODES[code]);
    updateSummary(sub);
    showToast('🎉 Promo applied! ' + (PROMO_CODES[code] * 100) + '% off');
  } else {
    showToast('❌ Invalid promo code');
  }
}

/* ── Place Order ── */
async function placeOrder() {
  const name    = document.getElementById('of-name')?.value.trim();
  const phone   = document.getElementById('of-phone')?.value.trim();
  const address = document.getElementById('of-address')?.value.trim();
  const payment = document.querySelector('input[name="payment"]:checked')?.value;

  if (!name)    return showToast('⚠️ Please enter your name');
  if (!phone)   return showToast('⚠️ Please enter your phone number');
  if (!address) return showToast('⚠️ Please enter your delivery address');

  const btn = document.getElementById('confirm-order-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Placing order…'; }

  const sub      = cartTotal();
  const delivery = sub >= 1500 ? 0 : 99;
  const grand    = Math.max(0, sub + delivery - (appliedDiscount || 0));

  const payload = {
    action: 'place_order',
    name, phone, address,
    city:    document.getElementById('of-city')?.value || '',
    notes:   document.getElementById('of-notes')?.value || '',
    payment: payment || 'cod',
    items:   getCart(),
    subtotal: sub, delivery_fee: delivery,
    discount: appliedDiscount || 0, total: grand
  };

  try {
    const res  = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      localStorage.removeItem('qb_cart');
      const oid = document.getElementById('order-id-val');
      if (oid) oid.textContent = data.order_id;
      document.getElementById('orderFormOverlay')?.classList.add('hidden');
      document.getElementById('orderSuccessOverlay')?.classList.remove('hidden');
    } else {
      showToast('❌ ' + (data.message || 'Order failed. Try again.'));
      if (btn) { btn.disabled = false; btn.textContent = 'Confirm & Place Order'; }
    }
  } catch {
    showToast('❌ Network error. Please try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Confirm & Place Order'; }
  }
}
document.querySelector('.search-toggle')?.addEventListener('click', () => {
  document.querySelector('.search-container').classList.toggle('open');
  document.querySelector('.search-input')?.focus();
});