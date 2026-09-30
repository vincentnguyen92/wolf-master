# Làng Trăng

**Sổ tay quản trò Ma Sói — một PWA mobile-first, dùng được offline.**

Một thiết bị dành cho quản trò. Tạo làng, gán vai, dẫn từng lượt gọi, ghi kết quả xử án ban ngày, xử lý cái chết, hoàn tác và đọc lại biên niên sử cuối ván. Không có player client, tài khoản, backend, API gameplay, AI hay biến môi trường.

## Chạy tại máy

Yêu cầu Node.js 22+ và npm.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Nút **Mở ván mẫu** tạo ngay ván 8 người, không ghi đè ván hiện có.

```bash
npm test                 # Unit/domain + IndexedDB tests
npm run lint             # ESLint + TypeScript strict
npm run build            # Static export + generated offline service worker
npm start                # Serve production export at :3000
```

Kiểm tra production bằng trình duyệt:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright tự chạy static server nếu cổng 3000 đang trống. Tắt dev server trước khi kiểm tra PWA: service worker **chỉ được đăng ký trong production build**. `playwright-report/index.html` chứa báo cáo; screenshots ở `docs/screenshots/`.

## Tính năng MVP

- Wizard 5 bước: tên làng, thêm/sửa/xóa/đổi thứ tự người chơi, chọn bộ vai (chạm lá bài để thêm, dấu trừ để bớt), chia vai bằng tay (chọn người rồi chạm lá vai; không chia ngẫu nhiên mặc định, tự chuyển sang người kế tiếp, lưu vào bản nháp), review kín.
- Kiểm tra tên trùng, số người/số bài, ít nhất một Sói và phân bố phe hợp lệ.
- Tám vai: Ma Sói, Sói con, Dân thường, Tiên tri, Bảo vệ, Phù thủy, Thợ săn, Chán đời. Cài đặt riêng theo vai, chỉ hiện với vai có trong bộ bài.
- Thao tác trên thẻ: chạm thẻ người chơi, nút xác nhận (Cắn, Che, Bắn, Đầu độc, Mời lên) hiện ngay trên thẻ; thẻ Tiên tri lật ra kết quả; Phù thủy bấm "Cứu" trên thẻ nạn nhân; phán quyết ban ngày vuốt thẻ phải để treo cổ, trái để tha (vẫn có nút).
- Lượt đêm động; người không chọn được vẫn hiện nhưng khoá kèm lý do (đồng bầy, không che liên tiếp, chính mình); tài nguyên Phù thủy và lịch bảo vệ được theo dõi. Vai trong bộ bài đã chết hoặc hết kỹ năng vẫn được nhắc "gọi giả" để quản trò không phải nhớ ai còn ai mất; lượt gọi giả không vào câu chuyện hay thống kê.
- Sáng → thảo luận → chọn người bị nghi ngờ nhất → thanh minh → làng quyết định treo cổ hoặc tha → đêm tiếp theo. Làng tự đếm phiếu ngoài bàn; app chỉ ghi kết quả. Tha hoặc không đưa ai lên thì sang đêm ngay.
- Hàng đợi phát súng Thợ săn; kiểm tra thắng sau khi xử lý hết trigger; quản trò xác nhận kết thúc.
- Undo giao dịch khi đang chơi. Nhật ký (timeline có đánh dấu thao tác đã hủy, replay chỉ đọc từng giao dịch) xem ở màn hình tổng kết cuối ván.
- Màn hình điều hành chỉ còn lượt hiện tại. Công tắc "Xem người chơi" trên thanh trên cùng mở sổ của quản trò, một chạm, không cần xác nhận, giữ nguyên khi refresh: cán cân Sói/người khác còn sống, từng ghế theo thứ tự ngồi với vai, dấu trong đêm (bị Sói nhắm, được bảo vệ, đã bị soi, được cứu, trúng độc), người đang thanh minh, bình Phù thủy, phát súng Thợ săn, người Bảo vệ không được che lại; người đã chết kèm nguyên nhân. Màn hình này chỉ dành cho quản trò, không có chế độ đưa cho người chơi xem.
- Tổng kết, lật toàn bộ bài, hồ sơ và câu chuyện từng người, thống kê, câu chuyện tiếng Việt và copy nội dung.
- Lịch sử nhiều ván, bản nháp wizard, khôi phục đúng lượt sau refresh, đóng tab hoặc khởi động lại trình duyệt.
- Art SVG nguyên bản, thẻ vai riêng, palette ngày/đêm, font Playfair Display và Be Vietnam Pro (đóng gói lúc build qua `next/font`, không tải từ Google khi chạy), nút lớn, reduced motion.

