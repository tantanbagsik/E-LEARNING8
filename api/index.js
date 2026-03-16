require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const supabase = require('./config');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'rptech123', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Auth Routes
const authRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashedPassword, role: role || 'student' }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const authLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const authMe = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rptech123');

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Courses Routes
const getCourses = async (req, res) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true);

    if (error) throw error;

    res.json({ success: true, courses: courses || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCourse = async (req, res) => {
  try {
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Quiz Routes
const quizQuestions = {
  mathematics: [
    { question: 'What is 15 × 8?', options: ['120', '110', '115', '125'], correct: 0 },
    { question: 'What is the square root of 144?', options: ['10', '11', '12', '13'], correct: 2 },
    { question: 'What is 25% of 80?', options: ['15', '20', '25', '30'], correct: 1 }
  ],
  science: [
    { question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 },
    { question: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1 },
    { question: 'What is the speed of light?', options: ['299,792 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'], correct: 0 }
  ],
  history: [
    { question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correct: 2 },
    { question: 'Who was the first President of the US?', options: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Benjamin Franklin'], correct: 1 },
    { question: 'Which ancient wonder still stands today?', options: ['Colossus of Rhodes', 'Hanging Gardens', 'Great Pyramid of Giza', 'Lighthouse of Alexandria'], correct: 2 }
  ],
  geography: [
    { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correct: 2 },
    { question: 'Which is the longest river?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correct: 1 },
    { question: 'How many continents are there?', options: ['5', '6', '7', '8'], correct: 2 }
  ]
};

const getQuiz = async (req, res) => {
  try {
    const { subject } = req.params;
    const questions = quizQuestions[subject];

    if (!questions) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({
      success: true,
      quiz: {
        title: `${subject.charAt(0).toUpperCase() + subject.slice(1)} Quiz`,
        subject,
        questions: questions.map(q => ({ question: q.question, options: q.options }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard Routes
const userDashboard = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rptech123');

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('user_id', decoded.id);

    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', decoded.id)
      .order('completed_at', { ascending: false })
      .limit(5);

    const avgScore = quizResults?.length > 0
      ? Math.round(quizResults.reduce((acc, q) => acc + (q.score / q.total_questions * 100), 0) / quizResults.length)
      : 0;

    res.json({
      success: true,
      dashboard: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        stats: {
          coursesEnrolled: enrollments?.length || 0,
          quizScores: avgScore,
          studyTime: user.study_time || 0,
          certificates: 0
        },
        enrolledCourses: enrollments || [],
        recentQuizzes: quizResults || []
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const enrollCourse = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rptech123');

    const { error } = await supabase
      .from('enrollments')
      .insert([{ user_id: decoded.id, course_id: req.params.courseId, progress: 0 }]);

    if (error?.message?.includes('duplicate')) {
      return res.status(400).json({ message: 'Already enrolled' });
    }

    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveQuizResult = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rptech123');
    const { quiz, score, totalQuestions } = req.body;

    await supabase
      .from('quiz_results')
      .insert([{ user_id: decoded.id, quiz, score, total_questions: totalQuestions }]);

    res.json({ success: true, message: 'Quiz result saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Vercel Handler
module.exports = async (req, res) => {
  const { url } = req;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Auth routes
    if (url === '/api/auth/register' && req.method === 'POST') {
      return authRegister(req, res);
    }
    if (url === '/api/auth/login' && req.method === 'POST') {
      return authLogin(req, res);
    }
    if (url === '/api/auth/me' && req.method === 'GET') {
      return authMe(req, res);
    }

    // Courses routes
    if (url === '/api/courses' && req.method === 'GET') {
      return getCourses(req, res);
    }
    if (url.match(/^\/api\/courses\/[^\/]+$/) && req.method === 'GET') {
      const id = url.split('/').pop();
      req.params.id = id;
      return getCourse(req, res);
    }

    // Quiz routes
    if (url.match(/^\/api\/quiz\/[^\/]+$/) && req.method === 'GET') {
      const subject = url.split('/').pop();
      req.params.subject = subject;
      return getQuiz(req, res);
    }

    // User routes
    if (url === '/api/users/dashboard' && req.method === 'GET') {
      return userDashboard(req, res);
    }
    if (url.match(/^\/api\/users\/enroll\/[^\/]+$/) && req.method === 'POST') {
      const courseId = url.split('/').pop();
      req.params.courseId = courseId;
      return enrollCourse(req, res);
    }
    if (url === '/api/users/quiz-result' && req.method === 'POST') {
      return saveQuizResult(req, res);
    }

    // Health check
    if (url === '/api/health') {
      return res.json({ status: 'ok', message: 'RP-TECH API running' });
    }

    // 404
    res.status(404).json({ message: 'Not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
