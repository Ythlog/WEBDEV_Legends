// =============================================
// TEACHER DASHBOARD - FULL WORKING VERSION
// =============================================

// =============================================
// TEACHER DATA
// =============================================
const TEACHER_DATA = {
  profile: { 
    id: null, 
    firstName: '', 
    lastName: '', 
    username: '', 
    email: '', 
    role: '',
    profilePicture: null
  },
  profileLoaded: false,
  classes: [],
  sections: [],
  materials: [],
  quizzes: [],
  assignments: [],
  students: [],
  allSectionsForAnnouncements: []
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
  announcements: [],
  // File upload state
  materialFile: null,
  assignmentFile: null,
  quizFile: null,
  materialUploadType: 'file',
  assignmentUploadType: 'file',
  quizUploadType: 'file'
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
      await fetchTeacherProfilePicture();
      return;
    } catch (e) { console.error('Error parsing saved user:', e); }
  }
  TEACHER_DATA.profileLoaded = true;
}

// =============================================
// PROFILE PICTURE FUNCTIONS
// =============================================
function updateTeacherProfilePicture() {
  const profileImg = document.getElementById('profile-picture-img');
  const profileIcon = document.getElementById('profile-picture-icon');
  const topBarAvatar = document.getElementById('top-bar-avatar');
  
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(TEACHER_DATA.profile.firstName + ' ' + TEACHER_DATA.profile.lastName)}&background=6366f1&color=fff`;
  
  if (TEACHER_DATA.profile.profilePicture) {
    const timestamp = new Date().getTime();
    const imgUrl = `/uploads/profile-pictures/${TEACHER_DATA.profile.profilePicture}?t=${timestamp}`;
    
    if (profileImg) {
      profileImg.src = imgUrl;
      profileImg.style.display = 'block';
    }
    if (profileIcon) {
      profileIcon.style.display = 'none';
    }
    if (topBarAvatar) {
      topBarAvatar.style.backgroundImage = `url(${imgUrl})`;
      topBarAvatar.style.backgroundSize = 'cover';
      topBarAvatar.style.backgroundPosition = 'center';
      topBarAvatar.style.backgroundColor = 'transparent';
      topBarAvatar.innerHTML = '';
    }
  } else {
    if (profileImg) {
      profileImg.src = defaultAvatar;
      profileImg.style.display = 'block';
    }
    if (profileIcon) {
      profileIcon.style.display = 'none';
    }
    if (topBarAvatar) {
      topBarAvatar.style.backgroundImage = `url(${defaultAvatar})`;
      topBarAvatar.style.backgroundSize = 'cover';
      topBarAvatar.style.backgroundPosition = 'center';
      topBarAvatar.innerHTML = '';
    }
  }
}

async function fetchTeacherProfilePicture() {
  if (!TEACHER_DATA.profile.id) return;
  try {
    const response = await fetch(`/api/profile-picture?userId=${TEACHER_DATA.profile.id}`);
    if (response.ok) {
      const data = await response.json();
      TEACHER_DATA.profile.profilePicture = data.profile_picture;
      updateTeacherProfilePicture();
    }
  } catch (error) {
    console.error('Error fetching profile picture:', error);
  }
}

// Profile picture upload handler
document.addEventListener('change', function(e) {
  if (e.target.id === 'profile-picture-input' && e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      Swal.fire('Error', 'Only JPG, PNG, GIF allowed', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Error', 'File size must be less than 5MB', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('userId', TEACHER_DATA.profile.id);
    
    fetch('/api/upload-profile-picture', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.filename) {
          TEACHER_DATA.profile.profilePicture = data.filename;
          updateTeacherProfilePicture();
          Swal.fire('Success', 'Profile picture updated!', 'success');
        } else {
          Swal.fire('Error', 'Upload failed', 'error');
        }
      })
      .catch(() => Swal.fire('Error', 'Could not upload picture', 'error'));
  }
});

// Upload button click handler
document.addEventListener('click', function(e) {
  if (e.target.id === 'upload-picture-btn' || e.target.closest('#upload-picture-btn')) {
    document.getElementById('profile-picture-input').click();
  }
});

// Remove picture button
document.addEventListener('click', async function(e) {
  if (e.target.id === 'remove-picture-btn' || e.target.closest('#remove-picture-btn')) {
    const result = await Swal.fire({
      title: 'Remove picture?',
      text: 'Your profile picture will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        const response = await fetch('/api/remove-profile-picture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: TEACHER_DATA.profile.id })
        });
        
        if (response.ok) {
          TEACHER_DATA.profile.profilePicture = null;
          updateTeacherProfilePicture();
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

async function apiPostFormData(url, formData) {
  const res = await fetch(url, {
    method: 'POST',
    body: formData
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

async function apiPutFormData(url, formData) {
  const res = await fetch(url, {
    method: 'PUT',
    body: formData
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
// FETCH ALL SECTIONS FOR ANNOUNCEMENTS
// =============================================
async function fetchAllSectionsForAnnouncements() {
  try {
    const classes = await apiGet(`/api/teacher/classes?teacherId=${TEACHER_DATA.profile.id}`);
    const allSections = [];
    
    for (const cls of classes) {
      const sections = await apiGet(`/api/teacher/sections?classId=${cls.id}`);
      sections.forEach(sec => {
        allSections.push({
          sectionId: sec.id,
          sectionName: sec.name,
          sectionCode: sec.code,
          classId: cls.id,
          className: cls.title
        });
      });
    }
    
    TEACHER_DATA.allSectionsForAnnouncements = allSections;
    return allSections;
  } catch (err) {
    console.error('Error fetching sections for announcements:', err);
    return [];
  }
}

// =============================================
// RENDER AUDIENCE CHECKBOXES
// =============================================
function renderAudienceCheckboxes(preselectedAudiences = []) {
  const container = document.getElementById('audience-checkboxes');
  if (!container) return;
  
  const sections = TEACHER_DATA.allSectionsForAnnouncements;
  
  if (sections.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No sections available. Create sections first.</div>';
    return;
  }
  
  const groupedByClass = {};
  sections.forEach(sec => {
    if (!groupedByClass[sec.className]) {
      groupedByClass[sec.className] = [];
    }
    groupedByClass[sec.className].push(sec);
  });
  
  container.innerHTML = '';
  
  Object.keys(groupedByClass).forEach(className => {
    const classSections = groupedByClass[className];
    
    const classGroup = document.createElement('div');
    classGroup.style.cssText = 'margin-bottom: 12px;';
    
    const classHeader = document.createElement('div');
    classHeader.style.cssText = 'font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 6px; padding: 4px 8px; background: #f3f4f6; border-radius: 4px;';
    classHeader.textContent = `📚 ${className}`;
    classGroup.appendChild(classHeader);
    
    classSections.forEach(sec => {
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; font-size: 13px; color: #4b5563; border-radius: 4px; transition: background 0.2s;';
      label.addEventListener('mouseenter', () => label.style.background = '#f9fafb');
      label.addEventListener('mouseleave', () => label.style.background = 'transparent');
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = `section_${sec.sectionId}`;
      checkbox.dataset.sectionId = sec.sectionId;
      checkbox.dataset.classId = sec.classId;
      checkbox.style.cssText = 'width: 16px; height: 16px; cursor: pointer;';
      
      if (preselectedAudiences.includes(checkbox.value)) {
        checkbox.checked = true;
      }
      
      const text = document.createElement('span');
      text.textContent = `${sec.sectionName} (${sec.sectionCode || 'No code'})`;
      
      label.appendChild(checkbox);
      label.appendChild(text);
      classGroup.appendChild(label);
    });
    
    container.appendChild(classGroup);
  });
  
  const selectAllContainer = document.createElement('div');
  selectAllContainer.style.cssText = 'margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px;';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.style.cssText = 'padding: 4px 12px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
  selectAllBtn.addEventListener('click', () => {
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  });
  
  const deselectAllBtn = document.createElement('button');
  deselectAllBtn.type = 'button';
  deselectAllBtn.textContent = 'Deselect All';
  deselectAllBtn.style.cssText = 'padding: 4px 12px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
  deselectAllBtn.addEventListener('click', () => {
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  });
  
  selectAllContainer.appendChild(selectAllBtn);
  selectAllContainer.appendChild(deselectAllBtn);
  container.appendChild(selectAllContainer);
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
    else if (view === 'profile') {
      refreshTeacherProfileDisplay();
      showView('profile');
    }
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
            <i class="fa-solid fa-book"></i>
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
        <button class="view-class-btn" data-classid="${cls.id}"><i class="fa-solid fa-eye"></i> View class</button>
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
document.getElementById('cancel-edit-class-modal-2').addEventListener('click', () => closeModal('modal-edit-class'));

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

// =============================================
// OPEN SECTION DETAIL
// =============================================
function openSectionDetail(sectionId, sectionName) {
  state.currentSectionId = sectionId;
  
  const cls = TEACHER_DATA.classes.find(c => c.id === state.currentClassId);
  document.getElementById('section-detail-name').textContent = sectionName;
  document.getElementById('section-detail-class').textContent = cls ? cls.title : '';
  switchTab('lessons');
  showView('section-detail');
}

// =============================================
// RENDER SECTIONS LIST
// =============================================
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
          <i class="fa-solid fa-layer-group"></i>
        </div>
        <div>
          <div class="section-card-name">${escHtml(sec.name)}</div>
          <div class="section-card-students">${enrolledCount} student${enrolledCount !== 1 ? 's' : ''} enrolled</div>
          <div class="section-card-code" style="margin-top: 8px;">
            <span style="font-size: 12px; color: #666;"><i class="fa-solid fa-key"></i> Enrollment Code: </span>
            <span style="font-size: 14px; font-weight: 600; background: #f0fdf4; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${sec.enrollment_code || 'N/A'}</span>
            <button class="copy-code-btn" data-code="${sec.enrollment_code}" style="margin-left: 8px; padding: 2px 8px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fa-solid fa-copy"></i> Copy</button>
          </div>
          <div style="font-size: 11px; color: #999; margin-top: 4px;">Display Code: ${sec.code}</div>
        </div>
      </div>
      <div class="section-card-right">
        <button class="section-dots-btn" data-secid="${sec.id}" title="Options">
          ${dotsIconSVG()}
        </button>
      </div>`;

    const copyBtn = card.querySelector('.copy-code-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = copyBtn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: `Enrollment code ${code} copied to clipboard`,
          timer: 1500,
          showConfirmButton: false
        });
      });
    }

    card.querySelector('.section-dots-btn').addEventListener('click', e => {
      e.stopPropagation();
      openEditSectionModal(sec.id);
    });
    card.addEventListener('click', e => {
      if (!e.target.closest('.section-dots-btn') && !e.target.closest('.copy-code-btn')) {
        openSectionDetail(sec.id, sec.name);
      }
    });
    list.appendChild(card);
  });
}

