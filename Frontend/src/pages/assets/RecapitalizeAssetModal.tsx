import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, managementApi } from "../../lib/api";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";
import toast from "react-hot-toast";

const recapitalizeSchema = z.object({
  assetId: z.string().cuid("Asset is required"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  transactionType: z.enum(["CAPITAL_IMPROVEMENT", "RECLASSIFY_EXPENSE"]),
  usefulLifeExtension: z.number().int().min(0).optional(),
  sourceAccountId: z.string().cuid("Source account is required"),
});

type RecapitalizeFormData = z.infer<typeof recapitalizeSchema>;

interface RecapitalizeAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const RecapitalizeAssetModal = ({
  onClose,
  onSuccess,
}: RecapitalizeAssetModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecapitalizeFormData>({
    resolver: zodResolver(recapitalizeSchema),
    defaultValues: {
      transactionDate: new Date().toISOString().slice(0, 10),
      transactionType: "CAPITAL_IMPROVEMENT",
      usefulLifeExtension: 0,
    },
  });

  const { data: assetsData } = useQuery({
    queryKey: ["assets-for-recapitalization"],
    queryFn: () => assetsApi.getAssets({ status: "ACTIVE", limit: 1000 }),
  });
  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-recapitalization"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const onSubmit = async (data: RecapitalizeFormData) => {
    try {
      await assetsApi.recapitalizeAsset(data.assetId, data);
      toast.success("Asset recapitalized successfully");
      onSuccess();
    } catch (error) {
      console.error("Recapitalize asset error:", error);
      toast.error("Failed to recapitalize asset");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Recapitalize Asset</h3>
              <p className="mt-1 text-sm text-blue-100">
                Record an improvement and update the asset’s prospective depreciation.
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-white/80 transition hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Asset *</label>
              <select
                {...register("assetId")}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an active asset</option>
                {assetsData?.assets?.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetNo} — {asset.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Date *</label>
                <input {...register("transactionDate")} type="date" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                {errors.transactionDate && <p className="mt-1 text-sm text-red-600">{errors.transactionDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Improvement Amount *</label>
                <input {...register("amount", { valueAsNumber: true })} type="number" min="0.01" step="0.01" placeholder="0.00" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description *</label>
              <textarea {...register("description")} rows={2} placeholder="Describe the improvement or reclassification" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Type *</label>
                <select {...register("transactionType")} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="CAPITAL_IMPROVEMENT">Capital Improvement</option>
                  <option value="RECLASSIFY_EXPENSE">Reclassify Existing Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Useful Life Extension (Months)</label>
                <input {...register("usefulLifeExtension", { setValueAs: (value) => value === "" ? 0 : Number(value) })} type="number" min="0" step="1" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="mt-1 text-xs text-gray-500">Leave at zero if the improvement does not extend the remaining life.</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Source Account *</label>
              <ChartAccountSelect
                accounts={chartAccounts?.accounts || []}
                value={watch("sourceAccountId")}
                onChange={(value) => setValue("sourceAccountId", value, { shouldValidate: true })}
              />
              {errors.sourceAccountId && <p className="mt-1 text-sm text-red-600">{errors.sourceAccountId.message}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow hover:shadow-lg disabled:opacity-50">
                {isSubmitting ? "Processing..." : "Recapitalize Asset"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecapitalizeAssetModal;
