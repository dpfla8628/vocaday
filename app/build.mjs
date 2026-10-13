// 앱 사이트 빌드: 기존 화면(public/)을 그대로 복사하고, 그 위에 홈 화면 앱(PWA) 요소만 얹는다.
// 기존 사이트(public/)는 손대지 않는다. 결과: dist-app/  → wrangler deploy --env app
import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'dist-app');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync(join(root, 'public'), out, { recursive: true });
for (const f of readdirSync(join(root, 'app'))) if (f !== 'build.mjs') cpSync(join(root, 'app', f), join(out, f), { recursive: true });

// index.html에 PWA 태그·서비스 워커 등록만 주입
const html = readFileSync(join(out, 'index.html'), 'utf8')
  .replace('<meta name="theme-color" content="#F4F5FA">', '<meta name="theme-color" content="#5B4CF5">')
  .replace(
    '<title>보카데이</title>',
    `<title>보카데이</title>
  <!-- 홈 화면 앱(PWA): 갤럭시 '홈 화면에 추가' / 아이폰 Safari '공유 → 홈 화면에 추가' -->
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="보카데이">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`,
  )
  .replace(
    '<script type="module" src="app.js"></script>',
    `<script type="module" src="app.js"></script>
  <script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});</script>`,
  );
if (!html.includes('manifest.webmanifest') || !html.includes('sw.js')) throw new Error('PWA 주입 실패: index.html 구조가 바뀌었나요?');
writeFileSync(join(out, 'index.html'), html);
console.log('dist-app ready:', readdirSync(out).join(', '));