## Stack và kiến trúc

Next.js App Router (static export), React, TypeScript strict, Tailwind CSS 4 + CSS design tokens, Dexie/IndexedDB, Vitest, Playwright và axe-core. Lucide cung cấp các icon điều khiển; artwork vai và cảnh làng nằm trong repo, không tải ảnh bên ngoài.

```text
src/
  app/            Next shell, metadata, CSS design tokens
  components/     GameButton, RoleCard, PlayerToken, dialog, badges
  domain/         Models, event discriminated union, defaults
  engine/         Validated commands, transactions, dynamic actions, victory
  roles/          Registry, targeting, ability rules (không phụ thuộc React)
  events/         Effective log, pure reducer, replay, undo selection
  storage/        IndexedDB schema, optimistic concurrency, draft journal
  features/       Home, wizard, gameplay, NightTurn, Voting, PublicView,
                  Overview, Timeline, Replay, Summary
  statistics/     Metrics derived from effective events
  story/          Vietnamese factual templates and player stories
  lib/            Demo configuration, unbiased crypto shuffle
public/
  assets/roles/   Six original SVG role illustrations
  assets/scenes/  Original night/day village SVG
  assets/icons/   Card back and app icon source
  manifest.webmanifest
scripts/
  create-assets.mjs  Reproducible SVG and PNG assets
  build-sw.mjs       Hash and precache entire production export
 tests/           Engine, simulation, IndexedDB
 e2e/             Real browser flows, offline, restart, accessibility
 docs/            Audit and screenshots
```

UI phát command; engine xác thực và phát một hoặc nhiều event. UI chỉ nhận state mới sau khi IndexedDB ghi thành công. Các luật chọn mục tiêu, kết quả soi, bình thuốc, thắng và xử lý chết nằm ngoài React. Không có mutable global game state.

### Event sourcing và replay

Mỗi event có `id`, `gameId`, `transactionId`, `type`, `round`, `phase`, `actorIds`, `targetIds`, `timestamp` và payload phân biệt theo type. Thay đổi chuẩn bị dùng `SETUP_UPDATED` chứa cấu hình đã xác nhận; các thay đổi có thể chưa hợp lệ trong wizard được lưu như bản nháp riêng.

`replay(events)` dựng toàn bộ người chơi, phase, stage, round, night actions, người đang thanh minh, potion usage, lần bảo vệ trước, hàng đợi Thợ săn, giờ bắt đầu/kết thúc và kết quả. Không lưu một mutable state song song có nguy cơ lệch log. Envelope UUID/time tạo lúc nhận command; luật và reducer deterministic đối với cùng log.

Timeline giữ cả thao tác đã hủy. Story/statistics dùng **effective events**. Bộ phát lại đi qua ranh giới giao dịch, thể hiện state lịch sử trước/sau các Undo, không phát lệnh vào ván đang chơi.

### Undo

Mỗi command có một transaction ID. Ví dụ kết đêm phát event chặn đòn cắn, các event chết và `DAY_STARTED` trong **cùng giao dịch**. Undo append `ACTION_UNDONE` trỏ tới giao dịch reversible gần nhất; không xóa event cũ. Replay lọc những giao dịch này trước khi reduce.

