import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { inventoryApi, salesApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

// Schema
const editItemSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum([
    "RAW_MATERIAL",
    "WORK_IN_PROGRESS",
    "FINISHED_GOODS",
    "CONSUMABLE",
  ]),
  uom: z.string().default("QTY"),
  minimumStockLevel: z.number().positive().optional(),
  costingMethod: z.enum(["GLOBAL", "FIFO", "WEIGHTED_AVG"]).default("GLOBAL"),
  standardCost: z.number().optional(),
  priceList: z
    .array(
      z.object({
        id: z.string().optional(),
        customerGroup: z.string().min(1, "Customer group is required"),
        price: z.number().positive("Price must be positive"),
      }),
    )
    .optional(),
});

type EditItemFormData = z.infer<typeof editItemSchema>;

interface EditItemModalProps {
  item: EditItemFormData;
  onClose: () => void;
  onSuccess: () => void;
}

const EditItemModal = ({ item, onClose, onSuccess }: EditItemModalProps) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditItemFormData>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      ...item,
      priceList: item.priceList ?? [],
    },
  });
  // console.log("Item Props", item);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "priceList",
  });

  //  Fetch customer groups for the priceList dropdown
  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["customerGroups"],
    queryFn: () => salesApi.getCustomerGroups({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const groups = groupsData?.groups || [];

  //  Reset form when `item` changes
  useEffect(() => {
    if (!item) return;
    if (isGroupsLoading) return;
    if (item) reset(item);
  }, [item, isGroupsLoading, reset]);

  //   useEffect(() => {
  //   if (!item) return;
  //   if (isGroupsLoading) return;

  //   reset({
  //     ...item,
  //     priceList: item.priceList?.map(pl => ({
  //       ...pl,
  //       customerGroup: pl.customerGroup,
  //     })),
  //   });
  // }, [item, isGroupsLoading, reset]);

  // Submit handler
  const onSubmit = async (data: EditItemFormData) => {
    try {
      await inventoryApi.createItem(data);
      toast.success("Item updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Update item error:", error);
      toast.error("Failed to update item");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Item</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* === BASIC FIELDS === */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SKU *
                  </label>
                  <input
                    {...register("sku")}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., RM-001"
                  />
                  {errors.sku && (
                    <p className="text-sm text-red-600">{errors.sku.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type *
                  </label>
                  <select
                    {...register("type")}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="WORK_IN_PROGRESS">Work in Progress</option>
                    <option value="FINISHED_GOODS">Finished Goods</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  {...register("name")}
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Stock Level
                </label>
                <input
                  {...register("minimumStockLevel", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Standard Cost
                  </label>
                  <input
                    {...register("standardCost", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    UOM
                  </label>
                  <input
                    {...register("uom")}
                    className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="QTY"
                  />
                </div>
              </div>

              {/* === PRICE LIST === */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-900">
                    Price List
                  </h4>
                  <button
                    type="button"
                    onClick={() => append({ customerGroup: "", price: 0 })}
                    className="inline-flex items-center px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 "
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Price
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-5 gap-4 items-end"
                    >
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Customer Group *
                        </label>
                        <select
                          {...register(`priceList.${index}.customerGroup`)}
                          className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3  focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select Group</option>
                          {isGroupsLoading ? (
                            <option disabled>Loading...</option>
                          ) : (
                            groups.map((g: any) => (
                              <option key={g.id} value={g.name}>
                                {g.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Price *
                        </label>
                        <input
                          {...register(`priceList.${index}.price`, {
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="0.01"
                          className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 mt-5"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
