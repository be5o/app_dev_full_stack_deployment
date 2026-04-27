const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (
            origin === 'http://localhost:3000' ||
            origin === process.env.FRONTEND_URL ||
            origin.endsWith('.vercel.app')
        ) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy violation'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

app.get('/', (req, res) => {
    return res.json({ message: 'Backend is running!', timestamp: new Date().toISOString() });
});

app.get('/student', async (req, res) => {
    try {
        const { data, error } = await supabase.from('student').select('*').order('id');
        if (error) throw error;
        return res.json(data);
    } catch (error) {
        console.error('Error fetching students:', error.message);
        return res.status(500).json({ error: 'Error fetching students' });
    }
});

app.get('/teacher', async (req, res) => {
    try {
        const { data, error } = await supabase.from('teacher').select('*').order('id');
        if (error) throw error;
        return res.json(data);
    } catch (error) {
        console.error('Error fetching teachers:', error.message);
        return res.status(500).json({ error: 'Error fetching teachers' });
    }
});

app.post('/addstudent', async (req, res) => {
    try {
        const { name, rollNo, class: studentClass } = req.body;
        if (!name || !rollNo || !studentClass) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { data, error } = await supabase
            .from('student')
            .insert({ name, roll_number: rollNo, class: studentClass })
            .select()
            .single();
        if (error) throw error;
        return res.json({ message: 'Student added successfully', studentId: data.id });
    } catch (error) {
        console.error('Error adding student:', error.message);
        return res.status(500).json({ error: 'Error inserting student' });
    }
});

app.post('/addteacher', async (req, res) => {
    try {
        const { name, subject, class: teacherClass } = req.body;
        if (!name || !subject || !teacherClass) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { data, error } = await supabase
            .from('teacher')
            .insert({ name, subject, class: teacherClass })
            .select()
            .single();
        if (error) throw error;
        return res.json({ message: 'Teacher added successfully', teacherId: data.id });
    } catch (error) {
        console.error('Error adding teacher:', error.message);
        return res.status(500).json({ error: 'Error inserting teacher' });
    }
});

app.delete('/student/:id', async (req, res) => {
    const studentId = parseInt(req.params.id);
    try {
        const { error } = await supabase.from('student').delete().eq('id', studentId);
        if (error) throw error;
        return res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error.message);
        return res.status(500).json({ error: 'Error deleting student' });
    }
});

app.delete('/teacher/:id', async (req, res) => {
    const teacherId = parseInt(req.params.id);
    try {
        const { error } = await supabase.from('teacher').delete().eq('id', teacherId);
        if (error) throw error;
        return res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Error deleting teacher:', error.message);
        return res.status(500).json({ error: 'Error deleting teacher' });
    }
});

const PORT = process.env.PORT || 3500;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
