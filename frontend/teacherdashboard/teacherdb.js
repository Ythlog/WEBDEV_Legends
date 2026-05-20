








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
  materialFile: null,
  assignmentFile: null,
  quizFile: null,
  materialUploadType: 'file',
  assignmentUploadType: 'file',
  quizUploadType: 'file'
};




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
      console.log('Teacher profile loaded:', TEACHER_DATA.profile);
      await fetchTeacherProfilePicture();
      return;
    } catch (e) { console.error('Error parsing saved user:', e); }
  }
  TEACHER_DATA.profileLoaded = true;
}




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
    if (profileIcon) profileIcon.style.display = 'none';
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
    if (profileIcon) profileIcon.style.display = 'none';
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


document.addEventListener('change', function (e) {
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

document.addEventListener('click', function (e) {
  if (e.target.id === 'upload-picture-btn' || e.target.closest('#upload-picture-btn')) {
    document.getElementById('profile-picture-input').click();
  }
});

document.addEventListener('click', async function (e) {
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




async function apiGet(url) {
  console.log('API GET:', url);
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPost(url, body) {
  console.log('API POST:', url, body);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Server error' }));
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}

async function apiPostFormData(url, formData) {
  console.log('API POST FormData:', url);
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Server error' }));
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}

async function apiPut(url, body) {
  console.log('API PUT:', url, body);
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Server error' }));
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}

async function apiPutFormData(url, formData) {
  console.log('API PUT FormData:', url);
  const res = await fetch(url, { method: 'PUT', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Server error' }));
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}

async function apiDelete(url, body = null) {
  console.log('API DELETE:', url, body);
  const opts = { method: 'DELETE', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Server error' }));
    throw new Error(err.message || 'Server error');
  }
  return res.json();
}




async function fetchAllClassesAndSectionsForAnnouncements() {
  try {
    if (!TEACHER_DATA.profile.id) return [];
    const classes = await apiGet(`/api/teacher/classes?teacherId=${TEACHER_DATA.profile.id}`);
    const allData = [];
    for (const cls of classes) {
      const sections = await apiGet(`/api/teacher/sections?classId=${cls.id}`);
      allData.push({
        classId: cls.id,
        className: cls.title,
        sections: sections.map(sec => ({
          sectionId: sec.id,
          sectionName: sec.name,
          sectionCode: sec.code
        }))
      });
    }
    TEACHER_DATA.allSectionsForAnnouncements = allData;
    return allData;
  } catch (err) {
    console.error('Error fetching classes/sections for announcements:', err);
    return [];
  }
}




function renderAudienceCheckboxes(preselectedAudiences = []) {
  const container = document.getElementById('audience-checkboxes');
  if (!container) return;
  const classData = TEACHER_DATA.allSectionsForAnnouncements;
  if (classData.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No classes available. Create classes first.</div>';
    return;
  }
  container.innerHTML = '';

  const allClassesDiv = document.createElement('div');
  allClassesDiv.style.cssText = 'margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;';
  const allClassesLabel = document.createElement('label');
  allClassesLabel.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #f0fdf4; border-radius: 8px; cursor: pointer; font-weight: 500;';
  const allClassesCheckbox = document.createElement('input');
  allClassesCheckbox.type = 'checkbox';
  allClassesCheckbox.value = 'all_classes';
  allClassesCheckbox.id = 'select-all-classes';
  allClassesCheckbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer;';
  if (preselectedAudiences.includes('all_classes')) allClassesCheckbox.checked = true;
  const allClassesText = document.createElement('span');
  allClassesText.innerHTML = '<i class="fa-solid fa-globe"></i> All Classes & Sections';
  allClassesLabel.appendChild(allClassesCheckbox);
  allClassesLabel.appendChild(allClassesText);
  allClassesDiv.appendChild(allClassesLabel);
  container.appendChild(allClassesDiv);

  const selectAllContainer = document.createElement('div');
  selectAllContainer.style.cssText = 'margin-bottom: 16px; display: flex; gap: 10px; flex-wrap: wrap;';
  const selectAllSectionsBtn = document.createElement('button');
  selectAllSectionsBtn.type = 'button';
  selectAllSectionsBtn.textContent = '✓ Select All Sections';
  selectAllSectionsBtn.style.cssText = 'padding: 6px 14px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;';
  selectAllSectionsBtn.addEventListener('click', () => {
    const allClassesChk = document.getElementById('select-all-classes');
    if (allClassesChk) allClassesChk.checked = false;
    container.querySelectorAll('input[type="checkbox"][value^="section_"]').forEach(cb => cb.checked = true);
  });
  const deselectAllSectionsBtn = document.createElement('button');
  deselectAllSectionsBtn.type = 'button';
  deselectAllSectionsBtn.textContent = '✗ Deselect All Sections';
  deselectAllSectionsBtn.style.cssText = 'padding: 6px 14px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;';
  deselectAllSectionsBtn.addEventListener('click', () => {
    container.querySelectorAll('input[type="checkbox"][value^="section_"]').forEach(cb => cb.checked = false);
  });
  selectAllContainer.appendChild(selectAllSectionsBtn);
  selectAllContainer.appendChild(deselectAllSectionsBtn);
  container.appendChild(selectAllContainer);

  classData.forEach(classItem => {
    const classGroup = document.createElement('div');
    classGroup.style.cssText = 'margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;';
    const classHeader = document.createElement('div');
    classHeader.style.cssText = 'background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 12px; cursor: pointer;';
    const classExpandIcon = document.createElement('i');
    classExpandIcon.className = 'fa-solid fa-chevron-right';
    classExpandIcon.style.cssText = 'font-size: 12px; color: #6366f1; transition: transform 0.2s;';
    const classCheckbox = document.createElement('input');
    classCheckbox.type = 'checkbox';
    classCheckbox.className = 'class-select-all';
    classCheckbox.dataset.classId = classItem.classId;
    classCheckbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer;';
    const allSectionsInClassSelected = classItem.sections.length > 0 &&
      classItem.sections.every(sec => preselectedAudiences.includes(`section_${sec.sectionId}`));
    classCheckbox.checked = allSectionsInClassSelected;
    const className = document.createElement('span');
    className.style.cssText = 'font-weight: 600; color: #1f2937; flex: 1;';
    className.textContent = `📚 ${classItem.className}`;
    const sectionCount = document.createElement('span');
    sectionCount.style.cssText = 'font-size: 12px; color: #6b7280;';
    sectionCount.textContent = `${classItem.sections.length} section(s)`;
    classHeader.appendChild(classExpandIcon);
    classHeader.appendChild(classCheckbox);
    classHeader.appendChild(className);
    classHeader.appendChild(sectionCount);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'class-sections-container';
    sectionsContainer.style.cssText = 'padding: 8px 16px 12px 48px; background: white; display: block;';

    classItem.sections.forEach(sec => {
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin-bottom: 4px; cursor: pointer; border-radius: 6px; transition: background 0.2s;';
      label.addEventListener('mouseenter', () => label.style.background = '#f9fafb');
      label.addEventListener('mouseleave', () => label.style.background = 'transparent');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = `section_${sec.sectionId}`;
      checkbox.dataset.sectionId = sec.sectionId;
      checkbox.dataset.classId = classItem.classId;
      checkbox.style.cssText = 'width: 16px; height: 16px; cursor: pointer;';
      if (preselectedAudiences.includes(checkbox.value)) checkbox.checked = true;
      const text = document.createElement('span');
      text.style.cssText = 'flex: 1;';
      text.innerHTML = `<strong>${escapeHtml(sec.sectionName)}</strong> <span style="font-size: 11px; color: #888;">(${sec.sectionCode || 'No code'})</span>`;
      label.appendChild(checkbox);
      label.appendChild(text);
      sectionsContainer.appendChild(label);
    });

    let sectionsVisible = true;
    classHeader.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox') return;
      sectionsVisible = !sectionsVisible;
      sectionsContainer.style.display = sectionsVisible ? 'block' : 'none';
      classExpandIcon.style.transform = sectionsVisible ? 'rotate(0deg)' : 'rotate(-90deg)';
    });
    classCheckbox.addEventListener('change', (e) => {
      e.stopPropagation();
      const isChecked = classCheckbox.checked;
      sectionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
      updateAllClassesCheckbox();
    });
    sectionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const allChecked = Array.from(sectionsContainer.querySelectorAll('input[type="checkbox"]')).every(c => c.checked);
        classCheckbox.checked = allChecked;
        updateAllClassesCheckbox();
      });
    });
    classGroup.appendChild(classHeader);
    classGroup.appendChild(sectionsContainer);
    container.appendChild(classGroup);
  });

  function updateAllClassesCheckbox() {
    const allClassesChk = document.getElementById('select-all-classes');
    if (!allClassesChk) return;
    const allSectionCheckboxes = container.querySelectorAll('input[type="checkbox"][value^="section_"]');
    const allChecked = Array.from(allSectionCheckboxes).every(cb => cb.checked);
    allClassesChk.checked = allChecked;
  }

  const allClassesChk = document.getElementById('select-all-classes');
  if (allClassesChk) {
    allClassesChk.addEventListener('change', () => {
      const isChecked = allClassesChk.checked;
      container.querySelectorAll('input[type="checkbox"][value^="section_"]').forEach(cb => cb.checked = isChecked);
      container.querySelectorAll('.class-select-all').forEach(cb => cb.checked = isChecked);
    });
  }
}




function showView(viewId) {
  document.querySelectorAll('.page-body').forEach(v => v.classList.add('hidden'));
  const targetView = document.getElementById('view-' + viewId);
  if (targetView) targetView.classList.remove('hidden');
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




function dotsIconSVG() {
  return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="4" r="1.5" fill="#555"/>
    <circle cx="10" cy="10" r="1.5" fill="#555"/>
    <circle cx="10" cy="16" r="1.5" fill="#555"/>
  </svg>`;
}




async function fetchAndRenderClasses() {
  console.log('Fetching classes for teacher ID:', TEACHER_DATA.profile.id);
  if (!TEACHER_DATA.profile.id) {
    const grid = document.getElementById('classes-grid');
    if (grid) grid.innerHTML = '<div class="empty-state">Please log in again.</div>';
    return;
  }
  try {
    const classes = await apiGet(`/api/teacher/classes?teacherId=${TEACHER_DATA.profile.id}`);
    TEACHER_DATA.classes = classes;
    const badgeEl = document.getElementById('profile-badge-classes');
    if (badgeEl) badgeEl.textContent = `${classes.length} Class${classes.length !== 1 ? 'es' : ''}`;
    renderClassesView();
  } catch (err) {
    console.error('Fetch classes error:', err);
    TEACHER_DATA.classes = [];
    renderClassesView();
    Swal.fire('Error', 'Failed to load classes: ' + err.message, 'error');
  }
}

async function fetchSectionsForClass(classId) {
  try {
    return await apiGet(`/api/teacher/sections?classId=${classId}`);
  } catch (err) {
    console.error('Fetch sections error:', err);
    return [];
  }
}

function renderClassesView() {
  showView('classes');
  const grid = document.getElementById('classes-grid');
  if (!grid) return;
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
          <div class="class-icon-wrap"><i class="fa-solid fa-book"></i></div>
          <div>
            <div class="class-card-name">${escapeHtml(cls.title)}</div>
            <div class="class-card-meta">${sections.length} section${sections.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <button class="three-dot-btn" data-classid="${cls.id}" title="Options">${dotsIconSVG()}</button>
      </div>
      <div class="class-card-bottom">
        <button class="view-class-btn" data-classid="${cls.id}"><i class="fa-solid fa-eye"></i> View class</button>
      </div>`;
    card.querySelector('.three-dot-btn').addEventListener('click', e => { e.stopPropagation(); openEditClassModal(cls.id); });
    card.querySelector('.view-class-btn').addEventListener('click', e => { e.stopPropagation(); openClassDetail(cls.id); });
    card.querySelector('.class-card-left').addEventListener('click', () => openClassDetail(cls.id));
    grid.appendChild(card);
  });
}




