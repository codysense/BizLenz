import { Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();
const SENSITIVE_KEY = /password|token|secret|authorization|cookie/i;
const AUDIT_REFERENCE_FIELDS: Record<string, { delegate: string; select: Record<string, boolean> }> = {
  vendorId: { delegate: 'vendor', select: { id: true, code: true, name: true } },
  itemId: { delegate: 'item', select: { id: true, sku: true, name: true } },
  customerId: { delegate: 'customer', select: { id: true, code: true, name: true } },
  warehouseId: { delegate: 'warehouse', select: { id: true, code: true, name: true } },
  locationId: { delegate: 'location', select: { id: true, code: true, name: true } },
  cashAccountId: { delegate: 'cashAccount', select: { id: true, code: true, name: true } },
  chartOfAccountId: { delegate: 'chartOfAccount', select: { id: true, code: true, name: true } },
  glAccountId: { delegate: 'chartOfAccount', select: { id: true, code: true, name: true } },
  customerGroupId: { delegate: 'customerGroup', select: { id: true, code: true, name: true } },
  categoryId: { delegate: 'assetCategory', select: { id: true, code: true, name: true } },
  assetCategoryId: { delegate: 'assetCategory', select: { id: true, code: true, name: true } },
  purchaseId: { delegate: 'purchase', select: { id: true, orderNo: true } },
  purchaseOrderId: { delegate: 'purchase', select: { id: true, orderNo: true } },
  saleId: { delegate: 'sale', select: { id: true, orderNo: true } },
  salesOrderId: { delegate: 'sale', select: { id: true, orderNo: true } },
  productionOrderId: { delegate: 'productionOrder', select: { id: true, orderNo: true } },
  userId: { delegate: 'user', select: { id: true, name: true, email: true } },
  createdBy: { delegate: 'user', select: { id: true, name: true, email: true } },
  createdById: { delegate: 'user', select: { id: true, name: true, email: true } },
  preparedBy: { delegate: 'user', select: { id: true, name: true, email: true } },
  receivedBy: { delegate: 'user', select: { id: true, name: true, email: true } },
  invoicedBy: { delegate: 'user', select: { id: true, name: true, email: true } },
  paidBy: { delegate: 'user', select: { id: true, name: true, email: true } },
  approvedBy: { delegate: 'user', select: { id: true, name: true, email: true } },
  authorizedBy: { delegate: 'user', select: { id: true, name: true, email: true } },
  deliveredBy: { delegate: 'user', select: { id: true, name: true, email: true } },
};

/** Resolve foreign keys in any audit payload to readable codes/names. */
export async function resolveAuditReferences(...values: any[]): Promise<Record<string, Record<string, any>>> {
  const idsByField = new Map<string, Set<string>>();
  const visit = (value: any): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(visit);
    for (const [key, child] of Object.entries(value)) {
      if (AUDIT_REFERENCE_FIELDS[key] && typeof child === 'string' && child) {
        if (!idsByField.has(key)) idsByField.set(key, new Set());
        idsByField.get(key)!.add(child);
      } else if (child && typeof child === 'object') visit(child);
    }
  };
  values.forEach(visit);

  const fieldsByDelegate = new Map<string, string[]>();
  for (const field of idsByField.keys()) {
    const delegate = AUDIT_REFERENCE_FIELDS[field].delegate;
    fieldsByDelegate.set(delegate, [...(fieldsByDelegate.get(delegate) ?? []), field]);
  }
  const resolved = await Promise.all([...fieldsByDelegate.entries()].map(async ([delegateName, fields]) => {
    const ids = new Set(fields.flatMap((field) => [...idsByField.get(field)!]));
    const spec = AUDIT_REFERENCE_FIELDS[fields[0]];
    try {
      const delegate = (prisma as any)[delegateName];
      const rows = await delegate.findMany({ where: { id: { in: [...ids] } }, select: spec.select });
      return fields.map((field) => [
        field,
        Object.fromEntries(rows.filter((row: any) => idsByField.get(field)!.has(row.id)).map((row: any) => [row.id, row])),
      ] as const);
    } catch (error) {
      console.error(`Failed to resolve audit references for ${delegateName}:`, error);
      return fields.map((field) => [field, {}] as const);
    }
  }));
  return Object.fromEntries(resolved.flat().filter(([, records]) => Object.keys(records).length));
}

