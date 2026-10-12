// app.js – 화면 동작 (입력 받기, 목록 그리기, 버튼 이벤트)
// 규칙 판정은 logic.js 함수를 부른다.

let apps = [];     // edu_apps
let courses = [];  // edu_courses
let currentUser = null; // 로그인한 사용자 (없으면 null)

// ===== 저장 위치 : Supabase DB =====
// 데이터를 읽고 쓰는 곳은 이 네 함수뿐이다. (3회차 localStorage 버전에서 이 구역만 바뀌었다)
// config.js 점검 : 아직 안 채웠거나, 비밀 키를 넣었으면 연결하지 않는다
function checkConfig() {
  if (SUPABASE_URL.includes('여기에') || SUPABASE_KEY.includes('여기에')) {
    return 'config.js에 Supabase 주소와 공개용 키를 넣어 주세요.';
  }
  let role = '';
  try { role = JSON.parse(atob(SUPABASE_KEY.split('.')[1])).role; } catch (e) { /* 새 형식 키 */ }
  if (SUPABASE_KEY.startsWith('sb_secret_') || role === 'service_role') {
    return '비밀 키(Secret · service_role)가 들어 있습니다! 지우고 공개용 키(Publishable · anon)로 바꾸세요.';
  }
  return '';
}

let db = null;
const configProblem = checkConfig();
if (!configProblem) {
  try {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.error('Supabase 연결 설정 오류 :', e.message);
  }
}

// DB 한 줄 → 화면에서 쓰는 모양 (created_at → createdAt)
function fromRow(r) {
  return { id: r.id, course: r.course, date: r.date, hours: r.hours, name: r.name,
    team: r.team, status: r.status, createdAt: r.created_at, userId: r.user_id };
}

// DB가 보낸 거부 이유를 화면 메시지로
function dbError(error) {
  if (error.code === '23505') return new Error('이미 신청한 과정입니다. (DB 중복 검사)');
  if (error.code === '42501') return new Error('이 칸은 바꿀 수 없습니다. (DB 권한)');
  if (error.code === 'invalid_credentials') return new Error('이메일 또는 비밀번호가 맞지 않습니다.');
  if (error.code === 'email_not_confirmed') return new Error('이메일 확인이 끝나지 않았습니다. (Confirm email 설정 확인)');
  if (error.code === 'user_already_exists') return new Error('이미 가입된 이메일입니다.');
  return new Error(error.message);
}

// 전체 불러오기
async function loadData() {
  if (!db) throw new Error(configProblem || 'Supabase에 연결하지 못했습니다. config.js의 주소를 확인해 주세요.');
  const [a, c] = await Promise.all([
    db.from('edu_apps').select('*'),
    db.from('edu_courses').select('*'),
  ]);
  if (a.error) throw dbError(a.error);
  if (c.error) throw dbError(c.error);
  apps = a.data.map(fromRow);
  courses = c.data;
}

// 신청 1건 저장 (과정 자동 등록·정원·중복은 DB가 다시 검사)
async function insertApp(app) {
  const { course, date, hours, name, team } = app;
  const { error } = await db.from('edu_apps').insert({ course, date, hours, name, team });
  if (error) {
    await loadData().catch(() => {}); // 그사이 남이 등록했을 수 있으니 최신으로
    throw dbError(error);
  }
  await loadData();
}

// 상태 변경 저장
async function updateStatus(id, newStatus) {
  const { error } = await db.from('edu_apps').update({ status: newStatus }).eq('id', id);
  if (error) {
    await loadData().catch(() => {});
    throw dbError(error);
  }
  await loadData();
}

// 정원 변경 저장
async function updateCapacity(course, capacity) {
  const { error } = await db.from('edu_courses').update({ capacity }).eq('course', course);
  if (error) throw dbError(error);
  await loadData();
}

// 내 신청 삭제 (RLS가 내 신청 · '신청' 상태만 지우게 막는다. 지운 줄 수를 돌려준다)
async function deleteApp(id) {
  const { data, error } = await db.from('edu_apps').delete().eq('id', id).select('id');
  if (error) {
    await loadData().catch(() => {});
    throw dbError(error);
  }
  await loadData();
  return data.length;
}