function openEditClassModal(classId) {
  state.editingClassId = classId;
  const cls = TEACHER_DATA.classes.find(c => c.id === classId);
  document.getElementById('edit-class-name-input').value = cls.title;
  document.getElementById('edit-class-desc-input').value = cls.subject_code || '';
  openModal('modal-edit-class');
}

document.getElementById('cancel-edit-class-modal')?.addEventListener('click', () => closeModal('modal-edit-class'));
document.getElementById('cancel-edit-class-modal-2')?.addEventListener('click', () => closeModal('modal-edit-class'));

document.getElementById('save-edit-class-modal')?.addEventListener('click', async () => {
  const title = document.getElementById('edit-class-name-input').value.trim();
  const desc = document.getElementById('edit-class-desc-input').value.trim();
  if (!title) { Swal.fire('Error', 'Class name is required.', 'error'); return; }
  try {
    await apiPut(`/api/teacher/classes/${state.editingClassId}`, { title, description: desc });
    closeModal('modal-edit-class');
    Swal.fire({ icon: 'success', title: 'Class updated!', timer: 1200, showConfirmButton: false });
    fetchAndRenderClasses();
  } catch (err) { Swal.fire('Error', err.message, 'error'); }
});

document.getElementById('delete-class-modal-btn')?.addEventListener('click', async () => {
  closeModal('modal-edit-class');
  const result = await Swal.fire({
    title: 'Delete class?', text: 'This will also delete all sections inside.',
    icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/classes/${state.editingClassId}`);
      fetchAndRenderClasses();
      Swal.fire('Deleted', 'Class deleted.', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  }
});




async function openClassDetail(classId) {
  state.currentClassId = classId;
  const cls = TEACHER_DATA.classes.find(c => c.id === classId);
  if (!cls) return;
  const classDetailName = document.getElementById('class-detail-name');
  const classDetailMeta = document.getElementById('class-detail-meta');
  if (classDetailName) classDetailName.textContent = cls.title;
  if (classDetailMeta) classDetailMeta.textContent = cls.subject_code || '';
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




function openSectionDetail(sectionId, sectionName) {
  state.currentSectionId = sectionId;
  const cls = TEACHER_DATA.classes.find(c => c.id === state.currentClassId);
  const sectionDetailName = document.getElementById('section-detail-name');
  const sectionDetailClass = document.getElementById('section-detail-class');
  if (sectionDetailName) sectionDetailName.textContent = sectionName;
  if (sectionDetailClass && cls) sectionDetailClass.textContent = cls.title;
  switchTab('lessons');
  showView('section-detail');
}




function renderSectionsList() {
  const list = document.getElementById('sections-list');
  if (!list) return;
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
    } catch (e) { }
    const card = document.createElement('div');
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-card-left">
        <div class="section-icon-wrap"><i class="fa-solid fa-layer-group"></i></div>
        <div>
          <div class="section-card-name">${escapeHtml(sec.name)}</div>
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
        <button class="section-dots-btn" data-secid="${sec.id}" title="Options">${dotsIconSVG()}</button>
      </div>`;
    const copyBtn = card.querySelector('.copy-code-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(copyBtn.getAttribute('data-code'));
        Swal.fire({ icon: 'success', title: 'Copied!', text: `Enrollment code ${copyBtn.getAttribute('data-code')} copied to clipboard`, timer: 1500, showConfirmButton: false });
      });
    }
    card.querySelector('.section-dots-btn').addEventListener('click', e => { e.stopPropagation(); openEditSectionModal(sec.id); });
    card.addEventListener('click', e => {
      if (!e.target.closest('.section-dots-btn') && !e.target.closest('.copy-code-btn')) openSectionDetail(sec.id, sec.name);
    });
    list.appendChild(card);
  });
}




function openEditSectionModal(sectionId) {
  state.editingSectionId = sectionId;
  const sec = TEACHER_DATA.sections.find(s => s.id === sectionId);
  document.getElementById('edit-section-name-input').value = sec.name;
  document.getElementById('edit-modal-code-display').innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #666;">Display Code:</strong> <span style="font-family: monospace;">${sec.code}</span>
    </div>
    <div>
      <strong style="color: #666;"><i class="fa-solid fa-key"></i> Enrollment Code (share with students):</strong><br/>
      <span style="font-family: monospace; font-size: 18px; font-weight: bold; background: #f0fdf4; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">${sec.enrollment_code || 'N/A'}</span>
      <button class="copy-code-modal-btn" data-code="${sec.enrollment_code}" style="margin-left: 10px; padding: 4px 12px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-copy"></i> Copy</button>
    </div>`;
  setTimeout(() => {
    const copyBtn = document.querySelector('.copy-code-modal-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyBtn.getAttribute('data-code'));
        Swal.fire({ icon: 'success', title: 'Copied!', text: `Enrollment code ${copyBtn.getAttribute('data-code')} copied`, timer: 1500, showConfirmButton: false });
      });
    }
  }, 100);
  document.getElementById('edit-section-code-input').value = '';
  document.getElementById('edit-section-code-input').disabled = true;
  document.getElementById('edit-section-code-input').placeholder = 'Code cannot be changed';
  openModal('modal-edit-section');
}

document.getElementById('cancel-edit-section-modal')?.addEventListener('click', () => closeModal('modal-edit-section'));
document.getElementById('cancel-edit-section-modal-2')?.addEventListener('click', () => closeModal('modal-edit-section'));

document.getElementById('save-edit-section-modal')?.addEventListener('click', async () => {
  const name = document.getElementById('edit-section-name-input').value.trim();
  if (!name) { Swal.fire('Error', 'Section name is required.', 'error'); return; }
  try {
    await apiPut(`/api/teacher/sections/${state.editingSectionId}`, { name });
    closeModal('modal-edit-section');
    Swal.fire({ icon: 'success', title: 'Section updated!', timer: 1200, showConfirmButton: false });
    await fetchAndRenderSections(state.currentClassId);
  } catch (err) { Swal.fire('Error', err.message, 'error'); }
});

document.getElementById('delete-section-modal-btn')?.addEventListener('click', async () => {
  closeModal('modal-edit-section');
  const result = await Swal.fire({ title: 'Delete section?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#cc0000' });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/sections/${state.editingSectionId}`);
      await fetchAndRenderSections(state.currentClassId);
      Swal.fire('Deleted', 'Section deleted.', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  }
});




function switchTab(tab) {
  state.activeSectionTab = tab;
  document.querySelectorAll('.detail-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.detail-tab-panel').forEach(c => c.classList.remove('active'));
  const activeTab = document.getElementById('tab-' + tab);
  if (activeTab) activeTab.classList.add('active');
  if (tab === 'lessons') fetchAndRenderMaterials();
  else if (tab === 'quizzes') fetchAndRenderQuizzes();
  else if (tab === 'assignments') fetchAndRenderAssignments();
  else if (tab === 'students') fetchAndRenderStudents();
}