// =============================================
// EDIT SECTION MODAL
// =============================================
function openEditSectionModal(sectionId) {
  state.editingSectionId = sectionId;
  const sec = TEACHER_DATA.sections.find(s => s.id === sectionId);
  document.getElementById('edit-section-name-input').value = sec.name;
  
  document.getElementById('edit-modal-code-display').innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #666;">Display Code:</strong> 
      <span style="font-family: monospace;">${sec.code}</span>
    </div>
    <div>
      <strong style="color: #666;"><i class="fa-solid fa-key"></i> Enrollment Code (share with students):</strong><br/>
      <span style="font-family: monospace; font-size: 18px; font-weight: bold; background: #f0fdf4; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">${sec.enrollment_code || 'N/A'}</span>
      <button class="copy-code-modal-btn" data-code="${sec.enrollment_code}" style="margin-left: 10px; padding: 4px 12px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-copy"></i> Copy</button>
    </div>
  `;
  
  setTimeout(() => {
    const copyBtn = document.querySelector('.copy-code-modal-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const code = copyBtn.getAttribute('data-code');
        navigator.clipboard.writeText(code);
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: `Enrollment code ${code} copied`,
          timer: 1500,
          showConfirmButton: false
        });
      });
    }
  }, 100);
  
  document.getElementById('edit-section-code-input').value = '';
  document.getElementById('edit-section-code-input').disabled = true;
  document.getElementById('edit-section-code-input').placeholder = 'Code cannot be changed';
  openModal('modal-edit-section');
}

document.getElementById('cancel-edit-section-modal').addEventListener('click', () => closeModal('modal-edit-section'));
document.getElementById('cancel-edit-section-modal-2').addEventListener('click', () => closeModal('modal-edit-section'));

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
// SWITCH TAB
// =============================================
function switchTab(tab) {
  state.activeSectionTab = tab;
  
  document.querySelectorAll('.detail-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  
  document.querySelectorAll('.detail-tab-panel').forEach(c => {
    c.classList.remove('active');
  });
  
  const activeTab = document.getElementById('tab-' + tab);
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  if (tab === 'lessons') {
    fetchAndRenderMaterials();
  } else if (tab === 'quizzes') {
    fetchAndRenderQuizzes();
  } else if (tab === 'assignments') {
    fetchAndRenderAssignments();
  } else if (tab === 'students') {
    fetchAndRenderStudents();
  }
}

document.querySelectorAll('.detail-tab').forEach(btn => {
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
          <i class="fa-solid fa-book-open"></i>
        </div>
        <div class="material-card-info">
          <span class="material-card-name">${escHtml(mat.title)}</span>
          <span class="material-card-desc">${escHtml(mat.description || '')}</span>
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openMaterialModal(${mat.id})"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMaterial(${mat.id})"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>`;
    card.addEventListener('click', () => openMaterialDetail(mat));
    list.appendChild(card);
  });
}

