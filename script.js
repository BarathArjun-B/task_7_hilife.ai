// ===== GLOBAL VARIABLES =====
let currentTimerInterval = null;
const USERS_KEY = 'clockinout_users';
const CURRENT_USER_KEY = 'clockinout_current_user';
const TIMER_DATA_KEY = 'clockinout_timer_data';
const WORK_HISTORY_KEY = 'clockinout_work_history';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const currentUser = getCurrentUser();
    
    if (currentUser) {
        // User is logged in, show dashboard
        showDashboard();
        restoreTimerState();
        updateTimerDisplay();
        // Update timer every second
        startTimerInterval();
    } else {
        // Show login/register forms
        showRegisterForm();
    }
    
    // Attach event listeners
    attachEventListeners();
}

// ===== EVENT LISTENERS =====
function attachEventListeners() {
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Toggle between register and login
    document.getElementById('goToLogin').addEventListener('click', function() {
        showLoginForm();
        clearMessages();
    });
    
    document.getElementById('goToRegister').addEventListener('click', function() {
        showRegisterForm();
        clearMessages();
    });
    
    // Dashboard buttons
    document.getElementById('clockInBtn').addEventListener('click', handleClockIn);
    document.getElementById('clockOutBtn').addEventListener('click', handleClockOut);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// ===== AUTH FUNCTIONS =====
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const messageEl = document.getElementById('registerMessage');
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showMessage(messageEl, 'Please fill all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage(messageEl, 'Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 4) {
        showMessage(messageEl, 'Password must be at least 4 characters', 'error');
        return;
    }
    
    // Check for duplicate email
    const users = getAllUsers();
    if (users.some(user => user.email === email)) {
        showMessage(messageEl, 'Email already registered', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: generateUserId(),
        name: name,
        email: email,
        password: password
    };
    
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    showMessage(messageEl, 'Registration successful! Redirecting to login...', 'success');
    
    // Clear form
    document.getElementById('registerForm').reset();
    
    // Redirect to login after 1 second
    setTimeout(function() {
        showLoginForm();
        clearMessages();
    }, 1000);
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');
    
    // Validation
    if (!email || !password) {
        showMessage(messageEl, 'Please enter email and password', 'error');
        return;
    }
    
    // Find user
    const users = getAllUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        showMessage(messageEl, 'Invalid email or password', 'error');
        return;
    }
    
    // Set current user
    const currentUserData = {
        id: user.id,
        name: user.name,
        email: user.email
    };
    
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUserData));
    
    // Clear form and show dashboard
    document.getElementById('loginForm').reset();
    showDashboard();
    restoreTimerState();
    updateTimerDisplay();
    startTimerInterval();
}

function handleLogout() {
    // IMPORTANT: DO NOT stop the timer here
    // Timer should only stop when user clicks Clock Out
    // Timer data should persist in localStorage
    
    // Just remove current user session
    localStorage.removeItem(CURRENT_USER_KEY);
    
    // Stop displaying the timer (but don't stop the interval/timer data)
    stopTimerInterval();
    
    // Show login form
    showLoginForm();
    clearMessages();
    
    // Clear form
    document.getElementById('loginForm').reset();
}

// ===== TIMER FUNCTIONS =====
function handleClockIn() {
    const timerData = getTimerData();
    
    // Check if already clocked in
    if (timerData && timerData.isRunning) {
        alert('Already clocked in');
        return;
    }
    
    const currentUser = getCurrentUser();
    
    // Create new timer data
    const newTimerData = {
        userId: currentUser.id,
        startTime: Date.now(),
        elapsedTime: 0,
        isRunning: true,
        sessionStartTime: Date.now()
    };
    
    saveTimerData(newTimerData);
    updateClockStatus(true);
    updateTimerDisplay();
    startTimerInterval();
}

function handleClockOut() {
    const timerData = getTimerData();
    
    if (!timerData || !timerData.isRunning) {
        alert('Not clocked in');
        return;
    }
    
    // Calculate total time worked
    const totalElapsed = Date.now() - timerData.startTime;
    
    // Save work history
    saveWorkHistory(timerData.sessionStartTime, Date.now(), totalElapsed);
    
    // Stop timer
    stopTimerInterval();
    
    // Reset timer data
    const stoppedTimerData = {
        userId: timerData.userId,
        startTime: null,
        elapsedTime: 0,
        isRunning: false,
        sessionStartTime: null
    };
    
    saveTimerData(stoppedTimerData);
    updateClockStatus(false);
    updateTimerDisplay();
    refreshWorkHistory();
}

function startTimerInterval() {
    // Prevent multiple intervals
    if (currentTimerInterval !== null) {
        return;
    }
    
    // Update display every 100ms for smooth animation
    currentTimerInterval = setInterval(function() {
        updateTimerDisplay();
    }, 100);
}

function stopTimerInterval() {
    if (currentTimerInterval !== null) {
        clearInterval(currentTimerInterval);
        currentTimerInterval = null;
    }
}

function updateTimerDisplay() {
    const timerData = getTimerData();
    
    if (!timerData) {
        document.getElementById('timerDisplay').textContent = '00:00:00';
        return;
    }
    
    let elapsedMs = 0;
    
    if (timerData.isRunning && timerData.startTime) {
        // Calculate elapsed time from start time using Date.now()
        elapsedMs = Date.now() - timerData.startTime;
    }
    
    // Convert milliseconds to seconds
    const totalSeconds = Math.floor(elapsedMs / 1000);
    
    // Calculate hours, minutes, seconds
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Format display
    const timeString = String(hours).padStart(2, '0') + ':' + 
                      String(minutes).padStart(2, '0') + ':' + 
                      String(seconds).padStart(2, '0');
    
    document.getElementById('timerDisplay').textContent = timeString;
    
    // Update total work time
    updateTotalWorkTime();
}

