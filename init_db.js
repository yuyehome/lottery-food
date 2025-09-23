// init_db.js (Corrected Version)
const sqlite3 = require('sqlite3').verbose();

// 1. 删除旧文件时先连接再操作，确保文件句柄被正确处理
const db = new sqlite3.Database('./lottery.db', (err) => {
    if (err) {
        console.error("打开数据库时出错:", err.message);
    } else {
        console.log("成功连接到SQLite数据库。");
    }
});

const students = [
    { id: '1', name: '王沅嘉' }, { id: '2', name: '仇雯萱' }, { id: '3', name: '朱禹萌' },
    { id: '4', name: '余沐熙' }, { id: '5', name: '汪若水' }, { id: '6', name: '张安怡' },
    { id: '7', name: '张馨予' }, { id: '8', name: '周虞' }, { id: '9', name: '孟馨恬' },
    { id: '10', name: '胡皓烟' }, { id: '11', name: '查沁' }, { id: '12', name: '柏姀' },
    { id: '13', name: '袁源' }, { id: '14', name: '徐梓馨' }, { id: '15', name: '葛梓萱' },
    { id: '16', name: '蒋芷祺' }, { id: '17', name: '韩洛灵' }, { id: '18', name: '曾爱马' },
    { id: '19', name: '薛桑妮' }, { id: '20', name: '魏辰璇' }, { id: '21', name: '丁浩桐' },
    { id: '22', name: '丁锦川' }, { id: '23', name: '卫川铭' }, { id: '24', name: '王彦博' },
    { id: '25', name: '王洪涛' }, { id: '26', name: '王恩泽' }, { id: '27', name: '王梓骁' },
    { id: '28', name: '冯子轩' }, { id: '29', name: '朱皓扬' }, { id: '30', name: '刘意' },
    { id: '31', name: '闫允浩' }, { id: '32', name: '闫迦溢' }, { id: '33', name: '李逸宸' },
    { id: '34', name: '吴禹阳' }, { id: '35', name: '汪莫恩' }, { id: '36', name: '张艺缤' },
    { id: '37', name: '张昊然' }, { id: '38', name: '陈恩曦' }, { id: '39', name: '季秋实' },
    { id: '40', name: '封子涵' }, { id: '41', name: '姚轶铭' }, { id: '42', name: '徐嘉瑞' },
    { id: '43', name: '谢浩瑞' }
];

// db.serialize 保证内部的操作是按顺序执行的
db.serialize(() => {
    // 任务1: 创建 students 表
    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL UNIQUE,
            student_name TEXT NOT NULL,
            class_id TEXT NOT NULL DEFAULT 'C103'
        )
    `, (err) => {
        if (err) return console.error("创建 students 表失败:", err.message);
        console.log("表 'students' 创建成功或已存在。");

        // 任务2: 插入学生数据 (在创建成功后执行)
        const stmt = db.prepare("INSERT OR IGNORE INTO students (student_id, student_name) VALUES (?, ?)");
        students.forEach(s => {
            stmt.run(s.id, s.name);
        });
        // finalize() 也有一个回调函数，在所有插入操作完成后触发
        stmt.finalize((err) => {
            if (err) return console.error("插入学生数据失败:", err.message);
            console.log("所有学生名单已成功写入数据库。");
        });
    });

    // 任务3: 创建 results 表
    // 这是我们任务队列中的最后一个操作
    db.run(`
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            draw_key TEXT NOT NULL,
            random_number INTEGER NOT NULL,
            draw_time TEXT NOT NULL,
            ip_address TEXT,
            UNIQUE(student_id, draw_key)
        )
    `, (err) => {
        if (err) return console.error("创建 results 表失败:", err.message);
        console.log("表 'results' 创建成功或已存在.");

        // *** 关键修复 ***
        // 在最后一个操作的回调函数中关闭数据库连接
        // 确保所有之前的任务都已经完成
        db.close((err) => {
            if (err) {
                return console.error("关闭数据库时出错:", err.message);
            }
            console.log('数据库连接已安全关闭。初始化成功！');
        });
    });
});