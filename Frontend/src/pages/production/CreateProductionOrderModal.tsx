import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productionApi, inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";

const createProductionOrderSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  qtyTarget: z.number().positive("Target quantity must be positive"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  bomId: z.string().optional(),
});

type CreateProductionOrderFormData = z.infer<
  typeof createProductionOrderSchema
>;

interface CreateProductionOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateProductionOrderModal = ({
  onClose,
  onSuccess,
}: CreateProductionOrderModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductionOrderFormData>({
    resolver: zodResolver(createProductionOrderSchema),
  });

  const selectedItemId = watch("itemId");

  // const { data: finishedGoods } = useQuery({
  //   queryKey: ['finished-goods-for-production'],
  //   queryFn: () => inventoryApi.getItems({ type: 'FINISHED_GOODS', limit: 100 })
  // });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const { data: boms } = useQuery<any[]>({
    queryKey: ["boms-for-item", selectedItemId],
    queryFn: () => inventoryApi.getBoms({ itemId: selectedItemId }),
    enabled: !!selectedItemId,
  });

  const onSubmit = async (data: CreateProductionOrderFormData) => {
    try {
      // Remove empty bomId to avoid validation error
      const submitData = {
        ...data,
        bomId: data.bomId || undefined,
      };
      await productionApi.createProductionOrder(submitData);
      toast.success("Production order created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create production order error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create Production Order
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Finished Goods Item *
                </label>
                <ItemSelect
                  value={watch("itemId")}
                  onChange={(val) => setValue("itemId", val)}
                  typeFilter="FINISHED_GOODS"
                />
                {errors.itemId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.itemId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Target Quantity *
                  </label>
                  <input
                    {...register("qtyTarget", { valueAsNumber: true })}
                    type="number"
                    step="0.001"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="100"
                  />
                  {errors.qtyTarget && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.qtyTarget.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Warehouse *
                  </label>
                  <select
                    {...register("warehouseId")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses?.warehouses?.map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                  </select>
                  {errors.warehouseId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.warehouseId.message}
                    </p>
                  )}
                </div>
              </div>

              {selectedItemId && boms && boms.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bill of Materials (Recommended)
                  </label>
                  <select
                    {...register("bomId")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">No BOM - Manual material planning</option>
                    {boms.map((bom: any) => (
                      <option key={bom.id} value={bom.id}>
                        Version {bom.version} ({bom.bomLines.length} components)
                      </option>
                    ))}
                  </select>
                  {boms.length > 0 && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        BOM Preview:
                      </h4>
                      {boms.map((bom: any) => (
                        <div key={bom.id} className="text-sm text-blue-800">
                          <strong>Version {bom.version}:</strong>
                          <ul className="ml-4 mt-1">
                            {bom.bomLines.map((line: any, index: number) => (
                              <li key={index}>
                                {line.componentItem.sku} - {line.qtyPer}{" "}
                                {line.componentItem.uom} per unit
                                {line.scrapPercent > 0 &&
                                  ` (${line.scrapPercent}% scrap)`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedItemId && (!boms || boms.length === 0) && (
                <div className="bg-yellow-50 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        No BOM Available
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          This item doesn't have a Bill of Materials. You'll
                          need to manually specify which raw materials to issue
                          during production.
                        </p>
                        <p className="mt-1">
                          Consider creating a BOM for this item to automate
                          material calculations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
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
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create Production Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProductionOrderModal;
