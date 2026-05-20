const DATA = {
  archivedClasses: [],
  archivedLoaded: false,
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
  },
  scores: {}
};
const state = {
  currentView: 'home',
  currentClass: null,
  currentItem: null,
  currentType: null,
  done: new Set(),
  opened: new Set()
};

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function markAsOpened(type, id) {
  state.opened.add(completionKey(type, id));
}

function hasOpened(type, id) {
  return state.opened.has(completionKey(type, id));
}

function getOpenGateMessage(type) {
  const labels = {
    material: 'You must download or view the PDF before marking this lesson as done.',
    quiz: 'You must open the quiz link before marking this as done.',
    assignment: 'You must open the assignment link before marking this as done.'
  };
  return labels[type] || 'Please open the content first.';
}

function updateStatusBadge(isDone) {
  const badgeIdMap = {
    'quiz-detail':       'quiz-status-badge',
    'material-detail':   'mat-status-badge',
    'assignment-detail': 'assignment-status-badge'
  };
  const badgeId = badgeIdMap[state.currentView];
  if (!badgeId) return;
  const badge = document.getElementById(badgeId);
  if (badge) updateStatusBadgeEl(badge, isDone);
}

function updateStatusBadgeEl(el, isDone) {
  if (!el) return;

  const textSpanMap = {
    'quiz-status-badge':       'quiz-status-text',
    'mat-status-badge':        'mat-status-text',
    'assignment-status-badge': 'assignment-status-text'
  };

  const spanId = textSpanMap[el.id];
  const textSpan = spanId
    ? document.getElementById(spanId)
    : el.querySelector('span');
  const icon = el.querySelector('i');

  if (isDone) {
    el.style.background = '#dcfce7';
    el.style.border     = '1.5px solid #86efac';
    el.style.color      = '#16a34a';
    if (icon) {
      icon.className       = 'fa-solid fa-circle-check';
      icon.style.color     = '#16a34a';
      icon.style.marginRight = '4px';
    }
    if (textSpan) {
      textSpan.textContent  = 'Finished';
      textSpan.style.color  = '#16a34a';
      textSpan.style.fontWeight = '600';
    }
  } else {
    el.style.background = '#fef3c7';
    el.style.border     = '1.5px solid #fcd34d';
    el.style.color      = '#d97706';
    if (icon) {
      icon.className       = 'fa-regular fa-circle';
      icon.style.color     = '#d97706';
      icon.style.marginRight = '4px';
    }
    if (textSpan) {
      textSpan.textContent  = 'Pending';
      textSpan.style.color  = '#d97706';
      textSpan.style.fontWeight = '600';
    }
  }
}

async function fetchStudentScores() {
  if (!DATA.profile.id) return;
  try {
    const response = await fetch(`/api/student/scores/${DATA.profile.id}`);
    if (!response.ok) throw new Error('Failed to fetch scores');
    const scores = await response.json();
    DATA.scores = {};
    scores.forEach(score => {
      const key = completionKey(score.item_type, score.item_id);
      DATA.scores[key] = {
        score: score.score,
        completed_at: score.completed_at,
        item_title: score.item_title
      };
      if (score.score !== null && score.score !== undefined) {
        state.done.add(key);
      }
    });
    return scores;
  } catch (err) {
    console.error('Error fetching scores:', err);
    return [];
  }
}

function buildAnnouncementCard(title, body, timeAgo, isUnread = false) {
  const d = document.createElement('div');
  d.className = 'announcement-card';
  d.innerHTML = `
    <div class="announcement-avatar">
      <i class="fa-regular fa-message" aria-hidden="true"></i>
    </div>
    <div class="announcement-body">
      <p class="announcement-main">${escapeHtml(title)}</p>
      <p class="announcement-sub">${escapeHtml(body)}</p>
      ${timeAgo ? `<p class="announcement-time">${timeAgo}</p>` : ''}
    </div>
    ${isUnread ? '<div class="announcement-unread-dot"></div>' : ''}
  `;
  return d;
}

function buildHomeTodoCard(item) {
  const d = document.createElement('div');
  d.className = 'todo-card';
  const key = completionKey(item.type, item.item.id);
  const scoreData = DATA.scores[key];
  const hasScore = scoreData && scoreData.score !== null && scoreData.score !== undefined;
  const scoreDisplay = hasScore ? `<span class="todo-score">⭐ Score: ${scoreData.score}/100</span>` : '';
  const isDone = state.done.has(key);
  const statusBadge = isDone
    ? `<span class="todo-done-badge" style="
        display:inline-flex;align-items:center;gap:4px;
        background:#dcfce7;color:#16a34a;font-size:12px;font-weight:600;
        padding:2px 8px;border-radius:12px;margin-top:4px;">
        <i class="fa-solid fa-check"></i> Finished
      </span>`
    : '';
  d.innerHTML = `
    <div class="todo-avatar">
      <i class="fa-solid fa-list-check" aria-hidden="true"></i>
    </div>
    <div class="todo-body">
      <p class="todo-title">${escapeHtml(item.title)}</p>
      <p class="todo-due">Due: ${formatDueDate(item.dueDate) || 'No due date'}</p>
      <p class="todo-class">${escapeHtml(item.className)}</p>
      ${scoreDisplay}
      ${statusBadge}
    </div>
  `;
  d.addEventListener('click', () => {
    setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
    openClassDetail(item.cls);
    if (item.type === 'material') openMaterialDetail(item.item, item.cls.title);
    else if (item.type === 'assignment') openAssignmentDetail(item.item, item.cls.title);
    else openQuizDetail(item.item, item.cls.title);
  });
  return d;
}

function buildEmptyState(icon, title, sub) {
  const d = document.createElement('div');
  d.className = 'empty-state';
  d.innerHTML = `
    <div class="empty-state-icon-wrap">
      <i class="${icon}" aria-hidden="true"></i>
    </div>
    <p class="empty-state-title">${title}</p>
    <p class="empty-state-sub">${sub}</p>
  `;
  return d;
}

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
  const profileIcon = document.getElementById('profile-picture-icon');
  const sidebarAvatar = document.querySelector('.sidebar .avatar');
  const topBarAvatar = document.getElementById('top-bar-avatar');
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(DATA.profile.firstName + ' ' + DATA.profile.lastName)}&background=6366f1&color=fff`;

  if (DATA.profile.profilePicture) {
    const timestamp = new Date().getTime();
    const imgUrl = `/uploads/profile-pictures/${DATA.profile.profilePicture}?t=${timestamp}`;
    if (profileImg) { profileImg.src = imgUrl; profileImg.style.display = 'block'; }
    if (profileIcon) profileIcon.style.display = 'none';
    if (topBarAvatar) {
      topBarAvatar.style.backgroundImage = `url(${imgUrl})`;
      topBarAvatar.style.backgroundSize = 'cover';
      topBarAvatar.style.backgroundPosition = 'center';
      topBarAvatar.style.backgroundColor = 'transparent';
      topBarAvatar.innerHTML = '';
    }
    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = `url(${imgUrl})`;
      sidebarAvatar.style.backgroundSize = 'cover';
      sidebarAvatar.style.backgroundPosition = 'center';
      sidebarAvatar.style.backgroundColor = 'transparent';
      sidebarAvatar.innerHTML = '';
    }
  } else {
    if (profileImg) { profileImg.src = defaultAvatar; profileImg.style.display = 'block'; }
    if (profileIcon) profileIcon.style.display = 'none';
    if (topBarAvatar) {
      topBarAvatar.style.backgroundImage = `url(${defaultAvatar})`;
      topBarAvatar.style.backgroundSize = 'cover';
      topBarAvatar.style.backgroundPosition = 'center';
      topBarAvatar.innerHTML = '';
    }
    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = `url(${defaultAvatar})`;
      sidebarAvatar.style.backgroundSize = 'cover';
      sidebarAvatar.style.backgroundPosition = 'center';
      sidebarAvatar.innerHTML = '';
    }
  }
}

async function fetchAnnouncements() {
  if (!DATA.profile.id) return;
  try {
    const res = await fetch(`/api/student/announcements?studentId=${DATA.profile.id}`);
    if (!res.ok) {
      const fallbackRes = await fetch('/api/announcements');
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        DATA.announcements = Array.isArray(data) ? data : (data.announcements || []);
      } else {
        DATA.announcements = [];
      }
    } else {
      const data = await res.json();
      DATA.announcements = Array.isArray(data) ? data : (data.announcements || []);
    }
    DATA.announcementsLoaded = true;
  } catch (err) {
    console.error('fetchAnnouncements error:', err);
    DATA.announcements = [];
    DATA.announcementsLoaded = true;
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
    const badgeEl = document.getElementById('profile-badge-classes');
    if (badgeEl) badgeEl.textContent = `${json.length} Class${json.length !== 1 ? 'es' : ''}`;
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
    items.forEach(item => state.done.add(completionKey(item.item_type, item.item_id)));
    await fetchStudentScores();
  } catch (err) {
    console.error('fetchCompletions error:', err);
  }
}

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
  if (modal) modal.style.display = 'none';
}

async function checkEnrollmentCode(code) {
  try {
    const response = await fetch(`/api/section-by-code?code=${code}`);
    if (!response.ok) {
      return { error: response.status === 404 ? 'Invalid enrollment code' : 'Could not verify code' };
    }
    return await response.json();
  } catch (error) {
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
    return response.ok
      ? { success: true, message: data.message }
      : { success: false, message: data.message };
  } catch (error) {
    return { success: false, message: 'Could not connect to server' };
  }
}

function setupJoinButton() {
  const joinBtn = document.getElementById('join-class-btn');
  if (joinBtn) {
    const newJoinBtn = joinBtn.cloneNode(true);
    joinBtn.parentNode.replaceChild(newJoinBtn, joinBtn);
    newJoinBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); showJoinModal(); });
  }
  const closeModalBtn = document.querySelector('#join-modal .close-modal');
  if (closeModalBtn) closeModalBtn.onclick = closeJoinModal;
  const cancelBtn = document.getElementById('cancel-join');
  if (cancelBtn) cancelBtn.onclick = closeJoinModal;
  const modalOverlay = document.getElementById('join-modal');
  if (modalOverlay) modalOverlay.onclick = e => { if (e.target === modalOverlay) closeJoinModal(); };
  const confirmBtn = document.getElementById('confirm-join');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      const code = document.getElementById('enrollment-code-input').value.trim().toUpperCase();
      if (!code) { Swal.fire('Error', 'Please enter an enrollment code', 'error'); return; }

      // ── FIX: guard against missing student ID before proceeding ──
      if (!DATA.profile.id) {
        Swal.fire('Error', 'Your session could not be verified. Please log out and log back in.', 'error');
        return;
      }

      closeJoinModal();
      const result = await Swal.fire({
        title: 'Join Class?', text: 'Are you sure you want to join this class?',
        icon: 'question', showCancelButton: true,
        confirmButtonText: 'Yes, join!', cancelButtonText: 'Cancel'
      });
      if (result.isConfirmed) {
        Swal.fire({ title: 'Joining...', text: 'Please wait', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
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
  if (state.currentClass) showView('class-detail');
  else { renderClasses(); showView('classes'); }
}

function setActiveNav(el) {
  if (!el) return;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

function switchDetailTab(tabName) {
  document.querySelectorAll('.detail-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.detail-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-panel-${tabName}`);
  });
}

