import { ShopRole, PlatformRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  isActive: boolean;
}

export interface UserShopMembershipInfo {
  id: string;
  shopId: string | null;
  shopName?: string;
  shopCode?: string;
  organizationId: string;
  role: ShopRole;
  canViewReports: boolean;
  canApplyDiscount: boolean;
  canAdjustStock: boolean;
}

export interface TenantContext {
  user: AuthenticatedUser;
  organizationId: string;
  shopId: string;
  role: ShopRole;
  isPlatformAdmin: boolean;
  permissions: {
    canViewReports: boolean;
    canApplyDiscount: boolean;
    canAdjustStock: boolean;
  };
}

/**
 * Asserts whether a given role meets the required role hierarchy.
 */
export function hasRequiredRole(currentRole: ShopRole, requiredRoles: ShopRole[]): boolean {
  if (currentRole === ShopRole.SHOP_OWNER) {
    return true; // Shop Owner has all shop-level permissions
  }
  return requiredRoles.includes(currentRole);
}

/**
 * Returns true if the user is a Shop Owner or Platform Super Admin.
 */
export function isShopOwner(context: TenantContext): boolean {
  return context.role === ShopRole.SHOP_OWNER || context.isPlatformAdmin;
}

/**
 * Returns true if the user is a Shop Owner, Shop Manager, or Platform Super Admin.
 */
export function isOwnerOrManager(context: TenantContext): boolean {
  return (
    context.role === ShopRole.SHOP_OWNER ||
    context.role === ShopRole.SHOP_MANAGER ||
    context.isPlatformAdmin
  );
}

/**
 * Asserts that the authenticated user is an Owner or Manager.
 * Rejects Shopkeeper (sales-only) unconditionally.
 */
export function assertOwnerOrManager(
  context: TenantContext,
  operationDescription = "This operation"
): void {
  if (!isOwnerOrManager(context)) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners and Managers. Shopkeepers have sales-only access.`
    );
  }
}

/**
 * Asserts that the caller has inventory management authority.
 * Final business rule: Shopkeepers record sales; Owners control inventory.
 */
export function assertCanManageInventory(
  context: TenantContext,
  operationDescription = "Inventory management"
): void {
  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners. Shopkeepers have sales-only access and cannot modify or control inventory.`
    );
  }
  if (!isOwnerOrManager(context)) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners.`
    );
  }
}

/**
 * Asserts that the caller has authority to record or manage business expenses.
 */
export function assertCanManageExpenses(
  context: TenantContext,
  operationDescription = "Expense management"
): void {
  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners. Shopkeepers have sales-only access.`
    );
  }
  if (!isOwnerOrManager(context)) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners.`
    );
  }
}

/**
 * Asserts that the caller has authority to create purchase orders, manage suppliers, or receive inventory.
 */
export function assertCanManagePurchases(
  context: TenantContext,
  operationDescription = "Purchases and supplier management"
): void {
  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners. Shopkeepers have sales-only access.`
    );
  }
  if (!isOwnerOrManager(context)) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners.`
    );
  }
}

/**
 * Asserts that the caller has authority to view financial and management reports.
 */
export function assertCanViewReports(
  context: TenantContext,
  operationDescription = "Viewing reports"
): void {
  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners. Shopkeepers have sales-only access.`
    );
  }
  const canView =
    context.role === ShopRole.SHOP_OWNER ||
    context.isPlatformAdmin ||
    (context.role === ShopRole.SHOP_MANAGER && context.permissions.canViewReports);
  if (!canView) {
    throw new Error(
      `Unauthorized: ${operationDescription} is restricted to Shop Owners and authorized managers.`
    );
  }
}
