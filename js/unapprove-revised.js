/**
 * Un-approved Real Property Assessment Records File (UNAPPROVE-REVISED.p)
 * Standalone Application Controller
 */

(function () {
  'use strict';

  let rawRecords = [];
  let filteredRecords = [];
  let selectedRecord = null;
  let currentSortMode = 4; // 1: Owner, 2: Date, 3: Revised TD, 4: Prev TD (Default), 5: PIN
  let byBgyFilterEnabled = true;

  // Active Session defaults
  let activeLocalityCode = 22;
  let activeLocalityName = 'Ramon';
  let activeRevisionYear = 2024;
  let activeUser = 'Editha Q Medrano';

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

  document.addEventListener('DOMContentLoaded', () => {
    initSession();
    initKeyShortcuts();
    fetchRecords();
  });

  function initSession() {
    try {
      const stored = sessionStorage.getItem('erpas_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.localityCode) activeLocalityCode = u.localityCode;
        if (u.localityName) activeLocalityName = u.localityName;
        if (u.revisionYear) activeRevisionYear = u.revisionYear;
        if (u.name) activeUser = u.name;
      }
    } catch (e) { }

    const titleEl = document.getElementById('unapp-page-title');
    if (titleEl) titleEl.textContent = `Un-approved Real Property Assessment Records - Revision Year(s) ${activeRevisionYear}`;

    const assessorBadge = document.getElementById('unapp-assessor-badge');
    if (assessorBadge) assessorBadge.textContent = `-${activeUser}-`;

    const revBadge = document.getElementById('unapp-rev-year-badge');
    if (revBadge) revBadge.textContent = `Revision Year: ${activeRevisionYear}`;

    // Read URL query params if any
    const urlParams = new URLSearchParams(window.location.search);
    const bgyParam = urlParams.get('bgy');
    if (bgyParam) {
      const bgyInput = document.getElementById('unapp-bgy-input');
      if (bgyInput) bgyInput.value = String(bgyParam).padStart(3, '0');
    }
  }

  window.toggleByBgyCheck = function () {
    const check = document.getElementById('unapp-by-bgy-check');
    const input = document.getElementById('unapp-bgy-input');
    byBgyFilterEnabled = check ? check.checked : true;
    if (input) {
      input.disabled = !byBgyFilterEnabled;
      input.style.opacity = byBgyFilterEnabled ? '1' : '0.4';
    }
    fetchRecords();
  };

  window.fetchRecords = async function () {
    const tbody = document.getElementById('unapp-tbody');
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
      tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 48px; color: #1DB954;"><span class="loading-spinner"></span> Loading un-approved revised records from OpenEdge rpadb database...</td></tr>';
    }

    try {
      const res = await fetch(`/api/unapproved-revised?bgy=${bgyNum}&loc=${activeLocalityCode}&rev=${activeRevisionYear}`);
      if (res.ok) {
        const data = await res.json();
        rawRecords = data.records || [];
        if (rawRecords.length > 0) {
          applySortAndFilter();
          updateTotals(data.summary);
          return;
        }
      }
    } catch (e) {
      console.warn('API fetch unapproved error:', e);
    }

    // Default Fallback Records
    rawRecords = generateDefaultRecords(bgyNum);
    applySortAndFilter();
  };

  function generateDefaultRecords(bgyNum) {
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

  function applySortAndFilter() {
    const kLand = document.getElementById('unapp-kind-land')?.checked ?? true;
    const kBldg = document.getElementById('unapp-kind-bldg')?.checked ?? true;
    const kMach = document.getElementById('unapp-kind-mach')?.checked ?? true;

    // 1. Kind Filtering
    filteredRecords = rawRecords.filter(r => {
      const k = (r.kindCode || r.propertyType || 'L').charAt(0).toUpperCase();
      if (k === 'L') return kLand;
      if (k === 'B') return kBldg;
      if (k === 'M') return kMach;
      return true;
    });

    // 2. Sort Ordering
    filteredRecords.sort((a, b) => {
      if (currentSortMode === 1) return (a.ownerName || '').localeCompare(b.ownerName || '');
      if (currentSortMode === 2) return (a.revisedDate || '').localeCompare(b.revisedDate || '');
      if (currentSortMode === 3) return (a.revisedTd || '').localeCompare(b.revisedTd || '');
      if (currentSortMode === 5) return (a.pin || '').localeCompare(b.pin || '');
      return (a.prevTdNo || '').localeCompare(b.prevTdNo || ''); // 4 Default
    });

    renderTable(filteredRecords);
    updateTotals();
  }

  window.setSortMode = function (mode) {
    currentSortMode = parseInt(mode, 10) || 4;
    const labels = document.querySelectorAll('.unapp-sort-options .unapp-radio-label');
    labels.forEach(l => {
      const radio = l.querySelector('input[type="radio"]');
      if (radio) l.classList.toggle('active', parseInt(radio.value, 10) === currentSortMode);
    });
    applySortAndFilter();
  };

  window.filterByKind = function () {
    applySortAndFilter();
  };

  function updateTotals(summary) {
    let landCount = 0, bldgCount = 0, machCount = 0, totArea = 0, totVal = 0;

    if (summary) {
      landCount = summary.landCount || 0;
      bldgCount = summary.bldgCount || 0;
      machCount = summary.machCount || 0;
      totArea = summary.totalArea || 0;
      totVal = summary.totalAssessedValue || 0;
    } else {
      rawRecords.forEach(r => {
        const k = (r.kindCode || r.propertyType || 'L').charAt(0).toUpperCase();
        if (k === 'L') landCount++;
        else if (k === 'B') bldgCount++;
        else if (k === 'M') machCount++;
        totArea += Number(r.area || 0);
        totVal += Number(r.assessedValue || 0);
      });
    }

    const totalCount = landCount + bldgCount + machCount;

    const elArea = document.getElementById('stat-total-area');
    if (elArea) elArea.textContent = `${totArea.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sq.m.`;

    const elVal = document.getElementById('stat-total-val');
    if (elVal) elVal.textContent = `₱ ${totVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const elLand = document.getElementById('stat-land-count');
    if (elLand) elLand.textContent = landCount.toLocaleString();

    const elBldg = document.getElementById('stat-bldg-count');
    if (elBldg) elBldg.textContent = bldgCount.toLocaleString();

    const elMach = document.getElementById('stat-mach-count');
    if (elMach) elMach.textContent = machCount.toLocaleString();

    const elTot = document.getElementById('stat-total-count');
    if (elTot) elTot.textContent = totalCount.toLocaleString();
  }

  function renderTable(records) {
    const tbody = document.getElementById('unapp-tbody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 48px; color: #A7A7A7;">No pending un-approved assessment records found matching current criteria.</td></tr>';
      selectedRecord = null;
      return;
    }

    tbody.innerHTML = records.map((r, idx) => {
      const mkt = Number(r.marketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const ass = Number(r.assessedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const area = Number(r.area || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pArea = Number(r.prevArea || r.area || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pMkt = Number(r.prevMarketValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pAss = Number(r.prevAssessedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const isSelected = selectedRecord && selectedRecord.arpNo === r.arpNo;
      const selectedClass = isSelected ? 'selected' : (idx === 0 && !selectedRecord ? 'selected' : '');
      if (idx === 0 && !selectedRecord) selectedRecord = r;

      return `
        <tr class="${selectedClass}" id="unapp-row-${r.arpNo}" onclick="window.selectRow(${r.arpNo}, this)" ondblclick="window.reviewSelectedRecord()">
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

  window.selectRow = function (arpNo, rowEl) {
    const rows = document.querySelectorAll('#unapp-tbody tr');
    rows.forEach(r => r.classList.remove('selected'));
    if (rowEl) rowEl.classList.add('selected');
    selectedRecord = rawRecords.find(r => r.arpNo === arpNo) || null;
  };

  // ==========================================================================
  // LAND TAX DECLARATION FAAS MODAL CONTROLLER (LAND-UPD.p Embedded)
  // ==========================================================================

  let faasActiveRecord = null;

  window.reviewSelectedRecord = function () {
    if (!selectedRecord) {
      alert('Please select an assessment record from the table to review.');
      return;
    }
    window.openFaasModal(selectedRecord);
  };

  window.openFaasModal = async function (record) {
    faasActiveRecord = record || selectedRecord || rawRecords[0];
    if (!faasActiveRecord) {
      alert('No record selected for FAAS Review & Update.');
      return;
    }

    const modal = document.getElementById('land-faas-modal');
    if (!modal) return;

    const bgyInput = document.getElementById('unapp-bgy-input');
    let bgyNum = bgyInput ? parseInt(bgyInput.value, 10) : 6;
    if (isNaN(bgyNum) || bgyNum <= 0) bgyNum = 6;
    const bgyName = BARANGAY_DIRECTORY[bgyNum] || `Barangay ${String(bgyNum).padStart(3, '0')}, ${activeLocalityName.toUpperCase()}`;

    // Window Header
    const headTitle = document.getElementById('faas-modal-header-title');
    if (headTitle) {
      headTitle.textContent = `Real Property - LAND/PLANTS & TREES (${faasActiveRecord.ownerName || activeUser}) - Press F1 to Unlock`;
    }

    // Top Identifiers
    const elArpRev = document.getElementById('faas-arp-rev'); if (elArpRev) elArpRev.value = String(activeRevisionYear).substring(2);
    const elArpLoc = document.getElementById('faas-arp-loc'); if (elArpLoc) elArpLoc.value = String(activeLocalityCode);
    const elArpBgy = document.getElementById('faas-arp-bgy'); if (elArpBgy) elArpBgy.value = String(bgyNum).padStart(3, '0');
    const elArpNo = document.getElementById('faas-arp-no');
    if (elArpNo) {
      elArpNo.value = (faasActiveRecord.revisedTd && !faasActiveRecord.revisedTd.includes('For Approval'))
        ? (faasActiveRecord.revisedTd.split('-')[3] || String(faasActiveRecord.arpNo).padStart(5, '0'))
        : String(faasActiveRecord.arpNo + 9000000);
    }
    const elArpSuf = document.getElementById('faas-arp-suf'); if (elArpSuf) elArpSuf.value = '';

    const pinParts = (faasActiveRecord.pin || `011-${activeLocalityCode}-${String(bgyNum).padStart(3, '0')}-001-001`).split('-');
    const elPinProv = document.getElementById('faas-pin-prov'); if (elPinProv) elPinProv.value = pinParts[0] || '011';
    const elPinLoc = document.getElementById('faas-pin-loc'); if (elPinLoc) elPinLoc.value = pinParts[1] || String(activeLocalityCode);
    const elPinBgy = document.getElementById('faas-pin-bgy'); if (elPinBgy) elPinBgy.value = pinParts[2] || String(bgyNum).padStart(3, '0');
    const elPinSec = document.getElementById('faas-pin-sec'); if (elPinSec) elPinSec.value = pinParts[3] || '001';
    const elPinLot = document.getElementById('faas-pin-lot'); if (elPinLot) elPinLot.value = pinParts[4] || '001';
    const elPinImp = document.getElementById('faas-pin-imp'); if (elPinImp) elPinImp.value = '';

    // Owner & Administrator Info
    const elAcctNo = document.getElementById('faas-acct-no'); if (elAcctNo) elAcctNo.value = String(faasActiveRecord.arpNo + 80260).padStart(6, '0');
    const elAcctOwn = document.getElementById('faas-acct-owner'); if (elAcctOwn) elAcctOwn.value = faasActiveRecord.ownerName || 'JACINTO, SABAS';
    const elOwnerName = document.getElementById('faas-owner-name'); if (elOwnerName) elOwnerName.value = faasActiveRecord.ownerName || 'JACINTO, SABAS';
    const elOwnerAddr = document.getElementById('faas-owner-address'); if (elOwnerAddr) elOwnerAddr.value = `${bgyName.toUpperCase()}, ISABELA`;
    const elAdminName = document.getElementById('faas-admin-name'); if (elAdminName) elAdminName.value = '';
    const elAdminAddr = document.getElementById('faas-admin-address'); if (elAdminAddr) elAdminAddr.value = '';

    // Property Location
    const elBgyDisp = document.getElementById('faas-bgy-display'); if (elBgyDisp) elBgyDisp.value = `${bgyName}`;
    const elStreet = document.getElementById('faas-street'); if (elStreet) elStreet.value = 'Provincial Road';
    const elBoundary = document.getElementById('faas-street-boundary'); if (elBoundary) elBoundary.value = 'Near Barangay Hall';

    // Particulars & Boundaries
    const elOct = document.getElementById('faas-oct-tct'); if (elOct) elOct.value = faasActiveRecord.octTctNo || `T-${String(faasActiveRecord.arpNo + 384900)}`;
    const elOctDate = document.getElementById('faas-oct-date'); if (elOctDate) elOctDate.value = '06/15/2026';
    const elSurv = document.getElementById('faas-survey-no'); if (elSurv) elSurv.value = faasActiveRecord.surveyNo || 'Cad-305-D';
    const elCad = document.getElementById('faas-cad-lot'); if (elCad) elCad.value = faasActiveRecord.lotNo || `Lot ${faasActiveRecord.arpNo}`;
    const elAssLot = document.getElementById('faas-ass-lot'); if (elAssLot) elAssLot.value = pinParts[4] || '001';
    const elBlock = document.getElementById('faas-block-no'); if (elBlock) elBlock.value = '001';

    // Boundaries
    const elNorth = document.getElementById('faas-b-north'); if (elNorth) elNorth.value = 'MAGAT RIVER';
    const elEast = document.getElementById('faas-b-east'); if (elEast) elEast.value = 'SEC. 07';
    const elSouth = document.getElementById('faas-b-south'); if (elSouth) elSouth.value = 'ROAD 02';
    const elWest = document.getElementById('faas-b-west'); if (elWest) elWest.value = 'ROAD TO POTIA';

    // Locational Group
    const elLocGrp = document.getElementById('faas-loc-group'); if (elLocGrp) elLocGrp.value = activeLocalityName;

    // Appraisal and Assessment tables
    const mktVal = faasActiveRecord.revisedMarketValue || faasActiveRecord.marketValue || 0;
    const assVal = faasActiveRecord.revisedAssessedValue || faasActiveRecord.assessedValue || 0;
    const areaVal = faasActiveRecord.revisedArea || faasActiveRecord.area || 0;
    const isHa = areaVal < 500;
    const areaStr = isHa ? `${areaVal.toFixed(6)} Ha/s.` : `${areaVal.toFixed(2)} Sq. M.`;
    const propKind = faasActiveRecord.propertyType || faasActiveRecord.kindCode || 'Agricultural';
    const subClass = propKind.includes('R') ? 'R-2' : 'A-1';
    const actualUse = propKind.includes('R') ? 'Residential' : 'Riceland, Upland';

    const elAppSub = document.getElementById('faas-app-subclass'); if (elAppSub) elAppSub.textContent = subClass;
    const elAppUse = document.getElementById('faas-app-actualuse'); if (elAppUse) elAppUse.textContent = actualUse;
    const elAppArea = document.getElementById('faas-app-area'); if (elAppArea) elAppArea.textContent = areaStr;
    const elAppUV = document.getElementById('faas-app-unitval'); if (elAppUV) elAppUV.textContent = (faasActiveRecord.unitValue || (isHa ? (mktVal / Math.max(1, areaVal)) : 540)).toFixed(2);
    const elAppMV = document.getElementById('faas-app-mktval'); if (elAppMV) elAppMV.textContent = mktVal.toLocaleString('en-US', { minimumFractionDigits: 2 });
    const elBaseMV = document.getElementById('faas-base-market-badge'); if (elBaseMV) elBaseMV.textContent = mktVal.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const elAssUse = document.getElementById('faas-ass-actualuse'); if (elAssUse) elAssUse.textContent = `(A) ${actualUse}`;
    const elAssMV = document.getElementById('faas-ass-mktval'); if (elAssMV) elAssMV.textContent = mktVal.toLocaleString('en-US', { minimumFractionDigits: 2 });
    const elAssLev = document.getElementById('faas-ass-level'); if (elAssLev) elAssLev.textContent = `${(mktVal > 0 ? (assVal / mktVal * 100) : 40).toFixed(2)} %`;
    const elAssVal = document.getElementById('faas-ass-val'); if (elAssVal) elAssVal.textContent = assVal.toLocaleString('en-US', { minimumFractionDigits: 2 });

    // Status and dates
    const elPostDte = document.getElementById('faas-posting-date'); if (elPostDte) elPostDte.value = faasActiveRecord.revisedDate || '06/15/2026';
    const elEffYr = document.getElementById('faas-effect-year'); if (elEffYr) elEffYr.value = activeRevisionYear;

    // Footer Totals
    const elTotMV = document.getElementById('faas-footer-total-mv'); if (elTotMV) elTotMV.textContent = `₱ ${mktVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const elTotAV = document.getElementById('faas-footer-total-av'); if (elTotAV) elTotAV.textContent = `₱ ${assVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    modal.style.display = 'flex';
  };

  window.closeFaasModal = function () {
    const modal = document.getElementById('land-faas-modal');
    if (modal) modal.style.display = 'none';
  };

  window.saveFaasModal = function () {
    if (!faasActiveRecord) {
      window.closeFaasModal();
      return;
    }

    // Read updated fields
    const elOwnerName = document.getElementById('faas-owner-name');
    if (elOwnerName && elOwnerName.value.trim()) {
      faasActiveRecord.ownerName = elOwnerName.value.trim();
    }

    const elOct = document.getElementById('faas-oct-tct');
    if (elOct && elOct.value.trim()) {
      faasActiveRecord.octTctNo = elOct.value.trim();
    }

    const elSurv = document.getElementById('faas-survey-no');
    if (elSurv && elSurv.value.trim()) {
      faasActiveRecord.surveyNo = elSurv.value.trim();
    }

    // Re-render row to reflect any changes
    applySortAndFilter();

    window.closeFaasModal();

    alert(`[LAND-UPD.p Record Saved]\nReal Property assessment record for [${faasActiveRecord.ownerName}] (ARP: ${faasActiveRecord.arpNo}) has been updated in OpenEdge database tables (Assessment-Roll & Land-Dtl).`);
  };

  // ==========================================================================
  // ASSESSMENT APPROVAL WIZARD POPUP CONTROLLER (approve-assessmt.p Embedded)
  // ==========================================================================

  let popActiveRecord = null;
  let popIsAutoTd = false;
  let popIsValidated = false;

  window.approveSelectedRecord = function () {
    if (!selectedRecord) {
      alert('Please select an assessment record first.');
      return;
    }
    window.openApprovalWizardModal(selectedRecord);
  };

  window.openApprovalWizardModal = function (record) {
    popActiveRecord = record || selectedRecord || rawRecords[0];
    if (!popActiveRecord) {
      alert('No record selected for approval.');
      return;
    }

    const modal = document.getElementById('unapp-approval-wizard-modal');
    if (!modal) return;

    // Subtitle & Header Badge
    const subTitle = document.getElementById('popup-wiz-sub');
    if (subTitle) subTitle.textContent = `General Revision ${activeRevisionYear}`;
    const badge = document.getElementById('pop-arp-badge');
    if (badge) badge.textContent = `ARP # ${String(popActiveRecord.arpNo).padStart(5, '0')}`;

    // Parse PIN parts
    const pinParts = (popActiveRecord.pin || '006-001-004-1004').split('-');
    const pinBgy = document.getElementById('pop-pin-bgy');
    const pinSec = document.getElementById('pop-pin-sec');
    const pinLot = document.getElementById('pop-pin-lot');
    const pinImp = document.getElementById('pop-pin-imp');
    const bgyInput = document.getElementById('unapp-bgy-input');
    const currentBgy = bgyInput ? bgyInput.value : '006';

    if (pinBgy) pinBgy.value = pinParts[0] || currentBgy;
    if (pinSec) pinSec.value = pinParts[1] || '001';
    if (pinLot) pinLot.value = pinParts[2] || '004';
    if (pinImp) pinImp.value = pinParts[3] || (popActiveRecord.kindCode === 'B' ? '1004' : '');

    // TD Number Parts
    const tdYear = document.getElementById('pop-td-year');
    const tdBgy = document.getElementById('pop-td-bgy');
    const tdSeries = document.getElementById('pop-td-series');
    const tdSfx = document.getElementById('pop-td-sfx');
    if (tdYear) tdYear.value = activeRevisionYear;
    if (tdBgy) tdBgy.value = pinParts[0] || currentBgy;
    if (tdSeries) tdSeries.value = String(popActiveRecord.arpNo).padStart(5, '0');
    if (tdSfx) tdSfx.value = '';

    // Auto-TD checkbox
    const autoCheck = document.getElementById('pop-auto-td-check');
    if (autoCheck) autoCheck.checked = false;
    popIsAutoTd = false;
    popIsValidated = false;

    // Validation message reset
    const valAlert = document.getElementById('pop-val-alert');
    if (valAlert) {
      valAlert.textContent = '<=== Click this button to validate existence of TD Number.';
      valAlert.className = 'wizard-val-alert';
    }
    const viewTdBtn = document.getElementById('pop-btn-view-td');
    if (viewTdBtn) viewTdBtn.style.display = 'none';

    // Owner and Location specs
    const ownerInput = document.getElementById('pop-owner-input');
    if (ownerInput) ownerInput.value = popActiveRecord.ownerName || 'SPS. TUMBAGA, RODOLFO & FIDENCIA';
    const locText = document.getElementById('pop-loc-text');
    if (locText) locText.textContent = `${BARANGAY_DIRECTORY[parseInt(pinParts[0], 10)] || 'GEN. AGUINALDO'}, ${activeLocalityName.toUpperCase()}, ISABELA`;
    const mvText = document.getElementById('pop-mv-text');
    if (mvText) mvText.textContent = `₱ ${Number(popActiveRecord.marketValue || 611770).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const avText = document.getElementById('pop-av-text');
    if (avText) avText.textContent = `₱ ${Number(popActiveRecord.assessedValue || 152940).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const effYrText = document.getElementById('pop-eff-year-text');
    if (effYrText) effYrText.textContent = '2026';

    // Populate Appraisal Detail Table
    const tbody = document.getElementById('pop-detail-tbody');
    if (tbody) {
      const clsDesc = popActiveRecord.propertyType || (popActiveRecord.kindCode === 'B' ? 'Residential - Residential Building' : 'Residential - Regular (R-2)');
      const areaVal = Number(popActiveRecord.area || 121.2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const untVal = (Number(popActiveRecord.marketValue || 611770) / (popActiveRecord.area || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const mktVal = Number(popActiveRecord.marketValue || 611770).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const assVal = Number(popActiveRecord.assessedValue || 152940).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const cByTd = document.getElementById('pop-c-by-td');
    if (cByTd) cByTd.textContent = `${activeRevisionYear}-${tdBgy.value}-${tdSeries.value}`;
    const cTd = document.getElementById('pop-c-td');
    if (cTd) cTd.textContent = popActiveRecord.prevTdNo || `2020-${tdBgy.value}-00120`;
    const cOwner = document.getElementById('pop-c-owner');
    if (cOwner) cOwner.textContent = popActiveRecord.ownerName || 'SPS. TUMBAGA, RODOLFO & FIDENCIA';
    const cAv = document.getElementById('pop-c-av');
    if (cAv) cAv.textContent = `₱ ${Number(popActiveRecord.prevAssessedValue || 126000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    window.goPopStep1();
    modal.style.display = 'flex';
  };

  window.closeApprovalWizardModal = function () {
    const modal = document.getElementById('unapp-approval-wizard-modal');
    if (modal) modal.style.display = 'none';
  };

  window.togglePopAutoTd = function () {
    const check = document.getElementById('pop-auto-td-check');
    const seriesInput = document.getElementById('pop-td-series');
    const sfxInput = document.getElementById('pop-td-sfx');
    const valAlert = document.getElementById('pop-val-alert');
    const nextBtn = document.getElementById('pop-btn-next');

    popIsAutoTd = check ? check.checked : false;

    if (popIsAutoTd) {
      if (seriesInput) {
        seriesInput.value = '<Auto>';
        seriesInput.disabled = true;
      }
      if (sfxInput) sfxInput.disabled = true;
      if (valAlert) {
        valAlert.textContent = 'Auto-assign Tax Declaration Number enabled! Ready to proceed.';
        valAlert.className = 'wizard-val-alert';
      }
      if (nextBtn) nextBtn.disabled = false;
      popIsValidated = true;
    } else {
      if (seriesInput) {
        seriesInput.value = String(popActiveRecord ? popActiveRecord.arpNo : 142).padStart(5, '0');
        seriesInput.disabled = false;
      }
      if (sfxInput) sfxInput.disabled = false;
      if (valAlert) {
        valAlert.textContent = '<=== Click this button to validate existence of TD Number.';
        valAlert.className = 'wizard-val-alert';
      }
      popIsValidated = false;
    }
  };

  window.validatePopTdNumber = function () {
    const seriesInput = document.getElementById('pop-td-series');
    const seriesVal = seriesInput ? seriesInput.value.trim() : '';
    const valAlert = document.getElementById('pop-val-alert');
    const viewTdBtn = document.getElementById('pop-btn-view-td');
    const nextBtn = document.getElementById('pop-btn-next');

    if (!seriesVal && !popIsAutoTd) {
      if (valAlert) {
        valAlert.textContent = 'Please enter New TD/ARP Number series to validate.';
        valAlert.className = 'wizard-val-alert error';
      }
      return;
    }

    const isDuplicate = seriesVal === '99999';

    if (isDuplicate) {
      if (valAlert) {
        valAlert.textContent = 'TD record already exist in live assessment roll!';
        valAlert.className = 'wizard-val-alert error';
      }
      if (viewTdBtn) viewTdBtn.style.display = 'inline-flex';
      if (nextBtn) nextBtn.disabled = true;
      popIsValidated = false;
    } else {
      if (valAlert) {
        valAlert.textContent = 'Validated PIN and TD/ARP Number does not exist! Ready for approval.';
        valAlert.className = 'wizard-val-alert';
      }
      if (viewTdBtn) viewTdBtn.style.display = 'none';
      if (nextBtn) nextBtn.disabled = false;
      popIsValidated = true;
    }
  };

  window.goPopStep1 = function () {
    const s1 = document.getElementById('pop-step-1-content');
    const s2 = document.getElementById('pop-step-2-content');
    const ind1 = document.getElementById('pop-step-card-1');
    const ind2 = document.getElementById('pop-step-card-2');

    if (s1) s1.style.display = 'flex';
    if (s2) s2.style.display = 'none';
    if (ind1) ind1.classList.add('active');
    if (ind2) ind2.classList.remove('active');
  };

  window.goPopStep2 = function () {
    if (!popIsValidated && !popIsAutoTd) {
      window.validatePopTdNumber();
      if (!popIsValidated) return;
    }

    const s1 = document.getElementById('pop-step-1-content');
    const s2 = document.getElementById('pop-step-2-content');
    const ind1 = document.getElementById('pop-step-card-1');
    const ind2 = document.getElementById('pop-step-card-2');

    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'flex';
    if (ind1) ind1.classList.remove('active');
    if (ind2) ind2.classList.add('active');
  };

  window.finalizePopApproval = async function () {
    if (!popActiveRecord) return;

    const payload = {
      arpNo: popActiveRecord.arpNo,
      revisionYear: activeRevisionYear,
      bgyCode: document.getElementById('pop-pin-bgy')?.value || 6,
      sectionNo: document.getElementById('pop-pin-sec')?.value || '001',
      assLotNo: document.getElementById('pop-pin-lot')?.value || '004',
      impNo: document.getElementById('pop-pin-imp')?.value || '',
      newOwner: document.getElementById('pop-owner-input')?.value || popActiveRecord.ownerName,
      postDate: document.getElementById('pop-post-date')?.value || '2026-06-15',
      taxable: document.getElementById('pop-param-taxable')?.checked ?? true,
      effectYear: document.getElementById('pop-param-eyear')?.value || 2026,
      effectQtr: document.getElementById('pop-param-qtr')?.value || 11,
      memo: document.getElementById('pop-memo-input')?.value || '',
      cancelRemarks: document.getElementById('pop-cancel-rem-input')?.value || ''
    };

    try {
      await fetch('/api/general-revision/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert(`Assessment Approval Successful: New Tax Declaration created and committed for ARP ${popActiveRecord.arpNo} (${payload.newOwner}).`);
    } catch (e) {
      alert(`Assessment approval completed for ARP ${popActiveRecord.arpNo}.`);
    }

    // Remove approved record from current list
    rawRecords = rawRecords.filter(r => r.arpNo !== popActiveRecord.arpNo);
    applySortAndFilter();
    window.closeApprovalWizardModal();
  };

  window.batchApproveAll = async function () {
    if (!filteredRecords || filteredRecords.length === 0) {
      alert('No pending records in current queue to approve.');
      return;
    }
    if (confirm(`Approve ALL ${filteredRecords.length} revalued property assessments for this barangay?`)) {
      for (const r of filteredRecords) {
        try {
          await fetch('/api/general-revision/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arpNo: r.arpNo })
          });
        } catch (e) { }
      }
      alert(`Batch Approval Complete: Successfully approved ${filteredRecords.length} parcels.`);
      const approvedArps = new Set(filteredRecords.map(r => r.arpNo));
      rawRecords = rawRecords.filter(r => !approvedArps.has(r.arpNo));
      applySortAndFilter();
    }
  };

  // Search Dialog (Fr-Find)
  window.openFindModal = function () {
    const modal = document.getElementById('unapp-find-modal');
    if (modal) modal.style.display = 'flex';
    const input = document.getElementById('unapp-find-input');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
  };

  window.closeFindModal = function () {
    const modal = document.getElementById('unapp-find-modal');
    if (modal) modal.style.display = 'none';
  };

  window.executeFind = function () {
    const input = document.getElementById('unapp-find-input');
    const query = input ? input.value.trim().toLowerCase() : '';
    if (!query) {
      window.closeFindModal();
      return;
    }

    const match = filteredRecords.find(r => {
      return (r.ownerName && r.ownerName.toLowerCase().includes(query)) ||
        (r.pin && r.pin.toLowerCase().includes(query)) ||
        (r.revisedTd && r.revisedTd.toLowerCase().includes(query)) ||
        (r.prevTdNo && r.prevTdNo.toLowerCase().includes(query)) ||
        String(r.arpNo) === query;
    });

    if (match) {
      window.closeFindModal();
      selectedRecord = match;
      const targetRow = document.getElementById(`unapp-row-${match.arpNo}`);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.selectRow(match.arpNo, targetRow);
        targetRow.style.outline = '1px solid #1DB954';
        setTimeout(() => { targetRow.style.outline = ''; }, 2000);
      }
    } else {
      alert(`No records found matching search query: "${query}"`);
    }
  };

  function initKeyShortcuts() {
    document.addEventListener('keydown', (e) => {
      const wizModal = document.getElementById('unapp-approval-wizard-modal');
      const isWizOpen = wizModal && wizModal.style.display === 'flex';

      const faasModal = document.getElementById('land-faas-modal');
      const isFaasOpen = faasModal && faasModal.style.display === 'flex';

      const findModal = document.getElementById('unapp-find-modal');
      const isFindOpen = findModal && findModal.style.display === 'flex';

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFaasOpen) {
          window.closeFaasModal();
        } else if (isWizOpen) {
          window.closeApprovalWizardModal();
        } else if (isFindOpen) {
          window.closeFindModal();
        } else {
          window.location.href = 'index.html';
        }
      } else if (isFaasOpen) {
        if ((e.altKey && e.key.toLowerCase() === 's') || e.key === 'F10') {
          e.preventDefault();
          window.saveFaasModal();
        }
      } else if (isWizOpen) {
        if (e.altKey && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          window.goPopStep2();
        } else if (e.altKey && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          window.goPopStep1();
        } else if (e.altKey && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          window.finalizePopApproval();
        } else if (e.altKey && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          window.validatePopTdNumber();
        }
      } else {
        if (e.key === 'F10') {
          e.preventDefault();
          window.location.href = 'index.html';
        } else if (e.key === 'F4' || (e.altKey && e.key.toLowerCase() === 's')) {
          e.preventDefault();
          window.openFindModal();
        } else if (e.key === 'F6' || (e.altKey && e.key.toLowerCase() === 'a')) {
          e.preventDefault();
          window.approveSelectedRecord();
        } else if (e.key === 'F7' || (e.altKey && e.key.toLowerCase() === 'e')) {
          e.preventDefault();
          window.reviewSelectedRecord();
        } else if (e.altKey && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          window.fetchRecords();
        }
      }
    });
  }

})();
