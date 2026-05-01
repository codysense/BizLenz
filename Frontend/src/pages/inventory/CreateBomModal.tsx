import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";

const createBomSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  version: z.string().default("1.0"),
  bomLines: z
    .array(
      z.object({
        componentItemId: z.string().min(1, "Component is required"),
        qtyPer: z.number().positive("Quantity must be positive"),
        scrapPercent: z.number().min(0).max(100).default(0),
      }),
    )
    .min(1, "At least one component is required"),
});

type CreateBomFormData = z.infer<typeof createBomSchema>;

interface CreateBomModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBomModal = ({ onClose, onSuccess }: CreateBomModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBomFormData>({
    resolver: zodResolver(createBomSchema),
    defaultValues: {
      version: "1.0",
      bomLines: [{ componentItemId: "", qtyPer: 1, scrapPercent: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bomLines",
  });

  const { data: finishedGoods } = useQuery({
    queryKey: ["finished-goods"],
    queryFn: () => inventoryApi.getItems({ type: "FINISHED_GOODS" }),
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: () => inventoryApi.getItems({ type: "RAW_MATERIAL" }),
  });

  const selectedItemId = watch("itemId");

  const onSubmit = async (data: CreateBomFormData) => {
    try {
      await inventoryApi.createBom(data);
      toast.success("BOM created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create BOM error:", error);
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
                Create New Bill of Materials
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Finished Goods Item *
                  </label>
                  <ItemSelect
                    //{...register("itemId")}
                    // items={finishedGoods?.items || []}
                    value={watch("itemId") || ""}
                    onChange={(val) =>
                      setValue("itemId", val, { shouldDirty: true })
                    }
                    typeFilter="FINISHED_GOODS"
                    placeholder="Select finished goods item"
                  />

                  {/* <select
                    {...register('itemId')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select finished goods item</option>
                    {finishedGoods?.items?.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name}
                      </option>
                    ))}
                  </select> */}
                  {errors.itemId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.itemId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Version
                  </label>
                  <input
                    {...register("version")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="1.0"
                  />
                  {errors.version && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.version.message}
                    </p>
                  )}
                </div>
              </div>

              {/* BOM Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Components
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      append({
                        componentItemId: "",
                        qtyPer: 1,
                        scrapPercent: 0,
                      })
                    }
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                  </button>
                </div>

                {errors.bomLines && (
                  <p className="mb-4 text-sm text-red-600">
                    {errors.bomLines.message}
                  </p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Component Item *
                          </label>
                          <ItemSelect
                            value={
                              watch(`bomLines.${index}.componentItemId`) || ""
                            }
                            typeFilter="RAW_MATERIAL"
                            // items={rawMaterials?.items || []}
                            onChange={(val) =>
                              setValue(
                                `bomLines.${index}.componentItemId`,
                                val,
                                {
                                  shouldDirty: true,
                                },
                              )
                            }
                            placeholder="Select component item"
                          />

                          {/* <select
                            {...register(`bomLines.${index}.componentItemId`)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="">Select component</option>
                            {rawMaterials?.items?.map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.sku} - {item.name} ({item.uom})
                              </option>
                            ))}
                          </select> */}
                          {errors.bomLines?.[index]?.componentItemId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.bomLines[index]?.componentItemId?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Qty Per Unit *
                          </label>
                          <input
                            {...register(`bomLines.${index}.qtyPer`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.001"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="1.00"
                          />
                          {errors.bomLines?.[index]?.qtyPer && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.bomLines[index]?.qtyPer?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Scrap %
                          </label>
                          <div className="flex">
                            <input
                              {...register(`bomLines.${index}.scrapPercent`, {
                                valueAsNumber: true,
                              })}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="flex-1 mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="mt-1 inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {errors.bomLines?.[index]?.scrapPercent && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.bomLines[index]?.scrapPercent?.message}
                            </p>
                          )}
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
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create BOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBomModal;
