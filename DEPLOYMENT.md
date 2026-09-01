# 무료 배포 안내

이 프로젝트는 Next.js 웹 앱과 NestJS/Socket.IO 서버를 각각 배포해야 합니다.

## 1. Render에 실시간 서버 배포

1. [Render](https://render.com/)에서 GitHub 저장소를 연결합니다.
2. `New +`에서 **Blueprint**를 선택하고 이 저장소를 지정합니다. 루트의 `render.yaml`이 서버 빌드·실행 명령과 상태 확인 경로를 설정합니다.
3. `CLIENT_ORIGIN` 값에 다음 단계에서 생성할 Vercel 주소를 입력합니다. 예: `https://liar-game.vercel.app`
4. 배포가 끝나면 Render URL을 기록합니다. 예: `https://liar-game-server.onrender.com`
5. 브라우저에서 `https://<Render URL>/rooms/health`를 열어 `{ "status": "ok" }` 응답을 확인합니다.

## 2. Vercel에 웹 앱 배포

1. [Vercel](https://vercel.com/)에서 같은 GitHub 저장소를 Import합니다.
2. **Root Directory**를 `apps/web`으로 선택하고, Root Directory 바깥의 소스 파일 포함 옵션을 활성화합니다. 웹 앱이 `packages/contract` 워크스페이스를 사용하기 때문입니다.
3. Build Command를 `cd ../.. && pnpm --filter @repo/contract build && pnpm --filter web build`으로 설정합니다. Output Directory는 `.next`를 유지합니다.
4. Environment Variables에 아래 값을 추가합니다.

   ```text
   NEXT_PUBLIC_SERVER_URL=https://<Render URL>
   ```

5. Production 배포를 실행합니다.
6. Render의 `CLIENT_ORIGIN`을 실제 Vercel Production URL로 저장하고 Render 서버를 한 번 재배포합니다.

## 로컬 개발

환경변수를 지정하지 않으면 기존 주소(`http://localhost:3000`, `http://localhost:4000`)가 사용됩니다.

배포 환경과 같은 값을 로컬에서 시험하려면 각 앱의 `.env.example`을 `.env.local` 또는 `.env`로 복사해 값을 변경합니다. 실제 `.env*` 파일은 Git에 포함하지 않습니다.

## 무료 티어 유의사항

Render 무료 Web Service는 15분 동안 HTTP 요청이나 WebSocket 메시지가 없으면 휴면 상태가 됩니다. 재접속 시 기동까지 시간이 걸릴 수 있고, 현재 서버의 방 상태는 메모리에만 있어 재시작되면 사라집니다. 따라서 이 구성은 MVP·데모에 적합합니다.
