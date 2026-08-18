# 수능 집중 차단기

Chrome과 Microsoft Edge에서 공통으로 사용할 수 있는 Manifest V3 확장 프로그램입니다. YouTube와 Instagram의 직접 접속 및 임베드 콘텐츠 요청을 네트워크 단계에서 차단하고, 차단 페이지에 2027년 시행 수능 카운트다운을 표시합니다.

## 차단 범위

- `youtube.com`, `youtu.be`, `youtube-nocookie.com`
- `instagram.com`, `ig.me`, `instagr.am`
- 위 도메인의 서브도메인

메인 프레임 요청은 확장 프로그램 내부의 `blocked.html`로 이동합니다. iframe, 스크립트, 미디어, XHR 등 나머지 요청은 차단합니다. Threads, Facebook 전체, `googlevideo.com`, `fbcdn.net`은 차단하지 않습니다.

## 설치

스토어 등록 없이 압축 해제된 확장 프로그램으로 설치합니다.

### Chrome

1. 주소창에 `chrome://extensions`를 입력합니다.
2. 오른쪽 위 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드**를 선택합니다.
4. 이 저장소의 루트 폴더(`manifest.json`이 있는 폴더)를 선택합니다.

### Microsoft Edge

1. 주소창에 `edge://extensions`를 입력합니다.
2. 왼쪽 또는 오른쪽의 **개발자 모드**를 켭니다.
3. **압축 풀린 파일을 로드**를 선택합니다.
4. 이 저장소의 루트 폴더(`manifest.json`이 있는 폴더)를 선택합니다.

파일을 수정한 뒤에는 확장 프로그램 관리 화면에서 **새로고침**을 누르고, 이미 열려 있던 탭도 다시 로드합니다.

## 테스트

외부 의존성 없이 Node.js 18.8 이상에 포함된 내장 테스트 러너를 사용합니다.

```powershell
npm test
```

## 제한 사항

일반 확장 프로그램 권한만으로는 사용자가 브라우저 설정에서 확장 프로그램을 비활성화하거나 삭제하는 것을 막을 수 없습니다. 사용자가 임의로 해제할 수 없는 차단이 필요하면 Chrome/Edge 관리 정책, 운영체제 계정 정책 또는 네트워크/DNS 수준의 별도 관리가 필요합니다.

## 참고

- [Chrome `declarativeNetRequest` API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Microsoft Edge Manifest V3](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/manifest-v3)
- [교육부 2028학년도 대학수학능력시험 일정 발표](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=103512&lev=0&m=020402&opType=N&s=moe&statusYN=W)
