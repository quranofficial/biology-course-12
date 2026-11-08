const $ = (id) => document.getElementById(id);
const SUPABASE_FUNCTION_URL = "https://nyflqakexqbsujykjkam.supabase.co/functions/v1/smart-handler";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zHGmZTaVOdnGiXJuAZmIdw_K0e8BjlS";


let adminAccessToken = null;
async function initializeAdminPanel() {
  $("activationGate").hidden = true;
  $("subjectHome").hidden = true;
  $("courseLayout").hidden = true;
  $("adminPanel").hidden = false;
}
$("adminLoginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("adminLoginButton");
  button.disabled = true;
  $("adminMessage").textContent = "چوونەژوورەوە پشکنین دەکرێت...";
  try {
    const response = await fetch("https://nyflqakexqbsujykjkam.supabase.co/auth/v1/token?grant_type=password", {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":SUPABASE_PUBLISHABLE_KEY},
      body:JSON.stringify({
        email:$("adminEmail").value.trim(),
        password:$("adminPassword").value
      })
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error("ئیمەیڵ یان وشەی نهێنی هەڵەیە.");
    adminAccessToken = data.access_token;
    $("adminPassword").value = "";
    $("adminLoginForm").hidden = true;
    $("generateCodeButton").hidden = false;
    $("adminMessage").textContent = "چوونەژوورەوە سەرکەوتوو بوو.";
  } catch(error) {
    $("adminMessage").textContent = error.message || "هەڵەیەک ڕوویدا.";
    $("adminMessage").classList.add("error");
  } finally {
    button.disabled = false;
  }
});
$("generateCodeButton").addEventListener("click", async () => {
  const button = $("generateCodeButton");
  button.disabled = true;
  $("adminMessage").classList.remove("error");
  $("adminMessage").textContent = "کۆدی نوێ دروست دەکرێت...";
  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "apikey":SUPABASE_PUBLISHABLE_KEY,
        "Authorization":"Bearer " + adminAccessToken
      },
      body:JSON.stringify({action:"create_code"})
    });
    const data = await response.json();
    if (!response.ok || !data.code) throw new Error(data.error || data.message || ("HTTP " + response.status + " — " + JSON.stringify(data)));
    $("adminCodeResult").hidden = false;
    $("adminCodeResult").textContent = data.code;
    $("adminMessage").textContent = "کۆدەکە دروست کرا. تەنها ئەم جارە پیشان دەدرێت؛ لای خۆت بیپارێزە.";
  } catch(error) {
    $("adminMessage").textContent = error.message || "هەڵەیەک ڕوویدا.";
    $("adminMessage").classList.add("error");
  } finally {
    button.disabled = false;
  }
});

function getDeviceToken() {
  let token = localStorage.getItem("biology_device_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("biology_device_token", token);
  }
  return token;
}
async function activationRequest(payload) {
  const response = await fetch(SUPABASE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "پەیوەندی بە سێرڤەر سەرکەوتوو نەبوو.");
  return result;
}
function showActivationMessage(message, isError = false) {
  const el = $("activationMessage");
  el.textContent = message;
  el.classList.toggle("error", isError);
}
async function unlockCourse() {
  $("activationGate").hidden = true;
  $("subjectHome").hidden = false;
  $("courseLayout").hidden = true;
  try { await readManifest(); renderSubjects(); }
  catch(error) {
    $("subjectGrid").innerHTML = '<div class="empty-state">نەتوانرا لیستی وانەکان لە سێرڤەری پارێزراو بخوێندرێتەوە: ' + escapeHtml(error.message) + '</div>';
  }
}
async function initializeActivation() {
  $("subjectHome").hidden = true;
  $("courseLayout").hidden = true;
  $("activationGate").hidden = false;
  const token = getDeviceToken();
  try {
    const result = await activationRequest({action:"check", device_token:token});
    if (result.activated) {
      await unlockCourse();
      return;
    }
    showActivationMessage("کۆدی چالاککردنت بنووسە.");
  } catch(error) {
    showActivationMessage("پشکنین نەکرا: " + error.message + " تکایە پەیوەندی ئینتەرنێت بپشکنە.", true);
  }
}
$("activationForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("activationButton");
  const code = $("activationCode").value.trim().toUpperCase();
  button.disabled = true;
  showActivationMessage("کۆدەکە پشکنین دەکرێت...");
  try {
    const result = await activationRequest({
      action:"activate",
      code,
      device_token:getDeviceToken()
    });
    if (!result.activated) throw new Error("کۆدی چالاککردن دروست نییە.");
    showActivationMessage("چالاککردن سەرکەوتوو بوو.");
    await unlockCourse();
  } catch(error) {
    showActivationMessage(error.message || "چالاککردن سەرکەوتوو نەبوو.", true);
  } finally {
    button.disabled = false;
  }
});

