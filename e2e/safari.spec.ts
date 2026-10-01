import { expect, test } from "@playwright/test";

test("UUID fallback supports Safari without crypto.randomUUID", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/");
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");

  await page.getByRole("button", { name: "Tạo ván mới" }).click();
  await expect(
    page.getByRole("heading", { name: "Dựng một ngôi làng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Ghế 1: Người 1" }).click();
  await page.getByLabel("Tên người ngồi ghế 1").fill("Người thử Safari");
  await expect(
    page.getByRole("button", { name: "Ghế 1: Người thử Safari" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Trang chủ" }).click();
  await page.getByRole("button", { name: "Mở ván mẫu" }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chọn Bình", exact: true }).click();
  await page.getByRole("button", { name: "Cắn Bình", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
});
