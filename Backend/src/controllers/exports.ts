import { randomUUID } from "crypto";
import { createWriteStream, promises as fs } from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();
const NORMAL_EXPORT_LIMIT = 10_000;
const CHUNK_SIZE = 1_000;
const JOB_TTL_MS = 60 * 60 * 1000;
const EXPORT_DIR = path.resolve(__dirname, "../../exports");
const EXPORT_ALLOWED_ROLES = ["General Manager", "Senior Accountant", "Auditor"];

function canExport(roles: string[] = []) {
  return EXPORT_ALLOWED_ROLES.some((role) => roles.includes(role));
}

type ExportModule = "sales" | "purchases" | "customer-payments" | "vendor-payments" | "cashbook" | "inventory-ledger" | "inventory-valuation" | "items" | "opening-stocks" | "sales-receipts" | "purchase-payments" | "customer-refunds" | "vendor-refunds" | "sales-returns" | "purchase-returns" | "inventory-transfers" | "stock-adjustments" | "pos-sales" | "pos-returns" | "production-orders" | "wip-ledger" | "wip-summary" | "assets" | "asset-categories" | "asset-depreciation" | "journals" | "memos" | "audit-logs" | "customers" | "vendors" | "customer-groups" | "warehouses" | "locations" | "uoms" | "chart-of-accounts" | "cash-accounts" | "boms" | "users" | "roles" | "fiscal-years" | "fiscal-periods" | "approval-workflows" | "approval-requests";
type ExportJob = { id: string; ownerId: string; status: "queued" | "processing" | "completed" | "failed"; progress: number; total: number; filePath?: string; error?: string; createdAt: number };
const jobs = new Map<string, ExportJob>();

