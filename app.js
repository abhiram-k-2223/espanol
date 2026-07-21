const UNIT_NAMES = {
  1: 'Nouns, Articles & Basics',
  2: 'Ser, Estar & Essential Verbs',
  3: 'Stem-Changing & Comparisons',
  4: 'Object Pronouns & Progressive',
  5: 'Advanced Verbs & Por/Para',
  6: 'Preterite & Imperfect',
  7: 'Subjunctive & Adverbs',
  8: 'Relative Pronouns & Commands',
  9: 'Perfect Tenses & Conditional'
};

let lessons = [];
let activeLessonId = null;
let activeUnit = null;
let searchQuery = '';

const $ = id => document.getElementById(id);
const lessonView = $('lessonView');
const loading = $('loading');
const sidebar = $('sidebar');
const overlay = $('overlay');
const unitList = $('unitList');
const search = $('search');

async function init() {
  try {
    const resp = await fetch('lessons.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    lessons = data.lessons;

    hash = location.hash.slice(1);
    const target = hash ? lessons.find(l => l.slug === hash || String(l.id) === hash) : null;

    renderSidebar();
    selectLesson(target ? target.id : lessons[0].id);

    loading.remove();
    lessonView.hidden = false;
    search.focus();
  } catch (err) {
    console.error(err);
    loading.remove();
  }
}

function renderSidebar() {
  const grouped = {};
  for (const l of lessons) {
    if (!grouped[l.unit]) grouped[l.unit] = [];
    grouped[l.unit].push(l);
  }

  let html = '';
  const units = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  for (const u of units) {
    const list = grouped[u];
    const name = UNIT_NAMES[u] || `Unit ${u}`;
    const isOpen = activeUnit === null || activeUnit === u;
    html += `
      <div class="unit-section" data-unit="${u}">
        <div class="unit-header" data-unit="${u}">
          <span class="unit-name">${name}</span>
          <span class="unit-count">${list.length}</span>
        </div>
        <div class="unit-lessons" style="display:${isOpen ? 'block' : 'none'}">
          ${list.map(l => `
            <a class="lesson-link${l.id === activeLessonId ? ' active' : ''}" data-id="${l.id}">
              <span class="lesson-num">${l.id}</span>${l.title}
            </a>
          `).join('')}
        </div>
      </div>`;
  }
  unitList.innerHTML = html;

  unitList.querySelectorAll('.unit-header').forEach(el => {
    el.addEventListener('click', () => {
      const section = el.closest('.unit-section');
      const body = section.querySelector('.unit-lessons');
      const isOpen = body.style.display !== 'none';
      if (isOpen) {
        body.style.display = 'none';
      } else {
        body.style.display = 'block';
      }
    });
  });

  unitList.querySelectorAll('.lesson-link').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.id);
      selectLesson(id);
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
}

function selectLesson(id) {
  const lesson = lessons.find(l => l.id === id);
  if (!lesson) return;

  activeLessonId = id;
  activeUnit = lesson.unit;

  lessonView.hidden = false;

  $('lessonBadge').textContent = lesson.id;
  $('lessonUnitTag').textContent = UNIT_NAMES[lesson.unit] || `Unit ${lesson.unit}`;
  $('lessonTitle').textContent = lesson.title;
  $('lessonBody').innerHTML = renderContent(lesson.content);

  document.title = `${lesson.title} · Abhiram Grammar`;
  location.hash = lesson.slug;

  // Update sidebar active state
  unitList.querySelectorAll('.lesson-link').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.id) === id);
  });

  // Update prev/next buttons
  const idx = lessons.findIndex(l => l.id === id);
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];
  $('prevBtn').disabled = !prev;
  $('prevBtn').onclick = prev ? () => selectLesson(prev.id) : null;
  $('nextBtn').disabled = !next;
  $('nextBtn').onclick = next ? () => selectLesson(next.id) : null;

  // Scroll main to top
  $('main').scrollTop = 0;
}

function renderContent(text) {
  if (!text) return '<p class="text-dim">No content available.</p>';

  let html = text;

  // Escape HTML angle brackets
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // Bold+italic, bold, italic (in that order)
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Blockquotes: &gt; text
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Tables: consecutive lines starting with |
  html = html.replace(/(?:^\| .+(?:\n|$))+/gm, function(match) {
    const lines = match.replace(/\n$/, '').split('\n');
    const rows = lines.map(line => {
      const inner = line.replace(/^\| /, '').replace(/ \|?$/, '');
      return inner.split(' | ').map(c => c.trim());
    });
    if (!rows.length) return '';
    const hasHeader = rows[0][0].indexOf('<strong>') !== 0;
    let out = '<table>';
    if (hasHeader) {
      out += '<thead><tr>' + rows[0].map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
      rows.shift();
    }
    if (rows.length) {
      out += '<tbody>';
      for (const row of rows) {
        out += '<tr>' + row.map(c => `<td>${c}</td>`).join('') + '</tr>';
      }
      out += '</tbody>';
    }
    return out + '</table>';
  });

  // Unordered lists: * item at line start
  html = html.replace(/(?:^\* .+(?:\n|$))+/gm, function(match) {
    const items = match.replace(/\n$/, '').split('\n');
    return '<ul>' + items.map(item => {
      return '<li>' + item.replace(/^\* /, '') + '</li>';
    }).join('') + '</ul>';
  });

  // Trim stray trailing markup artifacts
  html = html.replace(/\n\*$/, '').replace(/<br>\*$/, '').trim();

  // Paragraphs: double newlines are paragraph breaks
  const parts = html.split(/\n\n+/);
  html = parts.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<')) return p;
    p = p.replace(/\n/g, '<br>');
    return `<p>${p}</p>`;
  }).join('\n');

  return html;
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('open');
}

// ───── SEARCH ─────
let searchTimer;
search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(performSearch, 150);
});

function performSearch() {
  const q = search.value.trim().toLowerCase();
  searchQuery = q;

  unitList.querySelectorAll('.lesson-link').forEach(el => {
    const id = Number(el.dataset.id);
    const lesson = lessons.find(l => l.id === id);
    if (!q) {
      el.style.display = '';
      el.innerHTML = `<span class="lesson-num">${lesson.id}</span>${lesson.title}`;
    } else {
      const match = lesson.title.toLowerCase().includes(q);
      el.style.display = match ? '' : 'none';
      if (match) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const highlighted = lesson.title.replace(re, m => '<mark>' + m + '</mark>');
        el.innerHTML = `<span class="lesson-num">${lesson.id}</span>${highlighted}`;
      }
    }
  });
  // Hide empty unit sections
  unitList.querySelectorAll('.unit-section').forEach(section => {
    const visible = [...section.querySelectorAll('.lesson-link')].some(el => el.style.display !== 'none');
    section.style.display = (!q || visible) ? '' : 'none';
  });
}

// ───── UNIT FILTER BUTTON (opens sidebar on mobile) ─────
$('unitFilterBtn').addEventListener('click', () => {
  if (window.innerWidth <= 900) {
    openSidebar();
  } else {
    // On desktop, just scroll sidebar to active unit
    const active = unitList.querySelector('.lesson-link.active');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
});

$('sidebarClose').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (sidebar.classList.contains('open')) closeSidebar();
    else search.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    search.focus();
  }
});

init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
