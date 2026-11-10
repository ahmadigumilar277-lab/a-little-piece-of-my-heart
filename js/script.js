/* Personalize the text, dates, memories, and audio path in this object. */
let giftContent = {
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
  memories: [
    { date: "[Tanggal / momen pertama]", title: "[Awal cerita kita]", caption: "[Ganti dengan kenangan kecil]", note: "[Tulis satu kalimat tentang momen ini]", image: "" },
    { date: "[Tanggal / momen berikutnya]", title: "[Momen yang disimpan]", caption: "[Senyum yang ingin diingat]", note: "[Apa yang membuat hari ini terasa istimewa?]", image: "" },
    { date: "[Tanggal / momen favorit]", title: "[Satu hari yang hangat]", caption: "[Cerita kecil kita]", note: "[Tambahkan cerita pendekmu di sini]", image: "" }
  ],
  reasons: [
    { title: "Your kind heart", message: "Cara kamu peduli pada hal-hal kecil membuat dunia terasa lebih lembut." },
    { title: "The way you laugh", message: "Tawamu punya cara sendiri untuk membuat hari biasa terasa istimewa." },
    { title: "Simply being you", message: "Kamu tidak perlu menjadi siapa-siapa selain dirimu sendiri untuk dicintai." },
    { title: "Your quiet strength", message: "Ada banyak keberanian dalam caramu terus melangkah, bahkan pelan-pelan." },
    { title: "The little things", message: "Hal-hal sederhana tentangmu selalu punya tempat paling besar di hatiku." },
    { title: "There is no end", message: "Daftar ini tidak akan pernah cukup panjang untuk semua alasan yang ada." }
  ],
  musicSrc: "",
  musicPath: ""
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const loader = document.querySelector(".page-loader");
const hero = document.querySelector(".hero");
const openButton = document.querySelector(".open-heart");
const audio = document.querySelector(".background-audio");
const musicToggle = document.querySelector(".music-toggle");
const audioStatus = document.querySelector(".audio-status");
let letterStarted = false;
let audioConfigured = false;
let statusTimer;

function hideLoader() {
  window.setTimeout(() => loader.classList.add("is-hidden"), 320);
}

function showAudioStatus(message) {
  audioStatus.textContent = message;
  audioStatus.classList.add("is-visible");
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => audioStatus.classList.remove("is-visible"), 3600);
}

function createLetter() {
  const salutation = document.querySelector("[data-letter-salutation]");
  const signature = document.querySelector("[data-signature]");
  const finalSignature = document.querySelector("[data-final-signature]");
  const date = document.querySelector("[data-personal-date]");
  document.title = giftContent.websiteTitle || "A Little Piece of My Heart";
  document.querySelector("[data-website-title]").textContent = giftContent.websiteTitle || "a little piece of my heart";
  document.querySelector("[data-girlfriend-name]").textContent = giftContent.girlfriendName || "Beautiful";
  document.querySelector("[data-intro-subtitle]").textContent = giftContent.introSubtitle || "I have something special for you...";
  document.querySelector("[data-closing-message]").textContent = giftContent.closingMessage || "If I had to choose again, I'd still choose you.";
  salutation.textContent = `My dearest ${giftContent.girlfriendName || "Beautiful"},`;
  signature.textContent = giftContent.yourName;
  finalSignature.textContent = `forever yours, ${giftContent.yourName}`;
  date.textContent = giftContent.personalDate;
}

function typeLetter() {
  if (letterStarted) return;
  letterStarted = true;
  const container = document.querySelector(".letter-copy");
  const cursor = document.querySelector(".typing-cursor");
  const paragraphs = giftContent.letter;
  if (reducedMotion) {
    paragraphs.forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      container.append(paragraph);
    });
    cursor.classList.add("is-done");
    return;
  }

  let paragraphIndex = 0;
  let characterIndex = 0;
  let currentParagraph;
  const typeNextCharacter = () => {
    if (paragraphIndex >= paragraphs.length) {
      cursor.classList.add("is-done");
      return;
    }
    if (!currentParagraph) {
      currentParagraph = document.createElement("p");
      container.append(currentParagraph);
    }
    currentParagraph.textContent += paragraphs[paragraphIndex][characterIndex];
    characterIndex += 1;
    if (characterIndex >= paragraphs[paragraphIndex].length) {
      paragraphIndex += 1;
      characterIndex = 0;
      currentParagraph = null;
    }
    window.setTimeout(typeNextCharacter, 22);
  };
  typeNextCharacter();
}

