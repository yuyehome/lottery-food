// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 9527;
const db = new sqlite3.Database('./lottery.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API 1: 身份验证 (无改动)
app.post('/api/login', (req, res) => {
    const { studentId, name } = req.body;
    const sql = `SELECT * FROM students WHERE student_id = ? AND student_name = ?`;
    db.get(sql, [studentId, name], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: '数据库错误' });
        if (row) {
            res.json({ success: true, message: '验证成功' });
        } else {
            res.status(401).json({ success: false, message: '学号或姓名不匹配' });
        }
    });
});

// API 2: 获取所有抽签数据 (已修正)
app.get('/api/data', (req, res) => {
    const responseData = {
        students: [],
        draws: {
            'draw1': { title: '9月28号验菜', results: [] },
            'draw2': { title: '9月29号验菜', results: [] },
            'draw3': { title: '9月30号验菜', results: [] }
        }
    };
    
    db.serialize(() => {
        const studentSql = `SELECT student_id, student_name FROM students`;
        db.all(studentSql, [], (err, students) => {
            if (err) return res.status(500).json({ message: '获取学生名单失败' });
            
            // *** 关键修复：统一数据格式为驼峰命名 ***
            responseData.students = students.map(s => ({
                studentId: s.student_id,
                name: s.student_name
            }));

            const resultsSql = `
                SELECT r.student_id, s.student_name, r.draw_key, r.random_number, r.draw_time
                FROM results r
                JOIN students s ON r.student_id = s.student_id
            `;
            db.all(resultsSql, [], (err, results) => {
                if (err) return res.status(500).json({ message: '获取摇号结果失败' });

                results.forEach(row => {
                    if (responseData.draws[row.draw_key]) {
                        responseData.draws[row.draw_key].results.push({
                            studentId: row.student_id,
                            name: row.student_name,
                            number: String(row.random_number).padStart(4, '0'),
                            time: new Date(row.draw_time).toLocaleString('zh-CN')
                        });
                    }
                });

                Object.keys(responseData.draws).forEach(key => {
                    responseData.draws[key].results.sort((a, b) => parseInt(a.number) - parseInt(b.number));
                });

                res.json(responseData);
            });
        });
    });
});


// API 3: 执行摇号 (无改动)
app.post('/api/draw', (req, res) => {
    const { studentId, drawKey } = req.body;
    const ipAddress = req.ip;

    const generateUniqueRandomNumber = (drawKey, callback) => {
        const randomNumber = Math.floor(Math.random() * 10000);
        const checkSql = `SELECT 1 FROM results WHERE draw_key = ? AND random_number = ?`;
        
        db.get(checkSql, [drawKey, randomNumber], (err, row) => {
            if (err) return callback(err);
            if (row) {
                generateUniqueRandomNumber(drawKey, callback);
            } else {
                callback(null, randomNumber);
            }
        });
    };

    generateUniqueRandomNumber(drawKey, (err, randomNumber) => {
        if (err) return res.status(500).json({ success: false, message: '生成随机数失败' });
        const drawTime = new Date().toISOString();
        const insertSql = `INSERT INTO results (student_id, draw_key, random_number, draw_time, ip_address) VALUES (?, ?, ?, ?, ?)`;
        db.run(insertSql, [studentId, drawKey, randomNumber, drawTime, ipAddress], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ success: false, message: '您已经参与过本次摇号了！' });
                }
                return res.status(500).json({ success: false, message: '数据库错误' });
            }
            res.json({ success: true, number: String(randomNumber).padStart(4, '0') });
        });
    });
});

app.listen(PORT, () => {
    console.log(`验菜摇号系统已启动，正在监听 http://localhost:${PORT}`);
});