import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { GeneralLedgerService } from "./gl";
import { nextDocumentNumber } from "./documentNumbers";

const prisma = new PrismaClient();
const glService = new GeneralLedgerService();

export class AssetsService {
  // Asset Categories
  async getAssetCategories() {
    return await prisma.assetCategory.findMany({
      include: {
        glAssetAccount: { select: { code: true, name: true } },
        glDepreciationAccount: { select: { code: true, name: true } },
        glAccumulatedDepreciationAccount: {
          select: { code: true, name: true },
        },
        _count: { select: { assets: true } },
      },
      orderBy: { code: "asc" },
    });
  }

  async createAssetCategory(data: any) {
    return await prisma.assetCategory.create({
      data,
      include: {
        glAssetAccount: { select: { code: true, name: true } },
        glDepreciationAccount: { select: { code: true, name: true } },
        glAccumulatedDepreciationAccount: {
          select: { code: true, name: true },
        },
      },
    });
  }

  async updateAssetCategory(categoryId: string, data: any) {
    // 1. Check if any asset exists in this category
    const assetCount = await prisma.asset.count({
      where: { categoryId },
    });

    if (assetCount > 0) {
      throw new Error(
        "Cannot update asset category. Assets already exist under this category.",
      );
    }

    // 2. Update category
    return await prisma.assetCategory.update({
      where: { id: categoryId },
      data,
      include: {
        glAssetAccount: { select: { code: true, name: true } },
        glDepreciationAccount: { select: { code: true, name: true } },
        glAccumulatedDepreciationAccount: {
          select: { code: true, name: true },
        },
      },
    });
  }

  async deleteAssetCategory(categoryId: string) {
    // 1. Check if any asset exists in this category
    const assetCount = await prisma.asset.count({
      where: { categoryId },
    });

    if (assetCount > 0) {
      throw new Error(
        "Cannot delete asset category. Assets already exist under this category.",
      );
    }

    // 2. Delete category
    return await prisma.assetCategory.delete({
      where: { id: categoryId },
    });
  }