function openMaterialDetail(mat) {
  state.currentMaterialId = mat.id;
  
  document.getElementById('mat-title-display').textContent = mat.title;
  document.getElementById('mat-section-label').textContent = document.getElementById('section-detail-name').textContent;
  document.getElementById('mat-detail-desc').textContent = mat.description || 'No description provided.';
  
  const link = document.getElementById('mat-detail-link');
  if (mat.pdf_url) {
    link.href = mat.pdf_url;
    link.querySelector('span').textContent = 'Open Lesson';
    document.getElementById('mat-link-card').style.display = 'flex';
    document.querySelector('.material-link-text-wrapper').style.display = 'block';
  } else {
    link.href = '#';
    link.querySelector('span').textContent = 'No file attached';
    document.getElementById('mat-link-card').style.display = 'none';
    document.querySelector('.material-link-text-wrapper').style.display = 'none';
  }
  
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
    list.innerHTML = '<div class="empty-state">No quizzes yet. Click "Add Quiz" to create one.</div>';
    return;
  }

  TEACHER_DATA.quizzes.forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-card-left">
        <div class="item-icon-wrap">
          <i class="fa-solid fa-clipboard-question"></i>
        </div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${escHtml(quiz.title)}</span>
          <span class="quiz-card-meta">Due: ${quiz.due_date ? new Date(quiz.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}</span>       
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openQuizModal(${quiz.id})"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteQuiz(${quiz.id})"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>`;
    card.addEventListener('click', () => openQuizDetail(quiz));
    list.appendChild(card);
  });
}

function openQuizDetail(quiz) {
  state.currentQuizId = quiz.id;
  
  document.getElementById('quiz-title-display').textContent = quiz.title;
  document.getElementById('quiz-section-label').textContent = document.getElementById('section-detail-name').textContent;
  document.getElementById('quiz-detail-due').textContent = quiz.due_date ? new Date(quiz.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'No due date';
  document.getElementById('quiz-detail-desc').textContent = quiz.description || 'No description provided.';
  
  const link = document.getElementById('quiz-detail-link');
  if (quiz.link) {
    link.href = quiz.link;
    link.querySelector('span').textContent = 'Open Quiz';
    document.getElementById('quiz-link-card').style.display = 'flex';
    document.querySelector('.quiz-link-text-wrapper').style.display = 'block';
  } else {
    link.href = '#';
    link.querySelector('span').textContent = 'No link attached';
    document.getElementById('quiz-link-card').style.display = 'none';
    document.querySelector('.quiz-link-text-wrapper').style.display = 'none';
  }
  
  state.activeCompletionTab.quiz = 'pending';
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
    list.innerHTML = '<div class="empty-state">No assignments yet. Click "Add Assignment" to create one.</div>';
    return;
  }

  TEACHER_DATA.assignments.forEach(assign => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-card-left">
        <div class="item-icon-wrap">
          <i class="fa-solid fa-file-lines"></i>
        </div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${escHtml(assign.title)}</span>
          <span class="quiz-card-meta">Due: ${assign.due_date ? new Date(assign.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'} · ${assign.points || 0} pts</span>
        </div>
      </div>
      <div class="material-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="openAssignmentModal(${assign.id})"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAssignment(${assign.id})"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>`;
    card.addEventListener('click', () => openAssignmentDetail(assign));
    list.appendChild(card);
  });
}

