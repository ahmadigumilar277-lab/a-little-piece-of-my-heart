const authScreen = document.querySelector("#auth-screen");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const authError = document.querySelector(".auth-error");
const toast = document.querySelector("#toast");
let supabase;
let content = {};
let persistedContent = {};
let memoryDrafts = [];
let reasonDrafts = [];
let updatedAt = "";
let toastTimer;
let stagedMusic = null;
let removeMusicOnSave = false;
let stagedVideo = null;
let removeVideoOnSave = false;
const allowedAudio = new Set(["audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/webm"]);
const allowedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const allowedVideos = new Map([["mp4", "video/mp4"], ["webm", "video/webm"]]);
const maxUploadSize = 50 * 1024 * 1024;

const defaultContent = {
  girlfriendName: "[Nama Dia]",
  websiteTitle: "a little piece of my heart",
  introSubtitle: "I have something special for you...",
  yourName: "[Nama Kamu]",
  closingMessage: "If I had to choose again, I'd still choose you.",
  personalDate: "[Tanggal spesial, opsional]",
  letter: [
    "Aku cuma ingin kamu tahu, kehadiranmu membuat hal-hal sederhana terasa lebih berarti.",
    "Thank you for being exactly who you are. Semoga kamu selalu ingat betapa berharganya dirimu, bukan hanya bagiku, tapi juga bagi dunia kecil yang kamu sentuh setiap hari.",
    "This little corner of the internet is just a reminder: you are loved, deeply and gently, in all the ordinary moments and all the extraordinary ones."
  ],
  memories: [],
  reasons: [],
  musicUrl: "",
  musicPath: "",
  videoUrl: "",
  videoPath: ""
};

function notify(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3600);
}

function setBusy(button, busy, label) {
  if (!button.dataset.defaultHtml) button.dataset.defaultHtml = button.innerHTML;
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  button.innerHTML = busy
    ? `${label || "Saving"}…<span class="button-busy" aria-hidden="true"></span>`
    : button.dataset.defaultHtml;
}

function normalizeContent(saved = {}) {
  return {
    ...structuredClone(defaultContent),
    ...saved,
    letter: Array.isArray(saved.letter) ? saved.letter : defaultContent.letter,
    memories: Array.isArray(saved.memories) ? saved.memories : [],
    reasons: Array.isArray(saved.reasons) ? saved.reasons : []
  };
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

async function loadConfiguration() {
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Supabase configuration is missing. Add the Vercel environment variables and deploy again.");
  }
  const config = await response.json();
  if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error("Supabase configuration is incomplete.");
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
}

async function fetchOwnerContent(user) {
  const { data: row, error } = await supabase
    .from("site_content")
    .select("id, owner_id, content, updated_at")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw new Error(`Could not load saved content: ${error.message}`);
  if (!row) throw new Error("No content record exists yet. Complete supabase/setup.sql and replace its owner UUID.");
  if (row.owner_id !== user.id) throw new Error("This account is not the website owner. Only the configured owner may use this dashboard.");
  return row;
}

async function openDashboard(user, fromLogin = false) {
  try {
    const row = await fetchOwnerContent(user);
    content = normalizeContent(row.content);
    persistedContent = normalizeContent(row.content);
    stagedVideo = null;
    removeVideoOnSave = false;
    memoryDrafts = structuredClone(content.memories);
    reasonDrafts = structuredClone(content.reasons);
    updatedAt = row.updated_at;
    authScreen.hidden = true;
    dashboard.hidden = false;
    document.querySelector("#owner-avatar").title = user.email || "Owner";
    renderAll();
  } catch (error) {
    if (fromLogin) await supabase.auth.signOut();
    authError.textContent = getErrorMessage(error);
    authScreen.hidden = false;
    dashboard.hidden = true;
  }
}

