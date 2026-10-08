@AGENTS.md

# Làng Trăng

Sổ tay quản trò Ma Sói: PWA mobile-first, chạy offline, một thiết bị cho quản trò. Không backend, không tài khoản, không biến môi trường. README.md là tài liệu đầy đủ; dưới đây là những điều cần nhớ khi sửa code.

## Lệnh

```bash
npm run dev        # dev server :3000 (service worker KHÔNG chạy ở dev)
npm test           # Vitest: engine, vai, balance, IndexedDB (fake-indexeddb)
npm run lint       # ESLint + tsc --noEmit
npm run build      # static export ra out/ + sinh service worker
npm run test:e2e   # Playwright trên bản build (cần build trước)
npm run cards      # nén bản quét trong cards/ thành public/assets/cards/*.webp
```

CI (`.github/workflows/checks.yml`) chạy đúng thứ tự: test → lint → build → e2e. Dùng `/verify` để chạy y hệt trước khi push.

## Kiến trúc

- `src/domain/` kiểu dữ liệu, `RoleId`, event union, `defaultSettings`.
- `src/engine/` command → event, kiểm tra hợp lệ, kết đêm, điều kiện thắng (`selectors.ts`).
- `src/events/replay.ts` reducer thuần dựng state từ event log; undo = append `ACTION_UNDONE`, không bao giờ xoá event.
- `src/roles/` registry, luật chọn mục tiêu, `cards.ts` (bộ bài thật 16 lá).
- `src/features/` các màn hình React; `src/components/` UI dùng chung.
- `src/storage/` Dexie/IndexedDB, bản nháp wizard, cài đặt bộ bài.
- `src/story/`, `src/statistics/` suy ra từ effective events.

## Quy ước

- `domain/`, `engine/`, `events/`, `roles/`, `story/`, `statistics/` là TypeScript thuần, **không import React**. Mọi luật chơi nằm ở đây, không nằm trong component.
- State game chỉ đến từ `replay(events)`; không thêm state song song có thể lệch log. Logic phải deterministic với cùng một log.
- Mọi chữ hiển thị cho người dùng và câu chuyện viết bằng **tiếng Việt**. Comment trong code bằng tiếng Anh, ngắn.
- Điểm trên lá bài (`points`) in trên lá thật: không tự đổi.
- Thêm vai mới: dùng `/add-role`. Union type là chủ ý để `tsc` chỉ ra mọi chỗ cần cập nhật.
- Sửa luật trong `engine/` hoặc `roles/`: nhờ agent `rules-reviewer` soát lại.
- Không sửa `cards/` (bản quét gốc, không commit), `out/`, `.next/`, `package-lock.json` (hook sẽ chặn).
- Prettier mặc định, hook tự format sau mỗi lần sửa.
- Kiểm tra giao diện thật: Playwright MCP (giả lập iPhone) trên `npm run dev` hoặc `npm start` sau khi build.