function openAssignmentDetail(assign) {
  state.currentAssignmentId = assign.id;
  
  document.getElementById('assign-title-display').textContent = assign.title;
  document.getElementById('assign-section-label').textContent = document.getElementById('section-detail-name').textContent;
  document.getElementById('assign-detail-due').textContent = assign.due_date ? new Date(assign.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'No due date';
  document.getElementById('assign-detail-points').textContent = (assign.points || 0) + ' points';
  document.getElementById('assign-detail-desc').textContent = assign.description || 'No instructions provided.';
  
  const link = document.getElementById('assign-detail-link');
  if (assign.link) {
    link.href = assign.link;
    document.getElementById('assign-link-card').style.display = 'flex';
  } else {
    link.href = '#';
    document.getElementById('assign-link-card').style.display = 'none';
  }
  
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

    const doneStatus = (type === 'material') ? 'finished' : 'passed';

    let filtered = students.map(s => ({
      ...s,
      status: s.completed_at ? doneStatus : 'pending'
    }));

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

    let matchStatus = filterStatus;
    if (filterStatus === 'finished' && type !== 'material') {
      matchStatus = 'passed';
    }

    filtered = filtered.filter(s => s.status === matchStatus);

    if (!filtered.length) {
      const labels = { 
        pending: 'No pending students.', 
        finished: 'No students have finished yet.', 
        passed: 'No students have passed yet.',
        missed: 'No students missed this.' 
      };
      container.innerHTML = `<div class="empty-state">${labels[filterStatus] || 'No students.'}</div>`;
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
            <i class="fa-solid fa-user"></i>
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
  if (!state.currentSectionId) {
    const enrolledEl = document.getElementById('enrolled-students-list');
    if (enrolledEl) {
      enrolledEl.innerHTML = '<div class="empty-state">No section selected. Please select a section first.</div>';
    }
    return;
  }
  
  try {
    const enrolledEl = document.getElementById('enrolled-students-list');
    if (enrolledEl) {
      enrolledEl.innerHTML = '<div class="loading-state">Loading students...</div>';
    }
    
    // Using apiGet helper (merged version - cleaner)
    const students = await apiGet(`/api/teacher/students?sectionId=${state.currentSectionId}`);
    TEACHER_DATA.students = students;
    renderStudentsList();
  } catch (err) {
    console.error('Fetch students error:', err);
    TEACHER_DATA.students = [];
    renderStudentsList();
    Swal.fire('Error', 'Failed to load students: ' + err.message, 'error');
  }
}

function renderStudentsList() {
  const enrolledEl = document.getElementById('enrolled-students-list');
  
  if (!enrolledEl) {
    console.error('enrolled-students-list element not found');
    return;
  }
  
  enrolledEl.innerHTML = '';

  if (!TEACHER_DATA.students || TEACHER_DATA.students.length === 0) {
    enrolledEl.innerHTML = '<div class="empty-state">No enrolled students yet. Share the enrollment code with students.</div>';
    return;
  }

  TEACHER_DATA.students.forEach(student => {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    const enrollmentDate = student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString() : 'Recently';
    const firstName = student.first_name || '';
    const lastName = student.last_name || '';
    const fullName = (firstName + ' ' + lastName).trim() || 'Unknown';
    
    card.innerHTML = `
      <div class="student-card-left">
        <div style="background: #11265c; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <i class="fa-solid fa-user" style="color: white; font-size: 18px;"></i>
        </div>
        <div>
          <div class="student-name">${escHtml(fullName)}</div>
          <div class="student-email">${escHtml(student.email)}</div>
          <div style="font-size: 11px; color: #22c55e; margin-top: 4px;"><i class="fa-solid fa-circle-check"></i> Enrolled: ${enrollmentDate}</div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm remove-student-btn" data-student-id="${student.id}"><i class="fa-solid fa-user-minus"></i> Remove</button>`;
    
    const removeBtn = card.querySelector('.remove-student-btn');
    removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await removeStudent(student.id);
    });
    
    enrolledEl.appendChild(card);
  });
}

async function removeStudent(studentId) {
  const result = await Swal.fire({
    title: 'Remove student?',
    text: 'This student will be removed from this section.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Remove',
    confirmButtonColor: '#cc0000'
  });
  
  if (result.isConfirmed) {
    try {
      const response = await fetch('/api/teacher/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sectionId: state.currentSectionId, 
          studentId: studentId 
        })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Remove failed');
      }
      
      Swal.fire('Removed', 'Student removed successfully.', 'success');
      await fetchAndRenderStudents();
    } catch (err) {
      console.error('Remove student error:', err);
      Swal.fire('Error', err.message, 'error');
    }
  }
}