function renderAll() {
  const settings = document.querySelector("#settings-form");
  for (const [key, value] of Object.entries({
    girlfriendName: content.girlfriendName,
    websiteTitle: content.websiteTitle,
    introSubtitle: content.introSubtitle,
    yourName: content.yourName,
    closingMessage: content.closingMessage,
    personalDate: content.personalDate
  })) settings.elements.namedItem(key).value = value || "";
  document.querySelector("#letter-form [name=letter]").value = content.letter.join("\n\n");
  memoryDrafts = structuredClone(content.memories);
  reasonDrafts = structuredClone(content.reasons);
  updateLetterPreview();
  document.querySelector("#memory-count").textContent = String(content.memories.length);
  document.querySelector("#reason-count").textContent = String(content.reasons.length);
  document.querySelector("#last-updated").textContent = updatedAt ? new Date(updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not yet";
  renderMemories();
  renderReasons();
  renderMusic();
  renderVideo();
}

function showPanel(name) {
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("is-current", panel.id === `panel-${name}`));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.panel === name));
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function updateLetterPreview() {
  const text = document.querySelector("#letter-form [name=letter]").value.trim();
  document.querySelector("#letter-preview").textContent = text || "Your letter preview will appear here.";
}

async function saveContent(nextContent, button) {
  if (button) setBusy(button, true);
  try {
    const { data, error } = await supabase
      .from("site_content")
      .update({ content: nextContent, updated_at: new Date().toISOString() })
      .eq("id", "main")
      .select("updated_at")
      .single();
    if (error) throw error;
    content = normalizeContent(nextContent);
    persistedContent = structuredClone(content);
    updatedAt = data.updated_at;
    document.querySelector("#last-updated").textContent = new Date(updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    document.querySelector("#memory-count").textContent = String(content.memories.length);
    document.querySelector("#reason-count").textContent = String(content.reasons.length);
    notify("Saved with love. Your website is updated.");
    return true;
  } catch (error) {
    notify(`Couldn't save changes: ${getErrorMessage(error)}`, true);
    return false;
  } finally {
    if (button) setBusy(button, false);
  }
}

function renderMemories() {
  const list = document.querySelector("#memory-editor-list");
  list.querySelectorAll(".memory-editor").forEach((card) => {
    if (card.previewObjectUrl) URL.revokeObjectURL(card.previewObjectUrl);
  });
  list.replaceChildren();
  memoryDrafts.forEach((memory, index) => {
    const card = document.createElement("article");
    card.className = "memory-editor";
    card.innerHTML = `
      <div class="memory-image-wrap"><img alt=""><span aria-hidden="true">♡</span></div>
      <div class="memory-fields">
        <input aria-label="Memory date" data-field="date" placeholder="Date or moment">
        <input aria-label="Memory title" data-field="title" placeholder="Memory title">
        <input aria-label="Photo caption" class="span-two" data-field="caption" placeholder="Photo caption">
        <input aria-label="Memory description" class="span-two" data-field="note" placeholder="A little description">
        <label class="upload-inline">↑ <span>Choose or replace photo</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label>
        <button class="remove-photo" type="button">Remove photo</button>
      </div>
      <div class="memory-actions">
        <button class="icon-button move-up" type="button" aria-label="Move memory up">↑</button>
        <button class="icon-button move-down" type="button" aria-label="Move memory down">↓</button>
        <button class="icon-button danger delete-memory" type="button" aria-label="Delete memory">×</button>
      </div>`;
    card.dataset.imagePath = memory.imagePath || "";
    card.dataset.image = memory.image || "";
    ["date", "title", "caption", "note"].forEach((field) => {
      card.querySelector(`[data-field="${field}"]`).value = memory[field] || "";
    });
    const image = card.querySelector("img");
    if (memory.image) {
      image.src = memory.image;
      image.alt = memory.caption || memory.title || "Memory photo";
      card.querySelector(".memory-image-wrap").classList.add("has-image");
    } else {
      image.hidden = true;
    }
    card.querySelector("input[type=file]").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (!allowedImages.has(file.type) || file.size > maxUploadSize) {
        event.target.value = "";
        notify("Choose a JPG, PNG, WebP, or AVIF image up to 50 MB.", true);
        return;
      }
      card.pendingImage = file;
      if (card.previewObjectUrl) URL.revokeObjectURL(card.previewObjectUrl);
      card.previewObjectUrl = URL.createObjectURL(file);
      image.src = card.previewObjectUrl;
      image.alt = file.name;
      image.hidden = false;
      card.querySelector(".memory-image-wrap").classList.add("has-image");
    });
    list.append(card);
  });
  if (memoryDrafts.length === 0) list.innerHTML = '<div class="empty-card">Your story is waiting for its first little memory.</div>';
}

