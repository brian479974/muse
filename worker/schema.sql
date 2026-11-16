-- Muse 匿名使用次數統計（D1：muse-stats）
-- hits：每張參考 × 每種動作的累計次數。只有參考編號、類型、動作、次數，沒有任何使用者資料。
CREATE TABLE IF NOT EXISTS hits (
  ref TEXT NOT NULL,
  kind TEXT NOT NULL,
  action TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ref, action)
);
CREATE INDEX IF NOT EXISTS hits_action ON hits (action, n);
-- daily：每天每種動作的總次數（查使用率用；日期是 UTC）
CREATE TABLE IF NOT EXISTS daily (
  day TEXT NOT NULL,
  action TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, action)
);
-- snapshot：排行快照，最久 5 分鐘重算一次，避免每次開站都掃整張表
CREATE TABLE IF NOT EXISTS snapshot (
  id INTEGER PRIMARY KEY,
  body TEXT NOT NULL,
  at INTEGER NOT NULL
);
