// profile.js

// ── Crop state ───────────────────────────────────────────────────────────────
let sourceImage = null;
let cropX = 0; // center of crop circle in source image coords
let cropY = 0;
let cropRadius = 0; // radius of crop circle in source image coords
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let cropStartX = 0;
let cropStartY = 0;

// ── Auth guard ───────────────────────────────────────────────────────────────
if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

// ── Nav setup ────────────────────────────────────────────────────────────────
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

// ── Load profile ─────────────────────────────────────────────────────────────
async function loadProfile() {
  const profile = await getProfile();
  const username = profile.username || localStorage.getItem("username") || "?";
  const avatarUrl = profile.avatar_url || null;

  document.getElementById("dropdown-username").textContent = username;

  const avatarBtn = document.getElementById("avatar-btn");
  if (avatarUrl) {
    avatarBtn.innerHTML = `<img src="${avatarUrl}" alt="${username}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else {
    avatarBtn.textContent = username.charAt(0).toUpperCase();
  }

  if (await isAdmin()) {
    document.getElementById("admin-link").style.display = "";
  }
  const adminLink2 = document.getElementById("admin-link-secondary");
  if (adminLink2) adminLink2.style.display = "block";

  document.getElementById("profile-username").textContent = username;
  const pointsEl = document.getElementById("profile-points");
  const pointsVal = document.getElementById("profile-points-value");
  if (profile.total_points !== undefined) {
    pointsVal.textContent = profile.total_points;
    pointsEl.style.display = "";
  }

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

// ── Image select ─────────────────────────────────────────────────────────────
function handleAvatarSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;

      // Start with circle centered, radius = half of shorter side
      cropRadius = Math.min(img.width, img.height) / 2;
      cropX = img.width / 2;
      cropY = img.height / 2;

      setupCropCanvas();
      drawCrop();
      updatePreviews();

      document.getElementById("no-crop-section").style.display = "none";
      document.getElementById("crop-section").style.display = "block";
      document.getElementById("upload-status").style.display = "none";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function setupCropCanvas() {
  const canvas = document.getElementById("crop-canvas");

  const maxDisplay = 600;
  const aspect = sourceImage.width / sourceImage.height;
  if (aspect >= 1) {
    canvas.width = Math.min(sourceImage.width, maxDisplay);
    canvas.height = Math.round(canvas.width / aspect);
  } else {
    canvas.height = Math.min(sourceImage.height, maxDisplay);
    canvas.width = Math.round(canvas.height * aspect);
  }

  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.cursor = "move";

  canvas.onmousedown = startDrag;
  canvas.onmousemove = onDrag;
  canvas.onmouseup = endDrag;
  canvas.onmouseleave = endDrag;

  canvas.ontouchstart = (e) => {
    e.preventDefault();
    startDrag(e.touches[0]);
  };
  canvas.ontouchmove = (e) => {
    e.preventDefault();
    onDrag(e.touches[0]);
  };
  canvas.ontouchend = endDrag;
}

// Convert mouse/touch event to source image coordinates
function eventToImageCoords(e) {
  const canvas = document.getElementById("crop-canvas");
  const rect = canvas.getBoundingClientRect();
  const scaleX = sourceImage.width / rect.width;
  const scaleY = sourceImage.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function startDrag(e) {
  isDragging = true;
  const pos = eventToImageCoords(e);
  dragStartX = pos.x;
  dragStartY = pos.y;
  cropStartX = cropX;
  cropStartY = cropY;
  document.getElementById("crop-canvas").style.cursor = "grabbing";
}

function onDrag(e) {
  if (!isDragging || !sourceImage) return;
  const pos = eventToImageCoords(e);

  // Circle moves with the drag
  cropX = cropStartX + (pos.x - dragStartX);
  cropY = cropStartY + (pos.y - dragStartY);

  // Clamp so circle stays fully within image
  cropX = Math.max(cropRadius, Math.min(sourceImage.width - cropRadius, cropX));
  cropY = Math.max(
    cropRadius,
    Math.min(sourceImage.height - cropRadius, cropY),
  );

  drawCrop();
  updatePreviews();
}

function endDrag() {
  isDragging = false;
  const canvas = document.getElementById("crop-canvas");
  if (canvas) canvas.style.cursor = "move";
}

function drawCrop() {
  const canvas = document.getElementById("crop-canvas");
  const ctx = canvas.getContext("2d");

  // Scale factors from source image coords to canvas display coords
  const scaleX = canvas.width / sourceImage.width;
  const scaleY = canvas.height / sourceImage.height;

  const dispCX = cropX * scaleX;
  const dispCY = cropY * scaleY;
  const dispR = cropRadius * scaleX;

  // Draw full image
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  // Dark overlay over whole canvas, then punch out the circle
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Punch out circle using destination-out
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(dispCX, dispCY, dispR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Redraw image clipped to circle (so it's full brightness inside)
  ctx.save();
  ctx.beginPath();
  ctx.arc(dispCX, dispCY, dispR, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Circle border
  ctx.beginPath();
  ctx.arc(dispCX, dispCY, dispR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(74,222,128,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function updatePreviews() {
  if (!sourceImage) return;

  // Render the crop to a 400×400 canvas clipped to circle
  const size = 400;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d");

  // Clip to circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  // Draw the cropped square (bounding box of circle) scaled to 400×400
  const bx = cropX - cropRadius;
  const by = cropY - cropRadius;
  const bs = cropRadius * 2;
  ctx.drawImage(sourceImage, bx, by, bs, bs, 0, 0, size, size);

  const dataUrl = off.toDataURL("image/png");

  ["crop-preview-circle", "preview-large", "preview-small"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.src = dataUrl;
  });
}

// ── Cancel ────────────────────────────────────────────────────────────────────
function cancelUpload() {
  sourceImage = null;
  document.getElementById("crop-section").style.display = "none";
  document.getElementById("no-crop-section").style.display = "block";
  document.getElementById("upload-status").style.display = "none";
  const canvas = document.getElementById("crop-canvas");
  if (canvas)
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

// ── Upload ────────────────────────────────────────────────────────────────────
async function uploadAvatar() {
  if (!sourceImage) return;

  const btn = document.getElementById("upload-btn");
  const btnText = document.getElementById("upload-btn-text");
  const spinner = document.getElementById("upload-spinner");
  const statusEl = document.getElementById("upload-status");

  btn.disabled = true;
  btnText.style.display = "none";
  spinner.style.display = "inline";

  // Render final 400×400 PNG with transparent background outside circle
  const size = 400;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d");

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  const bx = cropX - cropRadius;
  const by = cropY - cropRadius;
  const bs = cropRadius * 2;
  ctx.drawImage(sourceImage, bx, by, bs, bs, 0, 0, size, size);

  const blob = await new Promise((res) => off.toBlob(res, "image/png"));
  const result = await uploadAvatarApi(blob);

  btn.disabled = false;
  btnText.style.display = "inline";
  spinner.style.display = "none";

  if (result.error) {
    statusEl.style.display = "block";
    statusEl.style.color = "var(--error, #f87171)";
    statusEl.textContent = `Feil: ${result.error}`;
    return;
  }

  const newUrl = result.avatar_url;
  sourceImage = null;

  const img = document.getElementById("profile-avatar-img");
  const initials = document.getElementById("profile-avatar-initials");
  img.src = newUrl;
  img.style.display = "block";
  initials.style.display = "none";

  const username = localStorage.getItem("username") || "?";
  const avatarBtn = document.getElementById("avatar-btn");
  avatarBtn.innerHTML = `<img src="${newUrl}" alt="${username}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;

  document.getElementById("crop-section").style.display = "none";
  document.getElementById("no-crop-section").style.display = "block";

  statusEl.style.display = "block";
  statusEl.style.color = "var(--accent)";
  statusEl.textContent = "✅ Profilbilde oppdatert!";
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadProfile();
