/* app.js — SPA shell: hash-based tab routing, theme, sidebar, nav, search, copy buttons, hljs
   Loaded with defer — DOM is fully parsed when this runs. */

var TABS = {
  'java':   { file: 'content/java.html',   footer: 'AlgoCode — Java Reference Guide',   search: 'Search collections, methods, data structures...' },
  'golang': { file: 'content/golang.html', footer: 'AlgoCode — Golang Reference Guide', search: 'Search Go slices, maps, algorithms...' },
  'cpp':     { file: 'content/cpp.html',     footer: 'AlgoCode — C++ Reference Guide',     search: 'Search STL, vectors, algorithms...' },
  'python3': { file: 'content/python3.html', footer: 'AlgoCode — Python3 Reference Guide', search: 'Search lists, dicts, heapq, algorithms...' }
};
var DEFAULT_TAB = 'java';
var contentEl = document.getElementById('content');
var footerEl = document.getElementById('footer');
var navLinksEl = document.getElementById('navLinks');
var searchInput = document.getElementById('searchInput');
var pageCache = {};
var currentTab = null;

/* ── Sidebar toggle (mobile) ── */
var sidebarEl = document.getElementById('sidebar');
var overlayEl = document.getElementById('sidebarOverlay');
var hamburgerBtn = document.getElementById('hamburger');
var sidebarCloseBtn = document.getElementById('sidebarClose');

function openSidebar() {
  if (sidebarEl) sidebarEl.classList.add('open');
  if (overlayEl) overlayEl.classList.add('active');
  if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  if (sidebarEl) sidebarEl.classList.remove('open');
  if (overlayEl) overlayEl.classList.remove('active');
  if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (hamburgerBtn) hamburgerBtn.addEventListener('click', function () {
  if (sidebarEl && sidebarEl.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
if (overlayEl) overlayEl.addEventListener('click', closeSidebar);

/* ── Theme toggle ── */
var toggle = document.getElementById('themeToggle');
var hljsLink = document.getElementById('hljs-theme');
if (toggle) {
  toggle.innerHTML = '◐ Theme';
  toggle.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if (hljsLink) {
      hljsLink.href = next === 'light'
        ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
        : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    }
    try { localStorage.setItem('theme', next); } catch (e) { }
  });
}

/* ── Copy buttons on pre ── */
function bindCopyButtons() {
  if (!contentEl) return;
  contentEl.querySelectorAll('pre').forEach(function (pre) {
    if (pre.querySelector('.copy')) return;
    var b = document.createElement('button');
    b.className = 'copy';
    b.type = 'button';
    b.textContent = 'Copy';
    b.title = 'Copy code to clipboard';
    b.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var txt = code ? code.innerText : pre.innerText;
      var done = function () {
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy'; }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { fallback(txt); done(); });
      } else {
        fallback(txt);
        done();
      }
    });
    pre.appendChild(b);
  });
}

function fallback(t) {
  var a = document.createElement('textarea');
  a.value = t;
  document.body.appendChild(a);
  a.select();
  try { document.execCommand('copy'); } catch (e) { }
  a.remove();
}

/* ── Nav links ── */
var BY_EXAMPLE = {
  'python3': { href: 'python-by-example.html', text: '📖 Python by Example' },
  'cpp':     { href: 'cpp-pointers-by-example.html', text: '📖 C++ Pointers by Example' }
};

