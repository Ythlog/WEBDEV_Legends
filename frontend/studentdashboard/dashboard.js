/* =============================================================
  Student Dashboard - Complete Working Version
============================================================= */

// DATA OBJECT
const DATA = {
  profileLoaded: false,
  announcements: [],
  announcementsLoaded: false,
  classes: [],
  classesLoaded: false,
  profile: {
    id: null,
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    role: '',
    profilePicture: null
  }
};

// STATE
const state = {
  currentView: 'home',
  currentClass: null,
  currentItem: null,
  currentType: null,
  done: new Set()
};

// Helper Functions
function completionKey(type, id) {
  return `${type}:${id}`;
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
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDueDate(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

// Fetch Functions
async function fetchProfile() {
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
      await fetchProfilePicture();
      return;
    } catch (e) {
      console.error('Error parsing saved user:', e);
    }
  }
  DATA.profileLoaded = true;
}

async function fetchProfilePicture() {
  if (!DATA.profile.id) return;
  try {
    const response = await fetch(`/api/profile-picture?userId=${DATA.profile.id}`);
    if (response.ok) {
      const data = await response.json();
      DATA.profile.profilePicture = data.profile_picture;
      updateProfilePictureDisplay();
    }
  } catch (error) {
    console.error('Error fetching profile picture:', error);
  }
}

function updateProfilePictureDisplay() {
  const profileImg = document.getElementById('profile-picture-img');
  const sidebarAvatar = document.querySelector('.avatar');
  
  if (DATA.profile.profilePicture) {
    const imgUrl = `/uploads/profile-pictures/${DATA.profile.profilePicture}`;
    if (profileImg) profileImg.src = imgUrl;
    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = `url(${imgUrl})`;
      sidebarAvatar.style.backgroundSize = 'cover';
      sidebarAvatar.style.backgroundPosition = 'center';
    }
  } else {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(DATA.profile.firstName + ' ' + DATA.profile.lastName)}&background=6366f1&color=fff`;
    if (profileImg) profileImg.src = defaultAvatar;
    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = `url(${defaultAvatar})`;
      sidebarAvatar.style.backgroundSize = 'cover';
      sidebarAvatar.style.backgroundPosition = 'center';
    }
  }
}

async function fetchAnnouncements() {
  try {
    const res = await fetch('/api/announcements');
    if (!res.ok) return;
    const data = await res.json();
    DATA.announcements = data;
    DATA.announcementsLoaded = true;
  } catch (err) {
    console.error('fetchAnnouncements error:', err);
  }
}

async function fetchClasses() {
  if (!DATA.profile.id) return;
  try {
    const response = await fetch(`/api/my-classes?studentId=${DATA.profile.id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    DATA.classes = json;
    DATA.classesLoaded = true;
  } catch (error) {
    console.error('[fetchClasses] Error:', error);
    DATA.classes = [];
    DATA.classesLoaded = false;
  }
}

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

// Join Section Functions
function showJoinModal() {
  const modal = document.getElementById('join-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('enrollment-code-input').value = '';
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('confirm-join').disabled = true;
  }
}

function closeJoinModal() {
  const modal = document.getElementById('join-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function checkEnrollmentCode(code) {
  try {
    const response = await fetch(`/api/section-by-code?code=${code}`);
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Invalid enrollment code' };
      }
      return { error: 'Could not verify code' };
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking code:', error);
    return { error: 'Network error' };
  }
}

async function joinSection(code) {
  try {
    const response = await fetch('/api/join-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentCode: code, studentId: DATA.profile.id })
    });
    
    const data = await response.json();
    if (response.ok) {
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Join section error:', error);
    return { success: false, message: 'Could not connect to server' };
  }
}

