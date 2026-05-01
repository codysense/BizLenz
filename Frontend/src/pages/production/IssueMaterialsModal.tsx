import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Calculator, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productionApi, inventoryApi } from "../../lib/api";
import { ProductionOrder } from "../../types/api";
import toast from "react-hot-toast";

const issueMaterialsSchema = z.object({
  materials: z
    .array(
      z.object({
        itemId: z.string().min(1, "Item is required"),
        qty: z.number().positive("Quantity must be positive"),
      }),
    )
    .min(1, "At least one material is required"),
});

type IssueMaterialsFormData = z.infer<typeof issueMaterialsSchema>;

interface IssueMaterialsModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const IssueMaterialsModal = ({
  order,
  onClose,
  onSuccess,
}: IssueMaterialsModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueMaterialsFormData>({
    resolver: zodResolver(issueMaterialsSchema),
    defaultValues: {
      materials: [{ itemId: "", qty: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "materials",
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ["raw-materials-for-issue"],
    queryFn: () => inventoryApi.getItems({ type: "RAW_MATERIAL", limit: 100 }),
  });

  const bomItemIds = order.bom?.bomLines.map((l) => l.componentItemId) ?? [];

  const missingBomIds = bomItemIds.filter(
    (id) => !rawMaterials?.items?.some((item: any) => item.id === id),
  );

  const { data: missingBomItems } = useQuery({
    queryKey: ["missing-bom-materials", missingBomIds],
    queryFn: async () => {
      const results = await Promise.all(
        missingBomIds.map((id) => inventoryApi.getItemById(id)),
      );
      return results;
    },
    enabled: missingBomIds.length > 0,
  });

  const allMaterials = React.useMemo(() => {
    const base = rawMaterials?.items ?? [];
    const extra = missingBomItems ?? [];

    const merged = [...base];

    extra.forEach((item: any) => {
      if (!merged.some((m: any) => m.id === item.id)) {
        merged.push(item);
      }
    });

    return merged;
  }, [rawMaterials, missingBomItems]);

  // Get stock information for materials
  type StockInfo = {
    qty: number;
    avgCost: number;
  };

  const selectedItemIds = watch("materials")
    .map((m) => m.itemId)
    .filter(Boolean);

  const { data: stockData } = useQuery({
    queryKey: ["materials-stock", selectedItemIds, order.warehouseId],
    queryFn: async () => {
      const stockPromises = selectedItemIds.map(async (itemId) => {
        try {
          const stock = await inventoryApi.getItemStock(
            itemId,
            order.warehouseId,
          );

          return {
            itemId,
            qty: stock.qty,
            avgCost: stock.avgCost,
          };
        } catch {
          return {
            itemId,
            qty: 0,
            avgCost: 0,
          };
        }
      });

      const results = await Promise.all(stockPromises);

      return results.reduce(
        (acc, result) => {
          acc[result.itemId] = {
            qty: result.qty,
            avgCost: result.avgCost,
          };
          return acc;
        },
        {} as Record<string, { qty: number; avgCost: number }>,
      );
    },
    enabled: selectedItemIds.length > 0,
  });

  // const { data: stockData } = useQuery({
  //   queryKey: ["materials-stock", order.warehouseId],
  //   queryFn: async () => {
  //     if (!rawMaterials?.items) return {};

  //     const stockPromises = rawMaterials.items.map(async (item: any) => {
  //       try {
  //         const stock = await inventoryApi.getItemStock(
  //           item.id,
  //           order.warehouseId,
  //         );
  //         return {
  //           itemId: item.id,
  //           qty: stock.qty,
  //           avgCost: stock.avgCost,
  //         };
  //       } catch {
  //         return {
  //           itemId: item.id,
  //           qty: 0,
  //           avgCost: 0,
  //         };
  //       }
  //     });

  //     const stockResults = await Promise.all(stockPromises);

  //     return stockResults.reduce(
  //       (acc, result) => {
  //         acc[result.itemId] = {
  //           qty: result.qty,
  //           avgCost: result.avgCost,
  //         };
  //         return acc;
  //       },
  //       {} as Record<string, StockInfo>,
  //     );
  //   },
  //   enabled: !!rawMaterials?.items,
  // });

  // Auto-calculate materials from BOM
  const calculateFromBOM = () => {
    if (!order.bom?.bomLines) {
      alert("No BOM available for this item");
      return;
    }

    const calculatedMaterials = order.bom.bomLines.map((line) => {
      const baseQty = Number(line.qtyPer) * Number(order.qtyTarget);
      const scrapMultiplier = 1 + Number(line.scrapPercent) / 100;
      const totalQty = baseQty * scrapMultiplier;

      return {
        itemId: line.componentItemId,
        qty: Math.round(totalQty * 1000) / 1000, // Round to 3 decimal places
      };
    });

    reset({ materials: calculatedMaterials });
  };

  // Initialize with BOM data if available
  useEffect(() => {
    if (
      rawMaterials?.items?.length &&
      order.bom?.bomLines &&
      fields.length === 1 &&
      !fields[0].itemId
    ) {
      calculateFromBOM();
    }
  }, [rawMaterials, order.bom]);

  const watchedMaterials = watch("materials");

  // Calculate total estimated cost
  const calculateTotalCost = () => {
    return watchedMaterials.reduce((total, material) => {
      const stock = stockData?.[material.itemId];
      const cost = stock?.avgCost || 0;

      return total + (material.qty || 0) * cost;
    }, 0);
  };

  const onSubmit = async (data: IssueMaterialsFormData) => {
    try {
      await productionApi.issueMaterials(order.id, data);
      toast.success("Materials issued successfully");
      onSuccess();
    } catch (error) {
      console.error("Issue materials error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Issue Materials: {order.orderNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Order Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <span className="text-sm text-gray-500">Item:</span>
                    <div className="font-medium">{order.item.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Target Qty:</span>
                    <div className="font-medium">{order.qtyTarget}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Warehouse:</span>
                    <div className="font-medium">{order.warehouse.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">
                      BOM Available:
                    </span>
                    <div className="font-medium">
                      {order.bom
                        ? `Yes (${order.bom.bomLines.length} components)`
                        : "No"}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOM Information */}
              {order.bom && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-green-900">
                      Bill of Materials (Version {order.bom.version || "1.0"})
                    </h4>
                    <button
                      type="button"
                      onClick={calculateFromBOM}
                      className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Auto-Calculate from BOM
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {order.bom.bomLines.map((line, index) => {
                      const baseQty =
                        Number(line.qtyPer) * Number(order.qtyTarget);
                      const scrapMultiplier =
                        1 + Number(line.scrapPercent) / 100;
                      const totalQty = baseQty * scrapMultiplier;

                      return (
                        <div key={index} className="text-sm">
                          <div className="font-medium">
                            {line.componentItem.sku}
                          </div>
                          <div className="text-green-700">
                            {line.qtyPer} × {order.qtyTarget} = {baseQty}{" "}
                            {line.componentItem.uom}
                            {line.scrapPercent > 0 && (
                              <span className="text-orange-600">
                                {" "}
                                (+{line.scrapPercent}% scrap ={" "}
                                {totalQty.toFixed(3)})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Materials */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Materials to Issue
                  </h4>
                  <button
                    type="button"
                    onClick={() => append({ itemId: "", qty: 1 })}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material
                  </button>
                </div>

                {errors.materials && (
                  <p className="mb-4 text-sm text-red-600">
                    {errors.materials.message}
                  </p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Material *
                          </label>
                          <select
                            {...register(`materials.${index}.itemId`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            {rawMaterials
                              ? "Select material"
                              : "Loading materials..."}
                            {allMaterials.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} - {item.name}
                              </option>
                            ))}
                            {/* {rawMaterials?.items?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} - {item.name}
                                (Stock: {stockData?.[item.id]?.qty ?? 0}{" "}
                                {item.uom})
                                {stockData?.[item.id]?.avgCost
                                  ? ` - ₦${stockData[item.id].avgCost.toLocaleString()}`
                                  : ""}
                              </option>
                            ))} */}
                          </select>
                          {errors.materials?.[index]?.itemId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.materials[index]?.itemId?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Available Stock
                          </label>
                          <div className="mt-1 p-2 bg-white border border-gray-200 rounded-md text-sm">
                            {(() => {
                              const selectedItem = rawMaterials?.items?.find(
                                (item: any) =>
                                  item.id === watchedMaterials[index]?.itemId,
                              );
                              const stock =
                                stockData?.[watchedMaterials[index]?.itemId]
                                  ?.qty || 0;

                              const isInsufficient =
                                stock < (watchedMaterials[index]?.qty || 0);

                              return (
                                <div
                                  className={`flex items-center ${
                                    isInsufficient
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {isInsufficient && (
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                  )}
                                  <span>
                                    {stock} {selectedItem?.uom || "units"}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Quantity *
                            </label>
                            <input
                              {...register(`materials.${index}.qty`, {
                                valueAsNumber: true,
                              })}
                              type="number"
                              step="0.001"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="1.00"
                            />
                            {errors.materials?.[index]?.qty && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.materials[index]?.qty?.message}
                              </p>
                            )}
                          </div>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-gray-500 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">
                    Estimated Total Cost:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₦{calculateTotalCost().toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Based on inventory average costs of selected
                  materials(warehouse-specific).
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
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Issuing..." : "Issue Materials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueMaterialsModal;
