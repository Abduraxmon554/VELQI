const adminApi = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'include', ...options });
  const result = await response.json();
  if (response.status === 401 || response.status === 403) {
    window.location.href = '/admin/login';
    throw new Error('Admin sifatida qayta kiring');
  }
  if (!response.ok) throw new Error(result.message || 'So‘rov bajarilmadi');
  return result;
};

const escapeAdminHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const formatSom = (amount) => `${Number(amount || 0).toLocaleString('uz-UZ')} so'm`;
const rateFor = (category) => category === 'cybersecurity' ? 150000 : 70000;

async function loadAdminPage() {
  const page = document.querySelector('.admin-layout')?.dataset.adminPage;
  try {
    if (page === 'dashboard') {
      const { data } = await adminApi('/api/admin/dashboard');
      document.getElementById('admTotalUsers').textContent = data.totalUsers.toLocaleString('uz-UZ');
      document.getElementById('admCourses').textContent = `${data.activeCourses} / ${data.totalCourses}`;
      document.getElementById('admRevenue').textContent = formatSom(data.totalRevenue);
      document.getElementById('admOrders').textContent = data.completedOrders.toLocaleString('uz-UZ');
    }
    if (page === 'courses') {
      bindCourseForm();
      await loadCourses();
    }
    if (page === 'users') await loadUsers();
    if (page === 'orders') await loadOrders();
  } catch (error) {
    const message = document.getElementById('adminMessage');
    if (message) message.textContent = error.message;
  }
}

async function loadCourses() {
  const { data } = await adminApi('/api/admin/courses');
  const body = document.getElementById('adminCourses');
  body.innerHTML = data.length ? data.map((course) => {
    const rate = rateFor(course.category);
    return `<tr>
      <td><strong>${escapeAdminHtml(course.title)}</strong><small>${escapeAdminHtml(course.instructor?.name || 'Ustoz tayinlanmagan')}</small></td>
      <td>${escapeAdminHtml(course.category)}</td>
      <td>${formatSom(rate)} / soat</td>
      <td>${Number(course.enrolledStudents || 0).toLocaleString('uz-UZ')}</td>
      <td>${course.isPublished && course.isApproved ? 'Faol' : 'Yashirin'}</td>
      <td class="admin-actions">
        <button class="btn btn-sm btn-outline-primary" data-toggle-publish="${course._id}" data-published="${course.isPublished && course.isApproved}">${course.isPublished && course.isApproved ? 'Yashirish' : 'Nashr qilish'}</button>
        <button class="btn btn-sm btn-danger" data-delete-course="${course._id}">O‘chirish</button>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="6">Hozircha kurslar mavjud emas.</td></tr>';

  body.querySelectorAll('[data-delete-course]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Ushbu kursni o‘chirmoqchimisiz?')) return;
      try {
        await adminApi(`/api/courses/${button.dataset.deleteCourse}`, { method: 'DELETE' });
        await loadCourses();
        showAdminMessage('Kurs o‘chirildi.');
      } catch (error) { showAdminMessage(error.message); }
    });
  });

  body.querySelectorAll('[data-toggle-publish]').forEach((button) => button.addEventListener('click', async () => {
    const publish = button.dataset.published !== 'true';
    try {
      await adminApi(`/api/courses/${button.dataset.togglePublish}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: publish, isApproved: publish })
      });
      await loadCourses();
      showAdminMessage(publish ? 'Kurs nashr qilindi.' : 'Kurs yashirildi.');
    } catch (error) { showAdminMessage(error.message); }
  }));

}

function bindCourseForm() {
  const form = document.getElementById('adminCourseForm');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const category = formData.get('category');
    const rate = rateFor(category);
    try {
      await adminApi('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          shortDescription: formData.get('description').slice(0, 200),
          category,
          price: rate,
          pricePerLesson: rate,
          discountPrice: 0
        })
      });
      form.reset();
      await loadCourses();
      showAdminMessage('Kurs yaratildi. Saytda ko‘rsatish uchun nashr qiling.');
    } catch (error) { showAdminMessage(error.message); }
  });
}

async function loadUsers() {
  const { data } = await adminApi('/api/users?limit=100');
  const body = document.getElementById('adminUsers');
  body.innerHTML = data.length ? data.map((user) => `<tr>
    <td><strong>${escapeAdminHtml(user.name)}</strong></td>
    <td>${escapeAdminHtml(user.email)}</td>
    <td>${escapeAdminHtml(user.role)}</td>
    <td>${user.isActive ? 'Faol' : 'Nofaol'}</td>
    <td><button class="btn btn-sm btn-outline-primary" data-toggle-user="${user._id}">${user.isActive ? 'Bloklash' : 'Faollashtirish'}</button></td>
  </tr>`).join('') : '<tr><td colspan="5">Foydalanuvchilar topilmadi.</td></tr>';
  body.querySelectorAll('[data-toggle-user]').forEach((button) => button.addEventListener('click', async () => {
    try {
      await adminApi(`/api/users/${button.dataset.toggleUser}/toggle-status`, { method: 'PUT' });
      await loadUsers();
    } catch (error) { showAdminMessage(error.message); }
  }));
}

async function loadOrders() {
  const { data } = await adminApi('/api/payment/all-orders');
  const body = document.getElementById('adminOrders');
  body.innerHTML = data.length ? data.map((order) => `<tr>
    <td>${escapeAdminHtml(order._id)}</td>
    <td>${escapeAdminHtml(order.user?.name || 'Foydalanuvchi o‘chirilgan')}</td>
    <td>${escapeAdminHtml((order.courses || []).map((item) => item.title || item.course?.title || 'Kurs').join(', '))}</td>
    <td>${formatSom(order.totalAmount)}</td>
    <td>${escapeAdminHtml(order.paymentMethod)}</td>
    <td>${escapeAdminHtml(order.paymentStatus)}</td>
  </tr>`).join('') : '<tr><td colspan="6">Buyurtmalar topilmadi.</td></tr>';
}

function showAdminMessage(message) {
  const element = document.getElementById('adminMessage');
  if (element) element.textContent = message;
}

async function adminLogout() {
  await fetch('/api/auth/logout', { credentials: 'include' });
  window.location.href = '/admin/login';
}

document.addEventListener('DOMContentLoaded', loadAdminPage);
