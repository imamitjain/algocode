/* app.js — SPA shell: hash-based tab routing, theme, nav, search, hljs
   Loaded with defer — DOM is fully parsed when this runs. */

var TABS = {
  'code-tricks': { file: 'content/code-tricks.html', footer: 'AlgoCode — Code Tricks', search: 'Search tricks, patterns...' },
  'edge-cases':  { file: 'content/edge-cases.html',  footer: 'AlgoCode — Edge Cases',  search: 'Search edge cases, gotchas...' },
  'go-vs-cpp':   { file: 'content/go-vs-cpp.html',   footer: 'AlgoCode — Go vs C++',   search: 'Search containers, algorithms, strings...' },
  'java': { file: 'content/java.html', footer: 'Java Collections', search: 'Search collections, methods, data structures...' }
};
var DEFAULT_TAB = 'java';
var contentEl = document.getElementById('content');
var footerEl = document.getElementById('footer');
var navLinksEl = document.getElementById('navLinks');
var searchInput = document.getElementById('searchInput');
var pageCache = {};
var currentTab = null;

/* ── Theme toggle ── */
var toggle = document.getElementById('themeToggle');
var hljsLink = document.getElementById('hljs-theme');
if (toggle) {
  toggle.textContent = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? '☀️' : '🌙';
  toggle.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    toggle.textContent = next === 'dark' ? '☀️' : '🌙';
    if (hljsLink) hljsLink.href = next === 'light'
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    localStorage.setItem('theme', next);
  });
}

/* ── Nav pills ── */
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
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    navLinksEl.appendChild(a);
  });
  updateActiveNavLink();
}

function updateActiveNavLink() {
  if (!navLinksEl) return;
  var sections = contentEl.querySelectorAll('.section-title[id]');
  var links = navLinksEl.querySelectorAll('.nav-link');
  if (!sections.length) return;
  var currentId = sections[0].id;
  var offset = 120;
  sections.forEach(function (sec) {
    if (sec.getBoundingClientRect().top <= offset) currentId = sec.id;
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
        while (next && !next.classList.contains('section-title')) {
          if (next.classList.contains('card') && next.style.display !== 'none') hasVisible = true;
          next = next.nextElementSibling;
        }
        sec.style.display = hasVisible ? '' : 'none';
      });
    };
  } else if (contentEl.querySelector('.cmp-table')) {
    filterFn = function (query) {
      contentEl.querySelectorAll('.cmp-table').forEach(function (table) {
        var anyVisible = false;
        table.querySelectorAll('tbody tr').forEach(function (row) {
          var match = row.textContent.toLowerCase().includes(query);
          row.style.display = match ? '' : 'none';
          if (match) anyVisible = true;
        });
        var section = table.previousElementSibling;
        if (section && section.classList.contains('section-title')) {
          section.style.display = anyVisible ? '' : 'none';
        }
        table.style.display = anyVisible ? '' : 'none';
      });
    };
  }

  if (filterFn) {
    searchInput.addEventListener('input', function () {
      var query = this.value.toLowerCase();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { filterFn(query); }, 150);
    });
  }
}

/* ── Tab routing ── */
function getTabFromHash() {
  var hash = location.hash.replace('#', '');
  return TABS[hash] ? hash : DEFAULT_TAB;
}

function updateActiveTab(tab) {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
}

function loadTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  var info = TABS[tab];

  updateActiveTab(tab);
  if (footerEl) footerEl.textContent = info.footer;
  if (searchInput) searchInput.placeholder = info.search;

  if (pageCache[tab]) {
    renderContent(pageCache[tab]);
    return;
  }

  fetch(info.file)
    .then(function (r) { return r.text(); })
    .then(function (content) {
      pageCache[tab] = content;
      renderContent(content);
      prefetchOtherTabs();
    });
}

function renderContent(html) {
  contentEl.innerHTML = '<div class="main">' + html + '</div>';
  buildNavLinks();
  bindSearch();
  if (typeof hljs !== 'undefined') {
    contentEl.querySelectorAll('pre code').forEach(function (block) {
      hljs.highlightElement(block);
    });
    contentEl.querySelectorAll('.ctable td code, .section-intro code').forEach(function (el) {
      el.classList.add('language-java');
      hljs.highlightElement(el);
    });
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
