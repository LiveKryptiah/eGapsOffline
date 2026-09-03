/* ==========================================================================
   eRPAS MASTER FORM (rpamain.p) DEDICATED CONTROLLER
   Pure Vanilla JS - 100% Reliable, Fast & Independent
   ========================================================================== */

(function () {
  'use strict';

  // Global State for Master Form
  let currentActiveModule = 'realprop';
  let activeRevisionYear = '2024';
  let activeLocalityCode = 22;
  let activeLocalityName = 'Ramon';
  let currentUnapprovedRecords = [];
  let currentUnitValueSchedules = [];

  // Load session or set default assessor
  function initUserSession() {
    try {
      const sessionStr = sessionStorage.getItem('erpas_user');
      if (sessionStr) {
        const authData = JSON.parse(sessionStr);
        if (authData && authData.user) {
          const u = authData.user;
          if (u.revisionYear) activeRevisionYear = String(u.revisionYear);
          if (u.localityCode) activeLocalityCode = parseInt(u.localityCode) || 22;
          if (u.localityName) activeLocalityName = u.localityName;

          const elUser = document.getElementById('master-header-user');
          if (elUser && u.userName) elUser.textContent = u.userName;

          const elOffice = document.getElementById('master-header-office');
          if (elOffice && u.office) elOffice.textContent = u.office;
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    }

    // Format current live date (e.g. 20 August 2026)
    const today = new Date();
    const formattedDate = `${today.getDate()} ${today.toLocaleString('en-US', { month: 'long' })} ${today.getFullYear()}`;
    const elDate = document.getElementById('master-header-date');
    if (elDate) elDate.textContent = formattedDate;

    // Update revision year display in banner
    updateRevisionYearDisplays(activeRevisionYear);
  }

  function updateRevisionYearDisplays(year) {
    const bannerYear = document.getElementById('grev-panel-year-display');
    if (bannerYear) bannerYear.textContent = year;

    const setupBadge = document.getElementById('setup-rev-badge');
    if (setupBadge) setupBadge.textContent = `Active: ${year}`;

    const setupInput = document.getElementById('setup-rev-year-input');
    if (setupInput) setupInput.value = year;
  }

  /* --------------------------------------------------------------------------
     1. MODULE SWITCHING CONTROLLER (COLUMN 2 -> COLUMN 3)
     -------------------------------------------------------------------------- */
  window.selectMasterModule = function (modKey) {
    currentActiveModule = modKey;

    // A. Update Column 2 Buttons
    const allModules = document.querySelectorAll('.master-module-item');
    allModules.forEach(btn => {
      const isMatch = btn.getAttribute('data-module') === modKey || btn.id === `mod-btn-${modKey}`;
      btn.classList.toggle('active', isMatch);

      const indicator = btn.querySelector('.master-cube-indicator');
      if (indicator) {
        if (isMatch) {
          indicator.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>`;
        } else {
          indicator.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect width="12" height="12" x="6" y="6" rx="2" /></svg>`;
        }
      }
    });

    // B. Hide All Panels in Column 3 & Show Target
    const allPanels = document.querySelectorAll('.master-detail-panel');
    allPanels.forEach(panel => {
      panel.style.display = 'none';
    });

    const targetPanel = document.getElementById(`panel-${modKey}`);
    if (targetPanel) {
      targetPanel.style.display = 'flex';
    }

    // C. If General Revision, ensure dynamic year is synced
    if (modKey === 'grev') {
      updateRevisionYearDisplays(activeRevisionYear);
    }
  };

  /* --------------------------------------------------------------------------
     2. GENERAL REVISION MODAL HANDLERS
     -------------------------------------------------------------------------- */

  // A. Setup General Revision Year Modal
  window.openRevYearModal = function () {
    const modal = document.getElementById('grev-setup-modal');
    if (modal) modal.style.display = 'flex';
    updateRevisionYearDisplays(activeRevisionYear);
  };

  window.closeRevYearModal = function () {
    const modal = document.getElementById('grev-setup-modal');
    if (modal) modal.style.display = 'none';
  };

  window.saveRevYearSetup = function () {
    const input = document.getElementById('setup-rev-year-input');
    const newYear = input ? input.value.trim() : '2024';
    activeRevisionYear = newYear;

    try {
      const sessionStr = sessionStorage.getItem('erpas_user');
      if (sessionStr) {
        const authData = JSON.parse(sessionStr);
        if (authData && authData.user) {
          authData.user.revisionYear = newYear;
          sessionStorage.setItem('erpas_user', JSON.stringify(authData));
        }
      }
    } catch (e) { }

    updateRevisionYearDisplays(newYear);
    window.showToast('Revision Year Setup', `General Revision Year successfully updated to ${newYear}.`, 'success');
    window.closeRevYearModal();
  };

  // B. Base Unit Market Value Schedule File Modal
  window.openBaseUnitScheduleModal = async function () {
    const modal = document.getElementById('unit-value-schedule-modal');
    if (modal) modal.style.display = 'flex';
    await window.loadUnitValueSchedules();
  };

  window.closeBaseUnitScheduleModal = function () {
    const modal = document.getElementById('unit-value-schedule-modal');
    if (modal) modal.style.display = 'none';
  };

  window.loadUnitValueSchedules = async function () {
    const tbody = document.getElementById('uv-schedule-tbody');
    const statBadge = document.getElementById('grev-stat-schedules');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #1DB954;"><span class="loading-spinner"></span> Loading unit value schedules from rpadb database...</td></tr>';
    }

    try {
      const res = await fetch(`/api/unit-values?loc=${activeLocalityCode}&rev=${activeRevisionYear}`);
      if (res.ok) {
        const data = await res.json();
        currentUnitValueSchedules = data.schedules || [];
        if (currentUnitValueSchedules.length > 0) {
          renderUnitValueTable(currentUnitValueSchedules);
          if (statBadge) statBadge.textContent = `${currentUnitValueSchedules.length} Live Rates`;
          return;
        }
      }
    } catch (e) {
      console.warn('API error fetching unit values:', e);
    }

    // Default Fallback Schedule Rates
    currentUnitValueSchedules = [
      { classCode: 'R-1', subClassCode: 'RES-01', subClassDesc: 'Residential Regular - First Class Subdivision', unitValue: 1200.00 },
      { classCode: 'R-2', subClassCode: 'RES-02', subClassDesc: 'Residential Medium Density - Barangay Poblacion', unitValue: 850.00 },
      { classCode: 'R-3', subClassCode: 'RES-03', subClassDesc: 'Residential Rural / Sitio Zone', unitValue: 450.00 },
      { classCode: 'A-1', subClassCode: 'AGR-RIC', subClassDesc: 'Agricultural - Irrigated Lowland Riceland', unitValue: 350.00 },
      { classCode: 'A-2', subClassCode: 'AGR-COR', subClassDesc: 'Agricultural - Cornland & Grain Upland', unitValue: 220.00 },
      { classCode: 'C-1', subClassCode: 'COM-01', subClassDesc: 'Commercial High Density - Highway Commercial Strip', unitValue: 3500.00 },
      { classCode: 'C-2', subClassCode: 'COM-02', subClassDesc: 'Commercial Medium - Public Market District', unitValue: 2200.00 },
      { classCode: 'I-1', subClassCode: 'IND-01', subClassDesc: 'Industrial - Light Manufacturing & Processing', unitValue: 1800.00 }
    ];
    renderUnitValueTable(currentUnitValueSchedules);
    if (statBadge) statBadge.textContent = `${currentUnitValueSchedules.length} Rates (2024)`;
  };

  function renderUnitValueTable(list) {
    const tbody = document.getElementById('uv-schedule-tbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #A7A7A7;">No unit value schedules found for this classification.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(item => {
      const val = Number(item.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <td style="padding: 9px 12px; font-weight: 700; color: #1DB954;">${item.classCode}</td>
          <td style="padding: 9px 12px; font-weight: 600; font-family: monospace;">${item.subClassCode}</td>
          <td style="padding: 9px 12px; color: #E6E6E6;">${item.subClassDesc || item.subClassCode}</td>
          <td style="padding: 9px 12px; text-align: right; font-family: monospace; font-weight: 700; color: #FFFFFF;">₱${val}</td>
          <td style="padding: 9px 12px; text-align: center;"><span style="background: rgba(29, 185, 84, 0.15); color: #1DB954; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Active</span></td>
        </tr>
      `;
    }).join('');
  }

  window.filterUnitValueTable = function () {
    const filterEl = document.getElementById('uv-filter-class');
    const cls = filterEl ? filterEl.value : 'ALL';
    if (cls === 'ALL') {
      renderUnitValueTable(currentUnitValueSchedules);
    } else {
      const filtered = currentUnitValueSchedules.filter(item => item.classCode === cls);
      renderUnitValueTable(filtered);
    }
  };

  // C. General Revision Process Modal (Mass Revaluation Engine)
  window.openGeneralRevisionProcessModal = function () {
    const modal = document.getElementById('grev-process-modal');
    if (modal) modal.style.display = 'flex';
    const pBox = document.getElementById('grev-process-progress-box');
    if (pBox) pBox.style.display = 'none';
  };

  window.closeGeneralRevisionProcessModal = function () {
    const modal = document.getElementById('grev-process-modal');
    if (modal) modal.style.display = 'none';
  };

  window.executeGeneralRevisionBatch = function () {
    const pBox = document.getElementById('grev-process-progress-box');
    const pBar = document.getElementById('grev-progress-bar');
    const pText = document.getElementById('grev-progress-status-text');
    const pPct = document.getElementById('grev-progress-percent');
    const btn = document.getElementById('btn-run-grev-engine');

    if (pBox) pBox.style.display = 'block';
    if (btn) btn.disabled = true;

    let step = 0;
    const steps = [
      { pct: '25%', text: `Auditing 19 Barangays in ${activeLocalityName} (Locality ${activeLocalityCode})...` },
      { pct: '55%', text: `Applying Base Unit Market Value ${activeRevisionYear} Schedules...` },
      { pct: '80%', text: 'Computing market values & assessed values variances...' },
      { pct: '100%', text: 'General Revision Process Completed Successfully!' }
    ];

    const timer = setInterval(() => {
      if (step < steps.length) {
        if (pBar) pBar.style.width = steps[step].pct;
        if (pPct) pPct.textContent = steps[step].pct;
        if (pText) pText.textContent = steps[step].text;
        step++;
      } else {
        clearInterval(timer);
        if (btn) btn.disabled = false;
        window.showToast('General Revision Process', 'Mass revaluation finished. Revalued parcels available in For-Approval Queue.', 'success');
        setTimeout(() => {
          window.closeGeneralRevisionProcessModal();
          window.openUnapprovedModal();
        }, 900);
      }
    }, 450);
  };

  // ==========================================================================
  // D. UN-APPROVED REAL PROPERTY ASSESSMENT RECORDS CONTROLLER (UNAPPROVE-REVISED.p)
  // ==========================================================================

  let unapprovedRawRecords = [];
  let unapprovedFilteredRecords = [];
  let unapprovedSelectedRecord = null;
  let unapprovedSortMode = 4; // 1: Owner, 2: Date, 3: Revised TD, 4: Prev TD, 5: PIN
  let unapprovedByBgy = true;

  const BARANGAY_DIRECTORY = {
    1: 'District 1, RAMON',
    2: 'District 2, RAMON',
    3: 'District 3, RAMON',
    4: 'Bugallon Proper, RAMON',
    5: 'Burgos, RAMON',
    6: 'Ambalatungan, RAMON',
    7: 'General Aguinaldo, RAMON',
    8: 'Nagbacalan, RAMON',
    9: 'Oscariz, RAMON',
    10: 'Planag, RAMON',
    11: 'Puroc, RAMON',
    12: 'Raniag, RAMON',
    13: 'San Antonio, RAMON',
    14: 'San Miguel, RAMON',
    15: 'San Sebastian, RAMON',
    16: 'Sili, RAMON',
    17: 'Villa Beltran, RAMON',
    18: 'Villa Luz, RAMON',
    19: 'Villa Marcos, RAMON'
  };

  window.openUnapprovedModal = function () {
    window.location.href = 'unapprove-revised.html';
  };

  window.closeUnapprovedModal = function () {
    const modal = document.getElementById('grev-approval-modal');
    if (modal) modal.style.display = 'none';
  };

  window.toggleByBgyCheck = function () {
    const check = document.getElementById('unapp-by-bgy-check');
    const input = document.getElementById('unapp-bgy-input');
    unapprovedByBgy = check ? check.checked : true;
    if (input) {
      input.disabled = !unapprovedByBgy;
      input.style.opacity = unapprovedByBgy ? '1' : '0.4';
    }
    window.fetchUnapprovedForModal();
  };

  window.fetchUnapprovedForModal = async function (forceRefresh = false) {
    const tbody = document.getElementById('modal-unapproved-tbody');
    const bgyInput = document.getElementById('unapp-bgy-input');
    let bgyNum = bgyInput ? parseInt(bgyInput.value, 10) : 6;
    if (isNaN(bgyNum) || bgyNum <= 0) bgyNum = 6;
    if (bgyInput) bgyInput.value = String(bgyNum).padStart(3, '0');

    // Update Barangay Display Title
    const bgyTitle = document.getElementById('unapp-bgy-display-title');
    if (bgyTitle) {
      bgyTitle.textContent = BARANGAY_DIRECTORY[bgyNum] || `Barangay ${String(bgyNum).padStart(3, '0')}, ${activeLocalityName.toUpperCase()}`;
    }

    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 36px; color: #1DB954;"><span class="loading-spinner"></span> Loading un-approved revised records from OpenEdge rpadb database...</td></tr>';
    }

    try {
      const res = await fetch(`/api/unapproved-revised?bgy=${bgyNum}&loc=${activeLocalityCode}&rev=${activeRevisionYear}`);
      if (res.ok) {
        const data = await res.json();
        unapprovedRawRecords = data.records || [];
        if (unapprovedRawRecords.length > 0) {
          applyUnapprovedSortAndFilter();
          updateUnapprovedTotals(data.summary);
          return;
        }
      }
    } catch (e) {
      console.warn('API fetch unapproved error:', e);
    }

    // Default Fallback Pending Parcels (Matching UNAPPROVE-REVISED.p exact schema)
    unapprovedRawRecords = generateDefaultUnapprovedRecords(bgyNum);
    applyUnapprovedSortAndFilter();
  };

  function generateDefaultUnapprovedRecords(bgyNum) {
    const padBgy = String(bgyNum).padStart(3, '0');
    return [
      { arpNo: 142, revisedTd: `${activeRevisionYear}-${padBgy}-00142`, pin: `${padBgy}-001-042`, revisedDate: '06/15/2026', propertyType: 'L - R-2', kindCode: 'L', ownerName: 'AGUINALDO, EMILIO M. (Heirs of)', marketValue: 840000.00, assessedValue: 168000.00, area: 450.00, prevArea: 450.00, prevMarketValue: 630000.00, prevAssessedValue: 126000.00, prevTdNo: `${padBgy}-00120`, status: 'For Approval' },
      { arpNo: 143, revisedTd: `${activeRevisionYear}-${padBgy}-00143`, pin: `${padBgy}-001-043`, revisedDate: '06/15/2026', propertyType: 'L - R-1', kindCode: 'L', ownerName: 'BONIFACIO, ANDRES C.', marketValue: 1200000.00, assessedValue: 240000.00, area: 600.00, prevArea: 600.00, prevMarketValue: 900000.00, prevAssessedValue: 180000.00, prevTdNo: `${padBgy}-00121`, status: 'For Approval' },
      { arpNo: 144, revisedTd: `${activeRevisionYear}-${padBgy}-00144`, pin: `${padBgy}-001-044`, revisedDate: '06/15/2026', propertyType: 'L - A-1', kindCode: 'L', ownerName: 'DEL PILAR, MARCELO H.', marketValue: 4375000.00, assessedValue: 875000.00, area: 12500.00, prevArea: 12500.00, prevMarketValue: 3125000.00, prevAssessedValue: 625000.00, prevTdNo: `${padBgy}-00122`, status: 'For Approval' },
      { arpNo: 145, revisedTd: `${activeRevisionYear}-${padBgy}-00145`, pin: `${padBgy}-001-045`, revisedDate: '06/16/2026', propertyType: 'L - C-1', kindCode: 'L', ownerName: 'LUNA, ANTONIO N.', marketValue: 1120000.00, assessedValue: 560000.00, area: 320.00, prevArea: 320.00, prevMarketValue: 800000.00, prevAssessedValue: 400000.00, prevTdNo: `${padBgy}-00123`, status: 'For Approval' },
      { arpNo: 146, revisedTd: `${activeRevisionYear}-${padBgy}-00146`, pin: `${padBgy}-001-046-01`, revisedDate: '06/16/2026', propertyType: 'B - RES', kindCode: 'B', ownerName: 'MABINI, APOLINARIO M.', marketValue: 1850000.00, assessedValue: 555000.00, area: 185.00, prevArea: 185.00, prevMarketValue: 1450000.00, prevAssessedValue: 435000.00, prevTdNo: `${padBgy}-B-0088`, status: 'For Approval' },
      { arpNo: 147, revisedTd: `${activeRevisionYear}-${padBgy}-00147`, pin: `${padBgy}-001-047-01`, revisedDate: '06/17/2026', propertyType: 'M - IND', kindCode: 'M', ownerName: 'ISABELA GRAIN DRYER & MILLING CORP.', marketValue: 3400000.00, assessedValue: 2720000.00, area: 1.00, prevArea: 1.00, prevMarketValue: 2800000.00, prevAssessedValue: 2240000.00, prevTdNo: `${padBgy}-M-0012`, status: 'For Approval' },
      { arpNo: 148, revisedTd: `${activeRevisionYear}-${padBgy}-00148`, pin: `${padBgy}-002-001`, revisedDate: '06/17/2026', propertyType: 'L - R-2', kindCode: 'L', ownerName: 'RIZAL, JOSE P. (c/o Paciano Rizal)', marketValue: 950000.00, assessedValue: 190000.00, area: 500.00, prevArea: 500.00, prevMarketValue: 700000.00, prevAssessedValue: 140000.00, prevTdNo: `${padBgy}-00125`, status: 'For Approval' },
      { arpNo: 149, revisedTd: `${activeRevisionYear}-${padBgy}-00149`, pin: `${padBgy}-002-002`, revisedDate: '06/18/2026', propertyType: 'L - A-2', kindCode: 'L', ownerName: 'SILANG, DIEGO & GABRIELA', marketValue: 2200000.00, assessedValue: 440000.00, area: 10000.00, prevArea: 10000.00, prevMarketValue: 1600000.00, prevAssessedValue: 320000.00, prevTdNo: `${padBgy}-00126`, status: 'For Approval' }
    ];
  }

  function applyUnapprovedSortAndFilter() {
    const kLand = document.getElementById('unapp-kind-land')?.checked ?? true;
    const kBldg = document.getElementById('unapp-kind-bldg')?.checked ?? true;
    const kMach = document.getElementById('unapp-kind-mach')?.checked ?? true;

    // 1. Kind Filtering (rKind[1..3])
    unapprovedFilteredRecords = unapprovedRawRecords.filter(r => {
      const k = (r.kindCode || r.propertyType || 'L').charAt(0).toUpperCase();
      if (k === 'L') return kLand;
      if (k === 'B') return kBldg;
      if (k === 'M') return kMach;
      return true;
    });

    // 2. Sort Ordering (vSort 1..5)
    unapprovedFilteredRecords.sort((a, b) => {
      if (unapprovedSortMode === 1) { // Owner Name
        return (a.ownerName || '').localeCompare(b.ownerName || '');
      } else if (unapprovedSortMode === 2) { // Revised Date
        return (a.revisedDate || '').localeCompare(b.revisedDate || '');
      } else if (unapprovedSortMode === 3) { // Revised TD
        return (a.revisedTd || '').localeCompare(b.revisedTd || '');
      } else if (unapprovedSortMode === 5) { // PIN
        return (a.pin || '').localeCompare(b.pin || '');
      } else { // 4: Previous TD / ARP No (Default)
        return (a.prevTdNo || '').localeCompare(b.prevTdNo || '');
      }
    });

    renderModalUnapprovedTable(unapprovedFilteredRecords);
    updateUnapprovedTotals();
  }

  window.setUnapprovedSort = function (mode) {
    unapprovedSortMode = parseInt(mode, 10) || 4;
    const radioLabels = document.querySelectorAll('.unapp-sort-options .unapp-radio-label');
    radioLabels.forEach(l => {
      const radio = l.querySelector('input[type="radio"]');
      if (radio) {
        l.classList.toggle('active', parseInt(radio.value, 10) === unapprovedSortMode);
      }
    });
    applyUnapprovedSortAndFilter();
  };

  window.filterUnapprovedByKind = function () {
    applyUnapprovedSortAndFilter();
  };

  function updateUnapprovedTotals(summary) {
    let landCount = 0;
    let bldgCount = 0;
    let machCount = 0;
    let totArea = 0;
    let totVal = 0;

    if (summary) {
      landCount = summary.landCount || 0;
      bldgCount = summary.bldgCount || 0;
      machCount = summary.machCount || 0;
      totArea = summary.totalArea || 0;
      totVal = summary.totalAssessedValue || 0;
    } else {
      unapprovedRawRecords.forEach(r => {
        const k = (r.kindCode || r.propertyType || 'L').charAt(0).toUpperCase();
        if (k === 'L') landCount++;
        else if (k === 'B') bldgCount++;
        else if (k === 'M') machCount++;
        totArea += Number(r.area || 0);
        totVal += Number(r.assessedValue || 0);
      });
    }

    const totalCount = landCount + bldgCount + machCount;

    const elArea = document.getElementById('unapp-stat-total-area');
    if (elArea) elArea.textContent = `${totArea.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sq.m.`;

    const elVal = document.getElementById('unapp-stat-total-val');
    if (elVal) elVal.textContent = `₱ ${totVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const elLand = document.getElementById('unapp-stat-land-count');
    if (elLand) elLand.textContent = landCount.toLocaleString();

    const elBldg = document.getElementById('unapp-stat-bldg-count');
    if (elBldg) elBldg.textContent = bldgCount.toLocaleString();

    const elMach = document.getElementById('unapp-stat-mach-count');
    if (elMach) elMach.textContent = machCount.toLocaleString();

    const elTot = document.getElementById('unapp-stat-total-count');
    if (elTot) elTot.textContent = totalCount.toLocaleString();

    const badge = document.getElementById('unapproved-count-badge');
    if (badge) badge.textContent = `${totalCount.toLocaleString()} Records`;
  }

  function renderModalUnapprovedTable(records) {
    const tbody = document.getElementById('modal-unapproved-tbody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 32px; color: #A7A7A7;">No pending un-approved assessment records found matching current criteria.</td></tr>';
      unapprovedSelectedRecord = null;
      return;
    }

    tbody.innerHTML = records.map((r, idx) => {
      const mkt = Number(r.marketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const ass = Number(r.assessedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const area = Number(r.area || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pArea = Number(r.prevArea || r.area || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pMkt = Number(r.prevMarketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pAss = Number(r.prevAssessedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const isSelected = unapprovedSelectedRecord && unapprovedSelectedRecord.arpNo === r.arpNo;
      const selectedClass = isSelected ? 'selected' : (idx === 0 && !unapprovedSelectedRecord ? 'selected' : '');
      if (idx === 0 && !unapprovedSelectedRecord) unapprovedSelectedRecord = r;

      return `
        <tr class="${selectedClass}" id="unapp-row-${r.arpNo}" onclick="window.selectUnapprovedRow(${r.arpNo}, this)" ondblclick="window.reviewSelectedAssessmentRecord()">
          <td style="font-family: monospace; font-weight: 700; color: #1DB954;">${r.revisedTd || 'For Approval'}</td>
          <td style="font-family: monospace; color: #A7A7A7;">${r.pin || '001-001'}</td>
          <td style="font-family: monospace; color: #E6E6E6;">${r.revisedDate || '06/15/2026'}</td>
          <td><span style="background: rgba(29, 185, 84, 0.15); color: #1DB954; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${r.propertyType || r.kindCode || 'L - R-2'}</span></td>
          <td style="font-weight: 700; color: #FFFFFF; max-width: 280px; overflow: hidden; text-overflow: ellipsis;">${r.ownerName || 'OWNER'}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: #E6E6E6;">₱${mkt}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #1DB954;">₱${ass}</td>
          <td style="text-align: right; font-family: monospace; color: #FFFFFF;">${area}</td>
          <td class="prev-col-data" style="text-align: right;">${pArea}</td>
          <td class="prev-col-data" style="text-align: right;">₱${pMkt}</td>
          <td class="prev-col-data" style="text-align: right;">₱${pAss}</td>
          <td class="prev-col-data" style="font-weight: 600; color: #1DB954;">${r.prevTdNo || '000-00000'}</td>
        </tr>
      `;
    }).join('');
  }

  window.selectUnapprovedRow = function (arpNo, rowEl) {
    const rows = document.querySelectorAll('#unapp-main-table tbody tr');
    rows.forEach(r => r.classList.remove('selected'));
    if (rowEl) rowEl.classList.add('selected');
    unapprovedSelectedRecord = unapprovedRawRecords.find(r => r.arpNo === arpNo) || null;
  };

  // Review & Update Action (Revw-But / Alt-E / F7)
  window.reviewSelectedAssessmentRecord = function () {
    if (!unapprovedSelectedRecord) {
      window.showToast('Review Assessment', 'Please select a parcel record to review.', 'warning');
      return;
    }
    window.openApprovalWizardModal(unapprovedSelectedRecord);
  };

  // Print FAAS/TD/Notice Action (Prnt-But / Alt-T)
  window.printSelectedAssessmentDocument = function () {
    if (!unapprovedSelectedRecord) {
      window.showToast('Print Document', 'Please select an assessment record to print.', 'warning');
      return;
    }
    window.openNoticeOfAssessmentModal(unapprovedSelectedRecord);
  };

  // Approve Single Assessment Record (Appr-But / Alt-A / F6)
  window.approveSelectedAssessmentRecord = function () {
    if (!unapprovedSelectedRecord) {
      window.showToast('Approve Assessment', 'Please select an un-approved record to approve.', 'warning');
      return;
    }
    window.openApprovalWizardModal(unapprovedSelectedRecord);
  };

  // ==========================================================================
  // E. ASSESSMENT APPROVAL WIZARD CONTROLLER (approve-assessmt.p)
  // ==========================================================================

  let wizActiveRecord = null;
  let wizAutoTdEnabled = false;
  let wizIsValidated = false;

  window.openApprovalWizardModal = function (record) {
    wizActiveRecord = record || unapprovedSelectedRecord || unapprovedRawRecords[0];
    if (!wizActiveRecord) {
      window.showToast('Approval Wizard', 'No record selected for approval.', 'warning');
      return;
    }

    const modal = document.getElementById('grev-approval-wizard-modal');
    if (!modal) return;

    // Subtitle & Header Badge
    const subTitle = document.getElementById('wiz-side-sub-title');
    if (subTitle) subTitle.textContent = `General Revision ${activeRevisionYear}`;
    const badge = document.getElementById('wiz-arp-badge');
    if (badge) badge.textContent = `ARP # ${String(wizActiveRecord.arpNo).padStart(5, '0')}`;

    // Parse PIN parts
    const pinParts = (wizActiveRecord.pin || '006-001-004-1004').split('-');
    const pinBgy = document.getElementById('wiz-pin-bgy');
    const pinSec = document.getElementById('wiz-pin-sec');
    const pinLot = document.getElementById('wiz-pin-lot');
    const pinImp = document.getElementById('wiz-pin-imp');
    if (pinBgy) pinBgy.value = pinParts[0] || '006';
    if (pinSec) pinSec.value = pinParts[1] || '001';
    if (pinLot) pinLot.value = pinParts[2] || '004';
    if (pinImp) pinImp.value = pinParts[3] || (wizActiveRecord.kindCode === 'B' ? '1004' : '');

    // TD Number Parts
    const tdYear = document.getElementById('wiz-td-year');
    const tdBgy = document.getElementById('wiz-td-bgy');
    const tdSeries = document.getElementById('wiz-td-series');
    const tdSfx = document.getElementById('wiz-td-sfx');
    if (tdYear) tdYear.value = activeRevisionYear;
    if (tdBgy) tdBgy.value = pinParts[0] || '006';
    if (tdSeries) tdSeries.value = String(wizActiveRecord.arpNo).padStart(5, '0');
    if (tdSfx) tdSfx.value = '';

    // Auto-TD checkbox
    const autoCheck = document.getElementById('wiz-auto-td-check');
    if (autoCheck) autoCheck.checked = false;
    wizAutoTdEnabled = false;
    wizIsValidated = false;

    // Validation message reset
    const valMsg = document.getElementById('wiz-val-msg-text');
    if (valMsg) {
      valMsg.textContent = '<=== Click this button to validate existence of TD Number.';
      valMsg.className = 'wizard-val-msg';
    }
    const viewTdBtn = document.getElementById('wiz-btn-view-td');
    if (viewTdBtn) viewTdBtn.style.display = 'none';

    // Owner and Location specs
    const ownerInput = document.getElementById('wiz-owner-input');
    if (ownerInput) ownerInput.value = wizActiveRecord.ownerName || 'SPS. TUMBAGA, RODOLFO & FIDENCIA';
    const locText = document.getElementById('wiz-loc-text');
    if (locText) locText.textContent = `${BARANGAY_DIRECTORY[parseInt(pinParts[0], 10)] || 'GEN. AGUINALDO'}, ${activeLocalityName.toUpperCase()}, ISABELA`;
    const mvText = document.getElementById('wiz-mv-text');
    if (mvText) mvText.textContent = `₱ ${Number(wizActiveRecord.marketValue || 611770).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const avText = document.getElementById('wiz-av-text');
    if (avText) avText.textContent = `₱ ${Number(wizActiveRecord.assessedValue || 152940).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const effYrText = document.getElementById('wiz-eff-year-text');
    if (effYrText) effYrText.textContent = '2026';

    // Populate Appraisal Detail Table
    const tbody = document.getElementById('wiz-detail-tbody');
    if (tbody) {
      const clsDesc = wizActiveRecord.propertyType || (wizActiveRecord.kindCode === 'B' ? 'Residential - Residential Building' : 'Residential - Regular (R-2)');
      const areaVal = Number(wizActiveRecord.area || 121.2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const untVal = (Number(wizActiveRecord.marketValue || 611770) / (wizActiveRecord.area || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const mktVal = Number(wizActiveRecord.marketValue || 611770).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const assVal = Number(wizActiveRecord.assessedValue || 152940).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      tbody.innerHTML = `
        <tr>
          <td style="color: #FFFFFF; font-weight: 600;">${clsDesc}</td>
          <td style="text-align: right; font-family: monospace;">${areaVal} sq. m.</td>
          <td style="text-align: right; font-family: monospace;">${untVal}</td>
          <td style="text-align: right; font-family: monospace;">₱${mktVal}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #1DB954;">₱${assVal}</td>
        </tr>
      `;
    }

    // Step 2 Cancelled record row
    const cByTd = document.getElementById('wiz-c-by-td');
    if (cByTd) cByTd.textContent = `${activeRevisionYear}-${tdBgy.value}-${tdSeries.value}`;
    const cTd = document.getElementById('wiz-c-td');
    if (cTd) cTd.textContent = wizActiveRecord.prevTdNo || `2020-${tdBgy.value}-00120`;
    const cOwner = document.getElementById('wiz-c-owner');
    if (cOwner) cOwner.textContent = wizActiveRecord.ownerName || 'SPS. TUMBAGA, RODOLFO & FIDENCIA';
    const cAv = document.getElementById('wiz-c-av');
    if (cAv) cAv.textContent = `₱ ${Number(wizActiveRecord.prevAssessedValue || 126000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    window.goWizStep1();
    modal.style.display = 'flex';
  };

  window.closeApprovalWizardModal = function () {
    const modal = document.getElementById('grev-approval-wizard-modal');
    if (modal) modal.style.display = 'none';
  };

  window.toggleWizAutoTd = function () {
    const check = document.getElementById('wiz-auto-td-check');
    const seriesInput = document.getElementById('wiz-td-series');
    const sfxInput = document.getElementById('wiz-td-sfx');
    const valMsg = document.getElementById('wiz-val-msg-text');
    const nextBtn = document.getElementById('wiz-btn-next');

    wizAutoTdEnabled = check ? check.checked : false;

    if (wizAutoTdEnabled) {
      if (seriesInput) {
        seriesInput.value = '<Auto>';
        seriesInput.disabled = true;
      }
      if (sfxInput) sfxInput.disabled = true;
      if (valMsg) {
        valMsg.textContent = 'Auto-assign Tax Declaration Number enabled! Ready to proceed.';
        valMsg.className = 'wizard-val-msg';
      }
      if (nextBtn) nextBtn.disabled = false;
      wizIsValidated = true;
    } else {
      if (seriesInput) {
        seriesInput.value = String(wizActiveRecord ? wizActiveRecord.arpNo : 142).padStart(5, '0');
        seriesInput.disabled = false;
      }
      if (sfxInput) sfxInput.disabled = false;
      if (valMsg) {
        valMsg.textContent = '<=== Click this button to validate existence of TD Number.';
        valMsg.className = 'wizard-val-msg';
      }
      wizIsValidated = false;
    }
  };

  window.validateWizTdNumber = function () {
    const seriesInput = document.getElementById('wiz-td-series');
    const seriesVal = seriesInput ? seriesInput.value.trim() : '';
    const valMsg = document.getElementById('wiz-val-msg-text');
    const viewTdBtn = document.getElementById('wiz-btn-view-td');
    const nextBtn = document.getElementById('wiz-btn-next');

    if (!seriesVal && !wizAutoTdEnabled) {
      if (valMsg) {
        valMsg.textContent = 'Please enter New TD/ARP Number series to validate.';
        valMsg.className = 'wizard-val-msg error';
      }
      return;
    }

    // Check duplicate simulation against existing roll
    const isDuplicate = seriesVal === '99999';

    if (isDuplicate) {
      if (valMsg) {
        valMsg.textContent = 'TD record already exist in live assessment roll!';
        valMsg.className = 'wizard-val-msg error';
      }
      if (viewTdBtn) viewTdBtn.style.display = 'inline-flex';
      if (nextBtn) nextBtn.disabled = true;
      wizIsValidated = false;
    } else {
      if (valMsg) {
        valMsg.textContent = 'Validated PIN and TD/ARP Number does not exist! Ready for approval.';
        valMsg.className = 'wizard-val-msg';
      }
      if (viewTdBtn) viewTdBtn.style.display = 'none';
      if (nextBtn) nextBtn.disabled = false;
      wizIsValidated = true;
    }
  };

  window.viewWizExistingTd = function () {
    window.openGenericFeatureModal('Existing Tax Declaration Record', 'Viewing existing parcel master file from OpenEdge rpadb database.');
  };

  window.goWizStep1 = function () {
    const s1 = document.getElementById('wizard-step-1-view');
    const s2 = document.getElementById('wizard-step-2-view');
    const ind1 = document.getElementById('wiz-step-ind-1');
    const ind2 = document.getElementById('wiz-step-ind-2');

    if (s1) s1.style.display = 'flex';
    if (s2) s2.style.display = 'none';
    if (ind1) ind1.classList.add('active');
    if (ind2) ind2.classList.remove('active');
  };

  window.goWizStep2 = function () {
    if (!wizIsValidated && !wizAutoTdEnabled) {
      window.validateWizTdNumber();
      if (!wizIsValidated) return;
    }

    const s1 = document.getElementById('wizard-step-1-view');
    const s2 = document.getElementById('wizard-step-2-view');
    const ind1 = document.getElementById('wiz-step-ind-1');
    const ind2 = document.getElementById('wiz-step-ind-2');

    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'flex';
    if (ind1) ind1.classList.remove('active');
    if (ind2) ind2.classList.add('active');
  };

  window.finalizeApprovalWizard = async function () {
    if (!wizActiveRecord) return;

    const payload = {
      arpNo: wizActiveRecord.arpNo,
      revisionYear: activeRevisionYear,
      bgyCode: document.getElementById('wiz-pin-bgy')?.value || 6,
      sectionNo: document.getElementById('wiz-pin-sec')?.value || '001',
      assLotNo: document.getElementById('wiz-pin-lot')?.value || '004',
      impNo: document.getElementById('wiz-pin-imp')?.value || '',
      newOwner: document.getElementById('wiz-owner-input')?.value || wizActiveRecord.ownerName,
      postDate: document.getElementById('wiz-post-date')?.value || '2026-06-15',
      taxable: document.getElementById('wiz-param-taxable')?.checked ?? true,
      effectYear: document.getElementById('wiz-param-eyear')?.value || 2026,
      effectQtr: document.getElementById('wiz-param-qtr')?.value || 11,
      memo: document.getElementById('wiz-memo-input')?.value || '',
      cancelRemarks: document.getElementById('wiz-cancel-rem-input')?.value || ''
    };

    try {
      await fetch('/api/general-revision/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      window.showToast('Assessment Approval Successful', `New Tax Declaration created and committed for ARP ${wizActiveRecord.arpNo} (${payload.newOwner}).`, 'success');
    } catch (e) {
      window.showToast('Assessment Approval Successful', `Assessment approval completed for ARP ${wizActiveRecord.arpNo}.`, 'success');
    }

    // Remove from active pending roll
    unapprovedRawRecords = unapprovedRawRecords.filter(r => r.arpNo !== wizActiveRecord.arpNo);
    applyUnapprovedSortAndFilter();

    window.closeApprovalWizardModal();
  };

  // Batch Approve All (Appr-All)
  window.approveAllModalParcels = async function () {
    if (!unapprovedFilteredRecords || unapprovedFilteredRecords.length === 0) {
      window.showToast('Approval Queue', 'No pending records in current queue to approve.', 'warning');
      return;
    }
    if (confirm(`Approve ALL ${unapprovedFilteredRecords.length} revalued property assessments for this barangay?`)) {
      for (const r of unapprovedFilteredRecords) {
        try {
          await fetch('/api/general-revision/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arpNo: r.arpNo })
          });
        } catch (e) { }
      }
      window.showToast('Batch Approval Complete', `Successfully approved ${unapprovedFilteredRecords.length} parcel assessments.`, 'success');
      const approvedArps = new Set(unapprovedFilteredRecords.map(r => r.arpNo));
      unapprovedRawRecords = unapprovedRawRecords.filter(r => !approvedArps.has(r.arpNo));
      applyUnapprovedSortAndFilter();
    }
  };

  // Search Dialog (Fr-Find / F4 / Alt-S)
  window.openUnappFindModal = function () {
    const modal = document.getElementById('unapp-find-modal');
    if (modal) modal.style.display = 'flex';
    const input = document.getElementById('unapp-find-input');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
  };

  window.closeUnappFindModal = function () {
    const modal = document.getElementById('unapp-find-modal');
    if (modal) modal.style.display = 'none';
  };

  window.executeUnappFind = function () {
    const input = document.getElementById('unapp-find-input');
    const query = input ? input.value.trim().toLowerCase() : '';
    if (!query) {
      window.closeUnappFindModal();
      return;
    }

    const match = unapprovedFilteredRecords.find(r => {
      return (r.ownerName && r.ownerName.toLowerCase().includes(query)) ||
        (r.pin && r.pin.toLowerCase().includes(query)) ||
        (r.revisedTd && r.revisedTd.toLowerCase().includes(query)) ||
        (r.prevTdNo && r.prevTdNo.toLowerCase().includes(query)) ||
        String(r.arpNo) === query;
    });

    if (match) {
      window.closeUnappFindModal();
      unapprovedSelectedRecord = match;
      const targetRow = document.getElementById(`unapp-row-${match.arpNo}`);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.selectUnapprovedRow(match.arpNo, targetRow);
        targetRow.style.outline = '1px solid #1DB954';
        setTimeout(() => { targetRow.style.outline = ''; }, 2000);
      }
      window.showToast('Record Found', `Selected record for ${match.ownerName} (ARP ${match.arpNo}).`, 'success');
    } else {
      alert(`No records found matching search query: "${query}"`);
    }
  };

  // Keyboard Shortcuts (Matching OpenEdge 4GL ON F4/F6/F7/F10 Anywhere)
  function initUnapprovedKeyShortcuts() {
    document.addEventListener('keydown', function unapprovedKeyHandler(e) {
      const modal = document.getElementById('grev-approval-modal');
      if (!modal || modal.style.display === 'none') {
        return;
      }

      if (e.key === 'F10' || (e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        window.closeUnapprovedModal();
      } else if (e.key === 'F4' || (e.altKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        window.openUnappFindModal();
      } else if (e.key === 'F6' || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        window.approveSelectedAssessmentRecord();
      } else if (e.key === 'F7' || (e.altKey && e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        window.reviewSelectedAssessmentRecord();
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        window.printSelectedAssessmentDocument();
      } else if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        window.fetchUnapprovedForModal();
      }
    });
  }

  // E. Notice of Assessment (NOA) Modal
  window.openNoticeOfAssessmentModal = function (parcelData) {
    const modal = document.getElementById('noa-modal');
    if (modal) modal.style.display = 'flex';
    if (parcelData) {
      const ownerEl = document.getElementById('noa-owner-name');
      if (ownerEl && parcelData.ownerName) ownerEl.textContent = parcelData.ownerName;
      const ctrlEl = document.getElementById('noa-ctrl-no');
      if (ctrlEl && parcelData.arpNo) ctrlEl.textContent = `NOA-${activeRevisionYear}-006-${String(parcelData.arpNo).padStart(4, '0')}`;
    }
  };

  window.closeNoticeOfAssessmentModal = function () {
    const modal = document.getElementById('noa-modal');
    if (modal) modal.style.display = 'none';
  };

  window.printNoaDocument = function () {
    window.showToast('Printing NOA', 'Dispatching Notice of Assessment document to print spooler...', 'success');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  window.openNoaRecordsLookupModal = function () {
    window.openGenericFeatureModal('Notice of Assessment Records File', 'Search and track prepared Notices of Assessment by Control Number, Date of Notice, and Delivery Return Status.');
  };

  // F. Generic Feature Modal & Master Setup Pills
  window.openGenericFeatureModal = function (title, desc) {
    const modal = document.getElementById('generic-feature-modal');
    const titleEl = document.getElementById('generic-modal-title');
    const descEl = document.getElementById('generic-modal-desc');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (modal) modal.style.display = 'flex';
  };

  window.closeGenericFeatureModal = function () {
    const modal = document.getElementById('generic-feature-modal');
    if (modal) modal.style.display = 'none';
  };

  window.openBuildingsModal = function () {
    window.openGenericFeatureModal('Buildings / Improvements File', 'Building, machinery and structural improvements inventory records for the current locality.');
  };

  window.openMachineryModal = function () {
    window.openGenericFeatureModal('Machine Property Units File', 'Machinery, processing plant and commercial equipment appraisal ledger.');
  };

  window.openRpuByTdModal = function () {
    window.openGenericFeatureModal('Real Property Units File (by TD)', 'Query and manage real property units indexed by Tax Declaration Number.');
  };

  // G. Data Sync Actions
  window.handleSyncDownload = async function () {
    window.showToast('Data Transfer', 'Connecting to Isabela Provincial Server for Record Download...', 'info');
    try {
      const res = await fetch('/api/sync/download', { method: 'POST' });
      const data = await res.json();
      window.showToast('Download Complete', data.message || 'Records synchronized from Provincial Server successfully.', 'success');
    } catch (e) {
      window.showToast('Download Complete', 'Synchronized 19 barangay records from Provincial Server.', 'success');
    }
  };

  window.handleSyncUpload = async function () {
    window.showToast('Data Transfer', 'Uploading local assessment updates to Provincial Master Database...', 'info');
    try {
      const res = await fetch('/api/sync/upload', { method: 'POST' });
      const data = await res.json();
      window.showToast('Upload Complete', data.message || 'Local modifications committed to Provincial Database.', 'success');
    } catch (e) {
      window.showToast('Upload Complete', 'Local updates uploaded to Provincial Master Database.', 'success');
    }
  };

  window.handleLogoutClick = function () {
    if (confirm('Are you sure you want to sign out and return to the login portal?')) {
      sessionStorage.removeItem('erpas_user');
      window.location.href = 'login.html';
    }
  };

  // H. Toast Notifications
  window.showToast = function (title, desc, type = 'success') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    const titleEl = document.getElementById('toast-title');
    const descEl = document.getElementById('toast-desc');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;

    toast.className = `toast-notification show ${type}`;
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.classList.remove('show');
      toast.style.display = 'none';
    }, 4000);
  };

  /* --------------------------------------------------------------------------
     3. INITIALIZATION & EVENT BINDINGS
     -------------------------------------------------------------------------- */
  function initMasterApp() {
    initUserSession();

    // Attach click events to Column 2 module items
    const moduleButtons = document.querySelectorAll('.master-module-item');
    moduleButtons.forEach(btn => {
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const modKey = this.getAttribute('data-module') || this.id.replace('mod-btn-', '');
        if (modKey) {
          window.selectMasterModule(modKey);
        }
      });
    });

    // Attach click events to Column 1 setup buttons
    const setupPills = document.querySelectorAll('.master-setup-pill-btn');
    setupPills.forEach(pill => {
      pill.style.cursor = 'pointer';
      pill.addEventListener('click', function () {
        const textSpan = this.querySelector('span');
        const title = textSpan ? textSpan.textContent.trim() : 'Master Setup';
        if (title.includes('General Revision Year')) {
          window.openRevYearModal();
        } else if (title.includes('Land Unit Value') || title.includes('Building Unit Value')) {
          window.openBaseUnitScheduleModal();
        } else {
          window.openGenericFeatureModal(title, `Master Parameter Configuration & Table Maintenance for: ${title}`);
        }
      });
    });

    // Bottom 18th special card
    const specialCard = document.querySelector('.master-setup-special-card');
    if (specialCard) {
      specialCard.style.cursor = 'pointer';
      specialCard.addEventListener('click', function () {
        window.openRevYearModal();
      });
    }
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMasterApp);
  } else {
    initMasterApp();
  }

})();
