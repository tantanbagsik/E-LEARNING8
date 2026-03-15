const API_URL = '/api';

let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let quizAnswers = [];
let quizQuestions = {};
let courses = [];
let userProgress = {
    coursesEnrolled: 0,
    quizScores: 0,
    studyTime: 0,
    certificates: 0,
    enrolledCourses: [],
    recentQuizzes: []
};

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API Error');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadCourses();
    await loadQuizQuestions();
    setupEventListeners();
    checkAuth();
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const data = await apiCall('/auth/me');
            currentUser = data.user;
            updateLoginButton();
            await loadDashboard();
        } catch (error) {
            localStorage.removeItem('token');
        }
    }
}

async function loadCourses() {
    try {
        const data = await apiCall('/courses');
        courses = data.courses;
        renderCourses(courses);
    } catch (error) {
        console.error('Failed to load courses:', error);
        showNotification('Failed to load courses', 'error');
    }
}

async function loadQuizQuestions() {
    try {
        const subjects = ['mathematics', 'science', 'history', 'geography'];
        for (const subject of subjects) {
            const data = await apiCall(`/quiz/${subject}`);
            quizQuestions[subject] = data.quiz.questions;
        }
    } catch (error) {
        console.error('Failed to load quiz questions:', error);
    }
}

function renderCourses(coursesList) {
    const coursesGrid = document.getElementById('coursesGrid');
    if (!coursesGrid) return;

    coursesGrid.innerHTML = '';

    coursesList.forEach((course, index) => {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
            <div class="course-image">
                <i class="${course.icon || 'fas fa-book'}"></i>
            </div>
            <div class="course-content">
                <h3 class="course-title">${course.title}</h3>
                <p class="course-description">${course.description || ''}</p>
                <div class="course-meta">
                    <span class="course-level">${course.level || 'Beginner'}</span>
                    <span class="course-duration">
                        <i class="fas fa-clock"></i>
                        ${course.duration || 'N/A'}
                    </span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => enrollInCourse(course));
        coursesGrid.appendChild(card);
        
        setTimeout(() => card.classList.add('fade-in'), index * 100);
    });
}

function setupEventListeners() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', hamburger.classList.contains('active'));
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isRegister = document.getElementById('loginForm').dataset.register === 'true';

    try {
        let data;
        if (isRegister) {
            const name = document.getElementById('name')?.value || email.split('@')[0];
            data = await apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });
        } else {
            data = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        }

        localStorage.setItem('token', data.token);
        currentUser = data.user;
        
        closeLoginModal();
        updateLoginButton();
        
        if (currentUser.role === 'admin') {
            localStorage.setItem('adminToken', data.token);
            showNotification('Welcome Admin!', 'success');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 500);
        } else {
            showNotification(`Welcome${isRegister ? '' : ' back'}!`, 'success');
            setTimeout(() => {
                window.location.href = 'student.html';
            }, 500);
        }
        
        document.getElementById('loginForm').reset();
        document.getElementById('loginForm').dataset.register = 'false';
        
    } catch (error) {
        showNotification(error.message || 'Authentication failed', 'error');
    }
}

function updateLoginButton() {
    const loginBtn = document.querySelector('.login-btn');
    if (!loginBtn) return;
    
    if (currentUser) {
        loginBtn.textContent = currentUser.name;
        loginBtn.onclick = logout;
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.onclick = showLoginModal;
    }
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('email')?.focus(), 100);
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('hidden');
}

async function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    userProgress = {
        coursesEnrolled: 0,
        quizScores: 0,
        studyTime: 0,
        certificates: 0,
        enrolledCourses: [],
        recentQuizzes: []
    };
    updateLoginButton();
    updateDashboard();
    showNotification('Logged out successfully', 'info');
}