// 로그인 상태 확인 (새로고침해도 유지 : supabase-js가 저장해 둔 세션을 읽는다)
async function loadUser() {
  if (!db) return null;
  const { data, error } = await db.auth.getSession();
  if (error) throw dbError(error);
  return data.session ? data.session.user : null;
}

// 로그인 (이메일 + 비밀번호)
async function signIn(email, password) {
  if (!db) throw new Error(configProblem || 'Supabase에 연결하지 못했습니다.');
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw dbError(error);
  return data.user;
}

// 회원가입 (메일 확인이 꺼져 있으면 바로 로그인된 사용자를 돌려준다, 아니면 null)
async function signUp(email, password) {
  if (!db) throw new Error(configProblem || 'Supabase에 연결하지 못했습니다.');
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) throw dbError(error);
  return data.session ? data.session.user : null;
}

// 로그아웃
async function signOut() {
  if (!db) throw new Error(configProblem || 'Supabase에 연결하지 못했습니다.');
  const { error } = await db.auth.signOut();
  if (error) throw dbError(error);
}
// ===== 저장 위치 끝 =====


// ---- 화면 도우미 ----
function $(id) {
  const el = document.getElementById(id);
  if (!el) console.warn('요소 없음: ' + id);
  return el;
}

function make(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text; // 입력값은 항상 textContent로 표시
  if (className) el.className = className;
  return el;
}

function showMessage(text, type) {
  const box = $('msgBox');
  if (!box) return;
  box.textContent = text;
  box.className = 'msg ' + (type || '');
}


// ---- F-01 ~ F-03 신청 ----
async function addApplication() {
  const app = {
    course: $('courseInput').value.trim(),
    date: $('dateInput').value,
    hours: Number($('hoursInput').value),
    name: normName($('nameInput').value),
    team: $('teamInput').value.trim(),
    status: STATUS.APPLY,
  };

  if (!app.course || !app.date || !app.name || !app.team || !(app.hours > 0)) {
    showMessage('모든 칸을 채워 주세요. (교육시간은 1 이상)', 'error');
    return;
  }
  if (isDuplicate(apps, app.name, app.course)) {          // R-01
    showMessage(`${app.name} 님은 이미 「${app.course}」에 신청했습니다.`, 'error');
    return;
  }
  if (isFull(apps, courses, app.course)) {                // R-02
    showMessage(`「${app.course}」은 정원이 찼습니다. (마감)`, 'error');
    return;
  }

  try {
    await insertApp(app);
  } catch (e) {
    showMessage('저장하지 못했습니다 : ' + e.message, 'error');
    renderAll(); // 실패해도 저장소 기준으로 다시 그린다
    return;
  }
  $('applyForm').reset();
  showMessage(`${app.name} 님의 「${app.course}」 신청이 등록되었습니다.`, 'ok');
  renderAll();
}

// ---- F-05 상태 변경 ----
async function changeStatus(id, newStatus) {
  const app = apps.find(a => a.id === id);
  if (!app) return;
  if (!canChangeStatus(app.status, newStatus)) {          // R-04
    showMessage(`'${app.status}' 상태는 더 이상 바꿀 수 없습니다.`, 'error');
    return;
  }
  try {
    await updateStatus(id, newStatus);
  } catch (e) {
    showMessage('상태를 바꾸지 못했습니다 : ' + e.message, 'error');
    renderAll(); // 실패해도 저장소 기준으로 다시 그린다
    return;
  }
  showMessage(`${app.name} 님 「${app.course}」 → ${newStatus}`, 'ok');
  renderAll();
}

// ---- F-04 정원 설정 ----
async function setCapacity(course, value) {
  const cap = Number(value);
  if (!(cap >= 1 && cap <= 100)) {
    showMessage('정원은 1~100 사이로 입력해 주세요.', 'error');
    renderSummary();
    return;
  }
  try {
    await updateCapacity(course, cap);
  } catch (e) {
    showMessage('정원을 바꾸지 못했습니다 : ' + e.message, 'error');
    renderAll(); // 실패해도 저장소 기준으로 다시 그린다
    return;
  }
  showMessage(`「${course}」 정원을 ${cap}명으로 바꿨습니다.`, 'ok');
  renderAll();
}

