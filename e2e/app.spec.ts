import { expect, test, type Locator, type Page } from "@playwright/test";
const panel = (page: Page) => page.locator(".action-panel");
const pick = async (page: Page, name: string) => {
  await panel(page)
    .getByRole("button", { name: new RegExp(`^${name} Còn sống`) })
    .click();
};
const confirm = async (page: Page) => {
  await page.getByRole("button", { name: "Xác nhận & tiếp tục" }).click();
};
async function hang(page: Page, suspect: string) {
  await page.getByRole("button", { name: "Bắt đầu thảo luận" }).click();
  await pick(page, suspect);
  await page.getByRole("button", { name: "Mời lên thanh minh" }).click();
  await page.getByRole("button", { name: "Treo cổ", exact: true }).click();
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
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  for (const name of [
    "An",
    "Bình",
    "Cường",
    "Dũng",
    "Hà",
    "Lan",
    "Minh",
    "Phúc",
  ]) {
    await page.getByLabel("Tên người chơi", { exact: true }).fill(name);
    await page
      .getByRole("button", { name: "Thêm người chơi", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByText("8 / 8 lá bài")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  // Default deck: An/Bình wolves, Cường guard, Dũng seer, Hà witch, Lan hunter, Minh/Phúc villagers.
  await page.getByLabel("Vai của Cường", { exact: true }).selectOption("seer");
  await expect(page.getByLabel("Vai của Dũng", { exact: true })).toHaveValue(
    "guard",
  );
  await page.getByLabel("Vai của Cường", { exact: true }).selectOption("guard");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Mở bảng vai bí mật" }).click();
  await inspectSize(page, "02-review", 390);
  await page.getByRole("button", { name: "Bắt đầu đêm 1" }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 1", exact: true }),
  ).toBeVisible();
  await inspectSize(page, "03-night", 390);
  await pick(page, "Minh");
  await confirm(page);
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bầy Sói chọn ai?" }),
  ).toBeVisible();
  await pick(page, "Minh");
  await confirm(page);
  await pick(page, "Minh");
  await confirm(page);
  await pick(page, "An");
  await page.getByRole("button", { name: "Xem kết quả" }).click();
  await expect(page.locator(".seer-result")).toContainText("MA SÓI");
  await confirm(page);
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
    page.getByRole("heading", { name: "Làng ơi, cùng tìm sự thật." }),
  ).toBeVisible();
  await pick(page, "An");
  await page.getByRole("button", { name: "Mời lên thanh minh" }).click();
  await expect(
    page.getByRole("heading", { name: "An thanh minh." }),
  ).toBeVisible();
  await inspectSize(page, "08-trial", 360);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Treo cổ", exact: true }).click();
  await expect(page.getByText("An đã bị treo cổ.")).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu đêm 2" }).click();
  await pick(page, "Phúc");
  await confirm(page);
  await expect(
    panel(page).getByRole("button", { name: /^Minh Còn sống/ }),
  ).toHaveCount(0);
  await pick(page, "Cường");
  await confirm(page);
  await pick(page, "Bình");
  await page.getByRole("button", { name: "Xem kết quả" }).click();
  await confirm(page);
  await pick(page, "Bình");
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
    "Bình (Ma Sói) chết vì bình độc",
  );
  await expect(page.locator(".story-text")).toContainText(
    "Phúc (Dân thường) chết vì sói tấn công",
  );
  await inspectSize(page, "05-ending", 390);
  await page.getByRole("button", { name: "Thống kê", exact: true }).click();
  await expect(page.getByText("Lượt bảo vệ trúng mục tiêu Sói")).toBeVisible();
  await page.getByRole("button", { name: "Lật bài", exact: true }).click();
  await expect(page.locator(".player-profile")).toHaveCount(8);
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
  await expect(page.getByText("8 người · tối thiểu 4")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByText("8 / 8 lá bài")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByLabel("Vai của Phúc", { exact: true })).toBeVisible();
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
  await pick(page, "Bình");
  await confirm(page);
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Đêm nay, bảo vệ ai?" }),
  ).toBeVisible();
  await pick(page, "Bình");
  await confirm(page);
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
    page.getByRole("heading", { name: "Chọn một người để soi" }),
  ).toBeVisible();
  const next = await context.newPage();
  await page.close();
  await next.goto("/");
  await next.locator(".game-entry").click();
  await expect(
    next.getByRole("heading", { name: "Chọn một người để soi" }),
  ).toBeVisible();
  await pick(next, "An");
  await next.getByRole("button", { name: "Xem kết quả" }).click();
  await confirm(next);
  await expect(
    next.getByRole("heading", { name: "Hai bình thuốc. Một quyết định." }),
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
test("random assignment preserves deck and duplicate names are rejected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ván mới" }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  for (const name of ["A", "B", "C", "D"]) {
    await page.getByLabel("Tên người chơi", { exact: true }).fill(name);
    await page
      .getByRole("button", { name: "Thêm người chơi", exact: true })
      .click();
  }
  await page.getByLabel("Tên người chơi", { exact: true }).fill("A");
  await page
    .getByRole("button", { name: "Thêm người chơi", exact: true })
    .click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "Tên này đã có",
  );
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.locator(".assignment-list select")).toHaveCount(4);
  const before = await page
    .locator(".assignment-list select")
    .evaluateAll((items) =>
      items.map((e) => (e as HTMLSelectElement).value).sort(),
    );
  await page.getByRole("button", { name: "Xáo vai ngẫu nhiên" }).click();
  const after = await page
    .locator(".assignment-list select")
    .evaluateAll((items) =>
      items.map((e) => (e as HTMLSelectElement).value).sort(),
    );
  expect(after).toEqual(before);
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
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    // Zoom is disabled on purpose at the moderator's request.
    .disableRules(["meta-viewport"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("switch", { name: "Xem người chơi" }).click();
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
  await page.getByLabel("Tên người chơi", { exact: true }).fill("Tên được lưu");
  await page
    .getByRole("button", { name: "Thêm người chơi", exact: true })
    .click();
  await expect(
    page.getByLabel("Tên người chơi 1", { exact: true }),
  ).toHaveValue("Tên được lưu");
  await page.reload();
  await expect(
    page.getByLabel("Tên người chơi 1", { exact: true }),
  ).toHaveValue("Tên được lưu");
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
    await pick(page, "Bình");
    await confirm(page);
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
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  for (const name of ["An", "Bình", "Cường", "Dũng", "Hà", "Lan", "Minh"]) {
    await page.getByLabel("Tên người chơi", { exact: true }).fill(name);
    await page
      .getByRole("button", { name: "Thêm người chơi", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  for (const label of [
    "Giảm Ma Sói",
    "Thêm Sói con",
    "Giảm Bảo vệ",
    "Thêm Phù thủy",
    "Giảm Dân thường",
    "Thêm Chán đời",
  ])
    await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByText("2 Sói · 4 Dân · 1 Chán đời")).toBeVisible();
  // Role settings only list roles that are in the deck.
  await expect(page.getByRole("group", { name: "Phù thủy" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Thợ săn" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Bảo vệ" })).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  // Deck order: An Ma Sói, Bình Sói con, Cường Tiên tri, Dũng Phù thủy,
  // Hà/Lan Dân thường, Minh Chán đời.
  await expect(page.getByLabel("Vai của Bình", { exact: true })).toHaveValue(
    "wolf_cub",
  );
  await expect(page.getByLabel("Vai của Minh", { exact: true })).toHaveValue(
    "tanner",
  );
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu đêm 1" }).click();
  await pick(page, "Hà");
  await confirm(page);
  await pick(page, "Bình");
  await page.getByRole("button", { name: "Xem kết quả" }).click();
  await expect(page.locator(".seer-result")).toContainText("MA SÓI");
  await confirm(page);
  await pick(page, "Bình");
  await page.getByRole("button", { name: "Xác nhận dùng thuốc" }).click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  // Sparing the suspect skips the verdict screen and goes straight to night.
  await page.getByRole("button", { name: "Bắt đầu thảo luận" }).click();
  await pick(page, "Lan");
  await page.getByRole("button", { name: "Mời lên thanh minh" }).click();
  await page.getByRole("button", { name: "Tha", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đêm 2", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Lượt cắn 1/2")).toBeVisible();
  await pick(page, "Cường");
  await confirm(page);
  await expect(
    page.getByRole("heading", { name: "Bầy Sói chọn người thứ hai?" }),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("button", { name: /^Cường Còn sống/ }),
  ).toHaveCount(0);
  await pick(page, "Minh");
  await confirm(page);
  await pick(page, "An");
  await page.getByRole("button", { name: "Xem kết quả" }).click();
  await confirm(page);
  await expect(page.locator(".wolf-victim")).toContainText("Cường · Minh");
  await page.getByLabel("Dùng bình cứu").check();
  const save = page.getByRole("button", { name: "Xác nhận dùng thuốc" });
  await expect(save).toBeDisabled();
  await page.getByRole("radio", { name: "Cường" }).check();
  await save.click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  await hang(page, "An");
  await expect(
    page.getByRole("heading", { name: "Phe Dân đạt điều kiện thắng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kết thúc & lật bài" }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  const story = page.locator(".story-text");
  await expect(story).toContainText("Bầy Sói nổi giận");
  await expect(story).toContainText("Minh (Chán đời) chết vì sói tấn công");
  await expect(story).toContainText("Dũng dùng bình cứu cho Cường");
});
test("a dead Tiên tri is still called, as a pretend call", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở ván mẫu" }).click();
  // Ván mẫu: An/Phúc Ma Sói, Cường Tiên tri, Dũng Bảo vệ, Lan Phù thủy.
  await pick(page, "Cường");
  await confirm(page);
  await pick(page, "Bình");
  await confirm(page);
  await pick(page, "An");
  await page.getByRole("button", { name: "Xem kết quả" }).click();
  await confirm(page);
  await page.getByRole("button", { name: "Giữ lại bình thuốc" }).click();
  await page.getByRole("button", { name: "Gọi làng thức dậy" }).click();
  await page.getByRole("button", { name: "Bắt đầu thảo luận" }).click();
  await page.getByRole("button", { name: "Không đưa ai lên" }).click();
  await pick(page, "Hà");
  await confirm(page);
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
  await pick(page, "Dũng");
  await confirm(page);
  await expect(page.locator(".fake-call")).toContainText("Tiên tri");
  await expect(panel(page)).toHaveCount(0);
  await inspectSize(page, "10-fake-call", 390);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hai bình thuốc. Một quyết định." }),
  ).toBeVisible();
});
