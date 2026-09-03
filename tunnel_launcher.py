"""
eRPAS Tunnel Auto-Pairing Launcher
Automatically connects Cloudflare Tunnel to local OpenEdge 9.1E DB
Supports direct copy-paste, clipboard auto-copy, and URL pairing for Vercel/Android
"""

import os
import sys
import subprocess
import time
import re
import hashlib
import urllib.request
import urllib.error
import socket
import json

# Ensure UTF-8 / safe output in Windows Command Prompt (prevents UnicodeEncodeError cp1252 crash)
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PASSKEY = "33Land25PA0"
DEFAULT_TOPIC = "egaps-relay-" + hashlib.sha256(PASSKEY.encode('utf-8')).hexdigest()[:16]
PORT = 8080

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_cloudflared():
    candidates = [
        r"C:\Program Files (x86)\cloudflared\cloudflared.exe",
        r"C:\Program Files\cloudflared\cloudflared.exe",
        "cloudflared.exe",
        "cloudflared"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return "cloudflared"

def copy_to_clipboard(text):
    try:
        p = subprocess.Popen(['clip'], stdin=subprocess.PIPE, shell=True)
        p.communicate(input=text.strip().encode('utf-8'))
        return True
    except Exception:
        try:
            subprocess.run(
                ["powershell", "-Command", f"Set-Clipboard -Value '{text.strip()}'"],
                check=False,
                creationflags=0x08000000
            )
            return True
        except Exception:
            return False

def save_tunnel_url(url):
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        txt_path = os.path.join(base_dir, "tunnel_url.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(url.strip())

        json_path = os.path.join(base_dir, "tunnel.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({"url": url.strip(), "passkey": PASSKEY, "updated": time.time()}, f, indent=2)
        return True
    except Exception as e:
        print(f"[!] Warning saving tunnel URL: {e}")
        return False

def publish_tunnel_url(url):
    try:
        req = urllib.request.Request(
            f"https://ntfy.sh/{DEFAULT_TOPIC}",
            data=url.encode('utf-8'),
            headers={"Title": "eRPAS Tunnel Active", "Tags": "key,globe", "User-Agent": "eRPAS-Bridge/1.0"}
        )
        with urllib.request.urlopen(req, timeout=3) as res:
            return res.status == 200
    except Exception:
        return False

def main():
    os.system("cls" if os.name == "nt" else "clear")
    print("==============================================================================")
    print("                eRPAS Database Bridge & Cloudflare Tunnel")
    print("==============================================================================\n")

    # 1. Ensure server.py is running
    if not is_port_in_use(PORT):
        print("[*] Local eRPAS server (server.py) is not active. Starting it now...")
        server_script = os.path.join(os.path.dirname(__file__), "server.py")
        subprocess.Popen([sys.executable, server_script], creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
        time.sleep(2.5)
        print("[OK] eRPAS local server started on port 8080.\n")
    else:
        print("[OK] eRPAS local server is already running on port 8080.\n")

    # 2. Find cloudflared
    cf_bin = find_cloudflared()
    print(f"[*] Starting Cloudflare Tunnel using {cf_bin}...")
    print("[*] Generating secure public HTTPS endpoint...")

    cmd = [cf_bin, "tunnel", "--url", f"http://127.0.0.1:{PORT}"]
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding='utf-8',
            errors='replace'
        )
    except Exception as e:
        print(f"[X] Failed to launch cloudflared: {e}")
        input("Press Enter to exit...")
        return

    tunnel_url = None
    url_pattern = re.compile(r"(https://[a-zA-Z0-9\.\-]+\.trycloudflare\.com)")

    # Read output until tunnel URL is found
    start_time = time.time()
    for line in proc.stdout:
        line_clean = line.strip()
        match = url_pattern.search(line_clean)
        if match:
            tunnel_url = match.group(1)
            break
        if "Registered tunnel" in line_clean or "Connection" in line_clean:
            print(f"    {line_clean}")
        if time.time() - start_time > 15:
            break

    # Fallback: query cloudflared quicktunnel port if available
    if not tunnel_url:
        for port in range(20240, 20260):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/quicktunnel", timeout=1) as res:
                    data = json.loads(res.read().decode())
                    if "hostname" in data:
                        tunnel_url = f"https://{data['hostname']}"
                        break
            except Exception:
                pass

    if tunnel_url:
        save_tunnel_url(tunnel_url)
        copied = copy_to_clipboard(tunnel_url)
        publish_tunnel_url(tunnel_url)

        os.system("cls" if os.name == "nt" else "clear")
        print("==============================================================================")
        print("                 eRPAS DATABASE BRIDGE IS NOW ONLINE!")
        print("==============================================================================")
        print(f"  [OK] CLOUDFLARE TUNNEL URL:  {tunnel_url}")
        if copied:
            print("  [OK] COPIED TO CLIPBOARD:    YES! (Press Ctrl+V to paste on your device)")
        print(f"  [OK] Local Python Server:    http://127.0.0.1:{PORT} (Active)")
        print(f"  [OK] OpenEdge Database:      globaldb & rpadb on 192.168.4.1 (Ready)")
        print(f"  [OK] Saved to File:          tunnel_url.txt")
        print("------------------------------------------------------------------------------")
        print("  ON YOUR PHONE OR ANY BROWSER:")
        print("  Simply open your Vercel website:")
        print("  --> https://e-gaps-offline.vercel.app/")
        print("  It connects AUTOMATICALLY in the background! Zero links to copy!")
        print("------------------------------------------------------------------------------")
        print(f"  (Underlying Cloudflare URL: {tunnel_url})")
        print("==============================================================================")
        print("  Keep this window open while using the app remotely.")
        print("  Press Ctrl+C to disconnect.")
        print("==============================================================================\n")
    else:
        print("\n[!] Could not automatically capture tunnel URL. Check Cloudflare output below:")

    # Keep reading so process stays alive and publish periodic heartbeat
    last_heartbeat = time.time()
    try:
        while proc.poll() is None:
            time.sleep(1)
            if tunnel_url and (time.time() - last_heartbeat > 45):
                publish_tunnel_url(tunnel_url)
                last_heartbeat = time.time()
    except KeyboardInterrupt:
        print("\n[*] Stopping tunnel...")
        proc.terminate()

if __name__ == "__main__":
    main()