function updateTotalWorkTime() {
    const currentUser = getCurrentUser();
    const workHistory = getWorkHistory();
    
    // Filter today's sessions for current user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalSeconds = 0;
    
    workHistory.forEach(session => {
        if (session.userId === currentUser.id) {
            const sessionDate = new Date(session.endTime);
            sessionDate.setHours(0, 0, 0, 0);
            
            if (sessionDate.getTime() === today.getTime()) {
                totalSeconds += session.duration / 1000;
            }
        }
    });
    
    // Add current session if running
    const timerData = getTimerData();
    if (timerData && timerData.isRunning && timerData.startTime) {
        const currentElapsed = Date.now() - timerData.startTime;
        totalSeconds += currentElapsed / 1000;
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    const timeString = String(hours).padStart(2, '0') + ':' + 
                      String(minutes).padStart(2, '0') + ':' + 
                      String(seconds).padStart(2, '0');
    
    document.getElementById('totalWorkTime').textContent = timeString;
}

function restoreTimerState() {
    const timerData = getTimerData();
    
    if (timerData && timerData.isRunning) {
        // Timer was running, start the interval
        startTimerInterval();
    }
}

function updateClockStatus(isClockedIn) {
    const statusEl = document.getElementById('userStatus');
    const clockInBtn = document.getElementById('clockInBtn');
    const clockOutBtn = document.getElementById('clockOutBtn');
    
    if (isClockedIn) {
        statusEl.textContent = 'Clocked In';
        statusEl.className = 'info-value status-badge clocked-in';
        clockInBtn.classList.add('hidden');
        clockOutBtn.classList.remove('hidden');
    } else {
        statusEl.textContent = 'Clocked Out';
        statusEl.className = 'info-value status-badge clocked-out';
        clockInBtn.classList.remove('hidden');
        clockOutBtn.classList.add('hidden');
    }
}

// ===== WORK HISTORY FUNCTIONS =====
function saveWorkHistory(startTime, endTime, duration) {
    const currentUser = getCurrentUser();
    const workHistory = getWorkHistory();
    
    const session = {
        userId: currentUser.id,
        startTime: startTime,
        endTime: endTime,
        duration: duration
    };
    
    workHistory.push(session);
    localStorage.setItem(WORK_HISTORY_KEY, JSON.stringify(workHistory));
}

function refreshWorkHistory() {
    const currentUser = getCurrentUser();
    const workHistory = getWorkHistory();
    const historyContainer = document.getElementById('workHistory');
    
    // Get today's sessions for current user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = workHistory.filter(session => {
        if (session.userId !== currentUser.id) {
            return false;
        }
        const sessionDate = new Date(session.endTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
    });
    
    if (todaySessions.length === 0) {
        historyContainer.innerHTML = '<p class="empty-message">No sessions yet</p>';
        return;
    }
    
    historyContainer.innerHTML = '';
    
    todaySessions.forEach((session, index) => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const duration = session.duration;
        
        const hours = Math.floor(duration / (1000 * 3600));
        const minutes = Math.floor((duration % (1000 * 3600)) / (1000 * 60));
        const seconds = Math.floor((duration % (1000 * 60)) / 1000);
        
        const durationString = String(hours).padStart(2, '0') + ':' + 
                              String(minutes).padStart(2, '0') + ':' + 
                              String(seconds).padStart(2, '0');
        
        const sessionEl = document.createElement('div');
        sessionEl.className = 'history-item';
        sessionEl.innerHTML = `
            <div class="history-time">
                <span class="history-time-label">Session ${index + 1}</span>
                <span class="history-time-value">${formatTime(startTime)} - ${formatTime(endTime)}</span>
            </div>
            <div class="history-duration">
                <span class="history-duration-label">Duration</span>
                <span class="history-duration-value">${durationString}</span>
            </div>
        `;
        
        historyContainer.appendChild(sessionEl);
    });
}

// ===== LOCALSTORAGE FUNCTIONS =====
function getAllUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
}

function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

function getTimerData() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return null;
    }
    
    const timerData = localStorage.getItem(TIMER_DATA_KEY);
    const data = timerData ? JSON.parse(timerData) : null;
    
    // Return timer data only if it belongs to current user
    if (data && data.userId === currentUser.id) {
        return data;
    }
    
    return null;
}

function saveTimerData(timerData) {
    localStorage.setItem(TIMER_DATA_KEY, JSON.stringify(timerData));
}

function getWorkHistory() {
    const history = localStorage.getItem(WORK_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
}

function generateUserId() {
    const users = getAllUsers();
    if (users.length === 0) {
        return 1;
    }
    const maxId = Math.max(...users.map(u => u.id));
    return maxId + 1;
}

// ===== UI HELPER FUNCTIONS =====
function showRegisterForm() {
    document.getElementById('registerSection').classList.remove('hidden');
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
}

function showLoginForm() {
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('registerSection').classList.add('hidden');
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    
    // Update user information
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userEmail').textContent = currentUser.email;
    }
    
    // Check if user is clocked in
    const timerData = getTimerData();
    const isClockedIn = timerData && timerData.isRunning;
    updateClockStatus(isClockedIn);
    
    // Refresh work history
    refreshWorkHistory();
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = 'message ' + type;
}

function clearMessages() {
    document.getElementById('registerMessage').textContent = '';
    document.getElementById('registerMessage').className = 'message';
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('loginMessage').className = 'message';
}

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
}