document.querySelectorAll('.detail-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});




async function fetchAndRenderMaterials() {
  if (!state.currentSectionId) return;
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
  if (!list) return;
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
        <div class="item-icon-wrap"><i class="fa-solid fa-book-open"></i></div>
        <div class="material-card-info">
          <span class="material-card-name">${escapeHtml(mat.title)}</span>
          <span class="material-card-desc">${escapeHtml(mat.description || '')}</span>
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
  const matTitleDisplay = document.getElementById('mat-title-display');
  const matSectionLabel = document.getElementById('mat-section-label');
  const matDetailDesc = document.getElementById('mat-detail-desc');
  if (matTitleDisplay) matTitleDisplay.textContent = mat.title;
  if (matSectionLabel) matSectionLabel.textContent = document.getElementById('section-detail-name')?.textContent || '';
  if (matDetailDesc) matDetailDesc.textContent = mat.description || 'No description provided.';
  const link = document.getElementById('mat-detail-link');
  if (link) {
    if (mat.pdf_url) {
      link.href = mat.pdf_url;
      const span = link.querySelector('span');
      if (span) span.textContent = 'Open Lesson';
      const linkCard = document.getElementById('mat-link-card');
      const textWrapper = document.querySelector('.material-link-text-wrapper');
      if (linkCard) linkCard.style.display = 'flex';
      if (textWrapper) textWrapper.style.display = 'block';
    } else {
      link.href = '#';
      const span = link.querySelector('span');
      if (span) span.textContent = 'No file attached';
      const linkCard = document.getElementById('mat-link-card');
      const textWrapper = document.querySelector('.material-link-text-wrapper');
      if (linkCard) linkCard.style.display = 'none';
      if (textWrapper) textWrapper.style.display = 'none';
    }
  }
  state.activeCompletionTab.mat = 'pending';
  const completionTabs = document.querySelector('#view-material-detail .completion-tabs');
  if (completionTabs) renderCompletionTabs(completionTabs, 'mat');
  renderCompletionStudents('mat-done-students', 'material', mat.id, 'pending');
  showView('material-detail');
}

async function deleteMaterial(id) {
  const result = await Swal.fire({ title: 'Delete material?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#cc0000' });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/materials/${id}`);
      fetchAndRenderMaterials();
      Swal.fire('Deleted', 'Material deleted.', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  }
}




async function fetchAndRenderQuizzes() {
  if (!state.currentSectionId) return;
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
  if (!list) return;
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
        <div class="item-icon-wrap"><i class="fa-solid fa-clipboard-question"></i></div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${escapeHtml(quiz.title)}</span>
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

  const quizTitleDisplay = document.getElementById('quiz-title-display');
  const quizSectionLabel = document.getElementById('quiz-section-label');
  const quizDetailDue    = document.getElementById('quiz-detail-due');
  const quizDetailDesc   = document.getElementById('quiz-detail-desc');

  if (quizTitleDisplay) quizTitleDisplay.textContent = quiz.title;
  if (quizSectionLabel) quizSectionLabel.textContent = document.getElementById('section-detail-name')?.textContent || '';
  if (quizDetailDue) quizDetailDue.textContent = quiz.due_date
    ? new Date(quiz.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : 'No due date';
  if (quizDetailDesc) quizDetailDesc.textContent = quiz.description || 'No description provided.';

  const link = document.getElementById('quiz-detail-link');
  if (link) {
    if (quiz.link) {
      link.href = quiz.link;
      const span = link.querySelector('span');
      if (span) span.textContent = 'Open Quiz';
      const linkCard = document.getElementById('quiz-link-card');
      const textWrapper = document.querySelector('.quiz-link-text-wrapper');
      if (linkCard) linkCard.style.display = 'flex';
      if (textWrapper) textWrapper.style.display = 'block';
    } else {
      link.href = '#';
      const span = link.querySelector('span');
      if (span) span.textContent = 'No link attached';
      const linkCard = document.getElementById('quiz-link-card');
      const textWrapper = document.querySelector('.quiz-link-text-wrapper');
      if (linkCard) linkCard.style.display = 'none';
      if (textWrapper) textWrapper.style.display = 'none';
    }
  }

  state.activeCompletionTab.quiz = 'pending';
  const completionTabs = document.querySelector('#view-quiz-detail .completion-tabs');
  if (completionTabs) renderCompletionTabs(completionTabs, 'quiz');

  
  apiGet(`/api/teacher/quizzes?sectionId=${state.currentSectionId}`).then(freshQuizzes => {
    TEACHER_DATA.quizzes = freshQuizzes;
    renderCompletionStudents('quiz-done-students', 'quiz', quiz.id, 'pending');
  }).catch(() => {
    renderCompletionStudents('quiz-done-students', 'quiz', quiz.id, 'pending');
  });

  
  injectSubmittedFilesSection('#view-quiz-detail', 'quiz-submitted-files', 'quiz', quiz.id);

  showView('quiz-detail');
}

async function deleteQuiz(id) {
  const result = await Swal.fire({ title: 'Delete quiz?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#cc0000' });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/quizzes/${id}`);
      fetchAndRenderQuizzes();
      Swal.fire('Deleted', 'Quiz deleted.', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  }
}




async function fetchAndRenderAssignments() {
  if (!state.currentSectionId) return;
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
  if (!list) return;
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
        <div class="item-icon-wrap"><i class="fa-solid fa-file-lines"></i></div>
        <div class="quiz-card-info">
          <span class="quiz-card-name">${escapeHtml(assign.title)}</span>
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

  const assignTitleDisplay = document.getElementById('assign-title-display');
  const assignSectionLabel = document.getElementById('assign-section-label');
  const assignDetailDue    = document.getElementById('assign-detail-due');
  const assignDetailPoints = document.getElementById('assign-detail-points');
  const assignDetailDesc   = document.getElementById('assign-detail-desc');

  if (assignTitleDisplay) assignTitleDisplay.textContent = assign.title;
  if (assignSectionLabel) assignSectionLabel.textContent = document.getElementById('section-detail-name')?.textContent || '';
  if (assignDetailDue) assignDetailDue.textContent = assign.due_date
    ? new Date(assign.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : 'No due date';
  if (assignDetailPoints) assignDetailPoints.textContent = (assign.points || 0) + ' points';
  if (assignDetailDesc) assignDetailDesc.textContent = assign.description || 'No instructions provided.';

  const link = document.getElementById('assign-detail-link');
  if (link) {
    if (assign.link) {
      link.href = assign.link;
      const linkCard = document.getElementById('assign-link-card');
      if (linkCard) linkCard.style.display = 'flex';
    } else {
      link.href = '#';
      const linkCard = document.getElementById('assign-link-card');
      if (linkCard) linkCard.style.display = 'none';
    }
  }

  state.activeCompletionTab.assign = 'pending';
  const completionTabs = document.querySelector('#view-assignment-detail .completion-tabs');
  if (completionTabs) renderCompletionTabs(completionTabs, 'assign');

  
  apiGet(`/api/teacher/assignments?sectionId=${state.currentSectionId}`).then(freshAssignments => {
    TEACHER_DATA.assignments = freshAssignments;
    renderCompletionStudents('assign-done-students', 'assignment', assign.id, 'pending');
  }).catch(() => {
    renderCompletionStudents('assign-done-students', 'assignment', assign.id, 'pending');
  });

  
  injectSubmittedFilesSection('#view-assignment-detail', 'assign-submitted-files', 'assignment', assign.id);

  showView('assignment-detail');
}

async function deleteAssignment(id) {
  const result = await Swal.fire({ title: 'Delete assignment?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#cc0000' });
  if (result.isConfirmed) {
    try {
      await apiDelete(`/api/teacher/assignments/${id}`);
      fetchAndRenderAssignments();
      Swal.fire('Deleted', 'Assignment deleted.', 'success');
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  }
}




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
  if (!container) return;
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
      status: s.completed_at ? doneStatus : 'pending',
      score: s.score || null
    }));

    
    let maxPoints = 100;
    if (type === 'quiz') {
      const quiz = TEACHER_DATA.quizzes.find(q => Number(q.id) === Number(itemId));
      const pts = parseFloat(quiz?.points);
      maxPoints = (!isNaN(pts) && pts > 0) ? pts : 100;
    } else if (type === 'assignment') {
      const assign = TEACHER_DATA.assignments.find(a => Number(a.id) === Number(itemId));
      const pts = parseFloat(assign?.points);
      maxPoints = (!isNaN(pts) && pts > 0) ? pts : 100;
    }

    if (type !== 'material') {
      let dueDate = null;
      if (type === 'quiz') {
        const quiz = TEACHER_DATA.quizzes.find(q => Number(q.id) === Number(itemId));
        dueDate = quiz?.due_date;
      } else if (type === 'assignment') {
        const assign = TEACHER_DATA.assignments.find(a => Number(a.id) === Number(itemId));
        dueDate = assign?.due_date;
      }
      if (dueDate) {
        const now = new Date();
        filtered = filtered.map(s => {
          if (s.status === 'pending' && new Date(dueDate) < now) return { ...s, status: 'missed' };
          return s;
        });
      }
    }

    let matchStatus = filterStatus;
    if (filterStatus === 'finished' && type !== 'material') matchStatus = 'passed';
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

    const showScoreInput = (filterStatus === 'passed' || filterStatus === 'finished') && (type === 'quiz' || type === 'assignment');

    for (const s of filtered) {
      const badgeClass = s.status === 'finished' || s.status === 'passed' ? 'badge-done' : s.status === 'missed' ? 'badge-missed' : 'badge-pending';
      const badgeLabel = s.status === 'finished' ? '✓ Finished' : s.status === 'passed' ? '✓ Passed' : s.status === 'missed' ? '✗ Missed' : '⏳ Pending';
      const fullName = `${s.first_name} ${s.last_name}`.trim();
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
      const profilePicUrl = s.profile_picture ? `/uploads/profile-pictures/${s.profile_picture}?t=${Date.now()}` : defaultAvatar;

      const card = document.createElement('div');
      card.className = 'student-done-card';

      let scoreHtml = '';
      if (showScoreInput) {
        const studentId = s.user_id || s.id;
        scoreHtml = `
          <div class="score-input-group" style="display:flex;align-items:center;gap:8px;margin-left:12px;flex-shrink:0;">
            <input 
              type="number" class="score-input"
              data-student-id="${studentId}" data-item-id="${itemId}" data-item-type="${type}"
              data-max-points="${maxPoints}"
              data-original-value="${s.score !== null && s.score !== undefined ? s.score : ''}"
              value="${s.score !== null && s.score !== undefined ? s.score : ''}"
              placeholder="Score" min="0" max="${maxPoints}" step="1"
              style="width:70px;padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;text-align:center;outline:none;transition:all 0.2s;"
              onfocus="this.style.borderColor='var(--accent)';this.style.boxShadow='0 0 0 3px rgba(59,108,247,0.1)';"
              onblur="saveStudentScore(this); this.style.borderColor='var(--border)'; this.style.boxShadow='none';"
              onkeydown="if(event.key==='Enter'){this.blur();}"
            />
            <span style="font-size:11px;color:var(--text-muted);">/ ${maxPoints}</span>
            <i class="fa-solid fa-check score-saved-icon" style="display:none;color:#10b981;font-size:14px;"></i>
          </div>`;
      } else if (s.score !== null && s.score !== undefined && (type === 'quiz' || type === 'assignment')) {
        scoreHtml = `<span style="font-weight:700;color:var(--accent);font-size:13px;margin-left:12px;flex-shrink:0;">${s.score}/${maxPoints}</span>`;
      }

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
          <div class="student-avatar" style="width:40px;height:40px;border-radius:50%;overflow:hidden;background:#6366f1;flex-shrink:0;">
            <img src="${profilePicUrl}" alt="${escapeHtml(fullName)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='${defaultAvatar}'">
          </div>
          <div style="min-width:0;">
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(fullName)}</div>
            <div style="font-size:12px;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(s.email)}</div>
          </div>
        </div>
        <span class="student-done-badge ${badgeClass}" style="flex-shrink:0;">${badgeLabel}</span>
        ${scoreHtml}`;
      container.appendChild(card);
    }
  } catch (err) {
    console.error('Error rendering completion students:', err);
    container.innerHTML = '<div class="empty-state">Failed to load students.</div>';
  }
}




async function saveStudentScore(inputElement) {
  const studentId = inputElement.dataset.studentId;
  const itemId = inputElement.dataset.itemId;
  const itemType = inputElement.dataset.itemType;
  const maxPoints = parseFloat(inputElement.dataset.maxPoints) || 100;
  const score = inputElement.value.trim();
  const savedIcon = inputElement.parentElement.querySelector('.score-saved-icon');

  if (score === inputElement.dataset.originalValue) return;

  if (score === '') {
    try {
      const response = await fetch('/api/teacher/scores', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: parseInt(studentId), itemType, itemId: parseInt(itemId), sectionId: state.currentSectionId, score: null })
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Failed to clear score'); }
      inputElement.dataset.originalValue = '';
      showScoreSaved(inputElement, savedIcon);
    } catch (err) {
      Swal.fire('Error', 'Failed to clear score: ' + err.message, 'error');
      inputElement.value = inputElement.dataset.originalValue || '';
    }
    return;
  }

  const numScore = parseFloat(score);
  if (isNaN(numScore) || numScore < 0 || numScore > maxPoints) {
    Swal.fire('Invalid Score', `Score must be between 0 and ${maxPoints}`, 'warning');
    inputElement.value = inputElement.dataset.originalValue || '';
    return;
  }

  try {
    const response = await fetch('/api/teacher/scores', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: parseInt(studentId), itemType, itemId: parseInt(itemId), sectionId: state.currentSectionId, score: numScore })
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Failed to save score'); }
    inputElement.dataset.originalValue = numScore;
    showScoreSaved(inputElement, savedIcon);
  } catch (err) {
    Swal.fire('Error', 'Failed to save score: ' + err.message, 'error');
    inputElement.value = inputElement.dataset.originalValue || '';
  }
}

function showScoreSaved(inputElement, iconElement) {
  if (iconElement) {
    iconElement.style.display = 'inline-block';
    setTimeout(() => { iconElement.style.display = 'none'; }, 2000);
  }
  inputElement.style.borderColor = '#10b981';
  inputElement.style.backgroundColor = '#f0fdf4';
  setTimeout(() => {
    inputElement.style.borderColor = 'var(--border)';
    inputElement.style.backgroundColor = 'white';
  }, 1500);
}






function injectSubmittedFilesSection(viewSelector, containerId, type, itemId) {
  const view = document.querySelector(viewSelector);
  if (!view) return;

  
  if (!document.getElementById('sf-spin-style')) {
    const style = document.createElement('style');
    style.id = 'sf-spin-style';
    style.textContent = `@keyframes sf-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  const wrapperId = containerId + '-wrapper';
  let wrapper = document.getElementById(wrapperId);

  if (!wrapper) {
    
    const appendTarget =
      view.querySelector('.detail-content') ||
      view.querySelector('.section-content') ||
      view.querySelector('.view-body') ||
      view.querySelector('.tab-content') ||
      view;

    wrapper = document.createElement('div');
    wrapper.id = wrapperId;
    wrapper.innerHTML = `
      <div style="
        margin-top: 28px;
        border-top: 1.5px solid #f0f0f7;
        padding-top: 24px;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        ">
          <div style="
            width: 34px; height: 34px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(99,102,241,0.25);
          ">
            <i class="fa-solid fa-file-arrow-up" style="color:white;font-size:14px;"></i>
          </div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#1f2937;line-height:1.2;">Submitted Files</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:1px;">Student file submissions for this item</div>
          </div>
        </div>
        <div id="${containerId}"></div>
      </div>`;
    appendTarget.appendChild(wrapper);
  }

  
  renderSubmittedFiles(containerId, type, itemId);
}

