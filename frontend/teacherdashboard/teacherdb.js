// =============================================
// TEACHER DASHBOARD - API CONNECTED
// =============================================

// =============================================
// TEACHER DATA
// =============================================
const TEACHER_DATA = {
  profile: { id: null, firstName: '', lastName: '', username: '', email: '', role: '' },
  profileLoaded: false,
  classes: [],
  sections: [],
  materials: [],
  quizzes: [],
  assignments: [],
  students: []
};

// =============================================
// STATE
// =============================================
let state = {
  currentView: 'classes',
  currentClassId: null,
  currentSectionId: null,
  currentMaterialId: null,
  currentQuizId: null,
  currentAssignmentId: null,
  editingClassId: null,
  editingSectionId: null,
  editingMaterialId: null,
  editingQuizId: null,
  editingAssignmentId: null,
  editingAnnouncementId: null,
  activeSectionTab: 'lessons',
  activeCompletionTab: { mat: 'pending', quiz: 'pending', assign: 'pending' },
  announcements: []
};

// =============================================
// FETCH TEACHER PROFILE
// =============================================
async function fetchTeacherProfile() {
  const savedUser = localStorage.getItem('eduhub_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      TEACHER_DATA.profile.id = user.id;
      TEACHER_DATA.profile.firstName = user.first_name || 'Teacher';
      TEACHER_DATA.profile.lastName = user.last_name || '';
      TEACHER_DATA.profile.username = user.username || 'teacher';
      TEACHER_DATA.profile.email = user.email || '';
      TEACHER_DATA.profile.role = user.role || 'teacher';
      TEACHER_DATA.profileLoaded = true;
      return;
    } catch (e) { console.error('Error parsing saved user:', e); }
  }
  TEACHER_DATA.profileLoaded = true;
}

// =============================================
// API HELPERS
// =============================================
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}

async function apiPut(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}

async function apiDelete(url, body = null) {
  const opts = { method: 'DELETE', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}

// =============================================
// NAVIGATION
// =============================================
function showView(viewId) {
  document.querySelectorAll('.page-body').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + viewId).classList.remove('hidden');
  state.currentView = viewId;
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === viewId);
  });
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const view = item.dataset.view;
    if (view === 'classes') fetchAndRenderClasses();
    else if (view === 'progress') renderProgressView();
    else if (view === 'announcements') renderAnnouncementsView();
    else if (view === 'profile') showView('profile');
  });
});

// =============================================
// DOTS SVG HELPER
// =============================================
function dotsIconSVG() {
  return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="4" r="1.5" fill="#555"/>
    <circle cx="10" cy="10" r="1.5" fill="#555"/>
    <circle cx="10" cy="16" r="1.5" fill="#555"/>
  </svg>`;
}

// =============================================
// CLASSES VIEW
// =============================================
async function fetchAndRenderClasses() {
  try {
    const classes = await apiGet(`/api/teacher/classes?teacherId=${TEACHER_DATA.profile.id}`);
    TEACHER_DATA.classes = classes;
  } catch (err) {
    console.error('Fetch classes error:', err);
    TEACHER_DATA.classes = [];
  }
  renderClassesView();
}

async function fetchSectionsForClass(classId) {
  try {
    const sections = await apiGet(`/api/teacher/sections?classId=${classId}`);
    return sections;
  } catch (err) {
    console.error('Fetch sections error:', err);
    return [];
  }
}

function renderClassesView() {
  showView('classes');
  const grid = document.getElementById('classes-grid');
  grid.innerHTML = '';

  if (!TEACHER_DATA.classes.length) {
    grid.innerHTML = '<div class="empty-state">No classes yet. Create your first class!</div>';
    return;
  }

  TEACHER_DATA.classes.forEach(async cls => {
    const sections = await fetchSectionsForClass(cls.id);
    
    const card = document.createElement('div');
    card.className = 'class-card';
    card.innerHTML = `
      <div class="class-card-top">
        <div class="class-card-left" data-classid="${cls.id}">
          <div class="class-icon-wrap">
            <img src="/teacherdashboard/class-icon.png" alt="class icon"
              onerror="this.style.display='none';this.parentElement.innerHTML='📚'">
          </div>
          <div>
            <div class="class-card-name">${escHtml(cls.title)}</div>
            <div class="class-card-meta">${sections.length} section${sections.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <button class="three-dot-btn" data-classid="${cls.id}" title="Options">
          ${dotsIconSVG()}
        </button>
      </div>
      <div class="class-card-bottom">
        <button class="view-class-btn" data-classid="${cls.id}">View class</button>
      </div>`;

    card.querySelector('.three-dot-btn').addEventListener('click', e => {
      e.stopPropagation();
      openEditClassModal(cls.id);
    });
    card.querySelector('.view-class-btn').addEventListener('click', e => {
      e.stopPropagation();
      openClassDetail(cls.id);
    });
    card.querySelector('.class-card-left').addEventListener('click', () => openClassDetail(cls.id));
    grid.appendChild(card);
  });
}

// =============================================
// EDIT CLASS MODAL
// =============================================
function openEditClassModal(classId) {
  state.editingClassId = classId;
  const cls = TEACHER_DATA.classes.find(c => c.id === classId);
  document.getElementById('edit-class-name-input').value = cls.title;
  document.getElementById('edit-class-desc-input').value = cls.subject_code || '';
  openModal('modal-edit-class');
}

document.getElementById('cancel-edit-class-modal').addEventListener('click', () => closeModal('modal-edit-class'));

document.getElementById('save-edit-class-modal').addEventListener('click', async () => {
  const title = document.getElementById('edit-class-name-input').value.trim();
  const desc = document.getElementById('edit-class-desc-input').value.trim();
  if (!title) { Swal.fire('Error', 'Class name is required.', 'error'); return; }
  
  try {
    await apiPut(`/api/teacher/classes/${state.editingClassId}`, { title, description: desc });
    closeModal('modal-edit-class');
    Swal.fire({ icon: 'success', title: 'Class updated!', timer: 1200, showConfirmButton: false });
    fetchAndRenderClasses();
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

document.getElementById('delete-class-modal-btn').addEventListener('click', async () => {
  closeModal('modal-edit-class');
  const result = await Swal.fire({
    title: 'Delete class?',
    text: 'This will also delete all sections inside.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/classes/${state.editingClassId}`);
      fetchAndRenderClasses();
      Swal.fire('Deleted', 'Class deleted.', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }
});