function buildNavLinks() {
  if (!navLinksEl) return;
  navLinksEl.innerHTML = '';
  contentEl.querySelectorAll('.section-title').forEach(function (sec) {
    if (!sec.id) return;
    var a = document.createElement('a');
    a.className = 'nav-link';
    a.href = '#' + sec.id;
    a.textContent = sec.textContent.trim();
    a.addEventListener('click', function (e) {
      e.preventDefault();
      closeSidebar();
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    navLinksEl.appendChild(a);
  });
  var extra = BY_EXAMPLE[currentTab];
  if (extra) {
    var a = document.createElement('a');
    a.className = 'nav-link';
    a.href = extra.href;
    a.textContent = extra.text;
    a.style.color = 'var(--accent)';
    a.style.fontWeight = '600';
    navLinksEl.appendChild(a);
  }
  updateActiveNavLink();
}

var NAV_OFFSET = 90;

function updateActiveNavLink() {
  if (!navLinksEl) return;
  var sections = contentEl.querySelectorAll('.section-title[id]');
  var links = navLinksEl.querySelectorAll('.nav-link');
  if (!sections.length) return;
  var currentId = sections[0].id;
  sections.forEach(function (sec) {
    if (sec.getBoundingClientRect().top <= NAV_OFFSET) currentId = sec.id;
  });
  links.forEach(function (link) {
    link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
  });
}

/* ── Scroll-to-top ── */
var scrollTopBtn = document.getElementById('scrollTop');
if (scrollTopBtn) {
  var scrollTick = false;
  window.addEventListener('scroll', function () {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    if (!scrollTick) {
      requestAnimationFrame(function () { updateActiveNavLink(); scrollTick = false; });
      scrollTick = true;
    }
  }, { passive: true });
  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── Search (re-bound on each tab switch) ── */
var searchTimer = 0;
function bindSearch() {
  if (!searchInput) return;
  var clone = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(clone, searchInput);
  searchInput = clone;
  searchInput.value = '';

  var filterFn;
  if (contentEl.querySelector('.card')) {
    filterFn = function (query) {
      contentEl.querySelectorAll('.card').forEach(function (card) {
        card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
      contentEl.querySelectorAll('.section-title').forEach(function (sec) {
        var next = sec.nextElementSibling;
        var hasVisible = false;
        var nonCards = [];
        while (next && !next.classList.contains('section-title')) {
          if (next.classList.contains('card')) {
            if (next.style.display !== 'none') hasVisible = true;
          } else {
            nonCards.push(next);
          }
          next = next.nextElementSibling;
        }
        sec.style.display = hasVisible ? '' : 'none';
        nonCards.forEach(function (el) {
          el.style.display = hasVisible ? '' : 'none';
        });
      });
    };
  } else {
    filterFn = function (query) {
      contentEl.querySelectorAll('tbody tr').forEach(function (row) {
        if (row.classList.contains('grp')) return;
        row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
      contentEl.querySelectorAll('.section-title').forEach(function (sec) {
        var next = sec.nextElementSibling;
        var hasVisible = false;
        var nonCards = [];
        while (next && !next.classList.contains('section-title')) {
          if (next.tagName === 'TABLE' || next.classList.contains('ctable')) {
            var rows = next.querySelectorAll('tbody tr:not(.grp)');
            var tableHasVisible = Array.prototype.some.call(rows, function (r) {
              return r.style.display !== 'none';
            });
            if (tableHasVisible) hasVisible = true;
          } else {
            nonCards.push(next);
          }
          next = next.nextElementSibling;
        }
        sec.style.display = hasVisible ? '' : 'none';
        nonCards.forEach(function (el) {
          el.style.display = hasVisible ? '' : 'none';
        });
      });
    };
  }

  searchInput.addEventListener('input', function () {
    var query = this.value.toLowerCase().trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      if (!query) {
        contentEl.querySelectorAll('.card, tbody tr, .section-title, .section-intro, .ctable, p, div').forEach(function (el) {
          if (el.classList.contains('tab-content') && !el.classList.contains('active')) return;
          el.style.display = '';
        });
        return;
      }
      filterFn(query);
    }, 150);
  });
}

/* ── Tab routing ── */
function getTabFromHash() {
  var hash = (location.hash || '').replace('#', '').toLowerCase();
  return TABS[hash] ? hash : DEFAULT_TAB;
}

function updateTabButtons(tab) {
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
}

function loadTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  updateTabButtons(tab);

  var meta = TABS[tab];
  if (footerEl) footerEl.textContent = meta.footer;
  if (searchInput) searchInput.placeholder = meta.search;

  if (pageCache[tab]) {
    renderContent(pageCache[tab]);
    return;
  }

  contentEl.innerHTML = '<div style="padding: 48px; text-align: center; color: var(--muted); font: 15px var(--sans);">Loading ' + tab + ' reference…</div>';

  fetch(meta.file)
    .then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + meta.file);
      return r.text();
    })
    .then(function (content) {
      pageCache[tab] = content;
      renderContent(content);
      prefetchOtherTabs();
    })
    .catch(function (err) {
      contentEl.innerHTML = '<div style="padding: 48px; text-align: center; color: var(--danger);">' + err.message + '</div>';
    });
}

function renderContent(html) {
  contentEl.innerHTML = '<div class="main">' + html + '</div>';
  buildNavLinks();
  bindSearch();
  bindCopyButtons();

  if (typeof hljs !== 'undefined') {
    contentEl.querySelectorAll('pre code').forEach(function (block) {
      hljs.highlightElement(block);
    });
    var lang = currentTab === 'golang' ? 'language-go' : currentTab === 'cpp' ? 'language-cpp' : currentTab === 'python3' ? 'language-python' : 'language-java';
    if (lang) {
      contentEl.querySelectorAll('.ctable td code, .section-intro code').forEach(function (el) {
        el.classList.add(lang);
        hljs.highlightElement(el);
      });
    }
  }
  window.scrollTo(0, 0);
}

/* ── Tab click handling ── */
document.querySelectorAll('.tab-btn[data-tab]').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    var tab = this.getAttribute('data-tab');
    location.hash = tab;
  });
});

/* ── Hash change listener ── */
window.addEventListener('hashchange', function () {
  loadTab(getTabFromHash());
});

/* ── Prefetch other tabs during idle ── */
function prefetchOtherTabs() {
  var idle = window.requestIdleCallback || function (cb) { setTimeout(cb, 200); };
  Object.keys(TABS).forEach(function (tab) {
    if (pageCache[tab]) return;
    idle(function () {
      if (pageCache[tab]) return;
      fetch(TABS[tab].file).then(function (r) { return r.text(); }).then(function (content) {
        pageCache[tab] = content;
      });
    });
  });
}

/* ── Initial load ── */
if (!location.hash) location.hash = DEFAULT_TAB;
loadTab(getTabFromHash());
