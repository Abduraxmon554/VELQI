/* ===================================================
   VELQI - ASOSIY JS
   =================================================== */

// ============================================================
// API Utility
// ============================================================
const API = {
  baseUrl: '/api',
  
  async request(method, endpoint, data = null, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      method,
      headers,
      credentials: 'include',
      ...options
    };
    
    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Xato yuz berdi');
    }
    
    return result;
  },
  
  get(endpoint, options) {
    return this.request('GET', endpoint, null, options);
  },
  
  post(endpoint, data, options) {
    return this.request('POST', endpoint, data, options);
  },
  
  put(endpoint, data, options) {
    return this.request('PUT', endpoint, data, options);
  },
  
  delete(endpoint, options) {
    return this.request('DELETE', endpoint, null, options);
  }
};

// ============================================================
// Toast Notifications
// ============================================================
const Toast = {
  container: null,
  
  init() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', duration = 4000) {
    this.init();
    
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${icons[type]}"></i></div>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); }
};

// ============================================================
// Loading
// ============================================================
const Loading = {
  show() {
    document.getElementById('loadingOverlay').style.display = 'flex';
  },
  hide() {
    document.getElementById('loadingOverlay').style.display = 'none';
  }
};

// ============================================================
// Auth State
// ============================================================
const AuthState = {
  user: null,
  
  init() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        this.user = JSON.parse(userData);
        this.updateUI();
      } catch (e) {
        this.logout();
      }
    }
  },
  
  setUser(user, token) {
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.updateUI();
  },
  
  updateUI() {
    const guestButtons = document.getElementById('guestButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const adminMenuItem = document.getElementById('adminMenuItem');
    const adminMenuDivider = document.getElementById('adminMenuDivider');
    
    if (this.user) {
      if (guestButtons) guestButtons.style.display = 'none';
      if (userMenu) userMenu.style.display = 'block';
      if (userName) userName.textContent = this.user.name?.split(' ')[0] || 'Profil';
      if (userAvatar && this.user.avatar) userAvatar.src = this.user.avatar;
      
      if (this.user.role === 'admin') {
        if (adminMenuItem) adminMenuItem.style.display = 'flex';
        if (adminMenuDivider) adminMenuDivider.style.display = 'block';
      }
    } else {
      if (guestButtons) guestButtons.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
    }
  },
  
  async logout() {
    try {
      await API.get('/auth/logout');
    } catch (e) {}
    
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    this.updateUI();
    
    window.location.href = '/';
  },
  
  isLoggedIn() {
    return !!this.user;
  }
};

// ============================================================
// Cart
// ============================================================
const Cart = {
  items: [],
  
  init() {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        this.items = JSON.parse(saved).map(item => ({
          ...item,
          currentPrice: item.isFree ? 0 : (item.category === 'cybersecurity' ? 150000 : 70000)
        }));
      } catch (e) {
        this.items = [];
      }
    }
    this.updateBadge();
  },
  
  save() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    this.updateBadge();
  },
  
  add(course) {
    const exists = this.items.find(i => i._id === course._id);
    if (exists) {
      Toast.warning('Bu kurs allaqachon savatingizda');
      return false;
    }
    this.items.push({
      ...course,
      currentPrice: course.isFree
        ? 0
        : (course.category === 'cybersecurity' ? 150000 : 70000)
    });
    this.save();
    Toast.success(`"${course.title}" savatingizga qo'shildi!`);
    return true;
  },
  
  remove(courseId) {
    this.items = this.items.filter(i => i._id !== courseId);
    this.save();
    Toast.info('Kurs savatingdan olib tashlandi');
  },
  
  clear() {
    this.items = [];
    this.save();
  },
  
  total() {
    return this.items.reduce((sum, item) => {
      const price = item.isFree ? 0 : (item.currentPrice ?? item.price ?? 0);
      return sum + price;
    }, 0);
  },
  
  count() {
    return this.items.length;
  },
  
  updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
      const count = this.count();
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }
};

