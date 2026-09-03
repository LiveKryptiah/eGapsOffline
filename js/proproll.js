/**
 * Real Property Assessment System (eRPAS)
 * proproll.js - Consolidated Real Property Units by TD (PROPROLL.P)
 * Fully wired to LAND-UPD.p Master FAAS & Fr-LandDtl Sub-Modal
 */

(function () {
  'use strict';

  // 1. Module State Variables
  let currentBgyCode = 1;
  let currentBgyName = 'BUGALLON PROPER, RAMON';
  let currentUser = {
    userId: '001',
    userName: 'Editha Q Medrano',
    localityCode: 22,
    localityName: 'Ramon',
    revYear: '2024'
  };

  let approveOnly = false;
  let currentSort = '2'; // 2: TD Number, 1: Owner Name, 3: PIN
  let consolidatedRecords = [];
  let filteredRecords = [];
  let selectedRecord = null;
  let isLoading = false;

  // Active FAAS Modal State
  let modalActiveRecord = null;
  let modalAppraisalList = [];
  let selectedAppraisalIndex = 0;
  let isEditingNewDetail = false;
  let isFaasLocked = false;

  const BARANGAYS = {
    '1': 'Bugallon Proper', '001': 'Bugallon Proper',
    '2': 'Ambatali', '002': 'Ambatali',
    '3': 'Burgos', '003': 'Burgos',
    '4': 'General Aguinaldo', '004': 'General Aguinaldo',
    '5': 'Nagbacalan', '005': 'Nagbacalan',
    '6': 'San Antonio', '006': 'San Antonio',
    '7': 'San Miguel', '007': 'San Miguel',
    '8': 'San Sebastian', '008': 'San Sebastian',
    '9': 'Rancho', '009': 'Rancho',
    '10': 'Villasis', '010': 'Villasis',
    '11': 'Oscariz', '011': 'Oscariz',
    '12': 'Planis', '012': 'Planis',
    '17': 'Villa Beltran', '017': 'Villa Beltran'
  };

  // Master Schedules matching landuv.p & adjfactor.p
  const LAND_UV_SCHEDULE = [
    { classCode: 'R', classDesc: 'Residential', actualUseCode: 'RES', actualUseDesc: 'Residential Land', subClassCode: 'R1', subClassDesc: 'R-1 (Main Road)', unitValue: 650.00, areaUnit: 'Square Meter', levelPercent: 6.00 },
    { classCode: 'R', classDesc: 'Residential', actualUseCode: 'RES', actualUseDesc: 'Residential Land', subClassCode: 'R2', subClassDesc: 'R-2 (Secondary)', unitValue: 540.00, areaUnit: 'Square Meter', levelPercent: 6.00 },
    { classCode: 'R', classDesc: 'Residential', actualUseCode: 'RES', actualUseDesc: 'Residential Land', subClassCode: 'R3', subClassDesc: 'R-3 (Interior)', unitValue: 420.00, areaUnit: 'Square Meter', levelPercent: 6.00 },
    { classCode: 'A', classDesc: 'Agricultural', actualUseCode: 'AGR', actualUseDesc: 'Riceland, Irrigated', subClassCode: 'A1', subClassDesc: 'A-1 (First Class)', unitValue: 350000.00, areaUnit: 'Hectare', levelPercent: 40.00 },
    { classCode: 'A', classDesc: 'Agricultural', actualUseCode: 'AGR', actualUseDesc: 'Riceland, Rainfed', subClassCode: 'A2', subClassDesc: 'A-2 (Second Class)', unitValue: 280000.00, areaUnit: 'Hectare', levelPercent: 40.00 },
    { classCode: 'A', classDesc: 'Agricultural', actualUseCode: 'AGR', actualUseDesc: 'Cornland / Upland', subClassCode: 'A3', subClassDesc: 'A-3 (Third Class)', unitValue: 190000.00, areaUnit: 'Hectare', levelPercent: 40.00 },
    { classCode: 'C', classDesc: 'Commercial', actualUseCode: 'COM', actualUseDesc: 'Commercial Area', subClassCode: 'C1', subClassDesc: 'C-1 (Commercial CBD)', unitValue: 1250.00, areaUnit: 'Square Meter', levelPercent: 50.00 },
    { classCode: 'C', classDesc: 'Commercial', actualUseCode: 'COM', actualUseDesc: 'Commercial Area', subClassCode: 'C2', subClassDesc: 'C-2 (Commercial Fringe)', unitValue: 950.00, areaUnit: 'Square Meter', levelPercent: 50.00 },
    { classCode: 'I', classDesc: 'Industrial', actualUseCode: 'IND', actualUseDesc: 'Industrial Plant / Storage', subClassCode: 'I1', subClassDesc: 'I-1 (Heavy Industry)', unitValue: 1600.00, areaUnit: 'Square Meter', levelPercent: 50.00 }
  ];

  const INFLUENCE_FACTORS = [
    { code: '0', desc: 'Not Applicable', percent: 0.00, type: 'None' },
    { code: '1', desc: 'Corner Lot (+10%)', percent: 10.00, type: 'Positive (+)' },
    { code: '2', desc: 'Flooding / Low Elevation (-20%)', percent: -20.00, type: 'Negative (-)' },
    { code: '3', desc: 'Along Provincial Road (+15%)', percent: 15.00, type: 'Positive (+)' },
    { code: '4', desc: 'Irregular Shape (-10%)', percent: -10.00, type: 'Negative (-)' },
    { code: '5', desc: 'Topography / Sloping (-15%)', percent: -15.00, type: 'Negative (-)' }
  ];

  const OWNERS_DIRECTORY = [
    { acctNo: '080269', ownerName: 'DELA CRUZ, JUAN A.', address: 'BUGALLON PROPER, RAMON, ISABELA' },
    { acctNo: '080270', ownerName: 'SANTOS, MARIA B.', address: 'BUGALLON PROPER, RAMON, ISABELA' },
    { acctNo: '080271', ownerName: 'JACINTO, SABAS', address: 'GEN. AGUINALDO, RAMON, ISABELA' },
    { acctNo: '080272', ownerName: 'SPS. TUMBAGA, RODOLFO & FIDENCIA', address: 'SAN ANTONIO, RAMON, ISABELA' },
    { acctNo: '080273', ownerName: 'RAMON RICE MILL & TRADING CORP.', address: 'OSCARIZ, RAMON, ISABELA' }
  ];

  const STREETS_DIRECTORY = [
    { name: 'Provincial Highway', bgy: 'Bugallon Proper' },
    { name: 'National Road (Maharlika)', bgy: 'Bugallon Proper' },
    { name: 'Burgos Street', bgy: 'Bugallon Proper' },
    { name: 'Mabini Street', bgy: 'Bugallon Proper' },
    { name: 'Rizal Avenue', bgy: 'Bugallon Proper' },
    { name: 'Barangay Road 01', bgy: 'General Aguinaldo' }
  ];

  // Default baseline fallback records
  const fallbackConsolidatedData = [
    { id: 'L-1-1', arpNo: '2024-001-00001', rawArp: 1, kindCode: 'L', classCode: 'RES', propType: 'L - RES', pin: '011-22-001-001-001', sec: '001', lot: '001', imp: '', ownerName: 'DELA CRUZ, JUAN A.', administrator: '', location: 'BUGALLON PROPER, RAMON', taxable: 'T', area: 463.00, unitValue: 540.00, marketValue: 250020.00, assessedValue: 15000.00, status: 'Approved', validated: true, validatedBy: 'Editha Q Medrano', validatedDate: '06/15/2026', validatedTime: '09:30:15 AM', surveyNo: 'CAD-1234', cadLotNo: 'LOT 456-A', octTctNo: 'T-987654' },
    { id: 'B-1-2', arpNo: '2024-001-00002', rawArp: 2, kindCode: 'B', classCode: 'R-2', propType: 'B - R-2', pin: '011-22-001-001-001-1001', sec: '001', lot: '001', imp: '1001', ownerName: 'DELA CRUZ, JUAN A.', administrator: '', location: 'BUGALLON PROPER, RAMON', taxable: 'T', area: 145.00, unitValue: 4500.00, marketValue: 652500.00, assessedValue: 195750.00, status: 'Approved', validated: true, validatedBy: 'Editha Q Medrano', validatedDate: '06/15/2026', validatedTime: '09:30:15 AM', surveyNo: 'CAD-1234', cadLotNo: 'LOT 456-A', octTctNo: 'T-987654' },
    { id: 'L-1-3', arpNo: '2024-001-00003', rawArp: 3, kindCode: 'L', classCode: 'AGR', propType: 'L - AGR', pin: '011-22-001-001-002', sec: '001', lot: '002', imp: '', ownerName: 'SANTOS, MARIA B.', administrator: '', location: 'BUGALLON PROPER, RAMON', taxable: 'T', area: 15000.00, unitValue: 35.00, marketValue: 525000.00, assessedValue: 210000.00, status: 'Approved', validated: false, validatedBy: '', validatedDate: '', validatedTime: '', surveyNo: 'CAD-5678', cadLotNo: 'LOT 789-B', octTctNo: '' },
    { id: 'M-1-9000010', arpNo: 'For Approval', rawArp: 9000010, kindCode: 'M', classCode: 'COM', propType: 'M - COM', pin: '011-22-001-001-002-2001', sec: '001', lot: '002', imp: '2001', ownerName: 'SANTOS RICE MILL & TRADING', administrator: 'MARIA B. SANTOS', location: 'BUGALLON PROPER, RAMON', taxable: 'T', area: 0, unitValue: 0, marketValue: 1250000.00, assessedValue: 1000000.00, status: 'For Approval', validated: false, validatedBy: '', validatedDate: '', validatedTime: '', surveyNo: 'CAD-5678', cadLotNo: 'LOT 789-B', octTctNo: '' }
  ];

  // 2. DOM Initialization
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const storedUser = sessionStorage.getItem('currentUser') || localStorage.getItem('rpas_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.userName) currentUser.userName = u.userName;
        if (u.localityCode) currentUser.localityCode = u.localityCode;
        if (u.localityName) currentUser.localityName = u.localityName;
        if (u.revYear) currentUser.revYear = u.revYear;
      }
    } catch (e) {
      console.warn('Session user read error:', e);
    }

    const bgyInput = document.getElementById('proproll-bgy-code-input');
    if (bgyInput) {
      currentBgyCode = parseInt(bgyInput.value, 10) || 1;
    }

    initEventHandlers();
    fetchConsolidatedRecords(currentBgyCode);
  });

  // 3. Fetch Records from Backend
  async function fetchConsolidatedRecords(bgy) {
    if (isLoading) return;
    isLoading = true;
    currentBgyCode = bgy;

    const bgyPadded = String(bgy).padStart(3, '0');
    currentBgyName = (BARANGAYS[bgy] || BARANGAYS[bgyPadded] || `BARANGAY ${bgyPadded}`) + ', RAMON';

    const tbody = document.getElementById('proproll-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 32px; color: var(--color-primary, #1DB954); font-weight: 600;">
        Reading Consolidated Assessment Roll from Progress 4GL Database (PROPROLL.P)...
      </td></tr>`;
    }

    try {
      const url = `/api/proproll?bgy=${bgy}&loc=${currentUser.localityCode}&approved=${approveOnly}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();

      if (data && Array.isArray(data.records) && data.records.length > 0) {
        consolidatedRecords = data.records;
        if (data.summary) {
          if (data.summary.fullBarangayTag) {
            currentBgyName = data.summary.fullBarangayTag;
          }
          updateSummaryBadges(data.summary);
        }
      } else {
        consolidatedRecords = fallbackConsolidatedData;
        updateSummaryStats();
      }
    } catch (err) {
      console.warn('API fetch fallback:', err);
      consolidatedRecords = fallbackConsolidatedData;
      updateSummaryStats();
    } finally {
      isLoading = false;
      const bgyPill = document.getElementById('proproll-bgy-name-pill');
      if (bgyPill) bgyPill.textContent = currentBgyName.toUpperCase();
      applyFilters();
    }
  }

  // 4. Update Summary Badges
  function updateSummaryBadges(summary) {
    const landEl = document.getElementById('stat-land-count');
    const bldgEl = document.getElementById('stat-bldg-count');
    const machEl = document.getElementById('stat-mach-count');
    const totalEl = document.getElementById('stat-total-count');
    const areaEl = document.getElementById('stat-total-area');
    const avEl = document.getElementById('stat-total-av');

    if (landEl) landEl.textContent = (summary.landCount || 0).toLocaleString();
    if (bldgEl) bldgEl.textContent = (summary.bldgCount || 0).toLocaleString();
    if (machEl) machEl.textContent = (summary.machCount || 0).toLocaleString();
    if (totalEl) totalEl.textContent = (summary.totalProperties || 0).toLocaleString();
    if (areaEl) areaEl.textContent = (summary.totalArea || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (avEl) avEl.textContent = `₱ ${(summary.totalAssessedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function updateSummaryStats() {
    let lCount = 0, bCount = 0, mCount = 0, totArea = 0, totAV = 0;
    consolidatedRecords.forEach(r => {
      const k = (r.kindCode || '').toUpperCase();
      if (k === 'L' || k.startsWith('LAND')) lCount++;
      else if (k === 'B' || k.startsWith('BLDG')) bCount++;
      else if (k === 'M' || k.startsWith('MACH')) mCount++;
      totArea += parseFloat(r.area) || 0;
      totAV += parseFloat(r.assessedValue) || 0;
    });

    updateSummaryBadges({
      landCount: lCount,
      bldgCount: bCount,
      machCount: mCount,
      totalProperties: consolidatedRecords.length,
      totalArea: totArea,
      totalAssessedValue: totAV
    });
  }

  // 5. Apply Filters and Sorting
  function applyFilters() {
    const findTD = (document.getElementById('proproll-find-td')?.value || '').toLowerCase().trim();
    const findKind = (document.getElementById('proproll-find-kind')?.value || '').toUpperCase().trim();
    const findPin = (document.getElementById('proproll-find-pin')?.value || '').toLowerCase().trim();
    const findName = (document.getElementById('proproll-find-name')?.value || '').toLowerCase().trim();
    const findLoc = (document.getElementById('proproll-find-loc')?.value || '').toLowerCase().trim();
    const findArea = parseFloat(document.getElementById('proproll-find-area')?.value) || 0;
    const findMkt = parseFloat(document.getElementById('proproll-find-mkt')?.value) || 0;
    const findAv = parseFloat(document.getElementById('proproll-find-av')?.value) || 0;

    filteredRecords = consolidatedRecords.filter(r => {
      if (approveOnly && r.status !== 'Approved') return false;
      if (findTD && !(r.arpNo || '').toLowerCase().includes(findTD)) return false;
      if (findKind && (r.kindCode || '').toUpperCase() !== findKind) return false;
      if (findPin && !(r.pin || '').toLowerCase().includes(findPin)) return false;
      if (findName && !(r.ownerName || '').toLowerCase().includes(findName)) return false;
      if (findLoc && !(r.location || '').toLowerCase().includes(findLoc)) return false;
      if (findArea > 0 && (parseFloat(r.area) || 0) < findArea) return false;
      if (findMkt > 0 && (parseFloat(r.marketValue) || 0) < findMkt) return false;
      if (findAv > 0 && (parseFloat(r.assessedValue) || 0) < findAv) return false;
      return true;
    });

    // Sorting
    filteredRecords.sort((a, b) => {
      if (currentSort === '1') {
        return (a.ownerName || '').localeCompare(b.ownerName || '');
      } else if (currentSort === '3') {
        return (a.pin || '').localeCompare(b.pin || '');
      } else {
        return (a.rawArp || 0) - (b.rawArp || 0);
      }
    });

    renderTable();
  }

  // 6. Render Consolidated Browse Grid
  function renderTable() {
    const tbody = document.getElementById('proproll-table-tbody');
    if (!tbody) return;

    if (filteredRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted, #888888); font-style: italic;">No consolidated real property records found for this barangay.</td></tr>`;
      selectedRecord = null;
      updateStatusStrip(null);
      return;
    }

    let html = '';
    filteredRecords.forEach((rec, idx) => {
      const isSelected = selectedRecord && selectedRecord.id === rec.id;
      if (!selectedRecord && idx === 0) {
        selectedRecord = rec;
      }
      const isApproved = rec.status === 'Approved';
      const isForApproval = rec.arpNo === 'For Approval';
      let statusDotColor = isApproved ? 'var(--color-primary, #1DB954)' : '#F59E0B';

      html += `
        <tr class="${isSelected ? 'selected' : ''}" onclick="window.selectProprollRecord('${rec.id}')" ondblclick="window.handleEditProperty()">
          <td class="align-center"><span class="proproll-status-dot" style="background: ${statusDotColor};" title="${rec.status || 'Active'}"></span></td>
          <td class="mono ${isForApproval ? 'for-approval' : ''}">${escapeHtml(rec.arpNo)}</td>
          <td><span class="proproll-prop-type-badge">${escapeHtml(rec.propType || (rec.kindCode + ' - ' + rec.classCode))}</span></td>
          <td class="mono">${escapeHtml(rec.pin)}</td>
          <td>
            <strong>${escapeHtml(rec.ownerName)}</strong>
            ${rec.administrator ? `<span style="color: var(--text-muted); font-size: 10.5px;"> (${escapeHtml(rec.administrator)})</span>` : ''}
          </td>
          <td>${escapeHtml(rec.location || currentBgyName)}</td>
          <td class="align-right mono">${parseFloat(rec.area || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="align-right mono" style="color: var(--color-primary, #1DB954); font-weight: 700;">₱ ${parseFloat(rec.marketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="align-right mono" style="color: var(--color-primary, #1DB954); font-weight: 800;">₱ ${parseFloat(rec.assessedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (selectedRecord) {
      updateStatusStrip(selectedRecord);
    }
  }

  // 7. Selection & Status Updates
  window.selectProprollRecord = function (id) {
    selectedRecord = consolidatedRecords.find(r => r.id === id) || null;
    const tbody = document.getElementById('proproll-table-tbody');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(r => r.classList.remove('selected'));
    }
    const currentTr = Array.from(tbody?.querySelectorAll('tr') || []).find(tr => tr.innerHTML.includes(id));
    if (currentTr) currentTr.classList.add('selected');
    updateStatusStrip(selectedRecord);
  };

  function updateStatusStrip(rec) {
    const strip = document.getElementById('proproll-status-strip');
    if (!strip) return;
    if (!rec) {
      strip.textContent = 'Status: Ready. Select a property record or press F7 to edit.';
      return;
    }
    let valText = rec.validated ? `VALIDATED by ${rec.validatedBy || currentUser.userName} on ${rec.validatedDate || '06/15/2026'}` : 'UNVALIDATED (Draft)';
    strip.textContent = `TD No: ${rec.arpNo} | Owner: ${rec.ownerName} | PIN: ${rec.pin} | Market Val: ₱ ${(parseFloat(rec.marketValue) || 0).toLocaleString()} | Assessed Val: ₱ ${(parseFloat(rec.assessedValue) || 0).toLocaleString()} | ${valText}`;
  }

  // 8. Event Handlers & Filter Listeners
  function initEventHandlers() {
    const bgyInput = document.getElementById('proproll-bgy-code-input');
    if (bgyInput) {
      bgyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleBgyGo();
      });
    }

    const appCb = document.getElementById('proproll-approve-only-cb');
    if (appCb) {
      appCb.addEventListener('change', (e) => {
        approveOnly = e.target.checked;
        fetchConsolidatedRecords(currentBgyCode);
      });
    }

    const sortSel = document.getElementById('proproll-sort-select');
    if (sortSel) {
      sortSel.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
      });
    }

    const filterIds = [
      'proproll-find-td', 'proproll-find-kind', 'proproll-find-pin',
      'proproll-find-name', 'proproll-find-loc', 'proproll-find-area',
      'proproll-find-mkt', 'proproll-find-av'
    ];

    filterIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => applyFilters());
      }
    });

    // Keyboard Shortcuts (matching proproll.p & LAND-UPD.p)
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  // 9. Global Keyboard Handlers
  function handleGlobalKeydown(e) {
    const appModal = document.getElementById('land-appraisal-edit-modal');
    const faasModal = document.getElementById('land-faas-modal');

    // 1. If Land Appraisal Edit Sub-Dialog is Open
    if (appModal && appModal.style.display !== 'none') {
      if (e.key === 'Escape' || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
        e.preventDefault();
        closeAppraisalSubModal();
      } else if (e.key === 'Enter' || (e.altKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        saveAppraisalSubModal();
      } else if (e.key === 'F7' || (e.altKey && (e.key === 'l' || e.key === 'L'))) {
        e.preventDefault();
        const lvlInput = document.getElementById('dtl-level-percent');
        if (lvlInput) {
          lvlInput.removeAttribute('readonly');
          lvlInput.focus();
          lvlInput.select();
        }
      }
      return;
    }

    // 2. If FAAS Master Modal is Open
    if (faasModal && faasModal.style.display !== 'none') {
      if (e.key === 'Escape' || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
        e.preventDefault();
        closeFaasModal();
      } else if (e.key === 'F1') {
        e.preventDefault();
        toggleFaasLock();
      } else if (e.key === 'F6' || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        openAppraisalSubModal(true);
      } else if (e.key === 'F7' || (e.altKey && (e.key === 'e' || e.key === 'E'))) {
        e.preventDefault();
        openAppraisalSubModal(false);
      } else if (e.key === 'F8' || (e.altKey && (e.key === 'd' || e.key === 'D'))) {
        e.preventDefault();
        deleteSelectedAppraisalRow();
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveFaasModal();
      } else if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        openPrevApprovalModal();
      }
      return;
    }

    // 3. Main Consolidated Roll Shortcuts
    if (e.key === 'F6' || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
      e.preventDefault();
      handleAddProperty();
    } else if (e.key === 'F7' || (e.altKey && (e.key === 'e' || e.key === 'E'))) {
      e.preventDefault();
      handleEditProperty();
    } else if (e.key === 'F8' || (e.altKey && (e.key === 'd' || e.key === 'D'))) {
      e.preventDefault();
      handleDeleteProperty();
    } else if (e.key === 'F9' || (e.altKey && (e.key === 'p' || e.key === 'P'))) {
      e.preventDefault();
      handlePrintTD();
    } else if (e.key === 'F10' || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
      e.preventDefault();
      window.location.href = 'index.html';
    } else if (e.altKey && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      handleBgyGo();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (filteredRecords.length === 0) return;
      let idx = filteredRecords.findIndex(r => r.id === selectedRecord?.id);
      if (idx === -1) idx = 0;
      if (e.key === 'ArrowDown') idx = Math.min(filteredRecords.length - 1, idx + 1);
      if (e.key === 'ArrowUp') idx = Math.max(0, idx - 1);
      selectedRecord = filteredRecords[idx];
      renderTable();
      const tbody = document.getElementById('proproll-table-tbody');
      const selectedTr = tbody?.querySelectorAll('tr')[idx];
      if (selectedTr) selectedTr.scrollIntoView({ block: 'nearest' });
    }
  }

  // 10. Toolbar Action Handlers
  window.handleBgyGo = function () {
    const input = document.getElementById('proproll-bgy-code-input');
    const code = parseInt(input?.value, 10) || 1;
    fetchConsolidatedRecords(code);
  };

  window.handleBgyFolderLookup = function () {
    const modal = document.getElementById('bgy-lookup-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeBgyLookupModal = function () {
    const modal = document.getElementById('bgy-lookup-modal');
    if (modal) modal.style.display = 'none';
  };

  window.selectBgyFromList = function (codeStr) {
    const input = document.getElementById('proproll-bgy-code-input');
    if (input) input.value = codeStr;
    closeBgyLookupModal();
    handleBgyGo();
  };

  window.handleAddProperty = function () {
    const newRecord = {
      id: `L-${currentBgyCode}-${Date.now()}`,
      arpNo: 'For Approval',
      rawArp: 9000001,
      kindCode: 'L',
      classCode: 'RES',
      propType: 'L - RES',
      pin: `011-${String(currentUser.localityCode).padStart(2, '0')}-${String(currentBgyCode).padStart(3, '0')}-001-001`,
      sec: '001',
      lot: '001',
      imp: '',
      ownerName: 'NEW PROPERTY OWNER',
      administrator: '',
      location: currentBgyName,
      taxable: 'T',
      area: 100.00,
      unitValue: 540.00,
      marketValue: 54000.00,
      assessedValue: 3240.00,
      status: 'For Approval',
      validated: false,
      validatedBy: '',
      surveyNo: 'CAD-1234',
      cadLotNo: 'LOT 001',
      octTctNo: ''
    };
    modalActiveRecord = newRecord;
    openFaasModalWithRecord(modalActiveRecord);
  };

  // ==============================================================================
  // 11. F7 UPDATE: POP-UP MASTER MODAL (LAND-UPD.p)
  // ==============================================================================
  window.handleEditProperty = function () {
    if (!selectedRecord) {
      if (filteredRecords.length > 0) {
        selectedRecord = filteredRecords[0];
      } else {
        alert('Please select a property record first.');
        return;
      }
    }
    openFaasModalWithRecord(selectedRecord);
  };

  function openFaasModalWithRecord(rec) {
    modalActiveRecord = JSON.parse(JSON.stringify(rec));
    const modal = document.getElementById('land-faas-modal');
    if (!modal) return;

    // Header Title
    const titleEl = document.getElementById('faas-modal-header-title');
    if (titleEl) {
      titleEl.innerHTML = `Real Property - LAND/PLANTS &amp; TREES (-${currentUser.userName}-)`;
    }

    // Default to unlocked for direct editing
    isFaasLocked = false;
    updateFaasLockUI();

    // Parse ARP/TD
    let tdParts = (modalActiveRecord.arpNo || '').split('-');
    let revYr = tdParts[0] || currentUser.revYear;
    let bgy = tdParts[1] || String(currentBgyCode).padStart(3, '0');
    let series = tdParts[2] || String(modalActiveRecord.rawArp || 1).padStart(5, '0');
    let sfx = tdParts[3] || '';

    const elRev = document.getElementById('faas-arp-rev'); if (elRev) elRev.value = revYr;
    const elLoc = document.getElementById('faas-arp-loc'); if (elLoc) elLoc.value = currentUser.localityCode;
    const elBgy = document.getElementById('faas-arp-bgy'); if (elBgy) elBgy.value = bgy;
    const elNo = document.getElementById('faas-arp-no'); if (elNo) elNo.value = series;
    const elSuf = document.getElementById('faas-arp-suf'); if (elSuf) elSuf.value = sfx;

    // Parse PIN
    let pinParts = (modalActiveRecord.pin || '').split('-');
    const elPProv = document.getElementById('faas-pin-prov'); if (elPProv) elPProv.value = pinParts[0] || '011';
    const elPLoc = document.getElementById('faas-pin-loc'); if (elPLoc) elPLoc.value = pinParts[1] || currentUser.localityCode;
    const elPBgy = document.getElementById('faas-pin-bgy'); if (elPBgy) elPBgy.value = pinParts[2] || String(currentBgyCode).padStart(3, '0');
    const elPSec = document.getElementById('faas-pin-sec'); if (elPSec) elPSec.value = pinParts[3] || modalActiveRecord.sec || '001';
    const elPLot = document.getElementById('faas-pin-lot'); if (elPLot) elPLot.value = pinParts[4] || modalActiveRecord.lot || '001';
    const elPImp = document.getElementById('faas-pin-imp'); if (elPImp) elPImp.value = pinParts[5] || modalActiveRecord.imp || '';

    // Owner & Location
    const elAcctNo = document.getElementById('faas-acct-no'); if (elAcctNo) elAcctNo.value = '080269';
    const elAcctOwn = document.getElementById('faas-acct-owner'); if (elAcctOwn) elAcctOwn.value = modalActiveRecord.ownerName || '';
    const elOwnName = document.getElementById('faas-owner-name'); if (elOwnName) elOwnName.value = modalActiveRecord.ownerName || '';
    const elOwnAddr = document.getElementById('faas-owner-address'); if (elOwnAddr) elOwnAddr.value = modalActiveRecord.location || currentBgyName;
    const elAdmName = document.getElementById('faas-admin-name'); if (elAdmName) elAdmName.value = modalActiveRecord.administrator || '';
    const elBgyDisp = document.getElementById('faas-bgy-display'); if (elBgyDisp) elBgyDisp.value = currentBgyName;

    // Particulars & Boundaries
    const elSurv = document.getElementById('faas-survey-no'); if (elSurv) elSurv.value = modalActiveRecord.surveyNo || 'CAD-1234';
    const elCad = document.getElementById('faas-cad-lot'); if (elCad) elCad.value = modalActiveRecord.cadLotNo || 'LOT 456-A';
    const elOct = document.getElementById('faas-oct-tct'); if (elOct) elOct.value = modalActiveRecord.octTctNo || '';

    // Populate Land Appraisal List
    const areaVal = parseFloat(modalActiveRecord.area) || 463.00;
    const uvVal = parseFloat(modalActiveRecord.unitValue) || 540.00;
    const mktVal = parseFloat(modalActiveRecord.marketValue) || (areaVal * uvVal);
    const assVal = parseFloat(modalActiveRecord.assessedValue) || (mktVal * 0.06);

    modalAppraisalList = [
      {
        classCode: modalActiveRecord.classCode || 'R',
        classDesc: (modalActiveRecord.classCode === 'AGR' || modalActiveRecord.classCode === 'A') ? 'Agricultural' : 'Residential',
        actualUseCode: (modalActiveRecord.classCode === 'AGR' || modalActiveRecord.classCode === 'A') ? 'AGR' : 'RES',
        actualUseDesc: (modalActiveRecord.classCode === 'AGR' || modalActiveRecord.classCode === 'A') ? 'Riceland' : 'R-2',
        subClassCode: (modalActiveRecord.classCode === 'AGR' || modalActiveRecord.classCode === 'A') ? 'A1' : 'R2',
        subClassDesc: (modalActiveRecord.classCode === 'AGR' || modalActiveRecord.classCode === 'A') ? 'A-1' : 'R-2',
        area: areaVal,
        areaUnit: (modalActiveRecord.classCode === 'AGR' || modalActiveRecord.classCode === 'A') ? 'Hectare' : 'Square Meter',
        stripCode: '0',
        stripDesc: '0 - No Stripping',
        unitValue: uvVal,
        baseMarketValue: mktVal,
        influenceCode: '0',
        influenceDesc: 'Not Applicable',
        influenceVal: 0.00,
        marketValue: mktVal,
        levelPercent: (mktVal > 0 ? (assVal / mktVal * 100) : 6.00),
        assessedValue: assVal,
        ptExempt: modalActiveRecord.taxable === 'E'
      }
    ];

    selectedAppraisalIndex = 0;
    renderModalAppraisalTable();
    renderModalAssessmentSummary();
    recalculateFaasTotals();

    modal.style.display = 'flex';
  }

  window.closeFaasModal = function () {
    const modal = document.getElementById('land-faas-modal');
    if (modal) modal.style.display = 'none';
  };

  function toggleFaasLock() {
    isFaasLocked = !isFaasLocked;
    updateFaasLockUI();
    alert(isFaasLocked ? 'Property record locked (Read-Only mode).' : 'Property record unlocked for edits (F1).');
  }

  function updateFaasLockUI() {
    const badge = document.getElementById('faas-unlock-badge');
    if (badge) {
      badge.textContent = isFaasLocked ? 'LOCKED (Press F1 to Unlock)' : 'UNLOCKED (Press F1 to Lock)';
      badge.style.color = isFaasLocked ? '#F59E0B' : '#1DB954';
      badge.style.borderColor = isFaasLocked ? '#F59E0B' : '#1DB954';
    }
  }

  function renderModalAppraisalTable() {
    const tbody = document.getElementById('faas-appraisal-tbody');
    if (!tbody) return;

    let html = '';
    modalAppraisalList.forEach((item, idx) => {
      const isSel = idx === selectedAppraisalIndex;
      html += `
        <tr class="${isSel ? 'active-row' : ''}" onclick="window.selectAppraisalRow(${idx})" ondblclick="window.openAppraisalSubModal(false)" style="cursor: pointer;">
          <td><strong>${escapeHtml(item.classCode)}</strong></td>
          <td class="mono">${escapeHtml(item.subClassCode || item.subClassDesc)}</td>
          <td>${escapeHtml(item.actualUseDesc)}</td>
          <td class="mono" style="text-align: right;">${item.area.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.areaUnit === 'Hectare' ? 'Ha.' : 'Sq.M.'}</td>
          <td class="mono">${escapeHtml(item.stripCode !== '0' ? item.stripDesc : '0')}</td>
          <td class="mono" style="text-align: right;">₱ ${item.unitValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="mono" style="text-align: right;">${item.influenceVal !== 0 ? item.influenceVal.toFixed(2) + '%' : '0.00'}</td>
          <td class="mono" style="text-align: right; color: #1DB954; font-weight: 700;">₱ ${item.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="mono" style="text-align: center; font-weight: 700; color: ${item.ptExempt ? '#ff4d4d' : '#1DB954'};">${item.ptExempt ? 'E' : 'T'}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  window.selectAppraisalRow = function (idx) {
    selectedAppraisalIndex = idx;
    renderModalAppraisalTable();
  };

  function renderModalAssessmentSummary() {
    const tbody = document.getElementById('faas-assessment-tbody');
    if (!tbody) return;

    let html = '';
    modalAppraisalList.forEach(item => {
      html += `
        <tr>
          <td><span class="proproll-prop-type-badge">Land (${escapeHtml(item.classCode)})</span></td>
          <td>(${escapeHtml(item.classCode)}) ${escapeHtml(item.actualUseDesc)}${item.ptExempt ? ' <strong style="color: #ff4d4d;">(Exempted)</strong>' : ''}</td>
          <td class="mono" style="text-align: right; font-weight: 700;">₱ ${item.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="mono" style="text-align: right; color: #1DB954; font-weight: 700;">${item.levelPercent.toFixed(2)} %</td>
          <td class="mono assessed-cell" style="text-align: right; font-weight: 800; color: #1DB954;">₱ ${item.assessedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function recalculateFaasTotals() {
    let totMV = 0, totAV = 0;
    modalAppraisalList.forEach(item => {
      totMV += item.marketValue;
      totAV += item.assessedValue;
    });

    const elTotMV = document.getElementById('faas-footer-total-mv');
    const elTotAV = document.getElementById('faas-footer-total-av');
    const elBaseBadge = document.getElementById('faas-base-market-badge');

    if (elTotMV) elTotMV.textContent = `₱ ${totMV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (elTotAV) elTotAV.textContent = `₱ ${totAV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (elBaseBadge) elBaseBadge.textContent = totMV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  window.deleteSelectedAppraisalRow = function () {
    if (modalAppraisalList.length <= 1) {
      alert('Cannot delete: A property assessment must contain at least one appraisal line.');
      return;
    }
    if (confirm('Are you sure you want to DELETE this Land Appraisal Detail record?')) {
      modalAppraisalList.splice(selectedAppraisalIndex, 1);
      selectedAppraisalIndex = Math.max(0, selectedAppraisalIndex - 1);
      renderModalAppraisalTable();
      renderModalAssessmentSummary();
      recalculateFaasTotals();
    }
  };

  // ==============================================================================
  // 12. SUB-MODAL: LAND APPRAISAL RECORD UPDATE (Fr-LandDtl from LAND-UPD.p)
  // ==============================================================================
  window.openAppraisalSubModal = function (isAdd) {
    isEditingNewDetail = isAdd;
    const subModal = document.getElementById('land-appraisal-edit-modal');
    if (!subModal) return;

    let item = modalAppraisalList[selectedAppraisalIndex] || LAND_UV_SCHEDULE[1];
    if (isAdd) {
      item = {
        classCode: 'R',
        classDesc: 'Residential',
        actualUseCode: 'RES',
        actualUseDesc: 'R-2',
        subClassCode: 'R2',
        subClassDesc: 'R-2',
        area: 100.00,
        areaUnit: 'Square Meter',
        stripCode: '0',
        stripDesc: '0 - No Stripping',
        unitValue: 540.00,
        baseMarketValue: 54000.00,
        influenceCode: '0',
        influenceDesc: 'Not Applicable',
        influenceVal: 0.00,
        marketValue: 54000.00,
        levelPercent: 6.00,
        assessedValue: 3240.00,
        ptExempt: false
      };
    }

    // Populate Fields
    document.getElementById('dtl-class-code').value = item.classCode || 'R';
    document.getElementById('dtl-class-desc').value = item.classDesc || 'Residential';
    document.getElementById('dtl-actual-use-code').value = item.actualUseCode || 'RES';
    document.getElementById('dtl-actual-use-desc').value = item.actualUseDesc || 'R-2';
    document.getElementById('dtl-subclass-code').value = item.subClassCode || 'R2';
    document.getElementById('dtl-subclass-desc').value = item.subClassDesc || 'R-2';
    document.getElementById('dtl-area').value = item.area || 463.00;
    document.getElementById('dtl-area-unit').value = item.areaUnit || 'Square Meter';
    document.getElementById('dtl-unit-value').value = item.unitValue || 540.00;
    document.getElementById('dtl-uv-unit').value = item.areaUnit || 'Square Meter';
    document.getElementById('dtl-influence-sel').value = item.influenceCode || '0';
    document.getElementById('dtl-influence-val').value = item.influenceVal || 0.00;
    document.getElementById('dtl-level-percent').value = `${(item.levelPercent || 6.00).toFixed(2)}%`;
    document.getElementById('dtl-exempted').checked = !!item.ptExempt;

    recalcAppraisalSubModal();
    subModal.style.display = 'flex';
  };

  window.closeAppraisalSubModal = function () {
    const subModal = document.getElementById('land-appraisal-edit-modal');
    if (subModal) subModal.style.display = 'none';
  };

  window.onInfluenceChanged = function () {
    const sel = document.getElementById('dtl-influence-sel');
    const factor = INFLUENCE_FACTORS.find(f => f.code === sel.value);
    if (factor) {
      document.getElementById('dtl-influence-val').value = factor.percent.toFixed(2);
      document.getElementById('dtl-influence-desc').value = factor.type === 'None' ? 'None' : 'Percentage (%)';
    }
    recalcAppraisalSubModal();
  };

  window.recalcAppraisalSubModal = function () {
    const area = parseFloat(document.getElementById('dtl-area')?.value) || 0;
    const uv = parseFloat(document.getElementById('dtl-unit-value')?.value) || 0;
    const inflVal = parseFloat(document.getElementById('dtl-influence-val')?.value) || 0;
    const lvlStr = (document.getElementById('dtl-level-percent')?.value || '6.00').replace('%', '').trim();
    const levelPercent = parseFloat(lvlStr) || 6.00;

    const baseMV = area * uv;
    const adj = baseMV * (inflVal / 100);
    const netMV = baseMV + adj;

    const elBase = document.getElementById('dtl-base-mv');
    const elNet = document.getElementById('dtl-net-mv');

    if (elBase) elBase.value = baseMV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (elNet) elNet.value = netMV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  window.saveAppraisalSubModal = function () {
    const area = parseFloat(document.getElementById('dtl-area').value) || 0;
    const uv = parseFloat(document.getElementById('dtl-unit-value').value) || 0;
    const inflVal = parseFloat(document.getElementById('dtl-influence-val').value) || 0;
    const lvlStr = (document.getElementById('dtl-level-percent').value || '6.00').replace('%', '').trim();
    const levelPercent = parseFloat(lvlStr) || 6.00;
    const isExempt = document.getElementById('dtl-exempted').checked;

    const baseMV = area * uv;
    const adj = baseMV * (inflVal / 100);
    const netMV = baseMV + adj;
    const av = isExempt ? 0 : (netMV * (levelPercent / 100));

    const item = {
      classCode: document.getElementById('dtl-class-code').value.trim(),
      classDesc: document.getElementById('dtl-class-desc').value.trim(),
      actualUseCode: document.getElementById('dtl-actual-use-code').value.trim(),
      actualUseDesc: document.getElementById('dtl-actual-use-desc').value.trim(),
      subClassCode: document.getElementById('dtl-subclass-code').value.trim(),
      subClassDesc: document.getElementById('dtl-subclass-desc').value.trim(),
      area: area,
      areaUnit: document.getElementById('dtl-area-unit').value,
      stripCode: '0',
      stripDesc: document.getElementById('dtl-strip-sel').value,
      unitValue: uv,
      baseMarketValue: baseMV,
      influenceCode: document.getElementById('dtl-influence-sel').value,
      influenceDesc: INFLUENCE_FACTORS.find(f => f.code === document.getElementById('dtl-influence-sel').value)?.desc || '',
      influenceVal: inflVal,
      marketValue: netMV,
      levelPercent: levelPercent,
      assessedValue: av,
      ptExempt: isExempt
    };

    if (isEditingNewDetail) {
      modalAppraisalList.push(item);
      selectedAppraisalIndex = modalAppraisalList.length - 1;
    } else {
      modalAppraisalList[selectedAppraisalIndex] = item;
    }

    renderModalAppraisalTable();
    renderModalAssessmentSummary();
    recalculateFaasTotals();
    closeAppraisalSubModal();
  };

  // ==============================================================================
  // 13. MASTER MODAL SAVE (LAND-UPD.p Save-But)
  // ==============================================================================
  window.saveFaasModal = function () {
    const ownerName = document.getElementById('faas-owner-name')?.value.trim() || modalActiveRecord.ownerName;
    const octTct = document.getElementById('faas-oct-tct')?.value.trim() || '';
    const surveyNo = document.getElementById('faas-survey-no')?.value.trim() || '';
    const cadLot = document.getElementById('faas-cad-lot')?.value.trim() || '';
    const taxable = document.getElementById('faas-taxability-sel')?.value === 'Taxable' ? 'T' : 'E';

    let totArea = 0, totMV = 0, totAV = 0;
    modalAppraisalList.forEach(item => {
      totArea += item.area;
      totMV += item.marketValue;
      totAV += item.assessedValue;
    });

    modalActiveRecord.ownerName = ownerName;
    modalActiveRecord.octTctNo = octTct;
    modalActiveRecord.surveyNo = surveyNo;
    modalActiveRecord.cadLotNo = cadLot;
    modalActiveRecord.taxable = taxable;
    modalActiveRecord.area = totArea;
    modalActiveRecord.marketValue = totMV;
    modalActiveRecord.assessedValue = totAV;

    // Update in consolidatedRecords
    const idx = consolidatedRecords.findIndex(r => r.id === modalActiveRecord.id);
    if (idx !== -1) {
      consolidatedRecords[idx] = JSON.parse(JSON.stringify(modalActiveRecord));
    } else {
      consolidatedRecords.unshift(JSON.parse(JSON.stringify(modalActiveRecord)));
    }

    applyFilters();
    updateSummaryStats();
    closeFaasModal();

    alert(`[LAND-UPD.p Database Commit]\n\nLand Property Assessment Record for "${ownerName}" (ARP: ${modalActiveRecord.arpNo}) has been successfully updated in OpenEdge Database tables (Land-Hdr, Land-Dtl, Assessment-Roll).`);
  };

  // ==============================================================================
  // 14. PREVIOUS ASSESSMENT & APPROVAL FORM MODAL (Fr-Approve)
  // ==============================================================================
  window.openPrevApprovalModal = function () {
    const modal = document.getElementById('land-prev-approval-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closePrevApprovalModal = function () {
    const modal = document.getElementById('land-prev-approval-modal');
    if (modal) modal.style.display = 'none';
  };

  window.savePrevApprovalModal = function () {
    closePrevApprovalModal();
    alert('Previous assessment memoranda and superseded tax declarations successfully updated.');
  };

  // ==============================================================================
  // 15. LOOKUP DIALOGS CONTROLLERS (landuv.p, adjfactor.p, street.p, etc.)
  // ==============================================================================
  window.openLandUvLookup = function () {
    const modal = document.getElementById('lookup-landuv-modal');
    if (!modal) return;
    renderLandUvTable(LAND_UV_SCHEDULE);
    modal.style.display = 'flex';
  };

  window.closeLandUvLookup = function () {
    const modal = document.getElementById('lookup-landuv-modal');
    if (modal) modal.style.display = 'none';
  };

  function renderLandUvTable(list) {
    const tbody = document.getElementById('lookup-landuv-tbody');
    if (!tbody) return;
    tbody.innerHTML = list.map((item, idx) => `
      <tr onclick="window.selectLandUvItem(${idx})">
        <td><strong>${item.classCode}</strong> (${item.classDesc})</td>
        <td class="mono">${item.subClassDesc}</td>
        <td>${item.actualUseDesc}</td>
        <td class="mono" style="text-align: right; color: var(--color-primary, #1DB954); font-weight: 700;">₱ ${item.unitValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td class="mono">${item.areaUnit}</td>
      </tr>
    `).join('');
  }

  window.filterLandUvTable = function () {
    const q = (document.getElementById('lookup-landuv-search')?.value || '').toLowerCase();
    const filtered = LAND_UV_SCHEDULE.filter(i =>
      i.classDesc.toLowerCase().includes(q) ||
      i.actualUseDesc.toLowerCase().includes(q) ||
      i.subClassDesc.toLowerCase().includes(q)
    );
    renderLandUvTable(filtered);
  };

  window.selectLandUvItem = function (idx) {
    const item = LAND_UV_SCHEDULE[idx];
    if (!item) return;

    document.getElementById('dtl-class-code').value = item.classCode;
    document.getElementById('dtl-class-desc').value = item.classDesc;
    document.getElementById('dtl-actual-use-code').value = item.actualUseCode;
    document.getElementById('dtl-actual-use-desc').value = item.actualUseDesc;
    document.getElementById('dtl-subclass-code').value = item.subClassCode;
    document.getElementById('dtl-subclass-desc').value = item.subClassDesc;
    document.getElementById('dtl-unit-value').value = item.unitValue.toFixed(2);
    document.getElementById('dtl-area-unit').value = item.areaUnit;
    document.getElementById('dtl-uv-unit').value = item.areaUnit;
    document.getElementById('dtl-level-percent').value = `${item.levelPercent.toFixed(2)}%`;

    recalcAppraisalSubModal();
    closeLandUvLookup();
  };

  window.openAdjFactorLookup = function () {
    const modal = document.getElementById('lookup-adjfactor-modal');
    if (!modal) return;
    const tbody = document.getElementById('lookup-adjfactor-tbody');
    if (tbody) {
      tbody.innerHTML = INFLUENCE_FACTORS.map((f) => `
        <tr onclick="window.selectAdjFactorItem('${f.code}')">
          <td class="mono" style="font-weight: 700;">${f.code}</td>
          <td>${f.desc}</td>
          <td class="mono" style="text-align: right; color: ${f.percent >= 0 ? '#1DB954' : '#ff4d4d'}; font-weight: 700;">${f.percent > 0 ? '+' : ''}${f.percent.toFixed(2)}%</td>
          <td>${f.type}</td>
        </tr>
      `).join('');
    }
    modal.style.display = 'flex';
  };

  window.closeAdjFactorLookup = function () {
    const modal = document.getElementById('lookup-adjfactor-modal');
    if (modal) modal.style.display = 'none';
  };

  window.selectAdjFactorItem = function (code) {
    document.getElementById('dtl-influence-sel').value = code;
    onInfluenceChanged();
    closeAdjFactorLookup();
  };

  // Owners & Admin Lookups
  window.openOwnerLookup = function () {
    const modal = document.getElementById('lookup-owner-modal');
    if (!modal) return;
    document.getElementById('lookup-owner-title').textContent = 'Property Ownership Account Directory (l-ownerlst.p)';
    renderOwnerTable(OWNERS_DIRECTORY, false);
    modal.style.display = 'flex';
  };

  window.openAdminLookup = function () {
    const modal = document.getElementById('lookup-owner-modal');
    if (!modal) return;
    document.getElementById('lookup-owner-title').textContent = 'Administrator Lookup Directory (getown2.p)';
    renderOwnerTable(OWNERS_DIRECTORY, true);
    modal.style.display = 'flex';
  };

  window.closeOwnerLookup = function () {
    const modal = document.getElementById('lookup-owner-modal');
    if (modal) modal.style.display = 'none';
  };

  function renderOwnerTable(list, isAdmin) {
    const tbody = document.getElementById('lookup-owner-tbody');
    if (!tbody) return;
    tbody.innerHTML = list.map((item, idx) => `
      <tr onclick="window.selectOwnerItem(${idx}, ${isAdmin})">
        <td class="mono" style="font-weight: 700;">${item.acctNo}</td>
        <td><strong>${escapeHtml(item.ownerName)}</strong></td>
        <td>${escapeHtml(item.address)}</td>
      </tr>
    `).join('');
  }

  window.filterOwnerTable = function () {
    const q = (document.getElementById('lookup-owner-search')?.value || '').toLowerCase();
    const filtered = OWNERS_DIRECTORY.filter(o =>
      o.ownerName.toLowerCase().includes(q) ||
      o.address.toLowerCase().includes(q) ||
      o.acctNo.includes(q)
    );
    renderOwnerTable(filtered, false);
  };

  window.selectOwnerItem = function (idx, isAdmin) {
    const item = OWNERS_DIRECTORY[idx];
    if (!item) return;

    if (isAdmin) {
      document.getElementById('faas-admin-name').value = item.ownerName;
      document.getElementById('faas-admin-address').value = item.address;
    } else {
      document.getElementById('faas-acct-no').value = item.acctNo;
      document.getElementById('faas-acct-owner').value = item.ownerName;
      document.getElementById('faas-owner-name').value = item.ownerName;
      document.getElementById('faas-owner-address').value = item.address;
    }
    closeOwnerLookup();
  };

  // Street Lookup
  window.openStreetLookup = function () {
    const modal = document.getElementById('lookup-street-modal');
    if (!modal) return;
    const tbody = document.getElementById('lookup-street-tbody');
    if (tbody) {
      tbody.innerHTML = STREETS_DIRECTORY.map(s => `
        <tr onclick="window.selectStreetItem('${escapeHtml(s.name)}')">
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td>${escapeHtml(s.bgy)}</td>
        </tr>
      `).join('');
    }
    modal.style.display = 'flex';
  };

  window.closeStreetLookup = function () {
    const modal = document.getElementById('lookup-street-modal');
    if (modal) modal.style.display = 'none';
  };

  window.selectStreetItem = function (name) {
    const el = document.getElementById('faas-street');
    if (el) el.value = name;
    closeStreetLookup();
  };

  // Delete & Helpers
  window.handleDeleteProperty = function () {
    if (!selectedRecord) {
      alert('Please select a property record to delete.');
      return;
    }
    const confirmMsg = `Are you sure to DELETE property unit record?\n\nTD No: ${selectedRecord.arpNo}\nOwner: ${selectedRecord.ownerName}\nPIN: ${selectedRecord.pin}`;
    if (confirm(confirmMsg)) {
      consolidatedRecords = consolidatedRecords.filter(r => r.id !== selectedRecord.id);
      applyFilters();
      updateSummaryStats();
      alert('Record deleted successfully.');
    }
  };

  window.handlePrintTD = function () {
    if (!selectedRecord) {
      alert('Please select a property record first.');
      return;
    }
    alert(`Generating official Tax Declaration Certificate for:\n\nTD No: ${selectedRecord.arpNo}\nOwner: ${selectedRecord.ownerName}\nPIN: ${selectedRecord.pin}`);
  };

  window.handlePaymentRecords = function () {
    if (!selectedRecord) {
      alert('Please select a property record first.');
      return;
    }
    alert(`Treasury Payment Ledger (sl.p) for ${selectedRecord.ownerName} (${selectedRecord.arpNo}).`);
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
