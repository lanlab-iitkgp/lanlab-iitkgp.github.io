/* LAN Lab — Publications page renderer.
   Reads the committed assets/data/publications.json (generated from OpenAlex
   by scripts/fetch-publications.py) and renders it grouped by year. The browser
   never calls OpenAlex directly. Vanilla JS, no libraries. */

(function () {
  'use strict';

  const DATA_URL = '../assets/data/publications.json';
  const container = document.getElementById('pub-container');
  const refreshNote = document.getElementById('pub-refresh-note');
  if (!container) return;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(href, label) {
    const a = el('a', null, label);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function renderAuthors(work) {
    const wrap = el('div', 'pub-authors');
    (work.authors || []).forEach(function (name, i) {
      if (i > 0) wrap.appendChild(document.createTextNode(', '));
      // bold the lab lead, located by the ORCID-matched index
      if (i === work.lead_author_index) {
        wrap.appendChild(el('strong', null, name));
      } else {
        wrap.appendChild(document.createTextNode(name));
      }
    });
    return wrap;
  }

  function renderEntry(work) {
    const entry = el('article', 'pub-entry');
    const title = el('div', 'pub-title', work.title);
    // Flag preprints so visitors can tell them apart from published papers.
    if (work.type === 'preprint') {
      title.appendChild(el('span', 'pub-type-badge', 'Preprint'));
    }
    entry.appendChild(title);
    if ((work.authors || []).length) {
      entry.appendChild(renderAuthors(work));
    }
    if (work.venue) {
      entry.appendChild(el('div', 'pub-venue', work.venue));
    }
    const links = el('div', 'pub-links');
    if (work.doi_url) links.appendChild(link(work.doi_url, 'DOI'));
    if (work.openalex_url) links.appendChild(link(work.openalex_url, 'OpenAlex'));
    if (work.pdf_url) links.appendChild(link(work.pdf_url, 'PDF'));
    if (work.cited_by_count > 0) {
      links.appendChild(el('span', 'pub-cites', 'Cited by ' + work.cited_by_count));
    }
    if (links.childNodes.length) entry.appendChild(links);
    return entry;
  }

  function renderStats(works) {
    const years = works.map(function (w) { return w.year; }).filter(Boolean);
    const citations = works.reduce(function (sum, w) {
      return sum + (w.cited_by_count || 0);
    }, 0);
    const stats = [
      { num: String(works.length), label: 'Publications' },
      { num: String(citations), label: 'Citations' },
    ];
    if (years.length) {
      const min = Math.min.apply(null, years);
      const max = Math.max.apply(null, years);
      stats.push({ num: min === max ? String(max) : min + '–' + max, label: 'Years active' });
    }
    const wrap = el('div', 'pub-stats');
    stats.forEach(function (s) {
      const card = el('div', 'pub-stat');
      card.appendChild(el('span', 'pub-stat-num', s.num));
      card.appendChild(el('span', 'pub-stat-label', s.label));
      wrap.appendChild(card);
    });
    return wrap;
  }

  function render(data) {
    const works = data.works || [];
    container.textContent = '';

    if (!works.length) {
      container.appendChild(el('p', 'pub-status', 'No publications found.'));
      return;
    }

    container.appendChild(renderStats(works));

    // group by year — works arrive newest-first, so groups stay ordered
    const groups = [];
    let current = null;
    works.forEach(function (w) {
      const year = w.year || 'Other';
      if (!current || current.year !== year) {
        current = { year: year, items: [] };
        groups.push(current);
      }
      current.items.push(w);
    });

    groups.forEach(function (group) {
      const section = el('section', 'pub-year-group');
      section.appendChild(el('h2', 'pub-year', String(group.year)));
      const list = el('div', 'pub-list');
      group.items.forEach(function (w) {
        list.appendChild(renderEntry(w));
      });
      section.appendChild(list);
      container.appendChild(section);
    });
  }

  function setRefreshNote(data) {
    if (!refreshNote) return;
    let text = 'Auto-updated from OpenAlex';
    if (data && data.generated) {
      const d = new Date(data.generated);
      if (!isNaN(d.getTime())) {
        text += ' · last refreshed ' + d.toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
      }
    }
    refreshNote.textContent = text;
  }

  fetch(DATA_URL)
    .then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    })
    .then(function (data) {
      render(data);
      setRefreshNote(data);
    })
    .catch(function (err) {
      container.textContent = '';
      container.appendChild(el('p', 'pub-status',
        'The publications list is temporarily unavailable. Please check back shortly.'));
      console.error('publications load failed:', err);
    });
})();
