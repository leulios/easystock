import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { Decimal } from "../decimal";
import { MovementType } from "@prisma/client";

export interface CsvProductRow {
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  unitOfMeasure?: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel?: number;
  initialStock?: number;
}

export interface ValidationErrorItem {
  rowNumber: number;
  sku?: string;
  field: string;
  message: string;
}

export interface ImportValidationResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  validRows: CsvProductRow[];
  errors: ValidationErrorItem[];
}

export interface ImportExecutionResult {
  success: boolean;
  importedCount: number;
  categoriesCreatedCount: number;
  errors?: string[];
}

/**
 * Parses raw CSV text into structured string rows handling quotes and common delimiters.
 */
export function parseCsvText(rawText: string): Array<Record<string, string>> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return [];
  }

  // Detect delimiter: comma, semicolon, tab
  const headerLine = lines[0];
  let delimiter = ",";
  if (headerLine.includes(";") && !headerLine.includes(",")) {
    delimiter = ";";
  } else if (headerLine.includes("\t")) {
    delimiter = "\t";
  }

  // Parse header
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(headerLine).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const results: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawValues[idx] || "";
    });
    results.push(rowObj);
  }

  return results;
}

/**
 * Validates parsed CSV rows against business rules, existing database SKUs, and in-file collisions.
 */
export async function validateProductImport(
  context: TenantContext,
  rawRows: Array<Record<string, string>>
): Promise<ImportValidationResult> {
  const { organizationId } = context;

  const validRows: CsvProductRow[] = [];
  const errors: ValidationErrorItem[] = [];

  // 1. Fetch all existing active SKUs in this organization to check collisions
  const existingProducts = await prisma.product.findMany({
    where: { organizationId, deletedAt: null },
    select: { sku: true },
  });
  const existingSkuSet = new Set(existingProducts.map((p) => p.sku.toUpperCase()));

  const seenInFileSkus = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Line 1 is header
    const rowErrors: ValidationErrorItem[] = [];

    // Map common header variations
    const name = row["name"] || row["productname"] || row["item"] || "";
    const sku = (row["sku"] || row["itemcode"] || row["code"] || "").toUpperCase().trim();
    const barcode = row["barcode"] || row["upc"] || row["ean"] || "";
    const category = row["category"] || row["categoryname"] || "";
    const unitOfMeasure = row["unit"] || row["unitofmeasure"] || "pcs";
    const rawCost = row["costprice"] || row["cost"] || row["unitcost"] || "0";
    const rawPrice = row["sellingprice"] || row["price"] || row["unitprice"] || "0";
    const rawReorder = row["reorderlevel"] || row["reorderthreshold"] || "5";
    const rawStock = row["initialstock"] || row["stock"] || row["quantity"] || "0";

    // Validation 1: Name
    if (!name || name.trim().length < 2) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "name",
        message: "Product name must be at least 2 characters.",
      });
    }

    // Validation 2: SKU
    if (!sku || sku.length < 2) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "sku",
        message: "SKU is required and must be at least 2 characters.",
      });
    } else if (!/^[A-Za-z0-9_-]+$/.test(sku)) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "sku",
        message: "SKU can only contain letters, numbers, hyphens, and underscores.",
      });
    } else if (seenInFileSkus.has(sku)) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "sku",
        message: `Duplicate SKU "${sku}" found within the uploaded CSV file.`,
      });
    } else if (existingSkuSet.has(sku)) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "sku",
        message: `SKU "${sku}" already exists in your shop's product catalog.`,
      });
    }

    seenInFileSkus.add(sku);

    // Validation 3: Pricing
    const costPrice = parseFloat(rawCost.replace(/[^0-9.-]/g, ""));
    const sellingPrice = parseFloat(rawPrice.replace(/[^0-9.-]/g, ""));

    if (isNaN(costPrice) || costPrice < 0) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "costPrice",
        message: "Cost price must be a valid non-negative number.",
      });
    }

    if (isNaN(sellingPrice) || sellingPrice < 0) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "sellingPrice",
        message: "Selling price must be a valid non-negative number.",
      });
    }

    // Validation 4: Stock integers
    const reorderLevel = parseInt(rawReorder, 10);
    const initialStock = parseInt(rawStock, 10);

    if (isNaN(reorderLevel) || reorderLevel < 0) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "reorderLevel",
        message: "Reorder level must be a non-negative integer.",
      });
    }

    if (isNaN(initialStock) || initialStock < 0) {
      rowErrors.push({
        rowNumber,
        sku,
        field: "initialStock",
        message: "Initial stock must be a non-negative integer.",
      });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validRows.push({
        name: name.trim(),
        sku,
        barcode: barcode.trim() || undefined,
        category: category.trim() || undefined,
        unitOfMeasure: unitOfMeasure.trim().toLowerCase() || "pcs",
        costPrice: Math.round(costPrice * 100) / 100,
        sellingPrice: Math.round(sellingPrice * 100) / 100,
        reorderLevel: isNaN(reorderLevel) ? 5 : reorderLevel,
        initialStock: isNaN(initialStock) ? 0 : initialStock,
      });
    }
  });

  return {
    totalRows: rawRows.length,
    validRowsCount: validRows.length,
    invalidRowsCount: rawRows.length - validRows.length,
    validRows,
    errors,
  };
}

