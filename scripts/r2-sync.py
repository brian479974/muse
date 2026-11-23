#!/usr/bin/env python3
# 把 public/muse-assets 同步到 Cloudflare R2（經 muse-img Worker 的 /_upload/，密鑰在 ~/.config/bella/muse_img_upload_secret）
# 依 sha256 比對：本機清單 vs R2 上的 _manifest.json，只傳新增或改過的檔；--delete 才刪 R2 上本機已沒有的檔
# 用法：python3 scripts/r2-sync.py [--dry-run] [--check] [--delete] [--workers 16] [--verify N]
# 推送前檢查：.git/hooks/pre-push 會先跑 --check，R2 缺圖就擋（網站程式只帶清單，圖片全在 R2）
import argparse, concurrent.futures as cf, hashlib, json, os, pathlib, sys, time, urllib.request, urllib.error, random
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public"
BASE = os.environ.get("MUSE_IMG_BASE", "https://muse-img.brian479974.workers.dev").rstrip("/")
SECRET = (pathlib.Path.home() / ".config/bella/muse_img_upload_secret").read_text().strip()

def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

def req(method, path, data=None, headers=None, timeout=120):
    r = urllib.request.Request(BASE + path, data=data, method=method, headers={"X-Upload-Secret": SECRET, "User-Agent": "muse-r2-sync", **(headers or {})})
    with urllib.request.urlopen(r, timeout=timeout) as resp: return resp.status, resp.read()

def remote_manifest():
    try:
        st, body = req("GET", "/_upload/_manifest.json", timeout=60)
        return json.loads(body)
    except urllib.error.HTTPError as e:
        if e.code == 404: return {}
        raise

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry-run", action="store_true"); ap.add_argument("--check", action="store_true", help="只檢查：本機每個檔 R2 上都有且內容相同，否則 exit 1（推送前用）"); ap.add_argument("--delete", action="store_true")
    ap.add_argument("--workers", type=int, default=16); ap.add_argument("--verify", type=int, default=30); a = ap.parse_args()
    files = sorted(p for p in (SRC / "muse-assets").rglob("*") if p.is_file() and not p.name.startswith("."))
    t = time.time(); local = {}
    with cf.ThreadPoolExecutor(8) as ex:
        for p, h in zip(files, ex.map(sha, files)): local[p.relative_to(SRC).as_posix()] = h
    remote = remote_manifest()
    todo = [k for k, h in local.items() if remote.get(k) != h]
    gone = [k for k in remote if k not in local]
    size = sum((SRC / k).stat().st_size for k in todo)
    print(f"本機 {len(local)} 檔；R2 清單 {len(remote)} 檔；要上傳 {len(todo)} 檔（{size/1e6:.0f} MB）；R2 多出 {len(gone)} 檔；算雜湊 {time.time()-t:.0f} 秒", flush=True)
    if a.check:
        if todo:
            print(f"❌ R2 上缺 {len(todo)} 個檔或內容不同（例：{todo[:3]}）。網站推上去會有破圖，先跑：python3 scripts/r2-sync.py"); sys.exit(1)
        print("✅ R2 上的圖片跟本機 public/muse-assets 一致"); return
    if a.dry_run: return
    done, fail = [0], []
    import threading; lk = threading.Lock(); have = dict(remote)
    def save_manifest():
        with lk: body = json.dumps(have, sort_keys=True).encode()
        req("PUT", "/_upload/_manifest.json", data=body, headers={"Content-Type": "application/json"})
    def put(k):
        p = SRC / k
        for i in range(4):
            try:
                st, _ = req("PUT", "/_upload/" + k, data=p.read_bytes(), headers={"X-Sha256": local[k]}, timeout=300)
                if st == 200:
                    with lk: done[0] += 1; have[k] = local[k]; n = done[0]
                    if n % 500 == 0: save_manifest(); print(f"  已傳 {n}／{len(todo)}（{time.time()-t:.0f} 秒）", flush=True)   # 中途存清單：中斷後重跑只補沒傳的
                    return True
            except Exception as e:
                err = repr(e)[:160]; time.sleep(2 * (i + 1))
        fail.append(k); return False
    with cf.ThreadPoolExecutor(a.workers) as ex: list(ex.map(put, todo))
    if fail: print("上傳失敗", len(fail), fail[:10]); sys.exit(1)
    if a.delete:
        for k in gone: req("DELETE", "/_upload/" + k)
    merged = dict(local) if a.delete else {**remote, **local}
    req("PUT", "/_upload/_manifest.json", data=json.dumps(merged, sort_keys=True).encode(), headers={"Content-Type": "application/json"})
    # 驗收：隨機抽 N 檔從公開網址下載回來比 sha256
    bad = []
    for k in random.sample(sorted(local), min(a.verify, len(local))):
        with urllib.request.urlopen(urllib.request.Request(f"{BASE}/{k}", headers={"User-Agent": "muse-r2-sync"}), timeout=60) as r:
            if hashlib.sha256(r.read()).hexdigest() != local[k]: bad.append(k)
    print(f"上傳完成 {done[0]} 檔；抽驗 {min(a.verify, len(local))} 檔 {'全部一致' if not bad else '不一致：' + str(bad)}；共 {time.time()-t:.0f} 秒")
    if bad: sys.exit(1)

if __name__ == "__main__":
    main()
