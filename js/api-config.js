/**
 * eRPAS Office Database Bridge & Offline Auto-Sync Engine
 * Features:
 * 1. Tunnel / Bridge routing between Vercel/mobile and local OpenEdge database.
 * 2. Store-and-Forward Offline Outbox: saves edits locally on phone/laptop when offline.
 * 3. Automatic Two-Way Background Sync: synchronizes all queued records as soon as the tunnel starts.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'rpas_api_endpoint';
  const QUEUE_KEY = 'rpas_offline_queue';

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
          // If server was reached and there are pending offline items, trigger background sync
          if (window.getOfflineQueue().length > 0) {
            setTimeout(triggerBackgroundSync, 1000);
          }
          return response;
        } else if (response.status >= 500 && response.status <= 504) {
          // Server or tunnel gateway down
          throw new Error(`Server Unreachable (${response.status})`);
        }
        return response;
      } catch (err) {
        // Network / Tunnel offline -> Queue locally in Outbox!
        let bodyData = {};
        try {
          if (init && init.body) {
            bodyData = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          }
        } catch (e) { }

        enqueueAction(url, method, bodyData);

        // Return a mock successful response so client script completes smoothly
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

  // Poller: Check every 15 seconds if tunnel is back online and sync queued records
  setInterval(() => {
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
      text.textContent = 'DB Bridge: Linked';
    } else if (isCloudHosted()) {
      badge.style.borderColor = '#f59e0b';
      badge.style.background = '#78350f';
      badge.style.color = '#fde68a';
      text.textContent = 'DB Bridge: Setup Tunnel';
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
      " title="Click to view Database Bridge & Offline Sync Outbox">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:currentColor;"></span>
        <span id="rpas-bridge-status-text">Database Bridge</span>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
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
          max-width: 520px;
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
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">Office DB Bridge & Auto-Sync</h3>
                <span style="font-size: 11px; color: #9ca3af;">Offline store-and-forward for field inspections</span>
              </div>
            </div>
            <button id="rpas-bridge-close" style="background: none; border: none; color: #9ca3af; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
          </div>

          <!-- Body Scroll -->
          <div style="padding: 20px; overflow-y: auto;">
            <!-- Connection Section -->
            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 6px;">
              Private Tunnel URL:
            </label>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <input type="url" id="rpas-bridge-url-input" placeholder="https://xyz-tunnel.trycloudflare.com" style="
                flex: 1;
                padding: 9px 12px;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 6px;
                color: #ffffff;
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                outline: none;
              ">
              <button id="rpas-bridge-save" style="
                padding: 9px 16px;
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
            <div id="rpas-bridge-test-result" style="display: none; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 14px;"></div>

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
              <div id="rpas-bridge-queue-list" style="max-height: 140px; overflow-y: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px;">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- Quick Start Instruction -->
            <div style="margin-top: 14px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
              <strong style="color: #38bdf8;">How Offline Sync Works:</strong><br>
              1. Work in the field without internet &bull; click Save/Approve normally.<br>
              2. Records save safely into your phone/laptop's Offline Outbox.<br>
              3. When you start <code style="color:#e2e8f0;">start_tunnel.bat</code> on your office PC, everything syncs back automatically!
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const badge = document.getElementById('rpas-bridge-badge');
    const modal = document.getElementById('rpas-bridge-modal');
    const closeBtn = document.getElementById('rpas-bridge-close');
    const input = document.getElementById('rpas-bridge-url-input');
    const saveBtn = document.getElementById('rpas-bridge-save');
    const manualSyncBtn = document.getElementById('rpas-bridge-manual-sync');
    const clearQueueBtn = document.getElementById('rpas-bridge-clear-queue');
    const resultBox = document.getElementById('rpas-bridge-test-result');

    badge.addEventListener('click', () => {
      input.value = window.getApiBaseUrl();
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
      const url = input.value.trim();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Testing...';
      resultBox.style.display = 'none';

      if (!url) {
        window.setApiBaseUrl('');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Connect';
        modal.style.display = 'none';
        return;
      }

      const res = await window.testApiConnection(url);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Connect';

      if (res.success) {
        window.setApiBaseUrl(url);
        resultBox.style.display = 'block';
        resultBox.style.background = '#064e3b';
        resultBox.style.color = '#a7f3d0';
        resultBox.innerHTML = `✓ <strong>Connected!</strong> OpenEdge database is reachable.`;
        setTimeout(() => { modal.style.display = 'none'; }, 1000);
      } else {
        resultBox.style.display = 'block';
        resultBox.style.background = '#7f1d1d';
        resultBox.style.color = '#fecaca';
        resultBox.innerHTML = `✗ <strong>Connection Failed:</strong> ${res.error}`;
      }
    });

    updateBridgeStatus();
    renderQueueList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBridgeUI);
  } else {
    injectBridgeUI();
  }
})();
