# CLAUDE.md – 교육 신청 현황 관리 작업 규칙

> **4회차 변경** 표시가 붙은 곳만 3회차와 다릅니다. **4회차 변경 (2)** 는 Phase 5(로그인)에서 바뀐 곳입니다.

## 프로젝트 개요
- 교육용 프로토타입이다. 무엇을 만들지는 PRD.md를 따른다.
- PRD.md에 없는 기능은 먼저 제안하고, 내가 승인한 뒤에만 구현한다.

## 기술 스택 (변경 금지)
- HTML + CSS + 순수 JavaScript만 사용한다. (React 등 프레임워크, 빌드 도구 사용 금지)
- **4회차 변경** 외부 CDN은 supabase-js 하나만 허용한다.
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
- **4회차 변경** 데이터는 Supabase DB에 저장한다. (localStorage 사용 안 함)
- **4회차 변경 (2)** 로그인은 Supabase Auth(이메일 + 비밀번호)를 쓴다. 로그인 상태 저장은 supabase-js가 알아서 한다.
- **4회차 변경** 서버 프로그램(Node·Python 등)은 만들지 않는다. 정적 파일만 Vercel에 배포한다.

## 폴더 구조
- index.html : 화면 구조 (**4회차 변경 (2)** 로그인 전에만 보일 것은 class="only-out", 로그인 후에만 보일 것은 class="only-in")
- style.css  : 디자인
- **4회차 변경** config.js : Supabase 주소와 공개용 키 두 줄만 둔다
- logic.js   : 계산·판정 규칙만 (화면을 다루는 코드 금지)
- app.js     : 화면 동작 (입력 받기, 목록 그리기, 버튼 이벤트)
- test.html  : logic.js 자동 테스트 (완료 기준 T-xx를 PASS/FAIL 표로 표시)
- **4회차 변경** supabase_setup.sql : 표·규칙·권한. DB 규칙을 바꾸면 이 파일도 고친다
- **4회차 변경 (2)** supabase_login.sql : Phase 5에서 덧붙인 user_id 칸 · 로그인 규칙 (setup.sql 다음에 실행)
- **4회차 변경 (2)** .gitignore : `.env` 를 적어 둔다
- **4회차 변경** index.html은 supabase-js → config.js → logic.js → app.js 순서로 불러온다.

## 작업 방식
1. 코드를 고치기 전에 계획(수정할 파일·함수와 이유)을 먼저 보여주고 승인을 받는다.
2. 한 번에 PRD의 Phase 하나만 구현한다.
3. 업무 규칙(R-xx)을 만들거나 고치면 test.html에 해당 완료 기준(T-xx) 테스트를 추가한다.
4. 작업이 끝나면 변경한 파일, 내가 확인할 방법, 남은 문제를 보고한다.
5. 오류 수정 요청을 받으면 원인을 2~3줄로 먼저 설명하고, 해당 줄만 고친다. 잘 되던 기능은 건드리지 않는다.
6. **4회차 변경** SQL을 바꾸면 내가 Supabase SQL Editor에서 직접 실행해야 한다. 실행할 부분만 따로 보여 준다.

## 코딩 규칙
- 함수 이름과 화면 요소 id는 아래 '이름 표'를 그대로 쓴다. 새로 만들면 표에 추가한다.
- 주석과 화면 문구는 한국어로 쓴다. 날짜는 YYYY-MM-DD로 표시한다.
- 날짜 문자열을 만들 때 toISOString()을 쓰지 않는다. (한국 시간에서 하루가 밀림)
- 사용자가 입력한 글자는 textContent로 표시한다. (innerHTML에 그대로 넣지 않기)
- **4회차 변경** Supabase 호출(db.from · **db.auth**)은 app.js '저장 위치' 구역의 함수 안에서만 한다. 오류가 오면 throw해서 화면 함수가 메시지로 보여 주게 한다.
- **4회차 변경 (2)** 삭제는 `.select('id')`로 지운 줄을 받아, 0줄이면 "내 신청만 지울 수 있습니다"를 띄운다. (RLS는 남의 줄을 오류 없이 0줄로 막음)
- **4회차 변경 (2)** 버튼을 숨기는 것은 안내일 뿐이다. 막는 것은 DB(supabase_login.sql)다.