  // Assets
  async getAssets(filters: any = {}) {
    let { page = 1, limit = 10, categoryId, status, locationId, search } = filters;

    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const skip = (page - 1) * limit;

    // const tests = {
    //   categoryOnly: await prisma.asset.count({
    //     where: { categoryId },
    //   }),
    //   statusOnly: await prisma.asset.count({
    //     where: { status },
    //   }),
    //   locationOnly: await prisma.asset.count({
    //     where: { locationId },
    //   }),
    //   categoryAndStatus: await prisma.asset.count({
    //     where: { categoryId, status },
    //   }),
    //   allThree: await prisma.asset.count({
    //     where: { categoryId, status, locationId },
    //   }),
    // };

    // console.log("FILTER TEST RESULTS:", tests);

    const where: any = {};

    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (locationId && locationId !== "ALL") {
      where.locationId = locationId;
    }
    if (typeof search === "string" && search.trim()) {
      where.OR = [
        { assetNo: { contains: search.trim(), mode: "insensitive" } },
        { name: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // console.log("Final WHERE:", where);

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { code: true, name: true } },
          location: { select: { code: true, name: true } },
          createdByUser: { select: { name: true } },
          purchaseOrder: { select: { orderNo: true } },
          _count: { select: { depreciationEntries: true } },
          recapitalizations: { select: { amount: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      assets: assets.map((asset) => {
        const recapitalizedAmount = asset.recapitalizations.reduce(
          (sum, recap) => sum + Number(recap.amount),
          0,
        );
        return {
          ...asset,
          acquisitionCost: Number(asset.acquisitionCost) + recapitalizedAmount,
          originalAcquisitionCost: Number(asset.acquisitionCost),
          recapitalizedAmount,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // async getAssets(filters: any = {}) {
  //   let { page = 1, limit = 10, categoryId, status, locationId } = filters;

  //   console.log("Filters received in service:", filters);

  //   // ensure page & limit are numbers
  //   page = parseInt(page, 10) || 1;
  //   limit = parseInt(limit, 10) || 10;

  //   const skip = (page - 1) * limit;

  //   const where: any = {};
  //   if (categoryId) where.categoryId = categoryId;
  //   if (status) where.status = status;
  //   if (locationId) where.locationId = locationId;

  //   const [assets, total] = await Promise.all([
  //     prisma.asset.findMany({
  //       where,
  //       skip,
  //       take: limit,
  //       include: {
  //         category: {
  //           select: { code: true, name: true, depreciationMethod: true },
  //         },
  //         location: { select: { code: true, name: true } },
  //         createdByUser: { select: { name: true } },
  //         purchaseOrder: { select: { orderNo: true } },
  //         _count: { select: { depreciationEntries: true } },
  //       },
  //       orderBy: { createdAt: "desc" },
  //     }),
  //     prisma.asset.count({ where }),
  //   ]);

  //   return {
  //     assets,
  //     pagination: {
  //       page,
  //       limit,
  //       total,
  //       pages: Math.ceil(total / limit),
  //     },
  //   };
  // }

  async createAsset(data: any, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const assetNo = await nextDocumentNumber(tx, "asset", "AST");

      // Get category defaults if not provided
      // const category = await tx.assetCategory.findUnique({
      //   where: { id: data.categoryId }
      // });

      // if (!category) {
      //   throw new Error('Asset category not found');
      // }

      // const asset = await tx.asset.create({
      //   data: {
      //     assetNo,
      //     name: data.name,
      //     description: data.description,
      //     categoryId: data.categoryId,
      //     acquisitionDate: new Date(data.acquisitionDate),
      //     acquisitionCost: new Decimal(data.acquisitionCost),
      //     residualValue: new Decimal(data.residualValue || (data.acquisitionCost * category.residualValue / 100)),
      //     usefulLife: data.usefulLife || category.usefulLife,
      //     depreciationMethod: data.depreciationMethod || category.depreciationMethod,
      //     locationId: data.locationId,
      //     serialNumber: data.serialNumber,
      //     supplier: data.supplier,
      //     purchaseOrderId: data.purchaseOrderId,
      //     createdBy: userId
      //   }
      // });

      const category = await tx.assetCategory.findUnique({
        where: { id: data.categoryId },
        include: { glAssetAccount: true },
      });

      if (!category) {
        throw new Error("Asset category not found");
      }

      const asset = await tx.asset.create({
        data: {
          assetNo,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          acquisitionDate: new Date(data.acquisitionDate),
          acquisitionCost: new Decimal(data.acquisitionCost),
          residualValue: new Decimal(
            data.residualValue ??
              (Number(data.acquisitionCost) * Number(category.residualValue)) /
                100,
          ),
          usefulLife: data.usefulLife || category.usefulLife,
          depreciationMethod:
            data.depreciationMethod || category.depreciationMethod,
          locationId: data.locationId,
          serialNumber: data.serialNumber,
          supplier: data.supplier,
          purchaseOrderId: data.purchaseOrderId,
          createdBy: userId,
        },
      });
      //Get category GL accounts from glAccountid from data
      const glAssetAccount = data.glAssetAccountId
        ? await tx.chartOfAccount.findUnique({
            where: { id: data.glAssetAccountId },
          })
        : category.glAssetAccount;

      // Post capitalization to GL
      await glService.postJournal(
        tx,
        [
          {
            accountCode: category.glAssetAccount.code,
            debit: data.acquisitionCost,
            credit: 0,
            refType: "ASSET_CAPITALIZATION",
            refId: asset.id,
          },
          {
            accountCode: glAssetAccount.code || "1100", // Cash/Bank - will be updated based on payment method
            debit: 0,
            credit: data.acquisitionCost,
            refType: "ASSET_CAPITALIZATION",
            refId: asset.id,
          },
        ],
        `Asset capitalization: ${asset.name}`,
        userId,
      );

      return asset;
    });
  }

  async updateAsset(assetId: string, data: any) {
    const existingAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { acquisitionDate: true },
    });
    if (!existingAsset) throw new Error("Asset not found");
    const depreciationCount = await prisma.assetDepreciation.count({
      where: { assetId },
    });
    if (
      depreciationCount > 0 &&
      new Date(data.acquisitionDate).getTime() !== existingAsset.acquisitionDate.getTime()
    ) {
      throw new Error("Acquisition date cannot be changed after depreciation has been recorded");
    }

    return await prisma.asset.update({
      where: { id: assetId },
      data: {
        name: data.name,
        description: data.description,
        acquisitionDate: new Date(data.acquisitionDate),
        usefulLife: data.usefulLife,
        categoryId: data.categoryId,
        locationId: data.locationId,
        serialNumber: data.serialNumber,
        supplier: data.supplier,
      },
      include: {
        category: { select: { code: true, name: true } },
        location: { select: { code: true, name: true } },
      },
    });
  }

  async deleteAsset(assetId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        include: {
          depreciationEntries: true,
          recapitalizations: true,
          disposals: true,
        },
      });
      if (!asset) throw new Error("Asset not found");

      if (
        asset.depreciationEntries.some((entry) => entry.isPosted && !entry.journalId)
      ) {
        throw new Error(
          "Cannot delete this asset because an earlier posted depreciation entry has no linked journal. Reconcile the journal before deleting the asset.",
        );
      }

      const referencedLines = await tx.journalLine.findMany({
        where: {
          OR: [
            { refType: "ASSET_CAPITALIZATION", refId: asset.id },
            { refType: "DEPRECIATION", refId: asset.id },
            { refType: "ASSET_RECAPITALIZATION", refId: asset.id },
            ...(asset.disposals.length
              ? [{
                  refType: "ASSET_DISPOSAL",
                  refId: { in: asset.disposals.map((disposal) => disposal.id) },
                }]
              : []),
          ],
        },
        include: { account: true, journal: true },
      });

      const linesByJournal = new Map<string, typeof referencedLines>();
      for (const line of referencedLines) {
        const lines = linesByJournal.get(line.journalId) || [];
        lines.push(line);
        linesByJournal.set(line.journalId, lines);
      }

      for (const [journalId, lines] of linesByJournal) {
        const journal = lines[0].journal;
        await glService.postJournal(
          tx,
          lines.map((line) => ({
            accountCode: line.account.code,
            debit: Number(line.credit),
            credit: Number(line.debit),
            refType: "ASSET_REVERSAL",
            refId: asset.id,
          })),
          `Reverse asset journal ${journal?.journalNo || journalId}: ${asset.assetNo} - ${asset.name}`,
          userId,
        );
      }

      // Recapitalization payments reduce cash-account balances separately from GL posting.
      for (const recap of asset.recapitalizations) {
        if (
          recap.transactionType !== "CAPITAL_IMPROVEMENT" ||
          !recap.sourceAccountId
        ) continue;
        const cashAccount = await tx.cashAccount.findFirst({
          where: { glAccountId: recap.sourceAccountId },
        });
        if (cashAccount) {
          await tx.cashAccount.update({
            where: { id: cashAccount.id },
            data: { balance: { increment: recap.amount } },
          });
        }
      }

      await tx.assetDepreciation.deleteMany({ where: { assetId: asset.id } });
      await tx.assetRecapitalization.deleteMany({ where: { assetId: asset.id } });
      await tx.assetDisposal.deleteMany({ where: { assetId: asset.id } });

      if (asset.purchaseOrderId) {
        const otherAssets = await tx.asset.count({
          where: { purchaseOrderId: asset.purchaseOrderId, id: { not: asset.id } },
        });
        if (otherAssets === 0) {
          await tx.purchase.update({
            where: { id: asset.purchaseOrderId },
            data: { status: "ORDERED" },
          });
        }
      }

      return tx.asset.delete({ where: { id: asset.id } });
    });
  }

