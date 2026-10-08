---
name: verify
description: Chạy đủ các bước kiểm tra như CI (test, lint, build, e2e) trước khi push.
disable-model-invocation: true
---

Chạy lần lượt, dừng ở bước đầu tiên thất bại:

1. `npm test`
2. `npm run lint`
3. `npm run build`
4. `npm run test:e2e`. Nếu cổng 3000 đang bị dev server chiếm, báo người dùng tắt nó (Playwright cần serve bản build, service worker chỉ có ở production).

Bước nào lỗi: đọc output, tìm nguyên nhân, đề xuất cách sửa. Chỉ tự sửa khi người dùng đồng ý. Cuối cùng báo ngắn từng bước pass/fail. Nếu $ARGUMENTS là `quick`, chỉ chạy bước 1–2.