function addMemory() {
  const drafts = readMemoryCards().map(({ card, value }) => ({ value, pendingImage: card.pendingImage }));
  memoryDrafts = drafts.map(({ value }) => value);
  memoryDrafts.push({ date: "", title: "", caption: "", note: "", image: "", imagePath: "" });
  renderMemories();
  const cards = [...document.querySelectorAll("#memory-editor-list .memory-editor")];
  drafts.forEach((draft, index) => {
    const card = cards[index];
    if (!draft.pendingImage || !card) return;
    card.pendingImage = draft.pendingImage;
    card.previewObjectUrl = URL.createObjectURL(draft.pendingImage);
    const image = card.querySelector("img");
    image.src = card.previewObjectUrl;
    image.alt = draft.pendingImage.name;
    image.hidden = false;
    card.querySelector(".memory-image-wrap").classList.add("has-image");
  });
  document.querySelector("#memory-editor-list .memory-editor:last-child [data-field=title]").focus();
}

async function uploadFile(file, folder, contentType = file.type) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90);
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, {
    cacheControl: "31536000",
    contentType,
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function removeStoredFiles(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return;
  const { error } = await supabase.storage.from("site-media").remove(uniquePaths);
  if (error) notify(`Content saved, but old media couldn't be removed: ${error.message}`, true);
}

function readMemoryCards() {
  return [...document.querySelectorAll("#memory-editor-list .memory-editor")].map((card) => ({
    card,
    value: {
      date: card.querySelector('[data-field="date"]').value.trim(),
      title: card.querySelector('[data-field="title"]').value.trim(),
      caption: card.querySelector('[data-field="caption"]').value.trim(),
      note: card.querySelector('[data-field="note"]').value.trim(),
      image: card.dataset.image,
      imagePath: card.dataset.imagePath
    }
  }));
}

async function saveMemories(button) {
  const cards = readMemoryCards();
  if (cards.some(({ value }) => !value.title)) {
    notify("Give every memory a title before saving.", true);
    return;
  }
  setBusy(button, true);
  const uploadedPaths = [];
  try {
    const previousPaths = persistedContent.memories.map((memory) => memory.imagePath).filter(Boolean);
    for (const item of cards) {
      if (item.card.pendingImage) {
        const uploaded = await uploadFile(item.card.pendingImage, "memories");
        uploadedPaths.push(uploaded.path);
        item.value.image = uploaded.url;
        item.value.imagePath = uploaded.path;
      }
    }
    const nextContent = { ...content, memories: cards.map(({ value }) => value) };
    if (!await saveContent(nextContent)) {
      await removeStoredFiles(uploadedPaths);
      return;
    }
    const nextPaths = new Set(nextContent.memories.map((memory) => memory.imagePath).filter(Boolean));
    await removeStoredFiles(previousPaths.filter((path) => !nextPaths.has(path)));
    memoryDrafts = structuredClone(nextContent.memories);
    renderMemories();
  } catch (error) {
    await removeStoredFiles(uploadedPaths);
    notify(`Couldn't upload a photo: ${getErrorMessage(error)}`, true);
  } finally {
    setBusy(button, false);
  }
}

function renderReasons() {
  const list = document.querySelector("#reason-editor-list");
  list.replaceChildren();
  reasonDrafts.forEach((reason, index) => {
    const card = document.createElement("article");
    card.className = "reason-editor";
    card.innerHTML = `
      <div class="reason-order"><span class="order-number"></span><button class="icon-button move-up" type="button" aria-label="Move reason up">↑</button><button class="icon-button move-down" type="button" aria-label="Move reason down">↓</button></div>
      <div class="reason-fields"><input aria-label="Reason title" data-field="title" placeholder="A little reason"><input aria-label="Reason message" data-field="message" placeholder="Tell her why"></div>
      <button class="icon-button danger delete-reason" type="button" aria-label="Delete reason">×</button>`;
    card.querySelector('[data-field="title"]').value = reason.title || "";
    card.querySelector('[data-field="message"]').value = reason.message || "";
    card.querySelector(".order-number").textContent = String(index + 1).padStart(2, "0");
    list.append(card);
  });
  if (!reasonDrafts.length) list.innerHTML = '<div class="empty-card">There are so many reasons. Add your first one here.</div>';
}

function addReason() {
  reasonDrafts = [...document.querySelectorAll("#reason-editor-list .reason-editor")].map((card) => ({
    title: card.querySelector('[data-field="title"]').value.trim(),
    message: card.querySelector('[data-field="message"]').value.trim()
  }));
  reasonDrafts.push({ title: "", message: "" });
  renderReasons();
  document.querySelector("#reason-editor-list .reason-editor:last-child [data-field=title]").focus();
}

function renderMusic() {
  const audio = document.querySelector("#music-preview");
  const name = document.querySelector("#music-name");
  if (audio.previewObjectUrl) {
    URL.revokeObjectURL(audio.previewObjectUrl);
    audio.previewObjectUrl = "";
  }
  if (stagedMusic) {
    audio.previewObjectUrl = URL.createObjectURL(stagedMusic);
    audio.src = audio.previewObjectUrl;
    name.textContent = stagedMusic.name;
  } else if (removeMusicOnSave || !content.musicUrl) {
    audio.removeAttribute("src");
    audio.load();
    name.textContent = "No song selected yet";
  } else {
    audio.src = content.musicUrl;
    name.textContent = content.musicPath?.split("/").pop() || "Your selected song";
  }
}

async function saveMusic(button) {
  setBusy(button, true);
  const oldPath = persistedContent.musicPath;
  let uploaded;
  try {
    if (stagedMusic) uploaded = await uploadFile(stagedMusic, "music");
    const nextContent = {
      ...content,
      musicUrl: removeMusicOnSave ? "" : uploaded?.url || content.musicUrl,
      musicPath: removeMusicOnSave ? "" : uploaded?.path || content.musicPath
    };
    if (!await saveContent(nextContent, button)) {
      if (uploaded) await removeStoredFiles([uploaded.path]);
      return;
    }
    if (uploaded || removeMusicOnSave) await removeStoredFiles([oldPath]);
    stagedMusic = null;
    removeMusicOnSave = false;
    renderMusic();
  } catch (error) {
    if (uploaded) await removeStoredFiles([uploaded.path]);
    notify(`Couldn't save the song: ${getErrorMessage(error)}`, true);
  } finally {
    setBusy(button, false);
  }
}

function getVideoContentType(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const contentType = allowedVideos.get(extension);
  return contentType && (!file.type || file.type === contentType) ? contentType : "";
}

function renderVideo() {
  const video = document.querySelector("#video-preview");
  const name = document.querySelector("#video-name");
  if (video.previewObjectUrl) {
    URL.revokeObjectURL(video.previewObjectUrl);
    video.previewObjectUrl = "";
  }
  if (stagedVideo) {
    video.hidden = false;
    video.previewObjectUrl = URL.createObjectURL(stagedVideo);
    video.src = video.previewObjectUrl;
    name.textContent = stagedVideo.name;
  } else if (removeVideoOnSave || !content.videoUrl) {
    video.hidden = true;
    video.pause();
    video.removeAttribute("src");
    video.load();
    name.textContent = "No video selected yet";
  } else {
    video.hidden = false;
    video.src = content.videoUrl;
    name.textContent = content.videoPath?.split("/").pop() || "Your video message";
  }
}

async function saveVideo(button) {
  setBusy(button, true);
  const oldPath = persistedContent.videoPath;
  let uploaded;
  try {
    if (stagedVideo) {
      uploaded = await uploadFile(stagedVideo, "video-messages", getVideoContentType(stagedVideo));
    }
    const nextContent = {
      ...content,
      videoUrl: removeVideoOnSave ? "" : uploaded?.url || content.videoUrl,
      videoPath: removeVideoOnSave ? "" : uploaded?.path || content.videoPath
    };
    if (!await saveContent(nextContent, button)) {
      if (uploaded) await removeStoredFiles([uploaded.path]);
      return;
    }
    if (uploaded || removeVideoOnSave) await removeStoredFiles([oldPath]);
    stagedVideo = null;
    removeVideoOnSave = false;
    renderVideo();
    notify(nextContent.videoUrl ? "Video message updated." : "Video message removed.");
  } catch (error) {
    if (uploaded) await removeStoredFiles([uploaded.path]);
    notify(`Couldn't save the video: ${getErrorMessage(error)}`, true);
  } finally {
    setBusy(button, false);
  }
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.panel)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showPanel(button.dataset.go)));
document.querySelector("#letter-form [name=letter]").addEventListener("input", updateLetterPreview);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.textContent = "";
  const button = loginForm.querySelector("button");
  setBusy(button, true, "Signing in");
  try {
    if (!supabase) await loadConfiguration();
    const values = new FormData(loginForm);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.get("email"),
      password: values.get("password")
    });
    if (error) throw error;
    await openDashboard(data.user, true);
  } catch (error) {
    authError.textContent = getErrorMessage(error);
  } finally {
    setBusy(button, false);
  }
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    notify(`Couldn't sign out: ${error.message}`, true);
    return;
  }
  authScreen.hidden = false;
  dashboard.hidden = true;
  loginForm.reset();
  authError.textContent = "";
});

