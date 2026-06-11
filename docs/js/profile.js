// profile.js

let pendingBlob = null;

// ── Auth guard ──────────────────────────────────────────────────────────────
if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

// ── Nav setup (matches home.js pattern) ────────────────────────────────────
function toggleNav() {
  document.getElementById("nav-menu").classList.toggle("open");
}

function toggleDropdown() {
  document.getElementById("nav-dropdown").classList.toggle("open");
}

document.addEventListener("click", (e) => {
  const avatar = document.querySelector(".nav-avatar");
  if (avatar && !avatar.contains(e.target)) {
    document.getElementById("nav-dropdown")?.classList.remove("open");
  }
});

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// ── Load profile ────────────────────────────────────────────────────────────
async function loadProfile() {
  const profile = await getProfile();

  // Username in nav
  const username = profile.username || localStorage.getItem("username") || "?";
  const avatarUrl = profile.avatar_url || null;

  document.getElementById("dropdown-username").textContent = username;

  // Nav avatar button — photo or initial
  const avatarBtn = document.getElementById("avatar-btn");
  if (avatarUrl) {
    avatarBtn.innerHTML = `<img src="${avatarUrl}" alt="${username}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else {
    avatarBtn.textContent = username.charAt(0).toUpperCase();
  }

  // Admin link
  if (await isAdmin()) {
    document.getElementById("admin-link").style.display = "";
  }

  // Profile section — username + points
  document.getElementById("profile-username").textContent = username;
  const pointsEl = document.getElementById("profile-points");
  const pointsVal = document.getElementById("profile-points-value");
  if (profile.total_points !== undefined) {
    pointsVal.textContent = profile.total_points;
    pointsEl.style.display = "";
  }

  // Profile avatar image or initials
  const skeleton = document.getElementById("avatar-skeleton");
  const img = document.getElementById("profile-avatar-img");
  const initials = document.getElementById("profile-avatar-initials");

  skeleton.style.display = "none";

  if (avatarUrl) {
    img.src = avatarUrl;
    img.style.display = "block";
    img.onerror = () => {
      img.style.display = "none";
      initials.textContent = username.charAt(0).toUpperCase();
      initials.style.display = "flex";
    };
  } else {
    initials.textContent = username.charAt(0).toUpperCase();
    initials.style.display = "flex";
  }
}

// ── Image select → canvas crop/resize ──────────────────────────────────────
function handleAvatarSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Crop to square from center, then scale to 400×400
      const canvas = document.getElementById("crop-canvas");
      const ctx = canvas.getContext("2d");

      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      ctx.clearRect(0, 0, 400, 400);
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);

      // Show previews
      const dataUrl = canvas.toDataURL("image/png");
      document.getElementById("crop-preview").src = dataUrl;
      document.getElementById("preview-large").src = dataUrl;
      document.getElementById("preview-small").src = dataUrl;

      // Store blob for upload
      canvas.toBlob((blob) => {
        pendingBlob = blob;
      }, "image/png");

      // Show crop section
      document.getElementById("no-crop-section").style.display = "none";
      document.getElementById("crop-section").style.display = "block";
      document.getElementById("upload-status").style.display = "none";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Reset input so selecting the same file again triggers onchange
  event.target.value = "";
}

// ── Cancel ──────────────────────────────────────────────────────────────────
function cancelUpload() {
  pendingBlob = null;
  document.getElementById("crop-section").style.display = "none";
  document.getElementById("no-crop-section").style.display = "block";
  document.getElementById("upload-status").style.display = "none";
}

// ── Upload ──────────────────────────────────────────────────────────────────
async function uploadAvatar() {
  if (!pendingBlob) return;

  const btn = document.getElementById("upload-btn");
  const btnText = document.getElementById("upload-btn-text");
  const spinner = document.getElementById("upload-spinner");
  const statusEl = document.getElementById("upload-status");

  btn.disabled = true;
  btnText.style.display = "none";
  spinner.style.display = "inline";

  const result = await uploadAvatarApi(pendingBlob);

  btn.disabled = false;
  btnText.style.display = "inline";
  spinner.style.display = "none";

  if (result.error) {
    statusEl.style.display = "block";
    statusEl.style.color = "var(--error, #f87171)";
    statusEl.textContent = `Feil: ${result.error}`;
    return;
  }

  // Success — update avatar everywhere on the page
  const newUrl = result.avatar_url;
  pendingBlob = null;

  // Update large profile image
  const img = document.getElementById("profile-avatar-img");
  const initials = document.getElementById("profile-avatar-initials");
  img.src = newUrl;
  img.style.display = "block";
  initials.style.display = "none";

  // Update nav avatar button
  const username = localStorage.getItem("username") || "?";
  const avatarBtn = document.getElementById("avatar-btn");
  avatarBtn.innerHTML = `<img src="${newUrl}" alt="${username}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;

  // Hide crop section, show upload button again
  document.getElementById("crop-section").style.display = "none";
  document.getElementById("no-crop-section").style.display = "block";

  statusEl.style.display = "block";
  statusEl.style.color = "var(--accent)";
  statusEl.textContent = "✅ Profilbilde oppdatert!";
}

// ── Init ────────────────────────────────────────────────────────────────────
loadProfile();
