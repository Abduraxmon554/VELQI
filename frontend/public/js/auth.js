/* ===================================================
   VELQI - AUTH JS
   =================================================== */

// ============================================================
// LOGIN PAGE
// ============================================================
if (window.location.pathname === '/login') {
  const loginForm = document.getElementById('loginForm');
  
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('[type="submit"]');
    
    if (!email || !password) {
      Toast.error('Email va parol kiritish majburiy');
      return;
    }
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kirilmoqda...';
      
      const result = await API.post('/auth/login', { email, password });
      
      AuthState.setUser(result.user, result.token);
      Toast.success(`Xush kelibsiz, ${result.user.name}! 🎉`);
      
      setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirect || '/dashboard';
      }, 1000);
      
    } catch (err) {
      Toast.error(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Kirish';
      
      // Shake animation
      loginForm.style.animation = 'shake 0.5s ease';
      setTimeout(() => loginForm.style.animation = '', 500);
    }
  });
}

// ============================================================
// REGISTER PAGE
// ============================================================
if (window.location.pathname === '/register') {
  const registerForm = document.getElementById('registerForm');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  
  // Password strength checker
  passwordInput?.addEventListener('input', function() {
    const strength = checkPasswordStrength(this.value);
    updateStrengthUI(strength);
  });
  
  function checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    return score;
  }
  
  function updateStrengthUI(score) {
    if (!strengthBar) return;
    
    const levels = [
      { text: '', color: '#e2e8f0', width: '0%' },
      { text: 'Juda zaif', color: '#fc8181', width: '20%' },
      { text: 'Zaif', color: '#f6ad55', width: '40%' },
      { text: 'O\'rtacha', color: '#fbd38d', width: '60%' },
      { text: 'Kuchli', color: '#68d391', width: '80%' },
      { text: 'Juda kuchli', color: '#48bb78', width: '100%' }
    ];
    
    const level = levels[score] || levels[0];
    strengthBar.style.width = level.width;
    strengthBar.style.background = level.color;
    if (strengthText) {
      strengthText.textContent = level.text;
      strengthText.style.color = level.color;
    }
  }
  
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput?.value;
    const submitBtn = registerForm.querySelector('[type="submit"]');
    
    // Validations
    if (!name || !email || !password) {
      Toast.error('Barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    
    if (name.length < 2) {
      Toast.error('Ism kamida 2 ta harf bo\'lishi kerak');
      return;
    }
    
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      Toast.error('Email manzil noto\'g\'ri');
      return;
    }
    
    if (password.length < 6) {
      Toast.error('Parol kamida 6 ta belgi bo\'lishi kerak');
      return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
      Toast.error('Parollar mos kelmaydi');
      return;
    }
    
    if (!document.getElementById('agreeTerms')?.checked) {
      Toast.error('Foydalanish shartlarini qabul qiling');
      return;
    }
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ro\'yxatdan o\'tilmoqda...';
      
      const result = await API.post('/auth/register', { name, email, password, phone });
      
      AuthState.setUser(result.user, result.token);
      
      Toast.success('Muvaffaqiyatli ro\'yxatdan o\'tdingiz! Emailingizni tasdiqlang. 🎉');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (err) {
      Toast.error(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Ro\'yxatdan O\'tish';
    }
  });
}

// ============================================================
// FORGOT PASSWORD PAGE
// ============================================================
if (window.location.pathname === '/forgot-password') {
  const form = document.getElementById('forgotForm');
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const submitBtn = form.querySelector('[type="submit"]');
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';
      
      await API.post('/auth/forgot-password', { email });
      
      document.getElementById('formSection').style.display = 'none';
      document.getElementById('successSection').style.display = 'block';
      
    } catch (err) {
      Toast.error(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Link Yuborish';
    }
  });
}

// ============================================================
// RESET PASSWORD PAGE
// ============================================================
if (window.location.pathname.startsWith('/reset-password/')) {
  const form = document.getElementById('resetForm');
  const token = window.location.pathname.split('/').pop();
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = form.querySelector('[type="submit"]');
    
    if (password !== confirmPassword) {
      Toast.error('Parollar mos kelmaydi');
      return;
    }
    
    if (password.length < 6) {
      Toast.error('Parol kamida 6 ta belgi bo\'lishi kerak');
      return;
    }
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yangilanmoqda...';
      
      const result = await API.put(`/auth/reset-password/${token}`, { password });
      AuthState.setUser(result.user, result.token);
      
      Toast.success('Parol muvaffaqiyatli yangilandi!');
      setTimeout(() => window.location.href = '/dashboard', 1500);
      
    } catch (err) {
      Toast.error(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-key"></i> Parolni Yangilash';
    }
  });
}

// ============================================================
// VERIFY EMAIL PAGE
// ============================================================
if (window.location.pathname.startsWith('/verify-email/')) {
  const token = window.location.pathname.split('/').pop();
  
  (async () => {
    try {
      await API.get(`/auth/verify-email/${token}`);
      document.getElementById('successMsg').style.display = 'block';
      document.getElementById('errorMsg').style.display = 'none';
    } catch (err) {
      document.getElementById('errorMsg').style.display = 'block';
      document.getElementById('successMsg').style.display = 'none';
    }
  })();
}

// ============================================================
// PASSWORD TOGGLE
// ============================================================
document.querySelectorAll('.input-toggle').forEach(btn => {
  btn.addEventListener('click', function() {
    const input = this.closest('.input-group').querySelector('input');
    const icon = this.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye';
    }
  });
});

// Shake animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);