  // Capitalization from Purchase Orders
  async capitalizeFromPurchase(data: any, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: data.purchaseOrderId },
        include: { vendor: true },
      });

      if (!purchase) {
        throw new Error("Purchase order not found");
      }
      if (purchase.orderType !== "ASSET" || purchase.status !== "ORDERED") {
        throw new Error("Only ordered asset purchase orders can be capitalized");
      }
      const allocatedCost = data.assets.reduce(
        (sum: number, asset: any) => sum + Number(asset.acquisitionCost),
        0,
      );
      if (Math.abs(allocatedCost - Number(purchase.totalAmount)) > 0.01) {
        throw new Error("Asset costs must match the purchase order total");
      }

      const createdAssets = [];

      for (const assetData of data.assets) {
        const assetNo = await nextDocumentNumber(tx, "asset", "AST");

        const category = await tx.assetCategory.findUnique({
          where: { id: assetData.categoryId },
          include: { glAssetAccount: true },
        });

        if (!category) {
          throw new Error(
            `Asset category not found for asset: ${assetData.name}`,
          );
        }

        const asset = await tx.asset.create({
          data: {
            assetNo,
            name: assetData.name,
            categoryId: assetData.categoryId,
            acquisitionDate: purchase.orderDate,
            acquisitionCost: new Decimal(assetData.acquisitionCost),
            residualValue: new Decimal(
              (Number(assetData.acquisitionCost) *
                Number(category.residualValue)) /
                100,
            ),
            usefulLife: category.usefulLife,
            depreciationMethod: category.depreciationMethod,
            locationId: assetData.locationId,
            serialNumber: assetData.serialNumber,
            supplier: purchase.vendor.name,
            purchaseOrderId: data.purchaseOrderId,
            createdBy: userId,
          },
        });

        createdAssets.push(asset);

        // Post capitalization to GL
        await glService.postJournal(
          tx,
          [
            {
              accountCode: "1510", //Asset Clearing Account
              debit: assetData.acquisitionCost,
              credit: 0,
              refType: "ASSET_CAPITALIZATION",
              refId: asset.id,
            },
            {
              accountCode: "2000", // Accounts Payable
              debit: 0,
              credit: assetData.acquisitionCost,
              refType: "ASSET_CAPITALIZATION",
              refId: asset.id,
            },
            {
              accountCode: category.glAssetAccount.code,
              debit: assetData.acquisitionCost,
              credit: 0,
              refType: "ASSET_CAPITALIZATION",
              refId: asset.id,
            },
            {
              accountCode: "1510", // Asset Clearing Account
              debit: 0,
              credit: assetData.acquisitionCost,
              refType: "ASSET_CAPITALIZATION",
              refId: asset.id,
            },
          ],
          `Asset capitalization from PO ${purchase.orderNo}: ${asset.name}`,
          userId,
        );
      }

      await tx.purchase.update({
        where: { id: data.purchaseOrderId },
        data: { status: "INVOICED" },
      });

      return createdAssets;
    });
  }

  // Depreciation Calculations
  async calculateDepreciation(
    assetId: string,
    periodYear: number,
    periodMonth: number,
  ) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        depreciationEntries: {
          orderBy: [
            { periodYear: "desc" },
            { periodMonth: "desc" },
            { createdAt: "desc" },
          ],
        },
        recapitalizations: { orderBy: { transactionDate: "asc" } },
      },
    });

    if (!asset || asset.status !== "ACTIVE") {
      throw new Error("Asset not found or not active");
    }

    const acquisitionDate = new Date(asset.acquisitionDate);
    const periodEndDate = new Date(periodYear, periodMonth, 0, 23, 59, 59, 999);
    const eligibleRecapitalizations = asset.recapitalizations.filter(
      (recap) => new Date(recap.transactionDate) <= periodEndDate,
    );
    const recapitalizedAmount = eligibleRecapitalizations.reduce(
      (sum, recap) => sum + Number(recap.amount),
      0,
    );
    const acquisitionCost = Number(asset.acquisitionCost) + recapitalizedAmount;

    if (acquisitionDate > periodEndDate) {
      return {
        depreciationAmount: 0,
        accumulatedDepreciation: 0,
        netBookValue: acquisitionCost,
      };
    }

    const residualValue = Number(asset.residualValue);
    const priorEntries = asset.depreciationEntries.filter(
      (entry) =>
        entry.periodYear < periodYear ||
        (entry.periodYear === periodYear && entry.periodMonth < periodMonth),
    );
    const accumulatedDepreciation = priorEntries.length
      ? Number(priorEntries[0].accumulatedDepreciation)
      : 0;
    const usefulLifeExtensionMonths = eligibleRecapitalizations.reduce(
      (sum, recap) => sum + recap.usefulLifeExtension,
      0,
    );
    const totalUsefulLifeMonths = Math.max(
      1,
      asset.usefulLife * 12 + usefulLifeExtensionMonths,
    );
    const remainingUsefulLifeMonths = Math.max(
      1,
      totalUsefulLifeMonths - priorEntries.length,
    );
    const currentBookValue = Math.max(
      residualValue,
      acquisitionCost - accumulatedDepreciation,
    );
    const remainingDepreciableAmount = Math.max(
      0,
      currentBookValue - residualValue,
    );

    let depreciationAmount = 0;
    if (remainingDepreciableAmount > 0) {
      if (asset.depreciationMethod === "STRAIGHT_LINE") {
        depreciationAmount =
          remainingDepreciableAmount / remainingUsefulLifeMonths;
      } else {
        const effectiveResidual =
          residualValue > 0 ? residualValue : acquisitionCost * 0.01;
        const monthlyRate =
          1 - Math.pow(effectiveResidual / acquisitionCost, 1 / totalUsefulLifeMonths);
        depreciationAmount = currentBookValue * monthlyRate;
      }
      depreciationAmount = Math.min(
        depreciationAmount,
        remainingDepreciableAmount,
      );
    }

    const finalAccumulatedDepreciation =
      accumulatedDepreciation + depreciationAmount;
    const netBookValue = acquisitionCost - finalAccumulatedDepreciation;

    return {
      depreciationAmount: Math.max(0, depreciationAmount),
      accumulatedDepreciation: finalAccumulatedDepreciation,
      netBookValue: Math.max(residualValue, netBookValue),
    };
  }

  async runDepreciation(data: any, userId: string) {
    const { periodYear, periodMonth, assetIds } = data;
    const transactionDate = new Date(periodYear, periodMonth, 0);

    return await prisma.$transaction(
      async (tx) => {
        // Get assets to depreciate
        const where: any = { status: "ACTIVE" };
        if (assetIds && assetIds.length > 0) {
          where.id = { in: assetIds };
        }

        const assets = await tx.asset.findMany({
          where,
          include: {
            category: {
              include: {
                glDepreciationAccount: true,
                glAccumulatedDepreciationAccount: true,
              },
            },
          },
        });

        const depreciationEntries = [];
        let totalDepreciation = 0;

        for (const asset of assets) {
          // Check if depreciation already exists for this period
          const existingEntry = await tx.assetDepreciation.findUnique({
            where: {
              assetId_periodYear_periodMonth: {
                assetId: asset.id,
                periodYear,
                periodMonth,
              },
            },
          });

          // Get Gl account codes for this asset's category
          const glDepreciationAccount =
            asset.category?.glDepreciationAccount?.code;
          const glAccumulatedDepreciationAccount =
            asset.category?.glAccumulatedDepreciationAccount?.code;

          // console.log(`Calculating depreciation for asset ${asset.assetNo} - ${asset.name} for period ${periodYear}-${periodMonth}`);
          // console.log(
          //   `GL Depreciation Account: ${glDepreciationAccount}, GL Accumulated Depreciation Account: ${glAccumulatedDepreciationAccount}`,
          // );

          if (existingEntry) {
            continue; // Skip if already calculated
          }

          const calculation = await this.calculateDepreciation(
            asset.id,
            periodYear,
            periodMonth,
          );

          if (calculation.depreciationAmount > 0) {
            const journalId = await glService.postJournal(
              tx,
              [
                {
                  accountCode: glDepreciationAccount,
                  debit: calculation.depreciationAmount,
                  credit: 0,
                  refType: "DEPRECIATION",
                  refId: asset.id,
                },
                {
                  accountCode: glAccumulatedDepreciationAccount,
                  debit: 0,
                  credit: calculation.depreciationAmount,
                  refType: "DEPRECIATION",
                  refId: asset.id,
                },
              ],
              `Depreciation for ${periodYear}-${String(periodMonth).padStart(2, "0")}: ${asset.assetNo} - ${asset.name}`,
              userId,
              transactionDate,
            );

            const entry = await tx.assetDepreciation.create({
              data: {
                assetId: asset.id,
                periodYear,
                periodMonth,
                depreciationAmount: new Decimal(calculation.depreciationAmount),
                accumulatedDepreciation: new Decimal(
                  calculation.accumulatedDepreciation,
                ),
                netBookValue: new Decimal(calculation.netBookValue),
                journalId,
                isPosted: true,
                postedAt: transactionDate,
              },
            });

            depreciationEntries.push(entry);
            totalDepreciation += calculation.depreciationAmount;
          }
        }

        return {
          processedAssets: depreciationEntries.length,
          totalDepreciation,
          entries: depreciationEntries,
        };
      },
      {
        maxWait: 5000, // 5s wait for connection
        timeout: 20000, // 20s max runtime
      },
    );
  }

  // Asset Disposal
  async disposeAsset(assetId: string, data: any, userId: string) {
    return await prisma.$transaction(
      async (tx) => {
        const asset = await tx.asset.findUnique({
          where: { id: assetId },
          include: {
            category: {
              include: {
                glAssetAccount: true,
                glAccumulatedDepreciationAccount: true,
              },
            },
            depreciationEntries: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });

        if (!asset) {
          throw new Error("Asset not found");
        }

        if (asset.status !== "ACTIVE") {
          throw new Error("Asset is not active");
        }

        // Calculate current book value
        const acquisitionCost = Number(asset.acquisitionCost);
        const accumulatedDepreciation =
          asset.depreciationEntries.length > 0
            ? Number(asset.depreciationEntries[0].accumulatedDepreciation)
            : 0;
        const netBookValue = acquisitionCost - accumulatedDepreciation;
        const disposalAmount = Number(data.disposalAmount);
        const gainLoss = disposalAmount - netBookValue;

        // Create disposal record
        const disposal = await tx.assetDisposal.create({
          data: {
            assetId,
            disposalDate: new Date(data.disposalDate),
            disposalAmount: new Decimal(disposalAmount),
            disposalMethod: data.disposalMethod,
            buyerDetails: data.buyerDetails,
            gainLoss: new Decimal(gainLoss),
            notes: data.notes,
            disposedBy: userId,
          },
        });

        // Update asset status
        await tx.asset.update({
          where: { id: assetId },
          data: {
            status: data.disposalMethod === "SALE" ? "SOLD" : "DISPOSED",
            disposalDate: new Date(data.disposalDate),
            disposalAmount: new Decimal(disposalAmount),
            disposalMethod: data.disposalMethod,
          },
        });

        // Post disposal to GL
        const journalEntries = [
          // Debit Cash/Bank for disposal proceeds
          {
            accountCode: "1100",
            debit: disposalAmount,
            credit: 0,
            refType: "ASSET_DISPOSAL",
            refId: disposal.id,
          },
          // Debit Accumulated Depreciation
          {
            accountCode: asset.category.glAccumulatedDepreciationAccount.code,
            debit: accumulatedDepreciation,
            credit: 0,
            refType: "ASSET_DISPOSAL",
            refId: disposal.id,
          },
          // Credit Asset Account
          {
            accountCode: asset.category.glAssetAccount.code,
            debit: 0,
            credit: acquisitionCost,
            refType: "ASSET_DISPOSAL",
            refId: disposal.id,
          },
        ];

        // Add gain/loss entry
        if (gainLoss !== 0) {
          if (gainLoss > 0) {
            // Gain on disposal
            journalEntries.push({
              accountCode: "4700",
              debit: 0,
              credit: Math.abs(gainLoss),
              refType: "ASSET_DISPOSAL",
              refId: disposal.id,
            });
          } else {
            // Loss on disposal
            journalEntries.push({
              accountCode: "6400",
              debit: Math.abs(gainLoss),
              credit: 0,
              refType: "ASSET_DISPOSAL",
              refId: disposal.id,
            });
          }
        }

        const journalId = await glService.postJournal(
          tx,
          journalEntries,
          `Asset disposal: ${asset.name} - ${data.disposalMethod}`,
          userId,
        );

        // Update disposal with journal reference
        await tx.assetDisposal.update({
          where: { id: disposal.id },
          data: { journalId },
        });

        return disposal;
      },
      {
        maxWait: 5000, // 5s wait for connection
        timeout: 20000, // 20s max runtime
      },
    );
  }

  async recapitalizeAsset(assetId: string, data: any, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        include: { category: { include: { glAssetAccount: true } } },
      });
      if (!asset) throw new Error("Asset not found");
      if (asset.status !== "ACTIVE") {
        throw new Error("Only active assets can be recapitalized");
      }

      const transactionDate = new Date(data.transactionDate);
      if (transactionDate < asset.acquisitionDate) {
        throw new Error("Recapitalization date cannot be before acquisition");
      }

      const sourceAccount = await tx.chartOfAccount.findUnique({
        where: { id: data.sourceAccountId },
      });
      if (!sourceAccount) throw new Error("Source account not found");

      const amount = new Decimal(data.amount);
      if (data.transactionType === "CAPITAL_IMPROVEMENT") {
        const cashAccount = await tx.cashAccount.findFirst({
          where: { glAccountId: sourceAccount.id },
        });
        if (cashAccount) {
          await tx.cashAccount.update({
            where: { id: cashAccount.id },
            data: { balance: { decrement: amount } },
          });
        }
      }

      const journalId = await glService.postJournal(
        tx,
        [
          {
            accountCode: asset.category.glAssetAccount.code,
            debit: Number(amount),
            credit: 0,
            refType: "ASSET_RECAPITALIZATION",
            refId: asset.id,
          },
          {
            accountCode: sourceAccount.code,
            debit: 0,
            credit: Number(amount),
            refType: "ASSET_RECAPITALIZATION",
            refId: asset.id,
          },
        ],
        `Asset recapitalization: ${asset.assetNo} - ${data.description}`,
        userId,
        transactionDate,
      );

      const usefulLifeExtension = Number(data.usefulLifeExtension || 0);
      return tx.assetRecapitalization.create({
        data: {
          assetId: asset.id,
          transactionDate,
          description: data.description,
          amount,
          transactionType: data.transactionType,
          usefulLifeExtension,
          previousAcquisitionCost: asset.acquisitionCost,
          // Keep original cost immutable; improvements are tracked separately.
          newAcquisitionCost: asset.acquisitionCost,
          previousUsefulLife: asset.usefulLife,
          // Useful life remains stored in years; the extension is stored in months.
          newUsefulLife: asset.usefulLife,
          sourceAccountId: sourceAccount.id,
          journalId,
          createdBy: userId,
        },
      });
    });
  }

  // Asset Register Report
  async getAssetRegister(filters: any = {}) {
    let {
      page = 1,
      limit = 10,
      categoryId,
      status,
      locationId,
      search,
      asOfDate,
    } = filters;

    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const skip = (page - 1) * limit;

    const where: any = {};

    // Match getAssets filtering behavior
    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (status && status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (locationId && locationId !== "ALL") {
      where.locationId = locationId;
    }
    if (asOfDate) {
      where.acquisitionDate = { lte: new Date(asOfDate) };
    }
    if (typeof search === "string" && search.trim()) {
      where.OR = [
        { assetNo: { contains: search.trim(), mode: "insensitive" } },
        { name: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              code: true,
              name: true,
              depreciationMethod: true,
            },
          },
          location: {
            select: {
              code: true,
              name: true,
            },
          },
          recapitalizations: {
            where: asOfDate
              ? { transactionDate: { lte: new Date(asOfDate) } }
              : undefined,
          },
          depreciationEntries: {
            where: asOfDate
              ? {
                  OR: [
                    {
                      periodYear: {
                        lt: new Date(asOfDate).getFullYear(),
                      },
                    },
                    {
                      AND: [
                        {
                          periodYear: new Date(asOfDate).getFullYear(),
                        },
                        {
                          periodMonth: {
                            lte: new Date(asOfDate).getMonth() + 1,
                          },
                        },
                      ],
                    },
                  ],
                }
              : undefined,
            orderBy: [
              { periodYear: "desc" },
              { periodMonth: "desc" },
              { createdAt: "desc" },
            ],
            take: 1,
          },
        },
        orderBy: [
          {
            category: {
              code: "asc",
            },
          },
          {
            assetNo: "asc",
          },
        ],
      }),

      prisma.asset.count({
        where,
      }),
    ]);

    const transformedAssets = assets.map((asset) => {
      const accumulatedDepreciation =
        asset.depreciationEntries.length > 0
          ? Number(asset.depreciationEntries[0].accumulatedDepreciation)
          : 0;

      const recapitalizedAmount = asset.recapitalizations.reduce(
        (sum, recap) => sum + Number(recap.amount),
        0,
      );
      const grossCost = Number(asset.acquisitionCost) + recapitalizedAmount;
      return {
        ...asset,
        acquisitionCost: grossCost,
        originalAcquisitionCost: Number(asset.acquisitionCost),
        recapitalizedAmount,
        accumulatedDepreciation,
        netBookValue: grossCost - accumulatedDepreciation,
      };
    });

    return {
      assets: transformedAssets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  // async getAssetRegister(filters: any = {}) {
  //   const { categoryId, status, locationId, asOfDate } = filters;

  //   const where: any = {};
  //   if (categoryId) where.categoryId = categoryId;
  //   if (status) where.status = status;
  //   if (locationId) where.locationId = locationId;

  //   const assets = await prisma.asset.findMany({
  //     where,
  //     include: {
  //       category: {
  //         select: { code: true, name: true, depreciationMethod: true },
  //       },
  //       location: { select: { code: true, name: true } },
  //       depreciationEntries: {
  //         where: asOfDate
  //           ? {
  //               OR: [
  //                 { periodYear: { lt: new Date(asOfDate).getFullYear() } },
  //                 {
  //                   AND: [
  //                     { periodYear: new Date(asOfDate).getFullYear() },
  //                     {
  //                       periodMonth: { lte: new Date(asOfDate).getMonth() + 1 },
  //                     },
  //                   ],
  //                 },
  //               ],
  //             }
  //           : undefined,
  //         orderBy: { createdAt: "desc" },
  //         take: 1,
  //       },
  //     },
  //     orderBy: [{ category: { code: "asc" } }, { assetNo: "asc" }],
  //   });

  //   return assets.map((asset) => {
  //     const accumulatedDepreciation =
  //       asset.depreciationEntries.length > 0
  //         ? Number(asset.depreciationEntries[0].accumulatedDepreciation)
  //         : 0;

  //     return {
  //       ...asset,
  //       accumulatedDepreciation,
  //       netBookValue: Number(asset.acquisitionCost) - accumulatedDepreciation,
  //     };
  //   });
  // }

  // Depreciation Schedule
  async getDepreciationSchedule(assetId: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        recapitalizations: { orderBy: { transactionDate: "asc" } },
        depreciationEntries: {
          orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
        },
      },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    const recapitalizedAmount = asset.recapitalizations.reduce(
      (sum, recap) => sum + Number(recap.amount),
      0,
    );
    return {
      asset: {
        ...asset,
        acquisitionCost: Number(asset.acquisitionCost) + recapitalizedAmount,
        originalAcquisitionCost: Number(asset.acquisitionCost),
        recapitalizedAmount,
      },
      schedule: asset.depreciationEntries,
    };
  }

  // Asset Valuation Summary
  async getAssetValuation(asOfDate?: string) {
    const cutoffDate = asOfDate ? new Date(asOfDate) : new Date();
    const cutoffYear = cutoffDate.getFullYear();
    const cutoffMonth = cutoffDate.getMonth() + 1;

    const assets = await prisma.asset.findMany({
      where: {
        status: "ACTIVE",
        acquisitionDate: { lte: cutoffDate },
      },
      include: {
        category: { select: { code: true, name: true } },
        recapitalizations: {
          where: { transactionDate: { lte: cutoffDate } },
        },
        depreciationEntries: {
          where: {
            OR: [
              { periodYear: { lt: cutoffYear } },
              {
                AND: [
                  { periodYear: cutoffYear },
                  { periodMonth: { lte: cutoffMonth } },
                ],
              },
            ],
          },
          orderBy: [
            { periodYear: "desc" },
            { periodMonth: "desc" },
            { createdAt: "desc" },
          ],
          take: 1,
        },
      },
    });

    let totalCost = 0;
    let totalAccumulatedDepreciation = 0;
    let totalNetBookValue = 0;

    const valuation = assets.map((asset) => {
      const recapitalizedAmount = asset.recapitalizations.reduce(
        (sum, recap) => sum + Number(recap.amount),
        0,
      );
      const cost = Number(asset.acquisitionCost) + recapitalizedAmount;
      const accumulated =
        asset.depreciationEntries.length > 0
          ? Number(asset.depreciationEntries[0].accumulatedDepreciation)
          : 0;
      const netBook = cost - accumulated;

      totalCost += cost;
      totalAccumulatedDepreciation += accumulated;
      totalNetBookValue += netBook;

      return {
        assetNo: asset.assetNo,
        name: asset.name,
        category: asset.category,
        acquisitionCost: cost,
        originalAcquisitionCost: Number(asset.acquisitionCost),
        recapitalizedAmount,
        accumulatedDepreciation: accumulated,
        netBookValue: netBook,
      };
    });

    return {
      valuation,
      summary: {
        totalCost,
        totalAccumulatedDepreciation,
        totalNetBookValue,
        assetCount: assets.length,
      },
      asOfDate: cutoffDate,
    };
  }
}
