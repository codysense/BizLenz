import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, inventoryApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

const createAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  glAssetAccountId: z.string().cuid("Asset account is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  acquisitionDate: z.string().min(1, "Acquisition date is required"),
  acquisitionCost: z.number().positive("Acquisition cost must be positive"),
  residualValue: z.number().min(0).optional(),
  usefulLife: z.number().int().positive().optional(),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]).optional(),
  locationId: z.string().optional(),
  serialNumber: z.string().optional(),
  supplier: z.string().optional(),
});

type CreateAssetFormData = z.infer<typeof createAssetSchema>;

interface CreateAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAssetModal = ({ onClose, onSuccess }: CreateAssetModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateAssetFormData>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      acquisitionDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedCategoryId = watch("categoryId");

  const { data: categories } = useQuery({
    queryKey: ["asset-categories-for-create"],
    queryFn: () => assetsApi.getAssetCategories(),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-for-asset"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  //chart accounts query can be added here when implementing the ChartAccountSelect component
  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-asset"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const selectedCategory = categories?.categories?.find(
    (cat: any) => cat.id === selectedCategoryId,
  );

  const onSubmit = async (data: CreateAssetFormData) => {
    try {
      await assetsApi.createAsset(data);
      toast.success("Asset created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create asset error:", error);
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
                Add New Asset
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
                  Asset Name *
                </label>
                <input
                  {...register("name")}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Manufacturing Machine #1"
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
                  placeholder="Asset description and specifications"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Category *
                </label>
                <select
                  {...register("categoryId")}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select category</option>
                  {categories?.categories?.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.code} - {category.name} ({category.usefulLife}{" "}
                      years, {category.depreciationMethod.replace("_", " ")})
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset GL Account *
                </label>
                <ChartAccountSelect
                  accounts={chartAccounts?.accounts || []}
                  value={watch("glAssetAccountId")}
                  onChange={(value) => setValue("glAssetAccountId", value)}
                  // className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.glAssetAccountId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.glAssetAccountId.message}
                  </p>
                )}
              </div>

              {/* </div> */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Acquisition Date *
                  </label>
                  <input
                    {...register("acquisitionDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.acquisitionDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.acquisitionDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Acquisition Cost *
                  </label>
                  <input
                    {...register("acquisitionCost", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.acquisitionCost && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.acquisitionCost.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <select
                    {...register("locationId")}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Serial Number
                  </label>
                  <input
                    {...register("serialNumber")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Asset serial number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supplier
                </label>
                <input
                  {...register("supplier")}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Supplier name"
                />
              </div>

              {selectedCategory && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Category Defaults:
                  </h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>
                      • Depreciation Method:{" "}
                      {selectedCategory.depreciationMethod.replace("_", " ")}
                    </div>
                    <div>
                      • Useful Life: {selectedCategory.usefulLife} years
                    </div>
                    <div>
                      • Residual Value: {selectedCategory.residualValue}%
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
                  {isSubmitting ? "Creating..." : "Create Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssetModal;
