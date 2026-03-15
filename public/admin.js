const API_URL = '/api';
let allUsers = [];
let allCourses = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupDragAndDrop();
    setupCourseForm();
});

async function checkAuth() {
    const token = localStorage.getItem('adminToken');
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
        
        if (currentUser.role !== 'admin') {
            showNotification('Access denied. Admin only.', 'error');
            logout();
            return;
        }
        
        document.getElementById('admin-name').textContent = `Welcome, ${currentUser.name}`;
        loadDashboard();
    } catch (error) {
        console.error('Auth error:', error);
        logout();
    }
}

function setupNavigation() {
    const menuLinks = document.querySelectorAll('.admin-menu a[data-page]');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.admin-page').forEach(p => p.style.display = 'none');
            document.getElementById(`${page}-page`).style.display = 'block';
            
            if (page === 'dashboard') loadDashboard();
            if (page === 'users') loadAllUsers();
            if (page === 'courses') loadAllCourses();
            if (page === 'analytics') loadAnalytics();
        });
    });
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/users/admin/dashboard`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load dashboard');
        
        const data = await response.json();
        const dashboard = data.adminDashboard;
        
        document.getElementById('total-users').textContent = dashboard.stats.totalUsers || 0;
        document.getElementById('total-students').textContent = dashboard.stats.totalUsers || 0;
        document.getElementById('total-courses').textContent = allCourses.length || 0;
        
        renderRecentUsers(dashboard.topStudents || []);
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadAllUsers() {
    try {
        const response = await fetch(`${API_URL}/users/admin/users`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const data = await response.json();
        allUsers = data.users;
        renderAllUsers(data.users);
    } catch (error) {
        console.error('Users error:', error);
        showNotification('Failed to load users', 'error');
    }
}

function renderAllUsers(users) {
    const tbody = document.getElementById('all-users');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role}">${user.role}</span></td>
            <td>0</td>
            <td>0%</td>
            <td>0h</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-edit" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderRecentUsers(users) {
    const tbody = document.getElementById('recent-users');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role}">${user.role}</span></td>
            <td>${user.enrollments?.length || 0}</td>
            <td>0%</td>
        </tr>
    `).join('');
}

async function loadAllCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();
        allCourses = data.courses;
        renderAllCourses(data.courses);
    } catch (error) {
        console.error('Courses error:', error);
    }
}

function renderAllCourses(courses) {
    const tbody = document.getElementById('all-courses');
    tbody.innerHTML = courses.map(course => `
        <tr>
            <td>${course.title}</td>
            <td><span class="badge badge-student">${course.category}</span></td>
            <td>${course.level}</td>
            <td>${course.duration}</td>
            <td>0</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-edit" onclick="editCourse('${course.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteCourse('${course.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/users/admin/dashboard`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        
        const data = await response.json();
        
        document.getElementById('quiz-completed').textContent = '0';
        document.getElementById('total-study-time').textContent = '0h';
        document.getElementById('top-score').textContent = '0%';
        document.getElementById('active-today').textContent = data.adminDashboard.stats.activeUsers || 0;
    } catch (error) {
        console.error('Analytics error:', error);
    }
}

function setupCourseForm() {
    const form = document.getElementById('courseForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const courseData = {
            title: document.getElementById('courseTitle').value,
            description: document.getElementById('courseDescription').value,
            category: document.getElementById('courseCategory').value,
            level: document.getElementById('courseLevel').value,
            duration: document.getElementById('courseDuration').value,
            icon: document.getElementById('courseIcon').value
        };
        
        try {
            const response = await fetch(`${API_URL}/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(courseData)
            });
            
            if (!response.ok) throw new Error('Failed to create course');
            
            showNotification('Course created successfully!', 'success');
            form.reset();
            loadAllCourses();
        } catch (error) {
            showNotification('Failed to create course', 'error');
        }
    });
}

function setupDragAndDrop() {
    const container = document.getElementById('carouselContainer');
    const items = container.querySelectorAll('.carousel-item');
    
    let draggedItem = null;
    
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
            updateCarouselPreview();
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItem && draggedItem !== item) {
                const allItems = [...container.querySelectorAll('.carousel-item')];
                const draggedIndex = allItems.indexOf(draggedItem);
                const dropIndex = allItems.indexOf(item);
                
                if (draggedIndex < dropIndex) {
                    item.after(draggedItem);
                } else {
                    item.before(draggedItem);
                }
            }
        });
    });
    
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('drag-over');
    });
    
    container.addEventListener('dragleave', () => {
        container.classList.remove('drag-over');
    });
    
    container.addEventListener('drop', () => {
        container.classList.remove('drag-over');
    });
}

function addCarouselItem() {
    const container = document.getElementById('carouselContainer');
    const id = Date.now();
    const newItem = document.createElement('div');
    newItem.className = 'carousel-item';
    newItem.draggable = true;
    newItem.dataset.id = id;
    newItem.innerHTML = `
        <span><i class="fas fa-plus"></i> New Slide</span>
        <i class="fas fa-grip-lines"></i>
    `;
    
    setupDragAndDrop();
    container.appendChild(newItem);
    updateCarouselPreview();
}

function updateCarouselPreview() {
    const container = document.getElementById('carouselContainer');
    const preview = document.getElementById('carouselPreview');
    const items = container.querySelectorAll('.carousel-item');
    
    const gradients = [
        'linear-gradient(135deg, #00d4ff, #007acc)',
        'linear-gradient(135deg, #48bb78, #38a169)',
        'linear-gradient(135deg, #ed8936, #dd6b20)',
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #fc8181, #e53e3e)'
    ];
    
    preview.innerHTML = [...items].map((item, index) => `
        <div class="preview-slide" style="background: ${gradients[index % gradients.length]}">
            Slide ${index + 1}: ${item.querySelector('span').textContent}
        </div>
    `).join('');
}

function showCourseBuilder() {
    document.querySelectorAll('.admin-menu a').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-page="builder"]').classList.add('active');
    document.querySelectorAll('.admin-page').forEach(p => p.style.display = 'none');
    document.getElementById('builder-page').style.display = 'block';
}

function editUser(userId) {
    showNotification('Edit user functionality coming soon', 'info');
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        showNotification('Delete user functionality coming soon', 'info');
    }
}

function editCourse(courseId) {
    showNotification('Edit course functionality coming soon', 'info');
}

function deleteCourse(courseId) {
    if (confirm('Are you sure you want to delete this course?')) {
        showNotification('Delete course functionality coming soon', 'info');
    }
}

function refreshUsers() {
    loadAllUsers();
    showNotification('Users refreshed', 'success');
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#fc8181' : '#667eea'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
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

window.editUser = editUser;
window.deleteUser = deleteUser;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.refreshUsers = refreshUsers;
window.logout = logout;
window.showCourseBuilder = showCourseBuilder;
window.addCarouselItem = addCarouselItem;
