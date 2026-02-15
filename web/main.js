const USERS = ["りか", "かほ", "かすみ", "ひなこ", "りんね", "統括"];
const MEMBER_ORDER = ["りか", "かほ", "かすみ", "ひなこ"];
const FIXED_TAGS = ["#気づき", "#改善", "#感情", "#予定・時間", "#相談"];
const CUSTOM_CANDIDATES = ["#体調", "#疲労", "#ロープレ", "#クライアント", "#恋愛", "#忙殺", "#回復", "#集中", "#初挑戦", "#思考"];
const KPI_GOAL_APPT_SET = 40;

const store = {
  reports: () => JSON.parse(localStorage.getItem("reports") || "[]"),
  saveReports: (v) => localStorage.setItem("reports", JSON.stringify(v)),
  drafts: () => JSON.parse(localStorage.getItem("drafts") || "{}"),
  saveDrafts: (v) => localStorage.setItem("drafts", JSON.stringify(v)),
  schedules: () => JSON.parse(localStorage.getItem("schedules") || "[]"),
  saveSchedules: (v) => localStorage.setItem("schedules", JSON.stringify(v)),
  snapshots: () => JSON.parse(localStorage.getItem("snapshots") || "[]"),
  saveSnapshots: (v) => localStorage.setItem("snapshots", JSON.stringify(v))
};

const el = {
  userSelect: byId("userSelect"),
  reportDate: byId("reportDate"),
  deadlineInfo: byId("deadlineInfo"),
  submitReport: byId("submitReport"),
  submitStatus: byId("submitStatus"),
  fixedTags: byId("fixedTags"),
  customTagCandidates: byId("customTagCandidates"),
  customTagInput: byId("customTagInput"),
  free_note: byId("free_note"),
  bottleneck_note: byId("bottleneck_note"),
  monthlySummary: byId("monthlySummary"),
  monthlyCalendar: byId("monthlyCalendar"),
  logList: byId("logList"),
  scheduleDate: byId("scheduleDate"),
  scheduleType: byId("scheduleType"),
  scheduleStatus: byId("scheduleStatus"),
  scheduleCount: byId("scheduleCount"),
  saveSchedule: byId("saveSchedule"),
  scheduleList: byId("scheduleList"),
  generateSnapshot: byId("generateSnapshot"),
  weeklyOutput: byId("weeklyOutput")
};

const numericFields = [
  "list_count",
  "appointment_set_count",
  "appointment_planned_count_raw",
  "appointment_done_count",
  "line_created_count",
  "ac_planned_count",
  "ac_done_count"
];

let selectedFixed = new Set();
let selectedCustom = "";

init();

function init() {
  USERS.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    el.userSelect.appendChild(opt);
  });

  const today = todayStr();
  el.reportDate.value = today;
  el.scheduleDate.value = today;

  renderFixedTags();
  renderCustomCandidates();
  bindTabs();
  bindEvents();
  refreshAll();
}

