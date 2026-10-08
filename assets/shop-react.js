/* The shop island. React from a CDN, no build step, so it's `h()` instead of JSX. */
(function () {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const h = React.createElement;
  const money = (n) => '$' + Number(n).toFixed(2);

  /* ---------- cart (localStorage) ---------- */
  const KEY = 'tidepool-bag';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };

  function useCart() {
    const [lines, setLines] = useState(load);
    useEffect(() => {
      try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) {}
      const count = lines.reduce((s, l) => s + l.qty, 0);
      document.dispatchEvent(new CustomEvent('cart:change', { detail: { count } }));
    }, [lines]);
    const add = useCallback((p) => setLines((ls) => {
      const found = ls.find((l) => l.id === p.id);
      return found ? ls.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l))
                   : [...ls, { id: p.id, title: p.title, price: p.price, image: p.image, qty: 1 }];
    }), []);
    const change = useCallback((id, d) => setLines((ls) =>
      ls.map((l) => (l.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0)), []);
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    return { lines, add, change, total };
  }

  /* ---------- pieces ---------- */
  function Stars({ rate }) {
    if (!rate) return null;
    return h('span', { className: 'rating', title: rate + ' out of 5' },
      '\u2605'.repeat(Math.round(rate)) + '\u2606'.repeat(5 - Math.round(rate)));
  }

  function Card({ p, onOpen, onAdd }) {
    const [added, setAdded] = useState(false);
    const click = (e) => {
      e.stopPropagation();
      onAdd(p); setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    };
    return h('article', { className: 'pcard' },
      h('button', { className: 'pcard-img', onClick: () => onOpen(p), 'aria-label': 'Quick look: ' + p.title },
        h('img', { src: p.image, alt: '', loading: 'lazy' })),
      h('div', { className: 'pcard-body' },
        h('p', { className: 'pcard-cat' }, p.category),
        h('h3', null, p.title),
        h('div', { className: 'pcard-row' },
          h('span', { className: 'price' }, money(p.price)),
          h('button', { className: 'btn btn-small' + (added ? ' is-done' : ''), onClick: click }, added ? 'Added' : 'Add'))));
  }

  function QuickLook({ p, onClose, onAdd }) {
    useEffect(() => {
      const esc = (e) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', esc);
      document.body.classList.add('no-scroll');
      return () => { document.removeEventListener('keydown', esc); document.body.classList.remove('no-scroll'); };
    }, []);
    return h('div', { className: 'overlay', onClick: onClose },
      h('div', { className: 'modal', role: 'dialog', 'aria-modal': true, 'aria-label': p.title, onClick: (e) => e.stopPropagation() },
        h('button', { className: 'x', onClick: onClose, 'aria-label': 'Close' }, '\u00d7'),
        h('div', { className: 'modal-img' }, h('img', { src: p.image, alt: p.title })),
        h('div', { className: 'modal-text' },
          h('p', { className: 'pcard-cat' }, p.category),
          h('h2', null, p.title),
          h(Stars, { rate: p.rating }),
          h('p', { className: 'modal-desc' }, p.desc),
          h('div', { className: 'pcard-row' },
            h('span', { className: 'price big' }, money(p.price)),
            h('button', { className: 'btn', onClick: () => { onAdd(p); onClose(); } }, 'Add to bag')))));
  }

  function Drawer({ open, onClose, cart }) {
    return h('div', { className: 'drawer-wrap' + (open ? ' is-open' : ''), 'aria-hidden': !open },
      h('div', { className: 'drawer-back', onClick: onClose }),
      h('aside', { className: 'drawer', 'aria-label': 'Your bag' },
        h('header', null, h('h2', null, 'Your bag'), h('button', { className: 'x', onClick: onClose, 'aria-label': 'Close bag' }, '\u00d7')),
        cart.lines.length === 0
          ? h('p', { className: 'empty' }, 'Nothing in here yet. The good stuff is one scroll up.')
          : h('ul', null, cart.lines.map((l) =>
              h('li', { key: l.id },
                h('img', { src: l.image, alt: '' }),
                h('div', null,
                  h('p', { className: 'l-title' }, l.title),
                  h('div', { className: 'qty' },
                    h('button', { onClick: () => cart.change(l.id, -1), 'aria-label': 'One fewer' }, '\u2212'),
                    h('span', null, l.qty),
                    h('button', { onClick: () => cart.change(l.id, 1), 'aria-label': 'One more' }, '+'))),
                h('b', null, money(l.price * l.qty))))),
        h('footer', null,
          h('div', { className: 'sum' }, h('span', null, 'Subtotal'), h('b', null, money(cart.total))),
          h('p', { className: 'fine' }, cart.total >= 50 ? 'Shipping is on us.' : 'Add ' + money(50 - cart.total) + ' more for free shipping.'),
          h('button', { className: 'btn wide', disabled: !cart.lines.length, onClick: () => alert('Demo store: checkout would hand off to Shopify here.') }, 'Check out'))));
  }

  /* ---------- the app ---------- */
  function Shop({ limit }) {
    const [items, setItems] = useState(null);
    const [error, setError] = useState(null);
    const [cat, setCat] = useState('All');
    const [sort, setSort] = useState('featured');
    const [q, setQ] = useState('');
    const [look, setLook] = useState(null);
    const [bag, setBag] = useState(false);
    const cart = useCart();
    const tries = useRef(0);

    useEffect(() => {
      const ctrl = new AbortController();
      setItems(null); setError(null);
      TidepoolAPI.getProducts(limit, ctrl.signal).then(setItems).catch((e) => e.name !== 'AbortError' && setError(e.message));
      return () => ctrl.abort();
    }, [limit, tries.current]);

    // the header's bag button lives in Liquid, so we listen for its click
    useEffect(() => {
      const open = () => setBag(true);
      const btn = document.querySelector('[data-open-bag]');
      btn && btn.addEventListener('click', open);
      return () => btn && btn.removeEventListener('click', open);
    }, []);

    const cats = useMemo(() => ['All', ...new Set((items || []).map((p) => p.category))], [items]);
    const shown = useMemo(() => {
      let list = (items || []).filter((p) => (cat === 'All' || p.category === cat) && p.title.toLowerCase().includes(q.toLowerCase()));
      if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
      if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
      return list;
    }, [items, cat, sort, q]);

    if (error) return h('div', { className: 'state' }, h('p', null, 'The product feed did not load: ' + error),
      h('button', { className: 'btn', onClick: () => { tries.current++; setError(null); setItems(null); TidepoolAPI.getProducts(limit).then(setItems).catch((e) => setError(e.message)); } }, 'Try again'));

    return h('div', null,
      h('div', { className: 'toolbar' },
        h('div', { className: 'chips', role: 'tablist' }, cats.map((c) =>
          h('button', { key: c, role: 'tab', 'aria-selected': c === cat, className: 'chip' + (c === cat ? ' on' : ''), onClick: () => setCat(c) }, c))),
        h('div', { className: 'tools' },
          h('input', { type: 'search', placeholder: 'Search the shelf', value: q, onChange: (e) => setQ(e.target.value), 'aria-label': 'Search products' }),
          h('select', { value: sort, onChange: (e) => setSort(e.target.value), 'aria-label': 'Sort' },
            h('option', { value: 'featured' }, 'Our order'), h('option', { value: 'low' }, 'Price, low to high'), h('option', { value: 'high' }, 'Price, high to low')))),
      !items
        ? h('div', { className: 'grid' }, Array.from({ length: 8 }, (_, i) => h('div', { key: i, className: 'pcard skeleton' })))
        : shown.length === 0
          ? h('div', { className: 'state' }, h('p', null, 'No match for \u201c' + q + '\u201d. Try a shorter word or clear the filter.'),
              h('button', { className: 'btn', onClick: () => { setQ(''); setCat('All'); } }, 'Clear filters'))
          : h('div', { className: 'grid' }, shown.map((p) => h(Card, { key: p.id, p, onOpen: setLook, onAdd: (x) => { cart.add(x); } }))),
      look && h(QuickLook, { p: look, onClose: () => setLook(null), onAdd: (x) => { cart.add(x); setBag(true); } }),
      h(Drawer, { open: bag, onClose: () => setBag(false), cart }));
  }

  const mount = document.getElementById('react-shop');
  if (mount) ReactDOM.createRoot(mount).render(h(Shop, { limit: +mount.dataset.limit || 20 }));
})();