// =============================================
// CLASS DETAIL VIEW
// =============================================
async function openClassDetail(classId) {
  state.currentClassId = classId;
  const cls = TEACHER_DATA.classes.find(c => c.id === classId);
  document.getElementById('class-detail-name').textContent = cls.title;
  document.getElementById('class-detail-meta').textContent = cls.subject_code || '';
  await fetchAndRenderSections(classId);
  showView('class-detail');
}

async function fetchAndRenderSections(classId) {
  try {
    TEACHER_DATA.sections = await apiGet(`/api/teacher/sections?classId=${classId}`);
  } catch (err) {
    console.error('Fetch sections error:', err);
    TEACHER_DATA.sections = [];
  }
  renderSectionsList();
}

function renderSectionsList() {
  const list = document.getElementById('sections-list');
  list.innerHTML = '';

  if (!TEACHER_DATA.sections.length) {
    list.innerHTML = '<div class="empty-state">No sections yet. Add your first section!</div>';
    return;
  }

  TEACHER_DATA.sections.forEach(async sec => {
    let enrolledCount = 0;
    try {
      const students = await apiGet(`/api/teacher/students?sectionId=${sec.id}`);
      enrolledCount = students.filter(s => s.status === 'enrolled').length;
    } catch (e) {}

    const card = document.createElement('div');
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-card-left">
        <div class="section-icon-wrap">
          <img src="/teacherdashboard/section-icon.png" alt="section"
            onerror="this.style.display='none';this.parentElement.innerHTML='👥'">
        </div>
        <div>
          <div class="section-card-name">${escHtml(sec.name)}</div>
          <div class="section-card-students">${enrolledCount} student${enrolledCount !== 1 ? 's' : ''} enrolled</div>
        </div>
      </div>
      <div class="section-card-right">
        <span style="font-size:12px;color:#888;margin-right:8px">Code: ${sec.code}</span>
        <button class="section-dots-btn" data-secid="${sec.id}" title="Options">
          ${dotsIconSVG()}
        </button>
      </div>`;

    card.querySelector('.section-dots-btn').addEventListener('click', e => {
      e.stopPropagation();
      openEditSectionModal(sec.id);
    });
    card.addEventListener('click', e => {
      if (!e.target.closest('.section-dots-btn')) {
        openSectionDetail(sec.id, sec.name);
      }
    });
    list.appendChild(card);
  });
}

// =============================================
// EDIT SECTION MODAL (code cannot be edited)
// =============================================
function openEditSectionModal(sectionId) {
  state.editingSectionId = sectionId;
  const sec = TEACHER_DATA.sections.find(s => s.id === sectionId);
  document.getElementById('edit-section-name-input').value = sec.name;
  document.getElementById('edit-modal-code-display').textContent = sec.code;
  document.getElementById('edit-section-code-input').value = '';
  document.getElementById('edit-section-code-input').disabled = true;
  document.getElementById('edit-section-code-input').placeholder = 'Code cannot be changed';
  openModal('modal-edit-section');
}

document.getElementById('cancel-edit-section-modal').addEventListener('click', () => closeModal('modal-edit-section'));

document.getElementById('save-edit-section-modal').addEventListener('click', async () => {
  const name = document.getElementById('edit-section-name-input').value.trim();
  if (!name) { Swal.fire('Error', 'Section name is required.', 'error'); return; }
  
  try {
    await apiPut(`/api/teacher/sections/${state.editingSectionId}`, { name });
    closeModal('modal-edit-section');
    Swal.fire({ icon: 'success', title: 'Section updated!', timer: 1200, showConfirmButton: false });
    await fetchAndRenderSections(state.currentClassId);
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

document.getElementById('delete-section-modal-btn').addEventListener('click', async () => {
  closeModal('modal-edit-section');
  const result = await Swal.fire({
    title: 'Delete section?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/sections/${state.editingSectionId}`);
      await fetchAndRenderSections(state.currentClassId);
      Swal.fire('Deleted', 'Section deleted.', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }
});

// =============================================
// SECTION DETAIL VIEW
// =============================================
function openSectionDetail(sectionId, sectionName) {
  state.currentSectionId = sectionId;
  const cls = TEACHER_DATA.classes.find(c => c.id === state.currentClassId);
  document.getElementById('section-detail-name').textContent = sectionName;
  document.getElementById('section-detail-class').textContent = cls ? cls.title : '';
  switchTab('lessons');
  showView('section-detail');
}

function switchTab(tab) {
  state.activeSectionTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'lessons') fetchAndRenderMaterials();
  else if (tab === 'quizzes') fetchAndRenderQuizzes();
  else if (tab === 'assignments') fetchAndRenderAssignments();
  else if (tab === 'students') fetchAndRenderStudents();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// =============================================
