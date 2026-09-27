# Deployment status — 27/09/2026

Production artifact đã build thành công bằng `npm run build`: static export trong `out/`, kèm generated service worker. Toàn bộ artifact khoảng 1 MB; artwork local khoảng 40 KB.

Kiểm tra môi trường:

- Không có Vercel CLI cài global; `npx --yes vercel whoami` chạy được CLI **60.1.3**.
- CLI trả **Logged out** (exit code 1): không có phiên xác thực Vercel dùng được.
- Repository chưa có `.vercel/project.json`, chưa link project.
- Vì thiếu authentication, chưa thể kiểm tra quyền tạo project/team và **chưa tạo production deployment hoặc Production URL**.
- Không tạo temporary anonymous deployment thay cho production.

Từ repository này:

```bash
npx vercel login
npx vercel --prod
```

Chọn account/team có quyền và tạo hoặc link project, tên gợi ý `lang-trang`. `vercel.json` đã có build command, output directory và các header cần thiết. Không cần biến môi trường, backend hay database server.

Redeploy sau khi đã link:

```bash
npx vercel --prod
```

Sau deploy, mở URL, đợi “Sẵn sàng offline”, mở ván mẫu và thử tắt mạng + reload. Lần cập nhật tiếp theo: đóng tất cả tab/PWA cũ để service worker mới activate.
