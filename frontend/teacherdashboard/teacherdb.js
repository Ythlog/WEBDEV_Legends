// =============================================
// DATA STORE (mock)
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
  codeModalSectionId: null,

  classes: [
    { id: 1, name: 'Mathematics 101', desc: 'Basic algebra and geometry' },
    { id: 2, name: 'Science 10', desc: 'Earth and life science' },
  ],
  sections: [
    { id: 1, classId: 1, name: 'Section A', code: 'MATH-A1' },
    { id: 2, classId: 1, name: 'Section B', code: 'MATH-B2' },
    { id: 3, classId: 2, name: 'Section A', code: 'SCI-A1' },
  ],
  students: [
    { id: 1, sectionId: 1, name: 'Ana Reyes', email: 'ana@student.edu', status: 'enrolled' },
    { id: 2, sectionId: 1, name: 'Ben Cruz', email: 'ben@student.edu', status: 'enrolled' },
    { id: 3, sectionId: 1, name: 'Carla Lim', email: 'carla@student.edu', status: 'pending' },
    { id: 4, sectionId: 2, name: 'David Tan', email: 'david@student.edu', status: 'enrolled' },
    { id: 5, sectionId: 3, name: 'Eva Santos', email: 'eva@student.edu', status: 'enrolled' },
  ],
  materials: [
    { id: 1, sectionId: 1, name: 'Chapter 1 Notes', desc: 'Introduction to algebra', link: 'chapter1.pdf' },
    { id: 2, sectionId: 1, name: 'Chapter 2 Notes', desc: 'Linear equations', link: 'chapter2.pdf' },
  ],
  quizzes: [
    { id: 1, sectionId: 1, name: 'Quiz 1 - Algebra Basics', desc: 'Test on chapter 1 concepts', link: 'https://forms.google.com', due: '2025-06-10' },
  ],
  assignments: [
    { id: 1, sectionId: 1, name: 'Problem Set 1', desc: 'Solve the following equations', link: '', due: '2025-06-15', points: 50 },
  ],
  completions: [
    { studentId: 1, itemType: 'material', itemId: 1 },
    { studentId: 2, itemType: 'material', itemId: 1 },
    { studentId: 1, itemType: 'quiz', itemId: 1 },
    { studentId: 1, itemType: 'assignment', itemId: 1 },
  ],
  announcements: [
    { id: 1, title: 'Welcome to the new semester!', body: 'Hello students! Classes begin this Monday. Please check your assigned sections.', audience: 'All Classes', date: '2025-06-01' },
    { id: 2, title: 'Quiz Schedule Posted', body: 'The quiz schedule for June has been posted. Please check the Quizzes section.', audience: 'Mathematics 101', date: '2025-06-03' },
  ],
  nextId: 100,
};

function genId() { return ++state.nextId; }

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
    if (view === 'classes') renderClassesView();
    else if (view === 'progress') renderProgressView();
    else if (view === 'announcements') renderAnnouncementsView();
    else if (view === 'profile') showView('profile');
  });
});

// =============================================
// DROPDOWN HELPERS
// =============================================
function closeAllDropdowns() {
  document.querySelectorAll('.card-dropdown, .section-dropdown').forEach(d => d.classList.add('hidden'));
}

document.addEventListener('click', closeAllDropdowns);

// =============================================
// CLASSES VIEW
// =============================================
function renderClassesView() {
  showView('classes');
  const grid = document.getElementById('classes-grid');
  grid.innerHTML = '';

  if (!state.classes.length) {
    grid.innerHTML = '<div class="empty-state">No classes yet. Create your first class!</div>';
    return;
  }

  state.classes.forEach(cls => {
    const sections = state.sections.filter(s => s.classId === cls.id);
    const card = document.createElement('div');
    card.className = 'class-card';
    card.innerHTML = `
      <div class="class-card-top">
        <div class="class-card-left">
          <div class="class-icon-wrap">
            <!-- Replace src with your own icon: <img src="/teacherdashboard/class-icon.png" alt="class"> -->
            <img src="/teacherdashboard/class-icon.png" alt="class icon"
              onerror="this.style.display='none';this.parentElement.innerHTML='📚'">
          </div>
          <div>
            <div class="class-card-name">${cls.name}</div>
            <div class="class-card-meta">${sections.length} section${sections.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <button class="three-dot-btn" id="dotsbtn-cls-${cls.id}"
          onclick="event.stopPropagation(); toggleClassDots(${cls.id})">
          <!-- Replace src with your own dots icon -->
          <img src="/teacherdashboard/dots.png" alt="options"
            onerror="this.outerHTML='<span style=\'font-size:20px;color:#555;letter-spacing:1px\'>⋯</span>'">
          <div class="card-dropdown hidden" id="dropdown-cls-${cls.id}">
            <button class="dropdown-item"
              onclick="event.stopPropagation(); closeAllDropdowns(); openClassModal(${cls.id})">
              <!-- Replace src with your own edit icon -->
              <img src="/teacherdashboard/edit.png" alt="edit"
                onerror="this.style.display='none'">
              Edit
            </button>
            <button class="dropdown-item danger"
              onclick="event.stopPropagation(); closeAllDropdowns(); deleteClass(${cls.id})">
              <!-- Replace src with your own delete icon -->
              <img src="/teacherdashboard/trash.png" alt="delete"
                onerror="this.style.display='none'">
              Delete
            </button>
          </div>
        </button>
      </div>
      <div class="class-card-bottom">
        <button class="view-class-btn">View class</button>
      </div>`;

    card.querySelector('.view-class-btn').addEventListener('click', e => {
      e.stopPropagation();
      openClassDetail(cls.id);
    });
    card.addEventListener('click', () => openClassDetail(cls.id));
    grid.appendChild(card);
  });
}