function getCourseThumbnail(course) {
  const categoryImages = {
    frontend: '/images/courses/frontend.svg',
    nodejs: '/images/courses/backend.svg',
    backend: '/images/courses/backend.svg',
    'ai-ml': '/images/courses/ai-ml.svg',
    design: '/images/courses/design.svg',
    cybersecurity: '/images/courses/cybersecurity.svg',
    other: '/images/courses/general.svg'
  };
  const thumbnail = course?.thumbnail;
  return thumbnail && thumbnail !== '/images/default-course.jpg'
    ? thumbnail
    : categoryImages[course?.category] || categoryImages.other;
}

// ============================================================
// Navbar
// ============================================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  const navSearch = document.getElementById('navSearch');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  
  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });
  
  // Mobile toggle
  navToggle?.addEventListener('click', () => {
    navMenu?.classList.toggle('open');
    const spans = navToggle.querySelectorAll('span');
    navToggle.classList.toggle('active');
  });
  
  // Logout
  logoutBtn?.addEventListener('click', () => {
    if (confirm('Tizimdan chiqmoqchimisiz?')) {
      AuthState.logout();
    }
  });
  
  // Search
  function handleSearch(query) {
    if (query.trim()) {
      window.location.href = `/courses?search=${encodeURIComponent(query)}`;
    }
  }
  
  navSearch?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch(e.target.value);
  });
  
  mobileSearchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch(e.target.value);
  });
  
  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) {
      navMenu?.classList.remove('open');
    }
  });
}

// ============================================================
// Scroll Animations
// ============================================================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
  });
}

// ============================================================
// Counter Animation
// ============================================================
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const step = target / (duration / 16);
  
  const update = () => {
    start = Math.min(start + step, target);
    const suffix = element.dataset.suffix || '';
    
    if (start >= 1000) {
      element.textContent = (start / 1000).toFixed(1) + 'K+' + suffix;
    } else {
      element.textContent = Math.floor(start) + suffix;
    }
    
    if (start < target) {
      requestAnimationFrame(update);
    }
  };
  
  requestAnimationFrame(update);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  
  if (!counters.length) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.counter);
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  });
  
  counters.forEach(counter => observer.observe(counter));
}

