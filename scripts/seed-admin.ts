import { PrismaClient, PlatformRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@easystock.local";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "AdminSecured2026!";
  const fullName = process.env.ADMIN_BOOTSTRAP_NAME || "System Administrator";

  console.log(`[BOOTSTRAP] Checking platform administrator account for ${email}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      platformRole: PlatformRole.SUPER_ADMIN,
      isActive: true,
      passwordHash,
    },
    create: {
      email,
      fullName,
      passwordHash,
      platformRole: PlatformRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "ADMIN_PROVISIONED",
      entityType: "User",
      entityId: adminUser.id,
      newData: { email, platformRole: PlatformRole.SUPER_ADMIN },
    },
  });

  console.log(`[SUCCESS] Platform administrator provisioned successfully!`);
  console.log(`Email: ${email}`);
  console.log(`User ID: ${adminUser.id}`);
  console.log(`Role: ${adminUser.platformRole}`);
}

main()
  .catch((e) => {
    console.error("[ERROR] Failed to bootstrap platform administrator:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
