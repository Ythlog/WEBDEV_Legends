/* =============================================================
  app.js – Single entry point for all dashboard views.
  Uses one DATA object, one state, and view-switching.
============================================================= */



// ##################################################################
// SHARED DATA OBJECT - Add new entries here with team notice
// ##################################################################

/** ---------- DATA (replace with API calls later) ---------- */
const DATA = {
  student: 'Biena',
  
  // ========== Announcements Data ==========
  announcements: [
    { main: 'Prof. Catherine Sorbito posted a new lesson', sub: 'Check it out' },
    { main: 'A new quiz was posted in your Web Dev Class', sub: 'Due dates are important, complete your assignments today' }
  ],
  
  // ========== Todos Data ==========
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
  
  // ========== Classes Data ==========
  classes: [],
  
  // ========== Progress Data ==========
  progress: [
    { classTitle: 'Web Development', completed: 4, total: 10 },
    { classTitle: 'Software Engineering', completed: 9, total: 10 },
    { classTitle: 'Data Structures', completed: 4, total: 7 }
  ],
  
  // ========== Profile Data ==========
  /* BACKEND HOOK – replace with API call to get user profile */
  profile: {
    firstName: 'Biena',
    lastName: 'Bahay',
    username: 'bienrose',
    email: 'bienarose@gmail.com'
  }
};

// ##################################################################
// END SHARED DATA OBJECT
// ##################################################################



// ##################################################################
// SHARED STATE - Add new state properties here with team notice
// ##################################################################

/** ---------- STATE ---------- */
const state = {
  currentView: 'home',
  currentClass: null,
  currentItem: null,
  currentType: null,
  done: new Set()
};

// ##################################################################
// END SHARED STATE
// ##################################################################



// ##################################################################
// SHARED: VIEW SWITCHING - DO NOT MODIFY WITHOUT TEAM DISCUSSION
// ##################################################################

/** ---------- VIEW SWITCHING ---------- */
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
// SHARED: SIDEBAR NAVIGATION - DO NOT MODIFY WITHOUT TEAM DISCUSSION
// ##################################################################

/** ---------- SIDEBAR NAVIGATION ---------- */
function setActiveNav(el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    setActiveNav(this);
    const view = this.getAttribute('data-view');
    if (!view) return;

    switch (view) {
      case 'home':     renderHome();     showView('home');     break;
      case 'classes':  renderClasses();  showView('classes');  break;
      case 'progress': renderProgress(); showView('progress'); break;
      case 'todo':     renderTodo();     showView('todo');     break;
      case 'profile':  renderProfile();  showView('profile');  break;
    }
  });
});

// ##################################################################
// END SHARED: SIDEBAR NAVIGATION
// ##################################################################



// #################################################################
// SECTION: HOME SCREEN FUNCTIONALITY
// ASSIGNED TO: Sales Animal
// Handles: Announcements display + Short To-Do List on home view
// #################################################################

/** ---------- RENDER: HOME ---------- */
function renderHome() {
  // ===== Announcements Section =====
  const annSection = document.getElementById('announcements-section');
  annSection.innerHTML = '<h2 class="section-title">Announcements</h2>';
  DATA.announcements.forEach(a => {
    const card = document.createElement('div');
    card.className = 'announcement-card';
    card.innerHTML = `<p class="announcement-main">${a.main}</p><p class="announcement-sub">${a.sub}</p>`;
    annSection.appendChild(card);
  });

  // ===== Short To-Do List Section =====
  const todoSection = document.getElementById('todo-section');
  todoSection.innerHTML = '<h2 class="section-title">To Do List</h2>';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  DATA.todos.filter(t => t.dueDate >= today).slice(0, 4).forEach(t => {
    const card = document.createElement('div');
    card.className = 'todo-card';
    card.innerHTML = `<p class="todo-title">${t.title}</p><p class="todo-due">Due Date: ${t.due}</p>`;
    todoSection.appendChild(card);
  });
}