// ============================================================
// Scroll to Top
// ============================================================
function initScrollTop() {
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  btn.setAttribute('aria-label', 'Yuqoriga qaytish');
  document.body.appendChild(btn);
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });
  
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ============================================================
// Cookie Banner
// ============================================================
function initCookieBanner() {
  if (localStorage.getItem('cookiesAccepted')) return;
  
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <p class="cookie-text">
      🍪 Biz sizga eng yaxshi tajriba berish uchun cookielardan foydalanamiz.
      <a href="/privacy" style="color: var(--primary); margin-left: 4px;">Batafsil</a>
    </p>
    <div class="cookie-btns">
      <button id="cookieDecline" class="btn btn-sm btn-outline-primary" style="border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.7)">Rad etish</button>
      <button id="cookieAccept" class="btn btn-sm btn-primary">Qabul qilish</button>
    </div>
  `;
  
  document.body.appendChild(banner);
  
  setTimeout(() => banner.classList.add('show'), 1000);
  
  document.getElementById('cookieAccept')?.addEventListener('click', () => {
    localStorage.setItem('cookiesAccepted', 'true');
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 400);
  });
  
  document.getElementById('cookieDecline')?.addEventListener('click', () => {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 400);
  });
}

// ============================================================
// Newsletter
// ============================================================
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    
    // Simulyatsiya
    Toast.success(`${email} manzili ro'yxatga qo'shildi! Tez orada yangiliklar olinadi.`);
    form.reset();
  });
}

// ============================================================
// Format Price
// ============================================================
function formatPrice(price, currency = 'UZS') {
  if (price === 0) return 'Bepul';
  
  if (currency === 'UZS') {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price);
}

// ============================================================
// Star Rating
// ============================================================
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  
  let stars = '';
  for (let i = 0; i < full; i++) stars += '<i class="fa-solid fa-star"></i>';
  if (half) stars += '<i class="fa-solid fa-star-half-stroke"></i>';
  for (let i = 0; i < empty; i++) stars += '<i class="fa-regular fa-star"></i>';
  
  return `<span class="stars">${stars}</span>`;
}

// ============================================================
// Course Card Template
// ============================================================
function createCourseCard(course) {
  const hourlyRate = course.category === 'cybersecurity' ? 150000 : 70000;
  const isEnrolled = AuthState.user?.enrolledCourses?.some(
    e => (e.course?._id || e.course) === course._id
  );
  
  const categoryNames = {
    'frontend': 'Frontend',
    'nodejs': 'Node.js',
    'ai-ml': 'AI & ML',
    'backend': 'Backend',
    'design': 'Dizayn',
    'cybersecurity': 'Kiberxavfsizlik'
  };
  
  return `
    <div class="course-card" data-id="${course._id}">
      <div class="course-thumbnail">
        <img src="${course.thumbnail || '/images/default-course.jpg'}" 
             alt="${course.title}" 
             loading="lazy"
             onerror="this.src='/images/default-course.jpg'">
        ${course.bestseller ? '<span class="course-badge badge-bestseller">Bestseller</span>' : ''}
        ${course.isFree ? '<span class="course-badge badge-free">Bepul</span>' : ''}
        <button class="course-wishlist ${isEnrolled ? 'active' : ''}" 
                onclick="toggleWishlist('${course._id}', this)"
                title="Wishlistga qo'shish">
          <i class="fa-${isEnrolled ? 'solid' : 'regular'} fa-heart"></i>
        </button>
      </div>
      
      <div class="course-body">
        <div class="course-category">
          ${getCategoryIcon(course.category)}
          ${categoryNames[course.category] || course.category}
        </div>
        
        <h3 class="course-title">
          <a href="/courses/${course.slug || course._id}">${course.title}</a>
        </h3>
        
        <div class="course-instructor">
          <img src="${course.instructor?.avatar || '/images/default-avatar.svg'}" 
               alt="${course.instructor?.name}">
          <span>${course.instructor?.name || 'O\'qituvchi'}</span>
        </div>
        
        <div class="course-meta">
          <div class="course-rating">
            ${renderStars(course.rating || 0)}
            <span class="rating-num">${(course.rating || 0).toFixed(1)}</span>
            <span class="rating-count">(${course.numReviews || 0})</span>
          </div>
          <span><i class="fa-solid fa-users"></i> ${course.enrolledStudents || 0}</span>
          <span><i class="fa-solid fa-play-circle"></i> ${course.totalLessons || 0} dars</span>
        </div>
        
        <div class="course-footer">
          <div class="course-price">
            ${course.isFree ? 
              '<span class="price-free">Bepul</span>' : 
              `<span class="price-current">${formatPrice(hourlyRate)} / soat</span>`
            }
          </div>
          <button class="btn btn-primary btn-sm" data-add-to-cart="${course._id}">
            ${isEnrolled ? 'O\'rganish' : 'Savatchaga'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function getCategoryIcon(category) {
  const icons = {
    'frontend': '<i class="fa-solid fa-code"></i>',
    'nodejs': '<i class="fa-brands fa-node-js"></i>',
    'ai-ml': '<i class="fa-solid fa-brain"></i>',
    'backend': '<i class="fa-solid fa-server"></i>',
    'design': '<i class="fa-solid fa-palette"></i>',
    'cybersecurity': '<i class="fa-solid fa-shield-halved"></i>'
  };
  return icons[category] || '<i class="fa-solid fa-graduation-cap"></i>';
}

// ============================================================
// Wishlist
// ============================================================
async function toggleWishlist(courseId, btn) {
  if (!AuthState.isLoggedIn()) {
    Toast.warning('Wishlistga qo\'shish uchun tizimga kiring');
    window.location.href = '/login';
    return;
  }
  
  try {
    const result = await API.put(`/users/wishlist/${courseId}`);
    btn.classList.toggle('active');
    const icon = btn.querySelector('i');
    if (btn.classList.contains('active')) {
      icon.className = 'fa-solid fa-heart';
      Toast.success('Wishlistga qo\'shildi ❤️');
    } else {
      icon.className = 'fa-regular fa-heart';
      Toast.info('Wishlistdan olib tashlandi');
    }
  } catch (err) {
    Toast.error(err.message);
  }
}

// ============================================================
// Add to Cart
// ============================================================
async function addToCart(courseId) {
  // Check if already enrolled
  const isEnrolled = AuthState.user?.enrolledCourses?.some(
    e => (e.course?._id || e.course) === courseId
  );
  
  if (isEnrolled) {
    window.location.href = `/learn/${courseId}`;
    return;
  }
  
  try {
    const courseResult = await API.get(`/courses/${courseId}`);
    const course = courseResult.data;
    
    if (course.isFree && AuthState.isLoggedIn()) {
      Loading.show();
      await API.post('/payment/enroll-free', { courseId });
      Loading.hide();
      Toast.success('Bepul kursga muvaffaqiyatli yozildingiz!');
      setTimeout(() => window.location.href = `/learn/${courseId}`, 1500);
      return;
    }
    
    Cart.add(course);
    if (course.isFree) {
      Toast.info('Kurs savatchaga qo‘shildi. Bepul yozilish uchun tizimga kiring.');
    }
  } catch (err) {
    Loading.hide();
    Toast.error(err.message);
  }
}

// ============================================================
// Format Date
// ============================================================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// ============================================================
// Debounce
// ============================================================
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ============================================================
// Copy to Clipboard
// ============================================================
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    Toast.success('Nusxa olindi!');
  } catch (e) {
    Toast.error('Nusxa olishda xato');
  }
}