async function renderSubmittedFiles(containerId, type, itemId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 0 4px 0;">
      <div style="width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:sf-spin 0.7s linear infinite;flex-shrink:0;"></div>
      <span style="color:#94a3b8;font-size:13px;">Loading submitted files...</span>
    </div>`;

  try {
    const res = await fetch(
      `/api/teacher/submitted-files?itemType=${type}&itemId=${itemId}&sectionId=${state.currentSectionId}`
    );

    if (!res.ok) {
      if (res.status === 404) { renderSubmittedFilesEmpty(container, type); return; }
      throw new Error(`HTTP ${res.status}`);
    }

    const submissions = await res.json();

    if (!submissions || submissions.length === 0) {
      renderSubmittedFilesEmpty(container, type);
      return;
    }

    renderSubmittedFilesList(container, submissions);
  } catch (err) {
    console.warn('Submitted files fetch error:', err.message);
    renderSubmittedFilesEmpty(container, type);
  }
}

function renderSubmittedFilesEmpty(container, type) {
  container.innerHTML = `
    <div style="
      border: 1.5px dashed #e5e7eb;
      border-radius: 10px;
      padding: 28px 20px;
      text-align: center;
      color: #b0b7c3;
      background: #fafbff;
    ">
      <i class="fa-solid fa-file-circle-xmark" style="font-size:28px;margin-bottom:10px;display:block;color:#d1d5db;"></i>
      <div style="font-size:13px;font-weight:500;">No files submitted yet for this ${type}.</div>
      <div style="font-size:11px;margin-top:4px;color:#c4c9d4;">Student submissions will appear here once they upload.</div>
    </div>`;
}

function renderSubmittedFilesList(container, submissions) {
  const fileIconMap = {
    pdf: { icon: 'fa-file-pdf', color: '#ef4444' },
    doc: { icon: 'fa-file-word', color: '#2563eb' },
    docx: { icon: 'fa-file-word', color: '#2563eb' },
    ppt: { icon: 'fa-file-powerpoint', color: '#f97316' },
    pptx: { icon: 'fa-file-powerpoint', color: '#f97316' },
    xls: { icon: 'fa-file-excel', color: '#16a34a' },
    xlsx: { icon: 'fa-file-excel', color: '#16a34a' },
    png: { icon: 'fa-file-image', color: '#8b5cf6' },
    jpg: { icon: 'fa-file-image', color: '#8b5cf6' },
    jpeg: { icon: 'fa-file-image', color: '#8b5cf6' },
    gif: { icon: 'fa-file-image', color: '#8b5cf6' },
    zip: { icon: 'fa-file-zipper', color: '#f59e0b' },
    rar: { icon: 'fa-file-zipper', color: '#f59e0b' },
    mp4: { icon: 'fa-file-video', color: '#06b6d4' },
    mp3: { icon: 'fa-file-audio', color: '#ec4899' },
  };

  function getFileInfo(filename) {
    if (!filename) return { icon: 'fa-file', color: '#6b7280' };
    const ext = filename.split('.').pop().toLowerCase();
    return fileIconMap[ext] || { icon: 'fa-file', color: '#6b7280' };
  }

  container.innerHTML = '';

  submissions.forEach((sub, idx) => {
    const fullName = `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || 'Unknown';
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
    const profilePicUrl = sub.profile_picture
      ? `/uploads/profile-pictures/${sub.profile_picture}?t=${Date.now()}`
      : defaultAvatar;

    const submittedAt = sub.submitted_at
      ? new Date(sub.submitted_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      })
      : 'Unknown time';

    
    let filesHtml = '';

    
    if (Array.isArray(sub.files) && sub.files.length > 0) {
      sub.files.forEach(f => {
        const fi = getFileInfo(f.name);
        filesHtml += buildFileChip(f.url, f.name, fi, null);
      });

      
    } else if (sub.file_url) {
      const displayName = sub.file_name || sub.filename || 'File';
      const fi = getFileInfo(displayName);
      const size = sub.file_size ? formatFileSize(sub.file_size) : null;
      filesHtml = buildFileChip(sub.file_url, displayName, fi, size);

      
    } else if (sub.link) {
      const shortLink = sub.link.length > 55 ? sub.link.slice(0, 52) + '…' : sub.link;
      filesHtml = `
        <a href="${escapeHtml(sub.link)}" target="_blank" rel="noopener noreferrer"
          style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#6366f1;text-decoration:none;font-weight:500;margin-top:6px;padding:4px 0;transition:opacity 0.15s;"
          onmouseover="this.style.opacity='0.7';" onmouseout="this.style.opacity='1';">
          <i class="fa-solid fa-link" style="font-size:11px;flex-shrink:0;"></i>
          <span>${escapeHtml(shortLink)}</span>
          <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;color:#9ca3af;flex-shrink:0;"></i>
        </a>`;

    } else {
      filesHtml = `<span style="font-size:12px;color:#9ca3af;margin-top:6px;display:inline-block;font-style:italic;">No file attached</span>`;
    }

    const card = document.createElement('div');
    card.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 13px 15px;
      background: ${idx % 2 === 0 ? '#fafbff' : '#ffffff'};
      border: 1px solid #eef0f7;
      border-radius: 10px;
      margin-bottom: 8px;
      transition: box-shadow 0.18s, border-color 0.18s;
    `;
    card.onmouseenter = () => { card.style.boxShadow = '0 2px 12px rgba(99,102,241,0.09)'; card.style.borderColor = '#dde1f5'; };
    card.onmouseleave = () => { card.style.boxShadow = 'none'; card.style.borderColor = '#eef0f7'; };

    card.innerHTML = `
      <div style="width:38px;height:38px;border-radius:50%;overflow:hidden;background:#6366f1;flex-shrink:0;">
        <img src="${profilePicUrl}" alt="${escapeHtml(fullName)}"
          style="width:100%;height:100%;object-fit:cover;"
          onerror="this.src='${defaultAvatar}'">
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div style="min-width:0;">
            <span style="font-weight:600;font-size:13px;color:#1f2937;">${escapeHtml(fullName)}</span>
            <span style="font-size:11px;color:#9ca3af;margin-left:7px;white-space:nowrap;">${escapeHtml(sub.email || '')}</span>
          </div>
          <span style="font-size:11px;color:#94a3b8;white-space:nowrap;flex-shrink:0;padding-top:1px;">
            <i class="fa-regular fa-clock" style="margin-right:3px;"></i>${submittedAt}
          </span>
        </div>
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
          ${filesHtml}
        </div>
      </div>`;

    container.appendChild(card);
  });
}

function buildFileChip(url, name, fileInfo, size) {
  const shortName = name && name.length > 36 ? name.slice(0, 33) + '…' : (name || 'File');
  return `
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"
      style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #f8fafc;
        border: 1.5px solid #e5e7eb;
        border-radius: 8px;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 500;
        color: #374151;
        text-decoration: none;
        transition: all 0.15s;
        max-width: 280px;
        white-space: nowrap;
        overflow: hidden;
      "
      onmouseover="this.style.background='#eef0ff';this.style.borderColor='#6366f1';this.style.color='#4338ca';"
      onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e5e7eb';this.style.color='#374151';"
      title="${escapeHtml(name || 'File')}"
    >
      <i class="fa-solid ${fileInfo.icon}" style="color:${fileInfo.color};font-size:13px;flex-shrink:0;"></i>
      <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(shortName)}</span>
      ${size ? `<span style="color:#9ca3af;font-size:10px;flex-shrink:0;">${size}</span>` : ''}
      <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;color:#9ca3af;flex-shrink:0;"></i>
    </a>`;
}




async function fetchAndRenderStudents() {
  if (!state.currentSectionId) {
    const enrolledEl = document.getElementById('enrolled-students-list');
    if (enrolledEl) enrolledEl.innerHTML = '<div class="empty-state">No section selected.</div>';
    return;
  }
  try {
    const enrolledEl = document.getElementById('enrolled-students-list');
    if (enrolledEl) enrolledEl.innerHTML = '<div class="loading-state">Loading students...</div>';
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
  if (!enrolledEl) return;
  enrolledEl.innerHTML = '';
  if (!TEACHER_DATA.students || TEACHER_DATA.students.length === 0) {
    enrolledEl.innerHTML = '<div class="empty-state">No enrolled students yet. Share the enrollment code with students.</div>';
    return;
  }
  TEACHER_DATA.students.forEach(student => {
    const card = document.createElement('div');
    card.className = 'student-card';
    const enrollmentDate = student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString() : 'Recently';
    const fullName = (`${student.first_name || ''} ${student.last_name || ''}`).trim() || 'Unknown';
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
    const profilePicUrl = student.profile_picture ? `/uploads/profile-pictures/${student.profile_picture}?t=${Date.now()}` : defaultAvatar;
    card.innerHTML = `
      <div class="student-card-left">
        <div class="student-avatar" style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:#6366f1;flex-shrink:0;">
          <img src="${profilePicUrl}" alt="${escapeHtml(fullName)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='${defaultAvatar}'">
        </div>
        <div>
          <div class="student-name">${escapeHtml(fullName)}</div>
          <div class="student-email">${escapeHtml(student.email)}</div>
          <div style="font-size:11px;color:#22c55e;margin-top:4px;"><i class="fa-solid fa-circle-check"></i> Enrolled: ${enrollmentDate}</div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm remove-student-btn" data-student-id="${student.id}"><i class="fa-solid fa-user-minus"></i> Remove</button>`;
    card.querySelector('.remove-student-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await removeStudent(student.id);
    });
    enrolledEl.appendChild(card);
  });
}

