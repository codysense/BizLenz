import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productionApi, inventoryApi } from "../../lib/api";
import { ProductionOrder } from "../../types/api";
import toast from "react-hot-toast";

const editProductionOrderSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  qtyTarget: z.number().positive("Target quantity must be positive"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  bomId: z.string().optional(),
});

type EditProductionOrderFormData = z.infer<typeof editProductionOrderSchema>;

interface EditProductionOrderModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProductionOrderModal = ({
  order,
  onClose,
  onSuccess,
}: EditProductionOrderModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditProductionOrderFormData>({
    resolver: zodResolver(editProductionOrderSchema),
    defaultValues: {
      itemId: order.itemId,
      qtyTarget: Number(order.qtyTarget),
      warehouseId: order.warehouseId,
      bomId: order.bomId || "",
    },
  });
  console.log("order passed", order);

  const selectedItemId = watch("itemId");

  const { data: finishedGoods } = useQuery({
    queryKey: ["finished-goods-for-edit-production"],
    queryFn: () =>
      inventoryApi.getItems({ type: "FINISHED_GOODS", limit: 100 }),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-edit"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const { data: boms } = useQuery({
    queryKey: ["boms-for-edit-item", selectedItemId],
    queryFn: () =>
      selectedItemId ? inventoryApi.getBoms({ itemId: selectedItemId }) : null,
    enabled: !!selectedItemId,
  });

  // Reset form when order changes
  useEffect(() => {
    reset({
      itemId: order.itemId,
      qtyTarget: Number(order.qtyTarget),
      warehouseId: order.warehouseId,
      bomId: order.bomId || "",
    });
  }, [order, reset]);

  const onSubmit = async (data: EditProductionOrderFormData) => {
    try {
      const submitData = {
        ...data,
        bomId: data.bomId || undefined,
      };
      await productionApi.updateProductionOrder(order.id, submitData);
      toast.success("Production order updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit production order error:", error);
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
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Production Order
                </h3>
                <p className="text-sm text-gray-600">
                  {order.orderNo} - Current Status: {order.status}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {order.status === "RELEASED" && (
              <div className="mb-4 bg-yellow-50 p-4 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This production order has been
                    released. Changes may affect material planning and
                    scheduling.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Finished Goods Item *
                </label>
                <select
                  {...register("itemId")}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select finished goods item</option>
                  {finishedGoods?.items?.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </option>
                  ))}
                </select>
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
                  <p className="mt-1 text-xs text-gray-500">
                    Original: {order.qtyTarget}
                  </p>
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
                    Bill of Materials
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
                </div>
              )}

              {/* Change Summary */}
              {isDirty && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    Changes Summary:
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Production order details will be updated</li>
                    <li>
                      • Material requirements may change if item or quantity is
                      modified
                    </li>
                    {order.status === "RELEASED" && (
                      <li>
                        • <strong>Warning:</strong> This may affect material
                        planning and scheduling
                      </li>
                    )}
                  </ul>
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
                  disabled={isSubmitting || !isDirty}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductionOrderModal;
