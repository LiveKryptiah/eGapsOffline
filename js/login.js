/* ==========================================================================
   eRPAS Module 1 - Dedicated Login Controller (login.js)
   Matches Progress 4GL: C:\eGaps\Isabela\Security\eLogin.p & egaps.i
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  let loginTries = 0;
  let globalStaffList = [];

  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-password');
  const displayUser = document.getElementById('display-username-val');
  const displayErr = document.getElementById('display-errpass-val');
  const localitySelect = document.getElementById('login-locality');
  const revSelect = document.getElementById('login-rev-year');
  const form = document.getElementById('login-form');
  const cancelBtn = document.getElementById('btn-login-cancel');
  const submitBtn = document.getElementById('btn-login-submit');

  // 1. Check if user is already logged in
  try {
    const existingSession = sessionStorage.getItem('erpas_user');
    if (existingSession) {
      const parsed = JSON.parse(existingSession);
      if (parsed && parsed.status === 'success') {
        // Already authenticated, proceed to app
        window.location.href = 'index.html';
        return;
      }
    }
  } catch (e) {
    sessionStorage.removeItem('erpas_user');
  }

  // 2. Load Real Staff Directory from OpenEdge globaldb
  loadStaffDirectory();

  async function loadStaffDirectory() {
    try {
      const res = await fetch('/api/users/list');
      if (res.ok) {
        globalStaffList = await res.json();
        const datalist = document.getElementById('staff-users-datalist');
        if (datalist && globalStaffList.length > 0) {
          datalist.innerHTML = globalStaffList.map(u => 
            `<option value="${u.userName}">${u.position ? u.position : 'Staff'}${u.office ? ' - ' + u.office : ''}</option>`
          ).join('');
        }
      }
    } catch (e) {
      console.warn('Could not load staff directory from OpenEdge:', e);
    }
  }

  // 3. User ID Live Check (eLogin.p: ON ENTER/LEAVE OF vUserID)
  async function checkUserOnBlur() {
    if (!userInput || !displayUser) return;
    const val = userInput.value.trim();
    if (!val) {
      displayUser.textContent = '';
      displayUser.classList.remove('invalid');
      return;
    }

    try {
      const res = await fetch('/api/login/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: val })
      });
      const data = await res.json();
      if (data.found && data.userName) {
        displayUser.textContent = data.userName;
        displayUser.classList.remove('invalid');
      } else {
        displayUser.textContent = '*** Invalid User ID ***';
        displayUser.classList.add('invalid');
      }
    } catch (e) {
      console.warn('Error checking user:', e);
    }
  }

  if (userInput) {
    userInput.addEventListener('blur', () => {
      checkUserOnBlur();
    });

    userInput.addEventListener('input', () => {
      if (displayUser) {
        displayUser.textContent = '';
        displayUser.classList.remove('invalid');
      }
    });

    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkUserOnBlur();
        if (passInput) passInput.focus();
      }
    });
  }

  if (passInput) {
    passInput.addEventListener('input', () => {
      if (displayErr) displayErr.textContent = '';
    });
  }

  // Password Visibility Toggle
  const togglePwdBtn = document.getElementById('btn-toggle-pwd');
  if (togglePwdBtn && passInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isPwd = passInput.type === 'password';
      passInput.type = isPwd ? 'text' : 'password';
      togglePwdBtn.innerHTML = isPwd 
        ? `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>`
        : `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;
    });
  }

  // 4. Cancel Action (eLogin.p: ON CHOOSE OF butCancel)
  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleCancel);
  }

  function handleCancel() {
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    if (displayUser) {
      displayUser.textContent = '';
      displayUser.classList.remove('invalid');
    }
    if (displayErr) {
      displayErr.textContent = '';
    }
    loginTries = 0;
    if (userInput) userInput.focus();
  }

  // 5. Submit Action (eLogin.p: ON ENTER OF showPwd / egaps.i)
  if (form) {
    form.addEventListener('submit', handleLogin);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const userVal = userInput ? userInput.value.trim() : '';
    const passVal = passInput ? passInput.value.trim() : '';
    const localityCodeVal = localitySelect ? parseInt(localitySelect.value) : 22;
    const revYearVal = revSelect ? revSelect.value : '2024';

    if (!userVal) {
      if (displayUser) {
        displayUser.textContent = '*** Invalid User ID ***';
        displayUser.classList.add('invalid');
      }
      if (userInput) userInput.focus();
      return;
    }

    submitBtn.innerHTML = '<span>Authenticating with Central globaldb...</span>';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: userVal, 
          password: passVal, 
          localityCode: localityCodeVal,
          revisionYear: revYearVal 
        })
      });

      const authData = await res.json();

      if (res.ok && authData.status === 'success') {
        loginTries = 0;
        // Save session to sessionStorage for the application shell
        sessionStorage.setItem('erpas_user', JSON.stringify(authData));
        
        // Seamless redirect to authenticated eRPAS dashboard
        window.location.href = 'index.html';
      } else if (authData.status === 'invalid_user') {
        if (displayUser) {
          displayUser.textContent = '*** Invalid User ID ***';
          displayUser.classList.add('invalid');
        }
        if (userInput) userInput.focus();
      } else if (authData.status === 'invalid_password') {
        loginTries++;
        if (displayErr) {
          displayErr.textContent = 'Invalid Password keyed-in!!!';
        }
        if (loginTries > 2) {
          alert('Sorry, you failed to log-in.');
          handleCancel();
        } else {
          if (passInput) {
            passInput.value = '';
            passInput.focus();
          }
        }
      } else {
        alert(authData.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      alert(`Network/Server error: ${err.message}`);
    } finally {
      submitBtn.innerHTML = '<span>Sign In to e-GAPS / eRPAS</span><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>';
      submitBtn.disabled = false;
    }
  }
});