document.addEventListener('click', e => {
  const tab = e.target.closest('.detail-tab');
  if (tab && tab.dataset.tab) switchDetailTab(tab.dataset.tab);
});

async function renderFullAnnouncements() {
  if (!DATA.announcementsLoaded) await fetchAnnouncements();
  const listEl = document.getElementById('announcements-full-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!DATA.announcements || DATA.announcements.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon-wrap"><i class="fa-regular fa-bell"></i></div><p class="empty-state-title">No announcements</p><p class="empty-state-sub">Nothing new from your teachers yet.</p></div>';
    return;
  }
  DATA.announcements.forEach(a => {
    const timeAgo = a.created_at ? formatAnnouncementTime(new Date(a.created_at)) : '';
    listEl.appendChild(buildAnnouncementCard(a.title, a.body, timeAgo, a.unread));
  });
}

async function renderHome() {
  if (!DATA.profileLoaded) await fetchProfile();
  if (!DATA.classesLoaded) await fetchClasses();
  if (!DATA.announcementsLoaded) await fetchAnnouncements();
  await fetchStudentScores();

  const welcomeHeading = document.querySelector('#view-home .welcome-heading');
  if (welcomeHeading) {
    welcomeHeading.textContent = `Welcome, ${DATA.profile.firstName || DATA.profile.username || 'Student'}!`;
  }

  const now = new Date();
  let completedCount = 0;
  let pendingCount = 0;

  DATA.classes.forEach(cls => {
    const allItems = [
      ...(cls.materials || []).map(m => ({ item: m, type: 'material' })),
      ...(cls.quizzes || []).map(q => ({ item: q, type: 'quiz' })),
      ...(cls.assignments || []).map(a => ({ item: a, type: 'assignment' }))
    ];
    allItems.forEach(({ item, type }) => {
      const key = completionKey(type, item.id);
      if (state.done.has(key)) {
        completedCount++;
      } else {
        const due = item.due_date ? new Date(item.due_date) : null;
        if (!due || due >= now) pendingCount++;
      }
    });
  });

  const statClasses = document.getElementById('stat-classes');
  const statCompleted = document.getElementById('stat-completed');
  const statPending = document.getElementById('stat-pending');
  if (statClasses) statClasses.textContent = DATA.classes.length;
  if (statCompleted) statCompleted.textContent = completedCount;
  if (statPending) statPending.textContent = pendingCount;

  const annContainer = document.getElementById('announcements-container');
  if (annContainer) {
    annContainer.innerHTML = '';
    if (!DATA.announcements || DATA.announcements.length === 0) {
      annContainer.appendChild(buildEmptyState('fa-regular fa-bell', 'No announcements', 'Nothing new from your teachers yet. Check back later.'));
    } else {
      DATA.announcements.forEach(a => {
        const timeAgo = a.created_at ? formatAnnouncementTime(new Date(a.created_at)) : '';
        annContainer.appendChild(buildAnnouncementCard(a.title, a.body, timeAgo, a.unread));
      });
    }
  }

  const todoContainer = document.getElementById('home-todo-container');
  if (todoContainer) {
    todoContainer.innerHTML = '';
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const pendingItems = [];
    DATA.classes.forEach(cls => {
      [
        ...(cls.materials || []).map(m => ({ ...m, type: 'material', cls })),
        ...(cls.quizzes || []).map(q => ({ ...q, type: 'quiz', cls })),
        ...(cls.assignments || []).map(a => ({ ...a, type: 'assignment', cls }))
      ].forEach(entry => {
        const due = entry.due_date ? new Date(entry.due_date) : null;
        if (!due || isNaN(due)) return;
        if (due >= monday && due <= sunday) {
          pendingItems.push({
            title: entry.title,
            dueDate: due,
            className: entry.cls.title,
            type: entry.type,
            item: entry,
            cls: entry.cls
          });
        }
      });
    });

    pendingItems.sort((a, b) => a.dueDate - b.dueDate);

    if (pendingItems.length === 0) {
      todoContainer.appendChild(buildEmptyState('fa-regular fa-calendar-check', 'All caught up!', 'No tasks this week. Enjoy your free time!'));
    } else {
      pendingItems.forEach(item => todoContainer.appendChild(buildHomeTodoCard(item)));
    }
  }

  document.querySelectorAll('[data-view]').forEach(el => {
    if (el.classList.contains('nav-item')) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', e => {
      e.preventDefault();
      const view = clone.dataset.view;
      setActiveNav(document.querySelector(`.nav-item[data-view="${view}"]`));
      if (view === 'todo') renderTodo();
      if (view === 'announcements') renderFullAnnouncements();
      showView(view);
    });
  });
}

function openClassDetail(cls) {
  state.currentClass = cls;

  const detailClassName = document.getElementById('detail-class-name');
  if (detailClassName) detailClassName.textContent = cls.title;

  const detailMeta = document.getElementById('detail-class-meta');
  if (detailMeta) detailMeta.textContent = cls.professor || '';

  const matList = document.getElementById('materials-list');
  if (matList) {
    matList.innerHTML = '';
    const materials = cls.materials || [];
    if (materials.length === 0) {
      matList.innerHTML = '<p class="detail-empty-msg">No lessons yet.</p>';
    } else {
      materials.forEach(mat => {
        matList.appendChild(buildDetailCard(mat, 'material', () => openMaterialDetail(mat, cls.title)));
      });
    }
  }

  const assignmentsList = document.getElementById('assignments-list');
  if (assignmentsList) {
    assignmentsList.innerHTML = '';
    const assignments = cls.assignments || [];
    if (assignments.length === 0) {
      assignmentsList.innerHTML = '<p class="detail-empty-msg">No assignments yet.</p>';
    } else {
      assignments.forEach(assign => {
        assignmentsList.appendChild(buildDetailCard(assign, 'assignment', () => openAssignmentDetail(assign, cls.title)));
      });
    }
  }

  const quizList = document.getElementById('quizzes-list');
  if (quizList) {
    quizList.innerHTML = '';
    const quizzes = cls.quizzes || [];
    if (quizzes.length === 0) {
      quizList.innerHTML = '<p class="detail-empty-msg">No quizzes yet.</p>';
    } else {
      quizzes.forEach(quiz => {
        quizList.appendChild(buildDetailCard(quiz, 'quiz', () => openQuizDetail(quiz, cls.title)));
      });
    }
  }

  switchDetailTab('materials');
  showView('class-detail');
}

