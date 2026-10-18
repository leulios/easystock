import { PrismaClient, ShopRole, PlatformRole, MovementType, SaleStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("[DEMO SEED] Initializing isolated presentation demo environment...");

  // 1. Create or upsert Demo Organization
  const orgSlug = "demo-retail";
  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {
      name: "Demo Retail Enterprise (Presentation Mode)",
      plan: "enterprise",
      planStatus: "active",
      maxShops: 5,
    },
    create: {
      name: "Demo Retail Enterprise (Presentation Mode)",
      slug: orgSlug,
      plan: "enterprise",
      planStatus: "active",
      maxShops: 5,
    },
  });

  console.log(`[DEMO SEED] Organization ready: ${org.name} (${org.id})`);

  // 2. Create Demo Users
  const passwordHash = await bcrypt.hash("DemoSecured2026!", 10);
  const pinHash = await bcrypt.hash("1234", 10);

  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@demo.easystock.local" },
    update: { passwordHash, isActive: true },
    create: {
      email: "owner@demo.easystock.local",
      fullName: "Almaz Tadesse (Demo Owner)",
      phone: "+251911000111",
      passwordHash,
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: "cashier@demo.easystock.local" },
    update: { passwordHash, isActive: true },
    create: {
      email: "cashier@demo.easystock.local",
      fullName: "Dawit Haile (Demo Cashier)",
      phone: "+251922000222",
      passwordHash,
      platformRole: PlatformRole.NONE,
      isActive: true,
    },
  });

  // 3. Create Demo Shops
  const mainShop = await prisma.shop.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "DEMO-ADDIS" } },
    update: { currency: "ETB", taxRate: new Decimal(15.0), allowNegativeStock: false },
    create: {
      organizationId: org.id,
      name: "Addis Flagship Store (Demo)",
      code: "DEMO-ADDIS",
      address: "Bole Medhanialem, Addis Ababa, Ethiopia",
      phone: "+251116677889",
      email: "bole@demo.easystock.local",
      currency: "ETB",
      taxRate: new Decimal(15.0),
      taxNumber: "TIN-0028471930",
      receiptHeader: "Addis Flagship Store\nBole Subcity, Addis Ababa\nTel: +251 116 677 889",
      receiptFooter: "Thank you for shopping with us!\nስለመረጡን እናመሰግናለን!\nSoftware: EasyStock SaaS",
      allowNegativeStock: false,
    },
  });

  const branchShop = await prisma.shop.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "DEMO-HAWASSA" } },
    update: { currency: "ETB", taxRate: new Decimal(15.0), allowNegativeStock: false },
    create: {
      organizationId: org.id,
      name: "Hawassa Lakeside Outlet (Demo)",
      code: "DEMO-HAWASSA",
      address: "Piazza Central, Hawassa, Sidama, Ethiopia",
      phone: "+251462201234",
      email: "hawassa@demo.easystock.local",
      currency: "ETB",
      taxRate: new Decimal(15.0),
      taxNumber: "TIN-0028471930",
      receiptHeader: "Hawassa Lakeside Branch\nTel: +251 462 201 234",
      receiptFooter: "Thank you for visiting Hawassa Outlet!",
      allowNegativeStock: false,
    },
  });

  // 4. Link Memberships
  await prisma.userMembership.upsert({
    where: {
      userId_organizationId_shopId: {
        userId: ownerUser.id,
        organizationId: org.id,
        shopId: mainShop.id,
      },
    },
    update: { role: ShopRole.SHOP_OWNER },
    create: {
      userId: ownerUser.id,
      organizationId: org.id,
      shopId: mainShop.id,
      role: ShopRole.SHOP_OWNER,
      canViewReports: true,
      canApplyDiscount: true,
      canAdjustStock: true,
    },
  });

  await prisma.userMembership.upsert({
    where: {
      userId_organizationId_shopId: {
        userId: cashierUser.id,
        organizationId: org.id,
        shopId: mainShop.id,
      },
    },
    update: { role: ShopRole.SHOPKEEPER, pinHash },
    create: {
      userId: cashierUser.id,
      organizationId: org.id,
      shopId: mainShop.id,
      role: ShopRole.SHOPKEEPER,
      pinHash,
      canViewReports: false,
      canApplyDiscount: false,
      canAdjustStock: false,
    },
  });

  // 5. Seed Categories
  const categoriesData = [
    { name: "Coffee & Tea", description: "Specialty Ethiopian beans, roasts, and spiced blends" },
    { name: "Grains & Teff", description: "First-grade white teff, barley, wheat, and pulses" },
    { name: "Edible Oils & Cooking", description: "Sunflower oil, palm oil, spices, and tomato paste" },
    { name: "Household & Hygiene", description: "Detergents, soaps, and sanitation products" },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: cat.name } },
      update: {},
      create: { organizationId: org.id, ...cat },
    });
    categoryMap.set(cat.name, c.id);
  }

  // 6. Seed Demo Catalog Products & Opening Stock
  const demoProducts = [
    {
      name: "Yirgacheffe Grade 1 Washed Coffee 500g",
      sku: "YIRG-500G",
      barcode: "600100200301",
      categoryName: "Coffee & Tea",
      unit: "pkt",
      costPrice: new Decimal(220.0),
      sellingPrice: new Decimal(320.0),
      reorderLevel: 15,
      mainStock: 75,
      branchStock: 30,
    },
    {
      name: "Magna White Teff Grain 50kg Bag",
      sku: "TEFF-W-50",
      barcode: "600100200302",
      categoryName: "Grains & Teff",
      unit: "qtl",
      costPrice: new Decimal(4300.0),
      sellingPrice: new Decimal(5200.0),
      reorderLevel: 5,
      mainStock: 25,
      branchStock: 12,
    },
    {
      name: "SunGold Sunflower Cooking Oil 5 Liters",
      sku: "OIL-SUN-5L",
      barcode: "600100200303",
      categoryName: "Edible Oils & Cooking",
      unit: "ltr",
      costPrice: new Decimal(580.0),
      sellingPrice: new Decimal(750.0),
      reorderLevel: 10,
      mainStock: 50,
      branchStock: 20,
    },
    {
      name: "FreshClean Laundry Soap 200g Bar",
      sku: "SOAP-FC-200",
      barcode: "600100200304",
      categoryName: "Household & Hygiene",
      unit: "pcs",
      costPrice: new Decimal(38.0),
      sellingPrice: new Decimal(55.0),
      reorderLevel: 25,
      mainStock: 180,
      branchStock: 80,
    },
    {
      name: "Ambo Sparkling Mineral Water 500ml",
      sku: "AMBO-MIN-500",
      barcode: "600100200305",
      categoryName: "Coffee & Tea",
      unit: "pcs",
      costPrice: new Decimal(22.0),
      sellingPrice: new Decimal(35.0),
      reorderLevel: 30,
      mainStock: 240,
      branchStock: 100,
    },
  ];

  for (const item of demoProducts) {
    const product = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: item.sku } },
      update: {},
      create: {
        organizationId: org.id,
        categoryId: categoryMap.get(item.categoryName),
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        unitOfMeasure: item.unit,
      },
    });

    const variant = await prisma.productVariant.upsert({
      where: { productId_sku: { productId: product.id, sku: item.sku } },
      update: {},
      create: {
        productId: product.id,
        name: "Standard",
        sku: item.sku,
        barcode: item.barcode,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        reorderLevel: item.reorderLevel,
      },
    });

    // Upsert main inventory
    await prisma.inventoryItem.upsert({
      where: { shopId_variantId: { shopId: mainShop.id, variantId: variant.id } },
      update: { quantity: item.mainStock },
      create: { shopId: mainShop.id, variantId: variant.id, quantity: item.mainStock },
    });

    // Upsert branch inventory
    await prisma.inventoryItem.upsert({
      where: { shopId_variantId: { shopId: branchShop.id, variantId: variant.id } },
      update: { quantity: item.branchStock },
      create: { shopId: branchShop.id, variantId: variant.id, quantity: item.branchStock },
    });
  }

  // 7. Seed Demo Customers with credit
  await prisma.customer.upsert({
    where: { id: "cust-demo-1" },
    update: {},
    create: {
      id: "cust-demo-1",
      organizationId: org.id,
      name: "Mulugeta Assefa (Dube Customer)",
      phone: "+251911445566",
      email: "mulugeta@example.com",
      address: "Bole Subcity, Woreda 03",
      outstandingCredit: new Decimal(1450.0),
    },
  });

  await prisma.customer.upsert({
    where: { id: "cust-demo-2" },
    update: {},
    create: {
      id: "cust-demo-2",
      organizationId: org.id,
      name: "Bethlehem Girma",
      phone: "+251922778899",
      email: "bethlehem@example.com",
      address: "Kirkos Subcity, Kazanchis",
      outstandingCredit: new Decimal(0.0),
    },
  });

  // 8. Seed Demo Expenses for realistic P&L
  const demoExpenses = [
    { category: "Rent", amount: new Decimal(25000.0), desc: "Shop monthly lease payment" },
    { category: "Utilities", amount: new Decimal(3200.0), desc: "Electricity (EEU) & Water bills" },
    { category: "Salaries", amount: new Decimal(18000.0), desc: "Store staff monthly wages" },
    { category: "Supplies", amount: new Decimal(1400.0), desc: "Thermal receipt paper & packaging bags" },
  ];

  for (const exp of demoExpenses) {
    await prisma.expense.create({
      data: {
        shopId: mainShop.id,
        category: exp.category,
        amount: exp.amount,
        description: exp.desc,
        expenseDate: new Date(),
        recordedById: ownerUser.id,
      },
    });
  }

  console.log("\n========================================================");
  console.log("[SUCCESS] Demo presentation data seeded cleanly!");
  console.log("========================================================");
  console.log(`Organization:  ${org.name} (${org.slug})`);
  console.log(`Main Outlet:   ${mainShop.name} (Code: ${mainShop.code})`);
  console.log(`Branch Outlet: ${branchShop.name} (Code: ${branchShop.code})`);
  console.log("\nCredentials for Live Demonstrations:");
  console.log(`- Shop Owner:   owner@demo.easystock.local   | Password: DemoSecured2026!`);
  console.log(`- Cashier:      cashier@demo.easystock.local | Password: DemoSecured2026! (PIN: 1234)`);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("[ERROR] Failed to seed demo presentation data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