// =============================================
// MODALS
// =============================================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close modals when clicking overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// Close modals when clicking X button
document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', function() {
    this.closest('.modal-overlay').classList.add('hidden');
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
document.getElementById('cancel-class-modal-2').addEventListener('click', () => closeModal('modal-class'));
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
document.getElementById('cancel-section-modal-2').addEventListener('click', () => closeModal('modal-section'));
document.getElementById('save-section-modal').addEventListener('click', async () => {
  const name = document.getElementById('section-name-input').value.trim();
  if (!name) { Swal.fire('Error', 'Section name is required.', 'error'); return; }
  try {
    const result = await apiPost('/api/teacher/sections', { classId: state.currentClassId, name });
    closeModal('modal-section');
    
    Swal.fire({
      icon: 'success',
      title: 'Section Created!',
      html: `
        <div style="text-align: left;">
          <p><strong>Section Name:</strong> ${escHtml(name)}</p>
          <p><strong>Display Code:</strong> <code>${result.code}</code></p>
          <p><strong><i class="fa-solid fa-key"></i> Enrollment Code (SHARE THIS WITH STUDENTS):</strong><br/>
          <span style="background: #f0fdf4; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold; display: inline-block; margin-top: 5px;">${result.enrollment_code}</span></p>
          <button id="copy-enrollment-code" style="margin-top: 10px; padding: 5px 12px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-copy"></i> Copy Enrollment Code</button>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'OK'
    });
    
    setTimeout(() => {
      const copyBtn = document.getElementById('copy-enrollment-code');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(result.enrollment_code);
          Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: 'Enrollment code copied to clipboard',
            timer: 1500,
            showConfirmButton: false
          });
        });
      }
    }, 100);
    
    await fetchAndRenderSections(state.currentClassId);
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

// =============================================
// FILE UPLOAD HANDLERS
// =============================================

function setupFileUploadZone(zoneId, inputId, previewId, browseBtnId, stateKey) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const browseBtn = document.getElementById(browseBtnId);
  
  if (!zone || !input || !preview) return;
  
  zone.addEventListener('click', (e) => {
    if (e.target === browseBtn || (browseBtn && browseBtn.contains(e.target))) return;
    input.click();
  });
  
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      input.click();
    });
  }
  
  input.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0], preview, stateKey);
  });
  
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('drag-over');
  });
  
  zone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('drag-over');
  });
  
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      handleFileSelect(file, preview, stateKey);
    }
  });
}

function handleFileSelect(file, previewContainer, stateKey) {
  if (!file) return;
  
  state[stateKey] = file;
  
  const fileSize = formatFileSize(file.size);
  previewContainer.innerHTML = `
    <div class="file-preview-item">
      <div class="file-preview-item-left">
        <i class="fa-solid fa-file" style="color: var(--accent);"></i>
        <div>
          <div class="file-preview-name">${escHtml(file.name)}</div>
          <div class="file-preview-size">${fileSize}</div>
        </div>
      </div>
      <button class="file-preview-remove" onclick="removeFile('${stateKey}', '${previewContainer.id}')">&times;</button>
    </div>
  `;
}

window.removeFile = function(stateKey, previewId) {
  state[stateKey] = null;
  
  const inputMap = {
    'materialFile': 'material-file-input',
    'assignmentFile': 'assignment-file-input',
    'quizFile': 'quiz-file-input'
  };
  
  const inputId = inputMap[stateKey];
  if (inputId) {
    document.getElementById(inputId).value = '';
  }
  
  document.getElementById(previewId).innerHTML = '';
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function setupUploadTypeToggle(fileTypeBtnId, linkTypeBtnId, fileUploadZoneId, linkInputGroupId, stateKey) {
  const fileBtn = document.getElementById(fileTypeBtnId);
  const linkBtn = document.getElementById(linkTypeBtnId);
  const fileZone = document.getElementById(fileUploadZoneId);
  const linkGroup = document.getElementById(linkInputGroupId);
  
  if (!fileBtn || !linkBtn) return;
  
  fileBtn.addEventListener('click', () => {
    fileBtn.classList.add('active');
    linkBtn.classList.remove('active');
    if (fileZone) fileZone.classList.remove('hidden');
    if (linkGroup) linkGroup.classList.add('hidden');
    state[stateKey] = 'file';
  });
  
  linkBtn.addEventListener('click', () => {
    linkBtn.classList.add('active');
    fileBtn.classList.remove('active');
    if (fileZone) fileZone.classList.add('hidden');
    if (linkGroup) linkGroup.classList.remove('hidden');
    state[stateKey] = 'link';
  });
}

function initFileUploads() {
  setupFileUploadZone('material-file-upload-zone', 'material-file-input', 'material-file-preview', 'material-browse-btn', 'materialFile');
  setupUploadTypeToggle('material-file-type-btn', 'material-link-type-btn', 'material-file-upload-zone', 'material-link-input-group', 'materialUploadType');
  
  setupFileUploadZone('assignment-file-upload-zone', 'assignment-file-input', 'assignment-file-preview', 'assignment-browse-btn', 'assignmentFile');
  setupUploadTypeToggle('assignment-file-type-btn', 'assignment-link-type-btn', 'assignment-file-upload-zone', 'assignment-link-input-group', 'assignmentUploadType');
  
  setupFileUploadZone('quiz-file-upload-zone', 'quiz-file-input', 'quiz-file-preview', 'quiz-browse-btn', 'quizFile');
  setupUploadTypeToggle('quiz-file-type-btn', 'quiz-link-type-btn', 'quiz-file-upload-zone', 'quiz-link-input-group', 'quizUploadType');
}

// ---- Material Modal ----
function openMaterialModal(editId = null) {
  state.editingMaterialId = editId;
  const mat = editId ? TEACHER_DATA.materials.find(m => m.id === editId) : null;
  
  document.getElementById('modal-material-title-text').textContent = editId ? 'Edit Material' : 'Add Learning Material';
  document.getElementById('material-name-input').value = mat ? mat.title : '';
  document.getElementById('material-desc-input').value = mat ? mat.description || '' : '';
  document.getElementById('material-link-input').value = mat ? mat.pdf_url || '' : '';
  
  state.materialFile = null;
  document.getElementById('material-file-preview').innerHTML = '';
  document.getElementById('material-file-input').value = '';
  
  state.materialUploadType = 'file';
  document.getElementById('material-file-type-btn').classList.add('active');
  document.getElementById('material-link-type-btn').classList.remove('active');
  document.getElementById('material-file-upload-zone').classList.remove('hidden');
  document.getElementById('material-link-input-group').classList.add('hidden');
  
  openModal('modal-material');
}

document.getElementById('btn-add-material').addEventListener('click', () => openMaterialModal());
document.getElementById('btn-edit-material').addEventListener('click', () => openMaterialModal(state.currentMaterialId));
document.getElementById('btn-delete-material').addEventListener('click', () => deleteMaterial(state.currentMaterialId));
document.getElementById('cancel-material-modal').addEventListener('click', () => closeModal('modal-material'));
document.getElementById('cancel-material-modal-2').addEventListener('click', () => closeModal('modal-material'));

document.getElementById('save-material-modal').addEventListener('click', async () => {
  const title = document.getElementById('material-name-input').value.trim();
  const desc = document.getElementById('material-desc-input').value.trim();
  
  if (!title) { Swal.fire('Error', 'Material name is required.', 'error'); return; }
  
  try {
    if (state.materialUploadType === 'file' && state.materialFile) {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', desc);
      formData.append('sectionId', state.currentSectionId);
      formData.append('file', state.materialFile);
      
      if (state.editingMaterialId) {
        await apiPutFormData(`/api/teacher/materials/${state.editingMaterialId}`, formData);
      } else {
        await apiPostFormData('/api/teacher/materials', formData);
      }
    } else {
      const link = document.getElementById('material-link-input').value.trim();
      
      if (state.editingMaterialId) {
        await apiPut(`/api/teacher/materials/${state.editingMaterialId}`, { title, description: desc, link });
      } else {
        await apiPost('/api/teacher/materials', { sectionId: state.currentSectionId, title, description: desc, link });
      }
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
  document.getElementById('quiz-points-input').value = quiz ? quiz.points || '' : '';
  
  state.quizFile = null;
  document.getElementById('quiz-file-preview').innerHTML = '';
  document.getElementById('quiz-file-input').value = '';
  
  state.quizUploadType = 'file';
  document.getElementById('quiz-file-type-btn').classList.add('active');
  document.getElementById('quiz-link-type-btn').classList.remove('active');
  document.getElementById('quiz-file-upload-zone').classList.remove('hidden');
  document.getElementById('quiz-link-input-group').classList.add('hidden');
  
  openModal('modal-quiz');
}

document.getElementById('btn-add-quiz').addEventListener('click', () => openQuizModal());
document.getElementById('btn-edit-quiz').addEventListener('click', () => openQuizModal(state.currentQuizId));
document.getElementById('btn-delete-quiz').addEventListener('click', () => deleteQuiz(state.currentQuizId));
document.getElementById('cancel-quiz-modal').addEventListener('click', () => closeModal('modal-quiz'));
document.getElementById('cancel-quiz-modal-2').addEventListener('click', () => closeModal('modal-quiz'));

document.getElementById('save-quiz-modal').addEventListener('click', async () => {
  const title = document.getElementById('quiz-name-input').value.trim();
  const desc = document.getElementById('quiz-desc-input').value.trim();
  const due = document.getElementById('quiz-due-input').value;
  const points = document.getElementById('quiz-points-input').value;
  
  if (!title) { Swal.fire('Error', 'Quiz title is required.', 'error'); return; }
  
  try {
    if (state.quizUploadType === 'file' && state.quizFile) {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', desc);
      formData.append('sectionId', state.currentSectionId);
      formData.append('dueDate', due);
      formData.append('points', points);
      formData.append('file', state.quizFile);
      
      if (state.editingQuizId) {
        await apiPutFormData(`/api/teacher/quizzes/${state.editingQuizId}`, formData);
      } else {
        await apiPostFormData('/api/teacher/quizzes', formData);
      }
    } else {
      const link = document.getElementById('quiz-link-input').value.trim();
      
      if (state.editingQuizId) {
        await apiPut(`/api/teacher/quizzes/${state.editingQuizId}`, { title, description: desc, link, dueDate: due, points });
      } else {
        await apiPost('/api/teacher/quizzes', { sectionId: state.currentSectionId, title, description: desc, link, dueDate: due, points });
      }
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
  document.getElementById('assignment-due-input').value = assign && assign.due_date ? formatDateTimeLocal(assign.due_date) : '';
  document.getElementById('assignment-points-input').value = assign ? assign.points || '' : '';
  document.getElementById('assignment-link-input').value = assign ? assign.link || '' : '';
  
  state.assignmentFile = null;
  document.getElementById('assignment-file-preview').innerHTML = '';
  document.getElementById('assignment-file-input').value = '';
  
  state.assignmentUploadType = 'file';
  document.getElementById('assignment-file-type-btn').classList.add('active');
  document.getElementById('assignment-link-type-btn').classList.remove('active');
  document.getElementById('assignment-file-upload-zone').classList.remove('hidden');
  document.getElementById('assignment-link-input-group').classList.add('hidden');
  
  openModal('modal-assignment');
}

document.getElementById('btn-add-assignment').addEventListener('click', () => openAssignmentModal());
document.getElementById('btn-edit-assignment').addEventListener('click', () => openAssignmentModal(state.currentAssignmentId));
document.getElementById('btn-delete-assignment').addEventListener('click', () => deleteAssignment(state.currentAssignmentId));
document.getElementById('cancel-assignment-modal').addEventListener('click', () => closeModal('modal-assignment'));
document.getElementById('cancel-assignment-modal-2').addEventListener('click', () => closeModal('modal-assignment'));

document.getElementById('save-assignment-modal').addEventListener('click', async () => {
  const title = document.getElementById('assignment-name-input').value.trim();
  const desc = document.getElementById('assignment-desc-input').value.trim();
  const due = document.getElementById('assignment-due-input').value;
  const points = document.getElementById('assignment-points-input').value;
  
  if (!title) { Swal.fire('Error', 'Assignment title is required.', 'error'); return; }
  
  try {
    if (state.assignmentUploadType === 'file' && state.assignmentFile) {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', desc);
      formData.append('sectionId', state.currentSectionId);
      formData.append('dueDate', due);
      formData.append('points', points);
      formData.append('file', state.assignmentFile);
      
      if (state.editingAssignmentId) {
        await apiPutFormData(`/api/teacher/assignments/${state.editingAssignmentId}`, formData);
      } else {
        await apiPostFormData('/api/teacher/assignments', formData);
      }
    } else {
      const link = document.getElementById('assignment-link-input').value.trim();
      
      if (state.editingAssignmentId) {
        await apiPut(`/api/teacher/assignments/${state.editingAssignmentId}`, { title, description: desc, link, dueDate: due, points });
      } else {
        await apiPost('/api/teacher/assignments', { sectionId: state.currentSectionId, title, description: desc, link, dueDate: due, points });
      }
    }
    
    closeModal('modal-assignment');
    fetchAndRenderAssignments();
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
  }
});

// =============================================
// ANNOUNCEMENTS SECTION
// =============================================

document.getElementById('btn-new-announcement').addEventListener('click', async () => {
  state.editingAnnouncementId = null;
  document.getElementById('modal-announcement-title-text').textContent = 'New Announcement';
  document.getElementById('announcement-title-input').value = '';
  document.getElementById('announcement-body-input').value = '';
  
  await fetchAllSectionsForAnnouncements();
  renderAudienceCheckboxes([]);
  
  openModal('modal-announcement');
});

document.getElementById('cancel-announcement-modal').addEventListener('click', () => closeModal('modal-announcement'));
document.getElementById('cancel-announcement-modal-2').addEventListener('click', () => closeModal('modal-announcement'));

document.getElementById('save-announcement-modal').addEventListener('click', async () => {
  const title = document.getElementById('announcement-title-input').value.trim();
  const body = document.getElementById('announcement-body-input').value.trim();
  
  const checkboxes = document.querySelectorAll('#audience-checkboxes input[type="checkbox"]:checked');
  const selectedAudiences = Array.from(checkboxes).map(cb => cb.value);
  
  if (!title || !body) { 
    Swal.fire('Error', 'Title and message are required.', 'error'); 
    return; 
  }
  
  if (selectedAudiences.length === 0) {
    Swal.fire('Error', 'Please select at least one section for the audience.', 'error');
    return;
  }
  
  try {
    let response;
    const audienceString = selectedAudiences.join(',');
    
    if (state.editingAnnouncementId) {
      response = await fetch(`/api/announcements/${state.editingAnnouncementId}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, audience: audienceString })
      });
    } else {
      response = await fetch('/api/announcements', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teacherId: TEACHER_DATA.profile.id, 
          title, 
          body, 
          audience: audienceString 
        })
      });
    }
    
    const data = await response.json();
    if (response.ok) {
      closeModal('modal-announcement');
      Swal.fire('Success', data.message || 'Announcement saved!', 'success');
      renderAnnouncementsView();
    } else {
      Swal.fire('Error', data.message || 'Failed to save.', 'error');
    }
  } catch (err) {
    Swal.fire('Error', 'Could not connect to server.', 'error');
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
            <i class="fa-solid fa-layer-group"></i>
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
// ANNOUNCEMENTS VIEW
// =============================================
async function renderAnnouncementsView() {
  showView('announcements');
  const list = document.getElementById('announcements-list');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Loading announcements...</div>';
  await fetchAnnouncements();
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
    const list = document.getElementById('announcements-list');
    if (list) {
      list.innerHTML = '<div class="empty-state">Failed to load announcements.</div>';
    }
  }
}