async function removeStudent(studentId) {
  const result = await Swal.fire({
    title: 'Remove student?', text: 'This student will be removed from this section.',
    icon: 'warning', showCancelButton: true, confirmButtonText: 'Remove', confirmButtonColor: '#cc0000'
  });
  if (result.isConfirmed) {
    try {
      const response = await fetch('/api/teacher/students', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: state.currentSectionId, studentId })
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Remove failed'); }
      Swal.fire('Removed', 'Student removed successfully.', 'success');
      await fetchAndRenderStudents();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }
}




function openModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('hidden'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
});
document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', function () { const m = this.closest('.modal-overlay'); if (m) m.classList.add('hidden'); });
});


const createClassBtn = document.getElementById('btn-create-class');
if (createClassBtn) {
  createClassBtn.addEventListener('click', () => {
    const modalClassTitle = document.getElementById('modal-class-title-text');
    const classNameInput = document.getElementById('class-name-input');
    const classDescInput = document.getElementById('class-desc-input');
    if (modalClassTitle) modalClassTitle.textContent = 'Create Class';
    if (classNameInput) classNameInput.value = '';
    if (classDescInput) classDescInput.value = '';
    openModal('modal-class');
  });
}

document.getElementById('cancel-class-modal')?.addEventListener('click', () => closeModal('modal-class'));
document.getElementById('cancel-class-modal-2')?.addEventListener('click', () => closeModal('modal-class'));

document.getElementById('save-class-modal')?.addEventListener('click', async () => {
  const title = document.getElementById('class-name-input')?.value.trim();
  const desc = document.getElementById('class-desc-input')?.value.trim();
  if (!title) { Swal.fire('Error', 'Class name is required.', 'error'); return; }
  try {
    await apiPost('/api/teacher/classes', { teacherId: TEACHER_DATA.profile.id, title, description: desc });
    closeModal('modal-class');
    Swal.fire({ icon: 'success', title: 'Class created!', timer: 1200, showConfirmButton: false });
    fetchAndRenderClasses();
  } catch (err) { Swal.fire('Error', err.message, 'error'); }
});


const addSectionBtn = document.getElementById('btn-add-section');
if (addSectionBtn) {
  addSectionBtn.addEventListener('click', () => {
    const modalSectionTitle = document.getElementById('modal-section-title-text');
    const sectionNameInput = document.getElementById('section-name-input');
    if (modalSectionTitle) modalSectionTitle.textContent = 'Add Section';
    if (sectionNameInput) sectionNameInput.value = '';
    openModal('modal-section');
  });
}

document.getElementById('cancel-section-modal')?.addEventListener('click', () => closeModal('modal-section'));
document.getElementById('cancel-section-modal-2')?.addEventListener('click', () => closeModal('modal-section'));

document.getElementById('save-section-modal')?.addEventListener('click', async () => {
  const name = document.getElementById('section-name-input')?.value.trim();
  if (!name) { Swal.fire('Error', 'Section name is required.', 'error'); return; }
  try {
    const result = await apiPost('/api/teacher/sections', { classId: state.currentClassId, name });
    closeModal('modal-section');
    Swal.fire({
      icon: 'success', title: 'Section Created!',
      html: `
        <div style="text-align: left;">
          <p><strong>Section Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Display Code:</strong> <code>${result.code}</code></p>
          <p><strong><i class="fa-solid fa-key"></i> Enrollment Code (SHARE THIS WITH STUDENTS):</strong><br/>
          <span style="background: #f0fdf4; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold; display: inline-block; margin-top: 5px;">${result.enrollment_code}</span></p>
          <button id="copy-enrollment-code" style="margin-top: 10px; padding: 5px 12px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-copy"></i> Copy Enrollment Code</button>
        </div>`,
      showConfirmButton: true, confirmButtonText: 'OK'
    });
    setTimeout(() => {
      const copyBtn = document.getElementById('copy-enrollment-code');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(result.enrollment_code);
          Swal.fire({ icon: 'success', title: 'Copied!', text: 'Enrollment code copied to clipboard', timer: 1500, showConfirmButton: false });
        });
      }
    }, 100);
    await fetchAndRenderSections(state.currentClassId);
  } catch (err) { Swal.fire('Error', err.message, 'error'); }
});




function setupFileUploadZone(zoneId, inputId, previewId, browseBtnId, stateKey) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const browseBtn = document.getElementById(browseBtnId);
  if (!zone || !input || !preview) return;
  zone.addEventListener('click', (e) => { if (e.target === browseBtn || (browseBtn && browseBtn.contains(e.target))) return; input.click(); });
  if (browseBtn) browseBtn.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
  input.addEventListener('change', (e) => { if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0], preview, stateKey); });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', (e) => { e.preventDefault(); zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) { input.files = e.dataTransfer.files; handleFileSelect(e.dataTransfer.files[0], preview, stateKey); }
  });
}

function handleFileSelect(file, previewContainer, stateKey) {
  if (!file) return;
  state[stateKey] = file;
  previewContainer.innerHTML = `
    <div class="file-preview-item">
      <div class="file-preview-item-left">
        <i class="fa-solid fa-file" style="color: var(--accent);"></i>
        <div>
          <div class="file-preview-name">${escapeHtml(file.name)}</div>
          <div class="file-preview-size">${formatFileSize(file.size)}</div>
        </div>
      </div>
      <button class="file-preview-remove" onclick="window.removeFile('${stateKey}', '${previewContainer.id}')">&times;</button>
    </div>`;
}