function setupJoinButton() {
  const joinBtn = document.getElementById('join-class-btn');
  if (joinBtn) {
    const newJoinBtn = joinBtn.cloneNode(true);
    joinBtn.parentNode.replaceChild(newJoinBtn, joinBtn);
    
    newJoinBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showJoinModal();
    });
  }
  
  const closeModalBtn = document.querySelector('#join-modal .close-modal');
  if (closeModalBtn) {
    closeModalBtn.onclick = closeJoinModal;
  }
  
  const cancelBtn = document.getElementById('cancel-join');
  if (cancelBtn) {
    cancelBtn.onclick = closeJoinModal;
  }
  
  const modalOverlay = document.getElementById('join-modal');
  if (modalOverlay) {
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        closeJoinModal();
      }
    };
  }
  
  const confirmBtn = document.getElementById('confirm-join');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      const code = document.getElementById('enrollment-code-input').value.trim().toUpperCase();
      if (!code) {
        Swal.fire('Error', 'Please enter an enrollment code', 'error');
        return;
      }
      
      closeJoinModal();
      
      const result = await Swal.fire({
        title: 'Join Class?',
        text: 'Are you sure you want to join this class?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, join!',
        cancelButtonText: 'Cancel'
      });
      
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Joining...',
          text: 'Please wait',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        const joinResult = await joinSection(code);
        
        if (joinResult.success) {
          Swal.fire('Success!', joinResult.message, 'success');
          await fetchClasses();
          await renderClasses();
        } else {
          Swal.fire('Error', joinResult.message, 'error');
        }
      }
    };
  }
  
  const codeInput = document.getElementById('enrollment-code-input');
  if (codeInput) {
    codeInput.oninput = async () => {
      const code = codeInput.value.trim().toUpperCase();
      const previewContainer = document.getElementById('preview-container');
      const confirmBtn = document.getElementById('confirm-join');
      
      if (code.length >= 6) {
        const result = await checkEnrollmentCode(code);
        if (result && !result.error) {
          document.getElementById('preview-class-title').textContent = result.class_title;
          document.getElementById('preview-section-name').textContent = result.section_name;
          document.getElementById('preview-professor').textContent = result.professor;
          document.getElementById('preview-subject').textContent = result.subject_code || 'N/A';
          previewContainer.style.display = 'block';
          confirmBtn.disabled = false;
        } else {
          previewContainer.style.display = 'none';
          confirmBtn.disabled = true;
        }
      } else {
        previewContainer.style.display = 'none';
        confirmBtn.disabled = true;
      }
    };
  }
}

// View Switching
const allViews = document.querySelectorAll('.page-body');

function showView(viewId) {
  allViews.forEach(v => v.classList.add('hidden'));
  const targetView = document.getElementById('view-' + viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
    state.currentView = viewId;
  }
}

function goBackToClasses() {
  state.currentClass = null;
  state.currentItem = null;
  state.currentType = null;
  renderClasses();
  showView('classes');
}

function goBackToClassDetail() {
  if (state.currentClass) {
    showView('class-detail');
  } else {
    renderClasses();
    showView('classes');
  }
}

