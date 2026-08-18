document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
    document.getElementById('signupForm').style.display = isLogin ? 'none' : 'block';
    hideMessage();
  });
});

// ==================== ورود ====================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = e.target.querySelector('button[type="submit"]');

  btn.disabled = true;
  btn.textContent = 'در حال ورود...';

  try {
    console.log('شروع ورود...');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('خطای ورود:', error);
      showError(translateError(error.message));
      btn.disabled = false;
      btn.textContent = 'ورود';
      return;
    }

    console.log('ورود موفق');
    window.location.href = 'index.html';
  } catch (err) {
    console.error('خطای غیرمنتظره ورود:', err);
    showError('خطای شبکه. F12 را بزنید و Console را چک کنید.');
    btn.disabled = false;
    btn.textContent = 'ورود';
  }
});

// ==================== ثبت‌نام ====================
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const display_name = document.getElementById('signupDisplayName').value.trim();
  const username = document.getElementById('signupUsername').value.trim().toLowerCase();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = e.target.querySelector('button[type="submit"]');

  if (!display_name || !username || !email || !password) {
    showError('لطفاً همه فیلدها را پر کنید');
    return;
  }
  if (username.length < 3) {
    showError('نام کاربری باید حداقل ۳ کاراکتر باشد');
    return;
  }
  if (password.length < 6) {
    showError('رمز عبور باید حداقل ۶ کاراکتر باشد');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'در حال ثبت‌نام...';
  console.log('=== شروع ثبت‌نام ===');
  console.log('نام:', display_name, '| یوزرنیم:', username, '| ایمیل:', email);

  try {
    console.log('در حال ارسال به Supabase Auth...');

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: display_name
        }
      }
    });

    console.log('پاسخ Auth:', data, error);

    if (error) {
      console.error('خطای Auth:', error);
      showError(translateError(error.message));
      btn.disabled = false;
      btn.textContent = 'ثبت‌نام';
      return;
    }

    // ساخت پروفایل
    if (data.user) {
      console.log('کاربر ساخته شد، در حال ساخت پروفایل...', data.user.id);
      try {
        const { error: profileError } = await sb.from('profiles').upsert({
          id: data.user.id,
          username: username,
          display_name: display_name
        });
        if (profileError) {
          console.warn('خطای ساخت پروفایل:', profileError.message);
        } else {
          console.log('پروفایل ساخته شد');
        }
      } catch (pe) {
        console.warn('خطای پروفایل:', pe);
      }
    }

    // نتیجه نهایی
    if (data.session) {
      console.log('Session موجود - ورود مستقیم');
      showSuccess('ثبت‌نام موفق! در حال ورود...');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    } else if (data.user) {
      console.log('کاربر ساخته شد ولی Session نیست (Confirm email روشن است)');
      showSuccess('ثبت‌نام موفق! حالا از تب «ورود» وارد شوید.');
      btn.disabled = false;
      btn.textContent = 'ثبت‌نام';
      setTimeout(() => {
        document.querySelector('.tab[data-tab="login"]').click();
        document.getElementById('loginEmail').value = email;
      }, 1500);
    } else {
      showError('ثبت‌نام انجام شد ولی پاسخی دریافت نشد. از تب ورود امتحان کنید.');
      btn.disabled = false;
      btn.textContent = 'ثبت‌نام';
    }

  } catch (err) {
    console.error('خطای کلی ثبت‌نام:', err);
    showError('خطا: ' + (err.message || 'دوباره تلاش کنید. F12 را بزنید.'));
    btn.disabled = false;
    btn.textContent = 'ثبت‌نام';
  }
});

// ==================== توابع کمکی ====================
function showError(msg) {
  const el = document.getElementById('authError');
  el.style.color = '#ff4466';
  el.textContent = msg;
  el.style.display = 'block';
}

function showSuccess(msg) {
  const el = document.getElementById('authError');
  el.style.color = '#00ff9d';
  el.textContent = msg;
  el.style.display = 'block';
}

function hideMessage() {
  const el = document.getElementById('authError');
  el.style.display = 'none';
  el.textContent = '';
}

function translateError(msg) {
  if (!msg) return 'خطای نامشخص';
  if (msg.includes('User already registered')) return 'این ایمیل قبلاً ثبت‌نام کرده است';
  if (msg.includes('Password should be at least')) return 'رمز عبور باید حداقل ۶ کاراکتر باشد';
  if (msg.includes('invalid format')) return 'فرمت ایمیل نامعتبر است';
  if (msg.includes('Invalid login credentials')) return 'ایمیل یا رمز عبور اشتباه است';
  if (msg.includes('Email not confirmed')) return 'ایمیل تأیید نشده است';
  if (msg.includes('rate limit')) return 'تعداد درخواست‌ها زیاد است. کمی صبر کنید';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    return 'خطای شبکه! مطمئن شوید با Live Server یا localhost باز کرده‌اید (نه با دابل‌کلیک فایل).';
  }
  return msg;
}

// اگر قبلاً لاگین کرده
(async () => {
  try {
    const user = await getCurrentUser();
    if (user) window.location.href = 'index.html';
  } catch (e) {}
})();
