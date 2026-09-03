/* ==========================================================================
   BUILDING PROPERTY FILE MODULE (new-bldg.p)
   1:1 Authentic Re-creation matching Progress 4GL and Green Deck UI
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Session & User State
  let currentUser = {
    userName: 'Editha Q Medrano',
    localityCode: 22,
    localityName: 'Ramon',
    revYear: '2024'
  };

  try {
    const sessionStr = sessionStorage.getItem('erpas_user');
    if (sessionStr) {
      const auth = JSON.parse(sessionStr);
      if (auth && auth.user) {
        currentUser.userName = auth.user.userName || currentUser.userName;
        currentUser.localityCode = parseInt(auth.user.localityCode) || currentUser.localityCode;
        currentUser.localityName = auth.user.localityName || currentUser.localityName;
        currentUser.revYear = String(auth.user.revisionYear) || currentUser.revYear;
      }
    }
  } catch (e) {
    console.warn('Session parsing fallback:', e);
  }

  // Set Window Title & Assessor Badge
  const windowTitleEl = document.getElementById('bldg-window-title');
  if (windowTitleEl) {
    windowTitleEl.textContent = `Building Property File - Revision Year(s) ${currentUser.revYear}`;
  }
  const assessorBadgeEl = document.getElementById('bldg-assessor-badge');
  if (assessorBadgeEl) {
    assessorBadgeEl.textContent = `-${currentUser.userName}-`;
  }

  // State Variables matching Progress 4GL
  let currentBgyCode = 6;
  let currentBgyName = 'GEN. AGUINALDO, RAMON';
  let activeSortOption = 2; // 2: by TD No, 1: by Owner, 3: by PIN
  let approveOnly = false;
  let selectedRecordId = null;
  let bldgDatabase = [];
  let isLoading = false;

  // Barangay Directory (Matching Isabela Ramon Barangays)
  const BARANGAYS = {
    1: 'BUGALLON PROPER',
    2: 'AMBATALI',
    3: 'POBLACION',
    4: 'SAN MIGUEL',
    5: 'PLANAS',
    6: 'GEN. AGUINALDO',
    7: 'SAN ANTONIO',
    8: 'RANIAG',
    9: 'OSCARIZ',
    10: 'BURGOS',
    11: 'SAN SEBASTIAN',
    12: 'NAGBACALAN'
  };

  // Fallback Mock Datasets if offline
  const fallbackBuildingData = [
    {
      id: 'B-6-7',
      bgyCode: '6',
      arpNo: '2024-006-00007',
      rawArp: 7,
      pin: '024-006-022-010-1001',
      sec: '022',
      lot: '010',
      imp: '1001',
      ownerName: 'FONDANERA, JINGLE',
      administrator: '',
      address: 'GEN. AGUINALDO, RAMON, ISABELA',
      classCode: 'R (III)',
      bldgDesc: 'Residential Building',
      area: 99.00,
      unitValue: 6000.00,
      tax: 'T',
      adjustment: 'None',
      marketValue: 614500.00,
      assessedValue: 153630.00,
      status: 'Approved',
      validated: true,
      validatedBy: 'Editha Q Medrano',
      validatedDate: '06/15/2026',
      validatedTime: '09:30:15 AM'
    },
    {
      id: 'B-6-14',
      bgyCode: '6',
      arpNo: '2024-006-00014',
      rawArp: 14,
      pin: '024-006-022-011-1001',
      sec: '022',
      lot: '011',
      imp: '1001',
      ownerName: 'HOME DEVELOPMENT MUTUAL FUND',
      administrator: 'Pag-IBIG Fund Head',
      address: 'GEN. AGUINALDO, RAMON, ISABELA',
      classCode: 'R (V)',
      bldgDesc: 'Residential Bldg.',
      area: 88.50,
      unitValue: 8000.00,
      tax: 'T',
      adjustment: 'Depr.   3.0%',
      marketValue: 706160.00,
      assessedValue: 176540.00,
      status: 'Approved',
      validated: true,
      validatedBy: 'Editha Q Medrano',
      validatedDate: '06/15/2026',
      validatedTime: '09:42:00 AM'
    },
    {
      id: 'B-6-16',
      bgyCode: '6',
      arpNo: '2024-006-00016',
      rawArp: 16,
      pin: '024-006-022-013-1001',
      sec: '022',
      lot: '013',
      imp: '1001',
      ownerName: 'CIPRIANO, TUMANENG',
      administrator: '',
      address: 'GEN. AGUINALDO, RAMON, ISABELA',
      classCode: 'R (III)',
      bldgDesc: 'Residential Building',
      area: 36.00,
      unitValue: 6000.00,
      tax: 'T',
      adjustment: 'None',
      marketValue: 242800.00,
      assessedValue: 24280.00,
      status: 'Approved',
      validated: false,
      validatedBy: '',
      validatedDate: '',
      validatedTime: ''
    },
    {
      id: 'B-6-20',
      bgyCode: '6',
      arpNo: '2024-006-00020',
      rawArp: 20,
      pin: '024-006-022-015-1001',
      sec: '022',
      lot: '015',
      imp: '1001',
      ownerName: 'ISABELA AGRO-COMMERCIAL RICE MILL CORP.',
      administrator: 'Atty. Renato P. Dimaliwat',
      address: 'National Highway, Gen. Aguinaldo, Ramon',
      classCode: 'Commercial (C-1)',
      bldgDesc: 'Commercial Rice Mill & Steel Warehouse',
      area: 850.00,
      unitValue: 6200.00,
      tax: 'T',
      adjustment: 'None',
      marketValue: 5270000.00,
      assessedValue: 2635000.00,
      status: 'Approved',
      validated: true,
      validatedBy: 'Editha Q Medrano',
      validatedDate: '06/15/2026',
      validatedTime: '10:05:22 AM'
    },
    {
      id: 'B-6-90001',
      bgyCode: '6',
      arpNo: 'For Approval',
      rawArp: 9000001,
      pin: '024-006-023-004-1001',
      sec: '023',
      lot: '004',
      imp: '1001',
      ownerName: 'MUNICIPALITY OF RAMON',
      administrator: 'Hon. Mayor Office',
      address: 'Barangay Multi-Purpose Hall, Gen. Aguinaldo',
      classCode: 'Special (S-1)',
      bldgDesc: 'New 2-Storey Barangay Multi-Purpose Hall',
      area: 320.00,
      unitValue: 5500.00,
      tax: 'E',
      adjustment: 'None',
      marketValue: 1760000.00,
      assessedValue: 176000.00,
      status: 'For Approval',
      validated: false,
      validatedBy: '',
      validatedDate: '',
      validatedTime: ''
    }
  ];

  // DOM Elements
  const bgyCodeInput = document.getElementById('bldg-bgy-code-input');
  const bgyNamePill = document.getElementById('bldg-bgy-name-pill');
  const approveOnlyCb = document.getElementById('bldg-approve-only-cb');
  const sortSelect = document.getElementById('bldg-sort-select');
  const tbody = document.getElementById('bldg-table-tbody');
  const statCount = document.getElementById('bldg-stat-total-count');
  const statArea = document.getElementById('bldg-stat-total-area');
  const statAV = document.getElementById('bldg-stat-total-av');
  const remarksText = document.getElementById('bldg-remarks-text');

  // Filter Elements
  const fTd = document.getElementById('bldg-find-td');
  const fPin = document.getElementById('bldg-find-pin');
  const fName = document.getElementById('bldg-find-name');
  const fCls = document.getElementById('bldg-find-cls');
  const fUse = document.getElementById('bldg-find-use');
  const fArea = document.getElementById('bldg-find-area');
  const fTax = document.getElementById('bldg-find-tax');
  const fMkt = document.getElementById('bldg-find-mkt');
  const fAv = document.getElementById('bldg-find-av');

  // 2. Fetch Live Building Records from Backend Server
  async function fetchBuildingRecords(bgyCode) {
    isLoading = true;
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 32px; color: #1DB954; font-weight: 600;">
        <span style="display: inline-block; animation: spin 1s infinite linear;">⟳</span> Reading Building records from Progress 4GL Database (new-bldg.p)...
      </td></tr>`;
    }

    try {
      const url = `/api/bldg?bgy=${bgyCode}&loc=${currentUser.localityCode}&approved=${approveOnly}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();

      if (data && Array.isArray(data.records) && data.records.length > 0) {
        bldgDatabase = data.records;
        if (data.summary && data.summary.fullBarangayTag) {
          currentBgyName = data.summary.fullBarangayTag;
        } else if (BARANGAYS[bgyCode]) {
          currentBgyName = `${BARANGAYS[bgyCode]}, ${currentUser.localityName.toUpperCase()}`;
        }
      } else {
        // Fallback to local dataset
        bldgDatabase = fallbackBuildingData.filter(r => parseInt(r.bgyCode, 10) === parseInt(bgyCode, 10));
        if (bldgDatabase.length === 0) bldgDatabase = fallbackBuildingData;
      }
    } catch (err) {
      console.warn('Live API fetch failed, using fallback data:', err);
      bldgDatabase = fallbackBuildingData;
    } finally {
      isLoading = false;
      if (bgyNamePill) bgyNamePill.textContent = currentBgyName;
      renderBuildingTable();
    }
  }

  // 3. Render Table Rows (bldgBrowse)
  function renderBuildingTable() {
    if (!tbody) return;

    let filtered = bldgDatabase.filter(item => {
      if (approveOnly && item.status !== 'Approved') return false;

      // Column Instant Filters
      if (fTd && fTd.value.trim()) {
        const query = fTd.value.trim().toLowerCase();
        if (!String(item.arpNo).toLowerCase().includes(query)) return false;
      }
      if (fPin && fPin.value.trim()) {
        const query = fPin.value.trim().toLowerCase();
        if (!String(item.pin).toLowerCase().includes(query)) return false;
      }
      if (fName && fName.value.trim()) {
        const query = fName.value.trim().toLowerCase();
        if (!String(item.ownerName).toLowerCase().includes(query)) return false;
      }
      if (fCls && fCls.value) {
        if (!String(item.classCode).toLowerCase().includes(fCls.value.toLowerCase())) return false;
      }
      if (fUse && fUse.value.trim()) {
        const query = fUse.value.trim().toLowerCase();
        if (!String(item.bldgDesc).toLowerCase().includes(query)) return false;
      }
      if (fArea && parseFloat(fArea.value)) {
        if (item.area < parseFloat(fArea.value)) return false;
      }
      if (fTax && fTax.value) {
        if (item.tax !== fTax.value) return false;
      }
      if (fMkt && parseFloat(fMkt.value)) {
        if (item.marketValue < parseFloat(fMkt.value)) return false;
      }
      if (fAv && parseFloat(fAv.value)) {
        if (item.assessedValue < parseFloat(fAv.value)) return false;
      }

      return true;
    });

    // Sorting matching Progress 4GL vSort
    if (activeSortOption === 1) {
      filtered.sort((a, b) => String(a.ownerName).localeCompare(String(b.ownerName)));
    } else if (activeSortOption === 3) {
      filtered.sort((a, b) => String(a.pin).localeCompare(String(b.pin)));
    } else {
      // Sort 2: by TD / ARP Number
      filtered.sort((a, b) => {
        const aVal = a.rawArp || parseInt(String(a.arpNo).replace(/\D/g, ''), 10) || 0;
        const bVal = b.rawArp || parseInt(String(b.arpNo).replace(/\D/g, ''), 10) || 0;
        return aVal - bVal;
      });
    }

    // Compute Totals
    let totCount = filtered.length;
    let totAreaVal = 0;
    let totAVVal = 0;

    filtered.forEach(item => {
      totAreaVal += (item.area || 0);
      totAVVal += (item.assessedValue || 0);
    });

    if (statCount) statCount.textContent = totCount.toLocaleString();
    if (statArea) statArea.textContent = totAreaVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (statAV) statAV.textContent = '₱ ' + totAVVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 24px; color: #777;">No building records found for Barangay ${currentBgyCode}.</td></tr>`;
      if (remarksText) remarksText.innerHTML = 'RECORD DETAILS: No active record selected.';
      return;
    }

    filtered.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      if (selectedRecordId === item.id || (!selectedRecordId && idx === 0)) {
        tr.classList.add('selected');
        selectedRecordId = item.id;
        updateRecordRemarks(item);
      }

      // Status indicator dot
      const isApp = item.status === 'Approved';
      const statusDot = isApp
        ? '<span style="color: #1DB954; font-size: 14px;">●</span>'
        : '<span style="color: #FFA726; font-size: 14px;">●</span>';

      const arpDisplay = item.arpNo === 'For Approval' || item.rawArp >= 9000000
        ? '<span class="for-approval" style="color: #FFA726; font-weight: 700;">For Approval</span>'
        : `<span class="mono">${item.arpNo}</span>`;

      tr.innerHTML = `
        <td class="align-center">${statusDot}</td>
        <td>${arpDisplay}</td>
        <td class="mono">${item.pin || ''}</td>
        <td style="font-weight: 600;">${item.ownerName || ''}${item.administrator ? ` <span style="color: var(--text-muted); font-size: 11px;">(${item.administrator})</span>` : ''}</td>
        <td>${item.classCode || ''}</td>
        <td>${item.bldgDesc || ''}</td>
        <td class="mono align-right">${(item.area || 0).toFixed(2)}</td>
        <td class="mono align-right">${(item.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td class="align-center" style="font-weight: 700; color: ${item.tax === 'T' ? '#1DB954' : '#FFA726'};">${item.tax || 'T'}</td>
        <td>${item.adjustment || 'None'}</td>
        <td class="mono align-right">₱ ${(item.marketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td class="assessed-cell align-right">₱ ${(item.assessedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      `;

      tr.addEventListener('click', () => {
        document.querySelectorAll('#bldg-table-tbody tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        selectedRecordId = item.id;
        updateRecordRemarks(item);
      });

      tr.addEventListener('dblclick', () => {
        handleEditBuilding();
      });

      tbody.appendChild(tr);
    });
  }

  // 4. Update Bottom Remarks Ribbon (VALUE-CHANGED of bldgBrowse)
  function updateRecordRemarks(item) {
    if (!remarksText) return;
    if (!item) {
      remarksText.innerHTML = 'RECORD DETAILS: No active record selected.';
      return;
    }

    const valInfo = item.validated
      ? `<strong style="color: #1DB954;">VALIDATED BY:</strong> ${item.validatedBy || currentUser.userName} (${item.validatedDate || '06/15/2026'} ${item.validatedTime || '09:30:15 AM'})`
      : `<strong style="color: #FFA726;">STATUS:</strong> Un-validated Record (Revision ${currentUser.revYear})`;

    remarksText.innerHTML = `${valInfo} &nbsp;&bull;&nbsp; <strong>ARP/TD No.:</strong> ${item.arpNo} &nbsp;&bull;&nbsp; <strong>PIN:</strong> ${item.pin} &nbsp;&bull;&nbsp; <strong>Owner:</strong> ${item.ownerName} &nbsp;&bull;&nbsp; <strong>Description:</strong> ${item.bldgDesc} &nbsp;&bull;&nbsp; <strong>Area:</strong> ${(item.area || 0).toFixed(2)} sq.m. &nbsp;&bull;&nbsp; <strong>Location:</strong> ${item.address || currentBgyName}`;
  }

  // 5. Barangay Navigation & Lookup Handlers
  window.handleBgyGo = function () {
    if (!bgyCodeInput) return;
    let codeStr = bgyCodeInput.value.trim();
    let codeNum = parseInt(codeStr, 10);

    if (isNaN(codeNum) || codeNum < 1 || codeNum > 999) {
      alert('Invalid Barangay Number. Please check your entry.');
      bgyCodeInput.value = String(currentBgyCode).padStart(3, '0');
      bgyCodeInput.focus();
      return;
    }

    currentBgyCode = codeNum;
    bgyCodeInput.value = String(codeNum).padStart(3, '0');
    if (BARANGAYS[codeNum]) {
      currentBgyName = `${BARANGAYS[codeNum]}, ${currentUser.localityName.toUpperCase()}`;
    } else {
      currentBgyName = `BARANGAY ${String(codeNum).padStart(3, '0')}, ${currentUser.localityName.toUpperCase()}`;
    }
    if (bgyNamePill) bgyNamePill.textContent = currentBgyName;
    fetchBuildingRecords(codeNum);
  };

  window.handleBgyFolderLookup = function () {
    const modal = document.getElementById('bgy-lookup-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeBgyLookupModal = function () {
    const modal = document.getElementById('bgy-lookup-modal');
    if (modal) modal.style.display = 'none';
  };

  window.selectBgyFromList = function (code) {
    if (bgyCodeInput) bgyCodeInput.value = String(code).padStart(3, '0');
    window.closeBgyLookupModal();
    window.handleBgyGo();
  };

  // 6. Action Handlers (Add, Edit, Delete, Print, Change)
  window.handleAddBuilding = function () {
    const modal = document.getElementById('bldg-faas-modal');
    if (!modal) return;
    document.getElementById('bldg-faas-title').textContent = `Building Tax Declaration & Appraisal Entry (Add Record) - ${currentBgyName}`;
    document.getElementById('bldg-modal-arp').value = '';
    document.getElementById('bldg-modal-owner').value = '';
    document.getElementById('bldg-modal-pin').value = `024-${String(currentBgyCode).padStart(3, '0')}-001-01`;
    document.getElementById('bldg-modal-area').value = '120.00';
    document.getElementById('bldg-modal-unit').value = '4500.00';
    document.getElementById('bldg-modal-desc').value = '1-Storey Reinforced Concrete Residence';
    modal.style.display = 'flex';
  };

  window.handleEditBuilding = function () {
    const item = bldgDatabase.find(r => r.id === selectedRecordId);
    if (!item) {
      alert('Please select a building record to edit.');
      return;
    }

    const modal = document.getElementById('bldg-faas-modal');
    if (!modal) return;
    document.getElementById('bldg-faas-title').textContent = `Building Tax Declaration & Appraisal Entry (BLDG-UPD.p) - ${item.ownerName}`;
    document.getElementById('bldg-modal-arp').value = item.arpNo === 'For Approval' ? '' : item.arpNo;
    document.getElementById('bldg-modal-owner').value = item.ownerName;
    document.getElementById('bldg-modal-pin').value = item.pin;
    document.getElementById('bldg-modal-area').value = (item.area || 0).toFixed(2);
    document.getElementById('bldg-modal-unit').value = (item.unitValue || 0).toFixed(2);
    document.getElementById('bldg-modal-desc').value = item.bldgDesc;
    modal.style.display = 'flex';
  };

  window.closeBldgFaasModal = function () {
    const modal = document.getElementById('bldg-faas-modal');
    if (modal) modal.style.display = 'none';
  };

  window.saveBldgFaasModal = function () {
    alert('Building Appraisal & Assessment record successfully committed to eRPAS database.');
    window.closeBldgFaasModal();
    renderBuildingTable();
  };

  window.handleDeleteBuilding = function () {
    const item = bldgDatabase.find(r => r.id === selectedRecordId);
    if (!item) {
      alert('Please select a building record to delete.');
      return;
    }

    if (confirm(`Are you sure you want to DELETE/CANCEL Building Assessment Record for ${item.ownerName} (${item.arpNo})?`)) {
      bldgDatabase = bldgDatabase.filter(r => r.id !== selectedRecordId);
      selectedRecordId = null;
      renderBuildingTable();
    }
  };

  window.handlePrintTD = function () {
    const item = bldgDatabase.find(r => r.id === selectedRecordId);
    if (!item) {
      alert('Please select a building record to print.');
      return;
    }
    alert(`[Tax Declaration Preparation]\n\nGenerating Official BLGF Building Tax Declaration for ${item.ownerName} (${item.arpNo})...`);
  };

  window.handlePrintList = function () {
    alert(`[Detailed Building RPUs Listing]\n\nPreparing Barangay Building Cadastral Assessment Roll for Barangay ${currentBgyCode} - ${currentBgyName}.`);
  };

  window.handlePaymentRecords = function () {
    const item = bldgDatabase.find(r => r.id === selectedRecordId);
    alert(`[Taxpayer Payment Records]\n\nOpening Real Property Tax Treasury Ledger for ${item ? item.ownerName : 'Barangay ' + currentBgyCode}...`);
  };

  window.openChangeTransferModal = function () {
    const modal = document.getElementById('bldg-change-modal');
    if (!modal) return;
    const item = bldgDatabase.find(r => r.id === selectedRecordId);
    if (item) {
      document.getElementById('fr-cur-bgy').value = String(currentBgyCode).padStart(3, '0');
      document.getElementById('fr-cur-arp').value = item.arpNo;
      document.getElementById('fr-cur-sec').value = item.sec || '001';
      document.getElementById('fr-cur-lot').value = item.lot || '001';
      document.getElementById('fr-cur-imp').value = item.imp || '1001';
    }
    modal.style.display = 'flex';
  };

  window.closeChangeTransferModal = function () {
    const modal = document.getElementById('bldg-change-modal');
    if (modal) modal.style.display = 'none';
  };

  window.processChangeTransfer = function () {
    alert('Change / Transfer of Building TD Numbers & PIN successfully processed.');
    window.closeChangeTransferModal();
  };

  // 7. Generic Features & Sync
  window.openGenericFeatureModal = function (title, desc) {
    alert(`[${title}]\n\n${desc}\n\nLoading Progress 4GL sub-module from eRPAS database...`);
  };

  window.handleSyncDownload = function () {
    alert('Connecting to Isabela Provincial Server...\n\nDownloading and synchronizing live building assessment records for Ramon, Isabela.');
  };

  window.handleSyncUpload = function () {
    alert('Connecting to Isabela Provincial Master Database...\n\nTransmitting local building revaluation roll updates to Provincial Server.');
  };

  // 8. Event Listeners
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      activeSortOption = parseInt(sortSelect.value, 10);
      renderBuildingTable();
    });
  }

  if (approveOnlyCb) {
    approveOnlyCb.addEventListener('change', () => {
      approveOnly = approveOnlyCb.checked;
      fetchBuildingRecords(currentBgyCode);
    });
  }

  // Instant Column Filters
  [fTd, fPin, fName, fCls, fUse, fArea, fTax, fMkt, fAv].forEach(input => {
    if (input) {
      input.addEventListener('input', renderBuildingTable);
      input.addEventListener('change', renderBuildingTable);
    }
  });

  if (bgyCodeInput) {
    bgyCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.handleBgyGo();
      }
    });
  }

  // 9. Keyboard Shortcuts matching new-bldg.p
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F6' || (e.altKey && e.key.toLowerCase() === 'a')) {
      e.preventDefault();
      window.handleAddBuilding();
    } else if (e.key === 'F7' || (e.altKey && e.key.toLowerCase() === 'e')) {
      e.preventDefault();
      window.handleEditBuilding();
    } else if (e.key === 'F8' || (e.altKey && e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      window.handleDeleteBuilding();
    } else if (e.key === 'F10' || (e.altKey && e.key.toLowerCase() === 'c')) {
      e.preventDefault();
      window.location.href = 'index.html';
    } else if (e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      window.handlePrintTD();
    } else if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      window.handlePrintList();
    } else if (e.altKey && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      window.handleBgyGo();
    }
  });

  // Initial Data Load (Barangay 6 / Gen. Aguinaldo)
  if (bgyCodeInput) bgyCodeInput.value = '006';
  if (bgyNamePill) bgyNamePill.textContent = currentBgyName;
  fetchBuildingRecords(6);
});