function toggleClassDots(clsId) {
  closeAllDropdowns();
  document.getElementById(`dropdown-cls-${clsId}`).classList.toggle('hidden');
}

function deleteClass(id) {
  Swal.fire({
    title: 'Delete class?',
    text: 'This will also delete all sections inside.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.classes = state.classes.filter(c => c.id !== id);
      state.sections = state.sections.filter(s => s.classId !== id);
      renderClassesView();
    }
  });
}

// =============================================
// CLASS DETAIL VIEW
// =============================================
function openClassDetail(classId) {
  state.currentClassId = classId;
  const cls = state.classes.find(c => c.id === classId);
  document.getElementById('class-detail-name').textContent = cls.name;
  document.getElementById('class-detail-meta').textContent = cls.desc || '';
  renderSectionsList(classId);
  showView('class-detail');
}

function renderSectionsList(classId) {
  const list = document.getElementById('sections-list');
  list.innerHTML = '';
  const sections = state.sections.filter(s => s.classId === classId);

  if (!sections.length) {
    list.innerHTML = '<div class="empty-state">No sections yet. Add your first section!</div>';
    return;
  }

  sections.forEach(sec => {
    const enrolled = state.students.filter(s => s.sectionId === sec.id && s.status === 'enrolled').length;
    const card = document.createElement('div');
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-card-left">
        <div class="section-icon-wrap">
          <!-- Replace src with your own section icon -->
          <img src="/teacherdashboard/section-icon.png" alt="section"
            onerror="this.style.display='none';this.parentElement.innerHTML='👥'">
        </div>
        <div>
          <div class="section-card-name">${sec.name}</div>
          <div class="section-card-students">${enrolled} student${enrolled !== 1 ? 's' : ''} enrolled</div>
        </div>
      </div>
      <div class="section-card-right">
        <button class="section-dots-btn" id="dotsbtn-sec-${sec.id}"
          onclick="event.stopPropagation(); toggleSectionDots(${sec.id})">
          <!-- Replace src with your own dots icon -->
          <img src="/teacherdashboard/dots.png" alt="options"
            onerror="this.outerHTML='<span style=\'font-size:20px;color:#555;letter-spacing:1px\'>⋯</span>'">
          <div class="section-dropdown hidden" id="dropdown-sec-${sec.id}">
            <button class="dropdown-item"
              onclick="event.stopPropagation(); closeAllDropdowns(); openSectionModal(${sec.id})">
              <img src="/teacherdashboard/edit.png" alt="edit" onerror="this.style.display='none'">
              Edit
            </button>
            <button class="dropdown-item"
              onclick="event.stopPropagation(); closeAllDropdowns(); viewClassCode(${sec.id})">
              <img src="/teacherdashboard/key.png" alt="code" onerror="this.style.display='none'">
              View Class Code
            </button>
            <button class="dropdown-item danger"
              onclick="event.stopPropagation(); closeAllDropdowns(); deleteSection(${sec.id})">
              <img src="/teacherdashboard/trash.png" alt="delete" onerror="this.style.display='none'">
              Delete
            </button>
          </div>
        </button>
      </div>`;

    card.addEventListener('click', () => openSectionDetail(sec.id));
    list.appendChild(card);
  });
}

function toggleSectionDots(secId) {
  closeAllDropdowns();
  document.getElementById(`dropdown-sec-${secId}`).classList.toggle('hidden');
}

function deleteSection(id) {
  Swal.fire({
    title: 'Delete section?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.sections = state.sections.filter(s => s.id !== id);
      renderSectionsList(state.currentClassId);
    }
  });
}

function viewClassCode(secId) {
  state.codeModalSectionId = secId;
  const sec = state.sections.find(s => s.id === secId);
  document.getElementById('code-display-value').textContent = sec.code || 'N/A';
  document.getElementById('edit-code-input').value = sec.code || '';
  openModal('modal-class-code');
}

// =============================================
// SECTION DETAIL VIEW
// =============================================
function openSectionDetail(sectionId) {
  state.currentSectionId = sectionId;
  const sec = state.sections.find(s => s.id === sectionId);
  const cls = state.classes.find(c => c.id === sec.classId);
  document.getElementById('section-detail-name').textContent = sec.name;
  document.getElementById('section-detail-class').textContent = cls ? cls.name : '';
  switchTab('lessons');
  showView('section-detail');
}

function switchTab(tab) {
  state.activeSectionTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'lessons') renderMaterialsList();
  else if (tab === 'quizzes') renderQuizzesList();
  else if (tab === 'assignments') renderAssignmentsList();
  else if (tab === 'students') renderStudentsList();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// =============================================
// MATERIALS
// =============================================
function renderMaterialsList() {
  const list = document.getElementById('materials-list');
  list.innerHTML = '';
  const items = state.materials.filter(m => m.sectionId === state.currentSectionId);
  if (!items.length) { list.innerHTML = '<div class="empty-state">No learning materials yet.</div>'; return; }

  items.forEach(mat => {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.innerHTML = `
      <div class="material-card-left">
        <div class="item-icon-wrap">
          <!-- Replace src with your own lesson icon -->
          <img src="/teacherdashboard/lesson-icon.png" alt="lesson"
            onerror="this.style.display='none';this.parentElement.innerHTML='📖'">
        </div>
        <div class="material-card-info">
          <span class="material-card-name">${mat.name}</span>
          <span class="material-card-desc">${mat.desc}</span>
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openMaterialModal(${mat.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMaterial(${mat.id})">Delete</button>
      </div>`;
    card.addEventListener('click', () => openMaterialDetail(mat.id));
    list.appendChild(card);
  });
}

function openMaterialDetail(matId) {
  state.currentMaterialId = matId;
  const mat = state.materials.find(m => m.id === matId);
  const sec = state.sections.find(s => s.id === mat.sectionId);
  document.getElementById('mat-section-label').textContent = sec ? sec.name : '';
  document.getElementById('mat-detail-banner').textContent = mat.name;
  const link = document.getElementById('mat-detail-link');
  link.textContent = mat.link || 'No file attached';
  link.href = mat.link || '#';
  document.getElementById('mat-detail-desc').textContent = mat.desc;
  renderDoneStudents('mat-done-students', 'material', matId);
  showView('material-detail');
}

function deleteMaterial(id) {
  Swal.fire({
    title: 'Delete material?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.materials = state.materials.filter(m => m.id !== id);
      renderMaterialsList();
    }
  });
}

// =============================================
// QUIZZES
// =============================================
function renderQuizzesList() {
  const list = document.getElementById('quizzes-list');
  list.innerHTML = '';
  const items = state.quizzes.filter(q => q.sectionId === state.currentSectionId);
  if (!items.length) { list.innerHTML = '<div class="empty-state">No quizzes yet.</div>'; return; }

  items.forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-card-left">
        <div class="item-icon-wrap">
          <!-- Replace src with your own quiz icon -->
          <img src="/teacherdashboard/quiz-icon.png" alt="quiz"
            onerror="this.style.display='none';this.parentElement.innerHTML='❓'">
        </div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${quiz.name}</span>
          <span class="quiz-card-meta">Due: ${quiz.due || 'N/A'}</span>
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openQuizModal(${quiz.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteQuiz(${quiz.id})">Delete</button>
      </div>`;
    card.addEventListener('click', () => openQuizDetail(quiz.id));
    list.appendChild(card);
  });
}

function openQuizDetail(quizId) {
  state.currentQuizId = quizId;
  const quiz = state.quizzes.find(q => q.id === quizId);
  const sec = state.sections.find(s => s.id === quiz.sectionId);
  document.getElementById('quiz-section-label').textContent = sec ? sec.name : '';
  document.getElementById('quiz-detail-banner').textContent = quiz.name;
  const link = document.getElementById('quiz-detail-link');
  link.textContent = quiz.link || 'No link attached';
  link.href = quiz.link || '#';
  document.getElementById('quiz-detail-desc').textContent = quiz.desc;
  document.getElementById('quiz-detail-due').textContent = quiz.due || 'N/A';
  renderDoneStudents('quiz-done-students', 'quiz', quizId);
  showView('quiz-detail');
}

function deleteQuiz(id) {
  Swal.fire({
    title: 'Delete quiz?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.quizzes = state.quizzes.filter(q => q.id !== id);
      renderQuizzesList();
    }
  });
}

// =============================================
// ASSIGNMENTS
// =============================================
function renderAssignmentsList() {
  const list = document.getElementById('assignments-list');
  list.innerHTML = '';
  const items = state.assignments.filter(a => a.sectionId === state.currentSectionId);
  if (!items.length) { list.innerHTML = '<div class="empty-state">No assignments yet.</div>'; return; }

  items.forEach(assign => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-card-left">
        <div class="item-icon-wrap">
          <!-- Replace src with your own assignment icon -->
          <img src="/teacherdashboard/assignment-icon.png" alt="assignment"
            onerror="this.style.display='none';this.parentElement.innerHTML='📝'">
        </div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${assign.name}</span>
          <span class="quiz-card-meta">Due: ${assign.due || 'N/A'} · ${assign.points} pts</span>
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openAssignmentModal(${assign.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAssignment(${assign.id})">Delete</button>
      </div>`;
    card.addEventListener('click', () => openAssignmentDetail(assign.id));
    list.appendChild(card);
  });
}

function openAssignmentDetail(assignId) {
  state.currentAssignmentId = assignId;
  const assign = state.assignments.find(a => a.id === assignId);
  const sec = state.sections.find(s => s.id === assign.sectionId);
  document.getElementById('assign-section-label').textContent = sec ? sec.name : '';
  document.getElementById('assign-detail-banner').textContent = assign.name;
  const link = document.getElementById('assign-detail-link');
  link.textContent = assign.link || 'No file attached';
  link.href = assign.link || '#';
  document.getElementById('assign-detail-desc').textContent = assign.desc;
  document.getElementById('assign-detail-due').textContent = assign.due || 'N/A';
  document.getElementById('assign-detail-points').textContent = assign.points + ' points';
  renderDoneStudents('assign-done-students', 'assignment', assignId);
  showView('assignment-detail');
}

function deleteAssignment(id) {
  Swal.fire({
    title: 'Delete assignment?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.assignments = state.assignments.filter(a => a.id !== id);
      renderAssignmentsList();
    }
  });
}

// =============================================
// STUDENT COMPLETION
// =============================================
function renderDoneStudents(containerId, type, itemId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const sectionId = type === 'material' ? state.materials.find(m => m.id === itemId)?.sectionId
                  : type === 'quiz'     ? state.quizzes.find(q => q.id === itemId)?.sectionId
                  : state.assignments.find(a => a.id === itemId)?.sectionId;
  const enrolled = state.students.filter(s => s.sectionId === sectionId && s.status === 'enrolled');

  enrolled.forEach(student => {
    const done = state.completions.some(
      c => c.studentId === student.id && c.itemType === type && c.itemId === itemId
    );
    const card = document.createElement('div');
    card.className = 'student-done-card';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div class="item-icon-wrap" style="background:#11265c">
          <!-- Replace src with your own student icon -->
          <img src="/teacherdashboard/student-icon.png" alt="student"
            onerror="this.style.display='none';this.parentElement.innerHTML='👤'">
        </div>
        <div>
          <div style="font-weight:600">${student.name}</div>
          <div style="font-size:12px;color:#777">${student.email}</div>
        </div>
      </div>
      <span class="student-done-badge ${done ? 'badge-done' : 'badge-pending'}">
        ${done ? '✓ Done' : 'Pending'}
      </span>`;
    container.appendChild(card);
  });

  if (!enrolled.length) {
    container.innerHTML = '<div class="empty-state">No students enrolled in this section.</div>';
  }
}

// =============================================
// STUDENTS TAB
// =============================================
function renderStudentsList() {
  const enrolledEl = document.getElementById('enrolled-students-list');
  const requestsEl = document.getElementById('join-requests-list');
  enrolledEl.innerHTML = '';
  requestsEl.innerHTML = '';

  const allStudents = state.students.filter(s => s.sectionId === state.currentSectionId);
  const enrolledStudents = allStudents.filter(s => s.status === 'enrolled');
  const pendingStudents = allStudents.filter(s => s.status === 'pending');

  if (!enrolledStudents.length) {
    enrolledEl.innerHTML = '<div class="empty-state">No enrolled students.</div>';
  } else {
    enrolledStudents.forEach(s => {
      const card = document.createElement('div');
      card.className = 'student-card';
      card.innerHTML = `
        <div class="student-card-left">
          <div class="item-icon-wrap" style="background:#11265c">
            <img src="/teacherdashboard/student-icon.png" alt="student"
              onerror="this.style.display='none';this.parentElement.innerHTML='👤'">
          </div>
          <div>
            <div class="student-name">${s.name}</div>
            <div class="student-email">${s.email}</div>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeStudent(${s.id})">Remove</button>`;
      enrolledEl.appendChild(card);
    });
  }

  if (!pendingStudents.length) {
    requestsEl.innerHTML = '<div class="empty-state">No pending join requests.</div>';
  } else {
    pendingStudents.forEach(s => {
      const card = document.createElement('div');
      card.className = 'join-request-card';
      card.innerHTML = `
        <div class="student-card-left">
          <div class="item-icon-wrap" style="background:#11265c">
            <img src="/teacherdashboard/student-icon.png" alt="student"
              onerror="this.style.display='none';this.parentElement.innerHTML='👤'">
          </div>
          <div>
            <div class="student-name">${s.name}</div>
            <div class="student-email">${s.email}</div>
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

function removeStudent(id) {
  Swal.fire({
    title: 'Remove student?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Remove',
    confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.students = state.students.filter(s => s.id !== id);
      renderStudentsList();
    }
  });
}
function approveStudent(id) {
  const s = state.students.find(st => st.id === id);
  if (s) { s.status = 'enrolled'; renderStudentsList(); }
}
function rejectStudent(id) {
  state.students = state.students.filter(s => s.id !== id);
  renderStudentsList();
}

// =============================================
// PROGRESS VIEW
// =============================================
function renderProgressView() {
  showView('progress');
  const list = document.getElementById('progress-list');
  list.innerHTML = '';

  state.sections.forEach(sec => {
    const cls = state.classes.find(c => c.id === sec.classId);
    const enrolled = state.students.filter(s => s.sectionId === sec.id && s.status === 'enrolled');
    const totalItems = state.materials.filter(m => m.sectionId === sec.id).length
                     + state.quizzes.filter(q => q.sectionId === sec.id).length
                     + state.assignments.filter(a => a.sectionId === sec.id).length;
    let doneCount = 0;
    enrolled.forEach(s => { doneCount += state.completions.filter(c => c.studentId === s.id).length; });
    const possible = enrolled.length * totalItems;
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
          <span class="progress-card-name">${sec.name}</span>
          <span class="progress-card-count">${pct}% completion</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-class-label">
          ${cls ? cls.name : ''} · ${enrolled.length} student${enrolled.length !== 1 ? 's' : ''} · ${totalItems} item${totalItems !== 1 ? 's' : ''}
        </div>
      </div>`;
    list.appendChild(card);
  });

  if (!state.sections.length) {
    list.innerHTML = '<div class="empty-state">No sections to show progress for.</div>';
  }
}

// =============================================
// ANNOUNCEMENTS VIEW
// =============================================
function renderAnnouncementsView() {
  showView('announcements');
  const list = document.getElementById('announcements-list');
  list.innerHTML = '';

  if (!state.announcements.length) {
    list.innerHTML = '<div class="empty-state">No announcements yet.</div>';
    return;
  }

  state.announcements.forEach(a => {
    const card = document.createElement('div');
    card.className = 'announcement-card';
    card.innerHTML = `
      <div class="announcement-icon-wrap">
        <!-- Replace src with your own announcement icon -->
        <img src="/teacherdashboard/announcement-icon.png" alt="announcement"
          onerror="this.style.display='none';this.parentElement.innerHTML='📢'">
      </div>
      <div class="announcement-body-wrap">
        <div class="announcement-footer">
          <div>
            <div class="announcement-title">${a.title}</div>
            <div class="announcement-meta">${a.audience} · ${a.date}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editAnnouncement(${a.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAnnouncement(${a.id})">Delete</button>
          </div>
        </div>
        <div class="announcement-body" style="margin-top:10px">${a.body}</div>
      </div>`;
    list.appendChild(card);
  });
}

function deleteAnnouncement(id) {
  Swal.fire({
    title: 'Delete announcement?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.announcements = state.announcements.filter(a => a.id !== id);
      renderAnnouncementsView();
    }
  });
}

function editAnnouncement(id) {
  const a = state.announcements.find(an => an.id === id);
  state.editingAnnouncementId = id;
  document.getElementById('announcement-title-input').value = a.title;
  document.getElementById('announcement-body-input').value = a.body;
  document.getElementById('modal-announcement-title-text').textContent = 'Edit Announcement';
  openModal('modal-announcement');
}

// =============================================
// MODALS
// =============================================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ---- Class Modal ----
function openClassModal(editId = null) {
  state.editingClassId = editId;
  const cls = editId ? state.classes.find(c => c.id === editId) : null;
  document.getElementById('modal-class-title-text').textContent = editId ? 'Edit Class' : 'Create Class';
  document.getElementById('class-name-input').value = cls ? cls.name : '';
  document.getElementById('class-desc-input').value = cls ? cls.desc : '';
  openModal('modal-class');
}
document.getElementById('btn-create-class').addEventListener('click', () => openClassModal());
document.getElementById('cancel-class-modal').addEventListener('click', () => closeModal('modal-class'));
document.getElementById('save-class-modal').addEventListener('click', () => {
  const name = document.getElementById('class-name-input').value.trim();
  const desc = document.getElementById('class-desc-input').value.trim();
  if (!name) { Swal.fire('Error', 'Class name is required.', 'error'); return; }
  if (state.editingClassId) {
    const cls = state.classes.find(c => c.id === state.editingClassId);
    cls.name = name; cls.desc = desc;
  } else {
    state.classes.push({ id: genId(), name, desc });
  }
  closeModal('modal-class');
  renderClassesView();
});

// ---- Section Modal ----
function openSectionModal(editId = null) {
  state.editingSectionId = editId;
  const sec = editId ? state.sections.find(s => s.id === editId) : null;
  document.getElementById('modal-section-title-text').textContent = editId ? 'Edit Section' : 'Add Section';
  document.getElementById('section-name-input').value = sec ? sec.name : '';
  openModal('modal-section');
}
document.getElementById('btn-add-section').addEventListener('click', () => openSectionModal());
document.getElementById('cancel-section-modal').addEventListener('click', () => closeModal('modal-section'));
document.getElementById('save-section-modal').addEventListener('click', () => {
  const name = document.getElementById('section-name-input').value.trim();
  if (!name) { Swal.fire('Error', 'Section name is required.', 'error'); return; }
  if (state.editingSectionId) {
    const sec = state.sections.find(s => s.id === state.editingSectionId);
    sec.name = name;
  } else {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    state.sections.push({ id: genId(), classId: state.currentClassId, name, code });
  }
  closeModal('modal-section');
  renderSectionsList(state.currentClassId);
});

// ---- Class Code Modal ----
document.getElementById('cancel-code-modal').addEventListener('click', () => closeModal('modal-class-code'));
document.getElementById('save-code-modal').addEventListener('click', () => {
  const code = document.getElementById('edit-code-input').value.trim();
  if (!code) { Swal.fire('Error', 'Code cannot be empty.', 'error'); return; }
  const sec = state.sections.find(s => s.id === state.codeModalSectionId);
  if (sec) sec.code = code;
  document.getElementById('code-display-value').textContent = code;
  Swal.fire({ icon: 'success', title: 'Code updated!', timer: 1200, showConfirmButton: false });
});

// ---- Material Modal ----
function openMaterialModal(editId = null) {
  state.editingMaterialId = editId;
  const mat = editId ? state.materials.find(m => m.id === editId) : null;
  document.getElementById('modal-material-title-text').textContent = editId ? 'Edit Material' : 'Add Learning Material';
  document.getElementById('material-name-input').value = mat ? mat.name : '';
  document.getElementById('material-desc-input').value = mat ? mat.desc : '';
  document.getElementById('material-link-input').value = mat ? mat.link : '';
  openModal('modal-material');
}
document.getElementById('btn-add-material').addEventListener('click', () => openMaterialModal());
document.getElementById('btn-edit-material').addEventListener('click', () => openMaterialModal(state.currentMaterialId));
document.getElementById('btn-delete-material').addEventListener('click', () => {
  Swal.fire({
    title: 'Delete material?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.materials = state.materials.filter(m => m.id !== state.currentMaterialId);
      openSectionDetail(state.currentSectionId);
      switchTab('lessons');
    }
  });
});
document.getElementById('cancel-material-modal').addEventListener('click', () => closeModal('modal-material'));
document.getElementById('save-material-modal').addEventListener('click', () => {
  const name = document.getElementById('material-name-input').value.trim();
  const desc = document.getElementById('material-desc-input').value.trim();
  const link = document.getElementById('material-link-input').value.trim();
  if (!name) { Swal.fire('Error', 'Material name is required.', 'error'); return; }
  if (state.editingMaterialId) {
    const mat = state.materials.find(m => m.id === state.editingMaterialId);
    mat.name = name; mat.desc = desc; mat.link = link;
    if (state.currentView === 'material-detail') openMaterialDetail(state.editingMaterialId);
  } else {
    state.materials.push({ id: genId(), sectionId: state.currentSectionId, name, desc, link });
  }
  closeModal('modal-material');
  if (state.currentView === 'section-detail') renderMaterialsList();
});

// ---- Quiz Modal ----
function openQuizModal(editId = null) {
  state.editingQuizId = editId;
  const quiz = editId ? state.quizzes.find(q => q.id === editId) : null;
  document.getElementById('modal-quiz-title-text').textContent = editId ? 'Edit Quiz' : 'Add Quiz';
  document.getElementById('quiz-name-input').value = quiz ? quiz.name : '';
  document.getElementById('quiz-desc-input').value = quiz ? quiz.desc : '';
  document.getElementById('quiz-link-input').value = quiz ? quiz.link : '';
  document.getElementById('quiz-due-input').value = quiz ? quiz.due : '';
  openModal('modal-quiz');
}
document.getElementById('btn-add-quiz').addEventListener('click', () => openQuizModal());
document.getElementById('btn-edit-quiz').addEventListener('click', () => openQuizModal(state.currentQuizId));
document.getElementById('btn-delete-quiz').addEventListener('click', () => {
  Swal.fire({
    title: 'Delete quiz?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.quizzes = state.quizzes.filter(q => q.id !== state.currentQuizId);
      openSectionDetail(state.currentSectionId);
      switchTab('quizzes');
    }
  });
});
document.getElementById('cancel-quiz-modal').addEventListener('click', () => closeModal('modal-quiz'));
document.getElementById('save-quiz-modal').addEventListener('click', () => {
  const name = document.getElementById('quiz-name-input').value.trim();
  const desc = document.getElementById('quiz-desc-input').value.trim();
  const link = document.getElementById('quiz-link-input').value.trim();
  const due = document.getElementById('quiz-due-input').value;
  if (!name) { Swal.fire('Error', 'Quiz title is required.', 'error'); return; }
  if (state.editingQuizId) {
    const quiz = state.quizzes.find(q => q.id === state.editingQuizId);
    quiz.name = name; quiz.desc = desc; quiz.link = link; quiz.due = due;
    if (state.currentView === 'quiz-detail') openQuizDetail(state.editingQuizId);
  } else {
    state.quizzes.push({ id: genId(), sectionId: state.currentSectionId, name, desc, link, due });
  }
  closeModal('modal-quiz');
  if (state.currentView === 'section-detail') renderQuizzesList();
});

