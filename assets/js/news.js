/* LAN Lab — homepage "Recent Updates" renderer.
   Loads assets/data/news.json and shows the latest few items, newest first.
   Vanilla JS, no libraries. */

(function () {
  'use strict';

  const DATA_URL = 'assets/data/news.json';
  const MAX_ITEMS = 6;
  const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const list = document.getElementById('news-list');
  if (!list) return;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // Format an ISO yyyy-mm-dd string without timezone surprises.
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    const month = MONTHS[parseInt(m[2], 10) - 1] || m[2];
    return parseInt(m[3], 10) + ' ' + month + ' ' + m[1];
  }

  function status(message) {
    list.textContent = '';
    list.appendChild(el('p', 'news-status', message));
  }

  function renderItem(item, isLatest) {
    const li = el('li', 'news-item' + (isLatest ? ' news-item--latest' : ''));
    if (isLatest) {
      li.appendChild(el('span', 'news-badge', 'Latest'));
    }
    li.appendChild(el('span', 'news-date', formatDate(item.date)));
    const body = el('span', 'news-text', item.text || '');
    if (item.link) {
      body.appendChild(document.createTextNode(' '));
      const a = el('a', 'news-link', item.link_label || 'Read more');
      a.href = item.link;
      a.target = '_blank';
      a.rel = 'noopener';
      body.appendChild(a);
    }
    li.appendChild(body);
    return li;
  }

  fetch(DATA_URL)
    .then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    })
    .then(function (items) {
      if (!Array.isArray(items) || items.length === 0) {
        status('Updates coming soon.');
        return;
      }
      items.sort(function (a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });
      list.textContent = '';
      const ul = el('ul', 'news-items');
      items.slice(0, MAX_ITEMS).forEach(function (item, i) {
        ul.appendChild(renderItem(item, i === 0));
      });
      list.appendChild(ul);
    })
    .catch(function (err) {
      status('Updates are temporarily unavailable.');
      console.error('news load failed:', err);
    });
})();