document.querySelector("#settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  const values = new FormData(event.currentTarget);
  const nextContent = { ...content };
  ["girlfriendName", "websiteTitle", "introSubtitle", "yourName", "closingMessage", "personalDate"].forEach((key) => {
    nextContent[key] = String(values.get(key)).trim();
  });
  await saveContent(nextContent, button);
});

document.querySelector("#letter-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  const letter = event.currentTarget.elements.namedItem("letter").value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (!letter.length) {
    notify("Write a little something before saving.", true);
    return;
  }
  await saveContent({ ...content, letter }, button);
});

document.querySelector("#add-memory").addEventListener("click", addMemory);
document.querySelector("#save-memories").addEventListener("click", (event) => saveMemories(event.currentTarget));
document.querySelector("#memory-editor-list").addEventListener("click", (event) => {
  const card = event.target.closest(".memory-editor");
  if (!card) return;
  const cards = [...document.querySelectorAll("#memory-editor-list .memory-editor")];
  const index = cards.indexOf(card);
  if (event.target.closest(".remove-photo")) {
    card.pendingImage = null;
    if (card.previewObjectUrl) URL.revokeObjectURL(card.previewObjectUrl);
    card.previewObjectUrl = "";
    card.dataset.image = "";
    card.dataset.imagePath = "";
    card.querySelector('input[type="file"]').value = "";
    const image = card.querySelector("img");
    image.removeAttribute("src");
    image.hidden = true;
    card.querySelector(".memory-image-wrap").classList.remove("has-image");
  } else if (event.target.closest(".delete-memory")) {
    if (!window.confirm("Remove this memory from your website? This cannot be undone after you save.")) return;
    card.remove();
    if (!document.querySelector("#memory-editor-list .memory-editor")) document.querySelector("#memory-editor-list").innerHTML = '<div class="empty-card">Your story is waiting for its first little memory.</div>';
  } else if (event.target.closest(".move-up") && index > 0) {
    card.parentElement.insertBefore(card, cards[index - 1]);
  } else if (event.target.closest(".move-down") && index < cards.length - 1) {
    cards[index + 1].after(card);
  }
});