// ---- Assignment Modal ----
function openAssignmentModal(editId = null) {
  state.editingAssignmentId = editId;
  const assign = editId ? state.assignments.find(a => a.id === editId) : null;
  document.getElementById('modal-assignment-title-text').textContent = editId ? 'Edit Assignment' : 'Add Assignment';
  document.getElementById('assignment-name-input').value = assign ? assign.name : '';
  document.getElementById('assignment-desc-input').value = assign ? assign.desc : '';
  document.getElementById('assignment-due-input').value = assign ? assign.due : '';
  document.getElementById('assignment-points-input').value = assign ? assign.points : '';
  document.getElementById('assignment-link-input').value = assign ? assign.link : '';
  openModal('modal-assignment');
}
document.getElementById('btn-add-assignment').addEventListener('click', () => openAssignmentModal());
document.getElementById('btn-edit-assignment').addEventListener('click', () => openAssignmentModal(state.currentAssignmentId));
document.getElementById('btn-delete-assignment').addEventListener('click', () => {
  Swal.fire({
    title: 'Delete assignment?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  }).then(r => {
    if (r.isConfirmed) {
      state.assignments = state.assignments.filter(a => a.id !== state.currentAssignmentId);
      openSectionDetail(state.currentSectionId);
      switchTab('assignments');
    }
  });
});
document.getElementById('cancel-assignment-modal').addEventListener('click', () => closeModal('modal-assignment'));
document.getElementById('save-assignment-modal').addEventListener('click', () => {
  const name = document.getElementById('assignment-name-input').value.trim();
  const desc = document.getElementById('assignment-desc-input').value.trim();
  const due = document.getElementById('assignment-due-input').value;
  const points = document.getElementById('assignment-points-input').value;
  const link = document.getElementById('assignment-link-input').value.trim();
  if (!name) { Swal.fire('Error', 'Assignment title is required.', 'error'); return; }
  if (state.editingAssignmentId) {
    const assign = state.assignments.find(a => a.id === state.editingAssignmentId);
    assign.name = name; assign.desc = desc; assign.due = due; assign.points = points; assign.link = link;
    if (state.currentView === 'assignment-detail') openAssignmentDetail(state.editingAssignmentId);
  } else {
    state.assignments.push({ id: genId(), sectionId: state.currentSectionId, name, desc, due, points, link });
  }
  closeModal('modal-assignment');
  if (state.currentView === 'section-detail') renderAssignmentsList();
});

