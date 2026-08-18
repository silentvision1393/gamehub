let currentUser = null;
let profileUserId = null;

async function init() {
  currentUser = await getCurrentUser();
  if (!currentUser) { window.location.href = 'auth.html'; return; }

  var params = new URLSearchParams(window.location.search);
  profileUserId = params.get('id') || currentUser.id;

  document.getElementById('navProfile').href = 'profile.html?id=' + currentUser.id;
  document.getElementById('logoutBtn').addEventListener('click', async function() {
    await sb.auth.signOut();
    window.location.href = 'auth.html';
  });

  await loadProfile();
}

async function loadProfile() {
  var profile = await getProfile(profileUserId);
  if (!profile) {
    document.getElementById('profileContent').innerHTML = '<div class="empty">کاربر یافت نشد</div>';
    return;
  }

  var { count: followers } = await sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileUserId);
  var { count: following } = await sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileUserId);

  var isFollowing = false;
  if (currentUser.id !== profileUserId) {
    var { data } = await sb.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', profileUserId).maybeSingle();
    isFollowing = !!data;
  }

  var { data: posts } = await sb
    .from('posts')
    .select('*, profiles:user_id (id, username, display_name, avatar_url), likes(id, user_id), comments(id)')
    .eq('user_id', profileUserId)
    .order('created_at', { ascending: false });

  var avatar = profile.avatar_url || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.id);
  var coverStyle = profile.cover_url
    ? "background-image:url('" + profile.cover_url + "')"
    : 'background:linear-gradient(135deg,#0a1628,#001a2e)';

  var actionBtn = '';
  if (currentUser.id === profileUserId) {
    actionBtn = '<a href="settings.html" class="btn btn-ghost">ویرایش پروفایل</a>';
  } else {
    actionBtn = '<button class="btn ' + (isFollowing ? 'btn-ghost' : 'btn-primary') + '" id="followBtn">' + (isFollowing ? 'دنبال‌شده' : 'دنبال کردن') + '</button>';
  }

  var postsHtml = (posts && posts.length)
    ? posts.map(function(p) { return renderPostCard(p); }).join('')
    : '<div class="empty">هنوز پستی ندارد</div>';

  document.getElementById('headerTitle').textContent = profile.display_name;
  document.getElementById('profileContent').innerHTML =
    '<div class="profile-header">' +
      '<div class="cover" style="' + coverStyle + '"></div>' +
      '<div class="profile-info">' +
        '<div class="profile-avatar-wrap">' +
          '<img class="avatar avatar-lg" src="' + avatar + '">' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">' +
          '<div>' +
            '<h2 style="font-size:1.4rem">' + escapeHtml(profile.display_name) + '</h2>' +
            '<div class="username">@' + escapeHtml(profile.username) + '</div>' +
          '</div>' +
          actionBtn +
        '</div>' +
        '<p style="margin:12px 0;white-space:pre-wrap">' + escapeHtml(profile.bio || '') + '</p>' +
        '<div class="profile-stats">' +
          '<span><strong>' + (following || 0) + '</strong> دنبال‌شده</span>' +
          '<span><strong>' + (followers || 0) + '</strong> دنبال‌کننده</span>' +
          '<span style="color:var(--text-muted);font-size:0.9rem">عضویت: ' + new Date(profile.created_at).toLocaleDateString('fa-IR') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="userPosts">' + postsHtml + '</div>';

  if (currentUser.id !== profileUserId) {
    var followBtn = document.getElementById('followBtn');
    if (followBtn) followBtn.addEventListener('click', toggleFollow);
  }
  attachLikeDelete();
}

function renderPostCard(p) {
  var liked = p.likes && p.likes.some(function(l) { return l.user_id === currentUser.id; });
  var avatar = (p.profiles && p.profiles.avatar_url) || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.user_id);
  var displayName = (p.profiles && p.profiles.display_name) || '';
  var uname = (p.profiles && p.profiles.username) || '';

  var mediaHtml = '';
  if (p.media_url) {
    if (p.media_type === 'video') {
      mediaHtml = '<div class="post-media"><video src="' + p.media_url + '" controls></video></div>';
    } else {
      mediaHtml = '<div class="post-media"><img src="' + p.media_url + '"></div>';
    }
  }

  var deleteBtn = '';
  if (p.user_id === currentUser.id) {
    deleteBtn = '<button class="action-btn delete-btn" data-id="' + p.id + '">🗑️</button>';
  }

  return '<article class="post" data-id="' + p.id + '">' +
    '<div class="post-header">' +
      '<img class="avatar" src="' + avatar + '">' +
      '<div>' +
        '<div class="post-meta">' +
          '<span class="display-name">' + escapeHtml(displayName) + '</span>' +
          '<span class="username">@' + escapeHtml(uname) + '</span>' +
          '<span class="time">· ' + timeAgo(p.created_at) + '</span>' +
        '</div>' +
        '<div class="post-content">' + linkifyHashtags(p.content) + '</div>' +
        mediaHtml +
        '<div class="post-actions">' +
          '<button class="action-btn" onclick="location.href=\'post.html?id=' + p.id + '\'">💬 ' + ((p.comments && p.comments.length) || 0) + '</button>' +
          '<button class="action-btn like-btn' + (liked ? ' liked' : '') + '" data-id="' + p.id + '">' + (liked ? '❤️' : '🤍') + ' ' + ((p.likes && p.likes.length) || 0) + '</button>' +
          deleteBtn +
        '</div>' +
      '</div>' +
    '</div>' +
  '</article>';
}

async function toggleFollow() {
  var { data } = await sb.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', profileUserId).maybeSingle();
  if (data) {
    await sb.from('follows').delete().eq('id', data.id);
  } else {
    await sb.from('follows').insert({ follower_id: currentUser.id, following_id: profileUserId });
  }
  await loadProfile();
}

function attachLikeDelete() {
  document.querySelectorAll('.like-btn').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var postId = btn.dataset.id;
      var isLiked = btn.classList.contains('liked');
      if (isLiked) await sb.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      else await sb.from('likes').insert({ post_id: postId, user_id: currentUser.id });
      await loadProfile();
    });
  });
  document.querySelectorAll('.delete-btn').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      if (confirm('حذف شود؟')) {
        await sb.from('posts').delete().eq('id', btn.dataset.id);
        await loadProfile();
      }
    });
  });
}

init();