window.removeFile = function (stateKey, previewId) {
  state[stateKey] = null;
  const inputMap = { materialFile: 'material-file-input', assignmentFile: 'assignment-file-input', quizFile: 'quiz-file-input' };
  const inputId = inputMap[stateKey];
  if (inputId) { const input = document.getElementById(inputId); if (input) input.value = ''; }
  const preview = document.getElementById(previewId);
  if (preview) preview.innerHTML = '';
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
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
    fileBtn.classList.add('active'); linkBtn.classList.remove('active');
    if (fileZone) fileZone.classList.remove('hidden');
    if (linkGroup) linkGroup.classList.add('hidden');
    state[stateKey] = 'file';
  });
  linkBtn.addEventListener('click', () => {
    linkBtn.classList.add('active'); fileBtn.classList.remove('active');
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


function openMaterialModal(editId = null) {
  state.editingMaterialId = editId;
  const mat = editId ? TEACHER_DATA.materials.find(m => m.id === editId) : null;
  const modalTitle = document.getElementById('modal-material-title-text');
  const nameInput = document.getElementById('material-name-input');
  const descInput = document.getElementById('material-desc-input');
  const linkInput = document.getElementById('material-link-input');
  if (modalTitle) modalTitle.textContent = editId ? 'Edit Material' : 'Add Learning Material';
  if (nameInput) nameInput.value = mat ? mat.title : '';
  if (descInput) descInput.value = mat ? mat.description || '' : '';
  if (linkInput) linkInput.value = mat ? mat.pdf_url || '' : '';
  state.materialFile = null;
  const filePreview = document.getElementById('material-file-preview');
  const fileInput = document.getElementById('material-file-input');
  if (filePreview) filePreview.innerHTML = '';
  if (fileInput) fileInput.value = '';
  state.materialUploadType = 'file';
  const fileTypeBtn = document.getElementById('material-file-type-btn');
  const linkTypeBtn = document.getElementById('material-link-type-btn');
  const fileZone = document.getElementById('material-file-upload-zone');
  const linkGroup = document.getElementById('material-link-input-group');
  if (fileTypeBtn) fileTypeBtn.classList.add('active');
  if (linkTypeBtn) linkTypeBtn.classList.remove('active');
  if (fileZone) fileZone.classList.remove('hidden');
  if (linkGroup) linkGroup.classList.add('hidden');
  openModal('modal-material');
}

const addMaterialBtn = document.getElementById('btn-add-material');
if (addMaterialBtn) addMaterialBtn.addEventListener('click', () => openMaterialModal());
const editMaterialBtn = document.getElementById('btn-edit-material');
if (editMaterialBtn) editMaterialBtn.addEventListener('click', () => openMaterialModal(state.currentMaterialId));
const deleteMaterialBtn = document.getElementById('btn-delete-material');
if (deleteMaterialBtn) deleteMaterialBtn.addEventListener('click', () => deleteMaterial(state.currentMaterialId));

document.getElementById('cancel-material-modal')?.addEventListener('click', () => closeModal('modal-material'));
document.getElementById('cancel-material-modal-2')?.addEventListener('click', () => closeModal('modal-material'));

document.getElementById('save-material-modal')?.addEventListener('click', async () => {
  const title = document.getElementById('material-name-input')?.value.trim();
  const desc = document.getElementById('material-desc-input')?.value.trim();
  if (!title) { Swal.fire('Error', 'Material name is required.', 'error'); return; }
  try {
    if (state.materialUploadType === 'file' && state.materialFile) {
      const formData = new FormData();
      formData.append('title', title); formData.append('description', desc);
      formData.append('sectionId', state.currentSectionId); formData.append('file', state.materialFile);
      if (state.editingMaterialId) await apiPutFormData(`/api/teacher/materials/${state.editingMaterialId}`, formData);
      else await apiPostFormData('/api/teacher/materials', formData);
    } else {
      const link = document.getElementById('material-link-input')?.value.trim();
      if (state.editingMaterialId) await apiPut(`/api/teacher/materials/${state.editingMaterialId}`, { title, description: desc, link });
      else await apiPost('/api/teacher/materials', { sectionId: state.currentSectionId, title, description: desc, link });
    }
    closeModal('modal-material'); fetchAndRenderMaterials();
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
  } catch (err) { Swal.fire('Error', err.message, 'error'); }
});


function openQuizModal(editId = null) {
  state.editingQuizId = editId;
  const quiz = editId ? TEACHER_DATA.quizzes.find(q => q.id === editId) : null;
  const modalTitle = document.getElementById('modal-quiz-title-text');
  const nameInput = document.getElementById('quiz-name-input');
  const descInput = document.getElementById('quiz-desc-input');
  const linkInput = document.getElementById('quiz-link-input');
  const dueInput = document.getElementById('quiz-due-input');
  const pointsInput = document.getElementById('quiz-points-input');
  if (modalTitle) modalTitle.textContent = editId ? 'Edit Quiz' : 'Add Quiz';
  if (nameInput) nameInput.value = quiz ? quiz.title : '';
  if (descInput) descInput.value = quiz ? quiz.description || '' : '';
  if (linkInput) linkInput.value = quiz ? quiz.link || '' : '';
  if (dueInput) dueInput.value = quiz && quiz.due_date ? formatDateTimeLocal(quiz.due_date) : '';
  if (pointsInput) pointsInput.value = quiz ? quiz.points || '' : '';
  state.quizFile = null;
  const filePreview = document.getElementById('quiz-file-preview');
  const fileInput = document.getElementById('quiz-file-input');
  if (filePreview) filePreview.innerHTML = '';
  if (fileInput) fileInput.value = '';
  state.quizUploadType = 'file';
  const fileTypeBtn = document.getElementById('quiz-file-type-btn');
  const linkTypeBtn = document.getElementById('quiz-link-type-btn');
  const fileZone = document.getElementById('quiz-file-upload-zone');
  const linkGroup = document.getElementById('quiz-link-input-group');
  if (fileTypeBtn) fileTypeBtn.classList.add('active');
  if (linkTypeBtn) linkTypeBtn.classList.remove('active');
  if (fileZone) fileZone.classList.remove('hidden');
  if (linkGroup) linkGroup.classList.add('hidden');
  openModal('modal-quiz');
}

const addQuizBtn = document.getElementById('btn-add-quiz');
if (addQuizBtn) addQuizBtn.addEventListener('click', () => openQuizModal());
const editQuizBtn = document.getElementById('btn-edit-quiz');
if (editQuizBtn) editQuizBtn.addEventListener('click', () => openQuizModal(state.currentQuizId));
const deleteQuizBtn = document.getElementById('btn-delete-quiz');
if (deleteQuizBtn) deleteQuizBtn.addEventListener('click', () => deleteQuiz(state.currentQuizId));

document.getElementById('cancel-quiz-modal')?.addEventListener('click', () => closeModal('modal-quiz'));
document.getElementById('cancel-quiz-modal-2')?.addEventListener('click', () => closeModal('modal-quiz'));

document.getElementById('save-quiz-modal')?.addEventListener('click', async () => {
  const title = document.getElementById('quiz-name-input')?.value.trim();
  const desc = document.getElementById('quiz-desc-input')?.value.trim();
  const due = document.getElementById('quiz-due-input')?.value;
  const points = document.getElementById('quiz-points-input')?.value;
  if (!title) { Swal.fire('Error', 'Quiz title is required.', 'error'); return; }
  try {
    if (state.quizUploadType === 'file' && state.quizFile) {
      const formData = new FormData();
      formData.append('title', title); formData.append('description', desc);
      formData.append('sectionId', state.currentSectionId); formData.append('dueDate', due);
      formData.append('points', points); formData.append('file', state.quizFile);
      if (state.editingQuizId) await apiPutFormData(`/api/teacher/quizzes/${state.editingQuizId}`, formData);
      else await apiPostFormData('/api/teacher/quizzes', formData);
    } else {
      const link = document.getElementById('quiz-link-input')?.value.trim();
      if (state.editingQuizId) await apiPut(`/api/teacher/quizzes/${state.editingQuizId}`, { title, description: desc, link, dueDate: due, points });
      else await apiPost('/api/teacher/quizzes', { sectionId: state.currentSectionId, title, description: desc, link, dueDate: due, points });
    }
    closeModal('modal-quiz'); fetchAndRenderQuizzes();
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
  } catch (err) { Swal.fire('Error', err.message, 'error'); }
});


function openAssignmentModal(editId = null) {
  state.editingAssignmentId = editId;
  const assign = editId ? TEACHER_DATA.assignments.find(a => a.id === editId) : null;
  const modalTitle = document.getElementById('modal-assignment-title-text');
  const nameInput = document.getElementById('assignment-name-input');
  const descInput = document.getElementById('assignment-desc-input');
  const dueInput = document.getElementById('assignment-due-input');
  const pointsInput = document.getElementById('assignment-points-input');
  const linkInput = document.getElementById('assignment-link-input');
  if (modalTitle) modalTitle.textContent = editId ? 'Edit Assignment' : 'Add Assignment';
  if (nameInput) nameInput.value = assign ? assign.title : '';
  if (descInput) descInput.value = assign ? assign.description || '' : '';
  if (dueInput) dueInput.value = assign && assign.due_date ? formatDateTimeLocal(assign.due_date) : '';
  if (pointsInput) pointsInput.value = assign ? assign.points || '' : '';
  if (linkInput) linkInput.value = assign ? assign.link || '' : '';
  state.assignmentFile = null;
  const filePreview = document.getElementById('assignment-file-preview');
  const fileInput = document.getElementById('assignment-file-input');
  if (filePreview) filePreview.innerHTML = '';
  if (fileInput) fileInput.value = '';
  state.assignmentUploadType = 'file';
  const fileTypeBtn = document.getElementById('assignment-file-type-btn');
  const linkTypeBtn = document.getElementById('assignment-link-type-btn');
  const fileZone = document.getElementById('assignment-file-upload-zone');
  const linkGroup = document.getElementById('assignment-link-input-group');
  if (fileTypeBtn) fileTypeBtn.classList.add('active');
  if (linkTypeBtn) linkTypeBtn.classList.remove('active');
  if (fileZone) fileZone.classList.remove('hidden');
  if (linkGroup) linkGroup.classList.add('hidden');
  openModal('modal-assignment');
}

const addAssignmentBtn = document.getElementById('btn-add-assignment');
if (addAssignmentBtn) addAssignmentBtn.addEventListener('click', () => openAssignmentModal());
const editAssignmentBtn = document.getElementById('btn-edit-assignment');
if (editAssignmentBtn) editAssignmentBtn.addEventListener('click', () => openAssignmentModal(state.currentAssignmentId));
const deleteAssignmentBtn = document.getElementById('btn-delete-assignment');
if (deleteAssignmentBtn) deleteAssignmentBtn.addEventListener('click', () => deleteAssignment(state.currentAssignmentId));

document.getElementById('cancel-assignment-modal')?.addEventListener('click', () => closeModal('modal-assignment'));
document.getElementById('cancel-assignment-modal-2')?.addEventListener('click', () => closeModal('modal-assignment'));

document.getElementById('save-assignment-modal')?.addEventListener('click', async () => {
  const title = document.getElementById('assignment-name-input')?.value.trim();
  const desc = document.getElementById('assignment-desc-input')?.value.trim();
  const due = document.getElementById('assignment-due-input')?.value;
  const points = document.getElementById('assignment-points-input')?.value;
  if (!title) { Swal.fire('Error', 'Assignment title is required.', 'error'); return; }
  try {
    if (state.assignmentUploadType === 'file' && state.assignmentFile) {
      const formData = new FormData();
      formData.append('title', title); formData.append('description', desc);
      formData.append('sectionId', state.currentSectionId); formData.append('dueDate', due);
      formData.append('points', points); formData.append('file', state.assignmentFile);
      if (state.editingAssignmentId) await apiPutFormData(`/api/teacher/assignments/${state.editingAssignmentId}`, formData);
      else await apiPostFormData('/api/teacher/assignments', formData);
    } else {
      const link = document.getElementById('assignment-link-input')?.value.trim();
      if (state.editingAssignmentId) await apiPut(`/api/teacher/assignments/${state.editingAssignmentId}`, { title, description: desc, link, dueDate: due, points });
      else await apiPost('/api/teacher/assignments', { sectionId: state.currentSectionId, title, description: desc, link, dueDate: due, points });
    }
    closeModal('modal-assignment'); fetchAndRenderAssignments();
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1200, showConfirmButton: false });
  } catch (err) { Swal.fire('Error', err.message, 'error'); }
});