// ============================================================
// THEME (Qora / Oq dizayn)
// ============================================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');
  if (icon && text) {
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      text.textContent = 'Oq';
    } else {
      icon.className = 'fa-solid fa-moon';
      text.textContent = 'Qora';
    }
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  Toast.info(next === 'dark' ? 'Qora dizayn faollashtirildi 🌙' : 'Oq dizayn faollashtirildi ☀️');
}

// ============================================================
// INIT
// ============================================================
initTheme();

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  AuthState.init();
  Cart.init();
  initNavbar();
  initScrollAnimations();
  initCounters();
  initScrollTop();
  initCookieBanner();
  initNewsletter();
  
  // WhatsApp floating button
  const floatingChat = document.createElement('a');
  floatingChat.href = 'https://wa.me/998901234567';
  floatingChat.target = '_blank';
  floatingChat.className = 'floating-chat';
  floatingChat.title = 'WhatsApp orqali bog\'laning';
  floatingChat.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
  document.body.appendChild(floatingChat);
});

// Export for use in other files
window.API = API;
window.Toast = Toast;
window.Loading = Loading;
window.AuthState = AuthState;
window.Cart = Cart;
window.getCourseThumbnail = getCourseThumbnail;
window.formatPrice = formatPrice;
window.renderStars = renderStars;
window.createCourseCard = createCourseCard;

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add-to-cart]');
  if (addButton) {
    addToCart(addButton.dataset.addToCart);
    return;
  }

  const wishlistButton = event.target.closest('[data-toggle-wishlist]');
  if (wishlistButton) {
    toggleWishlist(wishlistButton.dataset.toggleWishlist, wishlistButton);
  }
});
window.toggleWishlist = toggleWishlist;
window.addToCart = addToCart;
window.formatDate = formatDate;
window.debounce = debounce;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
