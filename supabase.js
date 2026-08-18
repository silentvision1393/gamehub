const SUPABASE_URL = 'https://inoobpxzivbcraemmtnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlub29icHh6aXZiY3JhZW1tdG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTEzMjUsImV4cCI6MjEwMjU2NzMyNX0.kwZzdLUGSqIHc-1Kya-4M1NFEdJHm-_2Qvgq-9sPTic';

// استفاده از نام متفاوت برای جلوگیری از تداخل با کتابخانه CDN
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function getProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) console.error(error);
  return data;
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'همین الان';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' دقیقه پیش';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' ساعت پیش';
  if (seconds < 604800) return Math.floor(seconds / 86400) + ' روز پیش';
  return new Date(date).toLocaleDateString('fa-IR');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function linkifyHashtags(text) {
  return escapeHtml(text).replace(/#(\w+)/g, '<a href="search.html?q=%23$1" class="hashtag">#$1</a>');
}