/**
 * Commits verified valid rows into the database atomically.
 */
export async function executeProductImport(
  context: TenantContext,
  validRows: CsvProductRow[]
): Promise<ImportExecutionResult> {
  const { organizationId, shopId, user } = context;

  if (validRows.length === 0) {
    return { success: false, importedCount: 0, categoriesCreatedCount: 0, errors: ["No valid rows to import."] };
  }

  // 1. Resolve or create categories
  const categoryNames = Array.from(
    new Set(validRows.map((r) => r.category).filter(Boolean) as string[])
  );

  const categoryMap = new Map<string, string>(); // Name -> ID

  const existingCategories = await prisma.category.findMany({
    where: { organizationId, deletedAt: null },
  });

  existingCategories.forEach((c) => {
    categoryMap.set(c.name.toLowerCase(), c.id);
  });

  let createdCategoriesCount = 0;

  for (const catName of categoryNames) {
    const key = catName.toLowerCase();
    if (!categoryMap.has(key)) {
      const created = await prisma.category.create({
        data: { organizationId, name: catName },
      });
      categoryMap.set(key, created.id);
      createdCategoriesCount++;
    }
  }

  // 2. Execute bulk insert transaction
  await prisma.$transaction(async (tx) => {
    for (const item of validRows) {
      const categoryId = item.category
        ? categoryMap.get(item.category.toLowerCase()) || null
        : null;

      // Create Product
      const product = await tx.product.create({
        data: {
          organizationId,
          categoryId,
          name: item.name,
          sku: item.sku,
          barcode: item.barcode || null,
          unitOfMeasure: item.unitOfMeasure || "pcs",
        },
      });

      // Create Default Variant
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          name: "Standard",
          sku: item.sku,
          barcode: item.barcode || null,
          costPrice: new Decimal(item.costPrice),
          sellingPrice: new Decimal(item.sellingPrice),
          reorderLevel: item.reorderLevel || 5,
        },
      });

      // Initialize Shop Inventory Item
      await tx.inventoryItem.create({
        data: {
          shopId,
          variantId: variant.id,
          quantity: item.initialStock || 0,
        },
      });

      // If initial opening stock exists, write to StockMovement ledger
      if (item.initialStock && item.initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            shopId,
            variantId: variant.id,
            movementType: MovementType.MANUAL_ADJUSTMENT,
            quantityDelta: item.initialStock,
            resultingBalance: item.initialStock,
            unitCost: new Decimal(item.costPrice),
            referenceType: "OPENING_BALANCE",
            notes: "Initial inventory setup via CSV bulk import",
            performedBy: user.id,
          },
        });
      }
    }

    // Audit Log for import event
    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "PRODUCTS_CSV_IMPORT",
        entityType: "Product",
        newData: {
          importedCount: validRows.length,
          categoriesCreated: createdCategoriesCount,
        },
      },
    });
  });

  return {
    success: true,
    importedCount: validRows.length,
    categoriesCreatedCount: createdCategoriesCount,
  };
}