function buildDetailCard(item, type, clickHandler) {
  const key = completionKey(type, item.id);
  const isDone = state.done.has(key);
  const score = DATA.scores[key]?.score;
  const hasScore = score !== null && score !== undefined;

  const iconMap = {
    material: 'fa-solid fa-book-open',
    quiz: 'fa-solid fa-clipboard-question',
    assignment: 'fa-solid fa-file-lines'
  };
  const icon = iconMap[type] || 'fa-solid fa-file';

  let subText = '';
  if (item.due_date) subText = `Due ${formatDueDate(item.due_date)}`;
  else if (item.points !== undefined) subText = `${item.points} pts`;
  if (hasScore && type !== 'material') {
    subText += (subText ? ' • ' : '') + `⭐ Score: ${score}/100`;
  }

  const el = document.createElement('div');
  el.className = (type === 'material' ? 'material-item' : 'quiz-item') + (isDone ? ' done' : '');
  el._itemId = item.id;
  el.innerHTML = `
    <div class="item-card-icon">
      <i class="${icon}"></i>
    </div>
    <div class="item-card-body">
      <p class="item-card-title">${escapeHtml(item.title)}</p>
      ${subText ? `<p class="item-card-sub">${subText}</p>` : ''}
    </div>
    ${isDone ? '<span class="item-card-badge"><i class="fa-solid fa-check"></i> Finished</span>' : ''}
  `;
  el.addEventListener('click', clickHandler);
  return el;
}

async function renderClasses() {
  const grid = document.getElementById('classes-grid');
  const archivedGrid = document.getElementById('archived-classes-grid');
  if (!grid) return;

  if (!DATA.classesLoaded) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;">Loading classes...</p>';
    await fetchClasses();
  }
  if (!DATA.archivedLoaded) await fetchArchivedClasses();

  grid.innerHTML = '';
  if (DATA.classes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="padding:48px 20px;">
        <div class="empty-state-icon-wrap"><i class="fa-solid fa-chalkboard-user"></i></div>
        <p class="empty-state-title">No classes yet</p>
        <p class="empty-state-sub">Join a class using an enrollment code from your teacher.</p>
      </div>`;
  } else {
    DATA.classes.forEach(cls => {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.style.position = 'relative';
      card.innerHTML = `
        <div class="class-card-icon"><i class="fa-solid fa-book-open"></i></div>
        <div class="class-card-info">
          <p class="class-card-title">${escapeHtml(cls.title)}</p>
          <p class="class-card-prof">${escapeHtml(cls.professor)}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="class-card-action">View Class <i class="fa-solid fa-arrow-right"></i></div>
          <button class="archive-class-btn" title="Archive class" style="
            background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;
            padding:6px 10px;cursor:pointer;color:#64748b;font-size:13px;
            display:flex;align-items:center;gap:5px;transition:all 0.2s;
            white-space:nowrap;flex-shrink:0;">
            <i class="fa-solid fa-box-archive"></i>
          </button>
        </div>
      `;
      card.querySelector('.class-card-action').addEventListener('click', e => { e.stopPropagation(); openClassDetail(cls); });
      card.querySelector('.archive-class-btn').addEventListener('click', e => { e.stopPropagation(); archiveClass(cls); });
      card.addEventListener('click', () => openClassDetail(cls));
      grid.appendChild(card);
    });
  }

  if (archivedGrid) {
    archivedGrid.innerHTML = '';
    if (DATA.archivedClasses.length === 0) {
      archivedGrid.innerHTML = `<div class="empty-state" style="padding:24px 20px;"><p class="empty-state-title" style="font-size:13px;">No archived classes</p></div>`;
    } else {
      DATA.archivedClasses.forEach(cls => {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.style.cssText = 'opacity:0.7;position:relative;';
        card.innerHTML = `
          <div class="class-card-icon" style="background:#f1f5f9;"><i class="fa-solid fa-box-archive" style="color:#94a3b8;"></i></div>
          <div class="class-card-info">
            <p class="class-card-title">${escapeHtml(cls.title)}</p>
            <p class="class-card-prof">${escapeHtml(cls.professor)}</p>
          </div>
          <button class="archive-class-btn" title="Unarchive class" style="
            background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
            padding:6px 10px;cursor:pointer;color:#16a34a;font-size:13px;
            display:flex;align-items:center;gap:5px;transition:all 0.2s;
            white-space:nowrap;flex-shrink:0;">
            <i class="fa-solid fa-rotate-left"></i> Unarchive
          </button>
        `;
        card.querySelector('.archive-class-btn').addEventListener('click', e => { e.stopPropagation(); unarchiveClass(cls); });
        archivedGrid.appendChild(card);
      });
    }
  }

  const toggle = document.getElementById('archived-toggle');
  if (toggle && archivedGrid) {
    const newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);
    let isOpen = false;
    newToggle.addEventListener('click', () => {
      isOpen = !isOpen;
      archivedGrid.style.display = isOpen ? 'grid' : 'none';
      const ch = document.getElementById('archived-chevron');
      if (ch) ch.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  }
}

function openMaterialDetail(mat, className) {
  state.currentItem = mat;
  state.currentType = 'material';

  const titleEl = document.getElementById('mat-title');
  if (titleEl) titleEl.textContent = mat.title;

  const classNameEl = document.getElementById('mat-class-name');
  if (classNameEl) classNameEl.textContent = className;

  const hasPdf = mat.pdf_url && mat.pdf_url.trim() !== '' && mat.pdf_url !== '#';
  if (!hasPdf) markAsOpened('material', mat.id);

  const pdfLinkEl = document.getElementById('mat-pdf-link');
  if (pdfLinkEl) {
    if (hasPdf) {
      pdfLinkEl.href = mat.pdf_url;
      pdfLinkEl.style.display = '';
      const newPdfLink = pdfLinkEl.cloneNode(true);
      pdfLinkEl.parentNode.replaceChild(newPdfLink, pdfLinkEl);
      newPdfLink.addEventListener('click', () => {
        markAsOpened('material', mat.id);
        setTimeout(() => refreshMarkDoneButton('material', mat.id), 300);
      });
    } else {
      pdfLinkEl.href = '#';
      pdfLinkEl.style.display = 'none';
    }
  }

  const descEl = document.getElementById('mat-description');
  if (descEl) descEl.textContent = mat.description || 'No description available.';

  const matDueEl = document.getElementById('mat-due-text');
  if (matDueEl) {
    matDueEl.textContent = mat.due_date ? 'Due ' + formatDueDate(mat.due_date) : '';
    matDueEl.style.display = mat.due_date ? 'block' : 'none';
  }

  refreshMarkDoneButton('material', mat.id);

  showView('material-detail');
  updateStatusBadge(state.done.has(completionKey('material', mat.id)));
}

function openQuizDetail(quiz, className) {
  state.currentItem = quiz;
  state.currentType = 'quiz';

  const titleEl = document.getElementById('quiz-title');
  if (titleEl) titleEl.textContent = quiz.title;

  const classNameEl = document.getElementById('quiz-class-name');
  if (classNameEl) classNameEl.textContent = className;

  const hasQuizLink = quiz.link && quiz.link.trim() !== '' && quiz.link !== '#';
  if (!hasQuizLink) markAsOpened('quiz', quiz.id);

  const linkEl = document.getElementById('quiz-link');
  if (linkEl) {
    if (hasQuizLink) {
      linkEl.href = quiz.link;
      linkEl.textContent = quiz.link_label || 'Open Quiz';
      linkEl.style.display = '';
      const newLinkEl = linkEl.cloneNode(true);
      newLinkEl.textContent = quiz.link_label || 'Open Quiz';
      linkEl.parentNode.replaceChild(newLinkEl, linkEl);
      newLinkEl.addEventListener('click', () => {
        markAsOpened('quiz', quiz.id);
        setTimeout(() => refreshMarkDoneButton('quiz', quiz.id), 300);
      });
    } else {
      linkEl.style.display = 'none';
    }
  }

  const descEl = document.getElementById('quiz-description');
  if (descEl) descEl.textContent = quiz.description || 'No description available.';

  const quizDueEl = document.getElementById('quiz-due-text');
  if (quizDueEl) {
    quizDueEl.textContent = quiz.due_date ? 'Due ' + formatDueDate(quiz.due_date) : '';
    quizDueEl.style.display = quiz.due_date ? 'block' : 'none';
  }

  const key = completionKey('quiz', quiz.id);
  const scoreData = DATA.scores[key];
  const hasScore = scoreData && scoreData.score !== null && scoreData.score !== undefined;

  const scoreDisplayEl = document.getElementById('quiz-score-display');
  if (scoreDisplayEl) {
    if (hasScore) {
      scoreDisplayEl.innerHTML = `<div class="score-badge">⭐ Your Score: ${scoreData.score}/100</div>`;
      scoreDisplayEl.style.display = 'block';
    } else {
      scoreDisplayEl.style.display = 'none';
    }
  }

  const isDone = state.done.has(key) || hasScore;

  const btn = document.getElementById('quiz-mark-btn');
  if (btn) {
    const dueDate = quiz.due_date ? new Date(quiz.due_date) : null;
    const isOverdue = dueDate && new Date() > dueDate;

    if (isDone) {
      btn.innerHTML = '<i class="fa-regular fa-circle-check"></i> ✓ Finished';
      btn.className = 'mark-done-btn done-state';
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
      btn.onclick = () => markDone('quiz');
    } else if (isOverdue) {
      btn.innerHTML = '<i class="fa-regular fa-circle-xmark"></i> Past due date';
      btn.className = 'mark-done-btn dark';
      btn.disabled = true;
      btn.style.opacity = '0.55';
      btn.onclick = null;
    } else {
      refreshMarkDoneButton('quiz', quiz.id);
    }
  }

  showView('quiz-detail');
  updateStatusBadge(isDone);
}

function openAssignmentDetail(assign, className) {
  state.currentItem = assign;
  state.currentType = 'assignment';

  const titleEl = document.getElementById('assignment-title');
  if (titleEl) titleEl.textContent = assign.title;

  const classNameEl = document.getElementById('assignment-class-name');
  if (classNameEl) classNameEl.textContent = className;

  const hasAssignLink = assign.link && assign.link.trim() !== '' && assign.link !== '#';
  if (!hasAssignLink) markAsOpened('assignment', assign.id);

  const linkEl = document.getElementById('assignment-link');
  if (linkEl) {
    if (hasAssignLink) {
      linkEl.href = assign.link;
      linkEl.style.display = '';
      const newLinkEl = linkEl.cloneNode(true);
      linkEl.parentNode.replaceChild(newLinkEl, linkEl);
      newLinkEl.addEventListener('click', () => {
        markAsOpened('assignment', assign.id);
        setTimeout(() => refreshMarkDoneButton('assignment', assign.id), 300);
      });
    } else {
      linkEl.href = '#';
      linkEl.style.display = 'none';
    }
  }

  const descEl = document.getElementById('assignment-description');
  if (descEl) descEl.textContent = assign.description || '';

  const dueEl = document.getElementById('assignment-due-text');
  if (dueEl) dueEl.textContent = assign.due_date ? 'Due ' + formatDueDate(assign.due_date) : '';

  const key = completionKey('assignment', assign.id);
  const scoreData = DATA.scores[key];
  const hasScore = scoreData && scoreData.score !== null && scoreData.score !== undefined;

  const scoreDisplayEl = document.getElementById('assignment-score-display');
  if (scoreDisplayEl) {
    if (hasScore) {
      scoreDisplayEl.innerHTML = `<div class="score-badge">⭐ Your Grade: ${scoreData.score}/100</div>`;
      scoreDisplayEl.style.display = 'block';
    } else {
      scoreDisplayEl.style.display = 'none';
    }
  }

  const gradeBadge = document.getElementById('assignment-grade-badge');
  if (gradeBadge) {
    if (hasScore) {
      gradeBadge.innerHTML = `<span class="grade-chip">Graded: ${scoreData.score}/100</span>`;
      gradeBadge.style.display = 'block';
    } else {
      gradeBadge.style.display = 'none';
    }
  }

  const isDone = state.done.has(key) || hasScore;

  const btn = document.getElementById('assignment-mark-btn');
  if (btn) {
    if (isDone) {
      btn.innerHTML = '<i class="fa-regular fa-circle-check"></i> ✓ Finished';
      btn.className = 'mark-done-btn done-state';
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
      btn.onclick = () => markDone('assignment');
    } else {
      refreshMarkDoneButton('assignment', assign.id);
    }
  }

  showView('assignment-detail');
  updateStatusBadge(isDone);
}

function refreshMarkDoneButton(type, itemId) {
  const btnId = type === 'material' ? 'mat-mark-btn'
    : type === 'assignment' ? 'assignment-mark-btn'
    : 'quiz-mark-btn';
  const btn = document.getElementById(btnId);
  if (!btn) return;

  const key = completionKey(type, itemId);
  const isDone = state.done.has(key);
  const opened = hasOpened(type, itemId);

  if (isDone) {
    btn.innerHTML = '<i class="fa-regular fa-circle-check"></i> ✓ Finished';
    btn.className = 'mark-done-btn done-state';
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.title = '';
    btn.onclick = () => markDone(type);
    return;
  }

  if (!opened) {
    const actionLabel = 'Mark as Done'; 
    btn.innerHTML = `<i class="fa-solid fa-lock"></i> ${actionLabel}`;
    btn.className = 'mark-done-btn dark';
    btn.disabled = true;
    btn.title = getOpenGateMessage(type);  
    btn.style.opacity = '0.55';
    btn.style.cursor = 'not-allowed';
    btn.onclick = null;
  } else {
    btn.innerHTML = '<i class="fa-regular fa-circle-check"></i> Mark as done';
    btn.className = type === 'quiz' ? 'mark-done-btn yellow' : 'mark-done-btn dark';
    btn.disabled = false;
    btn.title = '';
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.onclick = () => markDone(type);
  }
}

async function fetchArchivedClasses() {
  if (!DATA.profile.id) return;
  try {
    const response = await fetch(`/api/my-classes/archived?studentId=${DATA.profile.id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    DATA.archivedClasses = await response.json();
    DATA.archivedLoaded = true;
  } catch (error) {
    console.error('[fetchArchivedClasses] Error:', error);
    DATA.archivedClasses = [];
  }
}