// #################################################################
// END SECTION: HOME SCREEN FUNCTIONALITY (Sales Animal)
// #################################################################



// #################################################################
// SECTION: CLASSES FUNCTIONALITY
// ASSIGNED TO: Prima Donna
// Handles: Classes grid, Class detail, Material detail, Quiz detail
// #################################################################

/** ---------- RENDER: CLASSES GRID ---------- */
function renderClasses() {
  const grid = document.getElementById('classes-grid');
  grid.innerHTML = '';
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
  state.currentClass = cls;
  document.getElementById('detail-class-name').textContent = cls.title;

  // Materials list
  const matList = document.getElementById('materials-list');
  matList.innerHTML = '';
  cls.materials.forEach(mat => {
    const el = document.createElement('div');
    el.className = 'material-item' + (state.done.has(mat.id) ? ' done' : '');
    el.textContent = mat.title;
    el.addEventListener('click', () => openMaterialDetail(mat, cls.title));
    matList.appendChild(el);
  });

  // Quizzes list
  document.getElementById('quizzes-label').textContent = cls.title + ' Quizzes';
  const quizList = document.getElementById('quizzes-list');
  quizList.innerHTML = '';
  cls.quizzes.forEach(quiz => {
    const el = document.createElement('div');
    el.className = 'quiz-item' + (state.done.has(quiz.id) ? ' done' : '');
    el.textContent = quiz.title;
    el.addEventListener('click', () => openQuizDetail(quiz, cls.title));
    quizList.appendChild(el);
  });

  showView('class-detail');
}



/** ---------- RENDER: MATERIAL DETAIL ---------- */
function openMaterialDetail(mat, className) {
  state.currentItem = mat;
  state.currentType = 'material';

  document.getElementById('mat-class-name').textContent = className;
  document.getElementById('mat-banner').textContent = mat.title;
  document.getElementById('mat-pdf-link').href = mat.pdfUrl;
  document.getElementById('mat-description').textContent = mat.description;

  const btn = document.getElementById('mat-mark-btn');
  if (state.done.has(mat.id)) {
    btn.textContent = 'Marked as done ✓';
    btn.className = 'mark-done-btn done-state';
  } else {
    btn.textContent = 'Mark as done';
    btn.className = 'mark-done-btn dark';
  }

  showView('material-detail');
}



/** ---------- RENDER: QUIZ DETAIL ---------- */
function openQuizDetail(quiz, className) {
  state.currentItem = quiz;
  state.currentType = 'quiz';

  document.getElementById('quiz-class-name').textContent = className;
  document.getElementById('quiz-due-date').textContent = 'Due ' + quiz.dueDate;
  document.getElementById('quiz-banner').textContent = quiz.title;
  document.getElementById('quiz-link').href = quiz.link;
  document.getElementById('quiz-link').textContent = quiz.linkLabel;
  document.getElementById('quiz-description').textContent = quiz.description;

  // Instructions list
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
  if (state.done.has(quiz.id)) {
    btn.textContent = 'Marked as done ✓';
    btn.className = 'mark-done-btn done-state';
  } else {
    btn.textContent = 'Mark as done';
    btn.className = 'mark-done-btn yellow';
  }

  showView('quiz-detail');
}

// #################################################################
// END SECTION: CLASSES FUNCTIONALITY (Prima Donna)
// #################################################################



// #################################################################
// SECTION: TO DO LIST (DETAILED) FUNCTIONALITY
// ASSIGNED TO: Prima Donna
// Handles: Full To-Do List page with Assigned & Missing tasks
// #################################################################

