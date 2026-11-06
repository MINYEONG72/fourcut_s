# 삼성네컷 — 무료 PNG 첨부 이메일 버전

GitHub Pages + Google Apps Script(MailApp)로 완성된 인생네컷 PNG를 이메일 첨부파일로 보냅니다. Python, EmailJS 유료 플랜, 별도 도메인이 필요하지 않습니다.

## 1. Google Apps Script 발송 서버 만들기

1. https://script.google.com/ 에서 **새 프로젝트**를 만듭니다.
2. 기본 `Code.gs` 내용을 지우고 이 ZIP의 `Code.gs` 내용을 전부 붙여 넣고 저장합니다.
3. **배포 → 새 배포 → 유형: 웹 앱**을 선택합니다.
4. **실행 사용자: 나**, **액세스 권한: 모든 사용자**로 설정합니다. Gmail 전송 권한을 승인합니다.
5. 생성된 `https://script.google.com/macros/s/.../exec` 주소를 복사합니다.
6. Google 계정/조직 정책에 따라 모든 사용자 공개 배포가 제한될 수 있습니다.

## 2. GitHub 파일 업데이트

1. `app.js`에서 `PASTE_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE`를 실제 `/exec` 주소로 교체합니다. URL은 비밀번호가 아니지만 공개되므로 남용에 주의합니다.
2. 저장소 `https://github.com/MINYEONG72/fourcut_photo`의 루트에 `index.html`, `style.css`, `app.js`를 업데이트합니다.
3. **frames 폴더 전체**를 업로드하고 경로가 `frames/red.jpg`, `frames/cream.png`, `frames/red-overlay.png`, `frames/cream-overlay.png`인지 확인합니다.
4. `Code.gs`는 GitHub에 올리지 않아도 됩니다(발송 서버용 파일입니다).
5. GitHub Pages에서 Ctrl+Shift+R로 새로고침합니다.

## 3. 테스트

1. 웹캠으로 8장을 촬영하고 4장을 선택해 결과물을 완성합니다.
2. 이메일 주소를 입력하고 **PNG 첨부파일 이메일로 보내기**를 누릅니다.
3. 전송 성공 안내가 나오면 수신함과 스팸함을 확인합니다.
4. 응답이 오지 않는 경우 Apps Script 대시보드의 **실행** 기록에서 오류를 확인합니다.

## 보안 및 제한

- 공개 웹앱은 누구나 호출할 수 있어 스팸 발송에 악용될 수 있습니다. 이 예제는 10분당 수신자별 1회, 전체 하루 30회 제한을 둡니다. **행사에서 공개 운영하려면 CAPTCHA/Cloudflare Turnstile 등의 서버 측 검증을 추가하는 것을 권장합니다.**
- 앱의 전송 한도(하루 30회)는 `Code.gs`의 `DAILY_MAX`에서 변경할 수 있습니다. Gmail 개인 계정의 Google 공식 일일 발송 한도는 별개입니다.
- 이미지 최대 4MB. 사진/이메일 주소는 이메일 발송을 위해 Google에 전달되며, 이 코드에서는 별도로 저장하지 않습니다.
- HTMLService의 결과 응답은 iframe에서 postMessage로 전달됩니다. 브라우저 환경에 따라 결과 메시지를 받지 못할 수 있으며 이 경우 **발송 성공으로 간주하지 말고** 수신함 및 Apps Script 실행 로그를 확인하세요.
- **Apps Script 코드를 변경했다면 새 버전으로 다시 배포해야 적용됩니다.**
