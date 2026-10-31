import { z } from 'zod';
import { ProductionOrderStatus, WipLedgerType } from '@prisma/client';
import { hasAtMostDecimalPlaces } from './decimalPrecision';

const quantitySchema = z
  .number()
  .positive()
  .finite()
  .refine((value) => hasAtMostDecimalPlaces(value, 12), {
    message: 'Quantity can have at most 12 decimal places',
  });

export const createProductionOrderSchema = z.object({
  itemId: z.string().cuid(),
  qtyTarget: quantitySchema,
  warehouseId: z.string().cuid(),
  bomId: z.string().cuid().optional().or(z.literal('')),
});

export const issueMaterialsSchema = z.object({
  materials: z.array(z.object({
    itemId: z.string().cuid(),
    qty: quantitySchema,
    unitCost: z.number().positive().optional(),
  })),
});

export const addLaborSchema = z.object({
  hours: z.number().positive(),
  rate: z.number().positive(),
  employeeName: z.string().optional(),
});

export const addOverheadSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
});

export const receiveFinishedGoodsSchema = z.object({
  qtyGood: quantitySchema,
  qtyScrap: z.number().min(0).refine((value) => hasAtMostDecimalPlaces(value, 12), {
    message: 'Quantity can have at most 12 decimal places',
  }).default(0),
});

export type CreateProductionOrderRequest = z.infer<typeof createProductionOrderSchema>;
export type IssueMaterialsRequest = z.infer<typeof issueMaterialsSchema>;
export type AddLaborRequest = z.infer<typeof addLaborSchema>;
export type AddOverheadRequest = z.infer<typeof addOverheadSchema>;
export type ReceiveFinishedGoodsRequest = z.infer<typeof receiveFinishedGoodsSchema>;