let lessons = [];
let manifestFiles = [];
const SUBJECTS = [
 {id:"biology",name:"زیندەزانی",icon:"🧬",aliases:["زیندەزانی","biology","biology-12","bayalogy","lessons","response_body_modified"]},
 {id:"chemistry",name:"کیمیا",icon:"⚗️",aliases:["کیمیا","chemistry"]},
 {id:"physics",name:"فیزیا",icon:"⚛️",aliases:["فیزیا","physics"]},
 {id:"math",name:"بیرکاری",icon:"📐",aliases:["بیرکاری","math","mathematics","birkary"]},
 {id:"kurdish",name:"کوردی",icon:"📚",aliases:["کوردی","kurdish"]},
 {id:"arabic",name:"عەرەبی",icon:"🖋️",aliases:["عەرەبی","arabic"]},
 {id:"english",name:"ئینگلیزی",icon:"🔤",aliases:["ئینگلیزی","english"]}
];

const YOUTUBE_PLAYLISTS = {
 chemistry: [{name:"کیمیا",id:"PLgiFQfU5qnoP8T4BkrzVoN7alNnVdqxTH"}],
 english: [
  {name:"Grammer",id:"PL0JjfIYvwyEu6pTd-kEle48rguD87s64j"},
  {name:"Listen and read",id:"PL0JjfIYvwyEuALhwc0E6rSzLPKYIQYmIR"},
  {name:"Reading",id:"PL0JjfIYvwyEtljovEj48rMrrhDIjrJHnd"},
  {name:"ActivityBook",id:"PL0JjfIYvwyEvhwdK2W5bgs1VKwRDZDAeT"},
  {name:"Episode",id:"PL0JjfIYvwyEu_JybPFdQG9NRaIOfzGG0r"},
  {name:"Sound",id:"PL0JjfIYvwyEtBC32rT_tTw7eUNB_1OfIL"}
 ],
 physics: [{name:"فیزیا",id:"PLl0EZqS7iushFGSAAyBKaxJTqTKRuhRxO"}],
 arabic: [{name:"عەرەبی",id:"PLUQijxRpTiLI"}]
};
let activeYoutubePlaylist = {};
function renderYoutubePlaylists(subjectId) {
 const section = $("youtubeSection");
 const tabs = $("youtubePlaylistTabs");
 const frame = $("youtubePlaylistFrame");
 const openLink = $("youtubeOpenLink");
 const playlists = YOUTUBE_PLAYLISTS[subjectId] || [];
 section.hidden = playlists.length === 0;
 if (!playlists.length) { tabs.replaceChildren(); frame.removeAttribute("src"); return; }
 let selected = Math.min(activeYoutubePlaylist[subjectId] || 0, playlists.length - 1);
 const showPlaylist = index => {
  selected = index;
  activeYoutubePlaylist[subjectId] = index;
  const playlist = playlists[index];
  frame.src = "https://www.youtube.com/embed/videoseries?list=" + encodeURIComponent(playlist.id);
  frame.title = "Playlist: " + playlist.name;
  openLink.href = "https://www.youtube.com/playlist?list=" + encodeURIComponent(playlist.id);
  tabs.querySelectorAll("button").forEach((button,i) => {
   button.classList.toggle("active", i === index);
   button.setAttribute("aria-pressed", i === index ? "true" : "false");
  });
 };
 tabs.innerHTML = playlists.map((playlist,index) =>
  '<button type="button" class="youtube-playlist-tab" data-index="' + index + '">' + escapeHtml(playlist.name) + '</button>'
 ).join("");
 tabs.querySelectorAll("button").forEach(button => button.addEventListener("click", () => showPlaylist(Number(button.dataset.index))));
 showPlaylist(selected);
}

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
  const url = makeBunnyEmbed(lesson.link);
  $("playerLabel").textContent = getChapter(lesson);
  $("currentTitle").textContent = getTitle(lesson);
  $("currentDescription").textContent = getDescription(lesson);
  $("completeBtn").disabled = false;
  $("completeBtn").textContent = completed.has(String(lesson.id)) ? "✓ تەواو کراوە" : "✓ تەواو بوو";
  const wrap = $("videoWrap");
  if (url) {
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
async function readManifest() {
 // تەنها ناوی فایلەکان لێرەیە؛ ناوەڕۆکی JSON لە Private Storage ـەوە وەردەگیرێت.
 manifestFiles = ["bayalogy.json", "kurdish.json", "arabic.json", "english.json", "birkary.json"];
 return manifestFiles;
}
function filesForSubject(subject) {
 const names = manifestFiles.map(path => {
  const filename = String(path).split("/").pop();
  return {path:filename,base:filename.replace(/\.json$/i,"").trim().toLowerCase()};
 });
 const aliasSet = new Set(subject.aliases.map(alias => String(alias).trim().toLowerCase()));
 const matches = names.filter(file => aliasSet.has(file.base));
 if (subject.id === "biology") return (matches.length ? matches : names).map(file => file.path);
 return matches.map(file => file.path);
}
function renderSubjects() {
 const grid = $("subjectGrid");
 grid.innerHTML = SUBJECTS.map(subject => {
  const files = filesForSubject(subject), available = files.length > 0;
  return '<button class="subject-card ' + (available ? "is-open" : "is-locked") + '" data-subject="' + subject.id + '" ' + (available ? "" : "disabled") + '>' +
   '<span class="subject-icon">' + subject.icon + '</span><span class="subject-status">' + (available ? "بەردەستە" : "بەردەست نییە") + '</span>' +
   '<strong>' + subject.name + '</strong><small>' + (available ? toDigits(files.length) + " فایل دۆزرایەوە" : "فایلی JSON لە data نییە") + '</small>' +
   '<span class="subject-action">' + (available ? "چوونە ژوورەوە ←" : "🔒 داخراوە") + '</span></button>';
 }).join("");
 grid.querySelectorAll(".subject-card.is-open").forEach(button => button.addEventListener("click", () => openSubject(button.dataset.subject)));
}
function makeBunnyEmbed(value) {
 const raw = String(value || "").trim();
 if (!raw) return "";
 const marker = "https://iframe.mediadelivery.net/embed/387939/";
 const markerIndex = raw.indexOf(marker);
 const clean = raw.split(/[?#]/)[0];
 const id = markerIndex >= 0
  ? raw.slice(markerIndex + marker.length).split(/[/?#]/)[0]
  : clean.split("/").pop();
 if (!id) return "";
 return marker + encodeURIComponent(id) + "?autoplay=true&loop=false&muted=false&preload=true&responsive=true";
}
async function loadSubjectLessons(subject) {
 const files = filesForSubject(subject);
 if (!files.length) throw new Error("فایلی JSON بۆ ئەم بابەتە لە Private Storage نییە.");
 const results = await Promise.all(files.map(async path => {
  try {
   const payload = await activationRequest({
    action:"get_lesson_json",
    device_token:getDeviceToken(),
    filename:path.split("/").pop()
   });
   if (!payload || !payload.data) throw new Error("داتای وانەکان بەردەست نییە.");
   return {path:path,items:normalizeJson(payload.data)};
  } catch(error) { return {path:path,error:error.message,items:[]}; }
 }));
 const loaded=[], usedIds=new Set();
 for (const result of results.sort((x,y)=>x.path.localeCompare(y.path))) {
  for (const [index,item] of result.items.entries()) {
   if (!item || typeof item !== "object") continue;
   const originalId=item.id ?? (result.path+"-"+(index+1)); let id=String(originalId);
   if (usedIds.has(id)) id=result.path+"::"+id;
   let suffix=2; while(usedIds.has(id)) id=result.path+"::"+originalId+"-"+(suffix++);
   usedIds.add(id); loaded.push({...item,id:id});
  }
 }
 const failed=results.filter(x=>x.error);
 if (!loaded.length) throw new Error(failed.map(x=>x.path+": "+x.error).join(" | ") || "هیچ وانەیەکی دروست نەدۆزرایەوە.");
 return {lessons:sorted(loaded),files:files.length,failed:failed};
}
async function openSubject(subjectId) {
 const subject=SUBJECTS.find(x=>x.id===subjectId); if(!subject || !filesForSubject(subject).length) return;
 $("subjectHome").hidden=true; $("courseLayout").hidden=false;
 $("courseTitle").textContent=subject.name+(subject.id==="biology"?" ١٢":"");
 $("welcomeTitle").textContent="وانەکانی "+subject.name;
  renderYoutubePlaylists(subjectId);
 $("lessonList").innerHTML='<div class="empty-state">وانەکان بار دەکرێن...</div>';
 try {
  const result=await loadSubjectLessons(subject); lessons=result.lessons; activeChapter="all"; selectedId=null;
  renderChapters(); renderLessons(); updateProgress(); if(lessons.length) selectLesson(lessons[0].id);
  showToast(toDigits(lessons.length)+" وانە لە "+toDigits(result.files)+" فایل بارکران.");
  if(result.failed.length) console.warn("JSON files could not be loaded:",result.failed);
 } catch(error) { $("lessonList").innerHTML='<div class="empty-state">' + escapeHtml(error.message) + '</div>'; }
}
$("backSubjects").addEventListener("click",()=>{$("courseLayout").hidden=true;$("subjectHome").hidden=false;window.scrollTo({top:0,behavior:"smooth"});});
async function init() {
 $("year").textContent=new Date().getFullYear();
 $("homeYear").textContent=new Date().getFullYear();
 if (new URLSearchParams(window.location.search).get("admin") === "1") {
   await initializeAdminPanel();
   return;
 }
 await initializeActivation();
}
init();
