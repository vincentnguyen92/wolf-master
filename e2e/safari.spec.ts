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
    page.getByRole("heading", { name: "Dựng một ngôi làng." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page
    .getByLabel("Tên người chơi", { exact: true })
    .fill("Người thử Safari");
  await page.getByRole("button", { name: "Thêm người chơi" }).click();
  await expect(page.getByLabel("Tên người chơi 1")).toHaveValue(
    "Người thử Safari",
  );

  await page.getByRole("button", { name: "Trang chủ" }).click();
  await page.getByRole("button", { name: "Mở ván mẫu" }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 1", exact: true }),
  ).toBeVisible();
  await page
    .locator(".card-grid")
    .getByRole("button", { name: "Bình", exact: true })
    .click();
  await page.getByRole("button", { name: "Cắn Bình", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
});
