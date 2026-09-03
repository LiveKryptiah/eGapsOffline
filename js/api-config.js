/**
 * eRPAS Office Database Bridge & Offline Auto-Sync Engine
 * Features:
 * 1. Zero-Link Auto-Pairing: Simply enter passkey (33Land25PA0) to connect to office database!
 * 2. Store-and-Forward Offline Outbox: saves edits locally on phone/laptop when offline.
 * 3. Automatic Two-Way Background Sync: synchronizes all queued records as soon as tunnel is active.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'rpas_api_endpoint';
  const PASSKEY_KEY = 'rpas_passkey';
  const QUEUE_KEY = 'rpas_offline_queue';
  const DEFAULT_PASSKEY = '33Land25PA0';

  window.getApiBaseUrl = function () {
    const saved = localStorage.getItem(STORAGE_KEY) || '';
    return saved.trim().replace(/\/+$/, '');
  };

  window.setApiBaseUrl = function (url) {
    if (!url) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    }
    updateBridgeStatus();
    if (url) {
      triggerBackgroundSync();
    }
  };

  // --- Auto-Resolve Tunnel URL from Passkey ---
  async function resolveTopicFromPasskey(passkey) {
    // Fast path for default passkey
    if (passkey.trim() === DEFAULT_PASSKEY) {
      return 'egaps-relay-126fde1eaef1707c';
    }
    try {
      const msgUint8 = new TextEncoder().encode(passkey.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
      return 'egaps-relay-' + hashHex;
    } catch (e) {
      return 'egaps-relay-126fde1eaef1707c';
    }
  }

  window.resolveTunnelUrl = async function (passkey) {
    const key = passkey.trim();
    // If user entered an actual http/https URL directly, support it
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key.replace(/\/+$/, '');
    }

    const topic = await resolveTopicFromPasskey(key);
    const res = await originalFetch(`https://ntfy.sh/${topic}/json?poll=1`, { method: 'GET' });
    if (!res.ok) throw new Error('Relay server error');
    
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    let latestUrl = '';

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.event === 'message' && data.message && data.message.startsWith('http')) {
          latestUrl = data.message.trim();
        }
      } catch (e) { }
    }

    if (!latestUrl) {
      throw new Error(`No active tunnel found for passkey "${key}". Make sure start_tunnel.bat is running on your office PC.`);
    }

    return latestUrl.replace(/\/+$/, '');
  };

  // --- Offline Outbox Management ---
  window.getOfflineQueue = function () {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  };

  function saveOfflineQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    updateBridgeStatus();
    renderQueueList();
  }

  function enqueueAction(url, method, body) {
    const queue = window.getOfflineQueue();
    let desc = `Record Update (${url})`;
    if (url.includes('save')) {
      const name = body.ownerName || (body.arpNo ? `ARP ${body.arpNo}` : 'Property');
      desc = `Save Property [${name}]`;
    } else if (url.includes('approve')) {
      desc = `Approve Assessment [ARP ${body.arpNo || 'New'}]`;
    } else if (url.includes('delete')) {
      desc = `Delete Assessment [ARP ${body.arpNo || ''}]`;
    } else if (url.includes('transfer')) {
      desc = `Transfer Property [ARP ${body.arpNo || ''}]`;
    }

    const item = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      url: url,
      method: method || 'POST',
      body: body,
      desc: desc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    queue.push(item);
    saveOfflineQueue(queue);
    showNotification('Saved to Local Device (Offline)', `${desc} queued. Will auto-sync when office tunnel starts.`, '#d97706');
  }

  window.clearOfflineQueue = function () {
    saveOfflineQueue([]);
  };

  // --- Global Fetch Interceptor ---
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    let url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    const apiBase = window.getApiBaseUrl();
    const method = (init && init.method ? init.method : (input && input.method ? input.method : 'GET')).toUpperCase();

    let fullUrl = url;
    if (url.startsWith('/api/') || url.startsWith('api/')) {
      const cleanPath = url.startsWith('/') ? url : '/' + url;
      fullUrl = (apiBase ? apiBase : '') + cleanPath;
      if (typeof input === 'string') {
        input = fullUrl;
      } else {
        input = new Request(fullUrl, input);
      }
    }

    // Intercept data-modifying POST requests
    const isSaveAction = method === 'POST' && (url.startsWith('/api/') || url.startsWith('api/')) && !url.includes('/api/status') && !url.includes('/api/login');

    if (isSaveAction) {
      try {
        const response = await originalFetch.call(this, input, init);
        if (response.ok) {
          if (window.getOfflineQueue().length > 0) {
            setTimeout(triggerBackgroundSync, 1000);
          }
          return response;
        } else if (response.status >= 500 && response.status <= 504) {
          throw new Error(`Server Unreachable (${response.status})`);
        }
        return response;
      } catch (err) {
        let bodyData = {};
        try {
          if (init && init.body) {
            bodyData = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          }
        } catch (e) { }

        enqueueAction(url, method, bodyData);

        return new Response(JSON.stringify({
          status: 'success',
          offline_queued: true,
          message: 'Saved to local device (queued for auto-sync).'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return originalFetch.call(this, input, init);
  };

  // --- Auto-Sync Engine ---
  let isSyncing = false;
  window.triggerBackgroundSync = async function () {
    if (isSyncing) return { success: false, message: 'Sync already in progress.' };
    const queue = window.getOfflineQueue();
    if (queue.length === 0) return { success: true, count: 0 };

    const test = await window.testApiConnection();
    if (!test.success) return { success: false, message: 'Office database tunnel is offline.' };

    isSyncing = true;
    updateBridgeStatus(true);

    let successCount = 0;
    const remaining = [];
    const apiBase = window.getApiBaseUrl();

    for (const item of queue) {
      try {
        const cleanPath = item.url.startsWith('/') ? item.url : '/' + item.url;
        const targetUrl = (apiBase ? apiBase : '') + cleanPath;
        const res = await originalFetch(targetUrl, {
          method: item.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body || {})
        });
        if (res.ok) {
          successCount++;
        } else {
          remaining.push(item);
        }
      } catch (e) {
        remaining.push(item);
      }
    }

    saveOfflineQueue(remaining);
    isSyncing = false;
    updateBridgeStatus();

    if (successCount > 0) {
      showNotification('Office Database Synced!', `Successfully committed ${successCount} offline change(s) to OpenEdge database.`, '#059669');
    }

    return { success: true, count: successCount, remaining: remaining.length };
  };

  // Auto reconnect and sync every 15 seconds
  setInterval(async () => {
    // If cloud-hosted, try to auto-refresh tunnel URL using saved passkey if currently offline
    const savedPasskey = localStorage.getItem(PASSKEY_KEY) || DEFAULT_PASSKEY;
    if (isCloudHosted() && savedPasskey) {
      const test = await window.testApiConnection();
      if (!test.success) {
        try {
          const freshUrl = await window.resolveTunnelUrl(savedPasskey);
          if (freshUrl && freshUrl !== window.getApiBaseUrl()) {
            window.setApiBaseUrl(freshUrl);
          }
        } catch (e) { }
      }
    }

    if (window.getOfflineQueue().length > 0) {
      window.triggerBackgroundSync();
    }
  }, 15000);

  // Check connection to server
  window.testApiConnection = async function (testUrl) {
    const base = (testUrl || window.getApiBaseUrl()).trim().replace(/\/+$/, '');
    const target = (base ? base : '') + '/api/status';
    try {
      const res = await originalFetch(target, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        return { success: true, data: data };
      }
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  function isCloudHosted() {
    const host = window.location.hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.') && !host.startsWith('10.');
  }

  function updateBridgeStatus(syncInProgress) {
    const badge = document.getElementById('rpas-bridge-badge');
    const text = document.getElementById('rpas-bridge-status-text');
    if (!badge || !text) return;

    const queueCount = window.getOfflineQueue().length;
    const currentBase = window.getApiBaseUrl();

    if (syncInProgress) {
      badge.style.borderColor = '#38bdf8';
      badge.style.background = '#0c4a6e';
      badge.style.color = '#7dd3fc';
      text.textContent = `Syncing ${queueCount} record(s)...`;
    } else if (queueCount > 0) {
      badge.style.borderColor = '#f59e0b';
      badge.style.background = '#78350f';
      badge.style.color = '#fef08a';
      text.textContent = `DB Bridge: ${queueCount} Queued to Sync`;
    } else if (currentBase) {
      badge.style.borderColor = '#10b981';
      badge.style.background = '#064e3b';
      badge.style.color = '#34d399';
      text.textContent = 'DB Bridge: Linked (33Land25PA0)';
    } else if (isCloudHosted()) {
      badge.style.borderColor = '#f59e0b';
      badge.style.background = '#78350f';
      badge.style.color = '#fde68a';
      text.textContent = 'DB Bridge: Enter Passkey';
    } else {
      badge.style.borderColor = '#0284c7';
      badge.style.background = '#082f49';
      badge.style.color = '#7dd3fc';
      text.textContent = 'DB Bridge: Local (Office LAN)';
    }
  }

  function showNotification(title, message, color) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 100001;
      background: #111827;
      border: 1px solid ${color || '#059669'};
      border-left: 5px solid ${color || '#059669'};
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      font-family: 'DM Sans', -apple-system, sans-serif;
      font-size: 12px;
      max-width: 320px;
      line-height: 1.4;
      animation: fadeIn 0.3s ease;
    `;
    toast.innerHTML = `
      <div style="font-weight: 700; font-size: 13px; color: ${color || '#10b981'}; margin-bottom: 2px;">${title}</div>
      <div style="color: #d1d5db;">${message}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  function renderQueueList() {
    const listEl = document.getElementById('rpas-bridge-queue-list');
    const countEl = document.getElementById('rpas-bridge-queue-count');
    if (!listEl) return;

    const queue = window.getOfflineQueue();
    if (countEl) countEl.textContent = queue.length;

    if (queue.length === 0) {
      listEl.innerHTML = `<div style="color: #9ca3af; font-size: 11px; text-align: center; padding: 12px; font-style: italic;">No pending offline edits. All records are in sync.</div>`;
      return;
    }

    listEl.innerHTML = queue.map((item) => `
      <div style="padding: 8px 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <div>
          <strong style="color: #fde68a;">${item.desc}</strong>
          <div style="font-size: 10px; color: #94a3b8;">${item.timestamp} &bull; ${item.url}</div>
        </div>
        <span style="font-size: 10px; background: #78350f; color: #fde68a; padding: 2px 6px; border-radius: 4px;">Pending</span>
      </div>
    `).join('');
  }

  function injectBridgeUI() {
    if (document.getElementById('rpas-bridge-container')) return;

    const container = document.createElement('div');
    container.id = 'rpas-bridge-container';
    container.innerHTML = `
      <!-- Floating Badge -->
      <div id="rpas-bridge-badge" style="
        position: fixed;
        bottom: 14px;
        right: 14px;
        z-index: 99999;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 9999px;
        font-family: 'DM Sans', -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        border: 1px solid #374151;
        background: #1f2937;
        color: #e5e7eb;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        transition: all 0.2s ease;
      " title="Click to view Database Bridge & Passkey Setting">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:currentColor;"></span>
        <span id="rpas-bridge-status-text">Database Bridge</span>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      </div>

      <!-- Modal Dialog -->
      <div id="rpas-bridge-modal" style="
        display: none;
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        align-items: center;
        justify-content: center;
        padding: 16px;
        font-family: 'DM Sans', -apple-system, sans-serif;
      ">
        <div style="
          background: #111827;
          border: 1px solid #374151;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          color: #f9fafb;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        ">
          <!-- Header -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #1f2937; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #064e3b; color: #10b981; display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">Office DB Passkey Connect</h3>
                <span style="font-size: 11px; color: #9ca3af;">Connect automatically using password &bull; No link copying!</span>
              </div>
            </div>
            <button id="rpas-bridge-close" style="background: none; border: none; color: #9ca3af; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
          </div>

          <!-- Body Scroll -->
          <div style="padding: 20px; overflow-y: auto;">
            <!-- Passkey Section -->
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 6px;">
              Enter Office Passkey:
            </label>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <input type="text" id="rpas-bridge-passkey-input" placeholder="${DEFAULT_PASSKEY}" value="${DEFAULT_PASSKEY}" style="
                flex: 1;
                padding: 10px 12px;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 6px;
                color: #ffffff;
                font-family: 'JetBrains Mono', monospace;
                font-weight: 700;
                font-size: 14px;
                outline: none;
                letter-spacing: 0.05em;
              ">
              <button id="rpas-bridge-save" style="
                padding: 10px 18px;
                border-radius: 6px;
                border: none;
                background: #059669;
                color: #ffffff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
              ">Connect</button>
            </div>

            <!-- Result Box -->
            <div id="rpas-bridge-test-result" style="display: none; padding: 10px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 14px; line-height: 1.4;"></div>

            <!-- Offline Outbox Section -->
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #1f2937;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af;">
                  Offline Outbox (<span id="rpas-bridge-queue-count" style="color: #fde68a;">0</span> pending)
                </label>
                <div style="display: flex; gap: 6px;">
                  <button id="rpas-bridge-manual-sync" style="
                    background: #1e3a8a;
                    border: 1px solid #2563eb;
                    color: #bfdbfe;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 3px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                  ">Sync Now</button>
                  <button id="rpas-bridge-clear-queue" style="
                    background: transparent;
                    border: 1px solid #4b5563;
                    color: #9ca3af;
                    font-size: 11px;
                    padding: 3px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                  ">Clear</button>
                </div>
              </div>
              <div id="rpas-bridge-queue-list" style="max-height: 120px; overflow-y: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px;"></div>
            </div>

            <!-- Quick Info -->
            <div style="margin-top: 14px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
              <strong style="color: #38bdf8;">How to Connect:</strong><br>
              1. On your office PC, double-click <code style="color:#e2e8f0;">start_tunnel.bat</code>.<br>
              2. On your phone/laptop, just enter passkey <strong style="color:#a7f3d0;">${DEFAULT_PASSKEY}</strong> and click Connect.<br>
              3. You never have to copy or send random links!
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const badge = document.getElementById('rpas-bridge-badge');
    const modal = document.getElementById('rpas-bridge-modal');
    const closeBtn = document.getElementById('rpas-bridge-close');
    const passkeyInput = document.getElementById('rpas-bridge-passkey-input');
    const saveBtn = document.getElementById('rpas-bridge-save');
    const manualSyncBtn = document.getElementById('rpas-bridge-manual-sync');
    const clearQueueBtn = document.getElementById('rpas-bridge-clear-queue');
    const resultBox = document.getElementById('rpas-bridge-test-result');

    const savedKey = localStorage.getItem(PASSKEY_KEY) || DEFAULT_PASSKEY;
    passkeyInput.value = savedKey;

    badge.addEventListener('click', () => {
      passkeyInput.value = localStorage.getItem(PASSKEY_KEY) || DEFAULT_PASSKEY;
      resultBox.style.display = 'none';
      renderQueueList();
      modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    manualSyncBtn.addEventListener('click', async () => {
      manualSyncBtn.disabled = true;
      manualSyncBtn.textContent = 'Syncing...';
      const res = await window.triggerBackgroundSync();
      manualSyncBtn.disabled = false;
      manualSyncBtn.textContent = 'Sync Now';
      renderQueueList();

      resultBox.style.display = 'block';
      if (res.success) {
        resultBox.style.background = '#064e3b';
        resultBox.style.color = '#a7f3d0';
        resultBox.textContent = `✓ Synced ${res.count || 0} record(s) to office database.`;
      } else {
        resultBox.style.background = '#7f1d1d';
        resultBox.style.color = '#fecaca';
        resultBox.textContent = `✗ Sync failed: ${res.message}`;
      }
    });

    clearQueueBtn.addEventListener('click', () => {
      if (confirm('Clear all pending offline records without syncing?')) {
        window.clearOfflineQueue();
      }
    });

    saveBtn.addEventListener('click', async () => {
      const passkey = passkeyInput.value.trim();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Connecting...';
      resultBox.style.display = 'none';

      if (!passkey) {
        window.setApiBaseUrl('');
        localStorage.removeItem(PASSKEY_KEY);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Connect';
        modal.style.display = 'none';
        return;
      }

      try {
        resultBox.style.display = 'block';
        resultBox.style.background = '#1e293b';
        resultBox.style.color = '#93c5fd';
        resultBox.textContent = `Looking up office computer for passkey "${passkey}"...`;

        const resolvedUrl = await window.resolveTunnelUrl(passkey);
        const testRes = await window.testApiConnection(resolvedUrl);

        saveBtn.disabled = false;
        saveBtn.textContent = 'Connect';

        if (testRes.success) {
          localStorage.setItem(PASSKEY_KEY, passkey);
          window.setApiBaseUrl(resolvedUrl);
          resultBox.style.background = '#064e3b';
          resultBox.style.color = '#a7f3d0';
          resultBox.innerHTML = `✓ <strong>Connected!</strong> Paired with office OpenEdge database (192.168.4.1).`;
          setTimeout(() => { modal.style.display = 'none'; }, 1000);
        } else {
          resultBox.style.background = '#7f1d1d';
          resultBox.style.color = '#fecaca';
          resultBox.innerHTML = `✗ <strong>Connection Failed:</strong> ${testRes.error}`;
        }
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Connect';
        resultBox.style.display = 'block';
        resultBox.style.background = '#7f1d1d';
        resultBox.style.color = '#fecaca';
        resultBox.innerHTML = `✗ <strong>Could Not Connect:</strong> ${err.message}`;
      }
    });

    // Auto-connect on page load if cloud-hosted and passkey is present
    if (isCloudHosted() && savedKey && !window.getApiBaseUrl()) {
      window.resolveTunnelUrl(savedKey).then(url => {
        if (url) window.setApiBaseUrl(url);
      }).catch(() => { });
    }

    updateBridgeStatus();
    renderQueueList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBridgeUI);
  } else {
    injectBridgeUI();
  }
})();
