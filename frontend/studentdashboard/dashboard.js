/* =============================================================
  app.js – Single entry point for all dashboard views.
  Uses one DATA object, one state, and view-switching.
============================================================= */

function completionKey(type, id) {
  return `${type}:${id}`;
}

// Updated markDone function to fetch/update the database
async function markDone(type) {
  if (!state.currentItem) return;
  const id = state.currentItem.id;
  const key = completionKey(type, id);

  const btn = document.getElementById(type === 'material' ? 'mat-mark-btn' : 'quiz-mark-btn');

  // Disable button to prevent multiple rapid clicks
  btn.disabled = true;

  if (state.done.has(key)) {
    // SECOND CLICK: ask to undo
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to undo marking this as done?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, undo it!',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch(`/api/mark-undone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: DATA.profile.id,
              itemType: type,
              itemId: id
            })
          });

          state.done.delete(key);
          btn.textContent = 'Mark as done';
          btn.className = type === 'material' ? 'mark-done-btn dark' : 'mark-done-btn yellow';
          updateProgressForClass(state.currentClass);
        } catch (error) {
          console.error("Database error:", error);
          Swal.fire('Error', 'Could not update the database.', 'error');
        }
      }
      btn.disabled = false;
    });

  } else {
    // FIRST CLICK: mark as done immediately
    try {
      await fetch(`/api/mark-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DATA.profile.id,
          itemType: type,
          itemId: id
        })
      });

      state.done.add(key);
      btn.textContent = 'Marked as done ✓';
      btn.className = 'mark-done-btn done-state';
      updateProgressForClass(state.currentClass);
    } catch (error) {
      console.error("Database error:", error);
      Swal.fire('Error', 'Could not save to the database.', 'error');
    } finally {
      btn.disabled = false;
    }
  }
}

// ##################################################################
// SHARED DATA OBJECT - Add new entries here with team notice
// ##################################################################

const DATA = {
  profileLoaded: false,

  announcements: [
    { 
      main: 'Prof. Catherine Sorbito posted a new lesson', 
      sub: 'Check it out',
      timestamp: new Date('2026-05-07T09:30:00')
    },
    { 
      main: 'A new quiz was posted in your Web Dev Class', 
      sub: 'Due dates are important, complete your assignments today',
      timestamp: new Date('2026-05-06T14:15:00')
    }
  ],

  todos: [
    { title: 'Open learning material 1 in Web Development', due: 'June 12, 2026', dueDate: new Date('2026-06-12') },
    { title: 'Read Programming Module', due: 'June 12, 2026', dueDate: new Date('2026-06-12') },
    { title: 'Complete Java Progress', due: 'March 2, 2026', dueDate: new Date('2026-03-02') },
    { title: 'Answer Quiz 1', due: 'March 2, 2026', dueDate: new Date('2026-03-02') },
    { title: 'Submit Web Dev Activity 2', due: 'May 5, 2026', dueDate: new Date('2026-05-05') },
    { title: 'Watch Software Engineering Lecture', due: 'May 10, 2026', dueDate: new Date('2026-05-10') },
    { title: 'Review Data Structures Notes', due: 'May 15, 2026', dueDate: new Date('2026-05-15') },
    { title: 'Complete Quiz 2 in Web Dev', due: 'May 7, 2026', dueDate: new Date('2026-05-07') },
    { title: 'Read Software Engineering Module 2', due: 'May 8, 2026', dueDate: new Date('2026-05-08') },
    { title: 'Practice Data Structures Problems', due: 'May 12, 2026', dueDate: new Date('2026-05-12') }
  ],

  classes: [],
  classesLoaded: false,

  profile: {
    id: null,
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    role: ''
  }
};

// ##################################################################
// END SHARED DATA OBJECT
// ##################################################################



// ##################################################################
// SHARED: FETCH PROFILE - Gets logged-in user from localStorage
// ##################################################################

async function fetchProfile() {
  // Check localStorage for saved user data from login
  const savedUser = localStorage.getItem('eduhub_user');
  
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      DATA.profile.id = user.id || null;
      DATA.profile.firstName = user.first_name || user.username || 'Student';
      DATA.profile.lastName = user.last_name || '';
      DATA.profile.username = user.username || 'student';
      DATA.profile.email = user.email || '';
      DATA.profile.role = user.role || 'student';
      DATA.profileLoaded = true;
      console.log('Profile loaded from localStorage:', DATA.profile);
      return;
    } catch (e) {
      console.error('Error parsing saved user:', e);
    }
  }
  
  // Fallback: try API (if you add session support later)
  try {
    const response = await fetch('/api/profile');
    if (response.ok) {
      const user = await response.json();
      DATA.profile.id = user.id || null;
      DATA.profile.firstName = user.first_name || user.username || 'Student';
      DATA.profile.lastName = user.last_name || '';
      DATA.profile.username = user.username || 'student';
      DATA.profile.email = user.email || '';
      DATA.profile.role = user.role || 'student';
      DATA.profileLoaded = true;
      return;
    }
  } catch (e) {
    console.error('Profile API not available yet');
  }
  
  // Last resort: keep defaults
  DATA.profileLoaded = true;
}

// ##################################################################
// END SHARED: FETCH PROFILE
// ##################################################################



// ##################################################################
// FETCH COMPLETIONS FROM DB
// ##################################################################

async function fetchCompletions() {
  if (!DATA.profile.id) return;

  try {
    const res = await fetch(`/api/completions?userId=${DATA.profile.id}`);
    if (!res.ok) return;

    const items = await res.json();
    state.done.clear();
    items.forEach(item => {
      state.done.add(completionKey(item.item_type, item.item_id));
    });
  } catch (err) {
    console.error('fetchCompletions error:', err);
  }
}

// ##################################################################
// END FETCH COMPLETIONS
// ##################################################################



// ##################################################################
// SHARED STATE
// ##################################################################

const state = {
  currentView: 'home',
  currentClass: null,
  currentItem: null,
  currentType: null,
  done: new Set()
};

function updateAllHeadings() {
  const firstName = DATA.profile.firstName || DATA.profile.username || 'Student';
  
  // Update all page headings to include the user's first name
  document.querySelectorAll('.page-heading').forEach(heading => {
    // If heading ends with "courses!" add the name after it
    if (heading.textContent.includes('Continue learning with your courses')) {
      heading.textContent = `Continue learning with your courses, ${firstName}!`;
    }
  });
}

// ##################################################################
// END SHARED STATE
// ##################################################################



// ##################################################################
// SHARED: VIEW SWITCHING
// ##################################################################

const allViews = document.querySelectorAll('.page-body');

function showView(viewId) {
  allViews.forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + viewId).classList.remove('hidden');
  state.currentView = viewId;
}

// ##################################################################
// END SHARED: VIEW SWITCHING
// ##################################################################



// ##################################################################
// SHARED: SIDEBAR NAVIGATION
// ##################################################################

function setActiveNav(el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', async function (e) {
    e.preventDefault();
    setActiveNav(this);
    const view = this.getAttribute('data-view');
    if (!view) return;

    switch (view) {
      case 'home': await renderHome(); showView('home'); break;
      case 'classes': await renderClasses(); showView('classes'); break;
      case 'progress': renderProgress(); showView('progress'); break;
      case 'todo': renderTodo(); showView('todo'); break;
      case 'profile': renderProfile(); showView('profile'); break;
    }
  });
});

// ##################################################################
// END SHARED: SIDEBAR NAVIGATION
// ##################################################################



// #################################################################
// SECTION: HOME SCREEN FUNCTIONALITY
// ASSIGNED TO: Sales Animal
// Handles: Welcome message with username, Announcements, Scrollable To-Do List from classes
// #################################################################

async function renderHome() {
  // ===== Fetch profile if not loaded yet =====
  if (!DATA.profileLoaded) {
    await fetchProfile();
  }

  updateAllHeadings(); 

  // ===== Fetch classes if not loaded yet (with error handling) =====
  if (!DATA.classesLoaded) {
    try {
      await fetchClasses();
    } catch (error) {
      console.error('Failed to fetch classes for home view:', error);
      // Continue rendering even if classes fail to load
    }
  }

  // ===== Welcome Heading with logged-in username =====
  const welcomeHeading = document.querySelector('#view-home .welcome-heading');
  if (welcomeHeading) {
    const displayName = DATA.profile.firstName || DATA.profile.username || 'Student';
    welcomeHeading.textContent = `Welcome, ${displayName}!`;
  }

  // ===== Announcements Section =====
  const annSection = document.getElementById('announcements-section');
  annSection.innerHTML = '<h2 class="section-title">Announcements</h2>';

  // Create scrollable container for announcements
  const annScrollContainer = document.createElement('div');
  annScrollContainer.className = 'announcements-scroll-container';

  if (DATA.announcements.length === 0) {
    annScrollContainer.innerHTML = '<div class="announcement-empty">No announcements yet</div>';
  } else {
    DATA.announcements.forEach(a => {
      const card = document.createElement('div');
      card.className = 'announcement-card';
      
      // Format timestamp nicely
      const timestamp = a.timestamp ? formatAnnouncementTime(a.timestamp) : '';
      
      card.innerHTML = `
        <p class="announcement-main">${a.main}</p>
        <p class="announcement-sub">${a.sub}</p>
        ${timestamp ? `<p class="announcement-time">${timestamp}</p>` : ''}
      `;
      annScrollContainer.appendChild(card);
    });
  }

  annSection.appendChild(annScrollContainer);

  // ===== Scrollable To-Do List from Classes =====
  const todoSection = document.getElementById('todo-section');
  todoSection.innerHTML = '<h2 class="section-title">To Do List</h2>';

  // Get current week range (Monday 00:00 to Sunday 23:59)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Collect all pending quizzes/assignments due this week
  const pendingItems = [];
  
  // Only process classes if they loaded successfully
  if (DATA.classes && DATA.classes.length > 0) {
    DATA.classes.forEach(cls => {
      if (cls.quizzes && cls.quizzes.length > 0) {
        cls.quizzes.forEach(quiz => {
          if (state.done.has(completionKey('quiz', quiz.id))) return;
          const dueDate = quiz.dueDate ? new Date(quiz.dueDate) : null;
          if (!dueDate || isNaN(dueDate.getTime())) return;
          if (dueDate >= monday && dueDate <= sunday) {
            pendingItems.push({
              id: quiz.id,
              title: quiz.title,
              dueDate: quiz.dueDate,
              className: cls.title
            });
          }
        });
      }
    });
  }

  // Sort by due date (closest first)
  pendingItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Create scrollable container
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'todo-scroll-container';

  if (pendingItems.length === 0) {
    scrollContainer.innerHTML = '<div class="todo-empty">No pending tasks this week</div>';
  } else {
    pendingItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'todo-card';
      card.innerHTML = `
        <p class="todo-title">${item.title}</p>
        <p class="todo-class">${item.className}</p>
        <p class="todo-due">Due: ${formatDueDate(item.dueDate) || 'No due date'}</p>
      `;
      scrollContainer.appendChild(card);
    });
  }

  todoSection.appendChild(scrollContainer);
}

function formatAnnouncementTime(dateVal) {
  if (!dateVal) return null;
  
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Less than 1 hour ago
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  
  // Less than 24 hours ago
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  
  // Less than 7 days ago
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  // More than 7 days ago - show date
  const phTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));
  return phTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// #################################################################
// END SECTION: HOME SCREEN FUNCTIONALITY (Sales Animal)
// #################################################################



// #################################################################
// SECTION: CLASSES FUNCTIONALITY
// #################################################################

function normalizeClass(raw) {
  return {
    id: raw.id,
    title: raw.title || raw.name || 'Untitled Class',
    professor: raw.professor || raw.teacher_name || raw.instructor || 'Unknown Professor',

    materials: (raw.materials || raw.lessons || []).map(m => ({
      id: m.id,
      title: m.title || m.name || 'Untitled Material',
      description: m.description || '',
      pdfUrl: m.pdfUrl || m.pdf_url || '#',
      dueDate: m.dueDate || m.due_date || null
    })),

    quizzes: (raw.quizzes || raw.assignments || []).map(q => ({
      id: q.id,
      title: q.title || q.name || 'Untitled Quiz',
      description: q.description || '',
      link: q.link || q.url || '#',
      linkLabel: q.linkLabel || q.link_label || 'Open Quiz',
      dueDate: q.dueDate || q.due_date || null,
      instructions: q.instructions || []
    }))
  };
}

function formatDueDate(dateVal) {
  if (!dateVal) return null;

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;

  const phTime = new Date(d.getTime() + (8 * 60 * 60 * 1000));

  return phTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}

/** ---------- FETCH CLASSES ---------- */
async function fetchClasses() {
  try {
    const response = await fetch('/api/classes');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const json = await response.json();

    const raw = Array.isArray(json)
      ? json
      : json.data || json.classes || json.result || [];

    DATA.classes = raw.map(normalizeClass);
    DATA.classesLoaded = true;
  } catch (error) {
    console.error('[fetchClasses] Error:', error);
    DATA.classes = [];
    DATA.classesLoaded = false;
  }
}

/** ---------- RENDER: CLASSES GRID ---------- */
async function renderClasses() {
  const grid = document.getElementById('classes-grid');

  if (!DATA.classesLoaded) {
    grid.innerHTML = '<p class="classes-loading">Loading classes...</p>';
    await fetchClasses();
  }

  grid.innerHTML = '';

  if (DATA.classes.length === 0) {
    grid.innerHTML = '<p class="classes-empty">No classes found. Please check your connection or contact your administrator.</p>';
    return;
  }

  DATA.classes.forEach(cls => {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.innerHTML = `<p class="class-card-title">${cls.title}</p><p class="class-card-prof">${cls.professor}</p>`;
    card.addEventListener('click', () => openClassDetail(cls));
    grid.appendChild(card);
  });
}

/** ---------- RENDER: CLASS DETAIL ---------- */
function openClassDetail(cls) {
  updateAllHeadings(); 
  state.currentClass = cls;
  document.getElementById('detail-class-name').textContent = cls.title;

  const matList = document.getElementById('materials-list');
  matList.innerHTML = '';
  cls.materials.forEach(mat => {
    const el = document.createElement('div');
    const key = completionKey('material', mat.id);
    el.className = 'material-item' + (state.done.has(key) ? ' done' : '');
    el.textContent = mat.title;
    el.addEventListener('click', () => openMaterialDetail(mat, cls.title));
    matList.appendChild(el);
  });

  document.getElementById('quizzes-label').textContent = cls.title + ' Quizzes';
  const quizList = document.getElementById('quizzes-list');
  quizList.innerHTML = '';
  cls.quizzes.forEach(quiz => {
    const el = document.createElement('div');
    const key = completionKey('quiz', quiz.id);
    el.className = 'quiz-item' + (state.done.has(key) ? ' done' : '');
    el.textContent = quiz.title;
    el.addEventListener('click', () => openQuizDetail(quiz, cls.title));
    quizList.appendChild(el);
  });

  showView('class-detail');
}

/** ---------- RENDER: MATERIAL DETAIL ---------- */
function openMaterialDetail(mat, className) {
  updateAllHeadings(); 
  state.currentItem = mat;
  state.currentType = 'material';

  document.getElementById('mat-class-name').textContent = className;
  document.getElementById('mat-banner').textContent = mat.title;
  document.getElementById('mat-pdf-link').href = mat.pdfUrl;
  document.getElementById('mat-description').textContent = mat.description;

  const matDueEl = document.getElementById('mat-due-text');
  if (matDueEl) {
    matDueEl.textContent = mat.dueDate ? 'Due ' + formatDueDate(mat.dueDate) : '';
    matDueEl.style.display = mat.dueDate ? 'block' : 'none';
  }

  const btn = document.getElementById('mat-mark-btn');
  const key = completionKey('material', mat.id);
  if (state.done.has(key)) {
    btn.textContent = 'Marked as done ✓';
    btn.className = 'mark-done-btn done-state';
  } else {
    btn.textContent = 'Mark as done';
    btn.className = 'mark-done-btn dark';
  }

  btn.onclick = () => markDone('material');

  showView('material-detail');
}

/** ---------- RENDER: QUIZ DETAIL ---------- */
function openQuizDetail(quiz, className) {
  updateAllHeadings(); 
  state.currentItem = quiz;
  state.currentType = 'quiz';

  document.getElementById('quiz-class-name').textContent = className;
  document.getElementById('quiz-banner').textContent = quiz.title;
  document.getElementById('quiz-link').href = quiz.link;
  document.getElementById('quiz-link').textContent = quiz.linkLabel;
  document.getElementById('quiz-description').textContent = quiz.description;

  const quizDueEl = document.getElementById('quiz-due-text');
  if (quizDueEl) {
    quizDueEl.textContent = quiz.dueDate ? 'Due ' + formatDueDate(quiz.dueDate) : '';
    quizDueEl.style.display = quiz.dueDate ? 'block' : 'none';
  }

  const instrList = document.getElementById('quiz-instructions');
  instrList.innerHTML = '';
  if (quiz.instructions && quiz.instructions.length > 0) {
    quiz.instructions.forEach(instr => {
      const li = document.createElement('li');
      li.textContent = instr;
      instrList.appendChild(li);
    });
  }

  const btn = document.getElementById('quiz-mark-btn');
  const key = completionKey('quiz', quiz.id);
  if (btn) {
    if (state.done.has(key)) {
      btn.textContent = 'Marked as done ✓';
      btn.className = 'mark-done-btn done-state';
    } else {
      btn.textContent = 'Mark as done';
      btn.className = 'mark-done-btn yellow';
    }

    btn.onclick = () => markDone('quiz');
  }

  showView('quiz-detail');
}

// #################################################################
// END SECTION: CLASSES FUNCTIONALITY
// #################################################################



// #################################################################
// SECTION: TO DO LIST (DETAILED) FUNCTIONALITY
// #################################################################

function renderTodo() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assigned = DATA.todos.filter(t => t.dueDate >= today);
  const missing = DATA.todos.filter(t => t.dueDate < today);

  const assignedList = document.getElementById('todo-assigned-list');
  assignedList.innerHTML = '';
  if (assigned.length === 0) {
    assignedList.innerHTML = '<div class="todo-empty">No assigned tasks</div>';
  } else {
    assigned.forEach(t => {
      const card = document.createElement('div');
      card.className = 'todo-page-card';
      card.innerHTML = `<p class="todo-title">${t.title}</p><p class="todo-due">Due Date: ${formatDueDate(t.dueDate) || t.due}</p>`;
      assignedList.appendChild(card);
    });
  }

  const missingList = document.getElementById('todo-missing-list');
  missingList.innerHTML = '';
  if (missing.length === 0) {
    missingList.innerHTML = '<div class="todo-empty">No assigned tasks was missed</div>';
  } else {
    missing.forEach(t => {
      const card = document.createElement('div');
      card.className = 'todo-missing-card';
      card.innerHTML = `<p class="todo-title">${t.title}</p><p class="todo-due">Due Date: ${formatDueDate(t.dueDate) || t.due}</p>`;
      missingList.appendChild(card);
    });
  }
}

// #################################################################
// END SECTION: TO DO LIST (DETAILED) FUNCTIONALITY
// #################################################################



// #################################################################
// SECTION: PROGRESS FUNCTIONALITY (DB-BASED)
// #################################################################

function buildProgressFromClasses() {
  if (!DATA.classesLoaded) return [];

  return DATA.classes.map(cls => {
    const total = (cls.materials?.length || 0) + (cls.quizzes?.length || 0);
    const doneCount = [
      ...(cls.materials || []).map(m => completionKey('material', m.id)),
      ...(cls.quizzes || []).map(q => completionKey('quiz', q.id))
    ].filter(key => state.done.has(key)).length;

    return {
      classTitle: cls.title,
      completed: doneCount,
      total: total
    };
  });
}

function updateProgressForClass(cls) {
  if (state.currentView === 'progress') renderProgress();
}

function renderProgress() {
  const list = document.getElementById('progress-list');
  const summary = document.getElementById('progress-summary');
  list.innerHTML = '';

  const progressData = buildProgressFromClasses();

  const totals = progressData.reduce((acc, item) => {
    acc.completed += item.completed;
    acc.total += item.total;
    return acc;
  }, { completed: 0, total: 0 });

  const overallPct = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;

  summary.innerHTML = `
    <div class="progress-summary-card">
      <div>
        <p class="summary-label">Overall progress</p>
        <p class="summary-value">${overallPct}%</p>
      </div>
      <div class="summary-bar-track">
        <div class="summary-bar-fill" style="width: ${overallPct}%"></div>
      </div>
    </div>
  `;

  progressData.forEach(entry => {
    const pct = entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'progress-card';
    card.innerHTML = `
      <div class="progress-card-header">
        <span class="progress-card-name">${entry.classTitle}</span>
        <span class="progress-card-count">${entry.completed}/${entry.total}</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    list.appendChild(card);
  });
}