/** ---------- RENDER: TO DO LIST PAGE ---------- */
function renderTodo() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const assigned = DATA.todos.filter(t => t.dueDate >= today);
  const missing  = DATA.todos.filter(t => t.dueDate < today);

  // ===== Assigned tasks =====
  const assignedList = document.getElementById('todo-assigned-list');
  assignedList.innerHTML = '';
  if (assigned.length === 0) {
    assignedList.innerHTML = '<div class="todo-empty">No assigned tasks</div>';
  } else {
    assigned.forEach(t => {
      const card = document.createElement('div');
      card.className = 'todo-page-card';
      card.innerHTML = `<p class="todo-title">${t.title}</p><p class="todo-due">Due Date: ${t.due}</p>`;
      assignedList.appendChild(card);
    });
  }

  // ===== Missing tasks =====
  const missingList = document.getElementById('todo-missing-list');
  missingList.innerHTML = '';
  if (missing.length === 0) {
    missingList.innerHTML = '<div class="todo-empty">No assigned tasks was missed</div>';
  } else {
    missing.forEach(t => {
      const card = document.createElement('div');
      card.className = 'todo-missing-card';
      card.innerHTML = `<p class="todo-title">${t.title}</p><p class="todo-due">Due Date: ${t.due}</p>`;
      missingList.appendChild(card);
    });
  }
}

// #################################################################
// END SECTION: TO DO LIST (DETAILED) FUNCTIONALITY (Prima Donna)
// #################################################################



// #################################################################
// SECTION: PROGRESS FUNCTIONALITY
// ASSIGNED TO: _________________________
// #################################################################

/** ---------- MARK AS DONE ---------- */
function markDone(type) {
  if (!state.currentItem) return;
  const id = state.currentItem.id;
  state.done.add(id);
  updateProgressForClass(state.currentClass);

  const btn = document.getElementById(type === 'material' ? 'mat-mark-btn' : 'quiz-mark-btn');
  btn.textContent = 'Marked as done ✓';
  btn.className = 'mark-done-btn done-state';

  /* BACKEND HOOK – replace with API call to save done status */
}

function updateProgressForClass(cls) {
  if (!cls) return;
  const allIds = [...cls.materials.map(m => m.id), ...cls.quizzes.map(q => q.id)];
  const doneCount = allIds.filter(id => state.done.has(id)).length;
  const entry = DATA.progress.find(p => p.classTitle === cls.title);
  if (entry) {
    entry.completed = Math.min(doneCount, entry.total);
    if (state.currentView === 'progress') renderProgress();
  }
}



/** ---------- RENDER: PROGRESS ---------- */
function renderProgress() {
  const list = document.getElementById('progress-list');
  list.innerHTML = '';
  DATA.progress.forEach(entry => {
    const pct = Math.round((entry.completed / entry.total) * 100);
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
// ASSIGNED TO: _________________________
// #################################################################

/** ---------- RENDER: PROFILE ---------- */
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
  document.getElementById('edit-username-display').textContent = p.username;
  document.getElementById('pw-username-display').textContent = p.username;
}

// Shows only one panel at a time: 'main', 'edit-info', or 'change-password'
function showProfilePanel(panel) {
  document.getElementById('profile-main').style.display             = (panel === 'main')             ? 'block' : 'none';
  document.getElementById('profile-edit-info').style.display        = (panel === 'edit-info')        ? 'block' : 'none';
  document.getElementById('profile-change-password').style.display  = (panel === 'change-password')  ? 'block' : 'none';
}



/** ---------- PROFILE: EDIT INFORMATION ---------- */
document.getElementById('btn-edit-info').addEventListener('click', () => {
  const p = DATA.profile;
  document.getElementById('edit-firstname').value = p.firstName;
  document.getElementById('edit-lastname').value = p.lastName;
  document.getElementById('edit-username').value = p.username;
  document.getElementById('edit-email').value = p.email;
  showProfilePanel('edit-info');
});

document.getElementById('btn-save-info').addEventListener('click', () => {
  /* BACKEND HOOK – replace with API call to save profile info */
  DATA.profile.firstName = document.getElementById('edit-firstname').value.trim() || DATA.profile.firstName;
  DATA.profile.lastName  = document.getElementById('edit-lastname').value.trim()  || DATA.profile.lastName;
  DATA.profile.username  = document.getElementById('edit-username').value.trim()  || DATA.profile.username;
  DATA.profile.email     = document.getElementById('edit-email').value.trim()     || DATA.profile.email;

  refreshProfileDisplay();
  showProfilePanel('main');
});

document.getElementById('btn-back-from-edit').addEventListener('click', () => {
  showProfilePanel('main');
});



/** ---------- PROFILE: CHANGE PROFILE PICTURE ---------- */
document.getElementById('btn-change-picture').addEventListener('click', () => {
  document.getElementById('picture-file-input').click();
});

document.getElementById('picture-file-input').addEventListener('click', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    /* BACKEND HOOK – upload image to server, then update src from returned URL */
    const allAvatars = document.querySelectorAll('.profile-avatar-img');
    allAvatars.forEach(img => {
      img.src = e.target.result;
      img.classList.add('custom');
    });
  };
  reader.readAsDataURL(file);
});



