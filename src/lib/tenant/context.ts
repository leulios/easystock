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
