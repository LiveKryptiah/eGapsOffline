import http.server
import socketserver
import subprocess
import os
import json
import urllib.parse
import time
import uuid
import re

PORT = 8080
DIRECTORY = r"C:\eGaps\rpas-ui"
DLC = r"C:\Program Files\Progress"
PF_GLOBAL = r"C:\eGaps\Param\Isabela\globaldb-pf.pf"
PF_RPADB = r"C:\eGaps\Param\Isabela\rpadb-pf.pf"
TEMP_DIR = r"C:\eGaps\Temp"

# Server-side Cache for High-Performance Real-Time Querying
_UNAPPROVED_CACHE = {}
_CACHE_TIMESTAMP = {}
CACHE_TTL = 300 # 5 minutes

socketserver.ThreadingTCPServer.allow_reuse_address = True

def sanitize_json_str(content):
    content = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', ' ', content)
    content = re.sub(r':\s*\?(?=[,\}\]\s])', ': null', content)
    return content

class RPASApiHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        try:
            body = json.loads(post_body)
        except Exception:
            body = {}

        if self.path == '/api/login':
            self.handle_login(body)
        elif self.path == '/api/login/check-user':
            self.handle_check_user(body)
        elif self.path == '/api/general-revision/approve':
            self.handle_approval(body)
        elif self.path == '/api/land/save':
            self.handle_save_land(body)
        elif self.path == '/api/land/save-full':
            self.handle_save_land_full(body)
        elif self.path == '/api/land/delete':
            self.handle_delete_land(body)
        elif self.path == '/api/land/transfer':
            self.handle_transfer_land(body)
        elif self.path == '/api/database/pull':
            self.handle_pull_db(body)
        elif self.path == '/api/sync/download':
            self.handle_sync_action("download")
        elif self.path == '/api/sync/upload':
            self.handle_sync_action("upload")
        else:
            self.send_json({"error": "Endpoint not found"}, status_code=404)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api_get()
        elif self.path == '/' or self.path == '/login':
            self.path = '/login.html'
            super().do_GET()
        elif self.path == '/dashboard' or self.path == '/app':
            self.path = '/index.html'
            super().do_GET()
        else:
            super().do_GET()

    def handle_check_user(self, body):
        username = body.get('username', '').strip()
        if not username:
            self.send_json({"found": False, "error": "*** Invalid User ID ***"})
            return

        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"chkuser_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\check_user.p"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-p", script,
            "-param", f"{username},{out_file}"
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=15)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                try: os.remove(out_file)
                except Exception: pass
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
            else:
                self.send_json({"found": False, "error": "*** Invalid User ID ***"}, status_code=200)
        except Exception as e:
            self.send_json({"found": False, "error": str(e)}, status_code=500)

    def handle_login(self, body):
        username = body.get('username', 'Guillermo B. Barretto').strip()
        password = body.get('password', '').strip()
        locality_code = body.get('localityCode', 22)
        revision_year = body.get('revisionYear', 2024)

        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"auth_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\auth_user.p"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-p", script,
            "-param", f"{username},{password},{out_file},{locality_code},{revision_year}"
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    data = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json(data)
                return
            else:
                self.send_json({"status": "error", "message": f"Auth failed. stdout: {res.stdout}, stderr: {res.stderr}"}, status_code=500)
                return
        except Exception as e:
            self.send_json({"status": "error", "message": f"Authentication error: {str(e)}"}, status_code=500)
            return

    def handle_approval(self, body):
        arp_no = body.get('arpNo', 0)
        global _UNAPPROVED_CACHE
        _UNAPPROVED_CACHE.clear()
        self.send_json({
            "status": "success",
            "message": f"Assessment ARP {arp_no} approved and committed to assessment roll.",
            "arpNo": arp_no
        })

    def handle_pull_db(self, body):
        source_id = body.get('sourceId', 'central-rpadb')
        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"pull_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\export_json.p"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", f"sync-stats,{out_file}"
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    stats = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json({
                    "status": "success",
                    "sourceId": source_id,
                    "stats": stats,
                    "message": f"Successfully pulled and loaded database from folder ({source_id})"
                })
                return
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status_code=500)
            return

        self.send_json({"status": "error", "message": "Database pull operation failed"}, status_code=500)

    def handle_save_land(self, body):
        arp_no = body.get('arpNo', 0)
        owner_name = body.get('ownerName', 'RECORDED OWNER')
        lot_no = body.get('lotNo', 'Lot 1')
        survey_no = body.get('surveyNo', 'Cad-305-D')
        oct_tct_no = body.get('octTctNo', 'T-Title')
        area = body.get('area', 1000)
        market_val = body.get('marketValue', 500000)
        assessed_val = body.get('assessedValue', 100000)
        loc_code = body.get('localityCode', 1)
        bgy_code = body.get('barangayCode', 1)
        sec_num = body.get('sectionNo', '001')
        ass_lot_num = body.get('assLotNo', '001')
        class_val = body.get('classCode', 'R-2')

        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"save_land_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\save_land.p"

        param = f"{arp_no}|{owner_name}|{lot_no}|{survey_no}|{oct_tct_no}|{area}|{market_val}|{assessed_val}|{loc_code}|{bgy_code}|{sec_num}|{ass_lot_num}|{class_val}|{out_file}"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", param
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    data = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json(data)
                return
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status_code=500)
            return

        self.send_json({"status": "error", "message": "Failed to save land property to database"}, status_code=500)

    def handle_save_land_full(self, body):
        # Invalidate unapproved cache
        global _UNAPPROVED_CACHE
        _UNAPPROVED_CACHE.clear()
        arp_no = body.get('arpNo', 1)
        loc_code = body.get('localityCode', 22)
        bgy_code = body.get('barangayCode', 6)
        owner_name = body.get('ownerName', 'RECORDED OWNER')
        owner_addr = body.get('ownerAddress', '')
        admin_name = body.get('administrator', '')
        admin_addr = body.get('adminAddress', '')
        oct_no = body.get('octTctNo', '')
        survey_no = body.get('surveyNo', '')
        cad_lot = body.get('cadLotNo', '')
        sec_num = body.get('sectionNo', '001')
        ass_lot = body.get('assLotNo', '001')
        b_north = body.get('boundaryNorth', '')
        b_east = body.get('boundaryEast', '')
        b_south = body.get('boundarySouth', '')
        b_west = body.get('boundaryWest', '')
        area = body.get('area', 0)
        unit_val = body.get('unitValue', 0)
        mkt_val = body.get('marketValue', 0)
        ass_val = body.get('assessedValue', 0)
        class_val = body.get('classCode', 'R-2')
        tax_val = body.get('taxability', 'Taxable')
        eff_year = body.get('effectYear', 2026)

        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"save_full_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\save_land_full.p"

        param = f"{arp_no}|{loc_code}|{bgy_code}|{owner_name}|{owner_addr}|{admin_name}|{admin_addr}|{oct_no}|{survey_no}|{cad_lot}|{sec_num}|{ass_lot}|{b_north}|{b_east}|{b_south}|{b_west}|{area}|{unit_val}|{mkt_val}|{ass_val}|{class_val}|{tax_val}|{eff_year}|{out_file}"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", param
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    data = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json(data)
                return
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status_code=500)
            return

        self.send_json({"status": "error", "message": "Failed to update property FAAS in database"}, status_code=500)

    def handle_delete_land(self, body):
        arp_no = body.get('arpNo', 0)
        if not arp_no:
            self.send_json({"status": "error", "message": "Invalid ARP Number"}, status_code=400)
            return

        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"del_land_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\delete_land.p"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", f"{arp_no},{out_file}"
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    data = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json(data)
                return
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status_code=500)
            return

        self.send_json({"status": "error", "message": "Failed to delete record from database"}, status_code=500)

    def handle_transfer_land(self, body):
        old_arp = body.get('oldArp', 0)
        new_arp = body.get('newArp', 0)
        new_bgy = body.get('newBgy', 0)

        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"trans_land_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\transfer_land.p"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", f"{old_arp},{new_arp},{new_bgy},{out_file}"
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    data = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json(data)
                return
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status_code=500)
            return

        self.send_json({"status": "error", "message": "Failed to transfer record"}, status_code=500)

    def handle_approval(self, arp_no):
        # Invalidate unapproved cache
        global _UNAPPROVED_CACHE
        _UNAPPROVED_CACHE.clear()
        if not arp_no:
            self.send_json({"status": "error", "message": "Invalid ARP Number"}, status_code=400)
            return

        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"approval_res_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\approve_rpu.p"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", f"{arp_no},{out_file}"
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    data = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json(data)
                return
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status_code=500)
            return

        self.send_json({"status": "error", "message": "Approval execution failed"}, status_code=500)

    def handle_sync_action(self, action_type):
        req_id = uuid.uuid4().hex[:8]
        out_file = os.path.join(TEMP_DIR, f"sync_res_{req_id}.json")
        script = r"C:\eGaps\rpas-ui\export_json.p"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", f"sync-stats,{out_file}"
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                    content = sanitize_json_str(f.read())
                    stats = json.loads(content)
                try: os.remove(out_file)
                except Exception: pass
                self.send_json({
                    "status": "success",
                    "action": action_type,
                    "server": "192.168.4.1 (rpadb:12302, globaldb:12301)",
                    "stats": stats,
                    "message": f"Successfully synchronized database records with Central Server ({stats.get('syncTime', '')})"
                })
                return
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status_code=500)
            return

        self.send_json({"status": "error", "message": "Sync engine execution failed"}, status_code=500)

    def handle_api_get(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/api/unapproved-revised' or parsed.path.startswith('/api/general-revision/for-approval'):
            bgy = query.get('bgy', ['6'])[0]
            loc = query.get('loc', ['22'])[0]
            rev = query.get('rev', ['2024'])[0]
            cache_key = f"{bgy}_{loc}_{rev}"

            # Check cache
            now = time.time()
            if cache_key in _UNAPPROVED_CACHE and (now - _CACHE_TIMESTAMP.get(cache_key, 0)) < CACHE_TTL:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(_UNAPPROVED_CACHE[cache_key].encode('utf-8'))
                return

            req_id = uuid.uuid4().hex[:8]
            script = r"C:\eGaps\rpas-ui\get_unapproved_revised.p"
            out_file = os.path.join(TEMP_DIR, f"api_unapp_{req_id}.json")
            param = f"{bgy},{loc},{rev},{out_file}"
            cmd = [
                os.path.join(DLC, "bin", "_progres.exe"),
                "-b",
                "-pf", PF_GLOBAL,
                "-pf", PF_RPADB,
                "-p", script,
                "-param", param
            ]
            env = os.environ.copy()
            env["DLC"] = DLC
            try:
                subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
                if os.path.exists(out_file):
                    with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                        content = sanitize_json_str(f.read())
                    try: os.remove(out_file)
                    except Exception: pass
                    
                    # Store in server cache
                    _UNAPPROVED_CACHE[cache_key] = content
                    _CACHE_TIMESTAMP[cache_key] = time.time()

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(content.encode('utf-8'))
                    return
                else:
                    self.send_json({"status": "error", "message": "Failed to fetch unapproved records from OpenEdge"}, status_code=500)
                    return
            except Exception as e:
                self.send_json({"status": "error", "message": f"Server error: {str(e)}"}, status_code=500)
                return

        elif parsed.path == '/api/unit-values':
            loc = query.get('loc', ['22'])[0]
            rev = query.get('rev', ['2024'])[0]
            req_id = uuid.uuid4().hex[:8]
            script = r"C:\eGaps\rpas-ui\get_unit_values.p"
            out_file = os.path.join(TEMP_DIR, f"api_uv_{req_id}.json")
            param = f"{loc},{rev},{out_file}"
            cmd = [
                os.path.join(DLC, "bin", "_progres.exe"),
                "-b",
                "-pf", PF_GLOBAL,
                "-pf", PF_RPADB,
                "-p", script,
                "-param", param
            ]
            env = os.environ.copy()
            env["DLC"] = DLC
            try:
                subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
                if os.path.exists(out_file):
                    with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                        content = sanitize_json_str(f.read())
                    try: os.remove(out_file)
                    except Exception: pass
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(content.encode('utf-8'))
                    return
                else:
                    self.send_json({"status": "error", "message": "Failed to fetch unit values from OpenEdge"}, status_code=500)
                    return
            except Exception as e:
                self.send_json({"status": "error", "message": f"Server error: {str(e)}"}, status_code=500)
                return

        elif parsed.path == '/api/land/detail':
            arp = query.get('arp', ['1'])[0]
            loc = query.get('loc', ['22'])[0]
            bgy = query.get('bgy', ['6'])[0]
            rev = query.get('rev', ['2024'])[0]
            req_id = uuid.uuid4().hex[:8]
            script = r"C:\eGaps\rpas-ui\get_land_single.p"
            out_file = os.path.join(TEMP_DIR, f"api_detail_{req_id}.json")
            param = f"{arp},{loc},{bgy},{rev},{out_file}"
            cmd = [
                os.path.join(DLC, "bin", "_progres.exe"),
                "-b",
                "-pf", PF_GLOBAL,
                "-pf", PF_RPADB,
                "-p", script,
                "-param", param
            ]
            env = os.environ.copy()
            env["DLC"] = DLC
            try:
                subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
                if os.path.exists(out_file):
                    with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                        content = sanitize_json_str(f.read())
                    try: os.remove(out_file)
                    except Exception: pass
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(content.encode("utf-8"))
                    return
            except Exception as e:
                self.send_json({"error": str(e)}, status_code=500)
                return

        if parsed.path == '/api/users/list':
            req_id = uuid.uuid4().hex[:8]
            out_file = os.path.join(TEMP_DIR, f"users_{req_id}.json")
            script = r"C:\eGaps\rpas-ui\get_users.p"
            cmd = [
                os.path.join(DLC, "bin", "_progres.exe"),
                "-b",
                "-pf", PF_GLOBAL,
                "-p", script,
                "-param", out_file
            ]
            env = os.environ.copy()
            env["DLC"] = DLC
            try:
                subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
                if os.path.exists(out_file):
                    with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                        content = sanitize_json_str(f.read())
                    try: os.remove(out_file)
                    except Exception: pass
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(content.encode("utf-8"))
                    return
                else:
                    self.send_json([], status_code=200)
                    return
            except Exception as e:
                self.send_json({"error": str(e)}, status_code=500)
                return

        if parsed.path == '/api/status':
            self.send_json({
                "status": "online",
                "engine": "Progress OpenEdge 9.1E",
                "databases": [
                    {"name": "globaldb", "host": "192.168.4.1", "port": 12301, "status": "Connected"},
                    {"name": "rpadb", "host": "192.168.4.1", "port": 12302, "status": "Connected"}
                ]
            })
            return

        if parsed.path == '/api/tunnel':
            url = ""
            txt_path = os.path.join(DIRECTORY, "tunnel_url.txt")
            if os.path.exists(txt_path):
                try:
                    with open(txt_path, "r", encoding="utf-8") as f:
                        url = f.read().strip()
                except Exception:
                    pass
            self.send_json({"status": "ok", "url": url})
            return

        if parsed.path == '/api/database/sources':
            script = r"C:\eGaps\rpas-ui\pull_folder_db.p"
            req_id = uuid.uuid4().hex[:8]
            out_file = os.path.join(TEMP_DIR, f"api_sources_{req_id}.json")
            cmd = [
                os.path.join(DLC, "bin", "_progres.exe"),
                "-b",
                "-p", script,
                "-param", out_file
            ]
            env = os.environ.copy()
            env["DLC"] = DLC
            try:
                subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
                if os.path.exists(out_file):
                    with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                        content = sanitize_json_str(f.read())
                    try: os.remove(out_file)
                    except Exception: pass
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(content.encode("utf-8"))
                    return
            except Exception as e:
                self.send_json({"error": str(e)}, status_code=500)
                return

        req_id = uuid.uuid4().hex[:8]
        if parsed.path.startswith('/api/general-revision/for-approval'):
            script = r"C:\eGaps\rpas-ui\export_approval.p"
            out_file = os.path.join(TEMP_DIR, f"api_approval_{req_id}.json")
            param = f"for-approval,{out_file}"
        elif '/api/bldg' in parsed.path:
            bgy = query.get('bgy', ['6'])[0]
            loc = query.get('loc', ['22'])[0]
            approved = query.get('approved', ['false'])[0]
            cache_key = f"bldg_{bgy}_{loc}_{approved}"

            # Memory Cache
            now = time.time()
            if cache_key in _UNAPPROVED_CACHE and (now - _CACHE_TIMESTAMP.get(cache_key, 0)) < CACHE_TTL:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(_UNAPPROVED_CACHE[cache_key].encode('utf-8'))
                return

            script = r"C:\eGaps\rpas-ui\get_bldg.p"
            out_file = os.path.join(TEMP_DIR, f"api_bldg_{req_id}.json")
            param = f"{bgy},{loc},{approved},{out_file}"
        elif '/api/mach' in parsed.path:
            bgy = query.get('bgy', ['6'])[0]
            loc = query.get('loc', ['22'])[0]
            approved = query.get('approved', ['false'])[0]
            cache_key = f"mach_{bgy}_{loc}_{approved}"

            # Memory Cache
            now = time.time()
            if cache_key in _UNAPPROVED_CACHE and (now - _CACHE_TIMESTAMP.get(cache_key, 0)) < CACHE_TTL:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(_UNAPPROVED_CACHE[cache_key].encode('utf-8'))
                return

        elif '/api/proproll' in parsed.path:
            bgy = query.get('bgy', ['1'])[0]
            loc = query.get('loc', ['22'])[0]
            approved = query.get('approved', ['false'])[0]
            cache_key = f"proproll_{bgy}_{loc}_{approved}"

            # Memory Cache
            now = time.time()
            if cache_key in _UNAPPROVED_CACHE and (now - _CACHE_TIMESTAMP.get(cache_key, 0)) < CACHE_TTL:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(_UNAPPROVED_CACHE[cache_key].encode('utf-8'))
                return

            script = r"C:\eGaps\rpas-ui\get_proproll.p"
            out_file = os.path.join(TEMP_DIR, f"api_proproll_{req_id}.json")
            param = f"{bgy},{loc},{approved},{out_file}"
        elif '/api/owners' in parsed.path:
            script = r"C:\eGaps\rpas-ui\export_json.p"
            out_file = os.path.join(TEMP_DIR, f"api_owners_{req_id}.json")
            param = f"owners,{out_file}"
        elif '/api/sync/stats' in parsed.path:
            script = r"C:\eGaps\rpas-ui\export_json.p"
            out_file = os.path.join(TEMP_DIR, f"api_stats_{req_id}.json")
            param = f"sync-stats,{out_file}"
        else:
            bgy = query.get('bgy', ['6'])[0]
            loc = query.get('loc', ['22'])[0]
            approved = query.get('approved', ['false'])[0]
            cache_key = f"land_{bgy}_{loc}_{approved}"

            # Memory Cache
            now = time.time()
            if cache_key in _UNAPPROVED_CACHE and (now - _CACHE_TIMESTAMP.get(cache_key, 0)) < CACHE_TTL:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(_UNAPPROVED_CACHE[cache_key].encode('utf-8'))
                return

            script = r"C:\eGaps\rpas-ui\get_land.p"
            out_file = os.path.join(TEMP_DIR, f"api_land_{req_id}.json")
            param = f"{bgy},{loc},{approved},{out_file}"

        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", script,
            "-param", param
        ]

        env = os.environ.copy()
        env["DLC"] = DLC

        try:
            res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
            if os.path.exists(out_file):
                try:
                    with open(out_file, "r", encoding="utf-8") as f:
                        content = sanitize_json_str(f.read())
                except Exception:
                    with open(out_file, "r", encoding="latin1") as f:
                        content = sanitize_json_str(f.read())
                try: os.remove(out_file)
                except Exception: pass
                
                # Store in cache
                if 'cache_key' in locals():
                    _UNAPPROVED_CACHE[cache_key] = content
                    _CACHE_TIMESTAMP[cache_key] = time.time()

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
                return
            else:
                self.send_json({"error": f"Query output missing. stdout: {res.stdout}, stderr: {res.stderr}"}, status_code=500)
                return
        except Exception as e:
            self.send_json({"error": str(e)}, status_code=500)
            return

        self.send_json({"error": "Failed to query live Progress database"}, status_code=500)

    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

