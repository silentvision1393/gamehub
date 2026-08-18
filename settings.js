let currentUser = null;
let profile = null;

async function init() {
  currentUser = await getCurrentUser();
  if (!currentUser) { location.href = 'auth.html'; return; }
  profile = await getProfile(currentUser.id);

  document.getElementById('navProfile').href = 'profile.html?id=' + currentUser.id;
  document.getElementById('logoutBtn').onclick = async function() {
    await sb.auth.signOut();
    location.href = 'auth.html';
  };

  document.getElementById('displayName').value = (profile && profile.display_name) || '';
  document.getElementById('username').value = (profile && profile.username) || '';
  document.getElementById('bio').value = (profile && profile.bio) || '';
  if (profile && profile.avatar_url) {
    document.getElementById('avatarPreview').src = profile.avatar_url;
    document.getElementById('avatarPreview').style.display = 'block';
  }

  document.getElementById('avatarInput').onchange = function(e) {
    if (e.target.files[0]) {
      document.getElementById('avatarPreview').src = URL.createObjectURL(e.target.files[0]);
      document.getElementById('avatarPreview').style.display = 'block';
    }
  };

  document.getElementById('saveBtn').onclick = saveProfile;
  document.getElementById('deleteAccountBtn').onclick = deleteAccount;
}

async function saveProfile() {
  var display_name = document.getElementById('displayName').value.trim();
  var username = document.getElementById('username').value.trim().toLowerCase();
  var bio = document.getElementById('bio').value.trim();

  if (!display_name || !username) { alert('نام و نام کاربری الزامی است'); return; }

  if (username !== profile.username) {
    var { data } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
    if (data) { alert('نام کاربری تکراری است'); return; }
  }

  var avatar_url = profile.avatar_url;
  var cover_url = profile.cover_url;

  var avatarFile = document.getElementById('avatarInput').files[0];
  if (avatarFile) {
    var path = currentUser.id + '/avatar.' + avatarFile.name.split('.').pop();
    await sb.storage.from('avatars').upload(path, avatarFile, { upsert: true });
    avatar_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
  }

  var coverFile = document.getElementById('coverInput').files[0];
  if (coverFile) {
    var path2 = currentUser.id + '/cover.' + coverFile.name.split('.').pop();
    await sb.storage.from('covers').upload(path2, coverFile, { upsert: true });
    cover_url = sb.storage.from('covers').getPublicUrl(path2).data.publicUrl + '?t=' + Date.now();
  }

  var { error } = await sb.from('profiles').update({
    display_name: display_name,
    username: username,
    bio: bio,
    avatar_url: avatar_url,
    cover_url: cover_url,
    updated_at: new Date().toISOString()
  }).eq('id', currentUser.id);

  if (error) alert('خطا: ' + error.message);
  else {
    alert('ذخیره شد!');
    profile = await getProfile(currentUser.id);
  }
}

async function deleteAccount() {
  if (!confirm('آیا مطمئن هستید؟ تمام داده‌ها برای همیشه حذف می‌شود!')) return;
  if (!confirm('این عمل غیرقابل بازگشت است. ادامه می‌دهید؟')) return;

  await sb.from('profiles').delete().eq('id', currentUser.id);
  await sb.auth.signOut();
  alert('حساب حذف شد.');
  location.href = 'auth.html';
}

init();
