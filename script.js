// ==================== CONFIGURATION ====================
const CONFIG = {
    AUTH_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwC9lJdYj4askujDNO2GfK-Rqq02VBcr90NXhifgvpawboEK1YCyUfbi2GA2hFL2UghkA/exec'
};

// ==================== STORAGE HELPERS ====================
const safeStorage = {
    getItem: function(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    setItem: function(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
    },
    removeItem: function(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }
};

// ==================== NOTIFICATION ====================
function notify(message, type = 'success') {
    const el = document.getElementById('notification');
    if (!el) return;
    el.textContent = message;
    el.className = 'notification show' + (type === 'error' ? ' error' : type === 'info' ? ' info' : type === 'warning' ? ' warning' : '');
    setTimeout(() => el.classList.remove('show'), 4000);
}

// ==================== AUTH STATE ====================
let currentUser = null;

// ==================== AUTH FUNCTIONS ====================
function checkAuth() {
    const saved = safeStorage.getItem('icfCollectUser');
    if (saved) { 
        currentUser = JSON.parse(saved); 
        showBuilder(); 
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById(tab + 'Form')?.classList.add('active');
    
    // Hide error/success messages
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
}

function showForgotPassword() {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('forgotForm').classList.add('active');
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
}

function showAuthLoading(show) {
    document.getElementById('authLoading').style.display = show ? 'block' : 'none';
    document.querySelectorAll('.auth-btn').forEach(btn => btn.disabled = show);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    document.getElementById('authError').style.display = 'none';
    showAuthLoading(true);
    
    try {
        // Try online first
        const response = await fetch(CONFIG.AUTH_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'login',
                email: email,
                password: password
            })
        });
        
        const result = await response.json();
        showAuthLoading(false);
        
        if (result.success && result.user) {
            currentUser = result.user;
            safeStorage.setItem('icfCollectUser', JSON.stringify(result.user));
            showBuilder();
            notify('Login successful!', 'success');
        } else {
            document.getElementById('authError').style.display = 'block';
            document.getElementById('authError').textContent = result.error || 'Invalid credentials';
        }
    } catch (error) {
        // Offline fallback
        showAuthLoading(false);
        
        const users = JSON.parse(safeStorage.getItem('icfCollectUsers') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            currentUser = user;
            safeStorage.setItem('icfCollectUser', JSON.stringify(user));
            showBuilder();
            notify('Logged in offline mode!', 'info');
        } else {
            document.getElementById('authError').style.display = 'block';
            document.getElementById('authError').textContent = 'Connection error or invalid credentials';
        }
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
    showAuthLoading(true);
    
    try {
        const response = await fetch(CONFIG.AUTH_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'signup',
                name: name,
                email: email,
                password: password
            })
        });
        
        const result = await response.json();
        showAuthLoading(false);
        
        if (result.success) {
            // Save locally for offline
            const users = JSON.parse(safeStorage.getItem('icfCollectUsers') || '[]');
            if (!users.find(u => u.email === email)) {
                users.push({ 
                    id: result.user?.id || Date.now().toString(), 
                    name, 
                    email, 
                    password 
                });
                safeStorage.setItem('icfCollectUsers', JSON.stringify(users));
            }
            
            document.getElementById('authSuccess').style.display = 'block';
            document.getElementById('authSuccess').textContent = 'Account created! Please login.';
            
            setTimeout(() => switchAuthTab('login'), 1500);
        } else {
            document.getElementById('authError').style.display = 'block';
            document.getElementById('authError').textContent = result.error || 'Registration failed';
        }
    } catch (error) {
        showAuthLoading(false);
        
        // Offline signup - store locally
        const users = JSON.parse(safeStorage.getItem('icfCollectUsers') || '[]');
        if (!users.find(u => u.email === email)) {
            users.push({ 
                id: Date.now().toString(), 
                name, 
                email, 
                password 
            });
            safeStorage.setItem('icfCollectUsers', JSON.stringify(users));
            
            document.getElementById('authSuccess').style.display = 'block';
            document.getElementById('authSuccess').textContent = 'Account created offline! Please login.';
            setTimeout(() => switchAuthTab('login'), 1500);
        } else {
            document.getElementById('authError').style.display = 'block';
            document.getElementById('authError').textContent = 'Email already exists';
        }
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim();
    
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
    showAuthLoading(true);
    
    try {
        const response = await fetch(CONFIG.AUTH_SCRIPT_URL + '?action=forgotPassword&email=' + encodeURIComponent(email), {
            mode: 'cors'
        });
        
        const result = await response.json();
        showAuthLoading(false);
        
        if (result.success) {
            document.getElementById('authSuccess').style.display = 'block';
            document.getElementById('authSuccess').textContent = 'Password sent to your email!';
            setTimeout(() => switchAuthTab('login'), 2000);
        } else {
            document.getElementById('authError').style.display = 'block';
            document.getElementById('authError').textContent = result.message || 'Email not found';
        }
    } catch (error) {
        showAuthLoading(false);
        document.getElementById('authError').style.display = 'block';
        document.getElementById('authError').textContent = 'Connection error. Please try again.';
    }
}

function showBuilder() {
    document.getElementById('authContainer').style.display = 'none';
    document.querySelector('.header').style.display = 'flex';
    document.getElementById('mainContainer').style.display = 'block';
    document.getElementById('headerUser').innerHTML = ' ' + (currentUser?.name || 'User');
}

function logout() {
    currentUser = null;
    safeStorage.removeItem('icfCollectUser');
    document.getElementById('mainContainer').style.display = 'none';
    document.querySelector('.header').style.display = 'none';
    document.getElementById('authContainer').style.display = 'flex';
    switchAuthTab('login');
    notify('Logged out', 'info');
}

// ==================== INITIALIZATION ====================
function init() {
    // Set up event listeners
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('forgotForm').addEventListener('submit', handleForgotPassword);
    
    // Check if user is already logged in
    checkAuth();
}

// ==================== MAKE FUNCTIONS GLOBAL ====================
window.switchAuthTab = switchAuthTab;
window.showForgotPassword = showForgotPassword;
window.logout = logout;

// Start the app
init();
