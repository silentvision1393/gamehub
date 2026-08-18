let currentUser = null;
let currentProfile = null;
let selectedMedia = null;

async function init() {
  currentUser = await getCurrentUser();
  if (!currentUser) {
    window.location.href = 'auth.html';
    return;
  }
  currentProfile = await getProfile(currentUser.id);

  document.getElementById('composeAvatar').src = currentProfile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + currentUser.id;
  document.getElementById('navProfile').href = 'profile.html?id=' + currentUser.id;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = 'auth.html';
  });

  document.getElementById('mediaInput').addEventListener('change', handleMediaSelect);
  document.getElementById('postBtn').addEventListener('click', createPost);

  await loadFeed();
  await loadTrending();
  await loadSuggestions();
}

function handleMediaSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedMedia = file;
  const preview = document.getElementById('mediaPreview');
  preview.style.display = 'block';
  if (file.type.startsWith('image/')) {
    preview.innerHTML = '<img src="' + URL.createObjectURL(file) + '" style="max-height:150px;border-radius:12px">';
  } else {
    preview.innerHTML = '<video src="' + URL.createObjectURL(file) + '" style="max-height:150px;border-radius:12px" controls></video>';
  }
}

async function createPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content && !selectedMedia) return;

  const btn = document.getElementById('postBtn');
  btn.disabled = true;
  btn.textContent = 'در حال ارسال...';

  let media_url = null;
  let media_type = null;

  if (selectedMedia) {
    const ext = selectedMedia.name.split('.').pop();
    const path = currentUser.id + '/' + Date.now() + '.' + ext;
    const { error: upError } = await sb.storage.from('media').upload(path, selectedMedia);
    if (upError) {
      alert('خطا در آپلود: ' + upError.message);
      btn.disabled = false;
      btn.textContent = 'ارسال';
      return;
    }
    const { data: urlData } = sb.storage.from('media').getPublicUrl(path);
    media_url = urlData.publicUrl;
    media_type = selectedMedia.type.startsWith('video/') ? 'video' : 'image';
  }

  const { error } = await sb.from('posts').insert({
    user_id: currentUser.id,
    content: content || ' ',
    media_url,
    media_type
  });

  if (error) {
    alert('خطا: ' + error.message);
  } else {
    document.getElementById('postContent').value = '';
    document.getElementById('mediaPreview').style.display = 'none';
    selectedMedia = null;
    document.getElementById('mediaInput').value = '';
    await loadFeed();
  }
  btn.disabled = false;
  btn.textContent = 'ارسال';
}

async function loadFeed() {
  const { data: posts, error } = await sb
    .from('posts')
    .select('*, profiles:user_id (id, username, display_name, avatar_url), likes (id, user_id), comments (id)')
    .order('created_at', { ascending: false })
    .limit(50);

  const feed = document.getElementById('feed');
  if (error || !posts || !posts.length) {
    feed.innerHTML = '<div class="empty">هنوز پستی نیست. اولین پست را بفرست!</div>';
    return;
  }

  feed.innerHTML = posts.map(function(p) { return renderPost(p); }).join('');
  attachPostEvents();
}

