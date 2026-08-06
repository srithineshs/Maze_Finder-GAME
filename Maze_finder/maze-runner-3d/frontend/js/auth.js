// auth.js

window.currentUser = null;

window.initAuth = function() {
    const authModal = document.getElementById('auth-modal');
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit');
    const toggleAuth = document.getElementById('toggle-auth');
    const authError = document.getElementById('auth-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    let isLogin = true;

    toggleAuth.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.textContent = isLogin ? 'Runner Identity' : 'New Runner Registration';
        authSubmit.textContent = isLogin ? 'ENTER THE MAZE' : 'BEGIN TRAINING';
        toggleAuth.textContent = isLogin ? 'NEW RUNNER? REGISTER' : 'EXISTING RUNNER? LOGIN';
        authError.classList.add('hidden');
    });

    authSubmit.addEventListener('click', handleSubmit);

    // Allow Enter key to submit from either input field
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });
    });

    async function handleSubmit() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showError('Please enter both callsign and access code');
            return;
        }

        // Loading state
        authSubmit.disabled = true;
        authSubmit.textContent = 'CONNECTING...';
        authError.classList.add('hidden');

        const endpoint = isLogin ? '/api/login' : '/api/register';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                if (isLogin) {
                    window.currentUser = data;
                    authModal.classList.add('hidden');
                    const authBg = document.getElementById('auth-bg');
                    if (authBg) authBg.style.display = 'none';
                    console.log('Logged in as:', data.username);
                    if (window.onUserLoggedIn) window.onUserLoggedIn(data);
                } else {
                    // Registration OK — switch to login
                    isLogin = true;
                    authTitle.textContent = 'Runner Identity';
                    authSubmit.textContent = 'ENTER THE MAZE';
                    toggleAuth.textContent = 'NEW RUNNER? REGISTER';
                    usernameInput.value = '';
                    passwordInput.value = '';
                    showError('Registration successful! Now login to enter the maze.', false);
                }
            } else {
                showError(data.error || 'Authentication denied. Try again.');
            }
        } catch (e) {
            showError('Cannot connect to server. Is the backend running?');
            console.error('Auth fetch error:', e);
        }

        // Restore button
        authSubmit.disabled = false;
        authSubmit.textContent = isLogin ? 'ENTER THE MAZE' : 'BEGIN TRAINING';
    }

    function showError(msg, isErr = true) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
        authError.style.color = isErr ? '#ff4a4a' : '#4aff8c';
    }
};