function bindTabs() {
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      byId(`tab-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "archive") renderArchive();
      if (btn.dataset.tab === "schedule") renderSchedules();
      if (btn.dataset.tab === "weekly") renderWeekly();
    });
  });
}

function bindEvents() {
  [el.userSelect, el.reportDate].forEach((node) => node.addEventListener("change", refreshAll));

  let draftTimer;
  [...numericFields.map(byId), el.free_note, el.bottleneck_note, el.customTagInput].forEach((node) => {
    node.addEventListener("input", () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraft, 300);
    });
  });

  el.submitReport.addEventListener("click", submitReport);
  el.saveSchedule.addEventListener("click", saveSchedule);
  el.generateSnapshot.addEventListener("click", generateSnapshot);
}

function renderFixedTags() {
  el.fixedTags.innerHTML = "";
  FIXED_TAGS.forEach((t) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = t;
    b.addEventListener("click", () => {
      if (selectedFixed.has(t)) selectedFixed.delete(t);
      else selectedFixed.add(t);
      b.classList.toggle("active");
      saveDraft();
    });
    el.fixedTags.appendChild(b);
  });
}

function renderCustomCandidates() {
  el.customTagCandidates.innerHTML = "";
  CUSTOM_CANDIDATES.forEach((t) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = t;
    b.addEventListener("click", () => {
      selectedCustom = t;
      el.customTagInput.value = t.replace(/^#/, "");
      [...el.customTagCandidates.querySelectorAll("button")].forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      saveDraft();
    });
    el.customTagCandidates.appendChild(b);
  });
}

function draftKey() {
  return `${el.userSelect.value}::${el.reportDate.value}`;
}

function saveDraft() {
  const drafts = store.drafts();
  drafts[draftKey()] = {
    fields: Object.fromEntries(numericFields.map((f) => [f, byId(f).value])),
    free_note: el.free_note.value,
    bottleneck_note: el.bottleneck_note.value,
    fixedTags: [...selectedFixed],
    customTagInput: el.customTagInput.value
  };
  store.saveDrafts(drafts);
  el.submitStatus.textContent = "下書きを保存しました";
}

function loadDraft() {
  const d = store.drafts()[draftKey()];
  selectedFixed = new Set();
  selectedCustom = "";

  [...el.fixedTags.querySelectorAll("button")].forEach((b) => b.classList.remove("active"));
  [...el.customTagCandidates.querySelectorAll("button")].forEach((b) => b.classList.remove("active"));

  if (!d) {
    numericFields.forEach((f) => (byId(f).value = ""));
    el.free_note.value = "";
    el.bottleneck_note.value = "";
    el.customTagInput.value = "";
    return;
  }

  numericFields.forEach((f) => (byId(f).value = d.fields[f] || ""));
  el.free_note.value = d.free_note || "";
  el.bottleneck_note.value = d.bottleneck_note || "";
  el.customTagInput.value = d.customTagInput || "";

  (d.fixedTags || []).forEach((t) => selectedFixed.add(t));
  [...el.fixedTags.querySelectorAll("button")].forEach((b) => {
    if (selectedFixed.has(b.textContent)) b.classList.add("active");
  });
}

function refreshAll() {
  loadDraft();
  renderDeadline();
  syncSubmitState();
  renderArchive();
  renderSchedules();
  renderWeekly();
}

function renderDeadline() {
  const date = el.reportDate.value;
  const cutoff = cutoffAt(date);
  el.deadlineInfo.textContent = `締切: ${fmt(cutoff)}（報告日+1日 03:00）`;
}

function hasSubmitted(user, date) {
  return store.reports().some((r) => r.user === user && r.report_date === date);
}

function syncSubmitState() {
  const locked = hasSubmitted(el.userSelect.value, el.reportDate.value);
  el.submitReport.disabled = locked;
  el.submitStatus.textContent = locked ? "この日は送信済み（1日1回ルール）" : "";
}

function submitReport() {
  const user = el.userSelect.value;
  const reportDate = el.reportDate.value;

  if (hasSubmitted(user, reportDate)) return;

  for (const f of numericFields) {
    if (byId(f).value === "") {
      alert("数字の必須項目を入力してください");
      return;
    }
  }

  if (selectedFixed.size === 0) {
    alert("固定タグを1つ以上選択してください");
    return;
  }

  const customRaw = el.customTagInput.value.trim();
  if (customRaw.length > 15) {
    alert("カスタムタグは15文字以内です");
    return;
  }
  const customTag = customRaw ? `#${customRaw.replace(/^#/, "")}` : null;

  const submittedAt = new Date();
  const status = submittedAt <= cutoffAt(reportDate) ? "flower" : "bud";

  const rec = {
    id: crypto.randomUUID(),
    user,
    report_date: reportDate,
    submitted_at: submittedAt.toISOString(),
    status,
    ...Object.fromEntries(numericFields.map((f) => [f, Number(byId(f).value)])),
    free_note: el.free_note.value.trim(),
    bottleneck_note: el.bottleneck_note.value.trim(),
    fixed_tags: [...selectedFixed],
    custom_tag: customTag
  };

  const reports = store.reports();
  reports.push(rec);
  store.saveReports(reports);

  const drafts = store.drafts();
  delete drafts[draftKey()];
  store.saveDrafts(drafts);

  syncSubmitState();
  renderArchive();
  renderWeekly();
  el.submitStatus.textContent = status === "flower" ? "送信完了: 🌼" : "送信完了: 🌱（遅れ入力）";
}

function renderArchive() {
  const user = el.userSelect.value;
  const month = el.reportDate.value.slice(0, 7);
  const reports = store.reports().filter((r) => r.user === user && r.report_date.startsWith(month));

  const sums = numericFields.reduce((acc, f) => ((acc[f] = reports.reduce((s, r) => s + r[f], 0)), acc), {});
  const flower = reports.filter((r) => r.status === "flower").length;
  const bud = reports.filter((r) => r.status === "bud").length;
  const days = daysInMonth(month);
  const missing = Math.max(days - reports.length, 0);

  const apptAdjusted = sums.appointment_planned_count_raw * 1.33;
  const kpi1 = pct(sums.appointment_set_count, KPI_GOAL_APPT_SET);
  const kpi2 = pct(sums.appointment_done_count, apptAdjusted);
  const kpi3 = pct(sums.line_created_count, sums.appointment_done_count);

  el.monthlySummary.innerHTML = `
    <p>入力率: 🌼${flower} / 🌱${bud} / —${missing}</p>
    <p>合計: リスト ${sums.list_count} | 日程切 ${sums.appointment_set_count} | 予定 ${sums.appointment_planned_count_raw} | 済 ${sums.appointment_done_count} | LINE ${sums.line_created_count}</p>
    <p class="kpi">KPI: 日程切り率 ${kpi1} / アポ実施率 ${kpi2} / LINE作成率 ${kpi3}</p>
  `;

  renderCalendar(month, reports);
  el.logList.innerHTML = reports
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .map(
      (r) => `<div class="log-item"><b>${r.report_date}</b> ${r.status === "flower" ? "🌼" : "🌱"} ${r.fixed_tags.join(" ")} ${r.custom_tag || ""}<br/>${escapeHtml(r.bottleneck_note || "")}</div>`
    )
    .join("") || "<p class='hint'>まだ記録がありません。</p>";
}

function renderCalendar(month, reports) {
  const map = new Map(reports.map((r) => [r.report_date, r.status]));
  const days = daysInMonth(month);
  el.monthlyCalendar.innerHTML = "";
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const s = map.get(date);
    const status = s === "flower" ? "🌼" : s === "bud" ? "🌱" : "—";
    const cls = s === "flower" ? "status-flower" : s === "bud" ? "status-bud" : "";
    const div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `${d}<br><span class='${cls}'>${status}</span>`;
    el.monthlyCalendar.appendChild(div);
  }
}

