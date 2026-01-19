import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db';

const app = express();
const PORT = 3000;

// Trust Proxy for Nginx
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Auth Middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.status(401).json({ code: 401, message: "未登录" });

  if (token === 'admin-token-mock') {
    next();
  } else {
    return res.status(403).json({ code: 403, message: "Token无效" });
  }
};

console.log('Registering routes...');

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Routes

// 1. 获取节目列表 & 系统配置
app.get('/api/programs', (req, res) => {
  const sqlPrograms = "SELECT * FROM programs";
  const sqlSettings = "SELECT key, value FROM settings";

  db.all(sqlPrograms, [], (err, programs) => {
    if (err) {
      return res.status(500).json({ code: 500, message: err.message });
    }
    
    db.all(sqlSettings, [], (err, rows: any[]) => {
      if (err) {
        return res.status(500).json({ code: 500, message: err.message });
      }
      
      const config: any = {
          vote_count_limit: 1,
          voting_enabled: true,
          countdown_duration_seconds: 120,
          countdown_end_at: 0,
          remaining_seconds: 0
      };

      if (rows) {
          rows.forEach(row => {
              if (row.key === 'vote_count_limit') config.vote_count_limit = parseInt(row.value);
              if (row.key === 'voting_enabled') config.voting_enabled = row.value === 'true';
              if (row.key === 'countdown_duration_seconds') config.countdown_duration_seconds = parseInt(row.value);
              if (row.key === 'countdown_end_at') config.countdown_end_at = parseInt(row.value);
          });
      }

      // Calculate remaining
      if (config.countdown_end_at > 0) {
          const now = Date.now();
          config.remaining_seconds = Math.max(0, Math.floor((config.countdown_end_at - now) / 1000));
      }
      
      res.json({
        code: 0,
        data: {
          programs,
          config
        }
      });
    });
  });
});

// 2. 批量投票
app.post('/api/vote', (req, res) => {
  const { programIds, clientId } = req.body; // Expecting array of IDs and optional clientId
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  // Use clientId if provided (for more precise user tracking behind NAT), fallback to IP
  const userIdentifier = clientId || clientIp;

  if (!Array.isArray(programIds) || programIds.length === 0) {
    return res.status(400).json({ code: 400, message: "无效的投票数据" });
  }

  // 1. 获取当前投票规则
  db.all("SELECT key, value FROM settings", (err, rows: any[]) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    
    let limit = 1;
    let enabled = true;
    let countdownEndAt = 0;

    if (rows) {
        rows.forEach(row => {
            if (row.key === 'vote_count_limit') limit = parseInt(row.value);
            if (row.key === 'voting_enabled') enabled = row.value === 'true';
            if (row.key === 'countdown_end_at') countdownEndAt = parseInt(row.value);
        });
    }

    // Check Countdown Expiration
    if (countdownEndAt > 0 && Date.now() > countdownEndAt) {
         enabled = false;
         // Optionally update DB to reflect closed state (optimization, not strictly required as logic holds)
         // But for now, just blocking the request is enough.
    }

    if (!enabled) {
        return res.status(403).json({ code: 1003, message: "投票通道已关闭" });
    }
    
    if (programIds.length !== limit) {
      return res.status(400).json({ code: 1002, message: `请选择 ${limit} 个节目进行投票` });
    }

    // 2. 检查是否重复投票 (基于 ClientID 或 IP)
    db.get("SELECT id FROM vote_records WHERE client_ip = ?", [userIdentifier], (err, row) => {
      if (err) return res.status(500).json({ code: 500, message: err.message });
      
      if (row) {
        return res.status(403).json({ code: 1001, message: "您已经投过票了" });
      }

      // 3. 执行投票事务
      const stmtRecord = db.prepare("INSERT INTO vote_records (program_id, client_ip) VALUES (?, ?)");
      const stmtUpdate = db.prepare("UPDATE programs SET vote_count = vote_count + 1 WHERE id = ?");

      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        try {
          programIds.forEach(pid => {
            stmtRecord.run(pid, userIdentifier);
            stmtUpdate.run(pid);
          });
          
          db.run("COMMIT", () => {
             stmtRecord.finalize();
             stmtUpdate.finalize();
             res.json({ code: 0, message: "投票成功" });
          });
        } catch (error) {
          db.run("ROLLBACK");
          res.status(500).json({ code: 500, message: "投票失败，请重试" });
        }
      });
    });
  });
});

// 3. 管理员登录
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === '54zds') {
    res.json({ code: 0, token: 'admin-token-mock' });
  } else {
    res.status(401).json({ code: 401, message: "密码错误" });
  }
});

// 4. 管理端 - 修改规则
app.post('/api/admin/settings', authenticateToken, (req, res) => {
  const { vote_count_limit, voting_enabled, countdown_duration_seconds } = req.body;
  
  const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    try {
        if (vote_count_limit && vote_count_limit >= 1) {
             stmt.run('vote_count_limit', vote_count_limit.toString());
        }
        if (typeof voting_enabled !== 'undefined') {
             stmt.run('voting_enabled', voting_enabled.toString());
        }
        if (countdown_duration_seconds && countdown_duration_seconds > 0) {
             stmt.run('countdown_duration_seconds', countdown_duration_seconds.toString());
        }
        db.run("COMMIT", () => {
            stmt.finalize();
            res.json({ code: 0, message: "规则已更新" });
        });
    } catch (error) {
        db.run("ROLLBACK");
        res.status(500).json({ code: 500, message: "更新失败" });
    }
  });
});

// 7. 管理端 - 开始投票 (倒计时)
app.post('/api/admin/start_vote', authenticateToken, (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'countdown_duration_seconds'", (err, row: any) => {
        if (err) return res.status(500).json({ code: 500, message: err.message });
        
        const duration = row ? parseInt(row.value) : 120; // Default 120s
        const endAt = Date.now() + duration * 1000;
        
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            try {
                stmt.run('countdown_end_at', endAt.toString());
                stmt.run('voting_enabled', 'true'); // Auto enable voting
                
                db.run("COMMIT", () => {
                    stmt.finalize();
                    res.json({ code: 0, message: "投票已开始，倒计时启动" });
                });
            } catch (error) {
                db.run("ROLLBACK");
                res.status(500).json({ code: 500, message: "启动失败" });
            }
        });
    });
});

// 5. 管理端 - 重置数据
app.post('/api/admin/reset', authenticateToken, (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM vote_records");
    db.run("UPDATE programs SET vote_count = 0");
    // 重置后开启投票，并重置倒计时
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('voting_enabled', 'true')");
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('countdown_end_at', '0')"); // Reset countdown
    res.json({ code: 0, message: "系统数据已重置" });
  });
});

// 6. 管理端 - 节目管理 (增加/删除)
app.post('/api/admin/programs', authenticateToken, (req, res) => {
    const { title, performer, color } = req.body;
    if (!title || !performer) return res.status(400).json({code: 400, message: '标题和表演者不能为空'});
    
    const programColor = color || '#3b82f6';

    db.run("INSERT INTO programs (title, performer, vote_count, color) VALUES (?, ?, 0, ?)", [title, performer, programColor], function(err) {
        if (err) return res.status(500).json({code: 500, message: err.message});
        res.json({ code: 0, data: { id: this.lastID, title, performer, vote_count: 0, color: programColor } });
    });
});

app.delete('/api/admin/programs/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM programs WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({code: 500, message: err.message});
        res.json({ code: 0, message: "删除成功" });
    });
});


// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
