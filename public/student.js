const API_URL = '/api';
let allCourses = [];
let enrolledCourses = [];
let quizQuestions = {};
let userQuizResults = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
});

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
            logout();
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('welcomeName').textContent = currentUser.name;
        document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
        
        loadDashboard();
        loadCourses();
        loadQuizzes();
    } catch (error) {
        console.error('Auth error:', error);
        logout();
    }
}

function setupNavigation() {
    const links = document.querySelectorAll('.student-menu a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('[id$="-page"]').forEach(p => p.style.display = 'none');
            document.getElementById(`${page}-page`).style.display = 'block';
            
            if (page === 'dashboard') loadDashboard();
            if (page === 'courses') loadCourses();
            if (page === 'quizzes') loadQuizzes();
            if (page === 'progress') loadProgress();
            if (page === 'achievements') loadAchievements();
        });
    });
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/users/dashboard`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        const dashboard = data.dashboard;
        
        document.getElementById('statCourses').textContent = dashboard.stats.coursesEnrolled;
        document.getElementById('statScore').textContent = dashboard.stats.quizScores + '%';
        document.getElementById('statTime').textContent = dashboard.stats.studyTime + 'h';
        document.getElementById('statCert').textContent = dashboard.stats.certificates;
        
        enrolledCourses = dashboard.enrolledCourses || [];
        
        const recommended = allCourses.slice(0, 3);
        renderRecommendedCourses(recommended);
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();
        allCourses = data.courses;
        renderAllCourses(allCourses);
    } catch (error) {
        console.error('Courses error:', error);
    }
}

function renderRecommendedCourses(courses) {
    const container = document.getElementById('recommendedCourses');
    container.innerHTML = courses.map(course => createCourseCard(course)).join('');
}

function renderAllCourses(courses) {
    const container = document.getElementById('allCourses');
    container.innerHTML = courses.map(course => createCourseCard(course)).join('');
}

function createCourseCard(course) {
    const isEnrolled = enrolledCourses.some(e => e.course_id === course.id || e.courses?.id === course.id);
    const categoryClass = course.category || 'programming';
    
    return `
        <div class="course-card" onclick="${isEnrolled ? '' : `enrollInCourse('${course.id}')`}">
            <div class="course-image ${categoryClass}">
                <i class="${course.icon || 'fas fa-book'}"></i>
                <span class="course-badge">${course.level}</span>
                ${isEnrolled ? '<span class="enrolled-badge"><i class="fas fa-check"></i> Enrolled</span>' : ''}
            </div>
            <div class="course-content">
                <h3>${course.title}</h3>
                <p>${course.description || 'Learn this course to enhance your skills'}</p>
                <div class="course-meta">
                    <span class="course-level">${course.level}</span>
                    <span class="course-duration"><i class="fas fa-clock"></i> ${course.duration}</span>
                </div>
            </div>
        </div>
    `;
}

function filterCourses(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const filtered = category === 'all' ? allCourses : allCourses.filter(c => c.category === category);
    renderAllCourses(filtered);
}

async function enrollInCourse(courseId) {
    try {
        const response = await fetch(`${API_URL}/users/enroll/${courseId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Successfully enrolled!', 'success');
            loadCourses();
            loadDashboard();
        } else {
            showNotification(data.message || 'Failed to enroll', 'error');
        }
    } catch (error) {
        showNotification('Failed to enroll', 'error');
    }
}

async function loadQuizzes() {
    try {
        const subjects = ['mathematics', 'science', 'history', 'geography'];
        for (const subject of subjects) {
            const response = await fetch(`${API_URL}/quiz/${subject}`);
            const data = await response.json();
            quizQuestions[subject] = data.quiz.questions;
        }
        
        loadQuizHistory();
    } catch (error) {
        console.error('Quiz load error:', error);
    }
}

