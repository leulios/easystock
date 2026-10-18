import { describe, it, expect } from "vitest";
import { hasRequiredRole } from "../tenant/context";
import { ShopRole } from "@prisma/client";

describe("Tenant RBAC & Role Hierarchy", () => {
  it("grants Shop Owner access to all shopkeeper and manager actions", () => {
    expect(hasRequiredRole(ShopRole.SHOP_OWNER, [ShopRole.SHOPKEEPER])).toBe(true);
    expect(hasRequiredRole(ShopRole.SHOP_OWNER, [ShopRole.SHOP_MANAGER])).toBe(true);
    expect(hasRequiredRole(ShopRole.SHOP_OWNER, [ShopRole.SHOP_OWNER])).toBe(true);
  });

  it("permits Shop Manager to perform manager and shopkeeper actions", () => {
    expect(hasRequiredRole(ShopRole.SHOP_MANAGER, [ShopRole.SHOPKEEPER, ShopRole.SHOP_MANAGER])).toBe(true);
    expect(hasRequiredRole(ShopRole.SHOP_MANAGER, [ShopRole.SHOP_OWNER])).toBe(false);
  });

  it("strictly restricts Shopkeeper from administrative roles", () => {
    expect(hasRequiredRole(ShopRole.SHOPKEEPER, [ShopRole.SHOPKEEPER])).toBe(true);
    expect(hasRequiredRole(ShopRole.SHOPKEEPER, [ShopRole.SHOP_MANAGER])).toBe(false);
    expect(hasRequiredRole(ShopRole.SHOPKEEPER, [ShopRole.SHOP_OWNER])).toBe(false);
  });
});
