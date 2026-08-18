let currentUser = null;
let postId = null;

async function init() {
  currentUser = await getCurrentUser();
  if (!currentUser) { location.href = 'auth.html'; return; }
  postId = new URLSearchParams(location.search).get('id');
  if (!postId) { location.href = 'index.html'; return; }

  document.getElementById('navProfile').href = 'profile.html?id=' + currentUser.id;
  document.getElementById('logoutBtn').onclick = async function() {
    await sb.auth.signOut();
    location.href = 'auth.html';
  };

  var profile = await getProfile(currentUser.id);
  document.getElementById('commentAvatar').src = (profile && profile.avatar_url) || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + currentUser.id);

  document.getElementById('commentBtn').onclick = addComment;
  await loadPost();
  await loadComments();
}

async function loadPost() {
  var { data: p } = await sb
    .from('posts')
    .select('*, profiles:user_id(*), likes(id,user_id), comments(id)')
    .eq('id', postId)
    .single();

  if (!p) {
    document.getElementById('postDetail').innerHTML = '<div class="empty">پست یافت نشد</div>';
    return;
  }

  var liked = p.likes && p.likes.some(function(l) { return l.user_id === currentUser.id; });
  var avatar = (p.profiles && p.profiles.avatar_url) || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.user_id);

  var mediaHtml = '';
  if (p.media_url) {
    if (p.media_type === 'video') {
      mediaHtml = '<div class="post-media"><video src="' + p.media_url + '" controls style="max-height:500px"></video></div>';
    } else {
      mediaHtml = '<div class="post-media"><img src="' + p.media_url + '"></div>';
    }
  }

  var deleteBtn = '';
  if (p.user_id === currentUser.id) {
    deleteBtn = '<button class="action-btn" id="deletePostBtn">🗑️ حذف</button>';
  }

  document.getElementById('postDetail').innerHTML =
    '<article class="post" style="border:none">' +
      '<div class="post-header">' +
        '<a href="profile.html?id=' + p.user_id + '"><img class="avatar" src="' + avatar + '"></a>' +
        '<div>' +
          '<div class="post-meta">' +
            '<a href="profile.html?id=' + p.user_id + '" class="display-name">' + escapeHtml(p.profiles.display_name) + '</a>' +
            '<span class="username">@' + escapeHtml(p.profiles.username) + '</span>' +
          '</div>' +
          '<div class="time">' + timeAgo(p.created_at) + '</div>' +
          '<div class="post-content" style="font-size:1.2rem;margin:16px 0">' + linkifyHashtags(p.content) + '</div>' +
          mediaHtml +
          '<div class="post-actions" style="margin-top:16px">' +
            '<button class="action-btn like-btn' + (liked ? ' liked' : '') + '" id="likeBtn">' + (liked ? '❤️' : '🤍') + ' ' + ((p.likes && p.likes.length) || 0) + '</button>' +
            '<span>💬 ' + ((p.comments && p.comments.length) || 0) + '</span>' +
            deleteBtn +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';

  var likeBtn = document.getElementById('likeBtn');
  if (likeBtn) {
    likeBtn.addEventListener('click', async function() {
      var currentlyLiked = document.getElementById('likeBtn').classList.contains('liked');
      if (currentlyLiked) await sb.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      else await sb.from('likes').insert({ post_id: postId, user_id: currentUser.id });
      await loadPost();
    });
  }

  var deletePostBtn = document.getElementById('deletePostBtn');
  if (deletePostBtn) {
    deletePostBtn.addEventListener('click', async function() {
      if (confirm('حذف پست؟')) {
        await sb.from('posts').delete().eq('id', postId);
        location.href = 'index.html';
      }
    });
  }
}

async function loadComments() {
  var { data } = await sb
    .from('comments')
    .select('*, profiles:user_id(username, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  var el = document.getElementById('commentsList');
  if (!data || !data.length) {
    el.innerHTML = '<div class="empty" style="padding:30px">هنوز کامنتی نیست</div>';
    return;
  }
  el.innerHTML = data.map(function(c) {
    return '<div class="post" style="padding:12px 16px">' +
      '<div class="post-header">' +
        '<img class="avatar avatar-sm" src="' + ((c.profiles && c.profiles.avatar_url) || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + c.user_id)) + '">' +
        '<div>' +
          '<div class="post-meta">' +
            '<span class="display-name">' + escapeHtml((c.profiles && c.profiles.display_name) || '') + '</span>' +
            '<span class="username">@' + escapeHtml((c.profiles && c.profiles.username) || '') + '</span>' +
            '<span class="time">· ' + timeAgo(c.created_at) + '</span>' +
          '</div>' +
          '<div>' + escapeHtml(c.content) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function addComment() {
  var content = document.getElementById('commentInput').value.trim();
  if (!content) return;
  await sb.from('comments').insert({ post_id: postId, user_id: currentUser.id, content: content });
  document.getElementById('commentInput').value = '';
  await loadComments();
  await loadPost();
}

init();