// ---- F-07 CSV 다운로드 ----
function downloadCSV(course) {
  const rows = sortByDate(apps.filter(a => a.course === course));
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `신청명단_${course}_${todayStr()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}


// ---- 화면 그리기 ----
// F-02 신청 목록
function renderList() {
  const body = $('applicationList');
  if (!body) return;
  body.replaceChildren();
  for (const a of sortByDate(apps)) {
    const tr = make('tr');
    tr.append(make('td', a.date), make('td', a.course), make('td', a.hours + '시간'),
      make('td', a.name), make('td', a.team));
    const st = make('td');
    st.append(make('span', a.status, 'badge st-' + a.status));
    tr.append(st);

    const act = make('td');
    for (const next of [STATUS.DONE, STATUS.CANCEL]) {
      const btn = make('button', next, 'small');
      btn.disabled = !canChangeStatus(a.status, next);    // T-06
      btn.addEventListener('click', () => changeStatus(a.id, next));
      act.append(btn);
    }
    if (currentUser) tr.append(act);                      // 상태 버튼은 로그인 후에만
    body.append(tr);
  }
}

// 과정별 요약 카드 (F-04 마감 배지, F-07 CSV, F-08 D-7 배지)
function renderSummary() {
  const box = $('courseSummary');
  if (!box) return;
  box.replaceChildren();
  const today = todayStr();
  for (const course of courseNames(apps, courses)) {
    const count = activeCount(apps, course);
    const cap = getCapacity(courses, course);
    const date = courseDate(apps, course);
    const card = make('div', undefined, 'course-card');

    const head = make('div', undefined, 'course-head');
    head.append(make('strong', course));
    if (isFull(apps, courses, course)) head.append(make('span', '마감', 'badge full'));
    if (date && isWithin7Days(date, today)) head.append(make('span', 'D-' + daysUntil(date, today), 'badge soon'));
    card.append(head);

    card.append(make('div', date ? '교육일 ' + date : '교육일 미정', 'muted'));
    card.append(make('div', `${count} / ${cap}명`, 'count'));

    const capRow = make('label', '정원 ', 'cap-row');
    const capInput = make('input');
    capInput.type = 'number'; capInput.min = 1; capInput.max = 100; capInput.value = cap;
    capInput.addEventListener('change', () => setCapacity(course, capInput.value));
    capRow.append(capInput);
    if (currentUser) card.append(capRow);                 // 정원 칸은 로그인 후에만

    const csv = make('button', '명단 CSV', 'small ghost');
    csv.addEventListener('click', () => downloadCSV(course));
    card.append(csv);
    box.append(card);
  }

  // 신청 폼의 과정 선택 목록
  const options = $('courseOptions');
  if (options) {
    options.replaceChildren(...courseNames(apps, courses).map(c => {
      const o = document.createElement('option'); o.value = c; return o;
    }));
  }
}

// F-06 개인별 올해 누적 이수 시간
function renderHours() {
  const body = $('hoursTable');
  if (!body) return;
  body.replaceChildren();
  const year = todayStr().slice(0, 4);
  for (const row of hoursByPerson(apps, year)) {
    const tr = make('tr');
    tr.append(make('td', row.name), make('td', row.hours + '시간'));
    body.append(tr);
  }
}

// F-14 내 신청 표 (로그아웃 상태면 비운다)
function renderMyApps() {
  const body = $('myAppList');
  if (!body) return;
  body.replaceChildren();
  if (!currentUser) return;
  for (const a of sortByDate(myApps(apps, currentUser.id))) {
    const tr = make('tr');
    tr.append(make('td', a.date), make('td', a.course), make('td', a.hours + '시간'));
    const st = make('td');
    st.append(make('span', a.status, 'badge st-' + a.status));
    tr.append(st);

    const del = make('td');
    if (canDelete(a, currentUser.id)) {                   // R-09 : '신청' 상태인 내 신청만 [삭제]
      const btn = make('button', '삭제', 'small');
      btn.addEventListener('click', () => removeApp(a.id));
      del.append(btn);
    }
    tr.append(del);
    body.append(tr);
  }
}

// PRD 4장 : 로그인 전 · 후 화면 (body의 logged-in 클래스로 only-in / only-out 요소를 나눈다)
function renderAuth() {
  document.body.classList.toggle('logged-in', !!currentUser);
  const state = $('authState');
  if (!state) return;
  state.textContent = currentUser ? '로그인 : ' + currentUser.email : '로그인 전 — 보기만 가능';
}

function renderAll() {
  renderAuth();
  renderSummary();
  renderList();
  renderMyApps();
  renderHours();
}

// F-10 다른 사람이 등록한 내용 다시 읽기
async function reloadData() {
  try {
    await loadData();
    showMessage('최신 목록을 불러왔습니다.', 'ok');
  } catch (e) {
    showMessage('데이터를 불러오지 못했습니다 : ' + e.message, 'error');
  }
  renderAll();
}

// ---- F-12 로그인 · 회원가입 · 로그아웃 ----
async function doSignIn() {
  const email = $('emailInput').value.trim();
  const password = $('passwordInput').value;
  if (!email || !password) {
    showMessage('이메일과 비밀번호를 입력해 주세요.', 'error');
    return;
  }
  try {
    currentUser = await signIn(email, password);
  } catch (e) {
    showMessage('로그인하지 못했습니다 : ' + e.message, 'error');
    return;
  }
  $('passwordInput').value = '';
  showMessage(`${currentUser.email} 님, 로그인되었습니다.`, 'ok');
  renderAll();
}

async function doSignUp() {
  const email = $('emailInput').value.trim();
  const password = $('passwordInput').value;
  if (!email || !password) {
    showMessage('이메일과 비밀번호를 입력해 주세요.', 'error');
    return;
  }
  let user;
  try {
    user = await signUp(email, password);
  } catch (e) {
    showMessage('회원가입하지 못했습니다 : ' + e.message, 'error');
    return;
  }
  if (!user) {
    showMessage('가입은 되었지만 바로 로그인되지 않았습니다. Supabase에서 Confirm email을 껐는지 확인해 주세요.', 'error');
    return;
  }
  currentUser = user;
  $('passwordInput').value = '';
  showMessage(`${user.email} 님, 가입하고 로그인되었습니다.`, 'ok');
  renderAll();
}

async function doSignOut() {
  try {
    await signOut();
  } catch (e) {
    showMessage('로그아웃하지 못했습니다 : ' + e.message, 'error');
    return;
  }
  currentUser = null;
  showMessage('로그아웃되었습니다.', 'ok');
  renderAll();
}

// ---- F-15 내 신청 삭제 ----
async function removeApp(id) {
  const app = apps.find(a => a.id === id);
  if (!app) return;
  if (!canDelete(app, currentUser && currentUser.id)) {   // R-09
    showMessage("내 신청 중 '신청' 상태인 것만 지울 수 있습니다.", 'error');
    return;
  }
  let count;
  try {
    count = await deleteApp(id);
  } catch (e) {
    showMessage('삭제하지 못했습니다 : ' + e.message, 'error');
    renderAll(); // 실패해도 저장소 기준으로 다시 그린다
    return;
  }
  if (count === 0) {                                      // DB가 한 줄도 못 지운 경우
    showMessage('내 신청만 지울 수 있습니다. (남의 신청이거나 이수·취소된 신청입니다)', 'error');
    renderAll();
    return;
  }
  showMessage(`${app.name} 님 「${app.course}」 신청을 삭제했습니다.`, 'ok');
  renderAll();
}

// 이미 있는 과정을 고르면 교육일·시간을 채워 준다
function fillCourseInfo() {
  const course = $('courseInput').value.trim();
  const sample = apps.find(a => a.course === course);
  if (sample) {
    $('dateInput').value = sample.date;
    $('hoursInput').value = sample.hours;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  $('applyForm').addEventListener('submit', e => { e.preventDefault(); addApplication(); });
  $('courseInput').addEventListener('change', fillCourseInfo);
  $('reloadBtn').addEventListener('click', reloadData);
  $('loginForm').addEventListener('submit', e => { e.preventDefault(); doSignIn(); });
  $('signUpBtn').addEventListener('click', doSignUp);
  $('logoutBtn').addEventListener('click', doSignOut);
  try {
    currentUser = await loadUser();
  } catch (e) {
    showMessage('로그인 상태를 확인하지 못했습니다 : ' + e.message, 'error');
  }
  try {
    await loadData();
  } catch (e) {
    showMessage('데이터를 불러오지 못했습니다 : ' + e.message, 'error');
  }
  renderAll();
});