async function archiveClass(cls) {
  const result = await Swal.fire({
    title: 'Archive this class?',
    text: `"${cls.title}" will be moved to your archived classes.`,
    icon: 'question', showCancelButton: true,
    confirmButtonText: 'Yes, archive it', cancelButtonText: 'Cancel',
    confirmButtonColor: '#0f1f4b'
  });
  if (!result.isConfirmed) return;
  try {
    const response = await fetch('/api/archive-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: DATA.profile.id, sectionId: cls.section_id })
    });
    const data = await response.json();
    if (response.ok) {
      Swal.fire({ icon: 'success', title: 'Archived!', text: `"${cls.title}" has been archived.`, timer: 1500, showConfirmButton: false });
      DATA.classes = DATA.classes.filter(c => c.section_id !== cls.section_id);
      DATA.archivedClasses.push(cls);
      await renderClasses();
    } else {
      Swal.fire('Error', data.message || 'Could not archive class', 'error');
    }
  } catch (err) {
    Swal.fire('Error', 'Could not connect to server', 'error');
  }
}

async function unarchiveClass(cls) {
  const result = await Swal.fire({
    title: 'Unarchive this class?',
    text: `"${cls.title}" will be moved back to your active classes.`,
    icon: 'question', showCancelButton: true,
    confirmButtonText: 'Yes, unarchive', cancelButtonText: 'Cancel',
    confirmButtonColor: '#0f1f4b'
  });
  if (!result.isConfirmed) return;
  try {
    const response = await fetch('/api/unarchive-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: DATA.profile.id, sectionId: cls.section_id })
    });
    const data = await response.json();
    if (response.ok) {
      Swal.fire({ icon: 'success', title: 'Unarchived!', text: `"${cls.title}" is back in your active classes.`, timer: 1500, showConfirmButton: false });
      DATA.archivedClasses = DATA.archivedClasses.filter(c => c.section_id !== cls.section_id);
      DATA.classes.push(cls);
      await renderClasses();
    } else {
      Swal.fire('Error', data.message || 'Could not unarchive class', 'error');
    }
  } catch (err) {
    Swal.fire('Error', 'Could not connect to server', 'error');
  }
}