function saveSchedule() {
  const rec = {
    id: crypto.randomUUID(),
    user: el.userSelect.value,
    schedule_date: el.scheduleDate.value,
    schedule_type: el.scheduleType.value,
    status: el.scheduleStatus.value,
    count: Number(el.scheduleCount.value || 0)
  };
  const list = store.schedules();
  list.push(rec);
  store.saveSchedules(list);
  renderSchedules();
}

function renderSchedules() {
  const user = el.userSelect.value;
  const month = el.reportDate.value.slice(0, 7);
  const rows = store
    .schedules()
    .filter((s) => s.user === user && s.schedule_date.startsWith(month))
    .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));

  el.scheduleList.innerHTML = rows
    .map((s) => `<div class='log-item'>${s.schedule_date} ${s.schedule_type === "appt" ? "アポ" : "AC"} ${s.status} ${s.count}件</div>`)
    .join("") || "<p class='hint'>予定は未登録です。</p>";
}

function generateSnapshot() {
  const weekKey = isoWeekKey(new Date());
  const snapshots = store.snapshots();
  if (snapshots.find((s) => s.week_key === weekKey)) {
    alert("今週分は既に確定済みです");
    return;
  }

  const weekDates = thisWeekDates();
  const reports = store.reports().filter((r) => weekDates.includes(r.report_date));

  const byMember = MEMBER_ORDER.map((name) => {
    const list = reports.filter((r) => r.user === name);
    const sums = numericFields.reduce((acc, f) => ((acc[f] = list.reduce((s, r) => s + r[f], 0)), acc), {});
    return {
      user: name,
      flower: list.filter((r) => r.status === "flower").length,
      bud: list.filter((r) => r.status === "bud").length,
      missing: Math.max(7 - list.length, 0),
      sums,
      bottleneck: list.map((r) => r.bottleneck_note).find(Boolean) || ""
    };
  });

  const teamSums = numericFields.reduce((acc, f) => ((acc[f] = reports.reduce((s, r) => s + r[f], 0)), acc), {});

  snapshots.push({
    week_key: weekKey,
    fixed_at: new Date().toISOString(),
    by_member: byMember,
    team: teamSums
  });
  store.saveSnapshots(snapshots);
  renderWeekly();
}

function renderWeekly() {
  const snapshots = store.snapshots().sort((a, b) => b.week_key.localeCompare(a.week_key));
  el.weeklyOutput.innerHTML = snapshots
    .map((s) => {
      const teamKpi = pct(s.team.appointment_done_count, s.team.appointment_planned_count_raw * 1.33);
      const members = s.by_member
        .map(
          (m) => `<li>${m.user}: 🌼${m.flower}/🌱${m.bud}/—${m.missing} | 予定${m.sums.appointment_planned_count_raw} 済${m.sums.appointment_done_count} 日程切${m.sums.appointment_set_count} LINE${m.sums.line_created_count} AC${m.sums.ac_done_count} | ネック:${escapeHtml(m.bottleneck || "-")}</li>`
        )
        .join("");
      return `<div class='log-item'><b>${s.week_key}</b>（固定: ${fmt(new Date(s.fixed_at))}）<br/>全体KPI(アポ実施率): ${teamKpi}<ul>${members}</ul></div>`;
    })
    .join("") || "<p class='hint'>まだ週次はありません。</p>";
}

function cutoffAt(reportDate) {
  const d = new Date(`${reportDate}T03:00:00+09:00`);
  d.setDate(d.getDate() + 1);
  return d;
}

function byId(id) {
  return document.getElementById(id);
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(d) {
  return d.toLocaleString("ja-JP", { hour12: false });
}
function daysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function pct(n, d) {
  if (!d) return "—";
  return `${((n / d) * 100).toFixed(1)}%`;
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function thisWeekDates() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}