document.querySelector("#add-reason").addEventListener("click", addReason);
document.querySelector("#save-reasons").addEventListener("click", async (event) => {
  const cards = [...document.querySelectorAll("#reason-editor-list .reason-editor")];
  const reasons = cards.map((card) => ({
    title: card.querySelector('[data-field="title"]').value.trim(),
    message: card.querySelector('[data-field="message"]').value.trim()
  }));
  if (reasons.some((reason) => !reason.title || !reason.message)) {
    notify("Add both a title and a note for every reason.", true);
    return;
  }
  if (await saveContent({ ...content, reasons }, event.currentTarget)) {
    reasonDrafts = structuredClone(reasons);
    renderReasons();
  }
});
document.querySelector("#reason-editor-list").addEventListener("click", (event) => {
  const card = event.target.closest(".reason-editor");
  if (!card) return;
  const cards = [...document.querySelectorAll("#reason-editor-list .reason-editor")];
  const index = cards.indexOf(card);
  if (event.target.closest(".delete-reason")) {
    if (!window.confirm("Remove this reason from your website? This cannot be undone after you save.")) return;
    card.remove();
    if (!document.querySelector("#reason-editor-list .reason-editor")) document.querySelector("#reason-editor-list").innerHTML = '<div class="empty-card">There are so many reasons. Add your first one here.</div>';
  } else if (event.target.closest(".move-up") && index > 0) {
    card.parentElement.insertBefore(card, cards[index - 1]);
  } else if (event.target.closest(".move-down") && index < cards.length - 1) {
    cards[index + 1].after(card);
  }
  [...document.querySelectorAll("#reason-editor-list .reason-editor")].forEach((item, position) => {
    item.querySelector(".order-number").textContent = String(position + 1).padStart(2, "0");
  });
});