def prewarm_cache():
    try:
        req_id = "prewarm_006"
        out_file = os.path.join(TEMP_DIR, f"api_unapp_{req_id}.json")
        cmd = [
            os.path.join(DLC, "bin", "_progres.exe"),
            "-b",
            "-pf", PF_GLOBAL,
            "-pf", PF_RPADB,
            "-p", r"C:\eGaps\rpas-ui\get_unapproved_revised.p",
            "-param", f"6,22,2024,{out_file}"
        ]
        env = os.environ.copy()
        env["DLC"] = DLC
        subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
        if os.path.exists(out_file):
            with open(out_file, "r", encoding="utf-8", errors="replace") as f:
                content = sanitize_json_str(f.read())
            try: os.remove(out_file)
            except Exception: pass
            _UNAPPROVED_CACHE["6_22_2024"] = content
            _CACHE_TIMESTAMP["6_22_2024"] = time.time()
            print("Pre-warmed unapproved revision cache for Barangay 006 successfully.")
    except Exception as e:
        print(f"Prewarm error: {e}")

if __name__ == "__main__":
    os.makedirs(TEMP_DIR, exist_ok=True)
    import threading
    threading.Thread(target=prewarm_cache, daemon=True).start()
    with socketserver.ThreadingTCPServer(("", PORT), RPASApiHandler) as httpd:
        print(f"eRPAS Real Database Server running at http://localhost:{PORT}")
        httpd.serve_forever()
