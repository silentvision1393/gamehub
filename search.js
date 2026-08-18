let currentUser = null;

async function init() {
  currentUser = await getCurrentUser();
  if (!currentUser) { location.href = 'auth.html'; return; }
  document.getElementById('navProfile').href = 'profile.html?id=' + currentUser.id;
  document.getElementById('logoutBtn').onclick = async function() {
    await sb.auth.signOut();
    location.href = 'auth.html';
  };

  var q = new URLSearchParams(location.search).get('q') || '';
  document.getElementById('searchInput').value = q;
  if (q) doSearch(q);

  document.getElementById('searchInput').addEventListener('input', function(e) {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(function() {
      doSearch(e.target.value.trim());
    }, 300);
  });
}

async function doSearch(q) {
  var el = document.getElementById('searchResults');
  if (!q) { el.innerHTML = ''; return; }

  el.innerHTML = '<div class="spinner"></div>';

  var { data: users } = await sb
    .from('profiles')
    .select('*')
    .or('username.ilike.%' + q + '%,display_name.ilike.%' + q + '%')
    .limit(10);

  var tagQ = q.startsWith('#') ? q.slice(1) : q;
  var { data: tags } = await sb
    .from('hashtags')
    .select('*')
    .ilike('name', '%' + tagQ + '%')
    .limit(5);

  var { data: posts } = await sb
    .from('posts')
    .select('*, profiles:user_id(username,display_name,avatar_url), likes(id), comments(id)')
    .ilike('content', '%' + q + '%')
    .order('created_at', { ascending: false })
    .limit(20);

  var html = '';

  if (users && users.length) {
    html += '<div style="padding:12px 16px;font-weight:700;color:var(--text-muted)">کاربران</div>';
    html += users.map(function(u) {
      return '<a href="profile.html?id=' + u.id + '" class="post" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit">' +
        '<img class="avatar" src="' + (u.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.id) + '">' +
        '<div>' +
          '<div class="display-name">' + escapeHtml(u.display_name) + '</div>' +
          '<div class="username">@' + escapeHtml(u.username) + '</div>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  if (tags && tags.length) {
    html += '<div style="padding:12px 16px;font-weight:700;color:var(--text-muted)">هشتگ‌ها</div>';
    html += tags.map(function(t) {
      return '<div class="post" style="cursor:pointer" onclick="location.href=\'search.html?q=%23' + t.name + '\'">' +
        '<strong>#' + escapeHtml(t.name) + '</strong>' +
        '<div style="color:var(--text-muted);font-size:0.9rem">' + t.post_count + ' پست</div>' +
      '</div>';
    }).join('');
  }

  if (posts && posts.length) {
    html += '<div style="padding:12px 16px;font-weight:700;color:var(--text-muted)">پست‌ها</div>';
    html += posts.map(function(p) {
      return '<article class="post" onclick="location.href=\'post.html?id=' + p.id + '\'">' +
        '<div class="post-header">' +
          '<img class="avatar avatar-sm" src="' + ((p.profiles && p.profiles.avatar_url) || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.user_id)) + '">' +
          '<div>' +
            '<div class="post-meta">' +
              '<span class="display-name">' + escapeHtml((p.profiles && p.profiles.display_name) || '') + '</span>' +
              '<span class="username">@' + escapeHtml((p.profiles && p.profiles.username) || '') + '</span>' +
            '</div>' +
            '<div class="post-content">' + linkifyHashtags(p.content) + '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  el.innerHTML = html || '<div class="empty">نتیجه‌ای یافت نشد</div>';
}

init();
