import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { ReportsService } from "../services/reports";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
const reportsService = new ReportsService();

export class DashboardController {
  async getExecutiveSummary(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date();

      const [
        regularSales,
        posSales,
        receivables,
        payables,
        vendorPayments,
        operationalPayments,
        cashInflows,
        profitLoss,
      ] = await Promise.all([
        prisma.sale.aggregate({
          where: {
            status: { in: ["INVOICED", "PAID"] },
            orderDate: { gte: startDate, lte: endDate },
          },
          _sum: { totalAmount: true },
        }),

        prisma.posSale.aggregate({
          where: {
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { totalAmount: true },
        }),

        prisma.sale.aggregate({
          where: {
            status: "INVOICED",
          },
          _sum: { totalAmount: true },
        }),

        prisma.purchase.aggregate({
          where: {
            status: {
              in: ["INVOICED", "PARTIALLY_PAID"],
            },
          },
          _sum: {
            balanceAmount: true,
          },
        }),

        prisma.vendorPayment.aggregate({
          where: {
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),

        prisma.cashTransaction.aggregate({
          where: {
            transactionType: "PAYMENT",
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        prisma.cashTransaction.aggregate({
          where: {
            transactionType: "RECEIPT",
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        reportsService.getProfitAndLoss(startDate, endDate),
      ]);

      const revenue =
        Number(regularSales._sum.totalAmount || 0) +
        Number(posSales._sum.totalAmount || 0);

      const expenses =
        Number(vendorPayments._sum.totalAmount || 0) +
        Number(operationalPayments._sum.amount || 0);

      const inflow = Number(cashInflows._sum.amount || 0);
      const outflow = Number(operationalPayments._sum.amount || 0);

      res.json({
        revenue,
        receivables: Number(receivables._sum.totalAmount || 0),
        payables: Number(payables._sum.balanceAmount || 0),
        expenses,
        cashInflow: inflow,
        cashOutflow: outflow,
        netCashFlow: inflow - outflow,
        grossProfit: profitLoss.grossProfit,
        netProfit: profitLoss.netIncome,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch executive summary" });
    }
  }

  async getTopProducts(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date();

      const topProducts = await prisma.$queryRaw`
          SELECT
            i.name AS itemName,
            SUM(CASE WHEN sl.id IS NOT NULL THEN sl.qty ELSE 0 END) +
            SUM(CASE WHEN psl.id IS NOT NULL THEN psl.qty ELSE 0 END) AS qtySold,
            SUM(CASE WHEN sl.id IS NOT NULL THEN sl."lineTotal" ELSE 0 END) +
            SUM(CASE WHEN psl.id IS NOT NULL THEN psl."lineTotal" ELSE 0 END) AS revenue
          FROM items i
          LEFT JOIN sale_lines sl ON sl."itemId" = i.id
          LEFT JOIN sales s ON s.id = sl."saleId" AND s.status IN ('INVOICED', 'PAID') AND s."orderDate" >= ${startDate} AND s."orderDate" <= ${endDate}
          LEFT JOIN pos_sale_lines psl ON psl."itemId" = i.id
          LEFT JOIN pos_sales ps ON ps.id = psl."posSaleId" AND ps.status = 'COMPLETED' AND ps."createdAt" >= ${startDate} AND ps."createdAt" <= ${endDate}
          GROUP BY i.id
          ORDER BY revenue DESC
          LIMIT 5;
        `;

      res.json(topProducts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch top products" });
    }
  }

  async getTopCustomers(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date();
      const topCustomers = await prisma.$queryRaw`
  SELECT
    c.name AS "customerName",

    COALESCE(
      SUM(
        CASE
          WHEN s.status IN ('INVOICED', 'PAID')
          AND s."orderDate" >= ${startDate}
          AND s."orderDate" <= ${endDate}
          THEN s."totalAmount"
          ELSE 0
        END
      ),
      0
    )::numeric AS "totalPurchased",

    COALESCE(
      SUM(
        CASE
          WHEN s.status = 'INVOICED'
          THEN s."totalAmount"
          ELSE 0
        END
      ),
      0
    )::numeric AS "outstandingBalance"

  FROM customers c
  LEFT JOIN sales s
    ON s."customerId" = c.id

  GROUP BY c.id, c.name
  ORDER BY "totalPurchased" DESC
  LIMIT 5
`;

      // console.log(topCustomers);
      res.json(topCustomers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch top customers" });
    }
  }

  async getExpenseBreakdown(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date();
      const breakdown = await prisma.$queryRaw`
  SELECT 
    category,
    SUM(amount) as amount
  FROM (
    
    -- Operational payments from cash transactions
    SELECT
      gla.name AS category,
      ctl."lineAmount" AS amount
    FROM cash_transaction_lines ctl
    JOIN chart_of_accounts gla 
      ON gla.id = ctl."glAccountId"
    JOIN cash_transactions ct 
      ON ct.id = ctl."cashTransactionId"
    WHERE 
      ct."transactionType" = 'PAYMENT'
      AND ct."transactionDate" >= ${startDate}
      AND ct."transactionDate" <= ${endDate}

    UNION ALL

    -- Vendor payments
    SELECT
      gla.name AS category,
      vpl."lineAmount" AS amount
    FROM vendor_payment_lines vpl
    JOIN chart_of_accounts gla 
      ON gla.id = vpl."glAccountId"
    JOIN vendor_payments vp 
      ON vp.id = vpl."vendorPaymentId"
    WHERE
      vp."paymentDate" >= ${startDate}
      AND vp."paymentDate" <= ${endDate}

  ) combined_expenses
  GROUP BY category
  ORDER BY amount DESC;
`;
      // console.log(breakdown);

      res.json(breakdown);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch expense breakdown" });
    }
  }

  async getAlerts(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      // console.log("Fetching alerts for date range:", oneMonthAgo, "to", now);
      const lowStockItems = await prisma.$queryRaw`
  SELECT
    i.name AS "itemName",
    i.sku,
    w.name AS "warehouseName",
    latest."runningQty" AS quantity,
    i."minimumStockLevel"
  FROM (
    SELECT DISTINCT ON ("itemId", "warehouseId")
      "itemId",
      "warehouseId",
      "runningQty",
      "postedAt"
    FROM inventory_ledger
    ORDER BY "itemId", "warehouseId", "postedAt" DESC
  ) latest
  JOIN items i 
    ON i.id = latest."itemId"
  JOIN warehouses w 
    ON w.id = latest."warehouseId"
  WHERE 
    latest."runningQty" <= COALESCE(i."minimumStockLevel", 0)
    AND i."isActive" = true
  ORDER BY latest."runningQty" ASC
  limit 10;
`;
      const overdueReceivables = await prisma.$queryRaw`
        SELECT
          c.name AS customerName,
          c.code as customerCode,
          s."totalAmount" AS outstandingAmount,
          s."orderDate" as orderDate
        FROM sales s
        JOIN customers c ON c.id = s."customerId"
        WHERE s.status = 'INVOICED' AND s."orderDate" <= ${oneMonthAgo}
      Order By outstandingAmount desc
        limit 10 
      `;

      const pendingPurchases = await prisma.$queryRaw`
        SELECT  
          v.name AS vendorName,
          p."totalAmount" AS pendingAmount
        FROM purchases p
        JOIN vendors v ON v.id = p."vendorId"
        WHERE p.status = 'ORDERED'
      `;

      const pendingProductionOrders = await prisma.$queryRaw`
        SELECT  
          po."orderNo" AS orderNumber,
          SUM(po."qtyTarget") AS totalQuantity
        FROM production_orders po
        WHERE po.status = 'PLANNED' OR po.status = 'RELEASED'
        GROUP BY orderNumber
      `;
      res.json({
        lowStockItems,
        overdueReceivables,
        pendingPurchases,
        pendingProductionOrders,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  }
}