document.querySelector("#music-file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if ((!allowedAudio.has(file.type) && !/\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(file.name)) || file.size > maxUploadSize) {
    event.target.value = "";
    notify("Choose an MP3, M4A, AAC, OGG, WAV, or WebM audio file up to 50 MB.", true);
    return;
  }
  stagedMusic = file;
  removeMusicOnSave = false;
  renderMusic();
});
document.querySelector("#save-music").addEventListener("click", (event) => saveMusic(event.currentTarget));
document.querySelector("#remove-music").addEventListener("click", () => {
  if (!content.musicUrl && !stagedMusic) return notify("There isn't a saved song to remove.");
  if (!window.confirm("Remove the background music from your website? This takes effect when you save.")) return;
  stagedMusic = null;
  removeMusicOnSave = true;
  document.querySelector("#music-file").value = "";
  renderMusic();
  notify("Ready to remove. Save music to publish the change.");
});

document.querySelector("#video-file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!getVideoContentType(file) || file.size === 0 || file.size > maxUploadSize) {
    event.target.value = "";
    notify("Choose an MP4 or WebM video up to 50 MB.", true);
    return;
  }
  stagedVideo = file;
  removeVideoOnSave = false;
  renderVideo();
});
document.querySelector("#save-video").addEventListener("click", (event) => saveVideo(event.currentTarget));
document.querySelector("#remove-video").addEventListener("click", () => {
  if (!content.videoUrl && !stagedVideo) return notify("There isn't a saved video to remove.");
  if (!window.confirm("Remove the video message from your website? This takes effect when you save.")) return;
  stagedVideo = null;
  removeVideoOnSave = Boolean(content.videoUrl);
  document.querySelector("#video-file").value = "";
  renderVideo();
  notify("Ready to remove. Save video to publish the change.");
});

async function initialize() {
  try {
    await loadConfiguration();
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (sessionData.session) await openDashboard(sessionData.session.user);
  } catch (error) {
    authError.textContent = getErrorMessage(error);
  }
}

initialize();