const roleAccess: Record<ExportModule, string[]> = {
  sales: ["Senior Accountant", "POS User", "Accountant", "Auditor", "Manager", "General Manager"],
  purchases: ["Inventory Manager", "Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  "customer-payments": ["Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "vendor-payments": ["Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  cashbook: ["Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "inventory-ledger": ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "Production Manager", "Auditor", "General Manager"],
  "inventory-valuation": ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "Production Manager", "Auditor", "General Manager"],
  items: ["Senior Accountant", "POS User", "Production Manager", "Inventory Manager", "Assistant Inventory Manager", "Manager", "Auditor", "Accountant", "General Manager"],
  "opening-stocks": ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "Auditor", "General Manager"],
  "sales-receipts": ["Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "purchase-payments": ["Accountant", "Senior Accountant", "General Manager"],
  "customer-refunds": ["Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "vendor-refunds": ["Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "sales-returns": ["Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  "purchase-returns": ["Inventory Manager", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "inventory-transfers": ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "Production Manager", "Auditor", "General Manager"],
  "stock-adjustments": ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "Production Manager", "Auditor", "General Manager"],
  "pos-sales": ["POS User", "Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "pos-returns": ["POS User", "Accountant", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "production-orders": ["Production Manager", "Inventory Manager", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "wip-ledger": ["Production Manager", "Inventory Manager", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  "wip-summary": ["Production Manager", "Inventory Manager", "Senior Accountant", "Auditor", "Manager", "General Manager"],
  assets: ["Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  "asset-categories": ["Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  "asset-depreciation": ["Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  journals: ["Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  memos: ["Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  "audit-logs": ["Senior Accountant", "Auditor", "General Manager"],
  customers: ["Accountant", "Senior Accountant", "Manager", "Auditor", "POS User", "General Manager"],
  vendors: ["Inventory Manager", "Senior Accountant", "Accountant", "Auditor", "General Manager"],
  "customer-groups": ["Senior Accountant", "Manager", "General Manager"],
  warehouses: ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "POS User", "Production Manager", "Auditor", "Manager", "General Manager"],
  locations: ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "Auditor", "General Manager"],
  uoms: ["Inventory Manager", "Assistant Inventory Manager", "Senior Accountant", "Production Manager", "Auditor", "General Manager"],
  "chart-of-accounts": ["Senior Accountant", "Accountant", "Auditor", "Manager", "General Manager"],
  "cash-accounts": ["Accountant", "Senior Accountant", "Auditor", "Manager", "POS User", "General Manager"],
  boms: ["Inventory Manager", "Assistant Inventory Manager", "Production Manager", "Senior Accountant", "Auditor", "General Manager"],
  users: ["Senior Accountant", "General Manager"], roles: ["Senior Accountant", "Auditor", "General Manager"],
  "fiscal-years": ["General Manager", "Senior Accountant", "Auditor"], "fiscal-periods": ["General Manager", "Senior Accountant", "Auditor"],
  "approval-workflows": ["Auditor", "Senior Accountant", "General Manager"], "approval-requests": ["Auditor", "Senior Accountant", "General Manager"],
};

function escapeCsv(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  // Protect spreadsheet users from CSV formula injection while preserving ordinary values.
  const safe = /^[=+@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function makeConfig(module: ExportModule, filters: Record<string, unknown>) {
  const where: Record<string, any> = {};
  const status = typeof filters.status === "string" ? filters.status : "";
  const party = typeof filters.partyId === "string" ? filters.partyId : "";
  const cashAccountId = typeof filters.cashAccountId === "string" ? filters.cashAccountId : "";
  const from = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : undefined;
  const to = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : undefined;
  if (to && !Number.isNaN(+to)) to.setUTCHours(23, 59, 59, 999);
  const search = typeof filters.search === "string" ? filters.search.trim().slice(0, 100) : "";
  const dateRange = from || to ? { ...(from && !Number.isNaN(+from) ? { gte: from } : {}), ...(to && !Number.isNaN(+to) ? { lte: to } : {}) } : undefined;

  if (module === "sales") {
    if (status) where.status = status;
    if (party) where.customerId = party;
    if (dateRange) where.orderDate = dateRange;
    if (search) where.OR = [{ orderNo: { contains: search, mode: "insensitive" } }, { customer: { name: { contains: search, mode: "insensitive" } } }];
    return { delegate: (prisma as any).sale, where, orderBy: { orderDate: "desc" }, include: { customer: { select: { code: true, name: true } } }, headers: ["Order No", "Date", "Customer Code", "Customer", "Status", "Total Amount", "Notes"], row: (r: any) => [r.orderNo, r.orderDate, r.customer?.code, r.customer?.name, r.status, r.totalAmount, r.notes] };
  }
  if (module === "purchases") {
    if (status) where.status = status;
    if (party) where.vendorId = party;
    if (dateRange) where.orderDate = dateRange;
    if (search) where.OR = [{ orderNo: { contains: search, mode: "insensitive" } }, { vendor: { name: { contains: search, mode: "insensitive" } } }];
    return { delegate: (prisma as any).purchase, where, orderBy: { orderDate: "desc" }, include: { vendor: { select: { code: true, name: true } } }, headers: ["Order No", "Date", "Vendor Code", "Vendor", "Status", "Total Amount", "Amount Paid", "Balance", "Notes"], row: (r: any) => [r.orderNo, r.orderDate, r.vendor?.code, r.vendor?.name, r.status, r.totalAmount, r.amountPaid, r.balanceAmount, r.notes] };
  }
  if (module === "customer-payments") {
    if (status) where.status = status;
    if (party) where.customerId = party;
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (dateRange) where.paymentDate = dateRange;
    if (search) where.OR = [{ paymentNo: { contains: search, mode: "insensitive" } }, { reference: { contains: search, mode: "insensitive" } }, { notes: { contains: search, mode: "insensitive" } }];
    return { delegate: (prisma as any).customerPayment, where, orderBy: { paymentDate: "desc" }, include: { customer: { select: { code: true, name: true } }, cashAccount: { select: { code: true, name: true } } }, headers: ["Payment No", "Date", "Customer Code", "Customer", "Cash Account", "Status", "Amount", "Reference", "Notes"], row: (r: any) => [r.paymentNo, r.paymentDate, r.customer?.code, r.customer?.name, r.cashAccount?.name, r.status, r.totalAmount, r.reference, r.notes] };
  }
  if (module === "vendor-payments") {
    if (status) where.status = status;
    if (party) where.vendorId = party;
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (dateRange) where.paymentDate = dateRange;
    if (search) where.OR = [{ paymentNo: { contains: search, mode: "insensitive" } }, { reference: { contains: search, mode: "insensitive" } }, { notes: { contains: search, mode: "insensitive" } }];
    return { delegate: (prisma as any).vendorPayment, where, orderBy: { paymentDate: "desc" }, include: { vendor: { select: { code: true, name: true } }, cashAccount: { select: { code: true, name: true } } }, headers: ["Payment No", "Date", "Vendor Code", "Vendor", "Cash Account", "Status", "Amount", "Reference", "Notes"], row: (r: any) => [r.paymentNo, r.paymentDate, r.vendor?.code, r.vendor?.name, r.cashAccount?.name, r.status, r.totalAmount, r.reference, r.notes] };
  }
  if (module === "inventory-ledger") {
    const itemId = typeof filters.itemId === "string" ? filters.itemId : "";
    const warehouseId = typeof filters.warehouseId === "string" ? filters.warehouseId : "";
    const userId = typeof filters.userId === "string" ? filters.userId : "";
    const itemType = typeof filters.itemType === "string" ? filters.itemType : "";
    const refType = typeof filters.refType === "string" ? filters.refType : "";
    const direction = typeof filters.direction === "string" ? filters.direction : "";
    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (userId) where.userId = userId;
    if (refType) where.refType = refType;
    if (direction) where.direction = direction;
    if (itemType) where.item = { type: itemType };
    if (dateRange) where.postedAt = dateRange;
    return { delegate: (prisma as any).inventoryLedger, where, orderBy: { postedAt: "desc" }, include: { item: { select: { sku: true, name: true, type: true, uom: true } }, warehouse: { select: { code: true, name: true } }, user: { select: { name: true } } }, headers: ["Date", "Item SKU", "Item Name", "Item Type", "Warehouse", "Reference Type", "Reference", "Direction", "Quantity", "UOM", "Unit Cost", "Value", "Running Quantity", "Running Value", "Running Average Cost", "User"], row: (r: any) => [r.postedAt, r.item?.sku, r.item?.name, r.item?.type, r.warehouse?.name, r.refType, r.refId, r.direction, r.qty, r.item?.uom, r.unitCost, r.value, r.runningQty, r.runningValue, r.runningAvgCost, r.user?.name || "System"] };
  }
  if (module === "items") {
    const type = typeof filters.type === "string" ? filters.type : "";
    if (type) where.type = type;
    if (search) where.OR = [{ sku: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }];
    return { delegate: (prisma as any).item, where, orderBy: { sku: "asc" }, include: {}, headers: ["SKU", "Name", "Type", "UOM", "Costing Method", "Standard Cost", "Retail Price", "Wholesale Price", "Minimum Stock Level", "Tax Code", "Active"], row: (r: any) => [r.sku, r.name, r.type, r.uom, r.costingMethod, r.standardCost, r.sellingPriceOrdinary, r.sellingPriceBulk, r.minimumStockLevel, r.taxCode, r.isActive ? "Active" : "Inactive"] };
  }
  if (module === "opening-stocks") {
    if (filters.warehouseId) where.warehouseId = String(filters.warehouseId);
    if (search) where.referenceNo = { contains: search, mode: "insensitive" };
    if (dateRange) where.openingDate = dateRange;
    return { delegate: (prisma as any).openingStock, where, orderBy: { openingDate: "desc" }, include: { warehouse: { select: { code: true, name: true } }, createdBy: { select: { name: true } }, openingLines: { include: { item: { select: { sku: true, name: true } } } } }, headers: ["Reference", "Opening Date", "Warehouse", "Created By", "Total Qty", "Total Value", "Lines"], row: (r: any) => [r.referenceNo, r.openingDate, r.warehouse?.name, r.createdBy?.name, r.totalQty, r.totalValue, JSON.stringify(r.openingLines?.map((line: any) => ({ sku: line.item?.sku, item: line.item?.name, qty: line.qty, unitCost: line.unitCost, total: line.lineTotal })) || [])] };
  }
  if (module === "inventory-valuation") {
    const warehouseId = typeof filters.warehouseId === "string" ? filters.warehouseId : "";
    const type = typeof filters.type === "string" ? filters.type : "";
    const warehouseCondition = warehouseId ? Prisma.sql`AND il."warehouseId" = ${warehouseId}` : Prisma.empty;
    const typeCondition = type ? Prisma.sql`AND i."type" = ${type}` : Prisma.empty;
    const baseConditions = Prisma.sql`WHERE i."isActive" = true ${warehouseCondition} ${typeCondition} AND il."runningQty" > 0`;
    const delegate = {
      count: async () => {
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
          WITH latest AS (SELECT DISTINCT ON ("itemId", "warehouseId") "itemId", "warehouseId", "runningQty" FROM "inventory_ledger" ORDER BY "itemId", "warehouseId", "postedAt" DESC)
          SELECT COUNT(*) AS count FROM latest il JOIN "items" i ON i.id = il."itemId" ${baseConditions}
        `);
        return Number(result[0]?.count || 0);
      },
      findMany: async ({ skip, take }: { skip: number; take: number }) => prisma.$queryRaw<any[]>(Prisma.sql`
        WITH latest AS (SELECT DISTINCT ON ("itemId", "warehouseId") "itemId", "warehouseId", "runningQty", "runningAvgCost", "runningValue" FROM "inventory_ledger" ORDER BY "itemId", "warehouseId", "postedAt" DESC)
        SELECT i.sku, i.name, i.type, i."costingMethod", i."minimumStockLevel", il."warehouseId", w.name AS "warehouseName", il."runningQty", il."runningAvgCost", il."runningValue"
        FROM latest il JOIN "items" i ON i.id = il."itemId" JOIN "warehouses" w ON w.id = il."warehouseId" ${baseConditions}
        ORDER BY i.sku ASC, w.name ASC LIMIT ${take} OFFSET ${skip}
      `),
    };
    return { delegate, where: {}, orderBy: {}, include: {}, headers: ["SKU", "Item Name", "Item Type", "Costing Method", "Warehouse", "Quantity", "Unit Cost", "Total Value", "Minimum Stock Level"], row: (r: any) => [r.sku, r.name, r.type, r.costingMethod, r.warehouseName, r.runningQty, r.runningAvgCost, r.runningValue, r.minimumStockLevel] };
  }
  if (module === "sales-receipts") {
    if (party) where.customerId = party;
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (dateRange) where.receiptDate = dateRange;
    return { delegate: (prisma as any).salesReceipt, where, orderBy: { receiptDate: "desc" }, include: { customer: { select: { code: true, name: true } }, cashAccount: { select: { code: true, name: true } }, sale: { select: { orderNo: true } } }, headers: ["Receipt No", "Date", "Customer Code", "Customer", "Cash Account", "Sales Order", "Amount Received", "Reference", "Notes"], row: (r: any) => [r.receiptNo, r.receiptDate, r.customer?.code, r.customer?.name, r.cashAccount?.name, r.sale?.orderNo, r.amountReceived, r.reference, r.notes] };
  }
  if (module === "purchase-payments") {
    if (party) where.vendorId = party;
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (dateRange) where.paymentDate = dateRange;
    return { delegate: (prisma as any).purchasePayment, where, orderBy: { paymentDate: "desc" }, include: { vendor: { select: { code: true, name: true } }, cashAccount: { select: { code: true, name: true } }, purchase: { select: { orderNo: true } } }, headers: ["Payment No", "Date", "Vendor Code", "Vendor", "Cash Account", "Purchase Order", "Amount Paid", "Reference", "Notes"], row: (r: any) => [r.paymentNo, r.paymentDate, r.vendor?.code, r.vendor?.name, r.cashAccount?.name, r.purchase?.orderNo, r.amountPaid, r.reference, r.notes] };
  }
  if (module === "customer-refunds") {
    if (party) where.customerId = party;
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (dateRange) where.refundDate = dateRange;
    return { delegate: (prisma as any).salesRefund, where, orderBy: { refundDate: "desc" }, include: { customer: { select: { code: true, name: true } }, cashAccount: { select: { code: true, name: true } }, sale: { select: { orderNo: true } } }, headers: ["Refund No", "Date", "Customer Code", "Customer", "Cash Account", "Sales Order", "Amount Refunded", "Reference", "Notes"], row: (r: any) => [r.refundNo, r.refundDate, r.customer?.code, r.customer?.name, r.cashAccount?.name, r.sale?.orderNo, r.amountRefunded, r.reference, r.notes] };
  }
  if (module === "vendor-refunds") {
    if (party) where.vendorId = party;
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (dateRange) where.refundDate = dateRange;
    return { delegate: (prisma as any).purchaseRefund, where, orderBy: { refundDate: "desc" }, include: { vendor: { select: { code: true, name: true } }, cashAccount: { select: { code: true, name: true } }, purchase: { select: { orderNo: true } } }, headers: ["Refund No", "Date", "Vendor Code", "Vendor", "Cash Account", "Purchase Order", "Amount", "Reference", "Notes"], row: (r: any) => [r.refundNo, r.refundDate, r.vendor?.code, r.vendor?.name, r.cashAccount?.name, r.purchase?.orderNo, r.amount, r.reference, r.notes] };
  }
  if (module === "sales-returns") {
    if (status) where.status = status; if (party) where.customerId = party; if (dateRange) where.returnDate = dateRange;
    return { delegate: (prisma as any).salesReturn, where, orderBy: { returnDate: "desc" }, include: { customer: { select: { code: true, name: true } }, sale: { select: { orderNo: true } } }, headers: ["Return No", "Date", "Sales Order", "Customer Code", "Customer", "Status", "Subtotal", "Tax", "Total", "Reason"], row: (r: any) => [r.returnNo, r.returnDate, r.sale?.orderNo, r.customer?.code, r.customer?.name, r.status, r.subtotal, r.tax, r.totalAmount, r.reason] };
  }
  if (module === "purchase-returns") {
    if (status) where.status = status; if (party) where.vendorId = party; if (dateRange) where.returnDate = dateRange;
    return { delegate: (prisma as any).purchaseReturn, where, orderBy: { returnDate: "desc" }, include: { vendor: { select: { code: true, name: true } }, purchase: { select: { orderNo: true } } }, headers: ["Return No", "Date", "Purchase Order", "Vendor Code", "Vendor", "Status", "Subtotal", "Tax", "Total", "Reason"], row: (r: any) => [r.returnNo, r.returnDate, r.purchase?.orderNo, r.vendor?.code, r.vendor?.name, r.status, r.subtotal, r.tax, r.totalAmount, r.reason] };
  }
  if (module === "inventory-transfers") {
    if (status) where.status = status; if (filters.fromWarehouseId) where.fromWarehouseId = String(filters.fromWarehouseId); if (filters.toWarehouseId) where.toWarehouseId = String(filters.toWarehouseId); if (filters.itemId) where.items = { some: { itemId: String(filters.itemId) } }; if (dateRange) where.createdAt = dateRange;
    return { delegate: (prisma as any).inventoryTransfer, where, orderBy: { createdAt: "desc" }, include: { fromWarehouse: { select: { code: true, name: true } }, toWarehouse: { select: { code: true, name: true } }, items: { include: { item: { select: { sku: true, name: true } } } } }, headers: ["Transfer Ref", "Created", "From Warehouse", "To Warehouse", "Status", "Item Lines"], row: (r: any) => [r.refId, r.createdAt, r.fromWarehouse?.name, r.toWarehouse?.name, r.status, JSON.stringify(r.items?.map((x: any) => ({ sku: x.item?.sku, name: x.item?.name, qty: x.qty })) || [])] };
  }
  if (module === "stock-adjustments") {
    if (filters.type) where.adjustmentLines = { some: { adjustmentType: String(filters.type) } };
    if (filters.warehouseId) where.warehouseId = String(filters.warehouseId); if (filters.dateFrom) where.adjustmentDate = { gte: String(filters.dateFrom) }; if (filters.dateTo) where.adjustmentDate = { ...(where.adjustmentDate || {}), lte: String(filters.dateTo) };
    return { delegate: (prisma as any).stockAdjustment, where, orderBy: { createdAt: "desc" }, include: { warehouse: { select: { code: true, name: true } }, account: { select: { code: true, name: true } }, adjustmentLines: { include: { item: { select: { sku: true, name: true } } } } }, headers: ["Adjustment Date", "Warehouse", "Account", "Total Quantity", "Notes", "Lines"], row: (r: any) => [r.adjustmentDate, r.warehouse?.name, r.account?.code, r.totalQuantity, r.notes, JSON.stringify(r.adjustmentLines?.map((x: any) => ({ sku: x.item?.sku, name: x.item?.name, qty: x.qty, type: x.adjustmentType, value: x.value })) || [])] };
  }
  if (module === "pos-sales") {
    if (status) { const statuses = status.split(",").map((value) => value.trim()).filter(Boolean); where.status = statuses.length > 1 ? { in: statuses } : statuses[0]; } if (party) where.customerId = party; if (dateRange) where.createdAt = dateRange; if (search) where.saleNo = { contains: search, mode: "insensitive" };
    if (filters.userId) where.userId = String(filters.userId);
    if (filters.paymentMethod) where.payments = { some: { method: String(filters.paymentMethod) } };
    return { delegate: (prisma as any).posSale, where, orderBy: { createdAt: "desc" }, include: { customer: { select: { code: true, name: true } }, warehouse: { select: { code: true, name: true } }, cashAccount: { select: { name: true } } }, headers: ["Sale No", "Date", "Customer Code", "Customer", "Warehouse", "Cash Account", "Status", "Subtotal", "Tax", "Discount", "Total", "Paid", "Change"], row: (r: any) => [r.saleNo, r.createdAt, r.customer?.code, r.customer?.name, r.warehouse?.name, r.cashAccount?.name, r.status, r.subtotal, r.taxAmount, r.discountAmount, r.totalAmount, r.amountPaid, r.changeAmount] };
  }
  if (module === "pos-returns") {
    if (dateRange) where.createdAt = dateRange; if (party) where.customerId = party;
    return { delegate: (prisma as any).posReturn, where, orderBy: { createdAt: "desc" }, include: { customer: { select: { code: true, name: true } }, originalSale: { select: { saleNo: true } }, warehouse: { select: { name: true } } }, headers: ["Return No", "Date", "Original Sale", "Customer", "Warehouse", "Total", "Refund", "Reason"], row: (r: any) => [r.returnNo, r.createdAt, r.originalSale?.saleNo, r.customer?.name, r.warehouse?.name, r.totalAmount, r.refundAmount, r.reason] };
  }
  if (module === "production-orders") {
    if (status) where.status = status; if (filters.itemId) where.itemId = String(filters.itemId); if (dateRange) where.createdAt = dateRange;
    return { delegate: (prisma as any).productionOrder, where, orderBy: { createdAt: "desc" }, include: { item: { select: { sku: true, name: true } }, warehouse: { select: { name: true } } }, headers: ["Order No", "Created", "Item SKU", "Item", "Warehouse", "Target Qty", "Produced Qty", "Status"], row: (r: any) => [r.orderNo, r.createdAt, r.item?.sku, r.item?.name, r.warehouse?.name, r.qtyTarget, r.qtyProduced, r.status] };
  }
  if (module === "wip-summary") {
    where.status = { in: ["RELEASED", "IN_PROGRESS", "FINISHED"] };
    if (filters.productionOrderId) where.id = String(filters.productionOrderId);
    return {
      delegate: (prisma as any).productionOrder,
      where,
      orderBy: { createdAt: "desc" },
      include: { item: { select: { sku: true, name: true } }, wipLedger: true },
      headers: ["Production Order", "Item SKU", "Item", "Issues", "Labor", "Overhead", "Receipts", "WIP Balance"],
      row: (order: any) => {
        const amount = (type: string) => (order.wipLedger || []).filter((entry: any) => entry.type === type).reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);
        const issues = amount("ISSUE");
        const labor = amount("LABOR");
        const overhead = amount("OVERHEAD");
        const receipts = Math.abs(amount("RECEIPT"));
        return [order.orderNo, order.item?.sku, order.item?.name, issues, labor, overhead, receipts, issues + labor + overhead - receipts];
      },
    };
  }
  if (module === "wip-ledger") {
    if (filters.productionOrderId) where.productionOrderId = String(filters.productionOrderId); if (dateRange) where.postedAt = dateRange;
    return { delegate: (prisma as any).wipLedger, where, orderBy: { postedAt: "desc" }, include: { productionOrder: { select: { orderNo: true } }, item: { select: { sku: true, name: true } } }, headers: ["Date", "Production Order", "Type", "Item SKU", "Item", "Quantity", "Unit Cost", "Amount", "Reference Type", "Note"], row: (r: any) => [r.postedAt, r.productionOrder?.orderNo, r.type, r.item?.sku, r.item?.name, r.qty, r.unitCost, r.amount, r.refType, r.note] };
  }
  if (module === "assets") {
    if (status) where.status = status; if (filters.categoryId) where.categoryId = String(filters.categoryId); if (filters.locationId) where.locationId = String(filters.locationId); if (search) where.OR = [{ assetNo: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }];
    return { delegate: (prisma as any).asset, where, orderBy: { assetNo: "asc" }, include: { category: { select: { code: true, name: true } }, location: { select: { code: true, name: true } } }, headers: ["Asset No", "Name", "Category Code", "Category", "Location", "Acquisition Date", "Cost", "Residual Value", "Useful Life", "Depreciation Method", "Status"], row: (r: any) => [r.assetNo, r.name, r.category?.code, r.category?.name, r.location?.name, r.acquisitionDate, r.acquisitionCost, r.residualValue, r.usefulLife, r.depreciationMethod, r.status] };
  }
  if (module === "asset-categories") return { delegate: (prisma as any).assetCategory, where: {}, orderBy: { code: "asc" }, include: {}, headers: ["Code", "Name", "Description", "Depreciation Method", "Useful Life", "Residual Value", "Active"], row: (r: any) => [r.code, r.name, r.description, r.depreciationMethod, r.usefulLife, r.residualValue, r.isActive ? "Active" : "Inactive"] };
  if (module === "asset-depreciation") { if (filters.assetId) where.assetId = String(filters.assetId); return { delegate: (prisma as any).assetDepreciation, where, orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }], include: { asset: { select: { assetNo: true, name: true } } }, headers: ["Asset No", "Asset", "Year", "Month", "Depreciation", "Accumulated Depreciation", "Net Book Value", "Posted", "Posted Date"], row: (r: any) => [r.asset?.assetNo, r.asset?.name, r.periodYear, r.periodMonth, r.depreciationAmount, r.accumulatedDepreciation, r.netBookValue, r.isPosted ? "Posted" : "Calculated", r.postedAt] }; }
  if (module === "users") return { delegate: (prisma as any).user, where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}, orderBy: { name: "asc" }, include: { userRoles: { include: { role: { select: { name: true } } } } }, headers: ["Name", "Email", "Status", "Roles", "Created", "Last Login"], row: (r: any) => [r.name, r.email, r.status, r.userRoles?.map((x: any) => x.role.name).join("; "), r.createdAt, r.lastLoginAt] };
  if (module === "roles") return { delegate: (prisma as any).role, where: {}, orderBy: { name: "asc" }, include: { rolePermissions: { include: { permission: { select: { name: true } } } } }, headers: ["Role", "Description", "Permissions", "Created"], row: (r: any) => [r.name, r.description, r.rolePermissions?.map((x: any) => x.permission.name).join("; "), r.createdAt] };
  if (module === "fiscal-years") return { delegate: (prisma as any).fiscalYear, where: {}, orderBy: { year: "desc" }, include: {}, headers: ["Year", "Start Date", "End Date", "Active"], row: (r: any) => [r.year, r.startDate, r.endDate, r.isActive ? "Active" : "Inactive"] };
  if (module === "fiscal-periods") { if (filters.fiscalYearId) where.fiscalYearId = String(filters.fiscalYearId); return { delegate: (prisma as any).fiscalPeriod, where, orderBy: { startDate: "asc" }, include: { fiscalYear: { select: { year: true } } }, headers: ["Fiscal Year", "Period", "Period Number", "Start Date", "End Date", "Active", "Closed"], row: (r: any) => [r.fiscalYear?.year, r.name, r.periodNumber, r.startDate, r.endDate, r.isActive ? "Active" : "Inactive", r.isClosed ? "Closed" : "Open"] }; }
  if (module === "approval-workflows") return { delegate: (prisma as any).approvalWorkflow, where: {}, orderBy: { name: "asc" }, include: { steps: { include: { role: { select: { name: true } } } } }, headers: ["Name", "Entity", "Active", "Min Amount", "Max Amount", "Steps"], row: (r: any) => [r.name, r.entity, r.isActive ? "Active" : "Inactive", r.minAmount, r.maxAmount, r.steps?.map((s: any) => `${s.stepOrder}:${s.name} (${s.role?.name})`).join("; ")] };
  if (module === "approval-requests") return { delegate: (prisma as any).approvalRequest, where: {}, orderBy: { createdAt: "desc" }, include: { workflow: { select: { name: true } } }, headers: ["Created", "Workflow", "Entity Type", "Entity ID", "Status", "Completed"], row: (r: any) => [r.createdAt, r.workflow?.name, r.entityType, r.entityId, r.status, r.completedAt] };
  if (module === "journals") {
    if (dateRange) where.date = dateRange; if (search) where.OR = [{ journalNo: { contains: search, mode: "insensitive" } }, { memo: { contains: search, mode: "insensitive" } }];
    return { delegate: (prisma as any).journal, where, orderBy: { date: "desc" }, include: { postedByUser: { select: { name: true } }, journalLines: { include: { account: { select: { code: true, name: true } } } } }, headers: ["Journal No", "Date", "Memo", "Posted By", "Lines"], row: (r: any) => [r.journalNo, r.date, r.memo, r.postedByUser?.name, JSON.stringify(r.journalLines?.map((x: any) => ({ account: x.account?.code, name: x.account?.name, debit: x.debit, credit: x.credit, refType: x.refType })) || [])] };
  }
  if (module === "memos") {
    where.status = { not: "REVERSED" }; if (filters.type) where.memoType = String(filters.type); if (filters.moduleType) where.module = String(filters.moduleType); if (filters.partyType === "CUSTOMER") where.customerId = { not: null }; if (filters.partyType === "VENDOR") where.vendorId = { not: null }; if (status) where.status = status; if (dateRange) where.date = dateRange;
    return { delegate: (prisma as any).memo, where, orderBy: { date: "desc" }, include: { customer: { select: { code: true, name: true } }, vendor: { select: { code: true, name: true } } }, headers: ["Memo No", "Date", "Module", "Type", "Category", "Customer", "Vendor", "Amount", "Remaining", "Status", "Description"], row: (r: any) => [r.memoNo, r.date, r.module, r.memoType, r.category, r.customer?.name, r.vendor?.name, r.amount, r.remaining, r.status, r.description] };
  }
  if (module === "audit-logs") {
    if (filters.userId) where.userId = String(filters.userId); if (filters.action) where.action = String(filters.action); if (filters.entity) where.entity = String(filters.entity); if (dateRange) where.createdAt = dateRange;
    return { delegate: (prisma as any).auditLog, where, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } }, headers: ["Date", "User", "Email", "Action", "Entity", "Entity ID", "IP Address", "Metadata"], row: (r: any) => [r.createdAt, r.user?.name, r.user?.email, r.action, r.entity, r.entityId, r.ipAddress, JSON.stringify(r.metadataJson)] };
  }
  const masterConfig: Record<string, any> = {
    customers: { delegate: (prisma as any).customer, orderBy: { code: "asc" }, include: { customerGroup: { select: { name: true } } }, headers: ["Code", "Name", "Email", "Phone", "Address", "Credit Limit", "Group", "Active"], row: (r: any) => [r.code, r.name, r.email, r.phone, r.address, r.creditLimit, r.customerGroup?.name, r.isActive ? "Active" : "Inactive"] },
    vendors: { delegate: (prisma as any).vendor, orderBy: { code: "asc" }, include: {}, headers: ["Code", "Name", "Email", "Phone", "Address", "Active"], row: (r: any) => [r.code, r.name, r.email, r.phone, r.address, r.isActive ? "Active" : "Inactive"] },
    "customer-groups": { delegate: (prisma as any).customerGroup, orderBy: { name: "asc" }, include: {}, headers: ["Code", "Name", "Description", "Active"], row: (r: any) => [r.code, r.name, r.description, r.isActive ? "Active" : "Inactive"] },
    warehouses: { delegate: (prisma as any).warehouse, orderBy: { code: "asc" }, include: {}, headers: ["Code", "Name", "Address", "Active"], row: (r: any) => [r.code, r.name, r.address, r.isActive ? "Active" : "Inactive"] },
    locations: { delegate: (prisma as any).location, orderBy: { code: "asc" }, include: {}, headers: ["Code", "Name", "Address", "City", "State", "Country", "Active"], row: (r: any) => [r.code, r.name, r.address, r.city, r.state, r.country, r.isActive ? "Active" : "Inactive"] },
    uoms: { delegate: (prisma as any).uOM, orderBy: { code: "asc" }, include: {}, headers: ["Code", "Name", "Created"], row: (r: any) => [r.code, r.name, r.createdAt] },
    "chart-of-accounts": { delegate: (prisma as any).chartOfAccount, orderBy: { code: "asc" }, include: { parent: { select: { code: true, name: true } } }, headers: ["Code", "Name", "Account Type", "Parent Account", "Description", "Active"], row: (r: any) => [r.code, r.name, r.accountType, r.parent?.code, r.description, r.isActive ? "Active" : "Inactive"] },
    "cash-accounts": { delegate: (prisma as any).cashAccount, orderBy: { code: "asc" }, include: {}, headers: ["Code", "Name", "Account Type", "Account Number", "Bank", "Balance", "Active"], row: (r: any) => [r.code, r.name, r.accountType, r.accountNumber, r.bankName, r.balance, r.isActive ? "Active" : "Inactive"] },
    boms: { delegate: (prisma as any).bom, orderBy: { createdAt: "desc" }, include: { item: { select: { sku: true, name: true } }, bomLines: { include: { componentItem: { select: { sku: true, name: true } } } } }, headers: ["Finished Item SKU", "Finished Item", "Version", "Active", "Materials"], row: (r: any) => [r.item?.sku, r.item?.name, r.version, r.isActive ? "Active" : "Inactive", JSON.stringify(r.bomLines?.map((x: any) => ({ sku: x.componentItem?.sku, name: x.componentItem?.name, qty: x.qtyPer, scrap: x.scrapPercent })) || [])] },
  };
  if (masterConfig[module]) {
    const config = masterConfig[module];
    if (module === "warehouses") where.isActive = true;
    if (module === "chart-of-accounts" && filters.accountType) where.accountType = String(filters.accountType);
    if (module === "cash-accounts" && filters.accountType) where.accountType = String(filters.accountType);
    if (module === "boms" && search) where.item = { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] };
    if (search && module !== "boms") where.OR = [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }];
    return { ...config, where };
  }
  if (status) where.status = status;
  if (cashAccountId) where.cashAccountId = cashAccountId;
  if (dateRange) where.transactionDate = dateRange;
  if (search) where.OR = [{ transactionNo: { contains: search, mode: "insensitive" } }, { reference: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }];
  where.transactionType = { not: "REFUND" };
  return { delegate: (prisma as any).cashTransaction, where, orderBy: { transactionDate: "desc" }, include: { cashAccount: { select: { code: true, name: true } } }, headers: ["Transaction No", "Date", "Cash Account Code", "Cash Account", "Type", "Status", "Amount", "Reference Type", "Reference", "Description"], row: (r: any) => [r.transactionNo, r.transactionDate, r.cashAccount?.code, r.cashAccount?.name, r.transactionType, r.status, r.amount, r.refType, r.reference, r.description] };
}

function purgeOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      if (job.filePath) void fs.unlink(job.filePath).catch(() => undefined);
      void fs.unlink(path.join(EXPORT_DIR, `${id}.json`)).catch(() => undefined);
      jobs.delete(id);
    }
  }
}

async function writeExport(job: ExportJob, config: ReturnType<typeof makeConfig>) {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const filePath = path.join(EXPORT_DIR, `${job.id}.csv`);
  job.status = "processing";
  await saveJob(job);
  const stream = createWriteStream(filePath, { encoding: "utf8" });
  const write = (chunk: string) => new Promise<void>((resolve, reject) => {
    if (stream.write(chunk)) resolve();
    else stream.once("drain", resolve);
    stream.once("error", reject);
  });
  try {
    await write("\uFEFF" + config.headers.map(escapeCsv).join(",") + "\r\n");
    for (let skip = 0; skip < job.total; skip += CHUNK_SIZE) {
      const rows = await config.delegate.findMany({ where: config.where, include: config.include, orderBy: config.orderBy, skip, take: CHUNK_SIZE });
      const body = rows.map((r: any) => config.row(r).map(escapeCsv).join(",")).join("\r\n");
      if (body) await write(body + "\r\n");
      job.progress = Math.min(job.total, skip + rows.length);
      await saveJob(job);
    }
    await new Promise<void>((resolve, reject) => stream.end(resolve).once("error", reject));
    job.filePath = filePath;
    job.status = "completed";
    await saveJob(job);
  } catch (error) {
    stream.destroy();
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }
}

async function saveJob(job: ExportJob) {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const target = path.join(EXPORT_DIR, `${job.id}.json`);
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(job), "utf8");
  await fs.rename(temporary, target);
}

async function getJob(id: string): Promise<ExportJob | undefined> {
  const inMemory = jobs.get(id);
  if (inMemory) return inMemory;
  try {
    const serialized = JSON.parse(await fs.readFile(path.join(EXPORT_DIR, `${id}.json`), "utf8")) as ExportJob;
    if (serialized.id !== id || !serialized.ownerId || !Number.isFinite(serialized.createdAt)) return undefined;
    if (Date.now() - serialized.createdAt > JOB_TTL_MS) {
      if (serialized.filePath) await fs.unlink(serialized.filePath).catch(() => undefined);
      await fs.unlink(path.join(EXPORT_DIR, `${id}.json`)).catch(() => undefined);
      return undefined;
    }
    // Only completed jobs can survive a server restart; there is no worker to resume an interrupted job.
    if (serialized.status === "queued" || serialized.status === "processing") {
      serialized.status = "failed";
      serialized.error = "Export was interrupted by a server restart. Please start it again.";
      await saveJob(serialized);
    }
    jobs.set(id, serialized);
    return serialized;
  } catch {
    return undefined;
  }
}

export class ExportsController {
  async create(req: AuthRequest, res: Response) {
    purgeOldJobs();
    const { module, mode, filters = {} } = req.body || {};
    const supportedModules = Object.keys(roleAccess);
    if (typeof module !== "string" || !supportedModules.includes(module)) return res.status(400).json({ error: "Unsupported export module" });
    const exportModule = module as ExportModule;
    const roles = req.user?.roles || [];
    if (!canExport(roles)) return res.status(403).json({ error: "You do not have access to export this data" });
    try {
      const config = makeConfig(exportModule, filters);
      if (exportModule === "sales" && !["Senior Accountant", "General Manager", "Manager", "Auditor", "Accountant"].some((role) => roles.includes(role))) {
        config.where.preparedBy = req.user!.id;
      }
      if (exportModule === "pos-sales" && !["Senior Accountant", "Manager", "General Manager"].some((role) => roles.includes(role))) {
        const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { warehouseId: true } });
        if (user?.warehouseId) config.where.warehouseId = user.warehouseId;
      }
      if (exportModule === "warehouses" && !["General Manager", "CFO"].some((role) => roles.includes(role))) {
        const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { warehouseId: true } });
        if (user?.warehouseId) config.where.id = user.warehouseId;
      }
      const total = await config.delegate.count({ where: config.where });
      if (total > NORMAL_EXPORT_LIMIT && mode === "normal") return res.status(413).json({ error: `This export contains ${total.toLocaleString()} rows. Use Large export to continue.`, total, normalLimit: NORMAL_EXPORT_LIMIT });
      if (mode === "normal") {
        const rows = await config.delegate.findMany({ where: config.where, include: config.include, orderBy: config.orderBy, skip: 0, take: NORMAL_EXPORT_LIMIT });
        const csv = [config.headers.map(escapeCsv).join(","), ...rows.map((r: any) => config.row(r).map(escapeCsv).join(","))].join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${exportModule}-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send("\uFEFF" + csv);
      }
      const job: ExportJob = { id: randomUUID(), ownerId: req.user!.id, status: "queued", progress: 0, total, createdAt: Date.now() };
      jobs.set(job.id, job);
      await saveJob(job);
      void writeExport(job, config).catch((error) => { job.status = "failed"; job.error = "Export generation failed"; void saveJob(job); console.error("Export generation failed", error); });
      return res.status(202).json({ jobId: job.id, total, status: job.status });
    } catch (error) {
      console.error("Create export error", error);
      return res.status(500).json({ error: "Could not start export" });
    }
  }

  async status(req: AuthRequest, res: Response) {
    purgeOldJobs();
    if (!canExport(req.user?.roles)) return res.status(403).json({ error: "You do not have access to export this data" });
    const job = await getJob(req.params.id);
    if (!job || job.ownerId !== req.user?.id) return res.status(404).json({ error: "Export job not found" });
    res.json({ jobId: job.id, status: job.status, progress: job.progress, total: job.total, error: job.error });
  }

  async download(req: AuthRequest, res: Response) {
    purgeOldJobs();
    if (!canExport(req.user?.roles)) return res.status(403).json({ error: "You do not have access to export this data" });
    const job = await getJob(req.params.id);
    if (!job || job.ownerId !== req.user?.id) return res.status(404).json({ error: "Export job not found" });
    if (job.status !== "completed" || !job.filePath) return res.status(409).json({ error: "Export is not ready" });
    res.download(job.filePath, `profitpilot-export-${new Date(job.createdAt).toISOString().slice(0, 10)}.csv`);
  }
}