// #################################################################
// END SECTION: PROGRESS FUNCTIONALITY
// #################################################################



// #################################################################
// SECTION: PROFILE FUNCTIONALITY
// #################################################################

function renderProfile() {
  refreshProfileDisplay();
  showProfilePanel('main');
}

function refreshProfileDisplay() {
  const p = DATA.profile;
  document.getElementById('display-firstname').textContent = p.firstName;
  document.getElementById('display-lastname').textContent = p.lastName;
  document.getElementById('display-username').textContent = p.username;
  document.getElementById('display-email').textContent = p.email;
  document.getElementById('profile-username-display').textContent = p.username;
  document.getElementById('profile-role-display').textContent = p.role || 'student';
  document.getElementById('pw-username-display').value = p.username || 'student';

  // fill edit form
  document.getElementById('edit-firstname').value = p.firstName || '';
  document.getElementById('edit-lastname').value = p.lastName || '';
  document.getElementById('edit-username').value = p.username || '';
  document.getElementById('edit-email').value = p.email || '';
}

function showProfilePanel(panel) {
  document.getElementById('profile-main').style.display = (panel === 'main') ? 'block' : 'none';
  document.getElementById('profile-edit-info').style.display = (panel === 'edit-info') ? 'block' : 'none';
  document.getElementById('profile-change-password').style.display = (panel === 'change-password') ? 'block' : 'none';
}

