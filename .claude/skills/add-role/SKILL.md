---
name: add-role
description: Thêm một lá bài còn thiếu (Tiên tri tập sự, Người cứng cỏi, Người phù phép, Nhân bản, Thần tình yêu, Kẻ phản bội, Pháp sư, Bị nguyền) thành vai chơi được trong app.
disable-model-invocation: true
argument-hint: <card id, ví dụ apprentice_seer>
---

Thêm vai cho lá bài `$ARGUMENTS`. Các lá chưa có luật nằm trong `CardId` ở `src/roles/cards.ts` (lá không có trường `role`). Ảnh `public/assets/cards/<id>.webp` đã có sẵn.

## 1. Chốt luật trước khi viết code

Đọc định nghĩa lá trong `src/roles/cards.ts` (tên, điểm in trên lá, nhóm). Viết ra luật dự định: phe, có hành động đêm không, thứ tự gọi so với Sói (10) và các vai khác trong `nightPriority`, tài nguyên, trigger khi chết, ảnh hưởng tới Tiên tri/thắng thua, house rule nào nên thành công tắc trong `GameSettings`. **Hỏi người dùng xác nhận luật** (luật Ma Sói mỗi làng một khác) rồi mới làm tiếp.

## 2. Domain

- `src/domain/types.ts`: thêm id vào `RoleId`. Có hành động đêm thì thêm vào `NightKind`. Có trigger mới thì mở rộng `deathTrigger`. House rule thêm vào `GameSettings` và `defaultSettings`.

Chạy `npx tsc --noEmit`: lỗi exhaustiveness chỉ ra các chỗ còn thiếu.

## 3. Luật (TypeScript thuần, không React)

- `src/roles/registry.ts`: định nghĩa vai: `name`, `points` (đúng như trên lá), `team`, `description` (tiếng Việt), `nightPriority`, `hasNightAction`, `motif`, `resources`, `canAct`, `getEligibleTargets`, `resolveAction`.
- Luật phức tạp đặt thành hàm thuần trong `src/roles/abilities.ts`.
- `src/roles/cards.ts`: gắn `role: "<id>"` và `rules` cho các công tắc của lá.
- `src/storage/deck.ts`: thêm vào `defaultDeckPrefs()` (`auto` có chọn tự động khi cân bộ bài không, `max`).
- `src/engine/engine.ts`: thêm vào danh sách vai đặc biệt tối đa một người nếu cần; xử lý kết đêm hoặc command mới nếu cơ chế mới.
- `src/events/replay.ts`: event hoặc tài nguyên mới phải được reducer dựng lại đúng, kể cả khi undo.
- `src/engine/selectors.ts`: điều kiện thắng nếu vai ảnh hưởng.

## 4. Hiển thị

- `src/app/globals.css`: thêm `.role-<id> { --accent: … }` cạnh các vai khác.
- `src/features/NightTurn.tsx`: nếu cần kiểu chọn mới (hai mục tiêu, có/không…).
- `src/features/Roster.tsx`: trạng thái riêng của vai trong sổ quản trò.
- `src/story/narrative.ts` và `src/statistics/statistics.ts`: câu chuyện tiếng Việt và số liệu cho hành động mới.

## 5. Test

Trong `tests/roles.test.ts` (dùng helper `start`, `act`, bàn `table` có sẵn), viết test cho: hành động đêm và mục tiêu bị khoá, tương tác với Bảo vệ/Phù thủy/Sói, undo rồi replay ra đúng state, điều kiện thắng, câu chuyện. Cập nhật `tests/balance.test.ts` và `tests/storage.test.ts` nếu bộ bài mặc định đổi.

## 6. Kiểm tra

Chạy `npm test` và `npm run lint`. Nhờ agent `rules-reviewer` soát diff. Mở app (Playwright MCP) chơi thử một ván có vai mới. Cập nhật danh sách vai trong README.md (đoạn "App chơi được N vai").
