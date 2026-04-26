const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { createPool } = require('mysql2/promise');

const app = express();
app.use(express.json());

// ============================================
// CORS CONFIGURATION
// ============================================
// Add your Vercel frontend URL here (after deployment)
const allowedOrigins = [
    'http://localhost:3000',  // Local development
    process.env.FRONTEND_URL  // Production URL from Railway env vars
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================
// DATABASE CONNECTION
// ============================================
// Railway provides DATABASE_URL automatically when you add MySQL
// OR you can use individual env vars (set these in Railway dashboard)

const dbConfig = {
    // Option 1: Use Railway's auto-generated DATABASE_URL (RECOMMENDED)
    uri: process.env.DATABASE_URL,
    
    // // // Option 2: Use individual environment variables (fallback)
    // // // Set these in Railway → Variables tab:
    // // // MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
    // // host: process.env.MYSQL_HOST || 'localhost',
    // // user: process.env.MYSQL_USER || 'root',
    // // password: process.env.MYSQL_PASSWORD || '',
    // // database: process.env.MYSQL_DATABASE || 'school',
    
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
};

// Create connection pool - tries DATABASE_URL first, then individual vars
const db = createPool(
    dbConfig.uri ? dbConfig.uri : {
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        connectionLimit: dbConfig.connectionLimit,
        waitForConnections: dbConfig.waitForConnections,
        queueLimit: dbConfig.queueLimit
    }
);

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await db.end();
    process.exit(0);
});

// ============================================
// HELPER FUNCTIONS
// ============================================
const getLastStudentID = async () => {
    const [result] = await db.query('SELECT MAX(id) AS lastID FROM student');
    return result[0].lastID || 0;
};

const getLastTeacherID = async () => {
    const [result] = await db.query('SELECT MAX(id) AS lastID FROM teacher');
    return result[0].lastID || 0;
};

// ============================================
// ROUTES
// ============================================

// Health check & root endpoint
app.get('/', async (req, res) => {
    try {
        const [data] = await db.query("SELECT * FROM student");
        return res.json({ 
            message: "Backend is running! 🚀", 
            studentData: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching student data:', error);
        return res.status(500).json({ error: 'Error fetching student data' });
    }
});

// Get all students
app.get('/student', async (req, res) => {
    try {
        const [data] = await db.query("SELECT * FROM student ORDER BY id");
        return res.json(data);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error fetching students' });
    }
});

// Get all teachers
app.get('/teacher', async (req, res) => {
    try {
        const [data] = await db.query("SELECT * FROM teacher ORDER BY id");
        return res.json(data);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error fetching teachers' });
    }
});

// Add new student
app.post('/addstudent', async (req, res) => {
    try {
        const { name, rollNo, class: studentClass } = req.body;
        
        // Validate input
        if (!name || !rollNo || !studentClass) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const lastStudentID = await getLastStudentID();
        const nextStudentID = lastStudentID + 1;

        const sql = `INSERT INTO student (id, name, roll_number, class) VALUES (?, ?, ?, ?)`;
        await db.query(sql, [nextStudentID, name, rollNo, studentClass]);
        
        return res.json({ 
            message: 'Student added successfully',
            studentId: nextStudentID
        });
    } catch (error) {
        console.error('Error adding student:', error);
        return res.status(500).json({ error: 'Error inserting data' });
    }
});

// Add new teacher
app.post('/addteacher', async (req, res) => {
    try {
        const { name, subject, class: teacherClass } = req.body;
        
        // Validate input
        if (!name || !subject || !teacherClass) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const lastTeacherID = await getLastTeacherID();
        const nextTeacherID = lastTeacherID + 1;

        const sql = `INSERT INTO teacher (id, name, subject, class) VALUES (?, ?, ?, ?)`;
        await db.query(sql, [nextTeacherID, name, subject, teacherClass]);
        
        return res.json({ 
            message: 'Teacher added successfully',
            teacherId: nextTeacherID
        });
    } catch (error) {
        console.error('Error adding teacher:', error);
        return res.status(500).json({ error: 'Error inserting data' });
    }
});

// Delete student
app.delete('/student/:id', async (req, res) => {
    const studentId = req.params.id;
    const sqlDelete = 'DELETE FROM student WHERE id = ?';
    const sqlSelect = 'SELECT id FROM student ORDER BY id';

    try {
        await db.query(sqlDelete, [studentId]);

        const [rows] = await db.query(sqlSelect);

        const updatePromises = rows.map(async (row, index) => {
            const newId = index + 1;
            await db.query('UPDATE student SET id = ? WHERE id = ?', [newId, row.id]);
        });

        await Promise.all(updatePromises);
        return res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        return res.status(500).json({ error: 'Error deleting student' });
    }
});

// Delete teacher
app.delete('/teacher/:id', async (req, res) => {
    const teacherID = req.params.id;
    const sqlDelete = 'DELETE FROM teacher WHERE id = ?';
    const sqlSelect = 'SELECT id FROM teacher ORDER BY id';

    try {
        await db.query(sqlDelete, [teacherID]);

        const [rows] = await db.query(sqlSelect);

        const updatePromises = rows.map(async (row, index) => {
            const newId = index + 1;
            await db.query('UPDATE teacher SET id = ? WHERE id = ?', [newId, row.id]);
        });

        await Promise.all(updatePromises);
        return res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        return res.status(500).json({ error: 'Error deleting teacher' });
    }
});

// ============================================
// START SERVER
// ============================================
// IMPORTANT: Use process.env.PORT for Railway deployment
// Railway will set this automatically
const PORT = process.env.PORT || 3500;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});