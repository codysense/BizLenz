import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  createPosSessionSchema,
  closePosSessionSchema,
  createPosSaleSchema,
  createPosReturnSchema,
} from "../types/pos";
import { AuthRequest } from "../middleware/auth";
import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";
import { nextDocumentNumber } from "../services/documentNumbers";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();

interface PendingSaleLineInput {
  itemId: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
}

interface PendingPaymentInput {
  method: string;
  cashAccountId?: string;
  amount: number;
}

interface CreatePendingSaleInput {
  id?: string; // Optional: If updating an existing paused sale
  sessionId: string;
  customerId?: string;
  saleLines: PendingSaleLineInput[];
  subtotal: number;
  totalAmount: number;
  payments: PendingPaymentInput[];
  totalPaid: number;
  changeAmount: number;
  notes?: string;
}

export class PosController {
  // POS Sessions
  async createSession(req: AuthRequest, res: Response) {
    try {
      const validatedData = createPosSessionSchema.parse(req.body);

      // Check if user has an open session
      const openSession = await prisma.posSession.findFirst({
        where: {
          userId: req.user!.id,
          status: "OPEN",
        },
      });

      if (openSession) {
        return res
          .status(400)
          .json({ error: "You already have an open POS session" });
      }

      const session = await prisma.$transaction(
        async (tx) => {
          const sessionNo = await nextDocumentNumber(tx, "pos_document", "POS");
          return await tx.posSession.create({
            data: {
              sessionNo,
              user: {
                connect: { id: req.user!.id },
              },
              warehouse: {
                connect: { id: validatedData.warehouseId },
              },
              // userId: req.user!.id,
              // warehouseId: validatedData.warehouseId,
              // cashAccountId: validatedData.cashAccountId,
              // openingBalance: new Decimal(validatedData.openingBalance)
            },
          });
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json(session);
    } catch (error) {
      console.error("Create POS session error:", error);
      res.status(400).json({ error: "Failed to create POS session" });
    }
  }

  async closeSession(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = closePosSessionSchema.parse(req.body);

      const session = await prisma.posSession.update({
        where: { id },
        data: {
          closingBalance: new Decimal(validatedData.closingBalance),
          closedAt: new Date(),
          status: "CLOSED",
        },
      });

      res.json(session);
    } catch (error) {
      console.error("Close POS session error:", error);
      res.status(400).json({ error: "Failed to close POS session" });
    }
  }

  async getCurrentSession(req: AuthRequest, res: Response) {
    try {
      const session = await prisma.posSession.findFirst({
        where: {
          userId: req.user!.id,
          status: "OPEN",
        },
        include: {
          warehouse: { select: { code: true, name: true } },
          cashAccount: { select: { code: true, name: true } },
        },
      });

      res.json({ session });
    } catch (error) {
      console.error("Get current session error:", error);
      res.status(500).json({ error: "Failed to fetch current session" });
    }
  }

  // POS Sales
  // async createSale(req: AuthRequest, res: Response) {
  //   try {
  //     const validatedData = createPosSaleSchema.parse(req.body);

  //     const sale = await prisma.$transaction(
  //       async (tx) => {
  //         // Generate sale number
  //         const count = await tx.posSale.count();
  //         const saleNo = `POS${String(count + 1).padStart(8, "0")}`;

  //         // Get session details
  //         const session = await tx.posSession.findUnique({
  //           where: { id: validatedData.sessionId },
  //         });

  //         if (!session || session.status !== "OPEN") {
  //           throw new Error("Invalid or closed POS session");
  //         }

  //         // Create POS sale
  //         const newSale = await tx.posSale.create({
  //           data: {
  //             saleNo,
  //             sessionId: validatedData.sessionId,
  //             customerId: validatedData.customerId,
  //             warehouseId: session.warehouseId,
  //             cashAccountId: validatedData.cashAccountId,
  //             subtotal: new Decimal(validatedData.subtotal),
  //             taxAmount: new Decimal(validatedData.taxAmount),
  //             discountAmount: new Decimal(validatedData.discountAmount),
  //             totalAmount: new Decimal(validatedData.totalAmount),
  //             amountPaid: new Decimal(validatedData.amountPaid),
  //             changeAmount: new Decimal(validatedData.changeAmount),
  //             paymentMethod: validatedData.paymentMethod,
  //             notes: validatedData.notes,
  //             userId: req.user!.id,
  //           },
  //         });

  //         // Create sale lines and issue inventory
  //         for (const line of validatedData.saleLines) {
  //           await tx.posSaleLine.create({
  //             data: {
  //               posSaleId: newSale.id,
  //               itemId: line.itemId,
  //               qty: new Decimal(line.qty),
  //               unitPrice: new Decimal(line.unitPrice),
  //               discountPercent: new Decimal(line.discountPercent),
  //               lineTotal: new Decimal(
  //                 line.qty * line.unitPrice * (1 - line.discountPercent / 100)
  //               ),
  //             },
  //           });

  //           // Issue inventory
  //           await costingService.issueInventory(
  //             line.itemId,
  //             session.warehouseId,
  //             line.qty,
  //             "POS_SALE",
  //             newSale.id,
  //             req.user!.id
  //           );
  //         }

  //         // Update session totals
  //         await tx.posSession.update({
  //           where: { id: validatedData.sessionId },
  //           data: {
  //             totalSales: {
  //               increment: validatedData.totalAmount,
  //             },
  //           },
  //         });

  //         // Update cash account balance
  //         await tx.cashAccount.update({
  //           where: { id: validatedData.cashAccountId },
  //           data: {
  //             balance: {
  //               increment: validatedData.totalAmount,
  //             },
  //           },
  //         });

  //         // Create cash transaction
  //         const cashTransactionCount = await tx.cashTransaction.count();
  //         const transactionNo = `CT${String(cashTransactionCount + 1).padStart(
  //           6,
  //           "0"
  //         )}`;

  //         await tx.cashTransaction.create({
  //           data: {
  //             transactionNo,
  //             cashAccountId: validatedData.cashAccountId,
  //             transactionType: "RECEIPT",
  //             amount: new Decimal(validatedData.totalAmount),
  //             description: `POS Sale: ${saleNo}`,
  //             transactionDate: new Date(),
  //             reference: saleNo,
  //             refType: "POS_SALE",
  //             refId: newSale.id,
  //             userId: req.user!.id,
  //             preparedBy: req.user!.id,
  //           },
  //         });

  //         // Post to general ledger
  //         const totalCogs = await calculateCogs(
  //           validatedData.saleLines,
  //           session.warehouseId
  //         );

  //         await glService.postJournal(
  //           [
  //             {
  //               accountCode: "1100",
  //               debit: validatedData.totalAmount,
  //               credit: 0,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //             {
  //               accountCode: "4000",
  //               debit: 0,
  //               credit: validatedData.totalAmount,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //             {
  //               accountCode: "5000",
  //               debit: totalCogs,
  //               credit: 0,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //             {
  //               accountCode: "1350",
  //               debit: 0,
  //               credit: totalCogs,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //           ],
  //           `POS Sale: ${saleNo}`,
  //           req.user!.id
  //         );

  //         return newSale;
  //       },
  //       {
  //         maxWait: 5000, // 5s wait for connection
  //         timeout: 20000, // 20s max runtime
  //       }
  //     );

  //     res.status(201).json(sale);
  //   } catch (error) {
  //     console.error("Create POS sale error:", error);
  //     res.status(400).json({ error: "Failed to create POS sale" });
  //   }
  // }

  // async createSale(req: AuthRequest, res: Response) {
  //   try {
  //     const validatedData = createPosSaleSchema.parse(req.body);

  //     const sale = await prisma.$transaction(async (tx) => {
  //       /* ---------------- SALE NUMBER ---------------- */
  //       const count = await tx.posSale.count();
  //       const saleNo = `POS${String(count + 1).padStart(8, "0")}`;

  //       /* ---------------- SESSION ---------------- */
  //       const session = await tx.posSession.findUnique({
  //         where: { id: validatedData.sessionId },
  //       });

  //       if (!session || session.status !== "OPEN") {
  //         throw new Error("Invalid or closed POS session");
  //       }

  //       /* ---------------- RE-CALCULATE TOTALS ---------------- */
  //       const subtotal = validatedData.saleLines.reduce((sum, l) => {
  //         const lineTotal = l.qty * l.unitPrice;
  //         const discount = (lineTotal * (l.discountPercent || 0)) / 100;
  //         return sum + (lineTotal - discount);
  //       }, 0);

  //       const totalPaid = validatedData.payments.reduce(
  //         (sum, p) => sum + p.amount,
  //         0,
  //       );

  //       if (totalPaid < subtotal) {
  //         throw new Error("Total payment is less than sale amount");
  //       }

  //       const changeAmount = totalPaid - subtotal;

  //       /* ---------------- CREATE SALE ---------------- */
  //       const newSale = await tx.posSale.create({
  //         data: {
  //           saleNo,
  //           sessionId: validatedData.sessionId,
  //           customerId: validatedData.customerId,
  //           warehouseId: session.warehouseId,
  //           // cashAccountId: validatedData.cashAccountId,
  //           subtotal: new Decimal(subtotal),
  //           taxAmount: new Decimal(validatedData.taxAmount),
  //           discountAmount: new Decimal(validatedData.discountAmount),
  //           totalAmount: new Decimal(subtotal),
  //           amountPaid: new Decimal(totalPaid),
  //           changeAmount: new Decimal(changeAmount),
  //           notes: validatedData.notes,
  //           userId: req.user!.id,
  //         },
  //       });

  //       /* ---------------- SALE LINES + INVENTORY ---------------- */
  //       for (const line of validatedData.saleLines) {
  //         const costPrice = await costingService.getInventoryValue(
  //           line.itemId,
  //           session.warehouseId,
  //         );

  //         await tx.posSaleLine.create({
  //           data: {
  //             posSaleId: newSale.id,
  //             itemId: line.itemId,
  //             qty: new Decimal(line.qty),
  //             unitPrice: new Decimal(line.unitPrice),
  //             costPrice: new Decimal(Number(costPrice)),
  //             discountPercent: new Decimal(line.discountPercent),
  //             lineTotal: new Decimal(
  //               line.qty * line.unitPrice * (1 - line.discountPercent / 100),
  //             ),
  //           },
  //         });

  //         await costingService.issueInventory(
  //           line.itemId,
  //           session.warehouseId,
  //           line.qty,
  //           "POS_SALE",
  //           newSale.id,
  //           req.user!.id,
  //         );
  //       }

  //       /* ---------------- SESSION TOTAL ---------------- */
  //       await tx.posSession.update({
  //         where: { id: validatedData.sessionId },
  //         data: {
  //           totalSales: { increment: subtotal },
  //         },
  //       });

  //       /* ---------------- PAYMENTS ---------------- */
  //       const glEntries: any[] = [];

  //       for (const payment of validatedData.payments) {
  //         // Update account balance
  //         await tx.cashAccount.update({
  //           where: { id: payment.cashAccountId },
  //           data: {
  //             balance: { increment: payment.amount },
  //           },
  //         });

  //         // Cash transaction
  //         const ctCount = await tx.cashTransaction.count();
  //         const transactionNo = `CT${String(ctCount + 1).padStart(6, "0")}`;

  //         await tx.cashTransaction.create({
  //           data: {
  //             transactionNo,
  //             cashAccountId: payment.cashAccountId,
  //             transactionType: "RECEIPT",
  //             amount: new Decimal(payment.amount),
  //             description: `POS Sale: ${saleNo}`,
  //             transactionDate: new Date(),
  //             reference: saleNo,
  //             refType: "POS_SALE",
  //             refId: newSale.id,
  //             userId: req.user!.id,
  //             preparedBy: req.user!.id,
  //           },
  //         });

  //         // GL Debit per payment
  //         glEntries.push({
  //           accountCode: 1100,
  //           debit: payment.amount,
  //           credit: 0,
  //           refType: "POS_SALE",
  //           refId: newSale.id,
  //         });
  //       }

  //       /* ---------------- GL CREDIT SALES ---------------- */
  //       glEntries.push({
  //         accountCode: "4000",
  //         debit: 0,
  //         credit: subtotal,
  //         refType: "POS_SALE",
  //         refId: newSale.id,
  //       });

  //       /* ---------------- COGS ---------------- */
  //       const totalCogs = await calculateCogs(
  //         validatedData.saleLines,
  //         session.warehouseId,
  //       );

  //       glEntries.push(
  //         {
  //           accountCode: "5000",
  //           debit: totalCogs,
  //           credit: 0,
  //           refType: "POS_SALE",
  //           refId: newSale.id,
  //         },
  //         {
  //           accountCode: "1350",
  //           debit: 0,
  //           credit: totalCogs,
  //           refType: "POS_SALE",
  //           refId: newSale.id,
  //         },
  //       );

  //       await glService.postJournal(
  //         glEntries,
  //         `POS Sale: ${saleNo}`,
  //         req.user!.id,
  //       );

  //       return newSale;
  //     });

  //     res.status(201).json(sale);
  //   } catch (error) {
  //     console.error("Create POS sale error:", error);
  //     res.status(400).json({ error: "Failed to create POS sale" });
  //   }
  // }

  async createSale(req: AuthRequest, res: Response) {
    try {
      // 1. VALIDATE INPUT (NO TOTALS FROM FRONTEND)

      const input = createPosSaleSchema.parse(req.body);

      //console.log("Validated POS sale input:", input);

      const sale = await prisma.$transaction(
        async (tx) => {
          // 2. VALIDATE SESSION

          const session = await tx.posSession.findUnique({
            where: { id: input.sessionId },
          });

          if (!session || session.status !== "OPEN") {
            throw new Error("Invalid or closed POS session");
          }

          // 3. GENERATE SALE NUMBER (SAFE ENOUGH FOR NOW)

          const saleNo = await nextDocumentNumber(tx, "pos_document", "POS", 8);

          // 4. RE-CALCULATE TOTALS (BACKEND AUTHORITY)

          let subtotal = 0;

          for (const line of input.saleLines) {
            const qty = Number(line.qty);
            const unitPrice = Number(line.unitPrice);
            const discountPercent = Number(line.discountPercent ?? 0);

            if (
              Number.isNaN(qty) ||
              Number.isNaN(unitPrice) ||
              Number.isNaN(discountPercent)
            ) {
              throw new Error("Invalid sale line values");
            }

            const lineAmount = qty * unitPrice;
            const discount = (lineAmount * discountPercent) / 100;

            subtotal += lineAmount - discount;
          }

          const taxAmount = Number(input.taxAmount ?? 0);
          const discountAmount = Number(input.discountAmount ?? 0);

          const totalAmount = subtotal + taxAmount - discountAmount;

          const totalPaid = input.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0,
          );

          if (totalPaid < totalAmount) {
            throw new Error("Total payment is less than sale amount");
          }

          const changeAmount = totalPaid - totalAmount;

          //5. CREATE POS SALE (NO CASH ACCOUNT HERE)

          const posSale = await tx.posSale.create({
            data: {
              saleNo,
              sessionId: input.sessionId,
              customerId: input.customerId,
              warehouseId: session.warehouseId,

              subtotal: new Decimal(subtotal),
              taxAmount: new Decimal(taxAmount),
              discountAmount: new Decimal(discountAmount),
              totalAmount: new Decimal(totalAmount),

              amountPaid: new Decimal(totalPaid),
              changeAmount: new Decimal(changeAmount),

              notes: input.notes,
              userId: req.user!.id,
            },
          });

          const totalCogs = await calculateCogs(
            tx,
            input.saleLines,
            session.warehouseId,
            // tx,
          );

          // 6. SALE LINES + INVENTORY ISSUE

          for (const line of input.saleLines) {
            const qty = Number(line.qty);
            const unitPrice = Number(line.unitPrice);
            const discountPercent = Number(line.discountPercent ?? 0);

            const lineTotal = qty * unitPrice * (1 - discountPercent / 100);

            // 10. COGS

            const costInfo = await costingService.getInventoryValue(
              // tx, // IMPORTANT: same transaction
              line.itemId,
              session.warehouseId,
            );

            await tx.posSaleLine.create({
              data: {
                posSaleId: posSale.id,
                itemId: line.itemId,

                qty: new Decimal(qty),
                unitPrice: new Decimal(unitPrice),
                discountPercent: new Decimal(discountPercent),

                costPrice: new Decimal(costInfo.avgCost ?? 0),
                lineTotal: new Decimal(lineTotal),
              },
            });

            await costingService.issueInventory(
              tx, // IMPORTANT
              line.itemId,
              session.warehouseId,
              qty,
              "POS_SALE",
              posSale.id,
              req.user!.id,
            );
          }

          // 7. UPDATE SESSION TOTALS

          await tx.posSession.update({
            where: { id: input.sessionId },
            data: {
              totalSales: { increment: totalAmount },
            },
          });

          // 8. PAYMENTS + CASH TRANSACTIONS

          const glEntries: any[] = [];

          for (const payment of input.payments) {
            const transactionNo = await nextDocumentNumber(
              tx,
              "cash_transaction",
              "CT",
            );
            const amount = Number(payment.amount);

            if (Number.isNaN(amount) || amount <= 0) {
              throw new Error("Invalid payment amount");
            }

            await tx.posSalePayment.create({
              data: {
                posSaleId: posSale.id,
                cashAccountId: payment.cashAccountId,
                method: payment.method,
                amount: new Decimal(amount),
              },
            });

            // CLEANUP: If this sale was resumed from a paused sale, delete the paused copy
            if (input.pendingSaleId) {
              await tx.pendingPOSSale.deleteMany({
                where: { id: input.pendingSaleId },
              });
            }

            const updatedCashAccount = await tx.cashAccount.update({
              where: { id: payment.cashAccountId },
              data: {
                balance: { increment: amount },
              },
            });

            //Get GL account code for cash account
            const cashAccountGL = await tx.chartOfAccount.findUnique({
              where: { id: updatedCashAccount.glAccountId },
            });

            await tx.cashTransaction.create({
              data: {
                transactionNo,
                cashAccountId: payment.cashAccountId,
                transactionType: "RECEIPT",
                amount: new Decimal(amount),
                description: `POS Sale: ${saleNo}`,
                transactionDate: new Date(),
                reference: saleNo,
                refType: "POS_SALE",
                refId: posSale.id,
                userId: req.user!.id,
                preparedBy: req.user!.id,
                authorizedBy: req.user!.id,
                approvedBy: req.user!.id,
                paidBy: req.user!.id,
                status: "PAID",
              },
            });

            /* ---- GL Debit: Cash / Bank account ---- */
            glEntries.push({
              accountCode: cashAccountGL?.code || "1100", // Default to 1100 if not found
              debit: amount,
              credit: 0,
              refType: "POS_SALE",
              refId: posSale.id,
            });
          }

          // 9. GL CREDIT SALES

          glEntries.push({
            accountCode: "4000",
            debit: 0,
            credit: totalAmount,
            refType: "POS_SALE",
            refId: posSale.id,
          });

          glEntries.push(
            {
              accountCode: "5000",
              debit: totalCogs,
              credit: 0,
              refType: "POS_SALE",
              refId: posSale.id,
            },
            {
              accountCode: "1350",
              debit: 0,
              credit: totalCogs,
              refType: "POS_SALE",
              refId: posSale.id,
            },
          );

          await glService.postJournal(
            tx, // if supported
            glEntries,
            `POS Sale: ${saleNo}`,
            req.user!.id,
          );

          return posSale;
        },
        { timeout: 30000 },
      );

      res.status(201).json(sale);
    } catch (error) {
      console.error("Create POS sale error:", error);
      res.status(500).json({ error: "Failed to create POS sale" });
    }
  }

