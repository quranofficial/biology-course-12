const $ = (id) => document.getElementById(id);
let lessons = [];
let selectedId = null;
let activeChapter = "all";
let searchTerm = "";
let completed = new Set(JSON.parse(localStorage.getItem("biology_done") || "[]"));
let toastTimer;

const toDigits = (n) => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const getTitle = (x) => x.title || x.chapter || `وانەی ${x.id ?? ""}`;
const getChapter = (x) => x.chapter || x.unit?.name || "بەشەکانی تر";
const getDescription = (x) => {
  const d = x.description;
  return d && d !== "0" ? String(d) : (x.duration ? `ماوە: ${x.duration}` : "ڤیدیۆی فێرکاری");
};
const sorted = (arr) => [...arr].sort((a,b) => (Number(a.sort)||0)-(Number(b.sort)||0));

function showToast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function saveDone() { localStorage.setItem("biology_done", JSON.stringify([...completed])); }
function updateProgress() {
  const count = lessons.filter(x => completed.has(String(x.id))).length;
  const percent = lessons.length ? count / lessons.length * 100 : 0;
  $("progressBar").style.width = percent + "%";
  $("progressText").textContent = `${toDigits(count)} لە ${toDigits(lessons.length)} وانە تەواوکراوە`;
  $("totalCount").textContent = toDigits(lessons.length);
  $("doneCount").textContent = toDigits(count);
}
function renderChapters() {
  const counts = new Map();
  lessons.forEach(x => counts.set(getChapter(x), (counts.get(getChapter(x))||0)+1));
  const nav = $("chapterNav");
  nav.innerHTML = `<button class="chapter-link ${activeChapter==="all"?"active":""}" data-chapter="all"><span>هەموو وانەکان</span><small>${toDigits(lessons.length)}</small></button>`;
  for (const [name,count] of counts) nav.innerHTML += `<button class="chapter-link ${activeChapter===name?"active":""}" data-chapter="${escapeHtml(name)}"><span>${escapeHtml(name)}</span><small>${toDigits(count)}</small></button>`;
  nav.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    activeChapter = btn.dataset.chapter; $("chapterFilter").value = activeChapter; renderChapters(); renderLessons();
  }));
  const filter = $("chapterFilter");
  const previous = filter.value;
  filter.innerHTML = `<option value="all">هەموو بەشەکان</option>` + [...counts.keys()].map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  filter.value = [...counts.keys()].includes(previous) ? previous : activeChapter;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function filteredLessons() {
  return sorted(lessons).filter(x => {
    const chapterOk = activeChapter === "all" || getChapter(x) === activeChapter;
    const haystack = `${getTitle(x)} ${getChapter(x)} ${x.description||""} ${x.id||""}`.toLocaleLowerCase();
    return chapterOk && haystack.includes(searchTerm);
  });
}
function renderLessons() {
  const list = $("lessonList"), items = filteredLessons();
  $("emptyState").hidden = items.length !== 0;
  list.innerHTML = items.map((x,i) => {
    const id = String(x.id);
    const done = completed.has(id);
    return `<button class="lesson-item ${String(selectedId)===id?"selected":""}" data-id="${escapeHtml(id)}">
      <span class="lesson-number">${toDigits(i+1)}</span>
      <span class="lesson-copy"><strong>${escapeHtml(getTitle(x))}</strong><small>${escapeHtml(getChapter(x))} · ${escapeHtml(getDescription(x))}</small></span>
      ${done?'<span class="lesson-done" title="تەواو کراوە">✓</span>':'<span class="lesson-play">▶</span>'}
    </button>`;
  }).join("");
  list.querySelectorAll(".lesson-item").forEach(btn => btn.addEventListener("click", () => selectLesson(btn.dataset.id)));
}
function selectLesson(id) {
  const lesson = lessons.find(x => String(x.id) === String(id));
  if (!lesson) return;
  selectedId = lesson.id;
  const url = String(lesson.link || "").trim();
  $("playerLabel").textContent = getChapter(lesson);
  $("currentTitle").textContent = getTitle(lesson);
  $("currentDescription").textContent = getDescription(lesson);
  $("completeBtn").disabled = false;
  $("completeBtn").textContent = completed.has(String(lesson.id)) ? "✓ تەواو کراوە" : "✓ تەواو بوو";
  const wrap = $("videoWrap");
  if (url && /^https:\/\/iframe\.mediadelivery\.net\/embed\//i.test(url)) {
    const iframe = document.createElement("iframe");
    iframe.src = url; iframe.title = getTitle(lesson);
    iframe.allow = "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    wrap.replaceChildren(iframe);
  } else {
    wrap.innerHTML = `<div class="player-placeholder"><div class="play-symbol">!</div><h2>لینکی ڤیدیۆ بەردەست نییە</h2><p>لینکی ئەم وانەیە لە JSON پشکنین بکە.</p></div>`;
  }
  renderLessons();
  if (window.innerWidth < 850) $("videoWrap").scrollIntoView({behavior:"smooth",block:"center"});
}
$("completeBtn").addEventListener("click", () => {
  if (selectedId == null) return;
  const id = String(selectedId);
  if (completed.has(id)) completed.delete(id); else completed.add(id);
  saveDone(); updateProgress(); renderLessons();
  $("completeBtn").textContent = completed.has(id) ? "✓ تەواو کراوە" : "✓ تەواو بوو";
});
$("searchInput").addEventListener("input", e => { searchTerm = e.target.value.trim().toLocaleLowerCase(); renderLessons(); });
$("chapterFilter").addEventListener("change", e => { activeChapter = e.target.value; renderChapters(); renderLessons(); });
$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("biology_theme", document.body.classList.contains("dark") ? "dark" : "light");
});
if (localStorage.getItem("biology_theme") === "dark") document.body.classList.add("dark");