function createTimeline() {
  const timeline = document.querySelector("[data-timeline]");
  giftContent.memories.forEach((memory, index) => {
    const row = document.createElement("article");
    row.className = "memory-row reveal";
    row.innerHTML = `
      <span class="memory-dot" aria-hidden="true"></span>
      <div class="memory-visual">
        <div class="memory-art" role="img" aria-label="Photo placeholder for ${escapeAttribute(memory.title)}">
          <span class="memory-art-mark" aria-hidden="true">a moment</span>
          <span class="memory-art-index" aria-hidden="true">PHOTO ${String(index + 1).padStart(2, "0")}</span>
        </div>
        <span class="memory-caption"></span>
      </div>
      <div class="memory-copy">
        <p class="memory-date"></p>
        <h3></h3>
        <p></p>
      </div>`;
    row.querySelector(".memory-caption").textContent = memory.caption;
    row.querySelector(".memory-date").textContent = memory.date;
    row.querySelector("h3").textContent = memory.title;
    row.querySelector(".memory-copy p:last-child").textContent = memory.note;
    if (memory.image) {
      const image = document.createElement("img");
      image.className = "memory-photo";
      image.src = memory.image;
      image.alt = memory.caption || memory.title;
      row.querySelector(".memory-art").replaceChildren(image);
    }
    timeline.append(row);
  });
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function createReasons() {
  const grid = document.querySelector("[data-reasons]");
  giftContent.reasons.forEach((reason, index) => {
    const card = document.createElement("button");
    card.className = "reason-card reveal";
    card.type = "button";
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", `${reason.title}. Tap to reveal a note.`);
    card.innerHTML = `
      <span class="reason-inner">
        <span class="reason-face reason-front">
          <span class="reason-number">NO. ${String(index + 1).padStart(2, "0")}</span>
          <span class="reason-title"></span>
          <span class="reason-open">a little note for you</span>
        </span>
        <span class="reason-face reason-back">
          <span class="reason-number">JUST ONE OF MANY</span>
          <span class="reason-message"></span>
        </span>
      </span>`;
    card.querySelector(".reason-title").textContent = reason.title;
    card.querySelector(".reason-message").textContent = reason.message;
    card.addEventListener("click", () => {
      const isFlipped = card.classList.toggle("is-flipped");
      card.setAttribute("aria-pressed", String(isFlipped));
      card.setAttribute("aria-label", isFlipped ? reason.message : `${reason.title}. Tap to reveal a note.`);
    });
    grid.append(card);
  });
}

function createPetals() {
  const field = document.querySelector(".petal-field");
  for (let index = 0; index < 12; index += 1) {
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.textContent = index % 2 === 0 ? "✿" : "♡";
    petal.style.left = `${(index * 37 + 8) % 100}%`;
    petal.style.animationDelay = `${(index % 8) * -1.7}s`;
    field.append(petal);
  }
}

function observeReveals() {
  const revealElements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || reducedMotion) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (entry.target.closest("#letter")) typeLetter();
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.16 });
  revealElements.forEach((element) => observer.observe(element));
}

function configureAudio() {
  if (!giftContent.musicSrc) return false;
  audio.src = giftContent.musicSrc;
  audioConfigured = true;
  return true;
}

async function loadPublishedContent() {
  if (window.location.protocol === "file:") return;
  try {
    const response = await fetch("/api/config", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    const config = await response.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey) return;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data, error } = await client
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data?.content) return;
    giftContent = {
      ...giftContent,
      ...data.content,
      musicSrc: data.content.musicUrl || data.content.musicSrc || ""
    };
    letterStarted = false;
    document.querySelector(".letter-copy").replaceChildren();
    document.querySelector(".typing-cursor").classList.remove("is-done");
    document.querySelector("[data-timeline]").replaceChildren();
    document.querySelector("[data-reasons]").replaceChildren();
    createLetter();
    createTimeline();
    createReasons();
    observeReveals();
    if (giftContent.musicSrc) {
      audio.src = giftContent.musicSrc;
      audioConfigured = true;
    }
  } catch (error) {
    console.warn("Could not load published content; showing the built-in version.", error);
  }
}

async function playAudio() {
  if (!audioConfigured && !configureAudio()) {
    showAudioStatus("Add your own song in js/script.js to hear it here.");
    return;
  }
  try {
    await audio.play();
    musicToggle.classList.add("is-playing");
    musicToggle.setAttribute("aria-pressed", "true");
    musicToggle.setAttribute("aria-label", "Pause background music");
  } catch (error) {
    musicToggle.classList.remove("is-playing");
    musicToggle.setAttribute("aria-pressed", "false");
    musicToggle.setAttribute("aria-label", "Play background music");
    showAudioStatus("The song could not be played. Check the audio file path and try again.");
  }
}

openButton.addEventListener("click", () => {
  hero.classList.add("is-opening");
  typeLetter();
  if (giftContent.musicSrc) playAudio();
  window.setTimeout(() => document.querySelector("#letter").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }), reducedMotion ? 0 : 360);
});

musicToggle.addEventListener("click", () => {
  if (audio.paused) {
    playAudio();
    return;
  }
  audio.pause();
  musicToggle.classList.remove("is-playing");
  musicToggle.setAttribute("aria-pressed", "false");
  musicToggle.setAttribute("aria-label", "Play background music");
});

audio.addEventListener("error", () => {
  musicToggle.classList.remove("is-playing");
  musicToggle.setAttribute("aria-pressed", "false");
  showAudioStatus("The song could not be found. Check the path in js/script.js.");
});
audio.addEventListener("ended", () => {
  musicToggle.classList.remove("is-playing");
  musicToggle.setAttribute("aria-pressed", "false");
});

createLetter();
createTimeline();
createReasons();
createPetals();
observeReveals();
loadPublishedContent();
window.addEventListener("load", hideLoader, { once: true });
window.setTimeout(hideLoader, 1800);