  // async getSales(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 20,
  //       sessionId,
  //       customerId,
  //       dateFrom,
  //       dateTo,
  //       status,
  //       paymentMethod,
  //       userId,
  //     } = req.query;
  //     const where: any = {};

  //     const skip = (Number(page) - 1) * Number(limit);

  //     // Warehouse-based restriction for non-management users
  //     if (
  //       !req.user!.roles.includes("CFO") &&
  //       !req.user!.roles.includes("General Manager")
  //     ) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true },
  //       });

  //       if (user?.warehouseId) {
  //         where.warehouseId = user.warehouseId;
  //       }
  //     }

  //     // Basic filters
  //     if (sessionId) where.sessionId = sessionId;
  //     if (customerId) where.customerId = customerId;
  //     if (status) where.status = status;
  //     if (userId) where.userId = userId;

  //     // Date range
  //     if (dateFrom || dateTo) {
  //       where.createdAt = {};
  //       if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
  //       if (dateTo) where.createdAt.lte = new Date(dateTo as string);
  //     }

  //     // Payment method filter (relation-based)
  //     if (paymentMethod) {
  //       where.payments = {
  //         some: {
  //           method: paymentMethod,
  //         },
  //       };
  //     }

  //     const [sales, total] = await Promise.all([
  //       prisma.posSale.findMany({
  //         where,
  //         skip,
  //         take: Number(limit),
  //         include: {
  //           customer: { select: { code: true, name: true } },
  //           warehouse: { select: { code: true, name: true } },
  //           cashAccount: { select: { code: true, name: true } },
  //           session: { select: { sessionNo: true } },
  //           saleLines: {
  //             include: {
  //               item: { select: { sku: true, name: true, uom: true } },
  //             },
  //           },
  //           payments: {
  //             select: {
  //               method: true,
  //               amount: true,
  //               cashAccountId: true,
  //             },
  //           },
  //           user: { select: { id: true, name: true } },
  //         },
  //         orderBy: { createdAt: "desc" },
  //       }),
  //       prisma.posSale.count({ where }),
  //     ]);

