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
    if (!response.ok || !data.code) throw new Error(data.error || "نەتوانرا کۆد دروست بکرێت.");
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
    $("subjectGrid").innerHTML = '<div class="empty-state">نەتوانرا فایلەکانی data بخوێندرێنەوە: ' + escapeHtml(error.message) + '</div>';
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
 {id:"biology",name:"زیندەزانی",icon:"🧬",aliases:["زیندەزانی","biology","biology-12","lessons","response_body_modified"]},
 {id:"chemistry",name:"کیمیا",icon:"⚗️",aliases:["کیمیا","chemistry"]},
 {id:"physics",name:"فیزیا",icon:"⚛️",aliases:["فیزیا","physics"]},
 {id:"math",name:"بیرکاری",icon:"📐",aliases:["بیرکاری","math","mathematics"]},
 {id:"kurdish",name:"کوردی",icon:"📚",aliases:["کوردی","kurdish"]},
 {id:"arabic",name:"عەرەبی",icon:"🖋️",aliases:["عەرەبی","arabic"]},
 {id:"english",name:"ئینگلیزی",icon:"🔤",aliases:["ئینگلیزی","english"]}
];
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
async function readManifest() {
 const response = await fetch("data/index.json", {cache:"no-store"});
 if (!response.ok) throw new Error("نەتوانرا لیستی فایلەکان بخوێندرایەوە (HTTP " + response.status + ").");
 const files = await response.json();
 if (!Array.isArray(files)) throw new Error("فۆرماتی لیستی فایلەکان دروست نییە.");
 manifestFiles = files.filter(x => typeof x === "string" && x.toLowerCase().endsWith(".json"));
 return manifestFiles;
}
function filesForSubject(subject) {
 const names = manifestFiles.map(path => ({path:path,base:path.split("/").pop().replace(/\.json$/i,"").toLocaleLowerCase()}));
 if (subject.id === "biology") {
  const exact = names.filter(x => subject.aliases.some(alias => x.base === alias.toLocaleLowerCase()));
  return (exact.length ? exact : names).map(x => x.path);
 }
 return names.filter(x => subject.aliases.some(alias => x.base === alias.toLocaleLowerCase())).map(x => x.path);
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
async function loadSubjectLessons(subject) {
 const files = filesForSubject(subject);
 if (!files.length) throw new Error("هیچ فایلێکی JSON بۆ ئەم بابەتە بەردەست نییە.");
 const results = await Promise.all(files.map(async path => {
  try {
   const encoded = path.split("/").map(encodeURIComponent).join("/");
   const response = await fetch("data/" + encoded, {cache:"no-store"});
   if (!response.ok) throw new Error("HTTP " + response.status);
   return {path:path,items:normalizeJson(await response.json())};
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
