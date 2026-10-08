/* Plain DOM code: header, mobile nav, hero stack, AJAX add-to-cart on Liquid pages. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = (n) => '$' + Number(n).toFixed(2);
  window.tpMoney = money;

  // Bag count in the header, fed by the React cart (custom event) or Shopify's cart.js
  const countEl = () => $('[data-bag-count]');
  function setCount(n) {
    const el = countEl();
    if (!el) return;
    el.textContent = n;
    el.hidden = n < 1;
    el.classList.remove('bump');
    void el.offsetWidth; // restart the animation
    el.classList.add('bump');
  }
  document.addEventListener('cart:change', (e) => setCount(e.detail.count));

  // Header gets a shadow line once you scroll
  const header = $('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu
  const burger = $('[data-menu-toggle]');
  const nav = $('[data-nav]');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
    });
  }

  // Hero: build the tilted product stack from live data
  const stack = $('[data-hero-stack]');
  if (stack && window.TidepoolAPI) {
    window.TidepoolAPI.getProducts(8).then((items) => {
      const picks = items.filter((p) => p.image).slice(0, 3);
      const tilt = [-6, 3, -2];
      stack.innerHTML = '';
      picks.forEach((p, i) => {
        const card = document.createElement('a');
        card.className = 'stack-card';
        card.href = p.handle.startsWith('#') ? '#shop' : '/products/' + p.handle;
        card.style.setProperty('--r', tilt[i] + 'deg');
        card.style.setProperty('--i', i);
        card.innerHTML = `<img src="${p.image}" alt="${p.title.replace(/"/g, '')}"><span>${p.title}</span><b>${money(p.price)}</b>`;
        stack.appendChild(card);
      });
    }).catch(() => { stack.remove(); });
  }

  // Liquid product form: add to cart without leaving the page
  $$('form[data-ajax-cart]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', form);
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Adding...';
      try {
        const res = await fetch('/cart/add.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error((await res.json()).description || 'Could not add that');
        const cart = await (await fetch('/cart.js')).json();
        setCount(cart.item_count);
        btn.textContent = 'In your bag';
      } catch (err) {
        btn.textContent = err.message;
      } finally {
        setTimeout(() => { btn.disabled = false; btn.textContent = label; }, 1800);
      }
    });
  });

  // Quantity steppers on the cart page
  $$('[data-qty-step]').forEach((b) => b.addEventListener('click', () => {
    const input = $('input', b.parentElement);
    input.value = Math.max(0, +input.value + +b.dataset.qtyStep);
    input.form.submit();
  }));
})();