// ---- Announcement Modal ----
document.getElementById('btn-new-announcement').addEventListener('click', () => {
  state.editingAnnouncementId = null;
  document.getElementById('modal-announcement-title-text').textContent = 'New Announcement';
  document.getElementById('announcement-title-input').value = '';
  document.getElementById('announcement-body-input').value = '';
  openModal('modal-announcement');
});
document.getElementById('cancel-announcement-modal').addEventListener('click', () => closeModal('modal-announcement'));
document.getElementById('save-announcement-modal').addEventListener('click', () => {
  const title = document.getElementById('announcement-title-input').value.trim();
  const body = document.getElementById('announcement-body-input').value.trim();
  const audience = document.getElementById('announcement-audience-input').value;
  if (!title || !body) { Swal.fire('Error', 'Title and message are required.', 'error'); return; }
  const today = new Date().toISOString().split('T')[0];
  if (state.editingAnnouncementId) {
    const a = state.announcements.find(an => an.id === state.editingAnnouncementId);
    a.title = title; a.body = body; a.audience = audience;
  } else {
    state.announcements.unshift({ id: genId(), title, body, audience, date: today });
  }
  closeModal('modal-announcement');
  renderAnnouncementsView();
});

// =============================================
// BACK BUTTONS
// =============================================
document.getElementById('back-to-classes').addEventListener('click', renderClassesView);
document.getElementById('back-to-class-detail').addEventListener('click', () => openClassDetail(state.currentClassId));
document.getElementById('back-to-section-lessons').addEventListener('click', () => { openSectionDetail(state.currentSectionId); switchTab('lessons'); });
document.getElementById('back-to-section-quizzes').addEventListener('click', () => { openSectionDetail(state.currentSectionId); switchTab('quizzes'); });
document.getElementById('back-to-section-assignments').addEventListener('click', () => { openSectionDetail(state.currentSectionId); switchTab('assignments'); });