function normalizeJson(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.details)) return parsed.details;
  if (parsed && Array.isArray(parsed.lessons)) return parsed.lessons;
  throw new Error('فۆرماتی JSON ناسراو نییە؛ پێویستە details یان lessons ـی تێدا بێت.');
}
async function loadAllJsonLessons() {
  const manifestResponse = await fetch("data/index.json", { cache: "no-store" });
  if (!manifestResponse.ok) throw new Error(`نەتوانرا لیستی JSON ـەکان بخوێندرێتەوە (HTTP ${manifestResponse.status}).`);
  const files = await manifestResponse.json();
  if (!Array.isArray(files) || !files.length) throw new Error("هیچ فایلێکی JSON لە فۆڵدەری data نەدۆزرایەوە.");

  const results = await Promise.all(files.map(async path => {
    try {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const response = await fetch(`data/${encodedPath}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = await response.json();
      return { path, items: normalizeJson(parsed) };
    } catch (error) {
      return { path, error: error.message, items: [] };
    }
  }));

  const loaded = [];
  const usedIds = new Set();
  for (const result of results.sort((a, b) => a.path.localeCompare(b.path))) {
    for (const [index, item] of result.items.entries()) {
      if (!item || typeof item !== "object") continue;
      const originalId = item.id ?? `${result.path}-${index + 1}`;
      let id = String(originalId);
      if (usedIds.has(id)) id = `${result.path}::${id}`;
      let suffix = 2;
      while (usedIds.has(id)) id = `${result.path}::${originalId}-${suffix++}`;
      usedIds.add(id);
      loaded.push({ ...item, id });
    }
  }
  const failed = results.filter(x => x.error);
  if (!loaded.length) {
    const detail = failed.map(x => `${x.path}: ${x.error}`).join(" | ");
    throw new Error(detail || "هیچ وانەیەکی دروست لە فایلە JSON ـەکاندا نەدۆزرایەوە.");
  }
  return { lessons: sorted(loaded), files: files.length, failed };
}

async function init() {
  try {
    $("year").textContent = new Date().getFullYear();
    const result = await loadAllJsonLessons();
    lessons = result.lessons;
    $("courseTitle").textContent = lessons[0]?.unit?.title || lessons[0]?.chapter?.split(" ")[0] || "زیندەزانی ١٢";
    $("welcomeTitle").textContent = `وانەکانی ${$("courseTitle").textContent}`;
    renderChapters(); renderLessons(); updateProgress();
    if (lessons.length) selectLesson(lessons[0].id);
    const failedText = result.failed.length
      ? `؛ ${toDigits(result.failed.length)} فایل خوێندرایەوە بە هەڵە`
      : "";
    showToast(`${toDigits(lessons.length)} وانە لە ${toDigits(result.files)} فایل بارکران${failedText}.`);
    if (result.failed.length) console.warn("JSON files could not be loaded:", result.failed);
  } catch(err) {
    $("lessonList").innerHTML = `<div class="empty-state">هەڵە لە بارکردنی JSON ـەکان: ${escapeHtml(err.message)}<br>دڵنیابە وێبسایتەکە لە GitHub Pages کراوەتەوە و فۆڵدەری data بەردەستە.</div>`;
  }
}
init();
