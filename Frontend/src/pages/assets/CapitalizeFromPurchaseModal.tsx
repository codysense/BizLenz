import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";

const capitalizeFromPurchaseSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase order is required"),
  assets: z
    .array(
      z.object({
        name: z.string().min(1, "Asset name is required"),
        categoryId: z.string().min(1, "Category is required"),
        acquisitionCost: z.number().positive("Cost must be positive"),
        serialNumber: z.string().optional(),
        locationId: z.string().optional(),
      }),
    )
    .min(1, "At least one asset is required"),
});

type CapitalizeFromPurchaseFormData = z.infer<
  typeof capitalizeFromPurchaseSchema
>;

interface CapitalizeFromPurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CapitalizeFromPurchaseModal = ({
  onClose,
  onSuccess,
}: CapitalizeFromPurchaseModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CapitalizeFromPurchaseFormData>({
    resolver: zodResolver(capitalizeFromPurchaseSchema),
    defaultValues: {
      assets: [
        {
          name: "",
          categoryId: "",
          acquisitionCost: 0,
          serialNumber: "",
          locationId: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "assets",
  });

  const selectedPurchaseId = watch("purchaseOrderId");
  const acquisitionCostSum = watch("assets").reduce(
    (sum, asset) => sum + (asset.acquisitionCost || 0),
    0,
  );

  console.log("Acquisition Cost Sum:", acquisitionCostSum);

  const { data: purchaseOrders } = useQuery({
    queryKey: ["purchase-orders-for-capitalization"],
    queryFn: () => assetsApi.getPurchaseOrdersForCapitalization(),
  });

  const { data: categories } = useQuery({
    queryKey: ["asset-categories-for-capitalize"],
    queryFn: () => assetsApi.getAssetCategories(),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-for-capitalize"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  const selectedPurchase = purchaseOrders?.purchases?.find(
    (po: any) => po.id === selectedPurchaseId,
  );
  //console.log("Selected Purchase:", selectedPurchase);

  const onSubmit = async (data: CapitalizeFromPurchaseFormData) => {
    try {
      await assetsApi.capitalizeFromPurchase(data);
      toast.success("Assets capitalized successfully");
      onSuccess();
    } catch (error) {
      console.error("Capitalize from purchase error:", error);
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
                Capitalize Assets from Purchase Order
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Purchase Order *
                </label>
                <select
                  {...register("purchaseOrderId")}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select purchase order</option>
                  {purchaseOrders?.purchases?.map((po: any) => (
                    <option key={po.id} value={po.id}>
                      {po.orderNo} - {po.vendor.name} (₦
                      {po.totalAmount.toLocaleString()})
                    </option>
                  ))}
                </select>
                {errors.purchaseOrderId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.purchaseOrderId.message}
                  </p>
                )}
              </div>
              {/* Purchase Order Details */}
              {selectedPurchase && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center mb-3">
                    <Package className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="text-sm font-medium text-blue-900">
                      Purchase Order Details
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Vendor:</span>
                      <div className="font-medium">
                        {selectedPurchase.vendor.name}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Total Amount:</span>
                      <div className="font-medium">
                        ₦{selectedPurchase.totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Order Date:</span>
                      <div className="font-medium">
                        {new Date(
                          selectedPurchase.orderDate,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Status:</span>
                      <div className="font-medium">
                        {selectedPurchase.status}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Order Type:</span>
                      <div className="font-medium">
                        {selectedPurchase.orderType}
                      </div>
                    </div>
                  </div>

                  {/* Purchase Line Items */}
                  {selectedPurchase.purchaseLines &&
                    selectedPurchase.purchaseLines.length > 0 && (
                      <div className="border-t border-blue-200 pt-4">
                        <h5 className="text-sm font-medium text-blue-900 mb-3">
                          Line Items
                        </h5>
                        <div className="space-y-2">
                          {selectedPurchase.purchaseLines.map(
                            (line: any, index: number) => (
                              <div
                                key={index}
                                className="flex justify-between items-start text-xs bg-white p-2 rounded"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {line.assetName || line.description}
                                  </div>
                                  {line.description && (
                                    <div className="text-gray-600 text-xs">
                                      {line.description}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  {line.quantity && (
                                    <div className="text-gray-700">
                                      Qty: {line.quantity}
                                    </div>
                                  )}
                                  {line.unitPrice && (
                                    <div className="text-gray-700">
                                      ₦{line.unitPrice.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Assets to Capitalize */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Assets to Capitalize
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      append({
                        name: "",
                        categoryId: "",
                        acquisitionCost: 0,
                        serialNumber: "",
                        locationId: "",
                      })
                    }
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </button>
                </div>

                {errors.assets && (
                  <p className="mb-4 text-sm text-red-600">
                    {errors.assets.message}
                  </p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Asset Name *
                          </label>
                          <input
                            {...register(`assets.${index}.name`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Asset name"
                          />
                          {errors.assets?.[index]?.name && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.assets[index]?.name?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Category *
                          </label>
                          <select
                            {...register(`assets.${index}.categoryId`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="">Select category</option>
                            {categories?.categories?.map((category: any) => (
                              <option key={category.id} value={category.id}>
                                {category.code} - {category.name}
                              </option>
                            ))}
                          </select>
                          {errors.assets?.[index]?.categoryId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.assets[index]?.categoryId?.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Cost *
                            </label>
                            <input
                              {...register(`assets.${index}.acquisitionCost`, {
                                valueAsNumber: true,
                              })}
                              type="number"
                              step="0.01"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                            {errors.assets?.[index]?.acquisitionCost && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.assets[index]?.acquisitionCost?.message}
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

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Serial Number
                          </label>
                          <input
                            {...register(`assets.${index}.serialNumber`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Serial number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Location
                          </label>
                          <select
                            {...register(`assets.${index}.locationId`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="">Select location</option>
                            {locations?.locations?.map((location: any) => (
                              <option key={location.id} value={location.id}>
                                {location.code} - {location.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
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
                  // disable submit if form is submitting or no purchase order selected or sum of acquisition cost not equal to purchase order total amount
                  disabled={
                    isSubmitting ||
                    !selectedPurchaseId ||
                    acquisitionCostSum !== Number(selectedPurchase?.totalAmount)
                  }
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Capitalizing..." : "Capitalize Assets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapitalizeFromPurchaseModal;
