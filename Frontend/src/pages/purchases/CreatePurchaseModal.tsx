import React, { useEffect } from "react";
import { useForm, useFieldArray, set } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { purchaseApi, inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { VendorSelect } from "../../components/VendorSelect";
import { ItemSelect } from "../../components/ItemSelect";
import { useState } from "react";
import CreateItemModal from "../inventory/CreateItemModal";

const createPurchaseSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderType: z.enum(["INVENTORY", "ASSET"]),
  orderDate: z.string().min(1, "Order date is required"),
  notes: z.string().optional(),
  purchaseLines: z
    .array(
      z.object({
        itemId: z.string().nullable().optional(), // inventory
        assetName: z.string().nullable().optional(), // asset
        qty: z.number().positive("Quantity must be positive"),
        unitPrice: z.number().positive("Unit price must be positive"),
      }),
    )
    .min(1, "At least one line item is required"),
});

type CreatePurchaseFormData = z.infer<typeof createPurchaseSchema>;

interface CreatePurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePurchaseModal = ({
  onClose,
  onSuccess,
}: CreatePurchaseModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreatePurchaseFormData>({
    resolver: zodResolver(createPurchaseSchema),
    shouldUnregister: true,
    defaultValues: {
      orderType: "INVENTORY",
      orderDate: new Date().toISOString().split("T")[0],
      purchaseLines: [{ itemId: "", assetName: "", qty: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseLines",
  });

  const [createItemModal, setCreateItemModal] = useState(false);

  const watchedLines = watch("purchaseLines");
  const orderType = watch("orderType");

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-purchase"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: items, refetch } = useQuery({
    queryKey: ["items-for-purchases"],
    queryFn: () => inventoryApi.getItems({ limit: 100 }),
  });

  const { data: purchaseData } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => purchaseApi.getPurchases({ limit: 100 }),
  });

  const watchedItemIds = watchedLines
    .map((line) => line.itemId)
    .filter((id) => id);

  // console.log("purchaseData", purchaseData);

  //Normalize line item based on order type
  useEffect(() => {
    if (orderType === "INVENTORY") {
      setValue(
        "purchaseLines",
        watchedLines.map((line) => ({
          ...line,
          assetName: null,
          qty: 1,
          unitPrice: 0,
        })),
      );
    } else {
      setValue(
        "purchaseLines",
        watchedLines.map((line) => ({
          ...line,
          itemId: null,
          qty: 1,
          unitPrice: 0,
        })),
      );
    }
  }, [orderType, setValue]);

  //fetch last purchase for a selected item
  useEffect(() => {
    if (orderType !== "INVENTORY") return;
    if (!purchaseData?.purchases?.length) return;
    if (!watchedItemIds.length) return;

    watchedItemIds.forEach((line, index) => {
      if (!line) return;

      const lastPurchase = purchaseData.purchases
        .filter((purchase: any) =>
          purchase.purchaseLines?.some((l: any) => l.itemId === line),
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
        )[0];

      if (!lastPurchase) return;

      const lastLine = lastPurchase.purchaseLines?.find(
        (l: any) => l.itemId === line,
      );

      const lastPrice = lastLine ? Number(lastLine.unitPrice) : 0;

      const currentPrice = Number(
        getValues(`purchaseLines.${index}.unitPrice`),
      );

      // const fieldState = getFieldState(`purchaseLines.${index}.unitPrice`);

      // Only auto-fill if field is empty AND not dirty
      if (currentPrice === 0 && lastPrice) {
        setValue(`purchaseLines.${index}.unitPrice`, lastPrice);
      }
    });
  }, [watchedItemIds, purchaseData, orderType]);

  // const getLastPrice = (itemId: string) => {
  //   const lastPurchase = purchaseData.purchases
  //     .filter((purchase: any) =>
  //       purchase.purchaseLines?.some((l: any) => l.itemId === itemId),
  //     )
  //     .sort(
  //       (a: any, b: any) =>
  //         new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
  //     )[0];
  //   return (
  //     lastPurchase?.purchaseLines?.find((l: any) => l.itemId === itemId)
  //       ?.unitPrice || 0
  //   );
  // };

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.qty || 0) * (line.unitPrice || 0);
    }, 0);
  };

  const handleCreateItem = () => {
    refetch();
    setCreateItemModal(false);
  };

  const onSubmit = async (data: CreatePurchaseFormData) => {
    try {
      await purchaseApi.createPurchase(data);
      toast.success("Purchase order created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create purchase error:", error);
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
                Create Purchase Order
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vendor *
                  </label>
                  <VendorSelect
                    vendors={vendors?.vendors || []}
                    value={watch("vendorId")}
                    onChange={(val) =>
                      setValue("vendorId", val, { shouldDirty: true })
                    }
                    error={errors.vendorId?.message}
                  />
                </div>

                {/* Order Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Date *
                  </label>
                  <input
                    {...register("orderDate")}
                    type="date"
                    className="mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Order Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Type *
                  </label>
                  <select
                    {...register("orderType")}
                    className="mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="INVENTORY">Inventory Order</option>
                    <option value="ASSET">Asset Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Purchase order notes"
                />
              </div>

              {/* Purchase Lines */}

              <div>
                {orderType === "INVENTORY" ? (
                  <div className="flex items-center justify-start space-x-8 mb-4">
                    <h4 className="text-md font-medium text-gray-900">Items</h4>
                    <button
                      type="button"
                      onClick={() => setCreateItemModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Item
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        append({ itemId: "", qty: 1, unitPrice: 0 })
                      }
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-start space-x-8 mb-4">
                    <h4 className="text-md font-medium text-gray-900">
                      Assets
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        append({ assetName: "", qty: 1, unitPrice: 0 })
                      }
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Asset
                    </button>
                  </div>
                )}

                {errors.purchaseLines && (
                  <p className="mb-4 text-sm text-red-600">
                    {errors.purchaseLines.message}
                  </p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {orderType === "ASSET" ? "Asset Name *" : "Item *"}
                          </label>

                          {orderType === "INVENTORY" ? (
                            <ItemSelect
                              items={items?.items || []}
                              value={watch(`purchaseLines.${index}.itemId`)}
                              onChange={(val) =>
                                setValue(`purchaseLines.${index}.itemId`, val, {
                                  shouldDirty: true,
                                })
                              }
                              // onItemSelect={(itemId, index) => {
                              //   console.log(
                              //     "Selected itemId:",
                              //     itemId,
                              //     "at index:",
                              //     index,
                              //   );
                              //   const lastPrice = getLastPrice(itemId);

                              //   setValue(
                              //     `purchaseLines.${index}.unitPrice`,
                              //     lastPrice,
                              //   );
                              // }}
                              error={
                                errors.purchaseLines?.[index]?.itemId?.message
                              }
                            />
                          ) : (
                            <input
                              {...register(`purchaseLines.${index}.assetName`)}
                              placeholder="Enter asset name"
                              className="mt-1 block w-full border rounded-md px-3 py-2"
                            />
                          )}

                          {errors.purchaseLines?.[index]?.itemId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.purchaseLines[index]?.itemId?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Quantity *
                          </label>
                          <input
                            {...register(`purchaseLines.${index}.qty`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            // onScroll={}
                            step="0.01"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="1.00"
                          />
                          {errors.purchaseLines?.[index]?.qty && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.purchaseLines[index]?.qty?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Unit Price *
                          </label>
                          <input
                            {...register(`purchaseLines.${index}.unitPrice`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0.00"
                          />
                          {errors.purchaseLines?.[index]?.unitPrice && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.purchaseLines[index]?.unitPrice?.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Line Total
                            </label>
                            <div className="mt-1 block w-full py-2 px-3 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-900">
                              ₦
                              {(
                                (watchedLines[index]?.qty || 0) *
                                (watchedLines[index]?.unitPrice || 0)
                              ).toLocaleString()}
                            </div>
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

                {/* Total */}
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">
                      Total Amount:
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₦{calculateTotal().toLocaleString()}
                    </span>
                  </div>
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
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* Create Modal */}
      {createItemModal && (
        <CreateItemModal
          onClose={() => setCreateItemModal(false)}
          onSuccess={handleCreateItem}
        />
      )}
    </div>
  );
};

export default CreatePurchaseModal;