// MATERIALS
// =============================================
async function fetchAndRenderMaterials() {
  try {
    TEACHER_DATA.materials = await apiGet(`/api/teacher/materials?sectionId=${state.currentSectionId}`);
  } catch (err) {
    console.error('Fetch materials error:', err);
    TEACHER_DATA.materials = [];
  }
  renderMaterialsList();
}

function renderMaterialsList() {
  const list = document.getElementById('materials-list');
  list.innerHTML = '';
  if (!TEACHER_DATA.materials.length) {
    list.innerHTML = '<div class="empty-state">No learning materials yet.</div>';
    return;
  }

  TEACHER_DATA.materials.forEach(mat => {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.innerHTML = `
      <div class="material-card-left">
        <div class="item-icon-wrap">
          <img src="/teacherdashboard/lesson-icon.png" alt="lesson"
            onerror="this.style.display='none';this.parentElement.innerHTML='📖'">
        </div>
        <div class="material-card-info">
          <span class="material-card-name">${escHtml(mat.title)}</span>
          <span class="material-card-desc">${escHtml(mat.description || '')}</span>
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openMaterialModal(${mat.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMaterial(${mat.id})">Delete</button>
      </div>`;
    card.addEventListener('click', () => openMaterialDetail(mat));
    list.appendChild(card);
  });
}

function openMaterialDetail(mat) {
  state.currentMaterialId = mat.id;
  document.getElementById('mat-section-label').textContent = document.getElementById('section-detail-name').textContent;
  document.getElementById('mat-detail-banner').textContent = mat.title;
  const link = document.getElementById('mat-detail-link');
  link.textContent = mat.pdf_url || 'No file attached';
  link.href = mat.pdf_url || '#';
  document.getElementById('mat-detail-desc').textContent = mat.description || '';
  state.activeCompletionTab.mat = 'pending';
  renderCompletionTabs(document.querySelector('#view-material-detail .completion-tabs'), 'mat');
  renderCompletionStudents('mat-done-students', 'material', mat.id, 'pending');
  showView('material-detail');
}

