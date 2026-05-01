import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesApi, inventoryApi } from "../../lib/api";
import { Sale } from "../../types/api";
import toast from "react-hot-toast";

const deliverSaleSchema = z.object({
  deliveryLines: z
    .array(
      z.object({
        saleLineId: z.string().min(1, "Sale line is required"),
        qtyDelivered: z.number().positive("Quantity must be positive"),
        warehouseId: z.string().min(1, "Warehouse is required"),
      }),
    )
    .min(1, "At least one delivery line is required"),
});

type DeliverSaleFormData = z.infer<typeof deliverSaleSchema>;

interface DeliverSaleModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

const DeliverSaleModal = ({
  sale,
  onClose,
  onSuccess,
}: DeliverSaleModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeliverSaleFormData>({
    resolver: zodResolver(deliverSaleSchema),
    defaultValues: {
      deliveryLines: sale.saleLines.map((line) => ({
        saleLineId: line.id,
        qtyDelivered: line.qty,
        warehouseId: "",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "deliveryLines",
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-delivery"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const watchedLines = watch("deliveryLines");

  const onSubmit = async (data: DeliverSaleFormData) => {
    try {
      await salesApi.deliverSale(sale.id, data);
      toast.success("Sale delivered successfully");
      onSuccess();
    } catch (error) {
      console.error("Deliver sale error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Deliver Sales Order: {sale.orderNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Sale Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-sm text-gray-500">Customer:</span>
                    <div className="font-medium">{sale.customer.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Order Date:</span>
                    <div className="font-medium">
                      {new Date(sale.orderDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Total Amount:</span>
                    <div className="font-medium">
                      ₦{sale.totalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              {/* Global Warehouse Assignment */}
              <div className="bg-gray-100 p-4 rounded-lg mb-4 border">
                <label className="block text-sm font-medium text-gray-700">
                  Apply Warehouse to All Lines
                </label>

                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3
               focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  onChange={(e) => {
                    const selected = e.target.value;

                    // Update every line's warehouseId
                    fields.forEach((_, index) => {
                      setValue(`deliveryLines.${index}.warehouseId`, selected);
                    });
                  }}
                >
                  <option value="">Select warehouse</option>
                  {warehouses?.warehouses?.map((warehouse: any) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Lines */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Delivery Details
                </h4>

                {errors.deliveryLines && (
                  <p className="mb-4 text-sm text-red-600">
                    {errors.deliveryLines.message}
                  </p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const saleLine = sale.saleLines[index];
                    if (!saleLine) return null;

                    return (
                      <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Item
                            </label>
                            <div className="mt-1 p-2 bg-white border border-gray-300 rounded-md text-sm">
                              <div className="font-medium">
                                {saleLine.item.sku}
                              </div>
                              <div className="text-gray-500">
                                {saleLine.item.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                Ordered: {saleLine.qty} {saleLine.item.uom}
                              </div>
                            </div>
                            <input
                              type="hidden"
                              {...register(`deliveryLines.${index}.saleLineId`)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Qty to Deliver *
                            </label>
                            <input
                              {...register(
                                `deliveryLines.${index}.qtyDelivered`,
                                { valueAsNumber: true },
                              )}
                              type="number"
                              step="0.001"
                              max={saleLine.qty}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.deliveryLines?.[index]?.qtyDelivered && (
                              <p className="mt-1 text-sm text-red-600">
                                {
                                  errors.deliveryLines[index]?.qtyDelivered
                                    ?.message
                                }
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Warehouse *
                            </label>
                            <select
                              {...register(
                                `deliveryLines.${index}.warehouseId`,
                              )}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select warehouse</option>
                              {warehouses?.warehouses?.map((warehouse: any) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.code} - {warehouse.name}
                                </option>
                              ))}
                            </select>
                            {errors.deliveryLines?.[index]?.warehouseId && (
                              <p className="mt-1 text-sm text-red-600">
                                {
                                  errors.deliveryLines[index]?.warehouseId
                                    ?.message
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Delivering..." : "Deliver Items"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliverSaleModal;
