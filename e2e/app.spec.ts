import { expect, test, type Locator, type Page } from "@playwright/test";
// Tap a seat at the round table, then confirm in the middle of the table.
async function act(page: Page, verb: string, name: string) {
  await page.getByRole("button", { name: `Chọn ${name}`, exact: true }).click();
  await page
    .getByRole("button", { name: `${verb} ${name}`, exact: true })
    .click();
}
async function poison(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Chọn ${name} để đầu độc`, exact: true })
    .click();
  await page
    .getByRole("button", { name: `Đầu độc ${name}`, exact: true })
    .click();
}
// The seer's card turns over in the middle of the table; "Xong" records it.
async function see(page: Page, name: string, result?: string) {
  await page.getByRole("button", { name: `Soi ${name}`, exact: true }).click();
  if (result) await expect(page.getByRole("status")).toContainText(result);
  await page.getByRole("button", { name: "Xong", exact: true }).click();
}
async function accuse(page: Page, name: string) {
  await page.getByRole("button", { name: "Bắt đầu thảo luận" }).click();
  await page.getByRole("button", { name: `Chọn ${name}`, exact: true }).click();
  await page
    .getByRole("button", { name: `Mời ${name} lên thanh minh`, exact: true })
    .click();
}
async function hang(page: Page, suspect: string) {
  await accuse(page, suspect);
  await page.getByRole("button", { name: "Treo cổ", exact: true }).click();
}
// Name the placeholder seats around the table, clockwise from seat 1.
async function nameSeats(page: Page, names: string[]) {
  for (const [i, name] of names.entries()) {
    await page
      .getByRole("button", { name: `Ghế ${i + 1}: Người ${i + 1}` })
      .click();
    await page.getByLabel(`Tên người ngồi ghế ${i + 1}`).fill(name);
  }
}
// Deal role cards to the seats in table order.
async function deal(page: Page, roleNames: string[]) {
  for (const role of roleNames)
    await page
      .getByRole("button", { name: `Chia ${role}`, exact: true })
      .click();
}
async function tap(page: Page, labels: string[]) {
  for (const label of labels)
    await page.getByRole("button", { name: label, exact: true }).click();
}
// Entrance animations fade content in; check colours once they have finished.
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
}
async function inspectSize(page: Page, name: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: `docs/screenshots/${name}-${width}.png`,
    fullPage: true,
  });
}
test("wizard, full two-night game, replay, summaries and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Tạo ván mới" })).toBeVisible();
  await inspectSize(page, "01-home", 390);
  await page.getByRole("button", { name: "Tạo ván mới" }).click();
  await page.getByLabel("Tên ván chơi").fill("Làng kiểm chứng");
  // A new table has 8 seats by default.
  await expect(page.locator("output")).toHaveText("8");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await nameSeats(page, [
    "An",
    "Bình",
    "Cường",
    "Dũng",
    "Hà",
    "Lan",
    "Minh",
    "Phúc",
  ]);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  // The app picked a balanced deck by the printed points (sum 0).
  await expect(page.locator(".balance-meter")).toContainText("Cân bằng");
  await expect(page.getByText("Đủ 8 lá cho 8 người.")).toBeVisible();
  await tap(page, [
    "Bớt Sói con",
    "Thêm Sói",
    "Bớt Dân làng",
    "Thêm Người bảo vệ",
    "Bớt Dân làng",
    "Thêm Phù thủy",
  ]);
  await expect(page.getByText("Đủ 8 lá cho 8 người.")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  // Nobody holds a card until the moderator deals one.
  await expect(page.getByText("Đã chia 0 / 8 lá")).toBeVisible();
  await deal(page, [
    "Sói",
    "Sói",
    "Tiên tri",
    "Người bảo vệ",
    "Phù thủy",
    "Thợ săn",
    "Dân làng",
    "Dân làng",
  ]);
  await expect(
    page.getByRole("button", { name: "Chia Sói", exact: true }),
  ).toBeDisabled();
  // Cường and Dũng swap: take Cường's card back, deal him the guard.
  await page.getByRole("button", { name: "Cường: Tiên tri" }).click();
  await page.getByRole("button", { name: "Trả lá", exact: true }).click();
  // A quick double tap on a dealt seat returns the card too.
  await page.getByRole("button", { name: "Dũng: Người bảo vệ" }).dblclick();
  await expect(
    page.getByRole("button", { name: "Dũng: chưa có vai" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Đã chia 6 / 8 lá")).toBeVisible();
  await page.getByRole("button", { name: "Cường: chưa có vai" }).click();
  await deal(page, ["Người bảo vệ", "Tiên tri"]);
  await expect(
    page.getByRole("button", { name: "Dũng: Tiên tri" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Lật hết", exact: true }).click();
  await expect(page.getByRole("button", { name: "An: Sói" })).toBeVisible();
  await inspectSize(page, "02-review", 390);
  await page.getByRole("button", { name: "Bắt đầu đêm 1" }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 1", exact: true }),
  ).toBeVisible();
  await inspectSize(page, "03-night", 390);
  await expect(
    page.getByRole("button", { name: "An, Đồng bầy" }),
  ).toBeDisabled();
  await act(page, "Cắn", "Minh");
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bầy Sói chọn ai?" }),
  ).toBeVisible();
  await act(page, "Cắn", "Minh");
  await act(page, "Che", "Minh");
  await see(page, "An", "An là Sói");
  await page.getByRole("button", { name: "Giữ lại bình thuốc" }).click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  await expect(
    page.getByText("Đêm qua không ai chết.", { exact: true }),
  ).toBeVisible();
  await inspectSize(page, "04-morning", 390);
  await page.getByRole("switch", { name: "Xem người chơi" }).click();
  await expect(page.locator(".ledger .seat")).toHaveCount(8);
  await expect(
    page.locator(".seat", { hasText: "Dũng" }).getByText("Tiên tri"),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Xem người chơi" }),
  ).toHaveAttribute("aria-checked", "true");
  // One tap goes back to the moderator screen, no confirmation.
  await page.getByRole("switch", { name: "Xem người chơi" }).click();
  await expect(page.locator(".secret-badge")).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu thảo luận" }).click();
  await expect(
    page.getByRole("heading", { name: "Làng nghi ai nhất?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chọn An", exact: true }).click();
  await page
    .getByRole("button", { name: "Mời An lên thanh minh", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "An thanh minh." }),
  ).toBeVisible();
  await inspectSize(page, "08-trial", 360);
  await page.setViewportSize({ width: 390, height: 900 });
  // A short drag springs back; a long one to the right hangs.
  await drag(page, page.locator(".verdict-card"), 60);
  await expect(
    page.getByRole("heading", { name: "An thanh minh." }),
  ).toBeVisible();
  await drag(page, page.locator(".verdict-card"), 160);
  await expect(page.getByText("An đã bị treo cổ.")).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu đêm 2" }).click();
  await act(page, "Cắn", "Phúc");
  await expect(
    page.getByRole("button", { name: "Minh, Không che liên tiếp" }),
  ).toBeDisabled();
  await act(page, "Che", "Cường");
  await see(page, "Bình");
  await poison(page, "Bình");
  await page.getByRole("button", { name: "Xác nhận dùng thuốc" }).click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  await expect(
    page.getByRole("heading", { name: "Phe Dân đạt điều kiện thắng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kết thúc & lật bài" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bình minh thuộc về Dân." }),
  ).toBeVisible();
  await expect(page.locator(".story-text")).toContainText(
    "Bình (Sói) chết vì bình độc",
  );
  await expect(page.locator(".story-text")).toContainText(
    "Phúc (Dân làng) chết vì sói tấn công",
  );
  await inspectSize(page, "05-ending", 390);
  await page.getByRole("button", { name: "Thống kê", exact: true }).click();
  await expect(page.getByText("Lượt bảo vệ trúng mục tiêu Sói")).toBeVisible();
  await page.getByRole("button", { name: "Lật bài", exact: true }).click();
  await expect(page.locator(".reveal-seat")).toHaveCount(8);
  await inspectSize(page, "09-reveal", 390);
  await page.getByRole("button", { name: "Nhật ký", exact: true }).click();
  await expect(page.getByText("ĐÃ HOÀN TÁC · không còn hiệu lực")).toHaveCount(
    1,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Bình minh thuộc về Dân." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ván mới với những người này" })
    .click();
  await expect(page.getByLabel("Tên ván chơi")).toHaveValue(/^Làng Trăng · /);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ghế 8: Phúc" })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByText("Đủ 8 lá cho 8 người.")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  // The old roles are not dealt again by default.
  await expect(page.getByText("Đã chia 0 / 8 lá")).toBeVisible();
  await page.getByRole("button", { name: "Trang chủ", exact: true }).click();
  await expect(page.locator(".game-entry")).toHaveCount(1);
  await expect(page.locator(".history-entry")).toContainText("Làng kiểm chứng");
  await swipeLeft(page, page.locator(".swipe-line").first());
  await page.getByRole("button", { name: "Xoá ván Làng kiểm chứng" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xoá ván" })
    .click();
  await expect(page.locator(".history-entry")).toHaveCount(0);
  await expect(errors).toEqual([]);
});
test("offline reload, closed tab restore, public privacy and responsive layouts", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Sẵn sàng offline", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mở ván mẫu" }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 1", exact: true }),
  ).toBeVisible();
  for (const width of [360, 390, 430, 768, 1280])
    await inspectSize(page, "06-gameplay", width);
  await page.setViewportSize({ width: 390, height: 844 });
  await act(page, "Cắn", "Bình");
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await act(page, "Che", "Bình");
  await page.getByRole("switch", { name: "Xem người chơi" }).click();
  await expect(
    page.locator(".seat", { hasText: "Bình" }).getByText("Được bảo vệ"),
  ).toBeVisible();
  await inspectSize(page, "07-roster", 390);
  await page.reload();
  await expect(page.locator(".ledger")).toBeVisible();
  await page.getByRole("switch", { name: "Xem người chơi" }).click();
  await expect(page.locator(".ledger")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Tiên tri soi ai?" }),
  ).toBeVisible();
  const next = await context.newPage();
  await page.close();
  await next.goto("/");
  await next.locator(".game-entry").click();
  await expect(
    next.getByRole("heading", { name: "Tiên tri soi ai?" }),
  ).toBeVisible();
  await see(next, "An");
  await expect(
    next.getByRole("heading", { name: "Phù thủy", exact: true }),
  ).toBeVisible();
  const images = await next
    .locator("img")
    .evaluateAll((imgs) =>
      imgs.every(
        (img) =>
          (img as HTMLImageElement).complete &&
          (img as HTMLImageElement).naturalWidth > 0,
      ),
    );
  expect(images).toBe(true);
});
test("roles are dealt by hand, kept on reload, and names stay unique", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ván mới" }).click();
  await tap(page, Array(4).fill("Bớt một người"));
  await expect(page.locator("output")).toHaveText("4");
  await expect(
    page.getByRole("button", { name: "Bớt một người" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await nameSeats(page, ["A", "B", "C", "D"]);
  await page.getByLabel("Tên người ngồi ghế 4").fill("A");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "không được trùng",
  );
  await page.getByLabel("Tên người ngồi ghế 4").fill("D");
  // Seats can move around the table.
  await page
    .getByRole("button", { name: "Dời D theo chiều kim đồng hồ" })
    .click();
  await expect(page.getByRole("button", { name: "Ghế 1: D" })).toBeVisible();
  await page
    .getByRole("button", { name: "Dời D ngược chiều kim đồng hồ" })
    .click();
  await expect(page.getByRole("button", { name: "Ghế 4: D" })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  // 4 players: Sói, Phù thủy, 2 Dân làng (6 = 4 + 2). Tap to add, minus to remove.
  await page.getByRole("button", { name: "Bớt Phù thủy", exact: true }).click();
  await expect(page.getByText("Còn thiếu 1 lá.")).toBeVisible();
  await page
    .getByRole("button", { name: "Thêm Phù thủy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Thêm Phù thủy", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "Còn 4 người chưa có lá.",
  );
  await deal(page, ["Dân làng", "Sói", "Dân làng"]);
  await expect(
    page.getByRole("button", { name: "Chia Dân làng", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByText("Đã chia 3 / 4 lá")).toBeVisible();
  await expect(page.getByRole("button", { name: "B: Sói" })).toBeVisible();
  // The next empty seat is picked again after the reload.
  await expect(
    page.getByRole("button", { name: "D: chưa có vai" }),
  ).toHaveAttribute("aria-pressed", "true");
  await deal(page, ["Phù thủy"]);
  await page.getByRole("button", { name: "Úp lá đã chia" }).click();
  await expect(
    page.getByRole("button", { name: "B: đã có vai" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Lật lá của B" }).click();
  await expect(page.getByRole("button", { name: "B: Sói" })).toBeVisible();
});

test("keyboard access, install manifest and automated accessibility", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Tạo ván mới" })).toBeVisible();
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toHaveLength(3);
  // Pinch and double-tap zoom stay off.
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /maximum-scale=1, user-scalable=no/,
  );
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).touchAction,
    ),
  ).toBe("pan-x pan-y");
  expect(
    await page.evaluate(() => {
      const e = new WheelEvent("wheel", { ctrlKey: true, cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    }),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveClass("brand");
  await settled(page);
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    // Zoom is disabled on purpose at the moderator's request.
    .disableRules(["meta-viewport"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("button", { name: "Mở ván mẫu" }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 1", exact: true }),
  ).toBeVisible();
  await settled(page);
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    // Zoom is disabled on purpose at the moderator's request.
    .disableRules(["meta-viewport"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("switch", { name: "Xem người chơi" }).click();
  await settled(page);
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    // Zoom is disabled on purpose at the moderator's request.
    .disableRules(["meta-viewport"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("unfinished player list survives refresh before Next", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ván mới" }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await nameSeats(page, ["Tên được lưu"]);
  await expect(
    page.getByRole("button", { name: "Ghế 1: Tên được lưu" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Ghế 1: Tên được lưu" }),
  ).toBeVisible();
});

test("browser restart retains IndexedDB and cached app shell offline", async () => {
  const { chromium } = await import("@playwright/test");
  const { mkdtemp, mkdir, rm } = await import("node:fs/promises");
  await mkdir("test-results", { recursive: true });
  const profile = await mkdtemp("test-results/restart-profile-");
  let context = await chromium.launchPersistentContext(profile, {
    headless: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3000");
    await expect(
      page.getByText("Sẵn sàng offline", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mở ván mẫu" }).click();
    await act(page, "Cắn", "Bình");
    await expect(
      page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
    ).toBeVisible();
    await context.close();
    context = await chromium.launchPersistentContext(profile, {
      headless: true,
      offline: true,
    });
    const restored = await context.newPage();
    await restored.goto("http://localhost:3000");
    await restored.locator(".game-entry").click();
    await expect(
      restored.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
    ).toBeVisible();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
async function swipeLeft(page: Page, row: Locator) {
  await row.scrollIntoViewIfNeeded();
  const box = (await row.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 20, y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step++)
    await page.mouse.move(box.x + box.width - 20 - step * 25, y);
  await page.mouse.up();
}
test("swipe left reveals delete for an active game", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ván mới" }).click();
  await expect(page.getByLabel("Tên ván chơi")).toBeVisible();
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  const rows = page.locator(".swipe-row"),
    remove = page.getByRole("button", { name: /^Xoá ván / });
  await expect(rows).toHaveCount(1);
  await expect(remove).toHaveCSS("opacity", "0");
  await swipeLeft(page, rows.first());
  await expect(remove).toHaveCSS("opacity", "1");
  // The swipe must not open the game, and a tap on the opened row closes it.
  await expect(page.getByText("Chưa có ngôi làng nào thức giấc.")).toBeHidden();
  await page.locator(".game-entry").click();
  await expect(remove).toHaveCSS("opacity", "0");
  await expect(rows).toHaveCount(1);
  await swipeLeft(page, rows.first());
  await remove.click();
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(rows).toHaveCount(1);
  await expect(remove).toHaveCSS("opacity", "0");
  await swipeLeft(page, rows.first());
  await remove.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xoá ván" })
    .click();
  await expect(rows).toHaveCount(0);
  await expect(
    page.getByText("Chưa có ngôi làng nào thức giấc."),
  ).toBeVisible();
  await page.reload();
  await expect(rows).toHaveCount(0);
});
test("Sói con enrages the pack and the witch picks whom to save", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ván mới" }).click();
  await page.getByLabel("Tên ván chơi").fill("Làng vai mới");
  await page.getByRole("button", { name: "Bớt một người" }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await nameSeats(page, ["An", "Bình", "Cường", "Dũng", "Hà", "Lan", "Minh"]);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await tap(page, [
    "Bớt Sói",
    "Thêm Sói con",
    "Bớt Người bảo vệ",
    "Thêm Tiên tri",
    "Bớt Thợ săn",
    "Thêm Kẻ chán đời",
  ]);
  await expect(page.getByText("Đủ 7 lá cho 7 người.")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await deal(page, [
    "Sói",
    "Sói con",
    "Tiên tri",
    "Phù thủy",
    "Dân làng",
    "Dân làng",
    "Kẻ chán đời",
  ]);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu đêm 1" }).click();
  await expect(
    page.getByRole("button", { name: "Bình, Đồng bầy" }),
  ).toBeDisabled();
  await act(page, "Cắn", "Hà");
  await see(page, "Bình", "Bình là Sói");
  await poison(page, "Bình");
  await page.getByRole("button", { name: "Xác nhận dùng thuốc" }).click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  // Sparing the suspect skips the verdict screen and goes straight to night.
  await accuse(page, "Lan");
  await page.getByRole("button", { name: "Tha", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 2", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Lượt cắn 1/2")).toBeVisible();
  await act(page, "Cắn", "Cường");
  await expect(
    page.getByRole("heading", { name: "Bầy Sói chọn người thứ hai?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cường, Đã bị cắn" }),
  ).toBeDisabled();
  await act(page, "Cắn", "Minh");
  await see(page, "An");
  await expect(page.locator(".rt-victim")).toHaveText([/Cường/, /Minh/]);
  await page.getByRole("button", { name: "Cứu Cường", exact: true }).click();
  await expect(page.locator(".rt-victim").first()).toContainText("Được cứu");
  await page.getByRole("button", { name: "Xác nhận dùng thuốc" }).click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  await hang(page, "An");
  await expect(
    page.getByRole("heading", { name: "Phe Dân đạt điều kiện thắng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kết thúc & lật bài" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  const story = page.locator(".story-text");
  await expect(story).toContainText("Bầy Sói nổi giận");
  await expect(story).toContainText("Minh (Kẻ chán đời) chết vì sói tấn công");
  await expect(story).toContainText("Dũng dùng bình cứu cho Cường");
});
test("a dead Tiên tri is still called, as a pretend call", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở ván mẫu" }).click();
  // Ván mẫu: An/Phúc Sói, Cường Tiên tri, Dũng Người bảo vệ, Lan Phù thủy.
  await act(page, "Cắn", "Cường");
  await act(page, "Che", "Bình");
  await see(page, "An");
  await page.getByRole("button", { name: "Giữ lại bình thuốc" }).click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  await page.getByRole("button", { name: "Bắt đầu thảo luận" }).click();
  await page
    .getByRole("button", { name: "Không đưa ai lên, sang đêm" })
    .click();
  await act(page, "Cắn", "Hà");
  // The roster shows tonight's marks, the dead with their cause, and the
  // switch goes straight back to the current call.
  const toggle = page.getByRole("switch", { name: "Xem người chơi" });
  await toggle.click();
  await expect(
    page.locator(".seat", { hasText: "Hà" }).getByText("Bị Sói nhắm"),
  ).toBeVisible();
  await expect(page.locator(".ledger-dead .seat")).toContainText(
    "Sói tấn công, đêm 1",
  );
  await toggle.click();
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await act(page, "Che", "Dũng");
  await expect(page.locator(".fake-call img")).toHaveAttribute(
    "src",
    /seer\.webp$/,
  );
  await expect(page.locator(".round-table")).toHaveCount(0);
  await inspectSize(page, "10-fake-call", 390);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Phù thủy", exact: true }),
  ).toBeVisible();
});
async function drag(page: Page, target: Locator, dx: number) {
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++)
    await page.mouse.move(x + (dx * step) / 8, y);
  await page.mouse.up();
}
test("tapping a button gives a short vibration", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    Object.defineProperty(window, "__buzz", { value: calls });
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: unknown) => {
        calls.push(pattern);
        return true;
      },
    });
  });
  await page.goto("/");
  const buzzes = () =>
    page.evaluate(() => (window as unknown as { __buzz: unknown[] }).__buzz);
  await page.getByRole("heading", { name: /Những ngọn đèn/ }).click();
  expect(await buzzes()).toEqual([]);
  await page.getByRole("button", { name: "Bộ bài của làng" }).click();
  await expect.poll(buzzes).toEqual([10]);
});
test("without the Vibration API, a tap flips the hidden iOS haptic switch", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "vibrate", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/");
  const haptic = page.locator("[data-haptic] input[switch]");
  await expect(haptic).toHaveCount(1);
  await expect(haptic).not.toBeChecked();
  await page.getByRole("heading", { name: /Những ngọn đèn/ }).click();
  await expect(haptic).not.toBeChecked();
  await page.getByRole("button", { name: "Bộ bài của làng" }).click();
  // Exactly one flip per tap, not a loop from the switch's own click.
  await expect(haptic).toBeChecked();
  await page.getByRole("button", { name: "Về trang chủ" }).click();
  await expect(haptic).not.toBeChecked();
});
