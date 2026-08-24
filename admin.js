(function () {
  // ===== Setup =====
  const configured = window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.includes('PASTE_') && !window.SUPABASE_ANON_KEY.includes('PASTE_');

  if (!configured) {
    document.getElementById('configWarning').style.display = 'block';
  }

  const supabase = configured
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  const loginScreen = document.getElementById('loginScreen');
  const noRoleScreen = document.getElementById('noRoleScreen');
  const dashboard = document.getElementById('dashboard');

  // ===== Role state (set once per session, after fetching user_profiles) =====
  let currentUserId = null;
  let currentRole = null;       // 'super_admin' | 'admin' | 'agent'
  let currentAgentId = null;
  let currentAgentEmail = null; // used to scope the listings query for agents

  function applyRoleVisibility(role) {
    document.querySelectorAll('[data-roles]').forEach(el => {
      const allowed = el.dataset.roles.split(',');
      el.style.display = allowed.includes(role) ? '' : 'none';
    });
    const listingsLabel = document.getElementById('listingsTabLabel');
    const listingsTitle = document.getElementById('listingsPanelTitle');
    const addListingBtn = document.getElementById('addListingBtn');
    if (role === 'agent') {
      if (listingsLabel) listingsLabel.textContent = 'My Listings';
      if (listingsTitle) listingsTitle.textContent = 'My Listings';
      if (addListingBtn) addListingBtn.style.display = 'none';
    }
  }

  // ===== Auth =====
  async function checkSession() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      showDashboard(data.session.user);
    }
  }

  async function showDashboard(user) {
    loginScreen.style.display = 'none';
    noRoleScreen.style.display = 'none';

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles').select('*').eq('id', user.id).maybeSingle();

    if (profileErr || !profile) {
      dashboard.style.display = 'none';
      noRoleScreen.style.display = 'flex';
      return;
    }

    currentUserId = user.id;
    currentRole = profile.role;
    currentAgentId = profile.agent_id;

    if (currentAgentId) {
      const { data: agentRow } = await supabase.from('agents').select('email').eq('id', currentAgentId).maybeSingle();
      currentAgentEmail = agentRow ? agentRow.email : null;
    }

    dashboard.style.display = 'block';
    document.getElementById('userEmail').textContent = profile.full_name ? `${profile.full_name} (${user.email})` : user.email;
    applyRoleVisibility(currentRole);

    loadListings();
    if (currentRole === 'admin' || currentRole === 'super_admin') {
      loadOffplan();
      loadServices();
      loadContactContent();
      loadOffices();
      loadFaqs();
      loadAgents();
      loadCareersContent();
      loadJobs();
      loadHomepageContent();
      loadChromeSettings();
      loadThemeSettings();
      loadUsers();
    }
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    if (!supabase) { errorEl.textContent = 'Supabase is not configured yet.'; return; }
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { errorEl.textContent = error.message; return; }
    showDashboard(data.user);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
  document.getElementById('noRoleLogoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  checkSession();

  // ===== Tabs =====
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ===== Modal helpers =====
  function openModal(id) { document.getElementById(id).classList.add('is-open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('is-open'); }
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // ===== Image upload helper =====
  async function uploadImage(file) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const { error } = await supabase.storage.from('property-photos').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('property-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  // ===== Drag-to-reorder (native HTML5 DnD, works for any row/block list) =====
  function makeSortable(container, itemSelector, handleSelector) {
    if (container.dataset.sortableInit) return;
    container.dataset.sortableInit = '1';
    let draggedEl = null;
    container.addEventListener('dragstart', (e) => {
      const handle = e.target.closest(handleSelector);
      if (!handle) { e.preventDefault(); return; }
      draggedEl = handle.closest(itemSelector);
      if (!draggedEl) return;
      draggedEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setDragImage(draggedEl, 12, 12); } catch (err) {}
    });
    container.addEventListener('dragend', () => {
      if (draggedEl) draggedEl.classList.remove('dragging');
      draggedEl = null;
    });
    container.addEventListener('dragover', (e) => {
      if (!draggedEl) return;
      e.preventDefault();
      const target = e.target.closest(itemSelector);
      if (!target || target === draggedEl || target.parentElement !== draggedEl.parentElement) return;
      const rect = target.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      container.insertBefore(draggedEl, before ? target : target.nextSibling);
    });
    container.addEventListener('drop', (e) => { if (draggedEl) e.preventDefault(); });
  }

  // ===== Repeat-row list helper (simple key/value rows) =====
  function addSimpleRow(container, fields, values) {
    const row = document.createElement('div');
    row.className = 'admin-repeat-row';
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.draggable = true;
    handle.title = 'Drag to reorder';
    handle.textContent = '⠿';
    row.appendChild(handle);
    fields.forEach(f => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = f.placeholder;
      input.dataset.field = f.key;
      input.value = (values && values[f.key]) || '';
      row.appendChild(input);
    });
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-row';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => row.remove());
    row.appendChild(removeBtn);
    container.appendChild(row);
    makeSortable(container, '.admin-repeat-row', '.drag-handle');
    return row;
  }

  function readSimpleRows(container, fields) {
    return [...container.querySelectorAll('.admin-repeat-row')].map(row => {
      const obj = {};
      fields.forEach(f => {
        const input = row.querySelector(`[data-field="${f.key}"]`);
        obj[f.key] = f.numeric ? Number(input.value) : input.value;
      });
      return obj;
    });
  }

  document.querySelectorAll('.admin-add-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add;
      if (type === 'unitTypes') {
        addSimpleRow(document.getElementById('o_unitTypesList'),
          [{ key: 'type', placeholder: 'Type e.g. 1 Bed' }, { key: 'size', placeholder: 'Size e.g. from 780 sq.ft' }, { key: 'price', placeholder: 'Price e.g. from AED 890,000' }]);
      } else if (type === 'locationHighlights') {
        addSimpleRow(document.getElementById('o_locationHighlightsList'),
          [{ key: 'label', placeholder: 'Landmark e.g. Dubai Marina Mall' }, { key: 'time', placeholder: 'Time e.g. 3 min' }]);
      } else if (type === 'paymentPlans') {
        addPaymentPlanBlock();
      }
    });
  });

  function addPaymentPlanBlock(plan) {
    const container = document.getElementById('o_paymentPlansList');
    const block = document.createElement('div');
    block.className = 'admin-plan-block';
    block.innerHTML = `
      <div class="admin-plan-block-head">
        <span class="block-drag-handle" draggable="true" title="Drag to reorder">⠿</span>
        <input type="text" class="plan-label" placeholder="Plan label e.g. 50/50" value="${plan ? plan.label : ''}">
        <button type="button" class="remove-row">×</button>
      </div>
      <div class="admin-plan-segments"></div>
      <button type="button" class="admin-add-row add-segment" style="margin-bottom:10px;">+ Add Segment</button>
      <input type="text" class="plan-note" placeholder="Note e.g. Plus 4% DLD fee + admin fee on booking." value="${plan ? plan.note || '' : ''}">
    `;
    block.querySelector('.remove-row').addEventListener('click', () => block.remove());
    const segWrap = block.querySelector('.admin-plan-segments');
    block.querySelector('.add-segment').addEventListener('click', () => {
      addSimpleRow(segWrap, [{ key: 'name', placeholder: 'Stage e.g. On Booking' }, { key: 'pct', placeholder: '%' }]);
    });
    if (plan && plan.segments) {
      plan.segments.forEach(s => addSimpleRow(segWrap, [{ key: 'name', placeholder: 'Stage e.g. On Booking' }, { key: 'pct', placeholder: '%' }], s));
    }
    container.appendChild(block);
    makeSortable(container, '.admin-plan-block', '.block-drag-handle');
  }

  function readPaymentPlans() {
    return [...document.querySelectorAll('#o_paymentPlansList .admin-plan-block')].map(block => ({
      label: block.querySelector('.plan-label').value,
      note: block.querySelector('.plan-note').value,
      segments: readSimpleRows(block.querySelector('.admin-plan-segments'), [{ key: 'name' }, { key: 'pct', numeric: true }])
    }));
  }

  // ===== LISTINGS =====
  let currentListings = [];

  async function loadListings() {
    let query = supabase.from('listings').select('*').order('created_at', { ascending: false });
    if (currentRole === 'agent') {
      query = query.eq('agent_email', currentAgentEmail || '__no_agent_linked__');
    }
    const { data, error } = await query;
    if (error) { console.error(error); return; }
    currentListings = data;
    const tbody = document.getElementById('listingsTableBody');
    if (!data.length) {
      tbody.innerHTML = currentRole === 'agent'
        ? `<tr class="admin-empty-row"><td colspan="6">No listings are assigned to you yet — ask an admin to set your email as the agent on a listing.</td></tr>`
        : `<tr class="admin-empty-row"><td colspan="6">No listings yet — click "Add New Listing" to create one.</td></tr>`;
      return;
    }
    const canDelete = currentRole === 'admin' || currentRole === 'super_admin';
    tbody.innerHTML = data.map(l => `
      <tr>
        <td>${l.title}</td>
        <td>${l.type === 'sale' ? 'For Sale' : 'For Rent'}</td>
        <td>${l.price_label}</td>
        <td>${l.community}</td>
        <td>${l.featured ? '<span class="featured-dot"></span>' : ''}</td>
        <td class="admin-row-actions">
          <button class="edit-btn" data-edit="${l.id}">Edit</button>
          ${canDelete ? `<button class="delete-btn" data-delete="${l.id}">Delete</button>` : ''}
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openListingForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteListing(b.dataset.delete)));
  }

  function resetListingForm() {
    document.getElementById('listingForm').reset();
    document.getElementById('l_originalId').value = '';
    document.getElementById('l_hero').value = '';
    document.getElementById('l_heroPreview').style.display = 'none';
    document.getElementById('l_galleryPreview').innerHTML = '';
    document.getElementById('l_galleryPreview').dataset.urls = '[]';
    document.getElementById('listingFormError').textContent = '';
  }

  function openListingForm(id) {
    resetListingForm();
    document.getElementById('listingModalTitle').textContent = id ? 'Edit Listing' : 'Add Listing';
    if (id) {
      const l = currentListings.find(x => x.id === id);
      document.getElementById('l_originalId').value = l.id;
      document.getElementById('l_id').value = l.id;
      document.getElementById('l_title').value = l.title;
      document.getElementById('l_community').value = l.community;
      document.getElementById('l_city').value = l.city;
      document.getElementById('l_type').value = l.type;
      document.getElementById('l_category').value = l.category;
      document.getElementById('l_price').value = l.price;
      document.getElementById('l_priceLabel').value = l.price_label;
      document.getElementById('l_priceSuffix').value = l.price_suffix || '';
      document.getElementById('l_beds').value = l.beds;
      document.getElementById('l_baths').value = l.baths;
      document.getElementById('l_sqft').value = l.sqft;
      document.getElementById('l_tags').value = (l.tags || []).join(', ');
      document.getElementById('l_hero').value = l.hero;
      if (l.hero) { document.getElementById('l_heroPreview').src = l.hero; document.getElementById('l_heroPreview').style.display = 'block'; }
      const gp = document.getElementById('l_galleryPreview');
      gp.dataset.urls = JSON.stringify(l.gallery || []);
      gp.innerHTML = (l.gallery || []).map(u => `<img src="${u}">`).join('');
      document.getElementById('l_description').value = l.description;
      document.getElementById('l_amenities').value = (l.amenities || []).join(', ');
      document.getElementById('l_agentName').value = l.agent_name;
      document.getElementById('l_agentPhone').value = l.agent_phone;
      document.getElementById('l_agentPhoneDisplay').value = l.agent_phone_display;
      document.getElementById('l_agentEmail').value = l.agent_email;
      document.getElementById('l_featured').checked = l.featured;
    }
    openModal('listingModal');
  }

  document.getElementById('addListingBtn').addEventListener('click', () => openListingForm(null));

  document.getElementById('l_heroFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      document.getElementById('l_hero').value = url;
      const preview = document.getElementById('l_heroPreview');
      preview.src = url; preview.style.display = 'block';
    } catch (err) { document.getElementById('listingFormError').textContent = 'Image upload failed: ' + err.message; }
  });

  document.getElementById('l_galleryFiles').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    const gp = document.getElementById('l_galleryPreview');
    const existing = JSON.parse(gp.dataset.urls || '[]');
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        existing.push(url);
      }
      gp.dataset.urls = JSON.stringify(existing);
      gp.innerHTML = existing.map(u => `<img src="${u}">`).join('');
    } catch (err) { document.getElementById('listingFormError').textContent = 'Image upload failed: ' + err.message; }
  });

  document.getElementById('listingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('listingFormError');
    errorEl.textContent = '';
    const originalId = document.getElementById('l_originalId').value;
    const newId = document.getElementById('l_id').value.trim();
    const gallery = JSON.parse(document.getElementById('l_galleryPreview').dataset.urls || '[]');

    const record = {
      id: newId,
      title: document.getElementById('l_title').value,
      community: document.getElementById('l_community').value,
      city: document.getElementById('l_city').value,
      type: document.getElementById('l_type').value,
      category: document.getElementById('l_category').value,
      price: Number(document.getElementById('l_price').value),
      price_label: document.getElementById('l_priceLabel').value,
      price_suffix: document.getElementById('l_priceSuffix').value || null,
      beds: document.getElementById('l_beds').value,
      baths: document.getElementById('l_baths').value,
      sqft: document.getElementById('l_sqft').value,
      tags: document.getElementById('l_tags').value.split(',').map(s => s.trim()).filter(Boolean),
      hero: document.getElementById('l_hero').value,
      gallery: gallery,
      description: document.getElementById('l_description').value,
      amenities: document.getElementById('l_amenities').value.split(',').map(s => s.trim()).filter(Boolean),
      agent_name: document.getElementById('l_agentName').value,
      agent_phone: document.getElementById('l_agentPhone').value,
      agent_phone_display: document.getElementById('l_agentPhoneDisplay').value,
      agent_email: document.getElementById('l_agentEmail').value,
      featured: document.getElementById('l_featured').checked
    };

    if (!record.hero) { errorEl.textContent = 'Please upload a hero image.'; return; }

    let error;
    if (originalId && originalId === newId) {
      ({ error } = await supabase.from('listings').update(record).eq('id', originalId));
    } else {
      if (originalId) await supabase.from('listings').delete().eq('id', originalId);
      ({ error } = await supabase.from('listings').insert(record));
    }
    if (error) { errorEl.textContent = error.message; return; }
    closeModal('listingModal');
    loadListings();
  });

  async function deleteListing(id) {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadListings();
  }

  // ===== OFF-PLAN PROJECTS =====
  let currentOffplan = [];

  async function loadOffplan() {
    const { data, error } = await supabase.from('offplan_projects').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    currentOffplan = data;
    const tbody = document.getElementById('offplanTableBody');
    if (!data.length) {
      tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="6">No off-plan projects yet — click "Add New Project" to create one.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(p => `
      <tr>
        <td>${p.title}</td>
        <td>${p.developer}</td>
        <td>${p.price_label}</td>
        <td>${p.status}</td>
        <td>${p.featured ? '<span class="featured-dot"></span>' : ''}</td>
        <td class="admin-row-actions">
          <button class="edit-btn" data-edit="${p.id}">Edit</button>
          <button class="delete-btn" data-delete="${p.id}">Delete</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openOffplanForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteOffplan(b.dataset.delete)));
  }

  function resetOffplanForm() {
    document.getElementById('offplanForm').reset();
    document.getElementById('o_originalId').value = '';
    document.getElementById('o_hero').value = '';
    document.getElementById('o_heroPreview').style.display = 'none';
    document.getElementById('o_galleryPreview').innerHTML = '';
    document.getElementById('o_galleryPreview').dataset.urls = '[]';
    document.getElementById('o_unitTypesList').innerHTML = '';
    document.getElementById('o_paymentPlansList').innerHTML = '';
    document.getElementById('o_locationHighlightsList').innerHTML = '';
    document.getElementById('offplanFormError').textContent = '';
  }

  function openOffplanForm(id) {
    resetOffplanForm();
    document.getElementById('offplanModalTitle').textContent = id ? 'Edit Off-Plan Project' : 'Add Off-Plan Project';
    if (id) {
      const p = currentOffplan.find(x => x.id === id);
      document.getElementById('o_originalId').value = p.id;
      document.getElementById('o_id').value = p.id;
      document.getElementById('o_title').value = p.title;
      document.getElementById('o_developer').value = p.developer;
      document.getElementById('o_community').value = p.community;
      document.getElementById('o_city').value = p.city;
      document.getElementById('o_status').value = p.status;
      document.getElementById('o_statusBadge').value = p.status_badge;
      document.getElementById('o_category').value = p.category;
      document.getElementById('o_tags').value = (p.tags || []).join(', ');
      document.getElementById('o_price').value = p.price;
      document.getElementById('o_priceLabel').value = p.price_label;
      document.getElementById('o_handover').value = p.handover;
      document.getElementById('o_roi').value = p.roi || '';
      document.getElementById('o_hero').value = p.hero;
      if (p.hero) { document.getElementById('o_heroPreview').src = p.hero; document.getElementById('o_heroPreview').style.display = 'block'; }
      const gp = document.getElementById('o_galleryPreview');
      gp.dataset.urls = JSON.stringify(p.gallery || []);
      gp.innerHTML = (p.gallery || []).map(u => `<img src="${u}">`).join('');
      document.getElementById('o_description').value = p.description;
      (p.unit_types || []).forEach(u => addSimpleRow(document.getElementById('o_unitTypesList'),
        [{ key: 'type', placeholder: 'Type' }, { key: 'size', placeholder: 'Size' }, { key: 'price', placeholder: 'Price' }], u));
      (p.payment_plans || []).forEach(plan => addPaymentPlanBlock(plan));
      document.getElementById('o_amenities').value = (p.amenities || []).join(', ');
      (p.location_highlights || []).forEach(h => addSimpleRow(document.getElementById('o_locationHighlightsList'),
        [{ key: 'label', placeholder: 'Landmark' }, { key: 'time', placeholder: 'Time' }], h));
      document.getElementById('o_developerBlurb').value = p.developer_blurb || '';
      document.getElementById('o_featured').checked = p.featured;
    }
    openModal('offplanModal');
  }

  document.getElementById('addOffplanBtn').addEventListener('click', () => openOffplanForm(null));

  document.getElementById('o_heroFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      document.getElementById('o_hero').value = url;
      const preview = document.getElementById('o_heroPreview');
      preview.src = url; preview.style.display = 'block';
    } catch (err) { document.getElementById('offplanFormError').textContent = 'Image upload failed: ' + err.message; }
  });

  document.getElementById('o_galleryFiles').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    const gp = document.getElementById('o_galleryPreview');
    const existing = JSON.parse(gp.dataset.urls || '[]');
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        existing.push(url);
      }
      gp.dataset.urls = JSON.stringify(existing);
      gp.innerHTML = existing.map(u => `<img src="${u}">`).join('');
    } catch (err) { document.getElementById('offplanFormError').textContent = 'Image upload failed: ' + err.message; }
  });

  document.getElementById('offplanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('offplanFormError');
    errorEl.textContent = '';
    const originalId = document.getElementById('o_originalId').value;
    const newId = document.getElementById('o_id').value.trim();
    const gallery = JSON.parse(document.getElementById('o_galleryPreview').dataset.urls || '[]');

    const record = {
      id: newId,
      title: document.getElementById('o_title').value,
      developer: document.getElementById('o_developer').value,
      community: document.getElementById('o_community').value,
      city: document.getElementById('o_city').value,
      status: document.getElementById('o_status').value,
      status_badge: document.getElementById('o_statusBadge').value,
      category: document.getElementById('o_category').value,
      tags: document.getElementById('o_tags').value.split(',').map(s => s.trim()).filter(Boolean),
      price: Number(document.getElementById('o_price').value),
      price_label: document.getElementById('o_priceLabel').value,
      handover: document.getElementById('o_handover').value,
      roi: document.getElementById('o_roi').value,
      hero: document.getElementById('o_hero').value,
      gallery: gallery,
      description: document.getElementById('o_description').value,
      unit_types: readSimpleRows(document.getElementById('o_unitTypesList'), [{ key: 'type' }, { key: 'size' }, { key: 'price' }]),
      payment_plans: readPaymentPlans(),
      amenities: document.getElementById('o_amenities').value.split(',').map(s => s.trim()).filter(Boolean),
      location_highlights: readSimpleRows(document.getElementById('o_locationHighlightsList'), [{ key: 'label' }, { key: 'time' }]),
      developer_blurb: document.getElementById('o_developerBlurb').value,
      featured: document.getElementById('o_featured').checked
    };

    if (!record.hero) { errorEl.textContent = 'Please upload a hero image.'; return; }
    if (!record.payment_plans.length) { errorEl.textContent = 'Add at least one payment plan.'; return; }

    let error;
    if (originalId && originalId === newId) {
      ({ error } = await supabase.from('offplan_projects').update(record).eq('id', originalId));
    } else {
      if (originalId) await supabase.from('offplan_projects').delete().eq('id', originalId);
      ({ error } = await supabase.from('offplan_projects').insert(record));
    }
    if (error) { errorEl.textContent = error.message; return; }
    closeModal('offplanModal');
    loadOffplan();
  });

  async function deleteOffplan(id) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const { error } = await supabase.from('offplan_projects').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadOffplan();
  }

  // ===== SERVICES =====
  let currentServices = [];

  // populate icon <select> once from the shared icon library
  const iconSelect = document.getElementById('s_icon');
  const iconPreview = document.getElementById('s_iconPreview').querySelector('svg');
  if (window.ICON_LIBRARY) {
    Object.keys(window.ICON_LIBRARY).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = (window.ICON_LIBRARY_LABELS && window.ICON_LIBRARY_LABELS[key]) || key;
      iconSelect.appendChild(opt);
    });
  }
  function updateIconPreview() {
    const key = iconSelect.value;
    iconPreview.innerHTML = (window.ICON_LIBRARY && window.ICON_LIBRARY[key]) || '';
  }
  iconSelect.addEventListener('change', updateIconPreview);

  async function loadServices() {
    const { data, error } = await supabase.from('services').select('*').order('sort_order', { ascending: true });
    if (error) { console.error(error); return; }
    currentServices = data;
    const tbody = document.getElementById('servicesTableBody');
    if (!data.length) {
      tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="5">No services yet — click "Add New Service" to create one.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(s => `
      <tr>
        <td>${s.sort_order}</td>
        <td>${s.title}</td>
        <td>${s.cta_label}</td>
        <td>${s.cta_href}</td>
        <td class="admin-row-actions">
          <button class="edit-btn" data-edit="${s.id}">Edit</button>
          <button class="delete-btn" data-delete="${s.id}">Delete</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openServiceForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteService(b.dataset.delete)));
  }

  function resetServiceForm() {
    document.getElementById('serviceForm').reset();
    document.getElementById('s_originalId').value = '';
    document.getElementById('s_checklistList').innerHTML = '';
    document.getElementById('serviceFormError').textContent = '';
    updateIconPreview();
  }

  function openServiceForm(id) {
    resetServiceForm();
    document.getElementById('serviceModalTitle').textContent = id ? 'Edit Service' : 'Add Service';
    if (id) {
      const s = currentServices.find(x => x.id === id);
      document.getElementById('s_originalId').value = s.id;
      document.getElementById('s_id').value = s.id;
      document.getElementById('s_title').value = s.title;
      document.getElementById('s_icon').value = s.icon;
      document.getElementById('s_sortOrder').value = s.sort_order;
      document.getElementById('s_cardSummary').value = s.card_summary;
      document.getElementById('s_pageHeading').value = s.page_heading;
      document.getElementById('s_pageDescription').value = s.page_description;
      (s.checklist || []).forEach(item => addSimpleRow(document.getElementById('s_checklistList'),
        [{ key: 'text', placeholder: 'Checklist item' }], { text: item }));
      document.getElementById('s_ctaLabel').value = s.cta_label;
      document.getElementById('s_ctaHref').value = s.cta_href;
      updateIconPreview();
    }
    openModal('serviceModal');
  }

  document.getElementById('addServiceBtn').addEventListener('click', () => openServiceForm(null));
  document.getElementById('s_addChecklistRow').addEventListener('click', () => {
    addSimpleRow(document.getElementById('s_checklistList'), [{ key: 'text', placeholder: 'Checklist item' }]);
  });

  document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('serviceFormError');
    errorEl.textContent = '';
    const originalId = document.getElementById('s_originalId').value;
    const newId = document.getElementById('s_id').value.trim();

    const record = {
      id: newId,
      icon: document.getElementById('s_icon').value,
      title: document.getElementById('s_title').value,
      card_summary: document.getElementById('s_cardSummary').value,
      page_heading: document.getElementById('s_pageHeading').value,
      page_description: document.getElementById('s_pageDescription').value,
      checklist: readSimpleRows(document.getElementById('s_checklistList'), [{ key: 'text' }]).map(r => r.text).filter(Boolean),
      cta_label: document.getElementById('s_ctaLabel').value,
      cta_href: document.getElementById('s_ctaHref').value,
      sort_order: Number(document.getElementById('s_sortOrder').value)
    };

    let error;
    if (originalId && originalId === newId) {
      ({ error } = await supabase.from('services').update(record).eq('id', originalId));
    } else {
      if (originalId) await supabase.from('services').delete().eq('id', originalId);
      ({ error } = await supabase.from('services').insert(record));
    }
    if (error) { errorEl.textContent = error.message; return; }
    closeModal('serviceModal');
    loadServices();
  });

  async function deleteService(id) {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadServices();
  }

  // ===== CONTACT PAGE TEXT (single row) =====
  const contactContentFieldMap = {
    cc_heroEyebrow: 'hero_eyebrow', cc_heroHeading: 'hero_heading', cc_heroSubtitle: 'hero_subtitle',
    cc_introEyebrow: 'intro_eyebrow', cc_introHeading: 'intro_heading',
    cc_introParagraph1: 'intro_paragraph_1', cc_introParagraph2: 'intro_paragraph_2',
    cc_networkEyebrow: 'network_eyebrow', cc_networkHeading: 'network_heading', cc_networkSubtitle: 'network_subtitle',
    cc_formEyebrow: 'form_eyebrow', cc_formHeading: 'form_heading', cc_formSubtitle: 'form_subtitle',
    cc_faqEyebrow: 'faq_eyebrow', cc_faqHeading: 'faq_heading',
    cc_whatsappNumber: 'whatsapp_number', cc_generalPhone: 'general_phone', cc_generalEmail: 'general_email'
  };

  async function loadContactContent() {
    const { data, error } = await supabase.from('contact_page_content').select('*').eq('id', 'main').maybeSingle();
    if (error) { console.error(error); return; }
    if (!data) return;
    Object.keys(contactContentFieldMap).forEach(inputId => {
      const el = document.getElementById(inputId);
      if (el) el.value = data[contactContentFieldMap[inputId]] || '';
    });
  }

  document.getElementById('contactContentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('contactContentFormError');
    const successEl = document.getElementById('contactContentFormSuccess');
    errorEl.textContent = '';
    successEl.textContent = '';

    const record = { id: 'main' };
    Object.keys(contactContentFieldMap).forEach(inputId => {
      record[contactContentFieldMap[inputId]] = document.getElementById(inputId).value;
    });

    const { error } = await supabase.from('contact_page_content').upsert(record);
    if (error) { errorEl.textContent = error.message; return; }
    successEl.textContent = 'Saved.';
    setTimeout(() => { successEl.textContent = ''; }, 3000);
  });

  // ===== OFFICES =====
  let currentOffices = [];

  async function loadOffices() {
    const { data, error } = await supabase.from('offices').select('*').order('sort_order', { ascending: true });
    if (error) { console.error(error); return; }
    currentOffices = data;
    const tbody = document.getElementById('officesTableBody');
    if (!data.length) {
      tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="6">No offices yet — click "Add New Office" to create one.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(o => `
      <tr>
        <td>${o.sort_order}</td>
        <td>${o.title}</td>
        <td>${o.badge_label}</td>
        <td>${o.is_hub ? '<span class="featured-dot"></span>' : ''}</td>
        <td>${o.latitude != null && o.longitude != null ? '<span class="featured-dot"></span>' : ''}</td>
        <td class="admin-row-actions">
          <button class="edit-btn" data-edit="${o.id}">Edit</button>
          <button class="delete-btn" data-delete="${o.id}">Delete</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openOfficeForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteOffice(b.dataset.delete)));
  }

  function resetOfficeForm() {
    document.getElementById('officeForm').reset();
    document.getElementById('of_originalId').value = '';
    document.getElementById('officeFormError').textContent = '';
  }

  function openOfficeForm(id) {
    resetOfficeForm();
    document.getElementById('officeModalTitle').textContent = id ? 'Edit Office' : 'Add Office';
    if (id) {
      const o = currentOffices.find(x => x.id === id);
      document.getElementById('of_originalId').value = o.id;
      document.getElementById('of_id').value = o.id;
      document.getElementById('of_badgeLabel').value = o.badge_label;
      document.getElementById('of_title').value = o.title;
      document.getElementById('of_sortOrder').value = o.sort_order;
      document.getElementById('of_address').value = o.address;
      document.getElementById('of_phone').value = o.phone || '';
      document.getElementById('of_phoneDisplay').value = o.phone_display || '';
      document.getElementById('of_email').value = o.email || '';
      document.getElementById('of_byAppointmentNote').value = o.by_appointment_note || '';
      document.getElementById('of_mapLabel').value = o.map_label || '';
      document.getElementById('of_isHub').checked = o.is_hub;
      document.getElementById('of_latitude').value = o.latitude != null ? o.latitude : '';
      document.getElementById('of_longitude').value = o.longitude != null ? o.longitude : '';
    }
    openModal('officeModal');
  }

  document.getElementById('addOfficeBtn').addEventListener('click', () => openOfficeForm(null));

  document.getElementById('officeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('officeFormError');
    errorEl.textContent = '';
    const originalId = document.getElementById('of_originalId').value;
    const newId = document.getElementById('of_id').value.trim();
    const latVal = document.getElementById('of_latitude').value;
    const lonVal = document.getElementById('of_longitude').value;

    const record = {
      id: newId,
      badge_label: document.getElementById('of_badgeLabel').value,
      title: document.getElementById('of_title').value,
      sort_order: Number(document.getElementById('of_sortOrder').value),
      address: document.getElementById('of_address').value,
      phone: document.getElementById('of_phone').value || null,
      phone_display: document.getElementById('of_phoneDisplay').value || null,
      email: document.getElementById('of_email').value || null,
      by_appointment_note: document.getElementById('of_byAppointmentNote').value || null,
      map_label: document.getElementById('of_mapLabel').value || '',
      is_hub: document.getElementById('of_isHub').checked,
      latitude: latVal !== '' ? Number(latVal) : null,
      longitude: lonVal !== '' ? Number(lonVal) : null
    };

    let error;
    if (originalId && originalId === newId) {
      ({ error } = await supabase.from('offices').update(record).eq('id', originalId));
    } else {
      if (originalId) await supabase.from('offices').delete().eq('id', originalId);
      ({ error } = await supabase.from('offices').insert(record));
    }
    if (error) { errorEl.textContent = error.message; return; }
    closeModal('officeModal');
    loadOffices();
  });

  async function deleteOffice(id) {
    if (!confirm('Delete this office? This cannot be undone.')) return;
    const { error } = await supabase.from('offices').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadOffices();
  }

  // ===== FAQS =====
  let currentFaqs = [];

  async function loadFaqs() {
    const { data, error } = await supabase.from('faqs').select('*').order('sort_order', { ascending: true });
    if (error) { console.error(error); return; }
    currentFaqs = data;
    const tbody = document.getElementById('faqsTableBody');
    if (!data.length) {
      tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="3">No FAQs yet — click "Add New FAQ" to create one.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(f => `
      <tr>
        <td>${f.sort_order}</td>
        <td>${f.question}</td>
        <td class="admin-row-actions">
          <button class="edit-btn" data-edit="${f.id}">Edit</button>
          <button class="delete-btn" data-delete="${f.id}">Delete</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openFaqForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteFaq(b.dataset.delete)));
  }

  function resetFaqForm() {
    document.getElementById('faqForm').reset();
    document.getElementById('fq_originalId').value = '';
    document.getElementById('faqFormError').textContent = '';
  }

  function openFaqForm(id) {
    resetFaqForm();
    document.getElementById('faqModalTitle').textContent = id ? 'Edit FAQ' : 'Add FAQ';
    if (id) {
      const f = currentFaqs.find(x => x.id === id);
      document.getElementById('fq_originalId').value = f.id;
      document.getElementById('fq_id').value = f.id;
      document.getElementById('fq_sortOrder').value = f.sort_order;
      document.getElementById('fq_question').value = f.question;
      document.getElementById('fq_answer').value = f.answer;
    }
    openModal('faqModal');
  }

  document.getElementById('addFaqBtn').addEventListener('click', () => openFaqForm(null));

  document.getElementById('faqForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('faqFormError');
    errorEl.textContent = '';
    const originalId = document.getElementById('fq_originalId').value;
    const newId = document.getElementById('fq_id').value.trim();

    const record = {
      id: newId,
      question: document.getElementById('fq_question').value,
      answer: document.getElementById('fq_answer').value,
      sort_order: Number(document.getElementById('fq_sortOrder').value)
    };

    let error;
    if (originalId && originalId === newId) {
      ({ error } = await supabase.from('faqs').update(record).eq('id', originalId));
    } else {
      if (originalId) await supabase.from('faqs').delete().eq('id', originalId);
      ({ error } = await supabase.from('faqs').insert(record));
    }
    if (error) { errorEl.textContent = error.message; return; }
    closeModal('faqModal');
    loadFaqs();
  });

  async function deleteFaq(id) {
    if (!confirm('Delete this FAQ? This cannot be undone.')) return;
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadFaqs();
  }

  // ===== AGENTS =====
  let currentAgents = [];

  async function loadAgents() {
    const { data, error } = await supabase.from('agents').select('*').order('sort_order', { ascending: true });
    if (error) { console.error(error); return; }
    currentAgents = data;
    const tbody = document.getElementById('agentsTableBody');
    if (!data.length) {
      tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="5">No agents yet — click "Add New Agent" to create one.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(a => `
      <tr>
        <td>${a.sort_order}</td>
        <td>${a.name}</td>
        <td>${a.title}</td>
        <td>${a.phone_display}</td>
        <td class="admin-row-actions">
          <button class="edit-btn" data-edit="${a.id}">Edit</button>
          <button class="delete-btn" data-delete="${a.id}">Delete</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openAgentForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteAgent(b.dataset.delete)));
  }

  function resetAgentForm() {
    document.getElementById('agentForm').reset();
    document.getElementById('ag_originalId').value = '';
    document.getElementById('ag_photoUrl').value = '';
    document.getElementById('ag_photoPreview').style.display = 'none';
    document.getElementById('agentFormError').textContent = '';
  }

  function openAgentForm(id) {
    resetAgentForm();
    document.getElementById('agentModalTitle').textContent = id ? 'Edit Agent' : 'Add Agent';
    if (id) {
      const a = currentAgents.find(x => x.id === id);
      document.getElementById('ag_originalId').value = a.id;
      document.getElementById('ag_id').value = a.id;
      document.getElementById('ag_name').value = a.name;
      document.getElementById('ag_title').value = a.title;
      document.getElementById('ag_sortOrder').value = a.sort_order;
      document.getElementById('ag_photoUrl').value = a.photo_url || '';
      if (a.photo_url) { document.getElementById('ag_photoPreview').src = a.photo_url; document.getElementById('ag_photoPreview').style.display = 'block'; }
      document.getElementById('ag_phone').value = a.phone;
      document.getElementById('ag_phoneDisplay').value = a.phone_display;
      document.getElementById('ag_email').value = a.email;
      document.getElementById('ag_languages').value = (a.languages || []).join(', ');
      document.getElementById('ag_specialties').value = (a.specialties || []).join(', ');
      document.getElementById('ag_bio').value = a.bio || '';
    }
    openModal('agentModal');
  }

  document.getElementById('addAgentBtn').addEventListener('click', () => openAgentForm(null));

  document.getElementById('ag_photoFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      document.getElementById('ag_photoUrl').value = url;
      const preview = document.getElementById('ag_photoPreview');
      preview.src = url; preview.style.display = 'block';
    } catch (err) { document.getElementById('agentFormError').textContent = 'Image upload failed: ' + err.message; }
  });

  document.getElementById('agentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('agentFormError');
    errorEl.textContent = '';
    const originalId = document.getElementById('ag_originalId').value;
    const newId = document.getElementById('ag_id').value.trim();

    const record = {
      id: newId,
      name: document.getElementById('ag_name').value,
      title: document.getElementById('ag_title').value,
      photo_url: document.getElementById('ag_photoUrl').value || null,
      sort_order: Number(document.getElementById('ag_sortOrder').value),
      phone: document.getElementById('ag_phone').value,
      phone_display: document.getElementById('ag_phoneDisplay').value,
      email: document.getElementById('ag_email').value,
      languages: document.getElementById('ag_languages').value.split(',').map(s => s.trim()).filter(Boolean),
      specialties: document.getElementById('ag_specialties').value.split(',').map(s => s.trim()).filter(Boolean),
      bio: document.getElementById('ag_bio').value
    };

    let error;
    if (originalId && originalId === newId) {
      ({ error } = await supabase.from('agents').update(record).eq('id', originalId));
    } else {
      if (originalId) await supabase.from('agents').delete().eq('id', originalId);
      ({ error } = await supabase.from('agents').insert(record));
    }
    if (error) { errorEl.textContent = error.message; return; }
    closeModal('agentModal');
    loadAgents();
  });

  async function deleteAgent(id) {
    if (!confirm('Delete this agent? This cannot be undone.')) return;
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadAgents();
  }

  // ===== CAREERS PAGE TEXT (single row + 3 repeatable lists) =====
  const careersContentFieldMap = {
    cr_heroEyebrow: 'hero_eyebrow', cr_heroHeading: 'hero_heading', cr_heroSubtitle: 'hero_subtitle',
    cr_whyJoinEyebrow: 'why_join_eyebrow', cr_whyJoinHeading: 'why_join_heading', cr_whyJoinIntro: 'why_join_intro',
    cr_valuesEyebrow: 'values_eyebrow', cr_valuesHeading: 'values_heading',
    cr_jobsEyebrow: 'jobs_eyebrow', cr_jobsHeading: 'jobs_heading', cr_jobsSubtitle: 'jobs_subtitle',
    cr_cvEyebrow: 'cv_eyebrow', cr_cvHeading: 'cv_heading', cr_cvSubtitle: 'cv_subtitle', cr_cvEmail: 'cv_email',
    cr_faqEyebrow: 'faq_eyebrow', cr_faqHeading: 'faq_heading'
  };

  function addValuePropRow(container, prop) {
    const row = document.createElement('div');
    row.className = 'admin-repeat-row';
    row.style.flexWrap = 'wrap';
    const iconOptions = window.ICON_LIBRARY ? Object.keys(window.ICON_LIBRARY).map(key =>
      `<option value="${key}"${prop && prop.icon === key ? ' selected' : ''}>${(window.ICON_LIBRARY_LABELS && window.ICON_LIBRARY_LABELS[key]) || key}</option>`).join('') : '';
    row.innerHTML = `
      <select data-field="icon" style="flex:0 0 130px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font-size:0.85rem;">${iconOptions}</select>
      <input type="text" data-field="title" placeholder="Title" value="${prop ? prop.title : ''}" style="flex:1;">
      <input type="text" data-field="description" placeholder="Description" value="${prop ? prop.description : ''}" style="flex:2;">
    `;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button'; removeBtn.className = 'remove-row'; removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => row.remove());
    row.appendChild(removeBtn);
    container.appendChild(row);
  }

  function readValueProps(container) {
    return [...container.querySelectorAll('.admin-repeat-row')].map(row => ({
      icon: row.querySelector('[data-field="icon"]').value,
      title: row.querySelector('[data-field="title"]').value,
      description: row.querySelector('[data-field="description"]').value
    }));
  }

  document.getElementById('cr_addValuePropRow').addEventListener('click', () => addValuePropRow(document.getElementById('cr_valuePropsList')));
  document.getElementById('cr_addCoreValueRow').addEventListener('click', () => addSimpleRow(document.getElementById('cr_coreValuesList'), [{ key: 'title', placeholder: 'Value title' }, { key: 'tagline', placeholder: 'Short tagline' }]));
  document.getElementById('cr_addFaqRow').addEventListener('click', () => addSimpleRow(document.getElementById('cr_faqsList'), [{ key: 'question', placeholder: 'Question' }, { key: 'answer', placeholder: 'Answer' }]));

  async function loadCareersContent() {
    const { data, error } = await supabase.from('careers_page_content').select('*').eq('id', 'main').maybeSingle();
    if (error) { console.error(error); return; }
    if (!data) return;
    Object.keys(careersContentFieldMap).forEach(inputId => {
      const el = document.getElementById(inputId);
      if (el) el.value = data[careersContentFieldMap[inputId]] || '';
    });
    const vpList = document.getElementById('cr_valuePropsList');
    vpList.innerHTML = '';
    (data.value_props || []).forEach(v => addValuePropRow(vpList, v));
    const cvList = document.getElementById('cr_coreValuesList');
    cvList.innerHTML = '';
    (data.core_values || []).forEach(v => addSimpleRow(cvList, [{ key: 'title', placeholder: 'Value title' }, { key: 'tagline', placeholder: 'Short tagline' }], v));
    const faqList = document.getElementById('cr_faqsList');
    faqList.innerHTML = '';
    (data.faqs || []).forEach(f => addSimpleRow(faqList, [{ key: 'question', placeholder: 'Question' }, { key: 'answer', placeholder: 'Answer' }], f));
  }

  document.getElementById('careersContentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('careersContentFormError');
    const successEl = document.getElementById('careersContentFormSuccess');
    errorEl.textContent = '';
    successEl.textContent = '';

    const record = { id: 'main' };
    Object.keys(careersContentFieldMap).forEach(inputId => {
      record[careersContentFieldMap[inputId]] = document.getElementById(inputId).value;
    });
    record.value_props = readValueProps(document.getElementById('cr_valuePropsList'));
    record.core_values = readSimpleRows(document.getElementById('cr_coreValuesList'), [{ key: 'title' }, { key: 'tagline' }]);
    record.faqs = readSimpleRows(document.getElementById('cr_faqsList'), [{ key: 'question' }, { key: 'answer' }]);

    const { error } = await supabase.from('careers_page_content').upsert(record);
    if (error) { errorEl.textContent = error.message; return; }
    successEl.textContent = 'Saved.';
    setTimeout(() => { successEl.textContent = ''; }, 3000);
  });

  // ===== JOB LISTINGS =====
  let currentJobs = [];

  async function loadJobs() {
    const { data, error } = await supabase.from('job_listings').select('*').order('sort_order', { ascending: true });
    if (error) { console.error(error); return; }
    currentJobs = data;
    const tbody = document.getElementById('jobsTableBody');
    if (!data.length) {
      tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="5">No job listings yet — click "Add New Job" to create one.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(j => `
      <tr>
        <td>${j.sort_order}</td>
        <td>${j.title}</td>
        <td>${j.location}</td>
        <td>${j.is_active ? '<span class="featured-dot"></span>' : ''}</td>
        <td class="admin-row-actions">
          <button class="edit-btn" data-edit="${j.id}">Edit</button>
          <button class="delete-btn" data-delete="${j.id}">Delete</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openJobForm(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteJob(b.dataset.delete)));
  }

  function resetJobForm() {
    document.getElementById('jobForm').reset();
    document.getElementById('jb_originalId').value = '';
    document.getElementById('jb_isActive').checked = true;
    document.getElementById('jobFormError').textContent = '';
  }

  function openJobForm(id) {
    resetJobForm();
    document.getElementById('jobModalTitle').textContent = id ? 'Edit Job Listing' : 'Add Job Listing';
    if (id) {
      const j = currentJobs.find(x => x.id === id);
      document.getElementById('jb_originalId').value = j.id;
      document.getElementById('jb_id').value = j.id;
      document.getElementById('jb_title').value = j.title;
      document.getElementById('jb_location').value = j.location;
      document.getElementById('jb_department').value = j.department || '';
      document.getElementById('jb_jobType').value = j.job_type;
      document.getElementById('jb_experienceLevel').value = j.experience_level || '';
      document.getElementById('jb_sortOrder').value = j.sort_order;
      document.getElementById('jb_description').value = j.description || '';
      document.getElementById('jb_isActive').checked = j.is_active;
    }
    openModal('jobModal');
  }

  document.getElementById('addJobBtn').addEventListener('click', () => openJobForm(null));

  document.getElementById('jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('jobFormError');
    errorEl.textContent = '';
    const originalId = document.getElementById('jb_originalId').value;
    const newId = document.getElementById('jb_id').value.trim();

    const record = {
      id: newId,
      title: document.getElementById('jb_title').value,
      location: document.getElementById('jb_location').value,
      department: document.getElementById('jb_department').value || null,
      job_type: document.getElementById('jb_jobType').value,
      experience_level: document.getElementById('jb_experienceLevel').value || null,
      sort_order: Number(document.getElementById('jb_sortOrder').value),
      description: document.getElementById('jb_description').value,
      is_active: document.getElementById('jb_isActive').checked
    };

    let error;
    if (originalId && originalId === newId) {
      ({ error } = await supabase.from('job_listings').update(record).eq('id', originalId));
    } else {
      if (originalId) await supabase.from('job_listings').delete().eq('id', originalId);
      ({ error } = await supabase.from('job_listings').insert(record));
    }
    if (error) { errorEl.textContent = error.message; return; }
    closeModal('jobModal');
    loadJobs();
  });

  async function deleteJob(id) {
    if (!confirm('Delete this job listing? This cannot be undone.')) return;
    const { error } = await supabase.from('job_listings').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadJobs();
  }

  // ===== HOMEPAGE CONTENT (single row + 4 repeatable lists) =====
  const homepageContentFieldMap = {
    hp_heroBadgeText: 'hero_badge_text', hp_heroHeading: 'hero_heading', hp_heroSubtitle: 'hero_subtitle',
    hp_heroSearchPlaceholder: 'hero_search_placeholder',
    hp_servicesEyebrow: 'services_eyebrow', hp_servicesHeading: 'services_heading', hp_servicesSubtitle: 'services_subtitle',
    hp_listingsEyebrow: 'listings_eyebrow', hp_listingsHeading: 'listings_heading', hp_listingsSubtitle: 'listings_subtitle',
    hp_offplanEyebrow: 'offplan_eyebrow', hp_offplanHeading: 'offplan_heading', hp_offplanSubtitle: 'offplan_subtitle',
    hp_officesEyebrow: 'offices_eyebrow', hp_officesHeading: 'offices_heading', hp_officesSubtitle: 'offices_subtitle',
    hp_youtubeEyebrow: 'youtube_eyebrow', hp_youtubeHeading: 'youtube_heading', hp_youtubeSubtitle: 'youtube_subtitle',
    hp_whyusEyebrow: 'whyus_eyebrow', hp_whyusHeading: 'whyus_heading', hp_whyusSubtitle: 'whyus_subtitle',
    hp_ctaHeading: 'cta_heading', hp_ctaSubtitle: 'cta_subtitle'
  };

  function addQuickActionRow(container, item) {
    const row = document.createElement('div');
    row.className = 'admin-repeat-row';
    row.style.flexWrap = 'wrap';
    const iconOptions = window.ICON_LIBRARY ? Object.keys(window.ICON_LIBRARY).map(key =>
      `<option value="${key}"${item && item.icon === key ? ' selected' : ''}>${(window.ICON_LIBRARY_LABELS && window.ICON_LIBRARY_LABELS[key]) || key}</option>`).join('') : '';
    row.innerHTML = `
      <span class="drag-handle" draggable="true" title="Drag to reorder">⠿</span>
      <select data-field="icon" style="flex:0 0 120px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font-size:0.85rem;">${iconOptions}</select>
      <input type="text" data-field="title" placeholder="Title" value="${item ? item.title : ''}" style="flex:1;">
      <input type="text" data-field="description" placeholder="Description" value="${item ? item.description : ''}" style="flex:2;">
      <input type="text" data-field="href" placeholder="Link (e.g. listings.html)" value="${item ? item.href : ''}" style="flex:1;">
    `;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button'; removeBtn.className = 'remove-row'; removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => row.remove());
    row.appendChild(removeBtn);
    container.appendChild(row);
    makeSortable(container, '.admin-repeat-row', '.drag-handle');
  }

  function readQuickActions(container) {
    return [...container.querySelectorAll('.admin-repeat-row')].map(row => ({
      icon: row.querySelector('[data-field="icon"]').value,
      title: row.querySelector('[data-field="title"]').value,
      description: row.querySelector('[data-field="description"]').value,
      href: row.querySelector('[data-field="href"]').value
    }));
  }

  document.getElementById('hp_addStatRow').addEventListener('click', () =>
    addSimpleRow(document.getElementById('hp_statsList'), [{ key: 'number', placeholder: 'Number e.g. 1200' }, { key: 'suffix', placeholder: 'Suffix e.g. +' }, { key: 'label', placeholder: 'Label e.g. Properties Closed' }]));
  document.getElementById('hp_addQuickActionRow').addEventListener('click', () => addQuickActionRow(document.getElementById('hp_quickActionsList')));
  document.getElementById('hp_addOffplanFeatureRow').addEventListener('click', () =>
    addSimpleRow(document.getElementById('hp_offplanFeaturesList'), [{ key: 'title', placeholder: 'Title e.g. 0% Commission' }, { key: 'description', placeholder: 'Description e.g. on select launches' }]));
  document.getElementById('hp_addWhyusItemRow').addEventListener('click', () =>
    addSimpleRow(document.getElementById('hp_whyusItemsList'), [{ key: 'title', placeholder: 'Title' }, { key: 'description', placeholder: 'Description' }]));

  // ===== Hero background: image/video toggle =====
  function setHeroBgType(type) {
    document.getElementById('hp_heroBgType').value = type;
    document.querySelectorAll('#hp_heroBgTypeToggle .admin-herobg-option').forEach(b => b.classList.toggle('selected', b.dataset.bgtype === type));
    document.getElementById('hp_heroBgImageFields').style.display = type === 'image' ? '' : 'none';
    document.getElementById('hp_heroBgVideoFields').style.display = type === 'video' ? '' : 'none';
  }
  document.querySelectorAll('#hp_heroBgTypeToggle .admin-herobg-option').forEach(btn => {
    btn.addEventListener('click', () => setHeroBgType(btn.dataset.bgtype));
  });

  function extractYouTubeId(url) {
    if (!url) return '';
    const patterns = [
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /[?&]v=([A-Za-z0-9_-]{11})/,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return m[1];
    }
    return url.trim().length === 11 ? url.trim() : '';
  }
  document.getElementById('hp_heroBgVideoUrl').addEventListener('input', (e) => {
    document.getElementById('hp_heroBgVideoId').value = extractYouTubeId(e.target.value);
  });

  document.getElementById('hp_heroBgImageFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      document.getElementById('hp_heroBgImage').value = url;
      const preview = document.getElementById('hp_heroBgImagePreview');
      preview.src = url; preview.style.display = 'block';
    } catch (err) { document.getElementById('homepageContentFormError').textContent = 'Image upload failed: ' + err.message; }
  });

  // ===== Hero search filters (label + comma-separated options + what it searches) =====
  const heroFilterMatchOptions = [
    { value: '', label: 'Display only (not wired to search)' },
    { value: 'category', label: 'Property Type / Category' },
    { value: 'beds', label: 'Bedrooms' }
  ];

  function addHeroFilterBlock(filter) {
    const container = document.getElementById('hp_heroFiltersList');
    const block = document.createElement('div');
    block.className = 'admin-plan-block';
    const matchField = filter ? (filter.matchField || '') : '';
    block.innerHTML = `
      <div class="admin-plan-block-head">
        <span class="block-drag-handle" draggable="true" title="Drag to reorder">⠿</span>
        <input type="text" class="filter-label" placeholder="Filter label e.g. Property Type" value="${filter ? filter.label : ''}">
        <button type="button" class="remove-row">×</button>
      </div>
      <input type="text" class="filter-options" placeholder="Options, comma-separated e.g. Apartment, Villa, Townhouse" value="${filter && filter.options ? filter.options.join(', ') : ''}" style="margin-bottom:8px;">
      <label style="font-size:0.78rem;font-weight:600;color:var(--gray);display:block;margin-bottom:6px;">When someone searches, this filter matches against</label>
      <select class="filter-match">
        ${heroFilterMatchOptions.map(o => `<option value="${o.value}"${o.value === matchField ? ' selected' : ''}>${o.label}</option>`).join('')}
      </select>
    `;
    block.querySelector('.remove-row').addEventListener('click', () => block.remove());
    container.appendChild(block);
    makeSortable(container, '.admin-plan-block', '.block-drag-handle');
  }

  function readHeroFilters() {
    return [...document.querySelectorAll('#hp_heroFiltersList .admin-plan-block')].map(block => ({
      label: block.querySelector('.filter-label').value,
      options: block.querySelector('.filter-options').value.split(',').map(s => s.trim()).filter(Boolean),
      matchField: block.querySelector('.filter-match').value
    }));
  }

  document.getElementById('hp_addHeroFilterRow').addEventListener('click', () => addHeroFilterBlock());

  async function loadHomepageContent() {
    const { data, error } = await supabase.from('homepage_content').select('*').eq('id', 'main').maybeSingle();
    if (error) { console.error(error); return; }
    if (!data) return;
    Object.keys(homepageContentFieldMap).forEach(inputId => {
      const el = document.getElementById(inputId);
      if (el) el.value = data[homepageContentFieldMap[inputId]] || '';
    });

    setHeroBgType(data.hero_bg_type || 'image');
    document.getElementById('hp_heroBgImage').value = data.hero_bg_image || '';
    if (data.hero_bg_image) {
      const preview = document.getElementById('hp_heroBgImagePreview');
      preview.src = data.hero_bg_image; preview.style.display = 'block';
    }
    document.getElementById('hp_heroBgVideoId').value = data.hero_bg_video_id || '';
    document.getElementById('hp_heroBgVideoUrl').value = data.hero_bg_video_id ? `https://www.youtube.com/watch?v=${data.hero_bg_video_id}` : '';

    const filtersList = document.getElementById('hp_heroFiltersList');
    filtersList.innerHTML = '';
    (data.hero_filters || []).forEach(f => addHeroFilterBlock(f));

    const statsList = document.getElementById('hp_statsList');
    statsList.innerHTML = '';
    (data.stats || []).forEach(s => addSimpleRow(statsList, [{ key: 'number', placeholder: 'Number' }, { key: 'suffix', placeholder: 'Suffix' }, { key: 'label', placeholder: 'Label' }], s));
    const qaList = document.getElementById('hp_quickActionsList');
    qaList.innerHTML = '';
    (data.quick_actions || []).forEach(q => addQuickActionRow(qaList, q));
    const featList = document.getElementById('hp_offplanFeaturesList');
    featList.innerHTML = '';
    (data.offplan_features || []).forEach(f => addSimpleRow(featList, [{ key: 'title', placeholder: 'Title' }, { key: 'description', placeholder: 'Description' }], f));
    const whyList = document.getElementById('hp_whyusItemsList');
    whyList.innerHTML = '';
    (data.whyus_items || []).forEach(w => addSimpleRow(whyList, [{ key: 'title', placeholder: 'Title' }, { key: 'description', placeholder: 'Description' }], w));
  }

  document.getElementById('homepageContentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('homepageContentFormError');
    const successEl = document.getElementById('homepageContentFormSuccess');
    errorEl.textContent = '';
    successEl.textContent = '';

    const record = { id: 'main' };
    Object.keys(homepageContentFieldMap).forEach(inputId => {
      record[homepageContentFieldMap[inputId]] = document.getElementById(inputId).value;
    });
    record.hero_bg_type = document.getElementById('hp_heroBgType').value;
    record.hero_bg_image = document.getElementById('hp_heroBgImage').value;
    record.hero_bg_video_id = document.getElementById('hp_heroBgVideoId').value;
    record.hero_filters = readHeroFilters();
    record.stats = readSimpleRows(document.getElementById('hp_statsList'), [{ key: 'number', numeric: true }, { key: 'suffix' }, { key: 'label' }]);
    record.quick_actions = readQuickActions(document.getElementById('hp_quickActionsList'));
    record.offplan_features = readSimpleRows(document.getElementById('hp_offplanFeaturesList'), [{ key: 'title' }, { key: 'description' }]);
    record.whyus_items = readSimpleRows(document.getElementById('hp_whyusItemsList'), [{ key: 'title' }, { key: 'description' }]);

    const { error } = await supabase.from('homepage_content').upsert(record);
    if (error) { errorEl.textContent = error.message; return; }
    successEl.textContent = 'Saved.';
    setTimeout(() => { successEl.textContent = ''; }, 3000);
  });

  // ===== HEADER & FOOTER (site_chrome, shared across every page) =====
  const chromeFieldMap = {
    ch_whyusLabel: 'whyus_label', ch_whyusHref: 'whyus_href',
    ch_contactLabel: 'contact_label', ch_contactHref: 'contact_href',
    ch_ctaText: 'cta_text', ch_ctaHref: 'cta_href',
    ch_footerBlurb: 'footer_blurb', ch_footerEmail: 'footer_email', ch_footerCopyright: 'footer_copyright'
  };

  function addFooterColumnBlock(column) {
    const container = document.getElementById('ch_footerColumnsList');
    const block = document.createElement('div');
    block.className = 'admin-plan-block';
    block.innerHTML = `
      <div class="admin-plan-block-head">
        <span class="block-drag-handle" draggable="true" title="Drag to reorder">⠿</span>
        <input type="text" class="col-heading" placeholder="Column heading e.g. Services" value="${column ? column.heading : ''}">
        <button type="button" class="remove-row">×</button>
      </div>
      <div class="admin-col-links"></div>
      <button type="button" class="admin-add-row add-col-link">+ Add Link</button>
    `;
    block.querySelector('.remove-row').addEventListener('click', () => block.remove());
    const linksWrap = block.querySelector('.admin-col-links');
    block.querySelector('.add-col-link').addEventListener('click', () => {
      addSimpleRow(linksWrap, [{ key: 'label', placeholder: 'Link text' }, { key: 'href', placeholder: 'URL' }]);
    });
    if (column && column.links) {
      column.links.forEach(l => addSimpleRow(linksWrap, [{ key: 'label', placeholder: 'Link text' }, { key: 'href', placeholder: 'URL' }], l));
    }
    container.appendChild(block);
    makeSortable(container, '.admin-plan-block', '.block-drag-handle');
  }

  function readFooterColumns() {
    return [...document.querySelectorAll('#ch_footerColumnsList .admin-plan-block')].map(block => ({
      heading: block.querySelector('.col-heading').value,
      links: readSimpleRows(block.querySelector('.admin-col-links'), [{ key: 'label' }, { key: 'href' }])
    }));
  }

  document.getElementById('ch_addNavLinkRow').addEventListener('click', () =>
    addSimpleRow(document.getElementById('ch_navLinksList'), [{ key: 'label', placeholder: 'Label e.g. Services' }, { key: 'href', placeholder: 'URL e.g. services.html' }]));
  document.getElementById('ch_addWhyusSubmenuRow').addEventListener('click', () =>
    addSimpleRow(document.getElementById('ch_whyusSubmenuList'), [{ key: 'label', placeholder: 'Label e.g. Agents' }, { key: 'href', placeholder: 'URL e.g. agents.html' }]));
  document.getElementById('ch_addFooterColumnRow').addEventListener('click', () => addFooterColumnBlock());

  async function loadChromeSettings() {
    const { data, error } = await supabase.from('site_chrome').select('*').eq('id', 'main').maybeSingle();
    if (error) { console.error(error); return; }
    if (!data) return;
    Object.keys(chromeFieldMap).forEach(inputId => {
      const el = document.getElementById(inputId);
      if (el) el.value = data[chromeFieldMap[inputId]] || '';
    });
    const navList = document.getElementById('ch_navLinksList');
    navList.innerHTML = '';
    (data.nav_links || []).forEach(l => addSimpleRow(navList, [{ key: 'label', placeholder: 'Label' }, { key: 'href', placeholder: 'URL' }], l));
    const submenuList = document.getElementById('ch_whyusSubmenuList');
    submenuList.innerHTML = '';
    (data.whyus_submenu || []).forEach(l => addSimpleRow(submenuList, [{ key: 'label', placeholder: 'Label' }, { key: 'href', placeholder: 'URL' }], l));
    const colsList = document.getElementById('ch_footerColumnsList');
    colsList.innerHTML = '';
    (data.footer_columns || []).forEach(c => addFooterColumnBlock(c));
  }

  document.getElementById('chromeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('chromeFormError');
    const successEl = document.getElementById('chromeFormSuccess');
    errorEl.textContent = '';
    successEl.textContent = '';

    const record = { id: 'main' };
    Object.keys(chromeFieldMap).forEach(inputId => {
      record[chromeFieldMap[inputId]] = document.getElementById(inputId).value;
    });
    record.nav_links = readSimpleRows(document.getElementById('ch_navLinksList'), [{ key: 'label' }, { key: 'href' }]);
    record.whyus_submenu = readSimpleRows(document.getElementById('ch_whyusSubmenuList'), [{ key: 'label' }, { key: 'href' }]);
    record.footer_columns = readFooterColumns();

    const { error } = await supabase.from('site_chrome').upsert(record);
    if (error) { errorEl.textContent = error.message; return; }
    successEl.textContent = 'Saved — visible on every page now.';
    setTimeout(() => { successEl.textContent = ''; }, 3000);
  });

  // ===== SITE-WIDE THEME (palette + per-role typography) =====
  let selectedPalette = 'navy-gold';

  function renderThemeOptions() {
    const paletteGrid = document.getElementById('themePaletteGrid');
    if (!window.THEME_PALETTES) return;

    paletteGrid.innerHTML = Object.keys(window.THEME_PALETTES).map(key => {
      const p = window.THEME_PALETTES[key];
      const swatches = [p.tokens['--navy'], p.tokens['--gold'], p.tokens['--paper']].map(c => `<span class="admin-theme-swatch" style="background:${c};"></span>`).join('');
      return `<div class="admin-theme-option${key === selectedPalette ? ' selected' : ''}" data-palette="${key}">
        <span class="admin-theme-option-label">${p.label}</span>
        <div class="admin-theme-swatches">${swatches}</div>
      </div>`;
    }).join('');

    paletteGrid.querySelectorAll('.admin-theme-option').forEach(el => {
      el.addEventListener('click', () => {
        selectedPalette = el.dataset.palette;
        renderThemeOptions();
      });
    });
  }

  // Each role's <select id="ty_{role}FontPreset">, text <input id="ty_{role}Font">,
  // color <input id="ty_{role}Color"> and preview <p id="ty_{role}Preview"> follow
  // the same naming pattern, so all six roles are driven from this one list.
  const typoRoles = ['heading', 'body', 'data', 'card', 'blog', 'form'];
  const typoFallback = { heading: 'Georgia,serif', body: 'sans-serif', data: 'monospace', card: 'sans-serif', blog: 'sans-serif', form: 'sans-serif' };

  function populateFontPresetSelects() {
    const s = window.THEME_FONT_SUGGESTIONS;
    if (!s) return;
    typoRoles.forEach(role => {
      const select = document.getElementById(`ty_${role}FontPreset`);
      select.innerHTML = '<option value="">— Choose from list —</option>' +
        s[role].map(f => `<option value="${f}">${f}</option>`).join('');
      select.addEventListener('change', () => {
        if (!select.value) return;
        const textInput = document.getElementById(`ty_${role}Font`);
        textInput.value = select.value;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function updateTypoPreviews() {
    typoRoles.forEach(role => {
      const font = document.getElementById(`ty_${role}Font`).value;
      const color = document.getElementById(`ty_${role}Color`).value;
      document.getElementById(`ty_${role}Preview`).style.cssText = `font-family:'${font}',${typoFallback[role]};color:${color};`;
      // Keep the dropdown in sync when the typed value matches one of its options.
      const select = document.getElementById(`ty_${role}FontPreset`);
      select.value = [...select.options].some(o => o.value === font) ? font : '';
    });
  }

  typoRoles.forEach(role => {
    document.getElementById(`ty_${role}Font`).addEventListener('input', updateTypoPreviews);
    document.getElementById(`ty_${role}Color`).addEventListener('input', updateTypoPreviews);
  });

  function readTypography() {
    const typography = {};
    typoRoles.forEach(role => {
      typography[role + 'Font'] = document.getElementById(`ty_${role}Font`).value;
      typography[role + 'Color'] = document.getElementById(`ty_${role}Color`).value;
    });
    return typography;
  }

  const typoDefaults = {
    heading: { font: 'Fraunces', color: '#1F275C' },
    body: { font: 'Manrope', color: '#1B1D28' },
    data: { font: 'IBM Plex Mono', color: '#1F275C' },
    card: { font: 'Manrope', color: '#1F275C' },
    blog: { font: 'Manrope', color: '#1F275C' },
    form: { font: 'Manrope', color: '#1F275C' }
  };

  async function loadThemeSettings() {
    populateFontPresetSelects();
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'main').maybeSingle();
    if (error) { console.error(error); renderThemeOptions(); return; }
    if (data) {
      selectedPalette = data.color_palette || 'navy-gold';
      typoRoles.forEach(role => {
        document.getElementById(`ty_${role}Font`).value = data[role + '_font'] || typoDefaults[role].font;
        document.getElementById(`ty_${role}Color`).value = data[role + '_color'] || typoDefaults[role].color;
      });
    }
    renderThemeOptions();
    updateTypoPreviews();
  }

  document.getElementById('themeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('themeFormError');
    const successEl = document.getElementById('themeFormSuccess');
    errorEl.textContent = '';
    successEl.textContent = '';

    const typography = readTypography();
    const record = { id: 'main', color_palette: selectedPalette };
    typoRoles.forEach(role => {
      record[role + '_font'] = typography[role + 'Font'];
      record[role + '_color'] = typography[role + 'Color'];
    });
    const { error } = await supabase.from('site_settings').upsert(record);
    if (error) { errorEl.textContent = error.message; return; }
    if (window.applyTheme) window.applyTheme(selectedPalette, typography);
    successEl.textContent = 'Saved — the new theme is now live across the site.';
    setTimeout(() => { successEl.textContent = ''; }, 4000);
  });

  // ===== USERS (super_admin / admin only) =====
  const roleLabels = { super_admin: 'Super Admin', admin: 'Admin', agent: 'Agent' };
  let currentAgentsForUserForm = [];

  async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    const [{ data: profiles, error }, { data: agentRows }] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('agents').select('id,name')
    ]);
    if (error) { console.error(error); return; }
    const agentNameById = {};
    (agentRows || []).forEach(a => { agentNameById[a.id] = a.name; });

    if (!profiles.length) {
      tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="5">No users yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = profiles.map(p => {
      const canManage = currentRole === 'super_admin' || (currentRole === 'admin' && p.role !== 'super_admin');
      const isSelf = p.id === currentUserId;
      return `
      <tr>
        <td>${p.full_name || '—'}</td>
        <td>${p.email}</td>
        <td><span class="role-badge role-badge--${p.role}">${roleLabels[p.role] || p.role}</span></td>
        <td>${p.agent_id ? (agentNameById[p.agent_id] || p.agent_id) : '—'}</td>
        <td class="admin-row-actions">
          ${(canManage && !isSelf) ? `<button class="delete-btn" data-delete-user="${p.id}">Delete</button>` : (isSelf ? '<span style="color:var(--gray);font-size:0.82rem;">You</span>' : '')}
        </td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-delete-user]').forEach(b => b.addEventListener('click', () => deleteUser(b.dataset.deleteUser)));
  }

  async function deleteUser(userId) {
    if (!confirm('Remove this user? They will immediately lose access.')) return;
    const { data, error } = await supabase.functions.invoke('invite-user', { body: { action: 'delete', userId } });
    if (error || (data && data.error)) { alert((data && data.error) || error.message); return; }
    loadUsers();
  }

  async function populateAgentDropdown() {
    const select = document.getElementById('us_agentId');
    if (!currentAgentsForUserForm.length) {
      const { data } = await supabase.from('agents').select('id,name').order('name', { ascending: true });
      currentAgentsForUserForm = data || [];
    }
    select.innerHTML = '<option value="">— None —</option>' +
      currentAgentsForUserForm.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }

  function toggleAgentRow() {
    const role = document.getElementById('us_role').value;
    document.getElementById('us_agentRow').style.display = role === 'agent' ? '' : 'none';
  }

  document.getElementById('us_role').addEventListener('change', toggleAgentRow);

  document.getElementById('addUserBtn').addEventListener('click', async () => {
    document.getElementById('userForm').reset();
    document.getElementById('userFormError').textContent = '';
    document.getElementById('userFormSuccess').textContent = '';
    await populateAgentDropdown();
    toggleAgentRow();
    // Only a super admin can hand out the super_admin role.
    const roleSelect = document.getElementById('us_role');
    roleSelect.querySelector('option[value="super_admin"]').disabled = currentRole !== 'super_admin';
    openModal('userModal');
  });

  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('userFormError');
    const successEl = document.getElementById('userFormSuccess');
    errorEl.textContent = '';
    successEl.textContent = '';

    const body = {
      email: document.getElementById('us_email').value.trim(),
      fullName: document.getElementById('us_fullName').value.trim(),
      role: document.getElementById('us_role').value,
      agentId: document.getElementById('us_agentId').value || null
    };
    const saveBtn = document.getElementById('userSaveBtn');
    saveBtn.disabled = true; saveBtn.textContent = 'Sending…';
    const { data, error } = await supabase.functions.invoke('invite-user', { body });
    saveBtn.disabled = false; saveBtn.textContent = 'Send Invite';

    if (error || (data && data.error)) { errorEl.textContent = (data && data.error) || error.message; return; }
    successEl.textContent = 'Invite sent.';
    loadUsers();
    setTimeout(() => closeModal('userModal'), 1200);
  });
})();