function renderPost(p) {
  var liked = p.likes && p.likes.some(function(l) { return l.user_id === currentUser.id; });
  var likeCount = (p.likes && p.likes.length) || 0;
  var commentCount = (p.comments && p.comments.length) || 0;
  var avatar = (p.profiles && p.profiles.avatar_url) || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.user_id);
  var displayName = (p.profiles && p.profiles.display_name) || 'کاربر';
  var uname = (p.profiles && p.profiles.username) || '';

  var mediaHtml = '';
  if (p.media_url) {
    if (p.media_type === 'video') {
      mediaHtml = '<div class="post-media"><video src="' + p.media_url + '" controls></video></div>';
    } else {
      mediaHtml = '<div class="post-media"><img src="' + p.media_url + '" alt=""></div>';
    }
  }

  var deleteBtn = '';
  if (p.user_id === currentUser.id) {
    deleteBtn = '<button class="action-btn delete-btn" data-id="' + p.id + '">🗑️</button>';
  }

  return '<article class="post" data-id="' + p.id + '">' +
    '<div class="post-header">' +
      '<a href="profile.html?id=' + p.user_id + '"><img class="avatar" src="' + avatar + '" alt=""></a>' +
      '<div>' +
        '<div class="post-meta">' +
          '<a href="profile.html?id=' + p.user_id + '" class="display-name">' + escapeHtml(displayName) + '</a>' +
          '<span class="username">@' + escapeHtml(uname) + '</span>' +
          '<span class="time">· ' + timeAgo(p.created_at) + '</span>' +
        '</div>' +
        '<div class="post-content">' + linkifyHashtags(p.content) + '</div>' +
        mediaHtml +
        '<div class="post-actions">' +
          '<button class="action-btn comment-btn" data-id="' + p.id + '">💬 ' + commentCount + '</button>' +
          '<button class="action-btn like-btn' + (liked ? ' liked' : '') + '" data-id="' + p.id + '">' + (liked ? '❤️' : '🤍') + ' ' + likeCount + '</button>' +
          deleteBtn +
        '</div>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function attachPostEvents() {
  document.querySelectorAll('.like-btn').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var postId = btn.dataset.id;
      var isLiked = btn.classList.contains('liked');
      if (isLiked) {
        await sb.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      } else {
        await sb.from('likes').insert({ post_id: postId, user_id: currentUser.id });
      }
      await loadFeed();
    });
  });

  document.querySelectorAll('.delete-btn').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      if (confirm('پست حذف شود؟')) {
        await sb.from('posts').delete().eq('id', btn.dataset.id);
        await loadFeed();
      }
    });
  });

  document.querySelectorAll('.comment-btn, .post').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target.closest('.like-btn') || e.target.closest('.delete-btn')) return;
      var id = el.dataset.id || (el.closest('.post') && el.closest('.post').dataset.id);
      if (id) window.location.href = 'post.html?id=' + id;
    });
  });
}

async function loadTrending() {
  var { data } = await sb
    .from('hashtags')
    .select('name, post_count')
    .order('post_count', { ascending: false })
    .limit(5);

  var el = document.getElementById('trending');
  if (!data || !data.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">هنوز هشتگی نیست</p>';
    return;
  }
  el.innerHTML = data.map(function(h) {
    return '<div class="trend-item" onclick="location.href=\'search.html?q=%23' + h.name + '\'">' +
      '<strong>#' + escapeHtml(h.name) + '</strong>' +
      '<div style="font-size:0.85rem;color:var(--text-muted)">' + h.post_count + ' پست</div>' +
    '</div>';
  }).join('');
}

async function loadSuggestions() {
  var { data: following } = await sb
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUser.id);

  var followingIds = (following || []).map(function(f) { return f.following_id; });
  followingIds.push(currentUser.id);

  var query = sb
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .limit(5);

  if (followingIds.length > 0) {
    query = query.not('id', 'in', '(' + followingIds.join(',') + ')');
  }

  var { data: users } = await query;

  var el = document.getElementById('suggestions');
  if (!users || !users.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">کاربری برای پیشنهاد نیست</p>';
    return;
  }

  el.innerHTML = users.map(function(u) {
    return '<div class="suggest-user">' +
      '<img class="avatar avatar-sm" src="' + (u.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.id) + '">' +
      '<div class="info">' +
        '<div class="display-name">' + escapeHtml(u.display_name) + '</div>' +
        '<div class="username">@' + escapeHtml(u.username) + '</div>' +
      '</div>' +
      '<button class="btn btn-primary follow-suggest" data-id="' + u.id + '">دنبال</button>' +
    '</div>';
  }).join('');

  document.querySelectorAll('.follow-suggest').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await sb.from('follows').insert({
        follower_id: currentUser.id,
        following_id: btn.dataset.id
      });
      btn.textContent = '✓';
      btn.disabled = true;
    });
  });
}

init();
