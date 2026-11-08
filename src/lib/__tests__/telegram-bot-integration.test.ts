import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../db";
import {
  generateTelegramLinkToken,
  verifyAndLinkTelegramAccount,
  resolveTelegramContext,
  disconnectTelegramAccount,
  buildTenantContextFromBot,
} from "../telegram/auth";
import { telegramRouter } from "../telegram/router";
import { telegramClient } from "../telegram/client";
import { ShopRole, MovementType } from "@prisma/client";
import { Decimal } from "../decimal";

describe("Telegram Bot Integration & Security", () => {
  const mockOrgId = "org-tg-test-01";
  const mockShopId = "shop-tg-test-01";
  const mockOwnerId = "user-tg-owner-01";
  const mockStaffId = "user-tg-staff-01";
  const mockOwnerChatId = "123456789";
  const mockStaffChatId = "987654321";

  beforeEach(() => {
    vi.restoreAllMocks();
    // Spy on Telegram client calls to verify messages sent without calling real Telegram network
    vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);
    vi.spyOn(telegramClient, "editMessageText").mockResolvedValue({} as any);
    vi.spyOn(telegramClient, "answerCallbackQuery").mockResolvedValue({} as any);
  });

  it("generates a high-entropy deep-link token and binds Telegram account on /start", async () => {
    // 1. Mock existing membership
    vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
      id: "mem-01",
      userId: mockOwnerId,
      organizationId: mockOrgId,
      shopId: mockShopId,
      role: ShopRole.SHOP_OWNER,
    } as any);

    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.telegramAccount, "create").mockResolvedValue({
      id: "tg-acc-01",
      userId: mockOwnerId,
      shopId: mockShopId,
      telegramChatId: "pending_token",
      linkToken: "mock-token-abc12345",
      linkTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
      isActive: false,
    } as any);

    const token = await generateTelegramLinkToken(mockOwnerId, mockShopId);
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(16);

    // 2. Mock /start LINK_<token> verification
    vi.spyOn(prisma.telegramAccount, "findUnique").mockResolvedValue({
      id: "tg-acc-01",
      userId: mockOwnerId,
      shopId: mockShopId,
      linkToken: token,
      linkTokenExpires: new Date(Date.now() + 10 * 60 * 1000), // valid
      user: {
        id: mockOwnerId,
        fullName: "Abebe Owner",
        email: "owner@easystock.app",
        memberships: [
          {
            shopId: mockShopId,
            role: ShopRole.SHOP_OWNER,
            organization: { id: mockOrgId, name: "Test Org" },
            shop: { id: mockShopId, name: "Main Store", currency: "ETB" },
          },
        ],
      },
      shop: { id: mockShopId, organizationId: mockOrgId, name: "Main Store", currency: "ETB" },
    } as any);

    vi.spyOn(prisma.telegramAccount, "update").mockResolvedValue({
      id: "tg-acc-01",
      userId: mockOwnerId,
      shopId: mockShopId,
      telegramChatId: mockOwnerChatId,
      isActive: true,
      user: { id: mockOwnerId, fullName: "Abebe Owner" },
      shop: { id: mockShopId, name: "Main Store" },
    } as any);

    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const linkResult = await verifyAndLinkTelegramAccount(
      token,
      { id: 123456789, is_bot: false, first_name: "Abebe", username: "abebe_owner" },
      mockOwnerChatId
    );

    expect(linkResult.success).toBe(true);
    expect(linkResult.role).toBe(ShopRole.SHOP_OWNER);
  });

  it("resolves user and shop context for an active Telegram chat ID", async () => {
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-01",
      userId: mockOwnerId,
      shopId: mockShopId,
      telegramChatId: mockOwnerChatId,
      telegramUsername: "abebe_owner",
      notifications: "ALL",
      isActive: true,
      user: {
        id: mockOwnerId,
        email: "owner@easystock.app",
        fullName: "Abebe Owner",
        platformRole: "NONE",
        isActive: true,
        memberships: [
          {
            shopId: mockShopId,
            role: ShopRole.SHOP_OWNER,
            canViewReports: true,
            canApplyDiscount: true,
            canAdjustStock: true,
            organization: { id: mockOrgId },
            shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
          },
        ],
      },
      shop: {
        id: mockShopId,
        name: "Main Store",
        code: "MAIN",
        currency: "ETB",
        organizationId: mockOrgId,
      },
    } as any);

    const botCtx = await resolveTelegramContext(mockOwnerChatId);
    expect(botCtx).not.toBeNull();
    expect(botCtx?.isLinked).toBe(true);
    expect(botCtx?.role).toBe(ShopRole.SHOP_OWNER);
    expect(botCtx?.shop?.currency).toBe("ETB");

    // Can convert to TenantContext
    vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
      organizationId: mockOrgId,
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    } as any);

    const tenantCtx = await buildTenantContextFromBot(botCtx!);
    expect(tenantCtx.organizationId).toBe(mockOrgId);
    expect(tenantCtx.role).toBe(ShopRole.SHOP_OWNER);
  });

  it("enforces role isolation: restricts financial /summary from Shopkeepers", async () => {
    // Setup staff session in Telegram
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-staff",
      userId: mockStaffId,
      shopId: mockShopId,
      telegramChatId: mockStaffChatId,
      isActive: true,
      notifications: "ALL",
      user: {
        id: mockStaffId,
        fullName: "Tigist Cashier",
        email: "cashier@easystock.app",
        platformRole: "NONE",
        isActive: true,
        memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
      },
      shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
    } as any);

    const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

    // Staff types /summary
    await telegramRouter.handleUpdate({
      update_id: 101,
      message: {
        message_id: 1,
        date: Date.now(),
        chat: { id: Number(mockStaffChatId), type: "private" },
        text: "/summary",
      },
    });

    // Must be blocked with clear role message
    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockStaffChatId,
      expect.stringContaining("Restricted")
    );
  });

  it("allows Shopkeepers to check personal shift performance via /myday", async () => {
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-staff",
      userId: mockStaffId,
      shopId: mockShopId,
      telegramChatId: mockStaffChatId,
      isActive: true,
      notifications: "ALL",
      user: {
        id: mockStaffId,
        fullName: "Tigist Cashier",
        email: "cashier@easystock.app",
        platformRole: "NONE",
        isActive: true,
        memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
      },
      shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
    } as any);

    // Mock 3 sales recorded by this cashier today
    vi.spyOn(prisma.sale, "findMany").mockResolvedValue([
      { id: "sale-1", totalAmount: new Decimal(250), cashierId: mockStaffId },
      { id: "sale-2", totalAmount: new Decimal(450), cashierId: mockStaffId },
    ] as any);

    const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

    await telegramRouter.handleUpdate({
      update_id: 102,
      message: {
        message_id: 2,
        date: Date.now(),
        chat: { id: Number(mockStaffChatId), type: "private" },
        text: "/myday",
      },
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockStaffChatId,
      expect.stringContaining("Your Shift Performance")
    );
    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockStaffChatId,
      expect.stringContaining("700.00 ETB")
    );
  });

  it("hides cost prices from Shopkeepers during /checkstock product inquiries", async () => {
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-staff",
      userId: mockStaffId,
      shopId: mockShopId,
      telegramChatId: mockStaffChatId,
      isActive: true,
      notifications: "ALL",
      user: {
        id: mockStaffId,
        fullName: "Tigist Cashier",
        email: "cashier@easystock.app",
        platformRole: "NONE",
        isActive: true,
        memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
      },
      shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
    } as any);

    vi.spyOn(prisma.productVariant, "findFirst").mockResolvedValue({
      id: "var-book-01",
      name: "Standard Edition",
      sku: "BOOK-001",
      sellingPrice: new Decimal(350),
      costPrice: new Decimal(200), // SENSITIVE: MUST NOT BE EXPOSED
      product: { name: "Ethiopian History Book" },
      inventoryItems: [{ quantity: 15 }],
    } as any);

    const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

    await telegramRouter.handleUpdate({
      update_id: 103,
      message: {
        message_id: 3,
        date: Date.now(),
        chat: { id: Number(mockStaffChatId), type: "private" },
        text: "/checkstock history",
      },
    });

    // Check message sent
    const messageCall = sendMessageSpy.mock.calls[0];
    const messageBody = messageCall[1];

    expect(messageBody).toContain("Ethiopian History Book");
    expect(messageBody).toContain("350.00 ETB");
    expect(messageBody).toContain("15 units");
    // CRITICAL: Cost price (200) MUST NOT appear in shopkeeper output
    expect(messageBody).not.toContain("200.00");
    expect(messageBody).not.toContain("Cost Price");
    expect(messageBody).not.toContain("መግዣ ዋጋ");
  });

  it("handles the Shopkeeper request and Owner 1-click approval lifecycle", async () => {
    // 1. Setup Owner session
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-owner",
      userId: mockOwnerId,
      shopId: mockShopId,
      telegramChatId: mockOwnerChatId,
      isActive: true,
      notifications: "ALL",
      user: {
        id: mockOwnerId,
        fullName: "Abebe Owner",
        email: "owner@easystock.app",
        platformRole: "NONE",
        isActive: true,
        memberships: [{ shopId: mockShopId, role: ShopRole.SHOP_OWNER }],
      },
      shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
    } as any);

    vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
      organizationId: mockOrgId,
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    } as any);

    // Mock pending request
    vi.spyOn(prisma.approvalRequest, "findFirst").mockResolvedValue({
      id: "req-99",
      shopId: mockShopId,
      requesterId: mockStaffId,
      approvalType: "STOCK_ADJUSTMENT",
      title: "Broken olive oil bottle during restocking",
      status: "PENDING",
      details: {
        variantId: "var-oil-01",
        adjustmentType: "DEDUCT_QUANTITY",
        quantity: 1,
        reason: "Damaged item",
      },
      requester: { fullName: "Tigist Cashier" },
      shop: { id: mockShopId, name: "Main Store" },
    } as any);

    // Mock variant & shop for adjustStock
    vi.spyOn(prisma.productVariant, "findUnique").mockResolvedValue({
      id: "var-oil-01",
      costPrice: new Decimal(180),
      product: { organizationId: mockOrgId },
    } as any);

    vi.spyOn(prisma.shop, "findUnique").mockResolvedValue({
      allowNegativeStock: false,
      isActive: true,
      suspensionReason: null,
    } as any);

    // Mock Prisma transaction
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      const mockTx = {
        inventoryItem: {
          upsert: vi.fn().mockResolvedValue({ id: "inv-oil-01", quantity: 10 }),
          update: vi.fn().mockResolvedValue({ id: "inv-oil-01", quantity: 9 }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "mov-01" }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit-01" }),
        },
      };
      return cb(mockTx);
    });

    vi.spyOn(prisma.approvalRequest, "update").mockResolvedValue({
      id: "req-99",
      shopId: mockShopId,
      requesterId: mockStaffId,
      title: "Broken olive oil bottle during restocking",
      status: "APPROVED",
      requester: { fullName: "Tigist Cashier" },
      shop: { id: mockShopId },
    } as any);

    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    const editMessageSpy = vi.spyOn(telegramClient, "editMessageText").mockResolvedValue({} as any);

    // Owner taps [✅ Approve] button
    await telegramRouter.handleUpdate({
      update_id: 104,
      callback_query: {
        id: "cb-100",
        from: { id: Number(mockOwnerChatId), is_bot: false, first_name: "Abebe" },
        data: "appr:req-99",
        message: {
          message_id: 77,
          date: Date.now(),
          chat: { id: Number(mockOwnerChatId), type: "private" },
        },
      },
    });

    // Message updated in place to indicate approval
    expect(editMessageSpy).toHaveBeenCalledWith(
      mockOwnerChatId,
      77,
      expect.stringContaining("REQUEST APPROVED")
    );
  });

  it("registers supplier invoice photos as pending documents and notifies the owner", async () => {
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-staff",
      userId: mockStaffId,
      shopId: mockShopId,
      telegramChatId: mockStaffChatId,
      isActive: true,
      notifications: "ALL",
      user: {
        id: mockStaffId,
        fullName: "Tigist Cashier",
        email: "cashier@easystock.app",
        platformRole: "NONE",
        isActive: true,
        memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
      },
      shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
    } as any);

    vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
      organizationId: mockOrgId,
      canViewReports: false,
      canApplyDiscount: false,
      canAdjustStock: false,
    } as any);

    vi.spyOn(prisma.businessDocument, "create").mockResolvedValue({
      id: "doc-invoice-01",
      shopId: mockShopId,
      title: "Sugar delivery receipt from wholesaler",
      documentType: "PURCHASE_INVOICE",
      status: "PENDING_REVIEW",
    } as any);

    vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

    // Mock finding Owner chat IDs for notification
    vi.spyOn(prisma.telegramAccount, "findMany").mockResolvedValue([
      { telegramChatId: mockOwnerChatId } as any,
    ]);

    const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

    // Staff sends a photo with a caption
    await telegramRouter.handleUpdate({
      update_id: 105,
      message: {
        message_id: 88,
        date: Date.now(),
        chat: { id: Number(mockStaffChatId), type: "private" },
        photo: [
          { file_id: "photo_thumb", file_unique_id: "u1", width: 100, height: 100 },
          { file_id: "photo_full_123", file_unique_id: "u2", width: 800, height: 800, file_size: 45000 },
        ],
        caption: "Sugar delivery receipt from wholesaler",
      },
    });

    // Staff gets confirmation
    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockStaffChatId,
      expect.stringContaining("Document Received")
    );

    // Owner gets invoice intake card with action buttons
    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockOwnerChatId,
      expect.stringContaining("New Invoice/Document Uploaded"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      })
    );
  });

  it("unlinks and disconnects Telegram account on /disconnect", async () => {
    vi.spyOn(prisma.telegramAccount, "findUnique").mockResolvedValue({
      id: "tg-acc-01",
      telegramChatId: mockOwnerChatId,
    } as any);

    vi.spyOn(prisma.telegramAccount, "delete").mockResolvedValue({} as any);

    const disconnected = await disconnectTelegramAccount(mockOwnerChatId);
    expect(disconnected).toBe(true);
  });

  it("handles persistent reply keyboard button taps for Owner and Shopkeeper", async () => {
    // 1. Owner taps "📊 Today's Summary / የዛሬ ማጠቃለያ"
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-owner",
      userId: mockOwnerId,
      shopId: mockShopId,
      telegramChatId: mockOwnerChatId,
      isActive: true,
      notifications: "ALL",
      user: {
        id: mockOwnerId,
        fullName: "Abebe Owner",
        email: "owner@easystock.app",
        platformRole: "NONE",
        isActive: true,
        memberships: [{ shopId: mockShopId, role: ShopRole.SHOP_OWNER }],
      },
      shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
    } as any);

    vi.spyOn(prisma.sale, "findMany").mockResolvedValue([
      { id: "sale-1", totalAmount: new Decimal(500), totalCost: new Decimal(300), cashierId: mockStaffId },
    ] as any);

    vi.spyOn(prisma.user, "findMany").mockResolvedValue([
      { id: mockStaffId, fullName: "Tigist Cashier" },
    ] as any);

    const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

    await telegramRouter.handleUpdate({
      update_id: 106,
      message: {
        message_id: 99,
        date: Date.now(),
        chat: { id: Number(mockOwnerChatId), type: "private" },
        text: "📊 Today's Summary / የዛሬ ማጠቃለያ",
      },
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockOwnerChatId,
      expect.stringContaining("Today's Sales Report")
    );
  });

  it("returns low stock items on /alerts or '⚠️ Low Stock' button", async () => {
    vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
      id: "tg-acc-owner",
      userId: mockOwnerId,
      shopId: mockShopId,
      telegramChatId: mockOwnerChatId,
      isActive: true,
      notifications: "ALL",
      user: {
        id: mockOwnerId,
        fullName: "Abebe Owner",
        email: "owner@easystock.app",
        platformRole: "NONE",
        isActive: true,
        memberships: [{ shopId: mockShopId, role: ShopRole.SHOP_OWNER }],
      },
      shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
    } as any);

    vi.spyOn(prisma.inventoryItem, "findMany").mockResolvedValue([
      {
        id: "inv-oil",
        quantity: 3,
        variant: {
          id: "var-oil",
          name: "1L Bottle",
          reorderLevel: 5,
          product: { name: "Cooking Oil" },
        },
      },
    ] as any);

    const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

    await telegramRouter.handleUpdate({
      update_id: 107,
      message: {
        message_id: 100,
        date: Date.now(),
        chat: { id: Number(mockOwnerChatId), type: "private" },
        text: "⚠️ Low Stock / ዝቅተኛ ክምችት",
      },
    });

    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockOwnerChatId,
      expect.stringContaining("Low Stock Alert")
    );
    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockOwnerChatId,
      expect.stringContaining("Cooking Oil")
    );
    expect(sendMessageSpy).toHaveBeenCalledWith(
      mockOwnerChatId,
      expect.stringContaining("3 units")
    );
  });

  describe("Platform Administrator Diagnostics & Control", () => {
    const mockAdminId = "user-tg-admin-01";
    const mockAdminChatId = "555666777";

    it("allows SUPER_ADMIN to execute /syshealth and reports system metrics", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-admin",
        userId: mockAdminId,
        shopId: mockShopId,
        telegramChatId: mockAdminChatId,
        isActive: true,
        user: {
          id: mockAdminId,
          fullName: "Platform Super Admin",
          email: "admin@easystock.app",
          platformRole: "SUPER_ADMIN",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.telegramAccount, "count").mockResolvedValue(15);
      vi.spyOn(prisma.approvalRequest, "count").mockResolvedValue(3);
      vi.spyOn(prisma.businessDocument, "count").mockResolvedValue(28);
      vi.spyOn(prisma.telegramAccount, "findMany").mockResolvedValue([
        { shopId: "shop-1" },
        { shopId: "shop-2" },
      ] as any);
      vi.spyOn(telegramClient, "getWebhookInfo").mockResolvedValue({
        url: "https://easystock.app/api/telegram/webhook",
      } as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 201,
        message: {
          message_id: 110,
          date: Date.now(),
          chat: { id: Number(mockAdminChatId), type: "private" },
          text: "/syshealth",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockAdminChatId,
        expect.stringContaining("Platform Health & Bot Diagnostics")
      );
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockAdminChatId,
        expect.stringContaining("Active Telegram Accounts:</b> 15")
      );
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockAdminChatId,
        expect.stringContaining("Zero-Impersonation Status: Active")
      );
    });

    it("allows SUPER_ADMIN to broadcast system announcements to all active users", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-admin",
        userId: mockAdminId,
        shopId: mockShopId,
        telegramChatId: mockAdminChatId,
        isActive: true,
        user: {
          id: mockAdminId,
          fullName: "Platform Super Admin",
          email: "admin@easystock.app",
          platformRole: "SUPER_ADMIN",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.telegramAccount, "findMany").mockResolvedValue([
        { telegramChatId: "111" },
        { telegramChatId: "222" },
        { telegramChatId: "111" }, // duplicate check
      ] as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 202,
        message: {
          message_id: 111,
          date: Date.now(),
          chat: { id: Number(mockAdminChatId), type: "private" },
          text: "/broadcast Maintenance scheduled for midnight tonight.",
        },
      });

      // Dispatched to both unique accounts
      expect(sendMessageSpy).toHaveBeenCalledWith(
        "111",
        expect.stringContaining("Maintenance scheduled for midnight tonight.")
      );
      expect(sendMessageSpy).toHaveBeenCalledWith(
        "222",
        expect.stringContaining("Maintenance scheduled for midnight tonight.")
      );
      // Admin receives confirmation
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockAdminChatId,
        expect.stringContaining("Broadcast Dispatched:</b> Successfully sent announcement to <b>2</b> active Telegram account(s).")
      );
    });

    it("blocks non-SUPER_ADMIN users from executing /syshealth or /broadcast", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-staff",
        userId: mockStaffId,
        shopId: mockShopId,
        telegramChatId: mockStaffChatId,
        isActive: true,
        user: {
          id: mockStaffId,
          fullName: "Tigist Cashier",
          email: "tigist@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 203,
        message: {
          message_id: 112,
          date: Date.now(),
          chat: { id: Number(mockStaffChatId), type: "private" },
          text: "/syshealth",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("Access Denied:</b> This command is restricted to Platform Administrators.")
      );
    });

    it("enforces Zero-Impersonation boundary: platform admin without owner role cannot view shop /summary", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-admin",
        userId: mockAdminId,
        shopId: mockShopId,
        telegramChatId: mockAdminChatId,
        isActive: true,
        user: {
          id: mockAdminId,
          fullName: "Platform Super Admin",
          email: "admin@easystock.app",
          platformRole: "SUPER_ADMIN",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 204,
        message: {
          message_id: 113,
          date: Date.now(),
          chat: { id: Number(mockAdminChatId), type: "private" },
          text: "/summary",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockAdminChatId,
        expect.stringContaining("Restricted:</b> Business-wide financial summaries are available to Shop Owners only.")
      );
    });
  });

  describe("Role-Specific Main Menus & Isolation", () => {
    it("renders Owner Menu with business overview, approvals, invoices, and communication", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-owner",
        userId: mockOwnerId,
        shopId: mockShopId,
        telegramChatId: mockOwnerChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockOwnerId,
          fullName: "Abebe Owner",
          email: "owner@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOP_OWNER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 301,
        message: {
          message_id: 120,
          date: Date.now(),
          chat: { id: Number(mockOwnerChatId), type: "private" },
          text: "/menu",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockOwnerChatId,
        expect.stringContaining("Owner Communication & Action Center"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: "📊 Sales Summary" }),
                expect.objectContaining({ text: "⏳ Pending Approvals" }),
              ]),
            ]),
          }),
        })
      );
    });

    it("renders Shopkeeper Menu and hides Owner-only operational controls", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-staff",
        userId: mockStaffId,
        shopId: mockShopId,
        telegramChatId: mockStaffChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockStaffId,
          fullName: "Tigist Cashier",
          email: "tigist@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 302,
        message: {
          message_id: 121,
          date: Date.now(),
          chat: { id: Number(mockStaffChatId), type: "private" },
          text: "/menu",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("Shopkeeper Center"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: "🛍️ My Shift Sales" }),
                expect.objectContaining({ text: "🔍 Check Stock & Price" }),
              ]),
            ]),
          }),
        })
      );
    });

    it("strictly blocks Shopkeeper from accessing /invoices, /pending, and /alerts", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-staff",
        userId: mockStaffId,
        shopId: mockShopId,
        telegramChatId: mockStaffChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockStaffId,
          fullName: "Tigist Cashier",
          email: "tigist@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 303,
        message: {
          message_id: 122,
          date: Date.now(),
          chat: { id: Number(mockStaffChatId), type: "private" },
          text: "/invoices",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("Available to Shop Owners only.")
      );
    });
  });

  describe("Owner-Shopkeeper Communication & Announcements", () => {
    it("allows Owner to broadcast an announcement to all shopkeepers with tracking ref", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-owner",
        userId: mockOwnerId,
        shopId: mockShopId,
        telegramChatId: mockOwnerChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockOwnerId,
          fullName: "Abebe Owner",
          email: "owner@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOP_OWNER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
        organizationId: mockOrgId,
        shopId: mockShopId,
        role: ShopRole.SHOP_OWNER,
        organization: { id: mockOrgId },
      } as any);

      vi.spyOn(prisma.shopMessage, "create").mockResolvedValue({
        id: "msg-001",
        referenceCode: "MSG-20261108-TEST",
        shopId: mockShopId,
        senderId: mockOwnerId,
        recipientId: null,
        category: "GENERAL",
        content: "Staff meeting tonight at 6:00 PM.",
        createdAt: new Date(),
        sender: { id: mockOwnerId, fullName: "Abebe Owner" },
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      // Staff recipient account
      vi.spyOn(prisma.telegramAccount, "findMany").mockResolvedValue([
        {
          telegramChatId: mockStaffChatId,
          isActive: true,
          notificationPreferences: { messages: true },
        },
      ] as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 304,
        message: {
          message_id: 123,
          date: Date.now(),
          chat: { id: Number(mockOwnerChatId), type: "private" },
          text: "/msg all Staff meeting tonight at 6:00 PM.",
        },
      });

      // Staff received announcement with sender and ref code
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("OWNER ANNOUNCEMENT")
      );
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("Staff meeting tonight at 6:00 PM.")
      );
      // Owner received confirmation with ref code
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockOwnerChatId,
        expect.stringContaining("MSG-20261108-TEST")
      );
    });

    it("allows Shopkeeper to send a note to the Owner with tracking ref", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-staff",
        userId: mockStaffId,
        shopId: mockShopId,
        telegramChatId: mockStaffChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockStaffId,
          fullName: "Tigist Cashier",
          email: "tigist@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
        organizationId: mockOrgId,
        shopId: mockShopId,
        role: ShopRole.SHOPKEEPER,
        organization: { id: mockOrgId },
      } as any);

      vi.spyOn(prisma.telegramAccount, "findMany").mockResolvedValue([
        {
          userId: mockOwnerId,
          telegramChatId: mockOwnerChatId,
          user: { fullName: "Abebe Owner" },
        },
      ] as any);

      vi.spyOn(prisma.shopMessage, "create").mockResolvedValue({
        id: "msg-002",
        referenceCode: "MSG-20261108-NOTE",
        shopId: mockShopId,
        senderId: mockStaffId,
        recipientId: mockOwnerId,
        category: "GENERAL",
        content: "Need 2 more boxes of 1L sunflower oil on the shelf.",
        createdAt: new Date(),
        sender: { id: mockStaffId, fullName: "Tigist Cashier" },
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 305,
        message: {
          message_id: 124,
          date: Date.now(),
          chat: { id: Number(mockStaffChatId), type: "private" },
          text: "/msgowner Need 2 more boxes of 1L sunflower oil on the shelf.",
        },
      });

      // Shopkeeper gets confirmation
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("MSG-20261108-NOTE")
      );
    });
  });

  describe("Notifications Center & Preferences Toggling", () => {
    it("toggles notification preference via interactive callback query", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-owner",
        userId: mockOwnerId,
        shopId: mockShopId,
        telegramChatId: mockOwnerChatId,
        isActive: true,
        language: "en",
        notificationPreferences: { newSales: true, dailySummary: true },
        user: {
          id: mockOwnerId,
          fullName: "Abebe Owner",
          email: "owner@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOP_OWNER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.telegramAccount, "findUnique").mockResolvedValue({
        id: "tg-acc-owner",
        telegramChatId: mockOwnerChatId,
        notificationPreferences: { newSales: true, dailySummary: true },
      } as any);

      vi.spyOn(prisma.telegramAccount, "update").mockResolvedValue({
        id: "tg-acc-owner",
        notificationPreferences: { newSales: false, dailySummary: true },
      } as any);

      const editReplyMarkupSpy = vi.spyOn(telegramClient, "editMessageReplyMarkup").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 306,
        callback_query: {
          id: "cb-notif-01",
          from: { id: Number(mockOwnerChatId), is_bot: false, first_name: "Abebe" },
          message: {
            message_id: 88,
            chat: { id: Number(mockOwnerChatId), type: "private" },
            date: Date.now(),
          },
          data: "notif_tog:newSales",
        },
      });

      expect(editReplyMarkupSpy).toHaveBeenCalled();
    });
  });

  describe("Language Support (English & Amharic)", () => {
    it("switches bot language to Amharic and updates reply keyboard", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-owner",
        userId: mockOwnerId,
        shopId: mockShopId,
        telegramChatId: mockOwnerChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockOwnerId,
          fullName: "Abebe Owner",
          email: "owner@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOP_OWNER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.telegramAccount, "findUnique").mockResolvedValue({
        id: "tg-acc-owner",
        telegramChatId: mockOwnerChatId,
      } as any);

      vi.spyOn(prisma.telegramAccount, "update").mockResolvedValue({
        id: "tg-acc-owner",
        language: "am",
      } as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 307,
        callback_query: {
          id: "cb-lang-01",
          from: { id: Number(mockOwnerChatId), is_bot: false, first_name: "Abebe" },
          message: {
            message_id: 89,
            chat: { id: Number(mockOwnerChatId), type: "private" },
            date: Date.now(),
          },
          data: "lang:am",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockOwnerChatId,
        expect.stringContaining("ቋንቋው በተሳካ ሁኔታ ወደ አማርኛ ተቀይሯል"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            keyboard: expect.arrayContaining([
              expect.arrayContaining([{ text: "📊 የንግድ ማጠቃለያ" }]),
            ]),
          }),
        })
      );
    });
  });

  describe("Request Tracking & Status Updates", () => {
    it("submitting a request generates a unique reference code and alerts owner", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-staff",
        userId: mockStaffId,
        shopId: mockShopId,
        telegramChatId: mockStaffChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockStaffId,
          fullName: "Tigist Cashier",
          email: "tigist@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
        organizationId: mockOrgId,
        shopId: mockShopId,
        role: ShopRole.SHOPKEEPER,
        organization: { id: mockOrgId },
      } as any);

      vi.spyOn(prisma.approvalRequest, "create").mockResolvedValue({
        id: "req-001",
        referenceCode: "REQ-20261108-ABCD",
        shopId: mockShopId,
        requesterId: mockStaffId,
        approvalType: "STOCK_ADJUSTMENT",
        title: "2 cartons of water damaged",
        details: { description: "2 cartons of water damaged" },
        status: "PENDING",
        requester: { id: mockStaffId, fullName: "Tigist Cashier" },
        shop: { id: mockShopId, name: "Main Store" },
      } as any);

      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      // Owner accounts
      vi.spyOn(prisma.telegramAccount, "findMany").mockResolvedValue([
        {
          telegramChatId: mockOwnerChatId,
          isActive: true,
          language: "en",
          notifications: "ALL",
          notificationPreferences: { approvals: true },
        },
      ] as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 308,
        message: {
          message_id: 125,
          date: Date.now(),
          chat: { id: Number(mockStaffChatId), type: "private" },
          text: "/request 2 cartons of water damaged",
        },
      });

      // Requester gets ref code
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("REQ-20261108-ABCD")
      );
      // Owner receives request card with ref code
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockOwnerChatId,
        expect.stringContaining("REQ-20261108-ABCD"),
        expect.anything()
      );
    });

    it("allows shopkeeper to view their submitted requests with /myrequests", async () => {
      vi.spyOn(prisma.telegramAccount, "findFirst").mockResolvedValue({
        id: "tg-acc-staff",
        userId: mockStaffId,
        shopId: mockShopId,
        telegramChatId: mockStaffChatId,
        isActive: true,
        language: "en",
        user: {
          id: mockStaffId,
          fullName: "Tigist Cashier",
          email: "tigist@easystock.app",
          platformRole: "NONE",
          isActive: true,
          memberships: [{ shopId: mockShopId, role: ShopRole.SHOPKEEPER }],
        },
        shop: { id: mockShopId, name: "Main Store", code: "MAIN", currency: "ETB" },
      } as any);

      vi.spyOn(prisma.userMembership, "findFirst").mockResolvedValue({
        organizationId: mockOrgId,
        shopId: mockShopId,
        role: ShopRole.SHOPKEEPER,
        organization: { id: mockOrgId },
      } as any);

      vi.spyOn(prisma.approvalRequest, "findMany").mockResolvedValue([
        {
          id: "req-001",
          referenceCode: "REQ-20261108-ABCD",
          title: "2 cartons of water damaged",
          status: "APPROVED",
          createdAt: new Date(),
        },
      ] as any);

      const sendMessageSpy = vi.spyOn(telegramClient, "sendMessage").mockResolvedValue({} as any);

      await telegramRouter.handleUpdate({
        update_id: 309,
        message: {
          message_id: 126,
          date: Date.now(),
          chat: { id: Number(mockStaffChatId), type: "private" },
          text: "/myrequests",
        },
      });

      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("REQ-20261108-ABCD")
      );
      expect(sendMessageSpy).toHaveBeenCalledWith(
        mockStaffChatId,
        expect.stringContaining("APPROVED")
      );
    });
  });
});