Undo kết đêm khôi phục tất cả người chết, phase và trigger cùng lúc. Undo dùng bình khôi phục bình. Undo phát súng khôi phục nạn nhân và hàng đợi. Có thể Undo liên tiếp, Undo kết thúc ván, rồi rẽ sang một chuỗi hành động mới. `GAME_CREATED` là mốc không Undo; chưa có Redo.

### Night engine và death resolution

`getAvailableActions()` dùng role registry, ưu tiên gọi, người sống, tài nguyên và các action đã thực hiện. Bầy Sói có một lượt chung. Vai không có/đã chết bị bỏ qua; Phù thủy hết cả hai bình không được gọi. Thợ săn pending luôn được xử lý trước hành động bình thường.

Thứ tự mặc định: **Sói → Bảo vệ → Tiên tri → Phù thủy**. Sói chọn chưa làm nạn nhân chết. Khi kết đêm:

1. Xét Bảo vệ và cứu đối với đòn cắn; ghi rõ `WOLF_ATTACK_BLOCKED` nếu bị chặn.
2. Áp dụng Sói nếu không có phòng vệ/cứu.
3. Áp dụng độc, không bị Bảo vệ hoặc cứu chặn.
4. Mỗi người chỉ có một death record; thêm trigger từ registry.
5. Chuyển sang sáng, xử lý phát súng còn chờ rồi mới đánh giá thắng.

### Thêm vai mới

1. Thêm ID vào domain và definition trong `roles/registry.ts`.
2. Khai báo team, priority, canAct, target eligibility, resources, resolver và visibility; thêm luật thuần trong `roles/` khi cần.
3. Nếu có effect/resource/trigger hoàn toàn mới, mở rộng typed event và reducer/engine resolution bằng handler nhỏ. Registry không phải plugin runtime: type union là chủ ý để compiler chỉ ra mọi chỗ cần cập nhật.
4. Thêm SVG/path và accent trong design system; cập nhật UI hành động nếu cơ chế mới cần kiểu input mới.
5. Thêm tests cho tương tác, Undo, replay, narrative và statistics. Vai không có action cần ít thay đổi hơn vai có cơ chế mới.

## Persistence và riêng tư

Database `lang-trang-v1`, schema Dexie version 2:

- `games`: game metadata + schema version + revision + append-only events.
- `drafts`: cấu hình, bước wizard và bộ bài đang chỉnh.

Ghi game trong IndexedDB transaction, kiểm tra revision để từ chối ghi đè từ tab cũ. Khi báo xung đột, reload để đọc state mới nhất. IndexedDB là nguồn dữ liệu game; event log lưu cả active và completed games.

Wizard có bản sao write-ahead nhỏ trong localStorage để không mất một lần nhập nếu refresh xảy ra trước khi IndexedDB hoàn tất; sau đó được mirror vào `drafts`. Bản nháp chỉ tạo setup event khi quản trò xác nhận bước. sessionStorage chỉ lưu màn hình đang mở và trạng thái public; game không phụ thuộc sessionStorage.

Không gửi dữ liệu đi đâu. Đây là bảo vệ **hiển thị**, không phải mã hóa hay phân quyền: người có quyền DevTools/profile trình duyệt có thể đọc role. Xóa site data, chế độ riêng tư hoặc trình duyệt thu hồi storage có thể làm mất ván. Không có cloud backup/import/export trong MVP.

## PWA và offline

`next build` xuất app vào `out/`. `scripts/build-sw.mjs` đọc toàn bộ output, tính hash nội dung và sinh service worker với precache đầy đủ: root HTML, JS, CSS, manifest, icon, SVG và các static assets. Không dùng font CDN hoặc runtime image network.

Đợi nhãn **Sẵn sàng offline** sau lần tải online đầu tiên. Navigation dùng root HTML đã cache; assets dùng cache-first. Gameplay chỉ dùng IndexedDB và engine local. Test trình duyệt đã tắt mạng, reload, đóng tab và restart browser với profile cũ rồi tiếp tục lượt còn dang dở.