function renderAnnouncementList() {
  const list = document.getElementById('announcements-list');
  if (!list) return;
  
  list.innerHTML = '';
  if (!state.announcements.length) {
    list.innerHTML = '<div class="empty-state">No announcements yet.</div>';
    return;
  }
  
  state.announcements.forEach(a => {
    const date = new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    let audienceDisplay = a.audience || 'All Classes';
    if (audienceDisplay && audienceDisplay.startsWith('section_')) {
      const sectionIds = audienceDisplay.split(',').map(s => s.replace('section_', ''));
      audienceDisplay = `${sectionIds.length} section${sectionIds.length !== 1 ? 's' : ''} selected`;
    }
    
    const card = document.createElement('div');
    card.className = 'announcement-card';
    card.innerHTML = `
      <div class="announcement-icon-wrap">
        <i class="fa-solid fa-bullhorn"></i>
      </div>
      <div class="announcement-body-wrap">
        <div class="announcement-footer">
          <div>
            <div class="announcement-title">${escHtml(a.title)}</div>
            <div class="announcement-meta">${escHtml(audienceDisplay)} · ${date}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editAnnouncementFromList(${a.id})"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAnnouncementFromList(${a.id})"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </div>
        <div class="announcement-body" style="margin-top:10px">${escHtml(a.body)}</div>
      </div>`;
    list.appendChild(card);
  });
}

