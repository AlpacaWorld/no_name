# 무료 배포 안내

이 프로젝트는 Next.js 웹 앱과 NestJS/Socket.IO 서버를 각각 배포해야 합니다.

## 1. Render에 실시간 서버 배포

1. [Render](https://render.com/)에서 GitHub 저장소를 연결합니다.
2. `New +`에서 **Blueprint**를 선택하고 이 저장소의 **`main` 브랜치**를 지정합니다. 운영 배포 전에는 `dev`의 변경 사항을 GitHub에서 `main`으로 병합합니다. 루트의 `render.yaml`은 `plan: free`를 명시해 무료 Web Service만 생성하며, 서버 빌드·실행 명령과 상태 확인 경로도 설정합니다.
3. `CLIENT_ORIGIN` 값에 다음 단계에서 생성할 Vercel 주소를 입력합니다. 예: `https://liar-game.vercel.app` 이 값이 설정되면 해당 주소만 CORS 허용 대상으로 사용합니다.
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

## 과금 방지 설정

1. Render Dashboard의 **Workspace Settings → Build Pipeline → Set spend limit**에서 월 한도를 `US$0`으로 설정합니다. 이 한도는 포함된 무료 빌드 시간을 초과했을 때 추가 빌드 비용을 막고, 한도에 도달하면 해당 월의 새 빌드가 중지됩니다.
2. 생성 화면 또는 Blueprint 검토 화면에서 서버 Compute Plan이 반드시 **Free (0.1 CPU / 512 MB)**인지 확인합니다. `Starter`, `0.5c-512mb` 등 유료 플랜을 선택하거나 변경하지 않습니다.
3. Postgres, Key Value, Persistent Disk, Cron Job, Preview Environment를 추가하지 않습니다.
4. Billing의 Monthly Included Usage와 이메일 사용량 알림을 확인합니다. 무료 Web Service도 포함된 아웃바운드 대역폭을 넘으면, 결제수단이 등록된 워크스페이스에는 초과 사용료가 발생할 수 있습니다. Render의 spend limit은 현재 **빌드 파이프라인 비용만** 차단하므로 대역폭 초과 비용까지 0달러로 강제하지는 않습니다.

## 무료 티어 유의사항

Render 무료 Web Service는 15분 동안 HTTP 요청이나 WebSocket 메시지가 없으면 휴면 상태가 됩니다. 재접속 시 기동까지 시간이 걸릴 수 있고, 현재 서버의 방 상태는 메모리에만 있어 재시작되면 사라집니다. 따라서 이 구성은 MVP·데모에 적합합니다.
