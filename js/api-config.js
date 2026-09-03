/**
 * eRPAS Office Database Bridge & Remote Tunnel Configuration
 * Enables connecting cloud-hosted deployments (e.g., Vercel) directly to the
 * local office Progress OpenEdge database without uploading files to cloud storage.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'rpas_api_endpoint';

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
  };

  // Intercept window.fetch globally so ALL /api/... calls route to the bridge tunnel
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    let url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    const apiBase = window.getApiBaseUrl();

    if (apiBase && (url.startsWith('/api/') || url.startsWith('api/'))) {
      const cleanPath = url.startsWith('/') ? url : '/' + url;
      const fullUrl = apiBase + cleanPath;
      if (typeof input === 'string') {
        input = fullUrl;
      } else {
        input = new Request(fullUrl, input);
      }
    }

    return originalFetch.call(this, input, init);
  };

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

  function updateBridgeStatus() {
    const badge = document.getElementById('rpas-bridge-badge');
    const text = document.getElementById('rpas-bridge-status-text');
    if (!badge || !text) return;

    const currentBase = window.getApiBaseUrl();
    if (currentBase) {
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
        padding: 6px 12px;
        border-radius: 9999px;
        font-family: 'DM Sans', -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        border: 1px solid #374151;
        background: #1f2937;
        color: #e5e7eb;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
      " title="Click to configure Office Database Bridge (Cloudflare/ngrok)">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:currentColor; animation: pulse 2s infinite;"></span>
        <span id="rpas-bridge-status-text">Database Bridge</span>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </div>

      <!-- Modal Dialog -->
      <div id="rpas-bridge-modal" style="
        display: none;
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(0, 0, 0, 0.7);
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
                <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">Office Database Bridge</h3>
                <span style="font-size: 11px; color: #9ca3af;">Connect to local Progress DB without cloud upload</span>
              </div>
            </div>
            <button id="rpas-bridge-close" style="background: none; border: none; color: #9ca3af; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
          </div>

          <!-- Body -->
          <div style="padding: 20px;">
            <p style="font-size: 12px; line-height: 1.5; color: #d1d5db; margin-top: 0; margin-bottom: 14px;">
              To access your live <strong>192.168.4.1 OpenEdge database</strong> from this device without uploading database files to cloud storage, enter your private tunnel URL (Cloudflare Tunnel or ngrok):
            </p>

            <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 6px;">
              Private Tunnel URL:
            </label>
            <input type="url" id="rpas-bridge-url-input" placeholder="https://xyz-your-tunnel.trycloudflare.com" style="
              width: 100%;
              box-sizing: border-box;
              padding: 10px 12px;
              background: #1f2937;
              border: 1px solid #374151;
              border-radius: 6px;
              color: #ffffff;
              font-family: 'JetBrains Mono', monospace;
              font-size: 13px;
              outline: none;
              margin-bottom: 12px;
            ">

            <!-- Result Box -->
            <div id="rpas-bridge-test-result" style="display: none; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 14px;"></div>

            <!-- Instruction Box -->
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #94a3b8; line-height: 1.4; margin-bottom: 16px;">
              <strong style="color: #38bdf8;">Quick Start on Office PC:</strong><br>
              Open PowerShell on your office PC and run:<br>
              <code style="display: block; background: #0f172a; padding: 4px 8px; border-radius: 4px; color: #e2e8f0; font-family: monospace; margin-top: 4px;">cloudflared tunnel --url http://localhost:8080</code>
              Copy the resulting <span style="color: #a7f3d0;">https://...trycloudflare.com</span> link into the box above.
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button id="rpas-bridge-clear" style="
                padding: 8px 14px;
                border-radius: 6px;
                border: 1px solid #4b5563;
                background: transparent;
                color: #d1d5db;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
              ">Reset</button>

              <button id="rpas-bridge-save" style="
                padding: 8px 18px;
                border-radius: 6px;
                border: none;
                background: #059669;
                color: #ffffff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
              ">
                <span>Test & Connect</span>
              </button>
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
    const clearBtn = document.getElementById('rpas-bridge-clear');
    const resultBox = document.getElementById('rpas-bridge-test-result');

    badge.addEventListener('click', () => {
      input.value = window.getApiBaseUrl();
      resultBox.style.display = 'none';
      modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    clearBtn.addEventListener('click', () => {
      window.setApiBaseUrl('');
      input.value = '';
      resultBox.style.display = 'block';
      resultBox.style.background = '#374151';
      resultBox.style.color = '#d1d5db';
      resultBox.textContent = 'Bridge reset to default (relative paths).';
    });

    saveBtn.addEventListener('click', async () => {
      const url = input.value.trim();
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>Testing...</span>';
      resultBox.style.display = 'none';

      if (!url) {
        window.setApiBaseUrl('');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>Test & Connect</span>';
        modal.style.display = 'none';
        return;
      }

      const res = await window.testApiConnection(url);
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span>Test & Connect</span>';

      if (res.success) {
        window.setApiBaseUrl(url);
        resultBox.style.display = 'block';
        resultBox.style.background = '#064e3b';
        resultBox.style.color = '#a7f3d0';
        resultBox.innerHTML = `✓ <strong>Connected successfully!</strong> OpenEdge database is reachable.`;
        setTimeout(() => { modal.style.display = 'none'; }, 1200);
      } else {
        resultBox.style.display = 'block';
        resultBox.style.background = '#7f1d1d';
        resultBox.style.color = '#fecaca';
        resultBox.innerHTML = `✗ <strong>Connection Failed:</strong> ${res.error}<br><span style="font-size:10px;">Make sure server.py and cloudflared are running on your office PC.</span>`;
      }
    });

    updateBridgeStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBridgeUI);
  } else {
    injectBridgeUI();
  }
})();