// profile buttons
// profile buttons
// profile buttons
// profile buttons
document.addEventListener('click', async (e) => {
  if (e.target.id === 'btn-edit-profile') {
    showProfilePanel('edit-info');
  }

  if (e.target.id === 'btn-change-password') {
    showProfilePanel('change-password');
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
    if (document.getElementById('pw-verification-code')) {
      document.getElementById('pw-verification-code').value = '';
    }
    if (document.getElementById('verification-code-section')) {
      document.getElementById('verification-code-section').style.display = 'none';
    }
    if (document.getElementById('btn-send-code')) {
      document.getElementById('btn-send-code').style.display = 'block';
    }
    document.getElementById('btn-save-password').style.display = 'none';
  }

  if (e.target.id === 'btn-send-code') {
    try {
      const response = await fetch('/api/send-change-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DATA.profile.id })
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire('Code Sent', 'A verification code has been sent to your email.', 'success');
        document.getElementById('verification-code-section').style.display = 'block';
        document.getElementById('btn-send-code').style.display = 'none';
        document.getElementById('btn-save-password').style.display = 'block';
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Could not connect to server.', 'error');
    }
  }

  if (e.target.id === 'btn-cancel-edit') {
    showProfilePanel('main');
  }

  if (e.target.id === 'btn-cancel-password') {
    showProfilePanel('main');
  }

  if (e.target.id === 'btn-save-profile') {
    const updated = {
      userId: DATA.profile.id,
      firstName: document.getElementById('edit-firstname').value.trim(),
      lastName: document.getElementById('edit-lastname').value.trim(),
      username: document.getElementById('edit-username').value.trim(),
      email: document.getElementById('edit-email').value.trim()
    };

    if (!updated.firstName || !updated.lastName || !updated.username || !updated.email) {
      Swal.fire('Missing', 'All fields are required.', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      const data = await response.json();

      if (response.ok) {
        const savedUser = {
          id: updated.userId,
          first_name: updated.firstName,
          last_name: updated.lastName,
          username: updated.username,
          email: updated.email,
          role: DATA.profile.role || 'student'
        };
        localStorage.setItem('eduhub_user', JSON.stringify(savedUser));

        Swal.fire('Saved', 'Your profile was updated.', 'success');
        await fetchProfile();
        refreshProfileDisplay();
        showProfilePanel('main');
      } else {
        Swal.fire('Error', data.message || 'Failed to update profile.', 'error');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Swal.fire('Error', 'Could not connect to server.', 'error');
    }
  }

  if (e.target.id === 'btn-save-password') {
    const code = document.getElementById('pw-verification-code').value.trim();
    console.log('Sending code:', code); //yther
    const newPw = document.getElementById('pw-new').value.trim();
    const confirm = document.getElementById('pw-confirm').value.trim();

    if (!code || !newPw || !confirm) {
      Swal.fire('Missing', 'All fields are required.', 'warning');
      return;
    }
    if (code.length !== 6) {
      Swal.fire('Invalid', 'Please enter the 6-digit verification code.', 'warning');
      return;
    }
    if (newPw !== confirm) {
      Swal.fire('Mismatch', 'New passwords do not match.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DATA.profile.id,
          code: code,
          newPassword: newPw
        })
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire('Updated', 'Password changed successfully.', 'success');
        document.getElementById('pw-new').value = '';
        document.getElementById('pw-confirm').value = '';
        document.getElementById('pw-verification-code').value = '';
        showProfilePanel('main');
      } else {
        Swal.fire('Error', data.message || 'Failed to change password.', 'error');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Swal.fire('Error', 'Could not connect to server.', 'error');
    }
  }

  // ===== LOGOUT BUTTON =====
  if (e.target.id === 'btn-logout') {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('eduhub_user');
        sessionStorage.clear();
        
        Swal.fire({
          title: 'Logged out',
          text: 'You have been logged out successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          window.location.href = '/login/login.html';
        });
      }
    });
  }
});

// #################################################################
// END SECTION: PROFILE FUNCTIONALITY
// #################################################################



// #################################################################
// INITIALIZATION
// #################################################################

(async function init() {
  try {
    await fetchProfile();
  } catch (error) {
    console.error('Profile fetch failed:', error);
  }
  
  try {
    await fetchClasses();
  } catch (error) {
    console.error('Classes fetch failed:', error);
  }
  
  try {
    await fetchCompletions();
  } catch (error) {
    console.error('Completions fetch failed:', error);
  }

  const homeNav = document.querySelector('.nav-item[data-view="home"]');
  if (homeNav) setActiveNav(homeNav);
  await renderHome();
  showView('home');
})();

// #################################################################
// END INITIALIZATION
// #################################################################