## 보안·데이터 규칙
- 가상 데이터만 사용한다. 실제 이름·연락처·기관 내부자료를 코드와 샘플에 넣지 않는다.
- **4회차 변경** 표 이름은 PRD.md 5장을 따르고 `edu_` 로 시작한다.
- **4회차 변경** 화면 코드에는 공개용 키(Publishable 또는 anon)만 쓴다. **비밀 키(Secret 또는 service_role)는 절대 코드·채팅·GitHub에 넣지 않는다.**
- **4회차 변경** 업무 규칙(R-01·R-02·R-04)은 화면에서만 막지 않는다. DB(supabase_setup.sql)에서도 막는다.

## 프로젝트 전용 규칙
### 이름 표
| 구분      | 이름                                                                   |
|---|---|
| 함수(logic.js) | **canDelete(app, userId), myApps(apps, userId)**, isDuplicate(apps, name, course), isFull(apps, courses, course), calcYearHours(apps, name, year), canChangeStatus(current, next), activeCount(apps, course), getCapacity(courses, course), hoursByPerson(apps, year), sortByDate(apps), courseNames(apps, courses), courseDate(apps, course), formatDate(d), todayStr(), daysUntil(target, base), isWithin7Days(target, base), toCSV(rows) |
| 함수(app.js) 저장 | loadData(), insertApp(app), updateStatus(id, newStatus), updateCapacity(course, capacity), checkConfig(), fromRow(r), dbError(error), **loadUser(), signIn(email, password), signUp(email, password), signOut(), deleteApp(id)** |
| 함수(app.js) 화면 | addApplication(), renderList(), renderSummary(), renderHours(), renderAll(), changeStatus(id, newStatus), setCapacity(course, value), downloadCSV(course), showMessage(text, type), **reloadData()**, **doSignIn(), doSignUp(), doSignOut(), removeApp(id), renderAuth(), renderMyApps()** |
| 화면 id   | applyForm, courseInput, courseOptions, dateInput, hoursInput, nameInput, teamInput, applyBtn, msgBox, applicationList, courseSummary, hoursTable, saveMode, **reloadBtn**, **authBox, loginForm, emailInput, passwordInput, loginBtn, signUpBtn, myAppList, authState, logoutBtn** |
| 상태 변수(app.js) | apps, courses, **currentUser** (로그인한 사용자 또는 null) |
| **설정(config.js)** | SUPABASE_URL, SUPABASE_KEY |
| **DB 표** | edu_courses, edu_apps |

### 주의사항
- 이름 비교는 반드시 앞뒤 공백을 제거한 뒤 한다. (R-01)
- 정원 계산에서 '취소' 건은 빼고 센다. (R-02)
- 데이터를 읽고 쓰는 코드는 app.js '저장 위치' 구역의 함수에만 둔다. 화면 함수는 저장소를 직접 부르지 않는다.
- **4회차 변경 (2)** user_id는 화면에서 보내지 않는다. DB가 로그인한 계정으로 채운다. (R-08)

## 자주 발생한 오류와 해결 (Debug Loop에서 배운 것 – 계속 추가)
- getElementById 결과는 사용 전에 있는지 확인하고, 없으면 콘솔에 '요소 없음: id'를 표시한다.
- config.js가 비어 있거나 비밀 키가 들어 있으면 연결하지 않고 화면에 이유를 보여 준다. (checkConfig)
- **4회차 변경 (2)** 회원가입 뒤 로그인이 안 되면 Supabase → Authentication → Email 의 "Confirm email"이 켜져 있는지 본다.