const newAnnouncementBtn = document.getElementById('btn-new-announcement');
if (newAnnouncementBtn) {
  newAnnouncementBtn.addEventListener('click', async () => {
    state.editingAnnouncementId = null;
    const announceTitle = document.getElementById('announcement-title-input');
    const announceBody = document.getElementById('announcement-body-input');
    const modalTitle = document.getElementById('modal-announcement-title-text');
    if (modalTitle) modalTitle.textContent = 'New Announcement';
    if (announceTitle) announceTitle.value = '';
    if (announceBody) announceBody.value = '';
    await fetchAllClassesAndSectionsForAnnouncements();
    renderAudienceCheckboxes([]);
    openModal('modal-announcement');
  });
}

document.getElementById('cancel-announcement-modal')?.addEventListener('click', () => closeModal('modal-announcement'));
document.getElementById('cancel-announcement-modal-2')?.addEventListener('click', () => closeModal('modal-announcement'));

document.getElementById('save-announcement-modal')?.addEventListener('click', async () => {
  const title = document.getElementById('announcement-title-input')?.value.trim();
  const body = document.getElementById('announcement-body-input')?.value.trim();
  const checkboxes = document.querySelectorAll('#audience-checkboxes input[type="checkbox"]:checked');
  const selectedAudiences = Array.from(checkboxes).map(cb => cb.value);
  if (!title || !body) { Swal.fire('Error', 'Title and message are required.', 'error'); return; }
  if (selectedAudiences.length === 0) { Swal.fire('Error', 'Please select at least one section for the audience.', 'error'); return; }
  let audienceString;
  if (selectedAudiences.includes('all_classes')) {
    audienceString = 'All Classes';
  } else {
    audienceString = selectedAudiences.filter(v => v.startsWith('section_')).join(',');
  }
  try {
    let response;
    if (state.editingAnnouncementId) {
      response = await fetch(`/api/announcements/${state.editingAnnouncementId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, audience: audienceString })
      });
    } else {
      response = await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: TEACHER_DATA.profile.id, title, body, audience: audienceString })
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
  } catch (err) { Swal.fire('Error', 'Could not connect to server.', 'error'); }
});




async function renderProgressView() {
  showView('progress');
  const list = document.getElementById('progress-list');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Loading progress...</div>';
  try {
    const classes = await apiGet(`/api/teacher/classes?teacherId=${TEACHER_DATA.profile.id}`);
    if (!classes.length) { list.innerHTML = '<div class="empty-state">No classes to show progress for.</div>'; return; }
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
          } catch (e) { }
        }
        const pct = possible > 0 ? Math.round((doneCount / possible) * 100) : 0;
        const card = document.createElement('div');
        card.className = 'progress-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <div class="progress-card-icon"><i class="fa-solid fa-layer-group"></i></div>
          <div class="progress-card-body">
            <div class="progress-card-header">
              <span class="progress-card-name">${escapeHtml(sec.name)}</span>
              <span class="progress-card-count">${pct}% completion</span>
            </div>
            <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            <div class="progress-class-label">${escapeHtml(cls.title)} · ${enrolled.length} students · ${totalItems} items</div>
          </div>`;
        card.addEventListener('click', () => showProgressDetailPopup(sec, cls, materials, quizzes, assignments, enrolled, doneCount, possible, pct));
        list.appendChild(card);
      }
    }
  } catch (err) {
    console.error('Progress view error:', err);
    list.innerHTML = '<div class="empty-state">Failed to load progress.</div>';
  }
}

function showProgressDetailPopup(section, cls, materials, quizzes, assignments, students, doneCount, possible, pct) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9998;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;`;
  const popup = document.createElement('div');
  popup.style.cssText = `background:white;border-radius:16px;padding:32px;width:90%;max-width:700px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:9999;animation:slideUp 0.3s ease;position:relative;`;

  let itemsHTML = '';
  if (materials.length > 0) {
    itemsHTML += `<div style="margin-bottom:20px;"><h4 style="margin:0 0 12px 0;color:#6366f1;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;"><i class="fa-solid fa-book-open"></i> Materials (${materials.length})</h4>`;
    materials.forEach(mat => {
      itemsHTML += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-radius:8px;margin-bottom:8px;"><div style="display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i><span style="font-weight:500;">${escapeHtml(mat.title)}</span></div><span style="font-size:12px;color:#888;font-weight:500;">Learning Material</span></div>`;
    });
    itemsHTML += '</div>';
  }
  if (quizzes.length > 0) {
    itemsHTML += `<div style="margin-bottom:20px;"><h4 style="margin:0 0 12px 0;color:#f59e0b;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;"><i class="fa-solid fa-clipboard-question"></i> Quizzes (${quizzes.length})</h4>`;
    quizzes.forEach(quiz => {
      const dueDate = quiz.due_date ? new Date(quiz.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';
      itemsHTML += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fffbeb;border-radius:8px;margin-bottom:8px;"><div style="display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-question-circle" style="color:#f59e0b;"></i><span style="font-weight:500;">${escapeHtml(quiz.title)}</span></div><span style="font-size:12px;color:#888;font-weight:500;">Due: ${dueDate} · ${quiz.points || 0} pts</span></div>`;
    });
    itemsHTML += '</div>';
  }
  if (assignments.length > 0) {
    itemsHTML += `<div style="margin-bottom:20px;"><h4 style="margin:0 0 12px 0;color:#ef4444;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;"><i class="fa-solid fa-file-lines"></i> Assignments (${assignments.length})</h4>`;
    assignments.forEach(assign => {
      const dueDate = assign.due_date ? new Date(assign.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';
      itemsHTML += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fef2f2;border-radius:8px;margin-bottom:8px;"><div style="display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-file-pen" style="color:#ef4444;"></i><span style="font-weight:500;">${escapeHtml(assign.title)}</span></div><span style="font-size:12px;color:#888;font-weight:500;">Due: ${dueDate} · ${assign.points || 0} pts</span></div>`;
    });
    itemsHTML += '</div>';
  }
  if (!materials.length && !quizzes.length && !assignments.length) {
    itemsHTML = '<p style="text-align:center;color:#888;padding:20px;">No items added yet.</p>';
  }

  popup.innerHTML = `
    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
      <div>
        <h3 style="margin:0 0 4px 0;color:#1f2937;font-size:20px;">${escapeHtml(section.name)}</h3>
        <p style="margin:0;color:#6b7280;font-size:14px;">${escapeHtml(cls.title)}</p>
      </div>
      <button class="close-popup-btn" style="background:none;border:none;font-size:24px;color:#9ca3af;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6';this.style.color='#374151';" onmouseout="this.style.background='none';this.style.color='#9ca3af';">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
      <div style="background:#f0f9ff;padding:16px;border-radius:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#6366f1;">${students.length}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Students</div>
      </div>
      <div style="background:#f0fdf4;padding:16px;border-radius:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#10b981;">${materials.length + quizzes.length + assignments.length}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Total Items</div>
      </div>
      <div style="background:#faf5ff;padding:16px;border-radius:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#8b5cf6;">${pct}%</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Completion</div>
      </div>
    </div>
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:600;color:#374151;">Overall Progress</span>
        <span style="font-size:13px;font-weight:600;color:#6366f1;">${doneCount}/${possible} completions</span>
      </div>
      <div style="width:100%;height:8px;background:#e5e7eb;border-radius:10px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;transition:width 0.5s ease;"></div>
      </div>
    </div>
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
      <h3 style="margin:0 0 16px 0;color:#1f2937;font-size:16px;"><i class="fa-solid fa-list-check"></i> Items</h3>
      ${itemsHTML}
    </div>`;

  popup.querySelector('.close-popup-btn').addEventListener('click', () => document.body.removeChild(overlay));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
  const handleEscape = (e) => { if (e.key === 'Escape') { document.body.removeChild(overlay); document.removeEventListener('keydown', handleEscape); } };
  document.addEventListener('keydown', handleEscape);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}




async function renderAnnouncementsView() {
  showView('announcements');
  const list = document.getElementById('announcements-list');
  if (list) list.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Loading announcements...</div>';
  await fetchAnnouncements();
}

async function fetchAnnouncements() {
  try {
    const response = await fetch(`/api/teacher-announcements?teacherId=${TEACHER_DATA.profile.id}`);
    if (!response.ok) throw new Error('Failed to fetch');
    state.announcements = await response.json();
    renderAnnouncementList();
  } catch (err) {
    const list = document.getElementById('announcements-list');
    if (list) list.innerHTML = '<div class="empty-state">Failed to load announcements.</div>';
  }
}

function renderAnnouncementList() {
  const list = document.getElementById('announcements-list');
  if (!list) return;
  list.innerHTML = '';
  if (!state.announcements.length) { list.innerHTML = '<div class="empty-state">No announcements yet.</div>'; return; }
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
      <div class="announcement-icon-wrap"><i class="fa-solid fa-bullhorn"></i></div>
      <div class="announcement-body-wrap">
        <div class="announcement-footer">
          <div>
            <div class="announcement-title">${escapeHtml(a.title)}</div>
            <div class="announcement-meta">${escapeHtml(audienceDisplay)} · ${date}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="editAnnouncementFromList(${a.id})"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAnnouncementFromList(${a.id})"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </div>
        <div class="announcement-body" style="margin-top:10px">${escapeHtml(a.body)}</div>
      </div>`;
    list.appendChild(card);
  });
}

window.editAnnouncementFromList = async function (id) {
  const a = state.announcements.find(an => an.id === id);
  if (!a) return;
  state.editingAnnouncementId = id;
  const titleInput = document.getElementById('announcement-title-input');
  const bodyInput = document.getElementById('announcement-body-input');
  const modalTitle = document.getElementById('modal-announcement-title-text');
  if (titleInput) titleInput.value = a.title;
  if (bodyInput) bodyInput.value = a.body;
  if (modalTitle) modalTitle.textContent = 'Edit Announcement';
  await fetchAllClassesAndSectionsForAnnouncements();
  const preselectedAudiences = a.audience ? a.audience.split(',').map(s => s.trim()) : [];
  renderAudienceCheckboxes(preselectedAudiences);
  openModal('modal-announcement');
};

window.deleteAnnouncementFromList = async function (id) {
  const result = await Swal.fire({ title: 'Delete announcement?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#cc0000' });
  if (result.isConfirmed) {
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      Swal.fire('Deleted', 'Announcement deleted.', 'success');
      renderAnnouncementsView();
    } catch (err) { Swal.fire('Error', 'Could not connect to server.', 'error'); }
  }
};




const backToClasses = document.getElementById('back-to-classes');
if (backToClasses) backToClasses.addEventListener('click', fetchAndRenderClasses);
const backToClassDetail = document.getElementById('back-to-class-detail');
if (backToClassDetail) backToClassDetail.addEventListener('click', () => openClassDetail(state.currentClassId));
const backToSectionLessons = document.getElementById('back-to-section-lessons');
if (backToSectionLessons) {
  backToSectionLessons.addEventListener('click', () => {
    if (state.currentSectionId) { openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name')?.textContent || ''); switchTab('lessons'); }
  });
}
const backToSectionQuizzes = document.getElementById('back-to-section-quizzes');
if (backToSectionQuizzes) {
  backToSectionQuizzes.addEventListener('click', () => {
    if (state.currentSectionId) { openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name')?.textContent || ''); switchTab('quizzes'); }
  });
}
const backToSectionAssignments = document.getElementById('back-to-section-assignments');
if (backToSectionAssignments) {
  backToSectionAssignments.addEventListener('click', () => {
    if (state.currentSectionId) { openSectionDetail(state.currentSectionId, document.getElementById('section-detail-name')?.textContent || ''); switchTab('assignments'); }
  });
}




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
  const badgeEl = document.getElementById('profile-badge-classes');
  if (badgeEl) { const count = TEACHER_DATA.classes.length; badgeEl.textContent = `${count} Class${count !== 1 ? 'es' : ''}`; }
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

const editProfileBtn = document.getElementById('btn-edit-profile');
if (editProfileBtn) editProfileBtn.addEventListener('click', () => showTeacherProfilePanel('edit-info'));
const cancelEditBtn = document.getElementById('btn-cancel-edit');
if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => showTeacherProfilePanel('main'));

const saveProfileBtn = document.getElementById('btn-save-profile');
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', async () => {
    const updated = {
      userId: TEACHER_DATA.profile.id,
      firstName: document.getElementById('edit-firstname')?.value.trim(),
      lastName: document.getElementById('edit-lastname')?.value.trim(),
      username: document.getElementById('edit-username')?.value.trim(),
      email: document.getElementById('edit-email')?.value.trim()
    };
    if (!updated.firstName || !updated.lastName || !updated.username || !updated.email) {
      Swal.fire('Missing', 'All fields are required.', 'warning'); return;
    }
    try {
      const response = await fetch('/api/update-profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      });
      const data = await response.json();
      if (response.ok) {
        const savedUser = { id: updated.userId, first_name: updated.firstName, last_name: updated.lastName, username: updated.username, email: updated.email, role: TEACHER_DATA.profile.role };
        localStorage.setItem('eduhub_user', JSON.stringify(savedUser));
        await fetchTeacherProfile();
        refreshTeacherProfileDisplay();
        showTeacherProfilePanel('main');
        Swal.fire('Saved', 'Profile updated successfully.', 'success');
      } else { Swal.fire('Error', data.message || 'Failed to update profile.', 'error'); }
    } catch (error) { Swal.fire('Error', 'Could not connect to server.', 'error'); }
  });
}

const changePasswordBtn = document.getElementById('btn-change-password');
if (changePasswordBtn) {
  changePasswordBtn.addEventListener('click', () => {
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
}

const cancelPasswordBtn = document.getElementById('btn-cancel-password');
if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', () => showTeacherProfilePanel('main'));

const sendCodeBtn = document.getElementById('btn-send-code');
if (sendCodeBtn) {
  sendCodeBtn.addEventListener('click', async () => {
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
      } else { Swal.fire('Error', data.message, 'error'); }
    } catch (error) { Swal.fire('Error', 'Could not connect to server.', 'error'); }
  });
}

const savePasswordBtn = document.getElementById('btn-save-password');
if (savePasswordBtn) {
  savePasswordBtn.addEventListener('click', async () => {
    const code = document.getElementById('pw-verification-code')?.value.trim();
    const newPw = document.getElementById('pw-new')?.value.trim();
    const confirm = document.getElementById('pw-confirm')?.value.trim();
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
        ['pw-new', 'pw-confirm', 'pw-verification-code'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        showTeacherProfilePanel('main');
      } else { Swal.fire('Error', data.message || 'Failed to change password.', 'error'); }
    } catch (error) { Swal.fire('Error', 'Could not connect to server.', 'error'); }
  });
}

const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
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
}




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




function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(async function init() {
  console.log('Initializing teacher dashboard...');
  await fetchTeacherProfile();
  refreshTeacherProfileDisplay();
  initFileUploads();
  await fetchAndRenderClasses();
  console.log('Teacher dashboard initialized');
})();

(function setupTeacherSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    dropdown.innerHTML = '';
    if (!q) { dropdown.classList.add('hidden'); return; }

    const results = [];

    TEACHER_DATA.classes.forEach(cls => {
      if (cls.title.toLowerCase().includes(q)) {
        results.push({ type: 'class', label: cls.title, sub: cls.subject_code || 'Class', action: () => openClassDetail(cls.id) });
      }
    });
    TEACHER_DATA.sections.forEach(sec => {
      if (sec.name.toLowerCase().includes(q)) {
        results.push({ type: 'section', label: sec.name, sub: 'Section · Code: ' + (sec.enrollment_code || sec.code), action: () => openSectionDetail(sec.id, sec.name) });
      }
    });
    TEACHER_DATA.materials.forEach(mat => {
      if (mat.title.toLowerCase().includes(q) || (mat.description || '').toLowerCase().includes(q)) {
        results.push({ type: 'material', label: mat.title, sub: mat.description || 'Learning Material', action: () => openMaterialDetail(mat) });
      }
    });
    TEACHER_DATA.quizzes.forEach(quiz => {
      if (quiz.title.toLowerCase().includes(q) || (quiz.description || '').toLowerCase().includes(q)) {
        results.push({ type: 'quiz', label: quiz.title, sub: quiz.due_date ? 'Due: ' + new Date(quiz.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Quiz', action: () => openQuizDetail(quiz) });
      }
    });
    TEACHER_DATA.assignments.forEach(assign => {
      if (assign.title.toLowerCase().includes(q) || (assign.description || '').toLowerCase().includes(q)) {
        results.push({ type: 'assignment', label: assign.title, sub: assign.due_date ? 'Due: ' + new Date(assign.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Assignment', action: () => openAssignmentDetail(assign) });
      }
    });
    TEACHER_DATA.students.forEach(stu => {
      const fullName = `${stu.first_name} ${stu.last_name}`.toLowerCase();
      const email = (stu.email || '').toLowerCase();
      if (fullName.includes(q) || email.includes(q)) {
        results.push({ type: 'student', label: `${stu.first_name} ${stu.last_name}`, sub: stu.email || 'Student', action: () => { if (state.currentSectionId) switchTab('students'); } });
      }
    });

    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-no-results" style="padding:14px 16px;color:#94a3b8;font-size:13px;text-align:center;">No results found</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    const typeColors = {
      class: { bg: '#eff6ff', color: '#2563eb' },
      section: { bg: '#f0fdf4', color: '#16a34a' },
      material: { bg: '#faf5ff', color: '#7c3aed' },
      quiz: { bg: '#fff7ed', color: '#ea580c' },
      assignment: { bg: '#fff1f2', color: '#e11d48' },
      student: { bg: '#f0f9ff', color: '#0284c7' }
    };

    results.slice(0, 5).forEach(r => {
      const colors = typeColors[r.type] || { bg: '#f1f5f9', color: '#475569' };
      const el = document.createElement('div');
      el.className = 'search-result-item';
      el.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background 0.15s;';
      el.onmouseenter = () => el.style.background = '#f8fafc';
      el.onmouseleave = () => el.style.background = 'transparent';
      el.innerHTML = `
        <span style="background:${colors.bg};color:${colors.color};font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;flex-shrink:0;">${r.type}</span>
        <div style="min-width:0;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.label)}</p>
          <p style="margin:0;font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.sub)}</p>
        </div>`;
      el.addEventListener('click', () => { input.value = ''; dropdown.classList.add('hidden'); r.action(); });
      dropdown.appendChild(el);
    });

    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', e => { if (!e.target.closest('.search-bar')) dropdown.classList.add('hidden'); });
  input.addEventListener('keydown', e => { if (e.key === 'Escape') { dropdown.classList.add('hidden'); input.blur(); } });
})();