window.editAnnouncementFromList = async function(id) {
  const a = state.announcements.find(an => an.id === id);
  if (!a) return;
  
  state.editingAnnouncementId = id;
  document.getElementById('announcement-title-input').value = a.title;
  document.getElementById('announcement-body-input').value = a.body;
  document.getElementById('modal-announcement-title-text').textContent = 'Edit Announcement';
  
  await fetchAllSectionsForAnnouncements();
  
  const preselectedAudiences = a.audience ? a.audience.split(',').map(s => s.trim()) : [];
  renderAudienceCheckboxes(preselectedAudiences);
  
  openModal('modal-announcement');
};

window.deleteAnnouncementFromList = async function(id) {
  const result = await Swal.fire({
    title: 'Delete announcement?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      Swal.fire('Deleted', 'Announcement deleted.', 'success');
      renderAnnouncementsView();
    } catch (err) {
      Swal.fire('Error', 'Could not connect to server.', 'error');
    }
  }
};

// =============================================
// BACK BUTTONS
// =============================================
document.getElementById('back-to-classes').addEventListener('click', fetchAndRenderClasses);
document.getElementById('back-to-class-detail').addEventListener('click', () => openClassDetail(state.currentClassId));
document.getElementById('back-to-section-lessons').addEventListener('click', () => { 
  if (state.currentSectionId) {
    openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name').textContent); 
    switchTab('lessons');
  }
});
document.getElementById('back-to-section-quizzes').addEventListener('click', () => { 
  if (state.currentSectionId) {
    openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name').textContent); 
    switchTab('quizzes');
  }
});
document.getElementById('back-to-section-assignments').addEventListener('click', () => { 
  if (state.currentSectionId) {
    openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name').textContent); 
    switchTab('assignments');
  }
});

