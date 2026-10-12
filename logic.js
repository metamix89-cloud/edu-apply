// logic.js – 계산·판정 규칙만 둔다 (화면을 다루는 코드 금지)
// 규칙 번호는 PRD.md 6장을 따른다.

const STATUS = { APPLY: '신청', DONE: '이수', CANCEL: '취소' };
const DEFAULT_CAPACITY = 5;

// 이름 비교용 : 앞뒤 공백 제거
function normName(name) {
  return String(name ?? '').trim();
}

// R-01 중복 : 이름(앞뒤 공백 제거)과 과정이 같고 '취소'가 아닌 신청이 있으면 중복
function isDuplicate(apps, name, course) {
  const n = normName(name);
  const c = String(course ?? '').trim();
  return apps.some(a => normName(a.name) === n && a.course === c && a.status !== STATUS.CANCEL);
}

// 과정의 '취소'가 아닌 신청 수
function activeCount(apps, course) {
  return apps.filter(a => a.course === course && a.status !== STATUS.CANCEL).length;
}

// 과정 정원 (등록되지 않은 과정은 기본 5명)
function getCapacity(courses, course) {
  const found = courses.find(c => c.course === course);
  return found ? Number(found.capacity) : DEFAULT_CAPACITY;
}

// R-02 정원 : '취소'가 아닌 신청 수가 정원 이상이면 마감
function isFull(apps, courses, course) {
  return activeCount(apps, course) >= getCapacity(courses, course);
}

// R-03 이수 시간 : 상태가 '이수'인 올해 신청의 교육시간만 합산
function calcYearHours(apps, name, year) {
  const n = normName(name);
  const y = String(year);
  return apps
    .filter(a => normName(a.name) === n && a.status === STATUS.DONE && String(a.date).startsWith(y + '-'))
    .reduce((sum, a) => sum + Number(a.hours || 0), 0);
}

// R-04 상태 변경 : 신청 → 이수, 신청 → 취소만 가능
function canChangeStatus(current, next) {
  return current === STATUS.APPLY && (next === STATUS.DONE || next === STATUS.CANCEL);
}

// 개인별 올해 누적 이수 시간 표 (시간 많은 순, 같으면 이름 순)
function hoursByPerson(apps, year) {
  const names = [...new Set(apps.map(a => normName(a.name)))];
  return names
    .map(name => ({ name, hours: calcYearHours(apps, name, year) }))
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, 'ko'));
}

// 신청 목록 정렬 : 교육일 빠른 순, 같으면 먼저 신청한 순
function sortByDate(apps) {
  const order = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  return [...apps].sort((a, b) => order(String(a.date), String(b.date)) || order(a.createdAt, b.createdAt));
}

// 과정 이름 목록 (등록 과정 + 신청에 나온 과정)
function courseNames(apps, courses) {
  return [...new Set([...courses.map(c => c.course), ...apps.map(a => a.course)])];
}

// 과정의 교육일 (가장 이른 날짜)
function courseDate(apps, course) {
  const dates = apps.filter(a => a.course === course).map(a => a.date).sort();
  return dates[0] || '';
}

// ---- 날짜 (toISOString 금지 : 한국 시간에서 하루가 밀림) ----
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return formatDate(new Date());
}

function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// base 날짜에서 target 날짜까지 남은 일수 (지났으면 음수)
function daysUntil(target, base) {
  return Math.round((parseDate(target) - parseDate(base)) / 86400000);
}

// F-08 교육일 7일 이내 (오늘 포함, 지난 날짜 제외)
function isWithin7Days(target, base) {
  const d = daysUntil(target, base);
  return d >= 0 && d <= 7;
}

// F-07 CSV (엑셀 한글 깨짐 방지용 UTF-8 BOM 포함)
function toCSV(rows) {
  const header = ['교육과정명', '교육일', '교육시간', '신청자', '소속팀', '상태'];
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = rows.map(a => [a.course, a.date, a.hours, a.name, a.team, a.status].map(esc).join(','));
  return '﻿' + [header.join(','), ...lines].join('\r\n');
}