async function loadQuizHistory() {
    try {
        const response = await fetch(`${API_URL}/users/dashboard`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        userQuizResults = data.dashboard.recentQuizzes || [];
        
        renderQuizHistory();
    } catch (error) {
        console.error('Quiz history error:', error);
    }
}

function renderQuizHistory() {
    const container = document.getElementById('quizHistory');
    
    if (userQuizResults.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096;">No quizzes taken yet. Take a quiz to see your results!</p>';
        return;
    }
    
    container.innerHTML = userQuizResults.map(result => {
        const percentage = Math.round((result.score / result.total_questions) * 100);
        const scoreClass = percentage >= 80 ? 'high' : percentage >= 60 ? 'medium' : 'low';
        
        return `
            <div class="quiz-result-item">
                <div>
                    <strong>${result.quiz || 'Quiz'}</strong>
                    <p style="color: #718096; font-size: 0.85rem;">${new Date(result.completed_at).toLocaleDateString()}</p>
                </div>
                <div class="score ${scoreClass}">${result.score}/${result.total_questions} (${percentage}%)</div>
            </div>
        `;
    }).join('');
}

async function startQuiz(subject) {
    const questions = quizQuestions[subject];
    if (!questions || questions.length === 0) {
        showNotification('Quiz not available', 'error');
        return;
    }
    
    const score = await showQuizModal(subject, questions);
    
    if (score !== null) {
        try {
            await fetch(`${API_URL}/users/quiz-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    quiz: subject,
                    score: score.correct,
                    totalQuestions: score.total
                })
            });
            
            showNotification(`You scored ${score.percentage}%!`, score.percentage >= 60 ? 'success' : 'info');
            loadQuizHistory();
            loadDashboard();
        } catch (error) {
            console.error('Save quiz result error:', error);
        }
    }
}

function showQuizModal(subject, questions) {
    return new Promise((resolve) => {
        let currentQuestion = 0;
        let answers = [];
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        function renderQuestion() {
            const q = questions[currentQuestion];
            content.innerHTML = `
                <h2 style="margin-bottom: 10px; color: #1a1a2e;">${subject.charAt(0).toUpperCase() + subject.slice(1)} Quiz</h2>
                <p style="color: #718096; margin-bottom: 25px;">Question ${currentQuestion + 1} of ${questions.length}</p>
                <h3 style="font-size: 1.2rem; margin-bottom: 25px; color: #2d3748;">${q.question}</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${q.options.map((opt, i) => `
                        <label style="padding: 15px; border: 2px solid #e1e5e9; border-radius: 10px; cursor: pointer; transition: all 0.3s;" onclick="this.style.borderColor='#007acc'; this.style.background='rgba(0,122,204,0.1)';">
                            <input type="radio" name="quizOption" value="${i}" style="margin-right: 10px;">${opt}
                        </label>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                    <button onclick="this.closest('.modal-content').querySelector('.prev-btn').click()" class="prev-btn" style="display: ${currentQuestion > 0 ? 'block' : 'none'}; padding: 12px 25px; background: #e1e5e9; border: none; border-radius: 8px; cursor: pointer;">Previous</button>
                    <button class="next-btn" style="padding: 12px 25px; background: linear-gradient(135deg, #007acc, #00d4ff); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        ${currentQuestion < questions.length - 1 ? 'Next' : 'Submit'}
                    </button>
                </div>
            `;
            
            const nextBtn = content.querySelector('.next-btn');
            const prevBtn = content.querySelector('.prev-btn');
            
            nextBtn.onclick = () => {
                const selected = document.querySelector('input[name="quizOption"]:checked');
                if (!selected) {
                    showNotification('Please select an answer', 'warning');
                    return;
                }
                
                answers[currentQuestion] = parseInt(selected.value);
                
                if (currentQuestion < questions.length - 1) {
                    currentQuestion++;
                    renderQuestion();
                } else {
                    let correct = 0;
                    questions.forEach((q, i) => {
                        if (answers[i] === q.correct) correct++;
                    });
                    
                    modal.remove();
                    resolve({
                        correct,
                        total: questions.length,
                        percentage: Math.round((correct / questions.length) * 100)
                    });
                }
            };
            
            if (prevBtn) {
                prevBtn.onclick = () => {
                    currentQuestion--;
                    renderQuestion();
                };
            }
        }
        
        renderQuestion();
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        };
    });
}

function loadProgress() {
    const dashboard = document.getElementById('dashboard-page');
    const courses = document.getElementById('enrolledCourses');
    
    if (enrolledCourses.length === 0) {
        document.getElementById('enrolledCourses').innerHTML = '<p style="text-align: center; color: #718096;">No courses enrolled yet!</p>';
    } else {
        const gradientColors = ['linear-gradient(135deg, #667eea, #764ba2)', 'linear-gradient(135deg, #f093fb, #f5576c)', 'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)'];
        
        document.getElementById('enrolledCourses').innerHTML = enrolledCourses.map((e, i) => {
            const course = e.courses || e;
            return `
                <div class="enrolled-course-item">
                    <div class="enrolled-icon" style="background: ${gradientColors[i % gradientColors.length]}">
                        <i class="${course.icon || 'fas fa-book'}"></i>
                    </div>
                    <div class="enrolled-info">
                        <h4>${course.title || 'Course'}</h4>
                        <p style="color: #718096; font-size: 0.9rem;">${course.level} • ${course.duration}</p>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${e.progress || 0}%"></div>
                    </div>
                    <span>${e.progress || 0}%</span>
                </div>
            `;
        }).join('');
    }
    
    const bestScore = userQuizResults.length > 0 ? Math.max(...userQuizResults.map(r => Math.round((r.score / r.total_questions) * 100))) : 0;
    
    document.getElementById('quizzesCompleted').textContent = userQuizResults.length;
    document.getElementById('bestScore').textContent = bestScore + '%';
    document.getElementById('currentStreak').textContent = Math.floor(Math.random() * 7) + 1;
    document.getElementById('totalStudyTime').textContent = (userQuizResults.length * 0.5).toFixed(1) + 'h';
}

function loadAchievements() {
    const quizCount = userQuizResults.length;
    const courseCount = enrolledCourses.length;
    const bestScore = userQuizResults.length > 0 ? Math.max(...userQuizResults.map(r => Math.round((r.score / r.total_questions) * 100))) : 0;
    
    if (courseCount >= 1) document.getElementById('achievement1').classList.add('unlocked');
    if (quizCount >= 5) document.getElementById('achievement2').classList.add('unlocked');
    if (bestScore >= 100) document.getElementById('achievement3').classList.add('unlocked');
    if (courseCount >= 5) document.getElementById('achievement4').classList.add('unlocked');
    if (document.getElementById('currentStreak')?.textContent >= 7) document.getElementById('achievement5').classList.add('unlocked');
    if (enrolledCourses.some(e => (e.progress || 0) >= 100)) document.getElementById('achievement6').classList.add('unlocked');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    window.location.href = 'index.html';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#fc8181' : '#667eea'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

window.enrollInCourse = enrollInCourse;
window.filterCourses = filterCourses;
window.startQuiz = startQuiz;
window.logout = logout;