  //     res.json({
  //       sales,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Get POS sales error:", error);
  //     res.status(500).json({ error: "Failed to fetch POS sales" });
  //   }
  // }

  async getSales(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        sessionId,
        customerId,
        dateFrom,
        dateTo,
        status,
        paymentMethod,
        userId,
        search,
      } = req.query;

      const where: any = {};
      const skip = (Number(page) - 1) * Number(limit);

      // Warehouse Restriction
      if (
        !req.user!.roles.includes("Senior Accountant") ||
        !req.user!.roles.includes("Manager") ||
        !req.user!.roles.includes("General Manager")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });

        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      // Basic Filters
      if (sessionId) where.sessionId = sessionId;
      if (customerId) where.customerId = customerId;
      if (status) {
        const statuses = String(status).split(",").map((value) => value.trim()).filter(Boolean);
        where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
      }
      if (userId) where.userId = userId;

      // Date Range
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      // Payment Method Filter
      if (paymentMethod) {
        where.payments = {
          some: {
            method: paymentMethod,
          },
        };
      }

      // SEARCH (Optional)
      if (search && String(search).trim() !== "") {
        where.OR = [
          {
            saleNo: {
              contains: String(search),
              mode: "insensitive",
            },
          },
          {
            customer: {
              name: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          },
          {
            customer: {
              code: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          },
        ];
      }

      //Query Execution

      const [sales, total] = await Promise.all([
        prisma.posSale.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            customer: { select: { code: true, name: true } },
            warehouse: { select: { code: true, name: true } },
            cashAccount: { select: { code: true, name: true } },
            session: { select: { sessionNo: true } },
            saleLines: {
              include: {
                item: { select: { sku: true, name: true, uom: true } },
                returnLines: { select: { qtyReturned: true, lineTotal: true } },
              },
            },
            returns: {
              select: {
                id: true,
                returnNo: true,
                refundAmount: true,
                createdAt: true,
              },
            },
            payments: {
              select: {
                method: true,
                amount: true,
                cashAccountId: true,
              },
            },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.posSale.count({ where }),
      ]);

      const adjustedSales = sales.map((sale) => {
        const originalAmount = sale.totalAmount.toNumber();
        const returnedAmount = sale.returns.reduce((sum, ret) => sum + ret.refundAmount.toNumber(), 0);
        const netAmount = Math.max(0, originalAmount - returnedAmount);
        const lineBaseTotal = sale.saleLines.reduce((sum, line) => sum + line.lineTotal.toNumber(), 0);
        return {
          ...sale,
          originalTotalAmount: originalAmount,
          returnedAmount,
          netTotalAmount: netAmount,
          totalAmount: netAmount,
          returnCount: sale.returns.length,
          saleLines: sale.saleLines.map((line) => {
            const returnedQty = line.returnLines.reduce((sum, ret) => sum + ret.qtyReturned.toNumber(), 0);
            const returnedLineAmount = line.returnLines.reduce((sum, ret) => sum + ret.lineTotal.toNumber(), 0);
            const originalLineTotal = lineBaseTotal > 0
              ? originalAmount * line.lineTotal.toNumber() / lineBaseTotal
              : line.lineTotal.toNumber();
            const { returnLines: _returnLines, ...saleLine } = line;
            return {
              ...saleLine,
              originalQty: line.qty.toNumber(),
              returnedQty,
              remainingQty: Math.max(0, line.qty.toNumber() - returnedQty),
              returnedAmount: returnedLineAmount,
              originalLineTotal,
              netLineTotal: Math.max(0, originalLineTotal - returnedLineAmount),
            };
          }),
          returns: sale.returns.map((ret) => ({
            ...ret,
            refundAmount: ret.refundAmount.toNumber(),
          })),
        };
      });

      res.json({
        sales: adjustedSales,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get POS sales error:", error);
      res.status(500).json({ error: "Failed to fetch POS sales" });
    }
  }

  async getSalesForDashboard(req: AuthRequest, res: Response) {
    try {
      const {
        sessionId,
        customerId,
        dateFrom,
        dateTo,
        status,
        paymentMethod,
        userId,
      } = req.query;
      const where: any = {};

      //const skip = (Number(page) - 1) * Number(limit);

      // Warehouse-based restriction for non-management users
      if (
        !req.user!.roles.includes("Manager") ||
        !req.user!.roles.includes("General Manager") ||
        !req.user!.roles.includes("Senior Accountant")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });

        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      // Basic filters
      if (sessionId) where.sessionId = sessionId;
      if (customerId) where.customerId = customerId;
      if (status) where.status = status;
      if (userId) where.userId = userId;

      // Date range
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      // Payment method filter (relation-based)
      if (paymentMethod) {
        where.payments = {
          some: {
            method: paymentMethod,
          },
        };
      }

      const [sales, total] = await Promise.all([
        prisma.posSale.findMany({
          where,
          include: {
            customer: { select: { code: true, name: true } },
            warehouse: { select: { code: true, name: true } },
            cashAccount: { select: { code: true, name: true } },
            session: { select: { sessionNo: true } },
            saleLines: {
              include: {
                item: { select: { sku: true, name: true, uom: true } },
              },
            },
            payments: {
              select: {
                method: true,
                amount: true,
                cashAccountId: true,
              },
            },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.posSale.count({ where }),
      ]);

      res.json({
        sales,
        pagination: {
          total,
          //pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get POS sales error:", error);
      res.status(500).json({ error: "Failed to fetch POS sales" });
    }
  }

  async getSalesBySalesNo(req: AuthRequest, res: Response) {
    try {
      const { saleNo } = req.params;
      //console.log("Fetching POS sale with saleNo:", saleNo);
      const sale = await prisma.posSale.findUnique({
        where: { saleNo },
        include: {
          customer: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
          session: { select: { sessionNo: true } },
          saleLines: {
            include: {
              item: { select: { sku: true, name: true, uom: true } },
            },
          },
          payments: {
            select: {
              method: true,
              amount: true,
              cashAccountId: true,
            },
          },
          user: { select: { id: true, name: true } },
        },
      });

      if (!sale) {
        return res.json(null);
      }

      res.json(sale);
    } catch (error) {
      console.error("Get POS sales by sales no error:", error);
      res.status(500).json({ error: "Failed to fetch POS sale by sales no" });
    }
  }

  async getPOSsalePayments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      //fetch payments with cash account details for a specific POS sale

      const payments = await prisma.posSalePayment.findMany({
        where: { posSaleId: id },
        include: {
          cashAccount: { select: { code: true, name: true } },
        },
      });

      res.json(payments);
    } catch (error) {
      console.error("Get POS sale payments error:", error);
      res.status(500).json({ error: "Failed to fetch POS sale payments" });
    }
  }

  // async getSales(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 20,
  //       sessionId,
  //       customerId,
  //       dateFrom,
  //       dateTo,
  //       status,
  //       paymentMethod,
  //       userId,
  //     } = req.query;
  //     const skip = (Number(page) - 1) * Number(limit);

  //     const where: any = {};

  //     // Warehouse-based filtering for POS users
  //     if (
  //       !req.user!.roles.includes("CFO") &&
  //       !req.user!.roles.includes("General Manager")
  //     ) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true },
  //       });
  //       if (user?.warehouseId) {
  //         where.warehouseId = user.warehouseId;
  //       }
  //     }

  //     if (sessionId) where.sessionId = sessionId;
  //     if (customerId) where.customerId = customerId;
  //     if (status) where.status = status;
  //     if (paymentMethod) where.paymentMethod = paymentMethod;
  //     if (userId) where.userId = userId;
  //     if (dateFrom || dateTo) {
  //       where.createdAt = {};
  //       if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
  //       if (dateTo) where.createdAt.lte = new Date(dateTo as string);
  //     }

  //     const [sales, total] = await Promise.all([
  //       prisma.posSale.findMany({
  //         where,
  //         skip,
  //         take: Number(limit),
  //         include: {
  //           customer: { select: { code: true, name: true } },
  //           warehouse: { select: { code: true, name: true } },
  //           session: { select: { sessionNo: true } },
  //           saleLines: {
  //             include: {
  //               item: { select: { sku: true, name: true, uom: true } },
  //             },
  //           },
  //           user: { select: { id: true, name: true } },
  //         },
  //         orderBy: { createdAt: "desc" },
  //       }),
  //       prisma.posSale.count({ where }),
  //     ]);

  //     res.json({
  //       sales,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Get POS sales error:", error);
  //     res.status(500).json({ error: "Failed to fetch POS sales" });
  //   }
  // }

  //get POS returns
  async getReturns(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        sessionId,
        customerId,
        dateFrom,
        dateTo,
        userId,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);
      const where: any = {};

      // Warehouse-based restriction
      if (
        !req.user!.roles.includes("Senior accountant") ||
        !req.user!.roles.includes("General Manager") ||
        !req.user!.roles.includes("Manager")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });

        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      // Filters
      if (sessionId) where.sessionId = String(sessionId);
      if (customerId) where.customerId = String(customerId);
      if (userId) where.userId = String(userId);

      // Date range (flexible)
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
        if (dateTo) where.createdAt.lte = new Date(String(dateTo));
      }

      const [returns, total] = await Promise.all([
        prisma.posReturn.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
            session: { select: { sessionNo: true } },
            warehouse: { select: { id: true, name: true } },
            originalSale: { select: { id: true, saleNo: true } },
            returnLines: {
              include: {
                item: { select: { id: true, sku: true, name: true, uom: true } },
              },
            },
            refundPayments: {
              include: { cashAccount: { select: { id: true, code: true, name: true } } },
            },
          },
        }),
        prisma.posReturn.count({ where }),
      ]);

      // Transform for UI
      const data = returns.map((ret) => ({
        id: ret.id,
        returnNo: ret.returnNo,
        originalSaleId: ret.originalSaleId,
        saleNo: ret.originalSale?.saleNo,
        sessionNo: ret.session?.sessionNo,
        customer: ret.customer,
        warehouse: ret.warehouse,
        refundAmount: ret.refundAmount,
        reason: ret.reason,
        createdAt: ret.createdAt,
        createdBy: ret.user,
        itemsSummary: ret.returnLines
          .map((line) => `${line.item?.sku ? `${line.item.sku} — ` : ""}${line.item?.name ?? "Unknown"} (x${line.qtyReturned})`)
          .join(", "),
        refundMethods: ret.refundPayments.map((payment) =>
          `${payment.method}${payment.cashAccount ? ` · ${payment.cashAccount.code}` : ""}: ₦${payment.amount.toNumber().toLocaleString()}`,
        ).join(", "),
      }));

      res.json({
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get POS returns error:", error);
      res.status(500).json({ error: "Failed to fetch POS returns" });
    }
  }

  async createPendingSale(req: Request, res: Response) {
    try {
      const data: CreatePendingSaleInput = req.body;

      if (!data.saleLines.length) {
        return res
          .status(400)
          .json({ error: "At least one product is required to pause a sale" });
      }

      const result = await prisma.$transaction(async (tx) => {
        // If an existing pending sale ID is provided, delete it first (overwrite update)
        if (data.id) {
          await tx.pendingPOSSale.deleteMany({
            where: { id: data.id },
          });
        }

        // Generate temporary sale number: P-000001 format
        const saleNo = await nextDocumentNumber(tx, "pending_pos_sale", "P-");

        // Create the pending sale header
        const pendingSale = await tx.pendingPOSSale.create({
          data: {
            saleNo,
            sessionId: data.sessionId,
            customerId: data.customerId || null,
            subtotal: data.subtotal,
            totalAmount: data.totalAmount,
            totalPaid: data.totalPaid,
            changeAmount: data.changeAmount,
            notes: data.notes || null,
            pendingSaleLines: {
              create: data.saleLines.map((line) => ({
                itemId: line.itemId,
                qty: line.qty,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent || 0,
              })),
            },
            payments: {
              create: data.payments.map((p) => ({
                method: p.method,
                cashAccountId: p.cashAccountId,
                amount: p.amount,
              })),
            },
          },
          include: {
            pendingSaleLines: {
              include: { item: true },
            },
            // payments: {
            //   include: { cashAccount: true },
            // },
            customer: true,
          },
        });

        return pendingSale;
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error("Create pending POS sale error:", error);
      return res.status(500).json({ error: "Failed to pause sale" });
    }
  }

  // 2. Fetch all Pending (Paused) Sales
  async getPendingSales(req: Request, res: Response) {
    try {
      const pendingSales = await prisma.pendingPOSSale.findMany({
        include: {
          pendingSaleLines: {
            include: { item: true },
          },
          payments: {
            include: { cashAccount: true },
          },
          customer: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ pendingSales });
    } catch (error) {
      console.error("Get pending sales error:", error);
      return res
        .status(500)
        .json({ error: "Failed to retrieve pending sales" });
    }
  }

  // 3. Delete / Cancel a Pending Sale
  async deletePendingSale(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.pendingPOSSale.delete({
        where: { id },
      });

      return res.json({ message: "Pending sale deleted successfully" });
    } catch (error) {
      console.error("Delete pending sale error:", error);
      return res.status(500).json({ error: "Failed to delete pending sale" });
    }
  }

  /**
   * 4. Adapt completed sale (createSale) handler to clean up pending sale on completion.
   *
   * In your existing complete POS sale controller (where completed sales are saved),
   * update the database transaction to delete the pending sale if `pendingSaleId` is supplied:
   *
   * async createSale(req: Request, res: Response) {
   *   const { ..., pendingSaleId } = req.body;
   *
   *   await prisma.$transaction(async (tx) => {
   *     // Create completed POS sale logic here ...
   *
   *     // CLEANUP: If this sale was resumed from a paused sale, delete the paused copy
   *     if (pendingSaleId) {
   *       await tx.pendingPOSSale.deleteMany({
   *         where: { id: pendingSaleId }
   *       });
   *     }
   *   });
   * }
   */

  async getReturnableSales(req: AuthRequest, res: Response) {
    try {
      const search = String(req.query.search ?? "").trim();
      const roles = req.user?.roles ?? [];
      const where: any = { status: { in: ["COMPLETED", "PARTIALLY_RETURNED"] } };
      if (!roles.some((role) => ["Senior Accountant", "Manager", "General Manager"].includes(role))) {
        const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { warehouseId: true } });
        if (user?.warehouseId) where.warehouseId = user.warehouseId;
      }
      if (search) {
        where.OR = [
          { saleNo: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
          { customer: { code: { contains: search, mode: "insensitive" } } },
        ];
      }

      const sales = await prisma.posSale.findMany({
        where,
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          saleLines: {
            include: {
              item: { select: { id: true, sku: true, name: true, uom: true } },
              returnLines: { select: { qtyReturned: true } },
            },
          },
          payments: {
            select: { id: true, method: true, amount: true, cashAccountId: true },
          },
        },
      });

      const eligibleSales = sales.map((sale) => ({
        ...sale,
        saleLines: sale.saleLines.map((line) => {
          const alreadyReturnedQty = line.returnLines.reduce(
            (sum, returnLine) => sum + Number(returnLine.qtyReturned),
            0,
          );
          return {
            ...line,
            alreadyReturnedQty,
            remainingQty: Math.max(0, Number(line.qty) - alreadyReturnedQty),
          };
        }).filter((line) => Number(line.remainingQty) > 0),
      })).filter((sale) => sale.saleLines.length > 0);

      res.json({ sales: eligibleSales });
    } catch (error) {
      console.error("Get returnable POS sales error:", error);
      res.status(500).json({ error: "Failed to fetch returnable POS sales" });
    }
  }

  // Create POS Returns
  async createReturn(req: AuthRequest, res: Response) {
    try {
      const validatedData = createPosReturnSchema.parse(req.body);
      const uniqueLineIds = new Set(validatedData.returnLines.map((line) => line.originalLineId));
      if (uniqueLineIds.size !== validatedData.returnLines.length) {
        throw new Error("Each sale line can only appear once per return");
      }

      const returnRecord = await prisma.$transaction(async (tx) => {
        // Serialize returns against this sale so concurrent requests cannot over-return it.
        await tx.$queryRaw`SELECT id FROM "pos_sales" WHERE id = ${validatedData.originalSaleId} FOR UPDATE`;
        const originalSale = await tx.posSale.findUnique({
          where: { id: validatedData.originalSaleId },
          include: { saleLines: true, payments: true },
        });
        if (!originalSale) throw new Error("Original sale not found");
        if (!["COMPLETED", "PARTIALLY_RETURNED"].includes(originalSale.status)) {
          throw new Error("Only completed or partially returned POS sales can be returned");
        }

        const session = await tx.posSession.findUnique({ where: { id: validatedData.sessionId } });
        if (!session || session.status !== "OPEN") throw new Error("Invalid or closed POS session");
        if (session.warehouseId !== originalSale.warehouseId) throw new Error("Session warehouse mismatch");

        const money = (amount: number) => new Decimal(Number(amount.toFixed(2)));
        const lineBaseTotal = originalSale.saleLines.reduce((sum, line) => sum + line.lineTotal.toNumber(), 0);
        if (lineBaseTotal <= 0) throw new Error("Original sale has no refundable line value");
        let allocatedSaleValue = 0;
        const lineRefundCaps = new Map<string, number>();
        originalSale.saleLines.forEach((line, index) => {
          const cap = index === originalSale.saleLines.length - 1
            ? Number((originalSale.totalAmount.toNumber() - allocatedSaleValue).toFixed(2))
            : Number((line.lineTotal.toNumber() * originalSale.totalAmount.toNumber() / lineBaseTotal).toFixed(2));
          lineRefundCaps.set(line.id, Math.max(0, cap));
          allocatedSaleValue += cap;
        });
        const priorReturns = await tx.posReturn.findMany({
          where: { originalSaleId: originalSale.id },
          select: { id: true, refundAmount: true, refundPayments: { select: { originalSalePaymentId: true, amount: true } } },
        });
        const priorRefundTotal = priorReturns.reduce((sum, ret) => sum + ret.refundAmount.toNumber(), 0);
        let returnTotal = 0;
        let totalReturnCogs = 0;
        const returnLines: Array<{ originalLine: typeof originalSale.saleLines[number]; qty: number; lineTotal: number }> = [];

        for (const line of validatedData.returnLines) {
          const originalLine = originalSale.saleLines.find((candidate) => candidate.id === line.originalLineId);
          if (!originalLine) throw new Error("Invalid sale line reference");
          const soldQty = originalLine.qty.toNumber();
          const returnedAggregate = await tx.posReturnLine.aggregate({
            where: { originalLineId: originalLine.id },
            _sum: { qtyReturned: true, lineTotal: true },
          });
          const priorQty = returnedAggregate._sum.qtyReturned?.toNumber() ?? 0;
          const priorLineValue = returnedAggregate._sum.lineTotal?.toNumber() ?? 0;
          const remainingQty = Math.max(0, soldQty - priorQty);
          if (line.qtyReturned > remainingQty + 0.000001) {
            throw new Error(`Only ${remainingQty} unit(s) remain returnable for ${originalLine.itemId}`);
          }

          // Allocate sale-level discount/tax proportionally and use the recorded line value.
          const lineRefundCap = lineRefundCaps.get(originalLine.id) ?? 0;
          const remainingLineValue = Math.max(0, lineRefundCap - priorLineValue);
          const isFinalQuantity = line.qtyReturned >= remainingQty - 0.000001;
          const lineRefund = Math.min(
            remainingLineValue,
            isFinalQuantity ? remainingLineValue : lineRefundCap * line.qtyReturned / soldQty,
          );
          const roundedLineRefund = Number(lineRefund.toFixed(2));
          if (roundedLineRefund <= 0) throw new Error("This line has no remaining refundable value");
          returnTotal += roundedLineRefund;
          totalReturnCogs += line.qtyReturned * originalLine.costPrice.toNumber();
          returnLines.push({ originalLine, qty: line.qtyReturned, lineTotal: roundedLineRefund });
        }
        returnTotal = Number(returnTotal.toFixed(2));
        if (priorRefundTotal + returnTotal > originalSale.totalAmount.toNumber() + 0.009) {
          throw new Error("Return exceeds the remaining refundable sale amount");
        }

        // Allocate this return back to the original tender split, considering earlier refunds.
        const originalPaymentTotal = originalSale.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
        if (!originalSale.payments.length || originalPaymentTotal <= 0) throw new Error("Original sale has no payment allocations");
        const alreadyAllocated = new Map<string, number>();
        for (const ret of priorReturns) {
          for (const allocation of ret.refundPayments) {
            alreadyAllocated.set(
              allocation.originalSalePaymentId,
              (alreadyAllocated.get(allocation.originalSalePaymentId) ?? 0) + allocation.amount.toNumber(),
            );
          }
        }
        const legacyReturns = priorReturns.filter((ret) => ret.refundPayments.length === 0);
        const legacyCashTransactions = legacyReturns.length
          ? await tx.cashTransaction.findMany({
              where: {
                refType: "POS_RETURN",
                transactionType: "PAYMENT",
                refId: { in: legacyReturns.map((ret) => ret.id) },
              },
              select: { refId: true, cashAccountId: true, amount: true },
            })
          : [];
        const cashRefundByReturn = new Map<string, number>();
        const legacyRefundByAccount = new Map<string, number>();
        for (const transaction of legacyCashTransactions) {
          if (transaction.refId) {
            cashRefundByReturn.set(transaction.refId, (cashRefundByReturn.get(transaction.refId) ?? 0) + transaction.amount.toNumber());
          }
          legacyRefundByAccount.set(
            transaction.cashAccountId,
            (legacyRefundByAccount.get(transaction.cashAccountId) ?? 0) + transaction.amount.toNumber(),
          );
        }
        let legacyRefundToDistribute = legacyReturns
          .filter((ret) => !cashRefundByReturn.has(ret.id))
          .reduce((sum, ret) => sum + ret.refundAmount.toNumber(), 0);
        const historicalCashOut = legacyCashTransactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
        if (Math.max(priorRefundTotal, historicalCashOut) + returnTotal > originalSale.totalAmount.toNumber() + 0.009) {
          throw new Error("This sale has already reached its refundable limit; review earlier POS return payments");
        }
        let allocatedTenderValue = 0;
        const paymentCaps = originalSale.payments.map((payment, index) => {
          const netSaleShare = index === originalSale.payments.length - 1
            ? Number((originalSale.totalAmount.toNumber() - allocatedTenderValue).toFixed(2))
            : Number((payment.amount.toNumber() / originalPaymentTotal * originalSale.totalAmount.toNumber()).toFixed(2));
          allocatedTenderValue += netSaleShare;
          const availableBeforeLegacy = Math.max(0, netSaleShare - (alreadyAllocated.get(payment.id) ?? 0));
          const accountKey = payment.cashAccountId ?? session.cashAccountId ?? "";
          const accountLegacy = legacyRefundByAccount.get(accountKey) ?? 0;
          const legacyAccountShare = Math.min(accountLegacy, availableBeforeLegacy);
          legacyRefundByAccount.set(accountKey, Math.max(0, accountLegacy - legacyAccountShare));
          const legacyFallbackShare = Math.min(legacyRefundToDistribute, availableBeforeLegacy - legacyAccountShare);
          const legacyShare = legacyAccountShare + legacyFallbackShare;
          legacyRefundToDistribute -= legacyFallbackShare;
          return {
            payment,
            available: Math.max(0, netSaleShare - (alreadyAllocated.get(payment.id) ?? 0) - legacyShare),
          };
        });
        const availableTotal = paymentCaps.reduce((sum, entry) => sum + entry.available, 0);
        if (availableTotal + 0.009 < returnTotal) throw new Error("Original payment allocations do not cover the remaining refund");
        let refundRemaining = returnTotal;
        const refundAllocations = paymentCaps.map((entry, index) => {
          if (index === paymentCaps.length - 1) {
            const amount = Math.min(refundRemaining, entry.available);
            refundRemaining -= amount;
            return { ...entry, amount: Number(amount.toFixed(2)) };
          }
          const proportional = Number((returnTotal * entry.available / availableTotal).toFixed(2));
          const amount = Math.min(refundRemaining, entry.available, proportional);
          refundRemaining -= amount;
          return { ...entry, amount: Number(amount.toFixed(2)) };
        }).filter((entry) => entry.amount > 0);
        if (refundRemaining > 0.009) throw new Error("Unable to allocate the full refund to original payments");

        const returnNo = await nextDocumentNumber(tx, "pos_return", "RTN");
        const newReturn = await tx.posReturn.create({
          data: {
            returnNo,
            originalSaleId: originalSale.id,
            sessionId: session.id,
            customerId: originalSale.customerId,
            warehouseId: originalSale.warehouseId,
            totalAmount: money(returnTotal),
            refundAmount: money(returnTotal),
            reason: validatedData.reason,
            userId: req.user!.id,
          },
        });

        for (const line of returnLines) {
          const { originalLine, qty, lineTotal } = line;
          await tx.posReturnLine.create({
            data: {
              posReturnId: newReturn.id,
              originalLineId: originalLine.id,
              itemId: originalLine.itemId,
              qtyReturned: new Decimal(qty),
              unitPrice: originalLine.unitPrice,
              lineTotal: money(lineTotal),
            },
          });
          await costingService.receiveInventory(
            tx,
            originalLine.itemId,
            originalSale.warehouseId,
            qty,
            originalLine.costPrice.toNumber(),
            "POS_RETURN",
            newReturn.id,
            req.user!.id,
          );
        }

        await tx.posReturnPayment.createMany({
          data: refundAllocations.map(({ payment, amount }) => ({
            posReturnId: newReturn.id,
            originalSalePaymentId: payment.id,
            cashAccountId: payment.cashAccountId ?? session.cashAccountId,
            method: payment.method,
            amount: money(amount),
          })),
        });

        const glEntries: any[] = [];
        for (const { payment, amount } of refundAllocations) {
          const cashAccountId = payment.cashAccountId ?? session.cashAccountId;
          if (!cashAccountId) throw new Error("No cash account is available for this refund allocation");
          const updatedCashAccount = await tx.cashAccount.update({
            where: { id: cashAccountId },
            data: { balance: { decrement: money(amount) } },
          });
          const cashaccountGL = updatedCashAccount.glAccountId
            ? await tx.chartOfAccount.findUnique({ where: { id: updatedCashAccount.glAccountId } })
            : null;
          glEntries.push({
            accountCode: cashaccountGL?.code || "1100",
            debit: 0,
            credit: amount,
            refType: "POS_RETURN",
            refId: newReturn.id,
          });

          const transactionNo = await nextDocumentNumber(tx, "cash_transaction", "CT");
          await tx.cashTransaction.create({
            data: {
              transactionNo,
              cashAccountId,
              transactionType: "PAYMENT",
              amount: money(amount),
              description: `POS Return: ${returnNo} (${payment.method})`,
              transactionDate: new Date(),
              reference: returnNo,
              refType: "POS_RETURN",
              refId: newReturn.id,
              userId: req.user!.id,
              preparedBy: req.user!.id,
              authorizedBy: req.user!.id,
              approvedBy: req.user!.id,
              paidBy: req.user!.id,
              status: "PAID",
            },
          });
        }

        await tx.posSession.update({ where: { id: session.id }, data: { totalReturns: { increment: money(returnTotal) } } });
        glEntries.push(
          { accountCode: "4900", debit: returnTotal, credit: 0, refType: "POS_RETURN", refId: newReturn.id },
          { accountCode: "5000", debit: 0, credit: totalReturnCogs, refType: "POS_RETURN", refId: newReturn.id },
          { accountCode: "1350", debit: totalReturnCogs, credit: 0, refType: "POS_RETURN", refId: newReturn.id },
        );
        await glService.postJournal(tx, glEntries, `POS Return: ${returnNo}`, req.user!.id);

        const updatedLines = await tx.posSaleLine.findMany({
          where: { posSaleId: originalSale.id },
          include: { returnLines: { select: { qtyReturned: true } } },
        });
        const fullyReturned = updatedLines.length > 0 && updatedLines.every((saleLine) => {
          const returned = saleLine.returnLines.reduce((sum, line) => sum + line.qtyReturned.toNumber(), 0);
          return returned >= saleLine.qty.toNumber() - 0.000001;
        });
        await tx.posSale.update({
          where: { id: originalSale.id },
          data: { status: fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED" },
        });

        return tx.posReturn.findUnique({
          where: { id: newReturn.id },
          include: {
            returnLines: { include: { item: { select: { id: true, sku: true, name: true, uom: true } } } },
            refundPayments: { include: { cashAccount: { select: { id: true, code: true, name: true } } } },
            originalSale: { select: { id: true, saleNo: true } },
          },
        });
      }, { maxWait: 10000, timeout: 30000, isolationLevel: "Serializable" });

      res.status(201).json(returnRecord);
    } catch (error) {
      console.error("Create POS return error:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create POS return",
      });
    }
  }

  // Get customers with outstanding balances
  async getCustomersWithBalances(req: AuthRequest, res: Response) {
    try {
      const customers = await prisma.$queryRaw`
  SELECT 
    c.id,
    c.code,
    c.name,
    c.address,
    c.phone,
    c.email,
    c."customerGroupId",
    g.name AS "customerGroupName",
    COALESCE(
      (SELECT SUM(s."totalAmount") FROM sales s WHERE s."customerId" = c.id AND s.status IN ('INVOICED', 'PAID')) -
      (SELECT SUM(sr."amountReceived") FROM sales_receipts sr WHERE sr."customerId" = c.id), 
      0
    ) as "outstandingBalance"
  FROM customers c
  LEFT JOIN "CustomerGroup" g ON g.id = c."customerGroupId"
  WHERE c."isActive" = true
  ORDER BY c.name
`;

      res.json({ customers });
    } catch (error) {
      console.error("Get customers with balances error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch customers with balances" });
    }
  }

  // Print POS receipt
  async printReceipt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      // console.log("PRINT RECEIPT PARAMS:", req.params);

      if (!id) {
        return res.status(400).json({ error: "Sale ID is required" });
      }

    
      //  * 1. FETCH SALE WITH ALL REQUIRED RELATIONS
     
      const sale = await prisma.posSale.findUnique({
        where: { id: id },
        include: {
          customer: {
            select: { code: true, name: true },
          },
          warehouse: {
            select: { code: true, name: true },
          },
          session: {
            select: { sessionNo: true },
          },
          user: {
            select: { id: true, name: true },
          },
          saleLines: {
            include: {
              item: {
                select: { sku: true, name: true, uom: true },
              },
              returnLines: { select: { qtyReturned: true, lineTotal: true } },
            },
          },
          returns: {
            select: {
              returnNo: true,
              refundAmount: true,
              createdAt: true,
              refundPayments: {
                select: { method: true, amount: true },
              },
            },
          },
          payments: true, // PosSalePayment[]
        },
      });

      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      //  * 2. FORMAT SALE LINES
      
      const lineBaseTotal = sale.saleLines.reduce((sum, line) => sum + line.lineTotal.toNumber(), 0);
      const saleLines = sale.saleLines.map((line) => {
        const originalQty = line.qty.toNumber();
        const returnedQty = line.returnLines.reduce((sum, returned) => sum + returned.qtyReturned.toNumber(), 0);
        const returnedAmount = line.returnLines.reduce((sum, returned) => sum + returned.lineTotal.toNumber(), 0);
        const originalLineTotal = lineBaseTotal > 0
          ? sale.totalAmount.toNumber() * line.lineTotal.toNumber() / lineBaseTotal
          : line.lineTotal.toNumber();
        const netLineTotal = Math.max(0, originalLineTotal - returnedAmount);
        return {
          sku: line.item?.sku ?? "N/A",
          name: line.item?.name ?? "Unknown Item",
          uom: line.item?.uom ?? "",
          qty: Math.max(0, originalQty - returnedQty),
          originalQty,
          returnedQty,
          remainingQty: Math.max(0, originalQty - returnedQty),
          unitPrice: line.unitPrice.toNumber(),
          discountPercent: line.discountPercent.toNumber(),
          costPrice: line.costPrice.toNumber(),
          originalLineTotal,
          returnedAmount,
          netLineTotal,
          lineTotal: netLineTotal,
        };
      });

      /* =====================================================
       * 3. FORMAT PAYMENTS
       * ===================================================== */
      const payments = sale.payments.map((p) => ({
        method: p.method, // CASH | CARD | TRANSFER
        amount: p.amount.toNumber(),
      }));

      /* =====================================================
       * 4. OPTIONAL: PAYMENT SUMMARY (FRONTEND FRIENDLY)
       * ===================================================== */
      const paymentSummary = payments.reduce<Record<string, number>>(
        (acc, p) => {
          acc[p.method] = (acc[p.method] || 0) + p.amount;
          return acc;
        },
        {},
      );

      const returnedAmount = sale.returns.reduce((sum, ret) => sum + ret.refundAmount.toNumber(), 0);
      const netTotalAmount = Math.max(0, sale.totalAmount.toNumber() - returnedAmount);
      const refunds = sale.returns.map((ret) => ({
        returnNo: ret.returnNo,
        date: ret.createdAt,
        amount: ret.refundAmount.toNumber(),
        payments: ret.refundPayments.map((payment) => ({
          method: payment.method,
          amount: payment.amount.toNumber(),
        })),
      }));

      /* =====================================================
       * 5. BUILD RECEIPT OBJECT
       * ===================================================== */
      const receipt = {
        saleId: sale.id,
        documentNo: sale.saleNo,

        sessionNo: sale.session?.sessionNo ?? null,
        date: sale.createdAt,

        cashier: {
          id: sale.user.id,
          name: sale.user.name,
        },

        customer: sale.customer
          ? {
              code: sale.customer.code,
              name: sale.customer.name,
            }
          : null,

        warehouse: sale.warehouse
          ? {
              code: sale.warehouse.code,
              name: sale.warehouse.name,
            }
          : null,

        notes: sale.notes ?? null,

        totals: {
          subtotal: sale.subtotal.toNumber(),
          discountAmount: sale.discountAmount.toNumber(),
          taxAmount: sale.taxAmount.toNumber(),
          originalTotalAmount: sale.totalAmount.toNumber(),
          returnedAmount,
          netTotalAmount,
          totalAmount: netTotalAmount,
          amountPaid: sale.amountPaid.toNumber(),
          changeAmount: sale.changeAmount.toNumber(),
          outstandingBalance:
            netTotalAmount - sale.amountPaid.toNumber(),
        },

        items: saleLines,
        refunds,

        payments,
        paymentSummary,
      };

      res.json(receipt);
    } catch (error) {
      console.error("Print POS receipt error:", error);
      res.status(500).json({ error: "Failed to print receipt" });
    }
  }

  // async printReceipt(req: AuthRequest, res: Response) {
  //   try {
  //     const { id } = req.params;

  //     const sale = await prisma.posSale.findUnique({
  //       where: { id },
  //       include: {
  //         customer: true,
  //         warehouse: true,
  //         session: true,
  //         saleLines: {
  //           include: {
  //             item: true,
  //           },
  //         },
  //         user: { select: { name: true } },
  //       },
  //     });

  //     if (!sale) {
  //       return res.status(404).json({ error: "POS sale not found" });
  //     }

  //     // Get customer outstanding balance
  //     let outstandingBalance = 0;
  //     if (sale.customerId) {
  //       const balanceResult = (await prisma.$queryRaw`
  //         SELECT COALESCE(
  //           (SELECT SUM(s."totalAmount") FROM sales s WHERE s."customerId" = ${sale.customerId} AND s.status IN ('INVOICED', 'PAID')) -
  //           (SELECT SUM(sr."amountReceived") FROM sales_receipts sr WHERE sr."customerId" = ${sale.customerId}),
  //           0
  //         ) as balance
  //       `) as any[];
  //       outstandingBalance = Number(balanceResult[0]?.balance || 0);
  //     }

  //     res.json({
  //       sale,
  //       outstandingBalance,
  //       printData: {
  //         title: "SALES RECEIPT",
  //         documentNo: sale.saleNo,
  //         date: sale.createdAt,
  //         customer: sale.customer,
  //         warehouse: sale.warehouse,
  //         lines: sale.saleLines,
  //         subtotal: sale.subtotal,
  //         taxAmount: sale.taxAmount,
  //         discountAmount: sale.discountAmount,
  //         total: sale.totalAmount,
  //         amountPaid: sale.amountPaid,
  //         changeAmount: sale.changeAmount,
  //         paymentMethod: sale.paymentMethod,
  //         cashier: sale.user.name,
  //         outstandingBalance,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Print POS receipt error:", error);
  //     res.status(500).json({ error: "Failed to generate receipt" });
  //   }
  // }

  // Helper method to calculate COGS
}
async function calculateCogs(
  tx,
  saleLines: any[],
  warehouseId: string,
): Promise<number> {
  let totalCogs = 0;

  for (const line of saleLines) {
    const inventoryValue = await costingService.getInventoryValue(
      line.itemId,
      warehouseId,
    );
    totalCogs += line.qty * inventoryValue.avgCost;
  }

  return totalCogs;
}