// =============================================
// PROFILE
// =============================================
document.getElementById('btn-edit-profile').addEventListener('click', () => {
  document.getElementById('profile-main').style.display = 'none';
  document.getElementById('profile-change-password').style.display = 'none';
  document.getElementById('profile-edit-info').style.display = 'block';
});
document.getElementById('btn-cancel-edit').addEventListener('click', () => {
  document.getElementById('profile-edit-info').style.display = 'none';
  document.getElementById('profile-main').style.display = 'block';
});
document.getElementById('btn-save-profile').addEventListener('click', () => {
  const fn = document.getElementById('edit-firstname').value;
  const ln = document.getElementById('edit-lastname').value;
  const un = document.getElementById('edit-username').value;
  const em = document.getElementById('edit-email').value;
  document.getElementById('display-firstname').textContent = fn;
  document.getElementById('display-lastname').textContent = ln;
  document.getElementById('display-username').textContent = un;
  document.getElementById('display-email').textContent = em;
  document.getElementById('profile-username-display').textContent = un;
  document.getElementById('profile-edit-info').style.display = 'none';
  document.getElementById('profile-main').style.display = 'block';
  Swal.fire({ icon: 'success', title: 'Profile updated!', timer: 1200, showConfirmButton: false });
});
document.getElementById('btn-change-password').addEventListener('click', () => {
  document.getElementById('profile-main').style.display = 'none';
  document.getElementById('profile-edit-info').style.display = 'none';
  document.getElementById('profile-change-password').style.display = 'block';
  document.getElementById('pw-username-display').value = document.getElementById('display-username').textContent;
});
document.getElementById('btn-cancel-password').addEventListener('click', () => {
  document.getElementById('profile-change-password').style.display = 'none';
  document.getElementById('profile-main').style.display = 'block';
});
document.getElementById('btn-save-password').addEventListener('click', () => {
  const cur = document.getElementById('pw-current').value;
  const nw = document.getElementById('pw-new').value;
  const conf = document.getElementById('pw-confirm').value;
  if (!cur || !nw || !conf) { Swal.fire('Error', 'All fields are required.', 'error'); return; }
  if (nw !== conf) { Swal.fire('Error', 'Passwords do not match.', 'error'); return; }
  document.getElementById('profile-change-password').style.display = 'none';
  document.getElementById('profile-main').style.display = 'block';
  Swal.fire({ icon: 'success', title: 'Password updated!', timer: 1200, showConfirmButton: false });
});

// =============================================
// INIT
// =============================================
renderClassesView();