async function deleteMaterial(id) {
  const result = await Swal.fire({
    title: 'Delete material?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/materials/${id}`);
      fetchAndRenderMaterials();
      Swal.fire('Deleted', 'Material deleted.', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }
}

// =============================================
// QUIZZES
// =============================================
async function fetchAndRenderQuizzes() {
  try {
    TEACHER_DATA.quizzes = await apiGet(`/api/teacher/quizzes?sectionId=${state.currentSectionId}`);
  } catch (err) {
    console.error('Fetch quizzes error:', err);
    TEACHER_DATA.quizzes = [];
  }
  renderQuizzesList();
}

function renderQuizzesList() {
  const list = document.getElementById('quizzes-list');
  list.innerHTML = '';
  if (!TEACHER_DATA.quizzes.length) {
    list.innerHTML = '<div class="empty-state">No quizzes yet.</div>';
    return;
  }

  TEACHER_DATA.quizzes.forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-card-left">
        <div class="item-icon-wrap">
          <img src="/teacherdashboard/quiz-icon.png" alt="quiz"
            onerror="this.style.display='none';this.parentElement.innerHTML='❓'">
        </div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${escHtml(quiz.title)}</span>
          <span class="quiz-card-meta">Due: ${quiz.due_date ? new Date(quiz.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}</span>       
          </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openQuizModal(${quiz.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteQuiz(${quiz.id})">Delete</button>
      </div>`;
    card.addEventListener('click', () => openQuizDetail(quiz));
    list.appendChild(card);
  });
}

function openQuizDetail(quiz) {
  state.currentQuizId = quiz.id;
  document.getElementById('quiz-section-label').textContent = document.getElementById('section-detail-name').textContent;
  document.getElementById('quiz-detail-banner').textContent = quiz.title;
  const link = document.getElementById('quiz-detail-link');
  link.textContent = quiz.link || 'No link attached';
  link.href = quiz.link || '#';
  document.getElementById('quiz-detail-desc').textContent = quiz.description || '';
  document.getElementById('quiz-detail-due').textContent = quiz.due_date ? new Date(quiz.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A';  state.activeCompletionTab.quiz = 'pending';
  renderCompletionTabs(document.querySelector('#view-quiz-detail .completion-tabs'), 'quiz');
  renderCompletionStudents('quiz-done-students', 'quiz', quiz.id, 'pending');
  showView('quiz-detail');
}

async function deleteQuiz(id) {
  const result = await Swal.fire({
    title: 'Delete quiz?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/quizzes/${id}`);
      fetchAndRenderQuizzes();
      Swal.fire('Deleted', 'Quiz deleted.', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }
}

// =============================================
// ASSIGNMENTS
// =============================================
async function fetchAndRenderAssignments() {
  try {
    TEACHER_DATA.assignments = await apiGet(`/api/teacher/assignments?sectionId=${state.currentSectionId}`);
  } catch (err) {
    console.error('Fetch assignments error:', err);
    TEACHER_DATA.assignments = [];
  }
  renderAssignmentsList();
}

function renderAssignmentsList() {
  const list = document.getElementById('assignments-list');
  list.innerHTML = '';
  if (!TEACHER_DATA.assignments.length) {
    list.innerHTML = '<div class="empty-state">No assignments yet.</div>';
    return;
  }

  TEACHER_DATA.assignments.forEach(assign => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-card-left">
        <div class="item-icon-wrap">
          <img src="/teacherdashboard/assignment-icon.png" alt="assignment"
            onerror="this.style.display='none';this.parentElement.innerHTML='📝'">
        </div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${escHtml(assign.title)}</span>
          <span class="quiz-card-meta">Due: ${assign.due_date ? new Date(assign.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'} · ${assign.points || 0} pts</span>
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openAssignmentModal(${assign.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAssignment(${assign.id})">Delete</button>
      </div>`;
    card.addEventListener('click', () => openAssignmentDetail(assign));
    list.appendChild(card);
  });
}

function openAssignmentDetail(assign) {
  state.currentAssignmentId = assign.id;
  document.getElementById('assign-section-label').textContent = document.getElementById('section-detail-name').textContent;
  document.getElementById('assign-detail-banner').textContent = assign.title;
  const link = document.getElementById('assign-detail-link');
  link.textContent = assign.link || 'No file attached';
  link.href = assign.link || '#';
  document.getElementById('assign-detail-desc').textContent = assign.description || '';
  document.getElementById('assign-detail-due').textContent = assign.due_date ? new Date(assign.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A';  document.getElementById('assign-detail-points').textContent = (assign.points || 0) + ' points';
  state.activeCompletionTab.assign = 'pending';
  renderCompletionTabs(document.querySelector('#view-assignment-detail .completion-tabs'), 'assign');
  renderCompletionStudents('assign-done-students', 'assignment', assign.id, 'pending');
  showView('assignment-detail');
}

async function deleteAssignment(id) {
  const result = await Swal.fire({
    title: 'Delete assignment?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/assignments/${id}`);
      fetchAndRenderAssignments();
      Swal.fire('Deleted', 'Assignment deleted.', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }
}

// =============================================
// COMPLETION TABS & STUDENTS
// =============================================
function renderCompletionTabs(container, key) {
  if (!container) return;
  container.querySelectorAll('.completion-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ctab === state.activeCompletionTab[key]);
    btn.onclick = () => {
      state.activeCompletionTab[key] = btn.dataset.ctab;
      renderCompletionTabs(container, key);
      if (key === 'mat') renderCompletionStudents('mat-done-students', 'material', state.currentMaterialId, btn.dataset.ctab);
      else if (key === 'quiz') renderCompletionStudents('quiz-done-students', 'quiz', state.currentQuizId, btn.dataset.ctab);
      else if (key === 'assign') renderCompletionStudents('assign-done-students', 'assignment', state.currentAssignmentId, btn.dataset.ctab);
    };
  });
}

async function renderCompletionStudents(containerId, type, itemId, filterStatus) {
  const container = document.getElementById(containerId);
  container.innerHTML = '<div style="text-align:center;padding:10px;color:#888;">Loading...</div>';

  try {
    const students = await apiGet(`/api/teacher/completions?itemType=${type}&itemId=${itemId}&sectionId=${state.currentSectionId}`);
    container.innerHTML = '';

    if (!students.length) {
      container.innerHTML = '<div class="empty-state">No students enrolled in this section.</div>';
      return;
    }

    let filtered = students.map(s => ({
      ...s,
      status: s.completed_at ? 'finished' : 'pending'
    }));

    // For materials: only pending/finished (no missed)
    // For quizzes/assignments: also check due date for missed
    if (type !== 'material') {
      let dueDate = null;
      if (type === 'quiz') {
        const quiz = TEACHER_DATA.quizzes.find(q => q.id === itemId);
        dueDate = quiz?.due_date;
      } else if (type === 'assignment') {
        const assign = TEACHER_DATA.assignments.find(a => a.id === itemId);
        dueDate = assign?.due_date;
      }

      if (dueDate) {
        const now = new Date();
        filtered = filtered.map(s => {
          if (s.status === 'pending' && new Date(dueDate) < now) {
            return { ...s, status: 'missed' };
          }
          return s;
        });
      }
    }

    filtered = filtered.filter(s => s.status === filterStatus);

    if (!filtered.length) {
      const labels = { 
        pending: 'No pending students.', 
        finished: 'No students have finished yet.', 
        passed: 'No students have passed yet.',
        missed: 'No students missed this.' 
      };
      container.innerHTML = `<div class="empty-state">${labels[filterStatus]}</div>`;
      return;
    }

    filtered.forEach(s => {
      const badgeClass = s.status === 'finished' || s.status === 'passed' ? 'badge-done' : s.status === 'missed' ? 'badge-missed' : 'badge-pending';
      const badgeLabel = s.status === 'finished' ? '✓ Finished' : s.status === 'passed' ? '✓ Passed' : s.status === 'missed' ? '✗ Missed' : '⏳ Pending';
      const card = document.createElement('div');
      card.className = 'student-done-card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px">
          <div class="item-icon-wrap" style="background:#11265c">
            <img src="/teacherdashboard/student-icon.png" alt="student"
              onerror="this.style.display='none';this.parentElement.innerHTML='👤'">
          </div>
          <div>
            <div style="font-weight:600">${escHtml(s.first_name + ' ' + s.last_name)}</div>
            <div style="font-size:12px;color:#777">${escHtml(s.email)}</div>
          </div>
        </div>
        <span class="student-done-badge ${badgeClass}">${badgeLabel}</span>`;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load students.</div>';
  }
}

// =============================================
// STUDENTS TAB
// =============================================
async function fetchAndRenderStudents() {
  try {
    TEACHER_DATA.students = await apiGet(`/api/teacher/students?sectionId=${state.currentSectionId}`);
  } catch (err) {
    console.error('Fetch students error:', err);
    TEACHER_DATA.students = [];
  }
  renderStudentsList();
}

function renderStudentsList() {
  const enrolledEl = document.getElementById('enrolled-students-list');
  const requestsEl = document.getElementById('join-requests-list');
  enrolledEl.innerHTML = '';
  requestsEl.innerHTML = '';

  const enrolled = TEACHER_DATA.students.filter(s => s.status === 'enrolled');
  const pending = TEACHER_DATA.students.filter(s => s.status === 'pending');

  if (!enrolled.length) {
    enrolledEl.innerHTML = '<div class="empty-state">No enrolled students.</div>';
  } else {
    enrolled.forEach(s => {
      const card = document.createElement('div');
      card.className = 'student-card';
      card.innerHTML = `
        <div class="student-card-left">
          <div class="item-icon-wrap" style="background:#11265c">
            <img src="/teacherdashboard/student-icon.png" alt="student"
              onerror="this.style.display='none';this.parentElement.innerHTML='👤'">
          </div>
          <div>
            <div class="student-name">${escHtml(s.first_name + ' ' + s.last_name)}</div>
            <div class="student-email">${escHtml(s.email)}</div>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeStudent(${s.id})">Remove</button>`;
      enrolledEl.appendChild(card);
    });
  }

  if (!pending.length) {
    requestsEl.innerHTML = '<div class="empty-state">No pending join requests.</div>';
  } else {
    pending.forEach(s => {
      const card = document.createElement('div');
      card.className = 'join-request-card';
      card.innerHTML = `
        <div class="student-card-left">
          <div class="item-icon-wrap" style="background:#11265c">
            <img src="/teacherdashboard/student-icon.png" alt="student"
              onerror="this.style.display='none';this.parentElement.innerHTML='👤'">
          </div>
          <div>
            <div class="student-name">${escHtml(s.first_name + ' ' + s.last_name)}</div>
            <div class="student-email">${escHtml(s.email)}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-dark btn-sm" onclick="approveStudent(${s.id})">Approve</button>
          <button class="btn btn-danger btn-sm" onclick="rejectStudent(${s.id})">Reject</button>
        </div>`;
      requestsEl.appendChild(card);
    });
  }
}

async function removeStudent(studentId) {
  const result = await Swal.fire({
    title: 'Remove student?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Remove', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await apiDelete('/api/teacher/students', { sectionId: state.currentSectionId, studentId });
      fetchAndRenderStudents();
      Swal.fire('Removed', 'Student removed.', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }
}

async function approveStudent(studentId) {
  try {
    await apiPut('/api/teacher/students/approve', { sectionId: state.currentSectionId, studentId });
    fetchAndRenderStudents();
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
}

async function rejectStudent(studentId) {
  try {
    await apiDelete('/api/teacher/students', { sectionId: state.currentSectionId, studentId });
    fetchAndRenderStudents();
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
}

// =============================================
// MODALS (Create Class, Section, Material, Quiz, Assignment)
// =============================================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ---- Class Modal ----
document.getElementById('btn-create-class').addEventListener('click', () => {
  document.getElementById('modal-class-title-text').textContent = 'Create Class';
  document.getElementById('class-name-input').value = '';
  document.getElementById('class-desc-input').value = '';
  openModal('modal-class');
});
document.getElementById('cancel-class-modal').addEventListener('click', () => closeModal('modal-class'));
document.getElementById('save-class-modal').addEventListener('click', async () => {
  const title = document.getElementById('class-name-input').value.trim();
  const desc = document.getElementById('class-desc-input').value.trim();
  if (!title) { Swal.fire('Error', 'Class name is required.', 'error'); return; }
  try {
    await apiPost('/api/teacher/classes', { teacherId: TEACHER_DATA.profile.id, title, description: desc });
    closeModal('modal-class');
    Swal.fire({ icon: 'success', title: 'Class created!', timer: 1200, showConfirmButton: false });
    fetchAndRenderClasses();
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

// ---- Section Modal ----
document.getElementById('btn-add-section').addEventListener('click', () => {
  document.getElementById('modal-section-title-text').textContent = 'Add Section';
  document.getElementById('section-name-input').value = '';
  openModal('modal-section');
});
document.getElementById('cancel-section-modal').addEventListener('click', () => closeModal('modal-section'));
document.getElementById('save-section-modal').addEventListener('click', async () => {
  const name = document.getElementById('section-name-input').value.trim();
  if (!name) { Swal.fire('Error', 'Section name is required.', 'error'); return; }
  try {
    const result = await apiPost('/api/teacher/sections', { classId: state.currentClassId, name });
    closeModal('modal-section');
    Swal.fire({ icon: 'success', title: `Section created! Code: ${result.code}`, timer: 2000, showConfirmButton: false });
    await fetchAndRenderSections(state.currentClassId);
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

// ---- Material Modal ----
function openMaterialModal(editId = null) {
  state.editingMaterialId = editId;
  const mat = editId ? TEACHER_DATA.materials.find(m => m.id === editId) : null;
  document.getElementById('modal-material-title-text').textContent = editId ? 'Edit Material' : 'Add Learning Material';
  document.getElementById('material-name-input').value = mat ? mat.title : '';
  document.getElementById('material-desc-input').value = mat ? mat.description || '' : '';
  document.getElementById('material-link-input').value = mat ? mat.pdf_url || '' : '';
  
  // ✅ Only clear file preview if it exists
  const filePreview = document.getElementById('material-file-preview');
  if (filePreview) {
    filePreview.innerHTML = '';
  }
  
  openModal('modal-material');
}

document.getElementById('btn-add-material').addEventListener('click', () => openMaterialModal());
document.getElementById('btn-edit-material').addEventListener('click', () => openMaterialModal(state.currentMaterialId));
document.getElementById('btn-delete-material').addEventListener('click', () => deleteMaterial(state.currentMaterialId));
document.getElementById('cancel-material-modal').addEventListener('click', () => closeModal('modal-material'));
document.getElementById('save-material-modal').addEventListener('click', async () => {
  const title = document.getElementById('material-name-input').value.trim();
  const desc = document.getElementById('material-desc-input').value.trim();
  const link = document.getElementById('material-link-input').value.trim();
  if (!title) { Swal.fire('Error', 'Material name is required.', 'error'); return; }
  try {
    if (state.editingMaterialId) {
      await apiPut(`/api/teacher/materials/${state.editingMaterialId}`, { title, description: desc, link });
    } else {
      await apiPost('/api/teacher/materials', { sectionId: state.currentSectionId, title, description: desc, link });
    }
    closeModal('modal-material');
    fetchAndRenderMaterials();
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

// ---- Quiz Modal ----
function openQuizModal(editId = null) {
  state.editingQuizId = editId;
  const quiz = editId ? TEACHER_DATA.quizzes.find(q => q.id === editId) : null;
  document.getElementById('modal-quiz-title-text').textContent = editId ? 'Edit Quiz' : 'Add Quiz';
  document.getElementById('quiz-name-input').value = quiz ? quiz.title : '';
  document.getElementById('quiz-desc-input').value = quiz ? quiz.description || '' : '';
  document.getElementById('quiz-link-input').value = quiz ? quiz.link || '' : '';
  document.getElementById('quiz-due-input').value = quiz && quiz.due_date ? formatDateTimeLocal(quiz.due_date) : '';
  
  // ✅ Only clear file preview if it exists
  const filePreview = document.getElementById('quiz-file-preview');
  if (filePreview) {
    filePreview.innerHTML = '';
  }
  
  openModal('modal-quiz');
}
document.getElementById('btn-add-quiz').addEventListener('click', () => openQuizModal());
document.getElementById('btn-edit-quiz').addEventListener('click', () => openQuizModal(state.currentQuizId));
document.getElementById('btn-delete-quiz').addEventListener('click', () => deleteQuiz(state.currentQuizId));
document.getElementById('cancel-quiz-modal').addEventListener('click', () => closeModal('modal-quiz'));
document.getElementById('save-quiz-modal').addEventListener('click', async () => {
  const title = document.getElementById('quiz-name-input').value.trim();
  const desc = document.getElementById('quiz-desc-input').value.trim();
  const link = document.getElementById('quiz-link-input').value.trim();
  const due = document.getElementById('quiz-due-input').value;
  if (!title) { Swal.fire('Error', 'Quiz title is required.', 'error'); return; }
  try {
    if (state.editingQuizId) {
      await apiPut(`/api/teacher/quizzes/${state.editingQuizId}`, { title, description: desc, link, dueDate: due });
    } else {
      await apiPost('/api/teacher/quizzes', { sectionId: state.currentSectionId, title, description: desc, link, dueDate: due });
    }
    closeModal('modal-quiz');
    fetchAndRenderQuizzes();
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

// ---- Assignment Modal ----
function openAssignmentModal(editId = null) {
  state.editingAssignmentId = editId;
  const assign = editId ? TEACHER_DATA.assignments.find(a => a.id === editId) : null;
  document.getElementById('modal-assignment-title-text').textContent = editId ? 'Edit Assignment' : 'Add Assignment';
  document.getElementById('assignment-name-input').value = assign ? assign.title : '';
  document.getElementById('assignment-desc-input').value = assign ? assign.description || '' : '';
  document.getElementById('assignment-due-input').value = assign && assign.due_date ? formatDateTimeLocal(assign.due_date) : '';  document.getElementById('assignment-points-input').value = assign ? assign.points || '' : '';
  document.getElementById('assignment-link-input').value = assign ? assign.link || '' : '';
  
  // ✅ Only clear file preview if it exists
  const filePreview = document.getElementById('assignment-file-preview');
  if (filePreview) {
    filePreview.innerHTML = '';
  }
  
  openModal('modal-assignment');
}

document.getElementById('btn-add-assignment').addEventListener('click', () => openAssignmentModal());
document.getElementById('btn-edit-assignment').addEventListener('click', () => openAssignmentModal(state.currentAssignmentId));
document.getElementById('btn-delete-assignment').addEventListener('click', () => deleteAssignment(state.currentAssignmentId));
document.getElementById('cancel-assignment-modal').addEventListener('click', () => closeModal('modal-assignment'));
document.getElementById('save-assignment-modal').addEventListener('click', async () => {
  const title = document.getElementById('assignment-name-input').value.trim();
  const desc = document.getElementById('assignment-desc-input').value.trim();
  const due = document.getElementById('assignment-due-input').value;
  const points = document.getElementById('assignment-points-input').value;
  const link = document.getElementById('assignment-link-input').value.trim();
  if (!title) { Swal.fire('Error', 'Assignment title is required.', 'error'); return; }
  try {
    if (state.editingAssignmentId) {
      await apiPut(`/api/teacher/assignments/${state.editingAssignmentId}`, { title, description: desc, link, dueDate: due, points });
    } else {
      await apiPost('/api/teacher/assignments', { sectionId: state.currentSectionId, title, description: desc, link, dueDate: due, points });
    }
    closeModal('modal-assignment');
    fetchAndRenderAssignments();
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

// =============================================
// PROGRESS VIEW
// =============================================
async function renderProgressView() {
  showView('progress');
  const list = document.getElementById('progress-list');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Loading progress...</div>';

  try {
    const classes = await apiGet(`/api/teacher/classes?teacherId=${TEACHER_DATA.profile.id}`);
    
    if (!classes.length) {
      list.innerHTML = '<div class="empty-state">No classes to show progress for.</div>';
      return;
    }

    list.innerHTML = '';

    for (const cls of classes) {
      const sections = await apiGet(`/api/teacher/sections?classId=${cls.id}`);
      
      for (const sec of sections) {
        const students = await apiGet(`/api/teacher/students?sectionId=${sec.id}`);
        const enrolled = students.filter(s => s.status === 'enrolled');
        
        const [materials, quizzes, assignments] = await Promise.all([
          apiGet(`/api/teacher/materials?sectionId=${sec.id}`),
          apiGet(`/api/teacher/quizzes?sectionId=${sec.id}`),
          apiGet(`/api/teacher/assignments?sectionId=${sec.id}`)
        ]);

        const totalItems = materials.length + quizzes.length + assignments.length;
        let doneCount = 0;
        const possible = enrolled.length * totalItems;

        for (const item of [...materials, ...quizzes, ...assignments]) {
          const itemType = materials.includes(item) ? 'material' : quizzes.includes(item) ? 'quiz' : 'assignment';
          try {
            const completions = await apiGet(`/api/teacher/completions?itemType=${itemType}&itemId=${item.id}&sectionId=${sec.id}`);
            doneCount += completions.filter(c => c.completed_at).length;
          } catch (e) {}
        }

        const pct = possible > 0 ? Math.round((doneCount / possible) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'progress-card';
        card.innerHTML = `
          <div class="progress-card-icon">
            <img src="/teacherdashboard/section-icon.png" alt="section"
              onerror="this.style.display='none';this.parentElement.innerHTML='👥'">
          </div>
          <div class="progress-card-body">
            <div class="progress-card-header">
              <span class="progress-card-name">${escHtml(sec.name)}</span>
              <span class="progress-card-count">${pct}% completion</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="progress-class-label">
              ${escHtml(cls.title)} · ${enrolled.length} students · ${totalItems} items
            </div>
          </div>`;
        list.appendChild(card);
      }
    }
  } catch (err) {
    list.innerHTML = '<div class="empty-state">Failed to load progress.</div>';
  }
}

// =============================================
// ANNOUNCEMENTS VIEW (Keep existing connected code)
// =============================================
function renderAnnouncementsView() {
  showView('announcements');
  const list = document.getElementById('announcements-list');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Loading announcements...</div>';
  fetchAnnouncements();
}

async function fetchAnnouncements() {
  try {
    const response = await fetch(`/api/teacher-announcements?teacherId=${TEACHER_DATA.profile.id}`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    state.announcements = data;
    renderAnnouncementList();
  } catch (err) {
    console.error('Fetch announcements error:', err);
    document.getElementById('announcements-list').innerHTML = '<div class="empty-state">Failed to load announcements.</div>';
  }
}

function renderAnnouncementList() {
  const list = document.getElementById('announcements-list');
  list.innerHTML = '';
  if (!state.announcements.length) {
    list.innerHTML = '<div class="empty-state">No announcements yet.</div>';
    return;
  }
  state.announcements.forEach(a => {
    const date = new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const card = document.createElement('div');
    card.className = 'announcement-card';
    card.innerHTML = `
      <div class="announcement-icon-wrap">
        <img src="/teacherdashboard/announcement-icon.png" alt="announcement"
          onerror="this.style.display='none';this.parentElement.innerHTML='📢'">
      </div>
      <div class="announcement-body-wrap">
        <div class="announcement-footer">
          <div>
            <div class="announcement-title">${escHtml(a.title)}</div>
            <div class="announcement-meta">${escHtml(a.audience)} · ${date}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editAnnouncement(${a.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAnnouncement(${a.id})">Delete</button>
          </div>
        </div>
        <div class="announcement-body" style="margin-top:10px">${escHtml(a.body)}</div>
      </div>`;
    list.appendChild(card);
  });
}

async function deleteAnnouncement(id) {
  const result = await Swal.fire({
    title: 'Delete announcement?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      Swal.fire('Deleted', 'Announcement deleted.', 'success');
      fetchAnnouncements();
    } catch (err) {
      Swal.fire('Error', 'Could not connect to server.', 'error');
    }
  }
}

function editAnnouncement(id) {
  const a = state.announcements.find(an => an.id === id);
  state.editingAnnouncementId = id;
  document.getElementById('announcement-title-input').value = a.title;
  document.getElementById('announcement-body-input').value = a.body;
  document.getElementById('announcement-audience-input').value = a.audience;
  document.getElementById('modal-announcement-title-text').textContent = 'Edit Announcement';
  openModal('modal-announcement');
}

// Announcement modal handlers
document.getElementById('btn-new-announcement').addEventListener('click', () => {
  state.editingAnnouncementId = null;
  document.getElementById('modal-announcement-title-text').textContent = 'New Announcement';
  document.getElementById('announcement-title-input').value = '';
  document.getElementById('announcement-body-input').value = '';
  openModal('modal-announcement');
});
document.getElementById('cancel-announcement-modal').addEventListener('click', () => closeModal('modal-announcement'));
document.getElementById('save-announcement-modal').addEventListener('click', async () => {
  const title = document.getElementById('announcement-title-input').value.trim();
  const body = document.getElementById('announcement-body-input').value.trim();
  const audience = document.getElementById('announcement-audience-input').value;
  if (!title || !body) { Swal.fire('Error', 'Title and message are required.', 'error'); return; }
  try {
    let response;
    if (state.editingAnnouncementId) {
      response = await fetch(`/api/announcements/${state.editingAnnouncementId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, audience })
      });
    } else {
      response = await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: TEACHER_DATA.profile.id, title, body, audience })
      });
    }
    const data = await response.json();
    if (response.ok) {
      closeModal('modal-announcement');
      Swal.fire('Success', data.message, 'success');
      fetchAnnouncements();
    } else {
      Swal.fire('Error', data.message || 'Failed to save.', 'error');
    }
  } catch (err) {
    Swal.fire('Error', 'Could not connect to server.', 'error');
  }
});

// =============================================
// BACK BUTTONS
// =============================================
document.getElementById('back-to-classes').addEventListener('click', fetchAndRenderClasses);
document.getElementById('back-to-class-detail').addEventListener('click', () => openClassDetail(state.currentClassId));
document.getElementById('back-to-section-lessons').addEventListener('click', () => { openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name').textContent); switchTab('lessons'); });
document.getElementById('back-to-section-quizzes').addEventListener('click', () => { openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name').textContent); switchTab('quizzes'); });
document.getElementById('back-to-section-assignments').addEventListener('click', () => { openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name').textContent); switchTab('assignments'); });

// =============================================
// PROFILE (Keep existing connected code)
// =============================================
function refreshTeacherProfileDisplay() {
  const p = TEACHER_DATA.profile;
  document.getElementById('display-firstname').textContent = p.firstName || 'Teacher';
  document.getElementById('display-lastname').textContent = p.lastName || '';
  document.getElementById('display-username').textContent = p.username || 'teacher';
  document.getElementById('display-email').textContent = p.email || '';
  document.getElementById('profile-username-display').textContent = p.username || 'teacher';
  document.getElementById('profile-role-display').textContent = p.role || 'Teacher';
  document.getElementById('pw-username-display').value = p.username || 'teacher';
  document.getElementById('edit-firstname').value = p.firstName || '';
  document.getElementById('edit-lastname').value = p.lastName || '';
  document.getElementById('edit-username').value = p.username || '';
  document.getElementById('edit-email').value = p.email || '';
}

function showTeacherProfilePanel(panel) {
  document.getElementById('profile-main').style.display = (panel === 'main') ? 'block' : 'none';
  document.getElementById('profile-edit-info').style.display = (panel === 'edit-info') ? 'block' : 'none';
  document.getElementById('profile-change-password').style.display = (panel === 'change-password') ? 'block' : 'none';
}

// Edit profile button
document.getElementById('btn-edit-profile').addEventListener('click', () => showTeacherProfilePanel('edit-info'));
document.getElementById('btn-cancel-edit').addEventListener('click', () => showTeacherProfilePanel('main'));
document.getElementById('btn-save-profile').addEventListener('click', async () => {
  const updated = {
    userId: TEACHER_DATA.profile.id,
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
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    const data = await response.json();
    if (response.ok) {
      const savedUser = { id: updated.userId, first_name: updated.firstName, last_name: updated.lastName, username: updated.username, email: updated.email, role: TEACHER_DATA.profile.role };
      localStorage.setItem('eduhub_user', JSON.stringify(savedUser));
      await fetchTeacherProfile();
      refreshTeacherProfileDisplay();
      showTeacherProfilePanel('main');
      Swal.fire('Saved', 'Profile updated successfully.', 'success');
    } else {
      Swal.fire('Error', data.message || 'Failed to update profile.', 'error');
    }
  } catch (error) {
    Swal.fire('Error', 'Could not connect to server.', 'error');
  }
});

// Change password button
document.getElementById('btn-change-password').addEventListener('click', () => {
  showTeacherProfilePanel('change-password');
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-verification-code').value = '';
  document.getElementById('verification-code-section').style.display = 'none';
  document.getElementById('btn-send-code').style.display = 'block';
  document.getElementById('btn-save-password').style.display = 'none';
});
document.getElementById('btn-cancel-password').addEventListener('click', () => showTeacherProfilePanel('main'));
document.getElementById('btn-send-code').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/send-change-password-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TEACHER_DATA.profile.id })
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
});
document.getElementById('btn-save-password').addEventListener('click', async () => {
  const code = document.getElementById('pw-verification-code').value.trim();
  const newPw = document.getElementById('pw-new').value.trim();
  const confirm = document.getElementById('pw-confirm').value.trim();
  if (!code || !newPw || !confirm) { Swal.fire('Missing', 'All fields are required.', 'warning'); return; }
  if (code.length !== 6) { Swal.fire('Invalid', 'Please enter the 6-digit verification code.', 'warning'); return; }
  if (newPw !== confirm) { Swal.fire('Mismatch', 'New passwords do not match.', 'error'); return; }
  try {
    const response = await fetch('/api/change-password', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TEACHER_DATA.profile.id, code, newPassword: newPw })
    });
    const data = await response.json();
    if (response.ok) {
      Swal.fire('Updated', 'Password changed successfully.', 'success');
      document.getElementById('pw-new').value = '';
      document.getElementById('pw-confirm').value = '';
      document.getElementById('pw-verification-code').value = '';
      showTeacherProfilePanel('main');
    } else {
      Swal.fire('Error', data.message || 'Failed to change password.', 'error');
    }
  } catch (error) {
    Swal.fire('Error', 'Could not connect to server.', 'error');
  }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
  Swal.fire({
    title: 'Are you sure?', text: 'You will be logged out of your account.', icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Yes, logout!', cancelButtonText: 'Cancel', confirmButtonColor: '#dc2626'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('eduhub_user');
      sessionStorage.clear();
      Swal.fire({ title: 'Logged out', text: 'You have been logged out successfully.', icon: 'success', timer: 1500, showConfirmButton: false })
        .then(() => { window.location.href = '/login/login.html'; });
    }
  });
});

// =============================================
// DATE HELPERS
// =============================================
function formatDateTimeLocal(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  
  // Convert to local datetime-local format: YYYY-MM-DDTHH:MM
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
// =============================================
// UTILITY
// =============================================
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =============================================
// INIT
// =============================================
(async function init() {
  await fetchTeacherProfile();
  refreshTeacherProfileDisplay();
  await fetchAndRenderClasses();
})();