function toggleAuthMode(event) {
    event.preventDefault();
    const form = document.getElementById('loginForm');
    const isRegister = form.dataset.register === 'true';
    form.dataset.register = (!isRegister).toString();
    
    document.getElementById('loginTitle').textContent = isRegister ? 'Login to RP-TECH' : 'Register for RP-TECH';
    document.getElementById('authBtn').textContent = isRegister ? 'Login' : 'Register';
    document.getElementById('nameGroup').style.display = isRegister ? 'none' : 'block';
    document.querySelector('.signup-link').innerHTML = isRegister 
        ? 'Don\'t have an account? <a href="#" onclick="toggleAuthMode(event)">Sign up</a>'
        : 'Already have an account? <a href="#" onclick="toggleAuthMode(event)">Login</a>';
}

async function loadDashboard() {
    if (!currentUser) {
        updateDashboard();
        return;
    }

    try {
        const data = await apiCall('/users/dashboard');
        const dashboard = data.dashboard;
        
        userProgress.coursesEnrolled = dashboard.stats.coursesEnrolled;
        userProgress.quizScores = dashboard.stats.quizScores;
        userProgress.studyTime = dashboard.stats.studyTime;
        userProgress.certificates = dashboard.stats.certificates;
        userProgress.enrolledCourses = dashboard.enrolledCourses || [];
        userProgress.recentQuizzes = dashboard.recentQuizzes || [];
        
        updateDashboard();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

function updateDashboard() {
    const coursesEnrolledEl = document.getElementById('coursesEnrolled');
    const quizScoresEl = document.getElementById('quizScores');
    const studyTimeEl = document.getElementById('studyTime');
    const certificatesEl = document.getElementById('certificates');
    const progressListEl = document.getElementById('progressList');

    if (coursesEnrolledEl) coursesEnrolledEl.textContent = userProgress.coursesEnrolled;
    if (quizScoresEl) quizScoresEl.textContent = userProgress.quizScores + '%';
    if (studyTimeEl) studyTimeEl.textContent = userProgress.studyTime + 'h';
    if (certificatesEl) certificatesEl.textContent = userProgress.certificates;

    if (progressListEl) {
        if (userProgress.enrolledCourses.length === 0) {
            progressListEl.innerHTML = '<p style="text-align: center; color: #718096;">No courses enrolled yet. Browse our courses to get started!</p>';
        } else {
            progressListEl.innerHTML = userProgress.enrolledCourses.map(enrollment => `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="progress-title">${enrollment.courses?.title || 'Course'}</span>
                        <span class="progress-percentage">${enrollment.progress || 0}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${enrollment.progress || 0}%"></div>
                    </div>
                </div>
            `).join('');
        }
    }
}

function filterCourses(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    
    const clickedBtn = event.target.closest('.filter-btn');
    if (clickedBtn) {
        clickedBtn.classList.add('active');
        clickedBtn.setAttribute('aria-pressed', 'true');
    }

    const filtered = category === 'all' 
        ? courses 
        : courses.filter(c => c.category === category);
    
    renderCourses(filtered);
}

async function enrollInCourse(course) {
    if (!currentUser) {
        showLoginModal();
        return;
    }

    try {
        await apiCall(`/users/enroll/${course.id}`, {
            method: 'POST'
        });
        showNotification(`Enrolled in ${course.title}!`, 'success');
        await loadDashboard();
    } catch (error) {
        if (error.message.includes('Already enrolled')) {
            showNotification('Already enrolled in this course', 'info');
        } else {
            showNotification(error.message || 'Failed to enroll', 'error');
        }
    }
}

async function startQuiz(subject) {
    currentQuiz = subject;
    currentQuestionIndex = 0;
    quizAnswers = [];
    
    const questions = quizQuestions[subject];
    if (!questions) {
        showNotification('Quiz not available', 'error');
        return;
    }
    
    document.getElementById('quizTitle').textContent = `${subject.charAt(0).toUpperCase() + subject.slice(1)} Quiz`;
    document.getElementById('totalQuestions').textContent = questions.length;
    
    document.getElementById('quizSelection').classList.add('hidden');
    document.getElementById('quizQuestions').classList.remove('hidden');
    document.getElementById('quizResults').classList.add('hidden');
    
    loadQuestion();
}

function loadQuestion() {
    const questions = quizQuestions[currentQuiz];
    const question = questions[currentQuestionIndex];
    
    document.getElementById('questionNumber').textContent = currentQuestionIndex + 1;
    
    const questionContainer = document.getElementById('questionContainer');
    questionContainer.innerHTML = `
        <div class="question-text">${question.question}</div>
        <div class="question-options">
            ${question.options.map((option, index) => `
                <label class="option-label">
                    <input type="radio" name="answer" value="${index}">
                    <span>${option}</span>
                </label>
            `).join('')}
        </div>
    `;
    
    document.querySelectorAll('.option-label').forEach(label => {
        label.addEventListener('click', function() {
            document.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });
    
    const questionsLength = questions.length;
    document.getElementById('prevBtn').style.display = currentQuestionIndex === 0 ? 'none' : 'block';
    document.getElementById('nextBtn').style.display = currentQuestionIndex === questionsLength - 1 ? 'none' : 'block';
    document.getElementById('submitBtn').style.display = currentQuestionIndex === questionsLength - 1 ? 'block' : 'none';
}

function nextQuestion() {
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    if (!selectedOption) {
        showNotification('Please select an answer', 'warning');
        return;
    }
    
    quizAnswers[currentQuestionIndex] = parseInt(selectedOption.value);
    currentQuestionIndex++;
    
    if (currentQuestionIndex < quizQuestions[currentQuiz].length) {
        loadQuestion();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
        
        if (quizAnswers[currentQuestionIndex] !== undefined) {
            const options = document.querySelectorAll('input[name="answer"]');
            options[quizAnswers[currentQuestionIndex]].checked = true;
            options[quizAnswers[currentQuestionIndex]].parentElement.classList.add('selected');
        }
    }
}

async function submitQuiz() {
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    if (!selectedOption) {
        showNotification('Please select an answer', 'warning');
        return;
    }
    
    quizAnswers[currentQuestionIndex] = parseInt(selectedOption.value);
    
    const questions = quizQuestions[currentQuiz];
    let correctCount = 0;
    
    for (let i = 0; i < questions.length; i++) {
        if (quizAnswers[i] === questions[i].correct) {
            correctCount++;
        }
    }
    
    const percentage = Math.round((correctCount / questions.length) * 100);
    
    showQuizResults(correctCount, questions.length, percentage);
    
    if (currentUser) {
        try {
            await apiCall('/users/quiz-result', {
                method: 'POST',
                body: JSON.stringify({
                    quiz: currentQuiz,
                    score: correctCount,
                    totalQuestions: questions.length
                })
            });
            await loadDashboard();
        } catch (error) {
            console.error('Failed to save quiz result:', error);
        }
    }
}

function showQuizResults(correct, total, percentage) {
    document.getElementById('quizQuestions').classList.add('hidden');
    document.getElementById('quizResults').classList.remove('hidden');
    
    let message = '';
    if (percentage >= 80) {
        message = `Excellent! You got ${correct} out of ${total} questions correct (${percentage}%)`;
    } else if (percentage >= 60) {
        message = `Good job! You got ${correct} out of ${total} questions correct (${percentage}%)`;
    } else {
        message = `You got ${correct} out of ${total} questions correct (${percentage}%). Keep practicing!`;
    }
    
    document.getElementById('scoreMessage').textContent = message;
}

function resetQuiz() {
    currentQuiz = null;
    currentQuestionIndex = 0;
    quizAnswers = [];
    
    document.getElementById('quizSelection').classList.remove('hidden');
    document.getElementById('quizQuestions').classList.add('hidden');
    document.getElementById('quizResults').classList.add('hidden');
    document.getElementById('quizTitle').textContent = 'Select a Quiz';
    document.getElementById('questionNumber').textContent = '0';
    document.getElementById('totalQuestions').textContent = '0';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = document.createElement('i');
    icon.className = `fas ${getNotificationIcon(type)}`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(text);
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${getNotificationColor(type)};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', info: 'fa-info-circle' };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = { success: '#48bb78', warning: '#f6ad55', error: '#fc8181', info: '#667eea' };
    return colors[type] || colors.info;
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

window.filterCourses = filterCourses;
window.startQuiz = startQuiz;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.submitQuiz = submitQuiz;
window.resetQuiz = resetQuiz;
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.toggleAuthMode = toggleAuthMode;
