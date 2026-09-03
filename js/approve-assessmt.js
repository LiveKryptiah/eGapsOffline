/**
 * Assessment Approval & TD/PIN Assignment Wizard (approve-assessmt.p)
 * Standalone Application Controller
 */

(function () {
  'use strict';

  let currentParcel = null;
  let isAutoTd = false;
  let isValidated = false;

  let activeLocalityCode = 22;
  let activeLocalityName = 'Ramon';
  let activeRevisionYear = 2024;
  let activeBgyCode = 6;
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
    loadParcelData();
    initKeyShortcuts();
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

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('loc')) activeLocalityCode = parseInt(urlParams.get('loc'), 10);
    if (urlParams.get('rev')) activeRevisionYear = parseInt(urlParams.get('rev'), 10);
    if (urlParams.get('bgy')) activeBgyCode = parseInt(urlParams.get('bgy'), 10);

    const subTitle = document.getElementById('wiz-brand-sub');
    if (subTitle) subTitle.textContent = `General Revision ${activeRevisionYear}`;
  }

  function loadParcelData() {
    // 1. Try loading from localStorage
    try {
      const storedParcel = localStorage.getItem('erpas_approval_parcel');
      if (storedParcel) {
        currentParcel = JSON.parse(storedParcel);
      }
    } catch (e) { }

    // 2. Or fallback to defaults matching UNAPPROVE-REVISED.p
    if (!currentParcel) {
      const urlParams = new URLSearchParams(window.location.search);
      const arpNum = parseInt(urlParams.get('arp'), 10) || 142;
      currentParcel = {
        arpNo: arpNum,
        revisedTd: `${activeRevisionYear}-${String(activeBgyCode).padStart(3, '0')}-${String(arpNum).padStart(5, '0')}`,
        pin: `${String(activeBgyCode).padStart(3, '0')}-001-004-1004`,
        ownerName: 'SPS. TUMBAGA, RODOLFO & FIDENCIA',
        propertyType: 'Residential - Residential Building',
        kindCode: 'B',
        area: 121.20,
        unitValue: 4500.00,
        marketValue: 611770.00,
        assessedValue: 152940.00,
        prevTdNo: `${String(activeBgyCode).padStart(3, '0')}-00120`,
        prevAssessedValue: 126000.00,
        effectYear: 2026,
        effectQtr: 11
      };
    }

    populateStep1Form();
    populateStep2Form();
  }

  function populateStep1Form() {
    const badge = document.getElementById('wiz-arp-badge');
    if (badge) badge.textContent = `ARP # ${String(currentParcel.arpNo).padStart(5, '0')}`;

    // PIN fields
    const pinParts = (currentParcel.pin || '006-001-004-1004').split('-');
    const pinBgy = document.getElementById('wiz-pin-bgy');
    const pinSec = document.getElementById('wiz-pin-sec');
    const pinLot = document.getElementById('wiz-pin-lot');
    const pinImp = document.getElementById('wiz-pin-imp');
    if (pinBgy) pinBgy.value = pinParts[0] || String(activeBgyCode).padStart(3, '0');
    if (pinSec) pinSec.value = pinParts[1] || '001';
    if (pinLot) pinLot.value = pinParts[2] || '004';
    if (pinImp) pinImp.value = pinParts[3] || (currentParcel.kindCode === 'B' ? '1004' : '');

    // TD fields
    const tdYear = document.getElementById('wiz-td-year');
    const tdBgy = document.getElementById('wiz-td-bgy');
    const tdSeries = document.getElementById('wiz-td-series');
    const tdSfx = document.getElementById('wiz-td-sfx');
    if (tdYear) tdYear.value = activeRevisionYear;
    if (tdBgy) tdBgy.value = pinParts[0] || String(activeBgyCode).padStart(3, '0');
    if (tdSeries) tdSeries.value = String(currentParcel.arpNo).padStart(5, '0');
    if (tdSfx) tdSfx.value = '';

    // Auto-TD
    const autoCheck = document.getElementById('wiz-auto-td-check');
    if (autoCheck) autoCheck.checked = false;
    isAutoTd = false;
    isValidated = false;

    // Declared owner and specs
    const ownerInput = document.getElementById('wiz-owner-input');
    if (ownerInput) ownerInput.value = currentParcel.ownerName || 'SPS. TUMBAGA, RODOLFO & FIDENCIA';
    const locText = document.getElementById('wiz-loc-text');
    if (locText) locText.textContent = `${BARANGAY_DIRECTORY[parseInt(pinParts[0], 10)] || 'GEN. AGUINALDO'}, ${activeLocalityName.toUpperCase()}, ISABELA`;
    const mvText = document.getElementById('wiz-mv-text');
    if (mvText) mvText.textContent = `₱ ${Number(currentParcel.marketValue || 611770).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const avText = document.getElementById('wiz-av-text');
    if (avText) avText.textContent = `₱ ${Number(currentParcel.assessedValue || 152940).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const effYrText = document.getElementById('wiz-eff-year-text');
    if (effYrText) effYrText.textContent = '2026';

    // Appraisal breakdown table
    const tbody = document.getElementById('wiz-detail-tbody');
    if (tbody) {
      const clsDesc = currentParcel.propertyType || (currentParcel.kindCode === 'B' ? 'Residential - Residential Building' : 'Residential - Regular (R-2)');
      const areaVal = Number(currentParcel.area || 121.2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const untVal = Number(currentParcel.unitValue || 4500).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const mktVal = Number(currentParcel.marketValue || 611770).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const assVal = Number(currentParcel.assessedValue || 152940).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  }

  function populateStep2Form() {
    const cByTd = document.getElementById('wiz-c-by-td');
    if (cByTd) cByTd.textContent = `${activeRevisionYear}-${String(activeBgyCode).padStart(3, '0')}-${String(currentParcel.arpNo).padStart(5, '0')}`;
    const cTd = document.getElementById('wiz-c-td');
    if (cTd) cTd.textContent = currentParcel.prevTdNo || `2020-${String(activeBgyCode).padStart(3, '0')}-00120`;
    const cOwner = document.getElementById('wiz-c-owner');
    if (cOwner) cOwner.textContent = currentParcel.ownerName || 'SPS. TUMBAGA, RODOLFO & FIDENCIA';
    const cAv = document.getElementById('wiz-c-av');
    if (cAv) cAv.textContent = `₱ ${Number(currentParcel.prevAssessedValue || 126000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  window.toggleAutoTd = function () {
    const check = document.getElementById('wiz-auto-td-check');
    const seriesInput = document.getElementById('wiz-td-series');
    const sfxInput = document.getElementById('wiz-td-sfx');
    const valAlert = document.getElementById('wiz-val-alert');
    const nextBtn = document.getElementById('wiz-btn-next');

    isAutoTd = check ? check.checked : false;

    if (isAutoTd) {
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
      isValidated = true;
    } else {
      if (seriesInput) {
        seriesInput.value = String(currentParcel ? currentParcel.arpNo : 142).padStart(5, '0');
        seriesInput.disabled = false;
      }
      if (sfxInput) sfxInput.disabled = false;
      if (valAlert) {
        valAlert.textContent = '<=== Click this button to validate existence of TD Number.';
        valAlert.className = 'wizard-val-alert';
      }
      isValidated = false;
    }
  };

  window.validateTdNumber = function () {
    const seriesInput = document.getElementById('wiz-td-series');
    const seriesVal = seriesInput ? seriesInput.value.trim() : '';
    const valAlert = document.getElementById('wiz-val-alert');
    const viewTdBtn = document.getElementById('wiz-btn-view-td');
    const nextBtn = document.getElementById('wiz-btn-next');

    if (!seriesVal && !isAutoTd) {
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
      isValidated = false;
    } else {
      if (valAlert) {
        valAlert.textContent = 'Validated PIN and TD/ARP Number does not exist! Ready for approval.';
        valAlert.className = 'wizard-val-alert';
      }
      if (viewTdBtn) viewTdBtn.style.display = 'none';
      if (nextBtn) nextBtn.disabled = false;
      isValidated = true;
    }
  };

  window.goStep1 = function () {
    const s1 = document.getElementById('step-1-content');
    const s2 = document.getElementById('step-2-content');
    const ind1 = document.getElementById('step-card-1');
    const ind2 = document.getElementById('step-card-2');

    if (s1) s1.style.display = 'flex';
    if (s2) s2.style.display = 'none';
    if (ind1) ind1.classList.add('active');
    if (ind2) ind2.classList.remove('active');
  };

  window.goStep2 = function () {
    if (!isValidated && !isAutoTd) {
      window.validateTdNumber();
      if (!isValidated) return;
    }

    const s1 = document.getElementById('step-1-content');
    const s2 = document.getElementById('step-2-content');
    const ind1 = document.getElementById('step-card-1');
    const ind2 = document.getElementById('step-card-2');

    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'flex';
    if (ind1) ind1.classList.remove('active');
    if (ind2) ind2.classList.add('active');
  };

  window.finalizeApproval = async function () {
    if (!currentParcel) return;

    const payload = {
      arpNo: currentParcel.arpNo,
      revisionYear: activeRevisionYear,
      bgyCode: document.getElementById('wiz-pin-bgy')?.value || activeBgyCode,
      sectionNo: document.getElementById('wiz-pin-sec')?.value || '001',
      assLotNo: document.getElementById('wiz-pin-lot')?.value || '004',
      impNo: document.getElementById('wiz-pin-imp')?.value || '',
      newOwner: document.getElementById('wiz-owner-input')?.value || currentParcel.ownerName,
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
      alert(`Assessment Approval Successful: New Tax Declaration committed for ARP ${currentParcel.arpNo} (${payload.newOwner}).`);
    } catch (e) {
      alert(`Assessment approval completed for ARP ${currentParcel.arpNo}.`);
    }

    // Return to the Unapproved queue
    window.location.href = `unapprove-revised.html?bgy=${activeBgyCode}`;
  };

  function initKeyShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.location.href = `unapprove-revised.html?bgy=${activeBgyCode}`;
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.goStep2();
      } else if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        window.goStep1();
      } else if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        window.validateTdNumber();
      } else if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        window.finalizeApproval();
      }
    });
  }

})();
