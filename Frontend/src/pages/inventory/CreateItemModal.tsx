import React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { inventoryApi, salesApi, uomApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

// const createItemSchema = z.object({
//   sku: z.string().min(1, 'SKU is required'),
//   name: z.string().min(1, 'Name is required'),
//   description: z.string().optional(),
//   type: z.enum(['RAW_MATERIAL', 'WORK_IN_PROGRESS', 'FINISHED_GOODS', 'CONSUMABLE']),
//   uom: z.string().default('QTY'),
//   costingMethod: z.enum(['GLOBAL', 'FIFO', 'WEIGHTED_AVG']).default('GLOBAL'),
//   standardCost: z.number().optional(),
//   sellingPriceOrdinary: z.number().optional(),
//   sellingPriceBulk: z.number().optional(),
//   sellingPriceWIC:z.number().optional(),
// });

// // const priceListSchema = z.array(
// //   z.object({
// //     customerGroup: z.enum(['Ordinary', 'Bulk', 'WIC']),
// //     price: z.number().positive('Price must be positive')
// //   })
// ).optional();

const createItemSchema = z.object({
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
  sellingPriceOrdinary: z.number().optional(),
  sellingPriceBulk: z.number().optional(),
  sellingPriceWIC: z.number().optional(),
  priceList: z.array(
    z.object({
      // itemId: z.string().cuid(),
      customerGroup: z.string(),
      price: z.number().positive(),
    }),
  ),
});

type CreateItemFormData = z.infer<typeof createItemSchema>;

interface CreateItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateItemModal = ({ onClose, onSuccess }: CreateItemModalProps) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemFormData>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      uom: "QTY",
      costingMethod: "GLOBAL",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "priceList",
  });

  const onSubmit = async (data: CreateItemFormData) => {
    try {
      //console.log(data)
      await inventoryApi.createItem(data);
      toast.success("Item created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create item error:", error);
    }
  };

  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["customerGroups"],
    queryFn: () => salesApi.getCustomerGroups({ page: 1, limit: 100 }), // adjust limit as needed
    staleTime: 5 * 60 * 1000, // 5 mins cache
  });

  const groups = groupsData?.groups || [];

  const { data: uoms, refetch } = useQuery({
    queryKey: ["uoms"],
    queryFn: () => uomApi.getUOMs(),
  });

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
                Create New Item
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SKU *
                  </label>
                  <input
                    {...register("sku")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., RM-001"
                  />
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.sku.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type *
                  </label>
                  <select
                    {...register("type")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="WORK_IN_PROGRESS">Work in Progress</option>
                    <option value="FINISHED_GOODS">Finished Goods</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.type.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  {...register("name")}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Item name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Item description"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cost Price
                  </label>
                  <input
                    {...register("standardCost", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Retail Price
                  </label>
                  <input
                    {...register('sellingPriceOrdinary', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bulk Price
                  </label>
                  <input
                    {...register('sellingPriceBulk',{ valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">
                    WIC Price
                  </label>
                  <input
                    {...register('sellingPriceWIC',{ valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Costing Method
                  </label>
                  <select
                    {...register('costingMethod')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="GLOBAL">Use Global Setting</option>
                    <option value="FIFO">FIFO</option>
                    <option value="WEIGHTED_AVG">Weighted Average</option>
                  </select>
                </div> */}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    UOM
                  </label>
                  <select
                    {...register("uom")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select UOM</option>
                    {uoms?.data.map((uom) => (
                      <option key={uom.id} value={uom.code}>
                        {uom.name} ({uom.code})
                      </option>
                    ))}
                  </select>
                  {/* <input
                    {...register("uom")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="QTY"
                  /> */}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-900">
                    Price List
                  </h4>
                  <button
                    type="button"
                    onClick={() => append({ customerGroup: "", price: 0 })}
                    className="inline-flex items-center px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Price
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
                          className="mt-1 block w-full border  border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                        >
                          <option value="">Select Customer Group</option>
                          {isGroupsLoading ? (
                            <option disabled>Loading...</option>
                          ) : (
                            groups.map((group) => (
                              <option key={group.code} value={group.name}>
                                {group.name}
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
                          className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 sm:text-sm"
                          placeholder="0.00"
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
                  {isSubmitting ? "Creating..." : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateItemModal;