// =============================================
// PROFILE FUNCTIONS
// =============================================
function refreshTeacherProfileDisplay() {
  const p = TEACHER_DATA.profile;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  
  set('display-firstname', p.firstName || 'Teacher');
  set('display-lastname', p.lastName || '');
  set('display-username', p.username || 'teacher');
  set('display-email', p.email || '');
  set('profile-username-display', p.username || 'teacher');
  set('profile-role-display', p.role || 'Teacher');
  setVal('pw-username-display', p.username || 'teacher');
  setVal('edit-firstname', p.firstName || '');
  setVal('edit-lastname', p.lastName || '');
  setVal('edit-username', p.username || '');
  setVal('edit-email', p.email || '');
  
  updateTeacherProfilePicture();
}

function showTeacherProfilePanel(panel) {
  const mainPanel = document.getElementById('profile-main');
  const editPanel = document.getElementById('profile-edit-info');
  const passwordPanel = document.getElementById('profile-change-password');
  
  if (mainPanel) mainPanel.style.display = (panel === 'main') ? 'block' : 'none';
  if (editPanel) editPanel.style.display = (panel === 'edit-info') ? 'block' : 'none';
  if (passwordPanel) passwordPanel.style.display = (panel === 'change-password') ? 'block' : 'none';
}

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
      const savedUser = { 
        id: updated.userId, 
        first_name: updated.firstName, 
        last_name: updated.lastName, 
        username: updated.username, 
        email: updated.email, 
        role: TEACHER_DATA.profile.role 
      };
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

document.getElementById('btn-change-password').addEventListener('click', () => {
  showTeacherProfilePanel('change-password');
  const pwNew = document.getElementById('pw-new');
  const pwConfirm = document.getElementById('pw-confirm');
  const pwCode = document.getElementById('pw-verification-code');
  const vcSection = document.getElementById('verification-code-section');
  const sendBtn = document.getElementById('btn-send-code');
  const saveBtn = document.getElementById('btn-save-password');
  
  if (pwNew) pwNew.value = '';
  if (pwConfirm) pwConfirm.value = '';
  if (pwCode) pwCode.value = '';
  if (vcSection) vcSection.style.display = 'none';
  if (sendBtn) sendBtn.style.display = 'block';
  if (saveBtn) saveBtn.style.display = 'none';
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
      const vcSection = document.getElementById('verification-code-section');
      const sendBtn = document.getElementById('btn-send-code');
      const saveBtn = document.getElementById('btn-save-password');
      if (vcSection) vcSection.style.display = 'block';
      if (sendBtn) sendBtn.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'block';
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
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TEACHER_DATA.profile.id, code, newPassword: newPw })
    });
    const data = await response.json();
    if (response.ok) {
      Swal.fire('Updated', 'Password changed successfully.', 'success');
      const pwNew = document.getElementById('pw-new');
      const pwConfirm = document.getElementById('pw-confirm');
      const pwCode = document.getElementById('pw-verification-code');
      if (pwNew) pwNew.value = '';
      if (pwConfirm) pwConfirm.value = '';
      if (pwCode) pwCode.value = '';
      showTeacherProfilePanel('main');
    } else {
      Swal.fire('Error', data.message || 'Failed to change password.', 'error');
    }
  } catch (error) {
    Swal.fire('Error', 'Could not connect to server.', 'error');
  }
});

document.getElementById('btn-logout').addEventListener('click', () => {
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
});

// =============================================
// DATE HELPERS
// =============================================
function formatDateTimeLocal(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  
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
// INITIALIZATION
// =============================================
(async function init() {
  await fetchTeacherProfile();
  refreshTeacherProfileDisplay();
  initFileUploads();
  await fetchAndRenderClasses();
})();