function setActiveNav(el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

// Render Functions
async function renderHome() {
  if (!DATA.profileLoaded) await fetchProfile();
  if (!DATA.classesLoaded) await fetchClasses();
  if (!DATA.announcementsLoaded) await fetchAnnouncements();

  const welcomeHeading = document.querySelector('#view-home .welcome-heading');
  if (welcomeHeading) {
    welcomeHeading.textContent = `Welcome, ${DATA.profile.firstName || DATA.profile.username || 'Student'}!`;
  }

  const annSection = document.getElementById('announcements-section');
  if (annSection) {
    annSection.innerHTML = '<h2 class="section-title">Announcements</h2>';
    const annScrollContainer = document.createElement('div');
    annScrollContainer.className = 'announcements-scroll-container';

    if (!DATA.announcements || DATA.announcements.length === 0) {
      annScrollContainer.innerHTML = '<div class="announcement-empty">No announcements yet</div>';
    } else {
      DATA.announcements.forEach(a => {
        const card = document.createElement('div');
        card.className = 'announcement-card';
        const timestamp = a.created_at ? formatAnnouncementTime(new Date(a.created_at)) : '';
        card.innerHTML = `
          <p class="announcement-main">${a.title}</p>
          <p class="announcement-sub">${a.body}</p>
          ${timestamp ? `<p class="announcement-time">${timestamp}</p>` : ''}
        `;
        annScrollContainer.appendChild(card);
      });
    }
    annSection.appendChild(annScrollContainer);
  }

  const todoSection = document.getElementById('todo-section');
  if (todoSection) {
    todoSection.innerHTML = '<h2 class="section-title">To Do List</h2>';
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const pendingItems = [];

    if (DATA.classes && DATA.classes.length > 0) {
      DATA.classes.forEach(cls => {
        (cls.materials || []).forEach(mat => {
          if (state.done.has(completionKey('material', mat.id))) return;
          const dueDate = mat.due_date ? new Date(mat.due_date) : null;
          if (!dueDate || isNaN(dueDate.getTime())) return;
          if (dueDate >= monday && dueDate <= sunday) {
            pendingItems.push({ title: mat.title, dueDate: mat.due_date, className: cls.title, type: 'material', item: mat, cls: cls });
          }
        });
        (cls.quizzes || []).forEach(quiz => {
          if (state.done.has(completionKey('quiz', quiz.id))) return;
          const dueDate = quiz.due_date ? new Date(quiz.due_date) : null;
          if (!dueDate || isNaN(dueDate.getTime())) return;
          if (dueDate >= monday && dueDate <= sunday) {
            pendingItems.push({ title: quiz.title, dueDate: quiz.due_date, className: cls.title, type: 'quiz', item: quiz, cls: cls });
          }
        });
      });
    }

    pendingItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'todo-scroll-container';

    if (pendingItems.length === 0) {
      scrollContainer.innerHTML = '<div class="todo-empty">No pending tasks this week</div>';
    } else {
      pendingItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'todo-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <p class="todo-title">${item.title}</p>
          <p class="todo-class">${item.className}</p>
          <p class="todo-due">Due: ${formatDueDate(item.dueDate) || 'No due date'}</p>
        `;
        card.addEventListener('click', () => {
          setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
          if (item.type === 'material') {
            openClassDetail(item.cls);
            openMaterialDetail(item.item, item.cls.title);
          } else {
            openClassDetail(item.cls);
            openQuizDetail(item.item, item.cls.title);
          }
        });
        scrollContainer.appendChild(card);
      });
    }
    todoSection.appendChild(scrollContainer);
  }
}

async function renderClasses() {
  const grid = document.getElementById('classes-grid');
  if (!grid) return;
  
  if (!DATA.classesLoaded) {
    grid.innerHTML = '<p class="classes-loading">Loading classes...</p>';
    await fetchClasses();
  }
  
  grid.innerHTML = '';
  if (DATA.classes.length === 0) {
    grid.innerHTML = '<p class="classes-empty">No classes yet. Click "Join Class" to add your first class!</p>';
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

function openClassDetail(cls) {
  state.currentClass = cls;
  
  const detailClassName = document.getElementById('detail-class-name');
  if (detailClassName) detailClassName.textContent = cls.title;

  const matList = document.getElementById('materials-list');
  if (matList) {
    matList.innerHTML = '';
    (cls.materials || []).forEach(mat => {
      const el = document.createElement('div');
      const key = completionKey('material', mat.id);
      el.className = 'material-item' + (state.done.has(key) ? ' done' : '');
      el.textContent = mat.title;
      el.addEventListener('click', () => openMaterialDetail(mat, cls.title));
      matList.appendChild(el);
    });
  }

  const quizzesLabel = document.getElementById('quizzes-label');
  if (quizzesLabel) quizzesLabel.textContent = cls.title + ' Quizzes';
  
  const quizList = document.getElementById('quizzes-list');
  if (quizList) {
    quizList.innerHTML = '';
    (cls.quizzes || []).forEach(quiz => {
      const el = document.createElement('div');
      const key = completionKey('quiz', quiz.id);
      el.className = 'quiz-item' + (state.done.has(key) ? ' done' : '');
      el.textContent = quiz.title;
      el.addEventListener('click', () => openQuizDetail(quiz, cls.title));
      quizList.appendChild(el);
    });
  }

  showView('class-detail');
}

function openMaterialDetail(mat, className) {
  state.currentItem = mat;
  state.currentType = 'material';

  const matClassName = document.getElementById('mat-class-name');
  if (matClassName) matClassName.textContent = className;
  
  const matBanner = document.getElementById('mat-banner');
  if (matBanner) matBanner.textContent = mat.title;
  
  const matPdfLink = document.getElementById('mat-pdf-link');
  if (matPdfLink) matPdfLink.href = mat.pdf_url || '#';
  
  const matDescription = document.getElementById('mat-description');
  if (matDescription) matDescription.textContent = mat.description || 'No description available.';

  const matDueEl = document.getElementById('mat-due-text');
  if (matDueEl) {
    matDueEl.textContent = mat.due_date ? 'Due ' + formatDueDate(mat.due_date) : '';
    matDueEl.style.display = mat.due_date ? 'block' : 'none';
  }

  const btn = document.getElementById('mat-mark-btn');
  if (btn) {
    const key = completionKey('material', mat.id);
    if (state.done.has(key)) {
      btn.textContent = 'Marked as done ✓';
      btn.className = 'mark-done-btn done-state';
    } else {
      btn.textContent = 'Mark as done';
      btn.className = 'mark-done-btn dark';
    }
    btn.onclick = () => markDone('material');
  }

  showView('material-detail');
}

function openQuizDetail(quiz, className) {
  state.currentItem = quiz;
  state.currentType = 'quiz';

  const quizClassName = document.getElementById('quiz-class-name');
  if (quizClassName) quizClassName.textContent = className;
  
  const quizBanner = document.getElementById('quiz-banner');
  if (quizBanner) quizBanner.textContent = quiz.title;
  
  const quizLink = document.getElementById('quiz-link');
  if (quizLink) {
    quizLink.href = quiz.link || '#';
    quizLink.textContent = quiz.link_label || 'Open Quiz';
  }
  
  const quizDescription = document.getElementById('quiz-description');
  if (quizDescription) quizDescription.textContent = quiz.description || 'No description available.';

  const quizDueEl = document.getElementById('quiz-due-text');
  if (quizDueEl) {
    quizDueEl.textContent = quiz.due_date ? 'Due ' + formatDueDate(quiz.due_date) : '';
    quizDueEl.style.display = quiz.due_date ? 'block' : 'none';
  }

  const btn = document.getElementById('quiz-mark-btn');
  if (btn) {
    const key = completionKey('quiz', quiz.id);
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

// Updated markDone function with proper check mark display
async function markDone(type) {
  if (!state.currentItem) return;
  const id = state.currentItem.id;
  const key = completionKey(type, id);

  const btn = document.getElementById(type === 'material' ? 'mat-mark-btn' : 'quiz-mark-btn');
  if (btn) btn.disabled = true;

  if (state.done.has(key)) {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to undo marking this as done?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, undo it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        await fetch(`/api/mark-undone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: DATA.profile.id, itemType: type, itemId: id })
        });
        state.done.delete(key);
        if (btn) {
          btn.textContent = 'Mark as done';
          btn.className = type === 'material' ? 'mark-done-btn dark' : 'mark-done-btn yellow';
        }
        // Update the display in class detail view
        updateItemDisplay(type, id, false);
        if (state.currentView === 'progress') renderProgress();
        if (state.currentView === 'home') renderHome();
      } catch (error) {
        Swal.fire('Error', 'Could not update the database.', 'error');
      }
    }
    if (btn) btn.disabled = false;
  } else {
    try {
      await fetch(`/api/mark-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DATA.profile.id, itemType: type, itemId: id })
      });
      state.done.add(key);
      if (btn) {
        btn.textContent = '✓ Marked as done';
        btn.className = 'mark-done-btn done-state';
      }
      // Update the display in class detail view
      updateItemDisplay(type, id, true);
      if (state.currentView === 'progress') renderProgress();
      if (state.currentView === 'home') renderHome();
    } catch (error) {
      Swal.fire('Error', 'Could not save to the database.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }
}

// New function to update item display with check mark
function updateItemDisplay(type, id, isDone) {
  // Update in materials list
  if (type === 'material') {
    const materialItems = document.querySelectorAll('#materials-list .material-item');
    materialItems.forEach(item => {
      if (item._id === id || item.textContent.includes(id)) {
        if (isDone) {
          item.classList.add('done');
          item.style.textDecoration = 'line-through';
          item.style.opacity = '0.7';
        } else {
          item.classList.remove('done');
          item.style.textDecoration = 'none';
          item.style.opacity = '1';
        }
      }
    });
  }
  
  // Update in quizzes list
  if (type === 'quiz') {
    const quizItems = document.querySelectorAll('#quizzes-list .quiz-item');
    quizItems.forEach(item => {
      if (item._id === id || item.textContent.includes(id)) {
        if (isDone) {
          item.classList.add('done');
          item.style.textDecoration = 'line-through';
          item.style.opacity = '0.7';
        } else {
          item.classList.remove('done');
          item.style.textDecoration = 'none';
          item.style.opacity = '1';
        }
      }
    });
  }
}

function renderTodo() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allTodos = [];

  if (DATA.classes && DATA.classes.length > 0) {
    DATA.classes.forEach(cls => {
      (cls.materials || []).forEach(mat => {
        if (state.done.has(completionKey('material', mat.id))) return;
        if (!mat.due_date) return;
        allTodos.push({
          title: mat.title, dueDate: new Date(mat.due_date),
          type: 'material', item: mat, cls: cls
        });
      });
      (cls.quizzes || []).forEach(quiz => {
        if (state.done.has(completionKey('quiz', quiz.id))) return;
        if (!quiz.due_date) return;
        allTodos.push({
          title: quiz.title, dueDate: new Date(quiz.due_date),
          type: 'quiz', item: quiz, cls: cls
        });
      });
    });
  }

  const assigned = allTodos.filter(t => t.dueDate >= today);
  const missing = allTodos.filter(t => t.dueDate < today);

  assigned.sort((a, b) => a.dueDate - b.dueDate);
  missing.sort((a, b) => a.dueDate - b.dueDate);

  const assignedList = document.getElementById('todo-assigned-list');
  if (assignedList) {
    assignedList.innerHTML = '';
    if (assigned.length === 0) {
      assignedList.innerHTML = '<div class="todo-empty">No assigned tasks</div>';
    } else {
      assigned.forEach(t => {
        const card = document.createElement('div');
        card.className = 'todo-page-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <p class="todo-title">${t.title}</p>
          <p class="todo-class-name">${t.cls.title}</p>
          <p class="todo-due">Due Date: ${formatDueDate(t.dueDate)}</p>
        `;
        card.addEventListener('click', () => {
          setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
          if (t.type === 'material') {
            openClassDetail(t.cls);
            openMaterialDetail(t.item, t.cls.title);
          } else {
            openClassDetail(t.cls);
            openQuizDetail(t.item, t.cls.title);
          }
        });
        assignedList.appendChild(card);
      });
    }
  }

  const missingList = document.getElementById('todo-missing-list');
  if (missingList) {
    missingList.innerHTML = '';
    if (missing.length === 0) {
      missingList.innerHTML = '<div class="todo-empty">No missing tasks</div>';
    } else {
      missing.forEach(t => {
        const card = document.createElement('div');
        card.className = 'todo-missing-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <p class="todo-title">${t.title}</p>
          <p class="todo-class-name">${t.cls.title}</p>
          <p class="todo-due todo-due-overdue">Due Date: ${formatDueDate(t.dueDate)} (Overdue)</p>
        `;
        card.addEventListener('click', () => {
          setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
          if (t.type === 'material') {
            openClassDetail(t.cls);
            openMaterialDetail(t.item, t.cls.title);
          } else {
            openClassDetail(t.cls);
            openQuizDetail(t.item, t.cls.title);
          }
        });
        missingList.appendChild(card);
      });
    }
  }
}

function renderProgress() {
  const list = document.getElementById('progress-list');
  const summary = document.getElementById('progress-summary');
  if (list) list.innerHTML = '';
  
  let totalCompleted = 0;
  let totalItems = 0;
  
  DATA.classes.forEach(cls => {
    const materials = cls.materials || [];
    const quizzes = cls.quizzes || [];
    const classTotal = materials.length + quizzes.length;
    const classCompleted = [...materials.map(m => completionKey('material', m.id)), ...quizzes.map(q => completionKey('quiz', q.id))].filter(key => state.done.has(key)).length;
    
    totalCompleted += classCompleted;
    totalItems += classTotal;
    
    const pct = classTotal > 0 ? Math.round((classCompleted / classTotal) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'progress-card';
    card.innerHTML = `
      <div class="progress-card-header">
        <span class="progress-card-name">${cls.title}</span>
        <span class="progress-card-count">${classCompleted}/${classTotal}</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    list.appendChild(card);
  });
  
  const overallPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
  if (summary) {
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
  }
}

// Profile Functions
function renderProfile() {
  refreshProfileDisplay();
  showProfilePanel('main');
}

function refreshProfileDisplay() {
  const p = DATA.profile;
  const displayFirstname = document.getElementById('display-firstname');
  const displayLastname = document.getElementById('display-lastname');
  const displayUsername = document.getElementById('display-username');
  const displayEmail = document.getElementById('display-email');
  const profileUsernameDisplay = document.getElementById('profile-username-display');
  const profileRoleDisplay = document.getElementById('profile-role-display');
  const pwUsernameDisplay = document.getElementById('pw-username-display');
  const editFirstname = document.getElementById('edit-firstname');
  const editLastname = document.getElementById('edit-lastname');
  const editUsername = document.getElementById('edit-username');
  const editEmail = document.getElementById('edit-email');
  
  if (displayFirstname) displayFirstname.textContent = p.firstName;
  if (displayLastname) displayLastname.textContent = p.lastName;
  if (displayUsername) displayUsername.textContent = p.username;
  if (displayEmail) displayEmail.textContent = p.email;
  if (profileUsernameDisplay) profileUsernameDisplay.textContent = p.username;
  if (profileRoleDisplay) profileRoleDisplay.textContent = p.role || 'student';
  if (pwUsernameDisplay) pwUsernameDisplay.value = p.username || 'student';
  if (editFirstname) editFirstname.value = p.firstName || '';
  if (editLastname) editLastname.value = p.lastName || '';
  if (editUsername) editUsername.value = p.username || '';
  if (editEmail) editEmail.value = p.email || '';
  
  updateProfilePictureDisplay();
}

function showProfilePanel(panel) {
  const profileMain = document.getElementById('profile-main');
  const profileEditInfo = document.getElementById('profile-edit-info');
  const profileChangePassword = document.getElementById('profile-change-password');
  
  if (profileMain) profileMain.style.display = panel === 'main' ? 'block' : 'none';
  if (profileEditInfo) profileEditInfo.style.display = panel === 'edit-info' ? 'block' : 'none';
  if (profileChangePassword) profileChangePassword.style.display = panel === 'change-password' ? 'block' : 'none';
}

// Navigation
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', async function (e) {
    e.preventDefault();
    setActiveNav(this);
    const view = this.getAttribute('data-view');
    if (!view) return;
    switch (view) {
      case 'home':     await renderHome();    showView('home');     break;
      case 'classes':  await renderClasses(); showView('classes');  break;
      case 'progress': renderProgress();      showView('progress'); break;
      case 'todo':     renderTodo();          showView('todo');     break;
      case 'profile':  renderProfile();       showView('profile');  break;
    }
  });
});