Service worker mới chờ các tab của phiên bản cũ đóng trước khi activate, tránh thay app giữa ván; cache cũ được dọn khi activate. Sau cập nhật, đóng mọi tab/PWA rồi mở lại để nhận bản mới. SW có `no-cache` header trên Vercel. Không dùng `skipWaiting` tự động.

Install yêu cầu HTTPS hoặc localhost và hỗ trợ từ browser. Chrome/Edge: menu Cài ứng dụng; Safari iOS: Chia sẻ → Thêm vào màn hình chính. Nút cài riêng xuất hiện khi browser cung cấp `beforeinstallprompt`. Native install trên thiết bị iOS/Android thật chưa được kiểm thử ở môi trường này.

Safari có thể không cung cấp `crypto.randomUUID()` trên địa chỉ HTTP trong mạng nội bộ. `src/lib/id.ts` dùng `crypto.getRandomValues()` để tạo UUID v4 khi đó, nên việc tạo game/người chơi/event vẫn chạy. Đã kiểm tra thực tế trên HTTP LAN với `isSecureContext === false` và `randomUUID === undefined`. PWA service worker vẫn cần HTTPS hoặc localhost; để cài và chơi offline trên điện thoại, hãy dùng URL HTTPS.

Tham khảo chính thức: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [static export](https://nextjs.org/docs/app/guides/static-exports).

## Luật được chọn cho MVP

| Luật | Mặc định |
|---|---|
| Bảo vệ chọn cùng người liên tiếp | Không (`canProtectSamePlayerConsecutively: false`) |
| Bảo vệ tự bảo vệ | Có |
| Phù thủy tự cứu | Có (`canHealSelf: true`) |
| Phù thủy dùng hai bình cùng đêm | Không (`canUseBothPotionsSameNight: false`) |
| Mục tiêu độc | Bất cứ người đang sống, kể cả chính Phù thủy |
| Tiên tri | Người sống khác bản thân; chỉ kết quả Sói/không phải Sói |
| Gọi đủ vai mỗi đêm | Có (`callAllRolesEachNight: true`); vai không có trong bộ bài không bao giờ được gọi |
| Sói nhắm đồng đội | Không |
| Không chọn mục tiêu | Có thể bỏ qua, có xác nhận và nhật ký |
| Thợ săn bị treo cổ | Được bắn (`hunterShootsWhenExecuted: true`) |
| Thợ săn trúng độc | Được bắn (`hunterShootsWhenPoisoned: true`) |
| Thợ săn bị Sói cắn | Luôn được bắn; quyết định bắn/bỏ qua phải xử lý |
| Sói con | Thức cùng bầy, Tiên tri soi ra Sói; chết vì bất kỳ lý do nào thì đêm kế tiếp bầy Sói cắn hai người khác nhau. Phù thủy chọn cứu một trong hai |
| Chán đời | Phe thứ ba; bị làng treo cổ thì thắng một mình và ván kết thúc. Chết cách khác không thắng |
| Sói và độc cùng người | Chỉ chết một lần; Sói ưu tiên cause nếu không bị chặn |
| Bảo vệ và cứu cùng mục tiêu | Mục tiêu tránh đòn Sói; bình cứu vẫn bị tiêu thụ |
| Số vai đặc biệt | Tối đa một người mỗi vai; nhiều Ma Sói/Dân thường; cần ít nhất một Ma Sói |
| Xử án ban ngày | Tối đa một người lên thanh minh mỗi ngày; làng quyết định treo cổ hoặc tha |
| Thắng | Dân khi không còn Sói; Sói khi số Sói >= số người khác; chờ hết trigger |

Nếu tất cả chết, không còn Sói nên Dân thắng theo điều kiện mặc định. Chán đời bị treo cổ được xét thắng trước mọi điều kiện khác. Không có luật hòa.

Ván ghi phiếu từng người từ phiên bản trước vẫn phát lại và xem lại được; nếu đang dừng ở bước bỏ phiếu cũ, quản trò tiếp tục bằng bước chọn người bị nghi ngờ.

## Kiểm chứng

- **67 tests Vitest**: các luật bắt buộc, chết đồng thời, độc xuyên defense, cả hai potion, không tái dùng, cấu hình guard/self-heal, vai chết, queue, parity + Hunter, Undo theo batch, replay, tính bất biến, Sói con, Chán đời, cài đặt Thợ săn, xử án ban ngày, gọi giả, ván cũ ghi phiếu, IndexedDB và UUID fallback.
- **10 tests Playwright trên Chromium**: wizard và ván hai đêm đến victory; ván có Sói con/Chán đời; gọi giả Tiên tri đã chết; vuốt để xoá ván; ván mới cùng người chơi; chia vai bằng tay và giữ khi reload; vuốt phán quyết; role reveal, story và history; reload/offline; sổ người chơi; bản nháp reload tức thời; restart browser; layout 360/390/430/768/1280; manifest; keyboard, axe WCAG A/AA (bỏ qua rule `meta-viewport` vì cố ý tắt zoom), khoá zoom hai ngón và giả lập thiếu `randomUUID`.
- Không dùng snapshot UI như bằng chứng logic. Không tuyên bố accessibility đầy đủ chỉ từ axe/screenshots.
- GitHub Actions chạy install, tests, lint, build và browser tests.
- Xem [báo cáo audit](docs/AUDIT.md).

## Deploy Vercel

Repo có `vercel.json` dùng `npm run build`, output `out`, header cho service worker. Không cần environment variables hoặc database server.

```bash
npx vercel login
npx vercel --prod
```

Lần đầu chọn scope/account và tạo/link project, có thể đặt tên `lang-trang`. Những lần sau chỉ cần `npx vercel --prod`. Hoặc import Git repository trong Vercel, dùng cấu hình đã có và deploy. Có thể deploy `out/` lên bất kỳ static hosting hỗ trợ HTTPS.

Việc triển khai thực tế và quyền môi trường được ghi trong `docs/DEPLOYMENT.md`; không xem build local là bằng chứng đã deploy.

## Hạn chế đã biết

- Bộ sáu vai, một người mỗi vai đặc biệt; chưa có vai tương tác phức tạp hoặc luật vùng miền khác.
- Không có Redo, backup JSON, sync, xóa ván hoặc nhiều quản trò chỉnh đồng thời. Revision guard ngăn ghi đè nhưng không tự merge.
- Chưa kiểm tra native PWA install trên điện thoại thật và trợ năng bằng screen reader thật. Browser automation chạy trên Chromium; WebKit Playwright dành cho macOS hiện tại không khởi tạo được page vì lỗi giao thức `PushAPIEnabled`, nên chưa xác nhận bằng Safari thật.
- Tên mới đang gõ nhưng chưa bấm Thêm chưa phải một player. Các player đã thêm, tên đã sửa, bộ vai và bước wizard được lưu.
- Chuyện kể deterministic, cố ý factual; không có AI văn chương. Với ván cũ ghi phiếu từng người, phiếu đã sửa vẫn hiện trong nhật ký và thống kê chỉ tính lá phiếu cuối cùng từng người từng ngày.
- Event log được replay đầy đủ trong bộ nhớ, phù hợp ván tabletop thông thường; chưa có snapshot/compaction cho hàng chục nghìn event.
- Public view không phải security boundary chống người có quyền đọc máy; completed summary cố ý reveal toàn bộ vai.

## Sau MVP

1. Export/import JSON có kiểm tra schema để sao lưu và chuyển thiết bị.
2. Kiểm thử thực địa iOS/Android, VoiceOver/TalkBack và thao tác một tay tại bàn chơi.
3. Preset luật vùng miền và role packs có test tương tác.
4. Đồng hồ thảo luận tùy chọn, rõ ràng và không tự chuyển pha.
5. Biên tập story thành các đoạn kể ngắn hơn và bản in biên niên sử.