/** ---------- PROFILE: CHANGE PASSWORD ---------- */
document.getElementById('btn-change-password').addEventListener('click', () => {
  document.getElementById('input-current-pw').value = '';
  document.getElementById('input-new-pw').value = '';
  showProfilePanel('change-password');
});

document.getElementById('btn-submit-password').addEventListener('click', () => {
  const currentPw = document.getElementById('input-current-pw').value;
  const newPw     = document.getElementById('input-new-pw').value;

  if (!currentPw || !newPw) {
    alert('Please fill in both password fields.');
    return;
  }

  /* BACKEND HOOK – send currentPw and newPw to API for validation and update */
  alert('Password changed successfully!');
  showProfilePanel('main');
});

document.getElementById('btn-back-from-password').addEventListener('click', () => {
  showProfilePanel('main');
});

// #################################################################
// END SECTION: PROFILE FUNCTIONALITY
// #################################################################



// #################################################################
// SECTION: SEARCH FUNCTIONALITY
// ASSIGNED TO: _________________________
// #################################################################

/** ---------- SEARCH ---------- */
document.getElementById('search-input').addEventListener('input', function () {
  const val = this.value.toLowerCase().trim();

  document.querySelectorAll('.announcement-card').forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(val) ? '' : 'none';
  });
  document.querySelectorAll('.todo-card, .todo-page-card, .todo-missing-card').forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(val) ? '' : 'none';
  });
  document.querySelectorAll('.class-card').forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(val) ? '' : 'none';
  });
  document.querySelectorAll('.material-item, .quiz-item').forEach(item => {
    item.style.display = item.innerText.toLowerCase().includes(val) ? '' : 'none';
  });
  document.querySelectorAll('.progress-card').forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(val) ? '' : 'none';
  });
});

// #################################################################
// END SECTION: SEARCH FUNCTIONALITY
// #################################################################



// #################################################################
// SECTION: MARK DONE BUTTONS - DO NOT MODIFY WITHOUT TEAM DISCUSSION
// #################################################################

/** ---------- MARK DONE BUTTONS ---------- */
document.getElementById('mat-mark-btn').addEventListener('click', () => markDone('material'));
document.getElementById('quiz-mark-btn').addEventListener('click', () => markDone('quiz'));

// #################################################################
// END SECTION: MARK DONE BUTTONS
// #################################################################



// #################################################################
// INITIALIZATION - DO NOT MODIFY WITHOUT TEAM DISCUSSION
// #################################################################

/** ---------- INIT ---------- */
(async function init() {
  // Fetch classes from API
  try {
    const response = await fetch('/api/classes');
    if (!response.ok) throw new Error('Failed to fetch classes');
    DATA.classes = await response.json();
    console.log('Classes loaded:', DATA.classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
  }

  const homeNav = document.querySelector('.nav-item[data-view="home"]');
  if (homeNav) setActiveNav(homeNav);
  renderHome();
  showView('home');
})();

// #################################################################
// END INITIALIZATION
// #################################################################