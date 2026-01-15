import sqlite3 from 'sqlite3';
import path from 'path';

// 确保在 data 目录存在时创建数据库
const dbPath = path.resolve(__dirname, '../data/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // 初始化表结构
    db.serialize(() => {
      // 1. 系统配置表 (settings)
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 2. 节目表 (programs)
      db.run(`CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        performer TEXT NOT NULL,
        vote_count INTEGER DEFAULT 0,
        color TEXT DEFAULT '#3b82f6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 3. 投票记录表 (vote_records)
      db.run(`CREATE TABLE IF NOT EXISTS vote_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id INTEGER NOT NULL,
        client_ip TEXT NOT NULL,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // 创建索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_vote_ip ON vote_records(client_ip)`);

      // 插入默认配置 (如果不存在)
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('vote_count_limit', '1')`);

      // 插入示例节目数据 (如果表为空)
      db.get("SELECT count(*) as count FROM programs", (err, row: any) => {
        if (row.count === 0) {
          const stmt = db.prepare("INSERT INTO programs (title, performer, vote_count, color) VALUES (?, ?, ?, ?)");
          const programs = [
            { title: '歌曲《星辰大海》', performer: '张伟 & 李娜', votes: 4520, color: '#d946ef' },
            { title: '魔术《奇迹时刻》', performer: '王强', votes: 4310, color: '#3b82f6' },
            { title: '摇滚《无尽之路》', performer: '极光乐队', votes: 3890, color: '#10b981' },
            { title: '舞蹈《雀之灵》', performer: '赵敏', votes: 3100, color: '#f59e0b' },
            { title: '脱口秀《我的生活》', performer: '陈晨', votes: 2850, color: '#8b5cf6' },
            { title: '武术《中华魂》', performer: '李小龙', votes: 2100, color: '#06b6d4' },
            { title: '钢琴独奏《月光》', performer: '刘诗诗', votes: 1950, color: '#ec4899' }
          ];
          programs.forEach(p => stmt.run(p.title, p.performer, p.votes, p.color));
          stmt.finalize();
          console.log('Initialized default programs.');
        }
      });
    });
  }
});

export default db;