// Back button handlers
document.addEventListener('click', async (e) => {
  if (e.target.closest('#view-class-detail .back-btn')) {
    goBackToClasses();
    return;
  }
  if (e.target.closest('#view-material-detail .back-btn')) {
    goBackToClassDetail();
    return;
  }
  if (e.target.closest('#view-quiz-detail .back-btn')) {
    goBackToClassDetail();
    return;
  }
});

// File upload
document.addEventListener('change', (e) => {
  if (e.target.id === 'profile-picture-input' && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire('Error', 'Only JPG, PNG, GIF allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Error', 'File size must be less than 5MB', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('userId', DATA.profile.id);
    
    fetch('/api/upload-profile-picture', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.filename) {
        DATA.profile.profilePicture = data.filename;
        updateProfilePictureDisplay();
        Swal.fire('Success', 'Profile picture updated!', 'success');
      } else {
        Swal.fire('Error', 'Upload failed', 'error');
      }
    })
    .catch(error => {
      Swal.fire('Error', 'Could not upload picture', 'error');
    });
  }
});

// Profile button handlers
document.addEventListener('click', async (e) => {
  if (e.target.id === 'upload-picture-btn') {
    document.getElementById('profile-picture-input').click();
  }
  
  if (e.target.id === 'btn-edit-profile') showProfilePanel('edit-info');
  if (e.target.id === 'btn-cancel-edit') showProfilePanel('main');
  if (e.target.id === 'btn-cancel-password') showProfilePanel('main');
  
  if (e.target.id === 'btn-change-password') {
    showProfilePanel('change-password');
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
    document.getElementById('pw-verification-code').value = '';
    document.getElementById('verification-code-section').style.display = 'none';
    document.getElementById('btn-send-code').style.display = 'block';
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
        Swal.fire('Code Sent', 'Verification code sent to your email', 'success');
        document.getElementById('verification-code-section').style.display = 'block';
        document.getElementById('btn-send-code').style.display = 'none';
        document.getElementById('btn-save-password').style.display = 'block';
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Could not connect to server', 'error');
    }
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
      Swal.fire('Missing', 'All fields are required', 'warning');
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
        localStorage.setItem('eduhub_user', JSON.stringify({
          id: updated.userId, first_name: updated.firstName, last_name: updated.lastName,
          username: updated.username, email: updated.email, role: DATA.profile.role
        }));
        Swal.fire('Saved', 'Profile updated', 'success');
        await fetchProfile();
        refreshProfileDisplay();
        showProfilePanel('main');
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Could not connect to server', 'error');
    }
  }
  
  if (e.target.id === 'btn-save-password') {
    const code = document.getElementById('pw-verification-code').value.trim();
    const newPw = document.getElementById('pw-new').value.trim();
    const confirm = document.getElementById('pw-confirm').value.trim();
    if (!code || !newPw || !confirm) {
      Swal.fire('Missing', 'All fields are required', 'warning');
      return;
    }
    if (code.length !== 6) {
      Swal.fire('Invalid', 'Enter 6-digit code', 'warning');
      return;
    }
    if (newPw !== confirm) {
      Swal.fire('Mismatch', 'Passwords do not match', 'error');
      return;
    }
    try {
      const response = await fetch('/api/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DATA.profile.id, code, newPassword: newPw })
      });
      const data = await response.json();
      if (response.ok) {
        Swal.fire('Updated', 'Password changed successfully', 'success');
        showProfilePanel('main');
      } else {
        Swal.fire('Error', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Could not connect to server', 'error');
    }
  }
  
  if (e.target.id === 'btn-logout') {
    Swal.fire({
      title: 'Logout?',
      text: 'You will be logged out of your account',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        localStorage.removeItem('eduhub_user');
        sessionStorage.clear();
        Swal.fire('Logged out', 'You have been logged out', 'success')
          .then(() => { window.location.href = '/login/login.html'; });
      }
    });
  }
});

// Initialization
(async function init() {
  await fetchProfile();
  await fetchClasses();
  await fetchAnnouncements();
  await fetchCompletions();
  
  setupJoinButton();
  
  const homeNav = document.querySelector('.nav-item[data-view="home"]');
  if (homeNav) setActiveNav(homeNav);
  await renderHome();
  showView('home');
})();