async function markDone(type) {
  if (!state.currentItem) return;
  const id = state.currentItem.id;
  const key = completionKey(type, id);
  const btnId = type === 'material' ? 'mat-mark-btn' : type === 'assignment' ? 'assignment-mark-btn' : 'quiz-mark-btn';
  const btn = document.getElementById(btnId);
  if (btn) btn.disabled = true;

  if (state.done.has(key)) {
    const result = await Swal.fire({
      title: 'Are you sure?', text: 'Do you want to undo marking this as finished?',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Yes, undo it!', cancelButtonText: 'Cancel'
    });
    if (result.isConfirmed) {
      try {
        await fetch('/api/mark-undone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: DATA.profile.id, itemType: type, itemId: id })
        });
        state.done.delete(key);
        updateStatusBadge(false);
        refreshMarkDoneButton(type, id);
        updateItemDisplay(type, id, false);
        if (state.currentView === 'progress') renderProgress();
        if (state.currentView === 'home') renderHome();
      } catch (error) {
        Swal.fire('Error', 'Could not update the database.', 'error');
        if (btn) btn.disabled = false;
      }
    } else {
      if (btn) btn.disabled = false;
    }
  } else {
    try {
      await fetch('/api/mark-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DATA.profile.id, itemType: type, itemId: id })
      });
      state.done.add(key);
      updateStatusBadge(true);
      if (btn) {
        btn.innerHTML = '<i class="fa-regular fa-circle-check"></i> ✓ Finished';
        btn.className = 'mark-done-btn done-state';
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.onclick = () => markDone(type);
      }
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

function updateItemDisplay(type, id, isDone) {
  const selector = type === 'material'
    ? '#materials-list .material-item'
    : type === 'quiz'
      ? '#quizzes-list .quiz-item'
      : '#assignments-list .quiz-item';

  document.querySelectorAll(selector).forEach(item => {
    if (item._itemId === id) {
      isDone ? item.classList.add('done') : item.classList.remove('done');
      const existingBadge = item.querySelector('.item-card-badge');
      if (isDone && !existingBadge) {
        const badge = document.createElement('span');
        badge.className = 'item-card-badge';
        badge.innerHTML = '<i class="fa-solid fa-check"></i> Finished';
        item.appendChild(badge);
        const icon = item.querySelector('.item-card-icon');
        if (icon) { icon.style.background = 'var(--success-bg)'; icon.style.color = 'var(--success-text)'; }
      } else if (!isDone && existingBadge) {
        existingBadge.remove();
        const icon = item.querySelector('.item-card-icon');
        if (icon) { icon.style.background = ''; icon.style.color = ''; }
      }
    }
  });
}

function renderTodo() {
  const now = new Date();
  const allTodos = [];

  if (DATA.classes && DATA.classes.length > 0) {
    DATA.classes.forEach(cls => {
      [
        ...(cls.materials || []).map(m => ({ ...m, type: 'material', cls })),
        ...(cls.quizzes || []).map(q => ({ ...q, type: 'quiz', cls })),
        ...(cls.assignments || []).map(a => ({ ...a, type: 'assignment', cls }))
      ].forEach(entry => {
        const key = completionKey(entry.type, entry.id);
        if (state.done.has(key)) return;
        if (!entry.due_date) return;
        allTodos.push({
          title: entry.title,
          dueDate: new Date(entry.due_date),
          type: entry.type,
          item: entry,
          cls: entry.cls
        });
      });
    });
  }

  const assigned = allTodos.filter(t => t.dueDate >= now).sort((a, b) => a.dueDate - b.dueDate);
  const missing  = allTodos.filter(t => t.dueDate < now).sort((a, b) => a.dueDate - b.dueDate);

  const statAssigned = document.getElementById('todo-stat-assigned');
  const statMissing  = document.getElementById('todo-stat-missing');
  if (statAssigned) statAssigned.textContent = assigned.length;
  if (statMissing)  statMissing.textContent  = missing.length;

  const assignedList = document.getElementById('todo-assigned-list');
  if (assignedList) {
    assignedList.innerHTML = '';
    if (assigned.length === 0) {
      assignedList.innerHTML = '<div class="todo-empty">No assigned tasks</div>';
    } else {
      assigned.forEach(t => {
        const card = document.createElement('div');
        card.className = 'todo-page-card';
        card.innerHTML = `
          <p class="todo-title">${escapeHtml(t.title)}</p>
          <p class="todo-class-name">${escapeHtml(t.cls.title)}</p>
          <p class="todo-due">Due Date: ${formatDueDate(t.dueDate)}</p>
        `;
        card.addEventListener('click', () => {
          setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
          openClassDetail(t.cls);
          if (t.type === 'material') openMaterialDetail(t.item, t.cls.title);
          else if (t.type === 'assignment') openAssignmentDetail(t.item, t.cls.title);
          else openQuizDetail(t.item, t.cls.title);
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
        card.innerHTML = `
          <p class="todo-title">${escapeHtml(t.title)}</p>
          <p class="todo-class-name">${escapeHtml(t.cls.title)}</p>
          <p class="todo-due todo-due-overdue">Due Date: ${formatDueDate(t.dueDate)} (Overdue)</p>
        `;
        card.addEventListener('click', () => {
          setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
          openClassDetail(t.cls);
          if (t.type === 'material') openMaterialDetail(t.item, t.cls.title);
          else if (t.type === 'assignment') openAssignmentDetail(t.item, t.cls.title);
          else openQuizDetail(t.item, t.cls.title);
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
    const assignments = cls.assignments || [];
    const classTotal = materials.length + quizzes.length + assignments.length;
    const classCompleted = [
      ...materials.map(m => completionKey('material', m.id)),
      ...quizzes.map(q => completionKey('quiz', q.id)),
      ...assignments.map(a => completionKey('assignment', a.id))
    ].filter(key => state.done.has(key)).length;

    totalCompleted += classCompleted;
    totalItems += classTotal;

    const pct = classTotal > 0 ? Math.round((classCompleted / classTotal) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'progress-card';
    card.innerHTML = `
      <div class="progress-card-icon"><i class="fa-solid fa-book-open"></i></div>
      <div class="progress-card-body">
        <div class="progress-card-header">
          <span class="progress-card-name">${escapeHtml(cls.title)}</span>
          <span class="progress-card-count">${classCompleted}/${classTotal} finished</span>
        </div>
        <div class="progress-card-pct">${pct}% complete</div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openScoresModal(cls));
    if (list) list.appendChild(card);
  });

  const overallPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
  if (summary) {
    summary.innerHTML = `
      <div class="progress-summary-card">
        <div class="progress-summary-left">
          <p class="summary-label">Overall progress</p>
          <p class="summary-value">${overallPct}%</p>
          <p class="summary-sub">${totalCompleted} of ${totalItems} items finished</p>
        </div>
        <div class="progress-summary-right">
          <div class="summary-ring">${overallPct}%</div>
        </div>
        <div class="summary-bar-track" style="margin-top:8px;">
          <div class="summary-bar-fill" style="width:${overallPct}%"></div>
        </div>
      </div>
    `;
  }
}
async function openScoresModal(cls) {
  const modal = document.getElementById('scores-modal-overlay');
  const title = document.getElementById('scores-modal-title');
  const body  = document.getElementById('scores-modal-body');
  if (!modal || !body) return;

  title.textContent = cls.title + ' - Your Progress';
  body.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">Loading scores...</div>';
  modal.classList.add('active');

  if (!DATA.profile.id) {
    body.innerHTML = `<div class="scores-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>Unable to load scores. Please try logging out and back in.</p></div>`;
    return;
  }

  try {
    const response = await fetch(`/api/student/scores/${DATA.profile.id}`);
    if (!response.ok) throw new Error('Failed to fetch scores');
    const allScores = await response.json();

    const completedItems = [];

    (cls.materials || []).forEach(m => {
      if (state.done.has(completionKey('material', m.id))) {
        const scoreData = allScores.find(s => s.item_type === 'material' && s.item_id === m.id);
        completedItems.push({
          title: m.title, type: 'material', typeLabel: 'Lesson',
          icon: 'fa-solid fa-book-open', iconClass: 'score-item-icon',
          completedAt: scoreData?.completed_at || null,
          score: scoreData?.score ?? null,
          rawItem: m
        });
      }
    });
    (cls.quizzes || []).forEach(q => {
      if (state.done.has(completionKey('quiz', q.id))) {
        const scoreData = allScores.find(s => s.item_type === 'quiz' && s.item_id === q.id);
        completedItems.push({
          title: q.title, type: 'quiz', typeLabel: 'Quiz',
          icon: 'fa-solid fa-clipboard-question', iconClass: 'score-item-icon quiz-icon',
          completedAt: scoreData?.completed_at || null,
          score: scoreData?.score ?? null,
          rawItem: q
        });
      }
    });
    (cls.assignments || []).forEach(a => {
      if (state.done.has(completionKey('assignment', a.id))) {
        const scoreData = allScores.find(s => s.item_type === 'assignment' && s.item_id === a.id);
        completedItems.push({
          title: a.title, type: 'assignment', typeLabel: 'Assignment',
          icon: 'fa-solid fa-file-lines', iconClass: 'score-item-icon assignment-icon',
          completedAt: scoreData?.completed_at || null,
          score: scoreData?.score ?? null,
          rawItem: a
        });
      }
    });

    const scoredItems = completedItems.filter(i => i.score !== null && i.score !== undefined);
    const avgScore = scoredItems.length > 0
      ? Math.round(scoredItems.reduce((sum, i) => sum + parseFloat(i.score), 0) / scoredItems.length)
      : null;

    body.innerHTML = '';

    if (avgScore !== null) {
      const summaryEl = document.createElement('div');
      summaryEl.className = 'scores-summary';
      summaryEl.innerHTML = `
        <span class="scores-summary-label"><i class="fa-solid fa-calculator"></i> Average Score</span>
        <span class="scores-summary-value">${avgScore}%</span>
      `;
      body.appendChild(summaryEl);
    }

    if (completedItems.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'scores-empty';
      emptyEl.innerHTML = `
        <i class="fa-solid fa-clipboard-list"></i>
        <p>No finished items yet.<br>Mark quizzes and assignments as done to see your progress here.</p>
      `;
      body.appendChild(emptyEl);
    } else {
      completedItems.forEach(item => {
        const dateStr = item.completedAt
          ? new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '';

        const scoreDisplay = item.type === 'material'
          ? ''
          : item.score !== null && item.score !== undefined
            ? `<div class="score-item-value ${item.score >= 75 ? 'score-pass' : 'score-fail'}">${item.score}<span class="score-item-max">/100</span></div>`
            : `<div class="score-item-value no-score">Not yet graded</div>`;

        const card = document.createElement('div');
        card.className = 'score-item-card';
        card.style.cssText = 'cursor:pointer;transition:background 0.15s;';
        card.innerHTML = `
          <div class="${item.iconClass}"><i class="${item.icon}"></i></div>
          <div class="score-item-info">
            <div class="score-item-title">${escapeHtml(item.title)}</div>
            <div class="score-item-type">${item.typeLabel}</div>
            ${dateStr ? `<div class="score-item-date">Finished: ${dateStr}</div>` : ''}
          </div>
          ${scoreDisplay}
        `;

        card.addEventListener('mouseenter', () => { card.style.background = '#f8fafc'; });
        card.addEventListener('mouseleave', () => { card.style.background = ''; });

        card.addEventListener('click', () => {
          closeScoresModal();
          setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
          openClassDetail(cls);
          if (item.type === 'material')   openMaterialDetail(item.rawItem, cls.title);
          else if (item.type === 'quiz')  openQuizDetail(item.rawItem, cls.title);
          else                            openAssignmentDetail(item.rawItem, cls.title);
        });

        body.appendChild(card);
      });
    }
  } catch (err) {
    body.innerHTML = `<div class="scores-empty"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load scores. Please try again.</p></div>`;
  }
}

function closeScoresModal() {
  const modal = document.getElementById('scores-modal-overlay');
  if (modal) modal.classList.remove('active');
}

document.addEventListener('click', e => {
  if (e.target.id === 'scores-modal-close' || e.target.closest('#scores-modal-close')) closeScoresModal();
  if (e.target.id === 'scores-modal-overlay') closeScoresModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeScoresModal(); });

function renderProfile() {
  refreshProfileDisplay();
  showProfilePanel('main');
}

function refreshProfileDisplay() {
  const p = DATA.profile;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  set('display-firstname', p.firstName);
  set('display-lastname', p.lastName);
  set('display-username', p.username);
  set('display-email', p.email);
  set('profile-username-display', p.username);
  set('profile-role-display', p.role || 'student');
  setVal('pw-username-display', p.username || 'student');
  setVal('edit-firstname', p.firstName || '');
  setVal('edit-lastname', p.lastName || '');
  setVal('edit-username', p.username || '');
  setVal('edit-email', p.email || '');

  const badgeEl = document.getElementById('profile-badge-classes');
  if (badgeEl) {
    const count = DATA.classes.length;
    badgeEl.textContent = `${count} Class${count !== 1 ? 'es' : ''}`;
  }
  updateProfilePictureDisplay();
}

function showProfilePanel(panel) {
  ['profile-main', 'profile-edit-info', 'profile-change-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const active = document.getElementById(
    panel === 'main' ? 'profile-main' :
      panel === 'edit-info' ? 'profile-edit-info' :
        'profile-change-password'
  );
  if (active) active.style.display = 'block';
}

document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', async function (e) {
    e.preventDefault();
    setActiveNav(this);
    const view = this.getAttribute('data-view');
    if (!view) return;
    switch (view) {
      case 'home':          await renderHome(); showView('home'); break;
      case 'classes':       await renderClasses(); showView('classes'); break;
      case 'progress':      renderProgress(); showView('progress'); break;
      case 'todo':          renderTodo(); showView('todo'); break;
      case 'announcements': await renderFullAnnouncements(); showView('announcements'); break;
      case 'profile':       renderProfile(); showView('profile'); break;
    }
  });
});

document.addEventListener('click', async e => {
  if (e.target.closest('#back-to-classes'))                 { goBackToClasses(); return; }
  if (e.target.closest('#back-to-class-from-material'))     { goBackToClassDetail(); return; }
  if (e.target.closest('#back-to-class-from-assignment'))   { goBackToClassDetail(); return; }
  if (e.target.closest('#back-to-class-from-quiz'))         { goBackToClassDetail(); return; }
});

document.addEventListener('change', e => {
  if (e.target.id !== 'profile-picture-input' || !e.target.files?.[0]) return;
  const file = e.target.files[0];
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
    Swal.fire('Error', 'Only JPG, PNG, GIF allowed', 'error'); return;
  }
  if (file.size > 5 * 1024 * 1024) {
    Swal.fire('Error', 'File size must be less than 5MB', 'error'); return;
  }
  const formData = new FormData();
  formData.append('profilePicture', file);
  formData.append('userId', DATA.profile.id);
  fetch('/api/upload-profile-picture', { method: 'POST', body: formData })
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
    .catch(() => Swal.fire('Error', 'Could not upload picture', 'error'));
});

document.addEventListener('click', async e => {
  if (e.target.id === 'remove-picture-btn' || e.target.closest('#remove-picture-btn')) {
    const result = await Swal.fire({
      title: 'Remove picture?', text: 'Your profile picture will be removed.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Remove', cancelButtonText: 'Cancel'
    });
    if (result.isConfirmed) {
      try {
        const response = await fetch('/api/remove-profile-picture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: DATA.profile.id })
        });
        if (response.ok) {
          DATA.profile.profilePicture = null;
          updateProfilePictureDisplay();
          Swal.fire('Removed', 'Profile picture removed.', 'success');
        } else {
          Swal.fire('Error', 'Failed to remove picture.', 'error');
        }
      } catch (error) {
        Swal.fire('Error', 'Could not connect to server.', 'error');
      }
    }
  }
});

document.addEventListener('click', async e => {
  if (e.target.id === 'upload-picture-btn') document.getElementById('profile-picture-input').click();
  if (e.target.id === 'btn-edit-profile') showProfilePanel('edit-info');
  if (e.target.id === 'btn-cancel-edit') showProfilePanel('main');
  if (e.target.id === 'btn-cancel-password') showProfilePanel('main');

  if (e.target.id === 'btn-change-password') {
    showProfilePanel('change-password');
    ['pw-new', 'pw-confirm', 'pw-verification-code'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const vcSection = document.getElementById('verification-code-section');
    const sendBtn   = document.getElementById('btn-send-code');
    const saveBtn   = document.getElementById('btn-save-password');
    if (vcSection) vcSection.style.display = 'none';
    if (sendBtn)   sendBtn.style.display   = 'block';
    if (saveBtn)   saveBtn.style.display   = 'none';
  }

  if (e.target.id === 'btn-send-code') {
    try {
      const response = await fetch('/api/send-change-password-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      lastName:  document.getElementById('edit-lastname').value.trim(),
      username:  document.getElementById('edit-username').value.trim(),
      email:     document.getElementById('edit-email').value.trim()
    };
    if (!updated.firstName || !updated.lastName || !updated.username || !updated.email) {
      Swal.fire('Missing', 'All fields are required', 'warning'); return;
    }
    try {
      const response = await fetch('/api/update-profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
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
    const code    = document.getElementById('pw-verification-code').value.trim();
    const newPw   = document.getElementById('pw-new').value.trim();
    const confirm = document.getElementById('pw-confirm').value.trim();
    if (!code || !newPw || !confirm) { Swal.fire('Missing', 'All fields are required', 'warning'); return; }
    if (code.length !== 6) { Swal.fire('Invalid', 'Enter 6-digit code', 'warning'); return; }
    if (newPw !== confirm) { Swal.fire('Mismatch', 'Passwords do not match', 'error'); return; }
    try {
      const response = await fetch('/api/change-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
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
      title: 'Logout?', text: 'You will be logged out of your account',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Yes, logout!', cancelButtonText: 'Cancel'
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

(function setupSearch() {
  const input    = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    dropdown.innerHTML = '';
    if (!q) { dropdown.classList.add('hidden'); return; }

    const results = [];
    DATA.classes.forEach(cls => {
      if (cls.title.toLowerCase().includes(q)) results.push({ type: 'class', label: cls.title, sub: cls.professor, cls });
      (cls.materials   || []).forEach(m  => { if (m.title.toLowerCase().includes(q))  results.push({ type: 'material',   label: m.title,  sub: cls.title, cls, item: m  }); });
      (cls.quizzes     || []).forEach(qz => { if (qz.title.toLowerCase().includes(q)) results.push({ type: 'quiz',       label: qz.title, sub: cls.title, cls, item: qz }); });
      (cls.assignments || []).forEach(a  => { if (a.title.toLowerCase().includes(q))  results.push({ type: 'assignment', label: a.title,  sub: cls.title, cls, item: a  }); });
    });

    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-no-results">No results found</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    results.slice(0, 8).forEach(r => {
      const el = document.createElement('div');
      el.className = 'search-result-item';
      el.innerHTML = `
        <span class="search-result-type type-${r.type === 'assignment' ? 'quiz' : r.type}">${r.type}</span>
        <p class="search-result-title">${escapeHtml(r.label)}</p>
        <p class="search-result-sub">${escapeHtml(r.sub)}</p>
      `;
      el.addEventListener('click', () => {
        input.value = '';
        dropdown.classList.add('hidden');
        setActiveNav(document.querySelector('.nav-item[data-view="classes"]'));
        if (r.type === 'class')       { renderClasses(); showView('classes'); openClassDetail(r.cls); }
        else if (r.type === 'material')   { openClassDetail(r.cls); openMaterialDetail(r.item, r.cls.title); }
        else if (r.type === 'quiz')       { openClassDetail(r.cls); openQuizDetail(r.item, r.cls.title); }
        else if (r.type === 'assignment') { openClassDetail(r.cls); openAssignmentDetail(r.item, r.cls.title); }
      });
      dropdown.appendChild(el);
    });

    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-bar')) dropdown.classList.add('hidden');
  });
})();

(async function init() {
  await fetchProfile();
  await fetchClasses();
  await fetchArchivedClasses();
  await fetchAnnouncements();
  await fetchCompletions();
  setupJoinButton();
  updateProfilePictureDisplay();
  const homeNav = document.querySelector('.nav-item[data-view="home"]');
  if (homeNav) setActiveNav(homeNav);
  await renderHome();
  showView('home');
})();

(function () {
  const submitFileZone     = document.getElementById('assignment-submit-file-zone');
  const submitFileInput    = document.getElementById('assignment-submit-file-input');
  const submitBrowseBtn    = document.getElementById('assignment-submit-browse-btn');
  const submitFilePreview  = document.getElementById('assignment-submit-file-preview');
  const submitFileTypeBtn  = document.getElementById('assign-submit-file-type-btn');
  const submitLinkTypeBtn  = document.getElementById('assign-submit-link-type-btn');
  const submitLinkGroup    = document.getElementById('assignment-submit-link-group');
  const submitBtn          = document.getElementById('btn-submit-assignment');
  const successMsg         = document.getElementById('submission-success-msg');

  let selectedFile = null;

  if (submitFileTypeBtn && submitLinkTypeBtn) {
    submitFileTypeBtn.addEventListener('click', function () {
      submitFileTypeBtn.classList.add('active');
      submitLinkTypeBtn.classList.remove('active');
      if (submitFileZone)  submitFileZone.classList.remove('hidden');
      if (submitLinkGroup) submitLinkGroup.classList.add('hidden');
    });
    submitLinkTypeBtn.addEventListener('click', function () {
      submitLinkTypeBtn.classList.add('active');
      submitFileTypeBtn.classList.remove('active');
      if (submitLinkGroup) submitLinkGroup.classList.remove('hidden');
      if (submitFileZone)  submitFileZone.classList.add('hidden');
    });
  }

  if (submitBrowseBtn && submitFileInput) {
    submitBrowseBtn.addEventListener('click', function (e) { e.stopPropagation(); submitFileInput.click(); });
  }

  if (submitFileZone && submitFileInput) {
    submitFileZone.addEventListener('click',    function () { submitFileInput.click(); });
    submitFileZone.addEventListener('dragover', function (e) { e.preventDefault(); submitFileZone.classList.add('drag-over'); });
    submitFileZone.addEventListener('dragleave',function (e) { e.preventDefault(); submitFileZone.classList.remove('drag-over'); });
    submitFileZone.addEventListener('drop',     function (e) {
      e.preventDefault();
      submitFileZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
    });
  }

  if (submitFileInput) {
    submitFileInput.addEventListener('change', function () {
      if (submitFileInput.files.length > 0) handleFileSelection(submitFileInput.files[0]);
    });
  }

  function handleFileSelection(file) {
    selectedFile = file;
    if (submitFilePreview) {
      submitFilePreview.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'file-preview-item';
      item.innerHTML = `
        <div class="file-preview-item-left">
          <i class="fa-solid fa-file" style="color: var(--accent);"></i>
          <div>
            <div class="file-preview-name">${escapeHTML(file.name)}</div>
            <div class="file-preview-size">${formatFileSize(file.size)}</div>
          </div>
        </div>
        <button class="file-preview-remove" title="Remove file">&times;</button>
      `;
      item.querySelector('.file-preview-remove').addEventListener('click', function (e) {
        e.stopPropagation();
        selectedFile = null;
        submitFilePreview.innerHTML = '';
        submitFileInput.value = '';
      });
      submitFilePreview.appendChild(item);
    }
    if (successMsg) successMsg.classList.add('hidden');
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async function () {
      const isLinkMode = submitLinkTypeBtn && submitLinkTypeBtn.classList.contains('active');
      if (!state.currentItem) { Swal.fire('Error', 'No assignment selected', 'error'); return; }
      if (isLinkMode) {
        const linkInput = document.getElementById('assignment-submit-link-input');
        if (!linkInput || !linkInput.value.trim()) {
          Swal.fire({ icon: 'warning', title: 'Missing Link', text: 'Please paste a submission link.', confirmButtonColor: '#0f1f4b' });
          return;
        }
        await submitAssignmentSubmission(linkInput.value.trim(), null);
      } else {
        if (!selectedFile) {
          Swal.fire({ icon: 'warning', title: 'No File Selected', text: 'Please select a file to submit.', confirmButtonColor: '#0f1f4b' });
          return;
        }
        await submitAssignmentSubmission(null, selectedFile);
      }
    });
  }

  async function submitAssignmentSubmission(link, file) {
    const formData = new FormData();
    formData.append('studentId',    DATA.profile.id);
    formData.append('assignmentId', state.currentItem.id);
    formData.append('sectionId',    state.currentClass?.section_id || '');
    if (link) formData.append('submissionLink', link);
    if (file) formData.append('submissionFile', file);

    try {
      const response = await fetch('/api/submit-assignment', { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'Submitted!', text: 'Your assignment has been submitted successfully.', confirmButtonColor: '#0f1f4b' });
        await fetch('/api/mark-done', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: DATA.profile.id, itemType: 'assignment', itemId: state.currentItem.id })
        });
        const key = completionKey('assignment', state.currentItem.id);
        state.done.add(key);
        if (successMsg) successMsg.classList.remove('hidden');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Submitted'; }
        const assignMarkBtn = document.getElementById('assignment-mark-btn');
        if (assignMarkBtn) {
          assignMarkBtn.innerHTML = '<i class="fa-regular fa-circle-check"></i> ✓ Finished';
          assignMarkBtn.className = 'mark-done-btn done-state';
          assignMarkBtn.disabled  = false;
          assignMarkBtn.style.opacity = '';
          assignMarkBtn.onclick   = () => markDone('assignment');
        }
        updateStatusBadge(true);
        updateItemDisplay('assignment', state.currentItem.id, true);
      } else {
        Swal.fire('Error', data.message || 'Submission failed', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Could not connect to server', 'error');
    }
  }
})();

(function () {
  const quizSubmitFileZone    = document.getElementById('quiz-submit-file-zone');
  const quizSubmitFileInput   = document.getElementById('quiz-submit-file-input');
  const quizSubmitBrowseBtn   = document.getElementById('quiz-submit-browse-btn');
  const quizSubmitFilePreview = document.getElementById('quiz-submit-file-preview');
  const quizSubmitFileTypeBtn = document.getElementById('quiz-submit-file-type-btn');
  const quizSubmitLinkTypeBtn = document.getElementById('quiz-submit-link-type-btn');
  const quizSubmitLinkGroup   = document.getElementById('quiz-submit-link-group');
  const quizSubmitBtn         = document.getElementById('btn-submit-quiz');
  const quizSuccessMsg        = document.getElementById('quiz-submission-success-msg');

  let quizSelectedFile = null;

  if (quizSubmitFileTypeBtn && quizSubmitLinkTypeBtn) {
    quizSubmitFileTypeBtn.addEventListener('click', function () {
      quizSubmitFileTypeBtn.classList.add('active');
      quizSubmitLinkTypeBtn.classList.remove('active');
      if (quizSubmitFileZone)  quizSubmitFileZone.classList.remove('hidden');
      if (quizSubmitLinkGroup) quizSubmitLinkGroup.classList.add('hidden');
    });
    quizSubmitLinkTypeBtn.addEventListener('click', function () {
      quizSubmitLinkTypeBtn.classList.add('active');
      quizSubmitFileTypeBtn.classList.remove('active');
      if (quizSubmitLinkGroup) quizSubmitLinkGroup.classList.remove('hidden');
      if (quizSubmitFileZone)  quizSubmitFileZone.classList.add('hidden');
    });
  }

  if (quizSubmitBrowseBtn && quizSubmitFileInput) {
    quizSubmitBrowseBtn.addEventListener('click', function (e) { e.stopPropagation(); quizSubmitFileInput.click(); });
  }

  if (quizSubmitFileZone && quizSubmitFileInput) {
    quizSubmitFileZone.addEventListener('click',    function () { quizSubmitFileInput.click(); });
    quizSubmitFileZone.addEventListener('dragover', function (e) { e.preventDefault(); quizSubmitFileZone.classList.add('drag-over'); });
    quizSubmitFileZone.addEventListener('dragleave',function (e) { e.preventDefault(); quizSubmitFileZone.classList.remove('drag-over'); });
    quizSubmitFileZone.addEventListener('drop',     function (e) {
      e.preventDefault();
      quizSubmitFileZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handleQuizFileSelection(e.dataTransfer.files[0]);
    });
  }

  if (quizSubmitFileInput) {
    quizSubmitFileInput.addEventListener('change', function () {
      if (quizSubmitFileInput.files.length > 0) handleQuizFileSelection(quizSubmitFileInput.files[0]);
    });
  }

  function handleQuizFileSelection(file) {
    quizSelectedFile = file;
    if (quizSubmitFilePreview) {
      quizSubmitFilePreview.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'file-preview-item';
      item.innerHTML = `
        <div class="file-preview-item-left">
          <i class="fa-solid fa-file" style="color: #7c3aed;"></i>
          <div>
            <div class="file-preview-name">${escapeHTML(file.name)}</div>
            <div class="file-preview-size">${formatQuizFileSize(file.size)}</div>
          </div>
        </div>
        <button class="file-preview-remove" title="Remove file">&times;</button>
      `;
      item.querySelector('.file-preview-remove').addEventListener('click', function (e) {
        e.stopPropagation();
        quizSelectedFile = null;
        quizSubmitFilePreview.innerHTML = '';
        quizSubmitFileInput.value = '';
      });
      quizSubmitFilePreview.appendChild(item);
    }
    if (quizSuccessMsg) quizSuccessMsg.classList.add('hidden');
  }

  function formatQuizFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (quizSubmitBtn) {
    quizSubmitBtn.addEventListener('click', async function () {
      const isLinkMode = quizSubmitLinkTypeBtn && quizSubmitLinkTypeBtn.classList.contains('active');
      if (!state.currentItem) { Swal.fire('Error', 'No quiz selected', 'error'); return; }
      if (isLinkMode) {
        const linkInput = document.getElementById('quiz-submit-link-input');
        if (!linkInput || !linkInput.value.trim()) {
          Swal.fire({ icon: 'warning', title: 'Missing Link', text: 'Please paste a submission link.', confirmButtonColor: '#0f1f4b' });
          return;
        }
        await submitQuizSubmission(linkInput.value.trim(), null);
      } else {
        if (!quizSelectedFile) {
          Swal.fire({ icon: 'warning', title: 'No File Selected', text: 'Please select a file to submit.', confirmButtonColor: '#0f1f4b' });
          return;
        }
        await submitQuizSubmission(null, quizSelectedFile);
      }
    });
  }

  async function submitQuizSubmission(link, file) {
    const formData = new FormData();
    formData.append('studentId', DATA.profile.id);
    formData.append('quizId',    state.currentItem.id);
    formData.append('sectionId', state.currentClass?.section_id || '');
    if (link) formData.append('submissionLink', link);
    if (file) formData.append('submissionFile', file);

    try {
      const response = await fetch('/api/submit-quiz', { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'Submitted!', text: 'Your quiz has been submitted successfully.', confirmButtonColor: '#0f1f4b' });
        await fetch('/api/mark-done', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: DATA.profile.id, itemType: 'quiz', itemId: state.currentItem.id })
        });
        const key = completionKey('quiz', state.currentItem.id);
        state.done.add(key);
        if (quizSuccessMsg) quizSuccessMsg.classList.remove('hidden');
        if (quizSubmitBtn) { quizSubmitBtn.disabled = true; quizSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Submitted'; }
        const quizMarkBtn = document.getElementById('quiz-mark-btn');
        if (quizMarkBtn) {
          quizMarkBtn.innerHTML = '<i class="fa-regular fa-circle-check"></i> ✓ Finished';
          quizMarkBtn.className = 'mark-done-btn done-state';
          quizMarkBtn.disabled  = false;
          quizMarkBtn.style.opacity = '';
          quizMarkBtn.onclick   = () => markDone('quiz');
        }
        updateStatusBadge(true);
        updateItemDisplay('quiz', state.currentItem.id, true);
      } else {
        Swal.fire('Error', data.message || 'Submission failed', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Could not connect to server', 'error');
    }
  }
})();

function openStatsModal(type) {
  const overlay = document.getElementById('stats-overlay');
  const icon    = document.getElementById('stats-modal-icon');
  const title   = document.getElementById('stats-modal-title');
  const body    = document.getElementById('stats-modal-body');
  body.innerHTML = '';

  const typeDots = { material: '#378ADD', quiz: '#639922', assignment: '#BA7517' };

  if (type === 'classes') {
    icon.style.cssText = 'background:#dbeafe;color:#1d4ed8;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px';
    icon.innerHTML = '<i class="fa-solid fa-book-open"></i>';
    title.textContent = 'Your classes';
    DATA.classes.forEach(cls => {
      const allItems = [...(cls.materials||[]), ...(cls.quizzes||[]), ...(cls.assignments||[])];
      const doneCount = allItems.filter(i =>
        state.done.has(completionKey('material',   i.id)) ||
        state.done.has(completionKey('quiz',       i.id)) ||
        state.done.has(completionKey('assignment', i.id))
      ).length;
      const pct = allItems.length > 0 ? Math.round((doneCount / allItems.length) * 100) : 0;
      const el = document.createElement('div');
      el.className = 'stats-modal-item';
      el.innerHTML = `
        <div class="stats-item-dot" style="background:#7c3aed"></div>
        <div class="stats-item-info">
          <div class="stats-item-name">${escapeHtml(cls.title)}</div>
          <div class="stats-item-meta">${escapeHtml(cls.professor || '')}</div>
          <div style="margin-top:6px;height:4px;border-radius:2px;background:#e5e7eb;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:#16a34a;border-radius:2px"></div>
          </div>
          <div style="font-size:11px;color:#6b7280;margin-top:3px">${doneCount}/${allItems.length} items finished</div>
        </div>
        <span class="stats-item-badge score">${pct}%</span>`;
      body.appendChild(el);
    });

  } else if (type === 'completed') {
    icon.style.cssText = 'background:#dcfce7;color:#16a34a;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px';
    icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    const items = [];
    DATA.classes.forEach(cls => {
      (cls.materials   ||[]).forEach(m => { if (state.done.has(completionKey('material',   m.id))) items.push({...m, type:'material',   cls}); });
      (cls.quizzes     ||[]).forEach(q => { if (state.done.has(completionKey('quiz',       q.id))) items.push({...q, type:'quiz',       cls}); });
      (cls.assignments ||[]).forEach(a => { if (state.done.has(completionKey('assignment', a.id))) items.push({...a, type:'assignment', cls}); });
    });
    title.textContent = `${items.length} completed items`;
    body.innerHTML = `<div class="stats-modal-summary"><span>Total completed</span><strong>${items.length} items</strong></div>`;
    items.forEach(item => {
      const key = completionKey(item.type, item.id);
      const scoreData = DATA.scores[key];
      const hasScore  = scoreData && scoreData.score != null;
      const badgeHtml = hasScore
        ? `<span class="stats-item-badge score">⭐ ${scoreData.score}/100</span>`
        : `<span class="stats-item-badge done">✓ Done</span>`;
      const el = document.createElement('div');
      el.className = 'stats-modal-item';
      el.innerHTML = `
        <div class="stats-item-dot" style="background:${typeDots[item.type]||'#888'}"></div>
        <div class="stats-item-info">
          <div class="stats-item-name">${escapeHtml(item.title)}</div>
          <div class="stats-item-meta">${item.type.charAt(0).toUpperCase()+item.type.slice(1)} · ${escapeHtml(item.cls.title)}</div>
        </div>
        ${badgeHtml}`;
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        closeStatsModal();
        openClassDetail(item.cls);
        if (item.type === 'material')        openMaterialDetail(item, item.cls.title);
        else if (item.type === 'quiz')       openQuizDetail(item, item.cls.title);
        else                                 openAssignmentDetail(item, item.cls.title);
      });
      body.appendChild(el);
    });

  } else { 
    icon.style.cssText = 'background:#fef3c7;color:#d97706;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px';
    icon.innerHTML = '<i class="fa-solid fa-clock"></i>';
    const now = new Date();
    const items = [];
    DATA.classes.forEach(cls => {
      [...(cls.materials   ||[]).map(m=>({...m,type:'material',   cls})),
       ...(cls.quizzes     ||[]).map(q=>({...q,type:'quiz',       cls})),
       ...(cls.assignments ||[]).map(a=>({...a,type:'assignment', cls}))]
      .forEach(entry => {
        const key = completionKey(entry.type, entry.id);
        if (!state.done.has(key) && entry.due_date && new Date(entry.due_date) >= now)
          items.push(entry);
      });
    });
    items.sort((a,b) => new Date(a.due_date)-new Date(b.due_date));
    title.textContent = `${items.length} pending items`;
    body.innerHTML = `<div class="stats-modal-summary"><span>Upcoming tasks</span><strong>${items.length} items</strong></div>`;
    if (items.length === 0) {
      body.innerHTML += '<div style="text-align:center;padding:2rem;color:#6b7280;font-size:13px">🎉 All caught up!</div>';
    }
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'stats-modal-item';
      el.innerHTML = `
        <div class="stats-item-dot" style="background:${typeDots[item.type]||'#888'}"></div>
        <div class="stats-item-info">
          <div class="stats-item-name">${escapeHtml(item.title)}</div>
          <div class="stats-item-meta">${item.type.charAt(0).toUpperCase()+item.type.slice(1)} · ${escapeHtml(item.cls.title)}</div>
        </div>
        <span class="stats-item-badge pending">Due ${formatDueDate(item.due_date)}</span>`;
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        closeStatsModal();
        openClassDetail(item.cls);
        if (item.type === 'material')        openMaterialDetail(item, item.cls.title);
        else if (item.type === 'quiz')       openQuizDetail(item, item.cls.title);
        else                                 openAssignmentDetail(item, item.cls.title);
      });
      body.appendChild(el);
    });
  }

  overlay.classList.add('active');
}

function closeStatsModal() { document.getElementById('stats-overlay').classList.remove('active'); }
function handleStatsOverlayClick(e) { if (e.target === document.getElementById('stats-overlay')) closeStatsModal(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeStatsModal(); });