function sanitize(value: any, depth = 0): any {
  if (value == null) return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return typeof value === 'function' ? undefined : value;
  if (depth > 8) return '[truncated]';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  // Prisma Decimal implements toJSON() as a lossless decimal string. Use it
  // before traversing enumerable properties, which include a function-valued
  // constructor that Prisma JSON fields cannot serialize.
  if (!Array.isArray(value) && typeof value.toJSON === 'function') {
    try {
      const jsonValue = value.toJSON();
      if (jsonValue !== value) return sanitize(jsonValue, depth + 1);
    } catch {
      // Fall through to safe enumerable-property handling.
    }
  }
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitize(item, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 300).map(([key, item]) => [
    key,
    SENSITIVE_KEY.test(key) ? '[redacted]' : sanitize(item, depth + 1),
  ]).filter(([, item]) => item !== undefined));
}

function recordFromResponse(value: any): any {
  if (!value || typeof value !== 'object') return value ?? null;
  // Controllers commonly return { data: record } or { success, data }.
  return value.data && typeof value.data === 'object' ? value.data : value;
}

export async function writeAuditLog({
  req,
  action,
  entity,
  entityId,
  before,
  after,
}: {
  req: AuthRequest;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
}): Promise<void> {
  if (!req.user) return;
  const requestJson = sanitize(req.body ?? null);
  const safeBefore = before == null ? Prisma.JsonNull : sanitize(before);
  const safeAfter = after == null ? Prisma.JsonNull : sanitize(after);
  const relatedRecords = await resolveAuditReferences(requestJson, before, after);
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action,
        entity,
        entityId,
        beforeJson: safeBefore,
        afterJson: safeAfter,
        requestJson: requestJson == null ? Prisma.JsonNull : requestJson,
        ipAddress: req.ip,
        metadataJson: {
          method: req.method,
          path: req.originalUrl,
          statusCode: 200,
          userAgent: req.get('user-agent') ?? null,
          relatedRecords,
        },
      } as any,
    });
  } catch (error) {
    // Compatibility with databases/clients that have not received the audit context migration.
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action,
          entity,
          entityId,
          // In the fallback schema this stores the actual prior state when available.
          beforeJson: safeBefore === Prisma.JsonNull && requestJson != null ? requestJson : safeBefore,
          afterJson: safeAfter,
          ipAddress: req.ip,
        } as any,
      });
    } catch (fallbackError) {
      console.error('Audit logging failed for', entity, entityId, fallbackError, error);
    }
  }
}

export const auditLogger = (action: string, entity: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const requestJson = sanitize(req.body ?? null);
    let auditPromise: Promise<any> | null = null;
    const originalJson = res.json;
    const persistAudit = (responseData: any) => {
      if (auditPromise) return auditPromise;
      if (!req.user || res.statusCode >= 400) return Promise.resolve();
      const response = recordFromResponse(responseData);
      const entityId = response?.id ?? response?.data?.id ?? req.params.id ?? null;
      const auditData: Prisma.AuditLogCreateInput = {
        user: { connect: { id: req.user.id } },
        action,
        entity,
        entityId: String(entityId ?? 'unknown'),
        // The request is an attempted change, not the previous persisted state.
        beforeJson: Prisma.JsonNull,
        afterJson: response == null ? Prisma.JsonNull : sanitize(response),
        requestJson: requestJson == null ? Prisma.JsonNull : requestJson,
        ipAddress: req.ip,
        metadataJson: {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
          userAgent: req.get('user-agent') ?? null,
        },
      };
      auditPromise = resolveAuditReferences(requestJson, response).then((relatedRecords) => prisma.auditLog.create({
        data: {
          ...auditData,
          metadataJson: { ...auditData.metadataJson as any, relatedRecords },
        } as any,
      })).catch(async (error) => {
        // Keep audit writes working with an older generated Prisma client during rollout.
        // In that compatibility path, beforeJson is the submitted payload (as it was
        // historically), never a verified database snapshot.
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user!.id,
              action,
              entity,
              entityId: String(entityId ?? 'unknown'),
              beforeJson: requestJson == null ? Prisma.JsonNull : requestJson,
              afterJson: response == null ? Prisma.JsonNull : sanitize(response),
              ipAddress: req.ip,
            } as any,
          });
        } catch (fallbackError) {
          console.error('Audit logging failed:', fallbackError, error);
        }
      });
      return auditPromise;
    };

    // Persist before sending JSON so serverless hosts and process restarts cannot
    // discard the fire-and-forget write after the response has completed.
    res.json = function (data: any) {
      const response = this;
      void persistAudit(data).finally(() => originalJson.call(response, data));
      return this;
    } as any;

    // Retain support for handlers that send a non-JSON response.
    res.once('finish', () => {
      if (!auditPromise) void persistAudit(null);
    });
    next();
  };
};
