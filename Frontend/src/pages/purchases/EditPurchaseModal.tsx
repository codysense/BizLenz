import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { purchaseApi, inventoryApi } from "../../lib/api";
import { Purchase } from "../../types/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";
import { VendorSelect } from "../../components/VendorSelect";

const editPurchaseSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderDate: z.string().min(1, "Order date is required"),
  notes: z.string().optional(),
  purchaseLines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Item is required"),
        qty: z.number().positive("Quantity must be positive"),
        unitPrice: z.number().positive("Unit price must be positive"),
      }),
    )
    .min(1, "At least one line item is required"),
});

type EditPurchaseFormData = z.infer<typeof editPurchaseSchema>;

interface EditPurchaseModalProps {
  purchase: Purchase;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPurchaseModal = ({
  purchase,
  onClose,
  onSuccess,
}: EditPurchaseModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditPurchaseFormData>({
    resolver: zodResolver(editPurchaseSchema),
    defaultValues: {
      vendorId: purchase.vendorId,
      orderDate: purchase.orderDate.split("T")[0],
      notes: purchase.notes || "",
      purchaseLines: purchase.purchaseLines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    },
  });
  console.log("EditPurchaseModal Rendered with purchase:", purchase);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseLines",
  });

  const watchedLines = watch("purchaseLines");

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-edit-purchase"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: items } = useQuery({
    queryKey: ["items-for-edit-purchase"],
    queryFn: () => inventoryApi.getItems({ limit: 100 }),
  });

  // Reset form when purchase changes
  useEffect(() => {
    reset({
      vendorId: purchase.vendorId,
      orderDate: purchase.orderDate.split("T")[0],
      notes: purchase.notes || "",
      purchaseLines: purchase.purchaseLines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    });
  }, [purchase, reset]);

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.qty || 0) * (line.unitPrice || 0);
    }, 0);
  };

  const onSubmit = async (data: EditPurchaseFormData) => {
    try {
      await purchaseApi.updatePurchase(purchase.id, data);
      toast.success("Purchase order updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit purchase error:", error);
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
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Purchase Order
                </h3>
                <p className="text-sm text-gray-600">
                  {purchase.orderNo} - Current Status: {purchase.status}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {purchase.status === "ORDERED" && (
              <div className="mb-4 bg-yellow-50 p-4 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This purchase order has been sent
                    to vendor. Changes may require vendor notification.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vendor *
                  </label>
                  <VendorSelect
                    value={watch("vendorId")}
                    onChange={(val) =>
                      setValue("vendorId", val, { shouldDirty: true })
                    }
                    error={errors.vendorId?.message}
                    vendors={vendors?.vendors || []}
                  />
                  {/* <select
                    {...register("vendorId")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select vendor</option>
                    {vendors?.vendors?.map((vendor: any) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.code} - {vendor.name}
                      </option>
                    ))}
                  </select> */}
                  {errors.vendorId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.vendorId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Date *
                  </label>
                  <input
                    {...register("orderDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.orderDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.orderDate.message}
                    </p>
                  )}
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
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={() => append({ itemId: "", qty: 1, unitPrice: 0 })}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </button>
                </div>

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
                            Item *
                          </label>
                          <ItemSelect
                            value={watch(`purchaseLines.${index}.itemId`)}
                            onChange={(val) =>
                              setValue(`purchaseLines.${index}.itemId`, val)
                            }
                            error={
                              errors.purchaseLines?.[index]?.itemId?.message
                            }
                          />
                          {/* <select
                            {...register(`purchaseLines.${index}.itemId`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="">Select item</option>
                            {items?.items?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} - {item.name}
                              </option>
                            ))}
                          </select> */}
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
                            step="0.001"
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
                  <div className="mt-2 text-sm text-gray-600">
                    Original Total: ₦{purchase.totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Change Summary */}
              {isDirty && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    Changes Summary:
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Purchase order details will be updated</li>
                    <li>• All line items will be replaced with new data</li>
                    <li>• Total amount will be recalculated</li>
                    {purchase.status === "ORDERED" && (
                      <li>
                        • <strong>Warning:</strong> Vendor may need to be
                        notified of changes
                      </li>
                    )}
                  </ul>
                </div>
              )}

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

export default EditPurchaseModal;
