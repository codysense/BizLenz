import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

const createCashTransactionSchema = z.object({
  cashAccountId: z.string(),
  transactionType: z.enum(["RECEIPT", "PAYMENT"]),
  //description: z.string().optional(),
  transactionDate: z.string(),
  reference: z.string().optional(),
  refType: z.string().optional(),
  refId: z.string().optional(),
  transactionLines: z
    .array(
      z.object({
        glAccountId: z.string(),
        contraAccountId: z.string().optional(),
        lineAmount: z.coerce.number().positive(),
        description: z.string().optional(),
      }),
    )
    .min(1, "At least one transaction line is required"),
});

type CreateCashTransactionFormData = z.infer<
  typeof createCashTransactionSchema
>;

interface CreateCashTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCashTransactionModal = ({
  onClose,
  onSuccess,
}: CreateCashTransactionModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateCashTransactionFormData>({
    resolver: zodResolver(createCashTransactionSchema),
    shouldUnregister: true,
    defaultValues: {
      transactionDate: new Date().toISOString().split("T")[0],
      transactionType: "RECEIPT",
      transactionLines: [{ glAccountId: "", lineAmount: 0, description: "" }],
    },
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-transaction"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-transaction"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const watchedType = watch("transactionType");

  useEffect(() => {
    setValue("transactionLines", [
      { glAccountId: "", lineAmount: 0, description: "" },
    ]);

    setValue("cashAccountId", "");
  }, [watchedType]);

  const onSubmit = async (data: CreateCashTransactionFormData) => {
    try {
      await cashApi.createCashTransaction(data);
      toast.success("Cash transaction recorded successfully");
      onSuccess();
    } catch (error) {
      console.error("Create cash transaction error:", error);
    }
  };

  const { fields, append, remove } = useFieldArray({
    control,
    name: "transactionLines",
  });

  const watchedLines = watch("transactionLines");
  const selectedCashAccountId = watch("cashAccountId");
  const selectedType = watch("transactionType");

  const selectedCashAccount = cashAccounts?.accounts.find(
    (acc: any) => acc.id === selectedCashAccountId,
  );

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.lineAmount || 0);
    }, 0);
  };

  const hasInsufficientBalance =
    selectedCashAccount &&
    selectedType === "PAYMENT" &&
    calculateTotal() > Number(selectedCashAccount.balance);

  // console.log(chartAccounts)
  // Filter GL accounts based on transaction type
  // const getFilteredGLAccounts = () => {
  //   if (!chartAccounts?.accounts) return [];

  //   if (watchedType === 'RECEIPT') {
  //     // For receipts, show income and receivable accounts
  //     return chartAccounts.accounts.filter((acc: any) =>
  //       ['INCOME', 'OTHER_INCOME', 'TRADE_RECEIVABLES'].includes(acc.accountType)
  //     );
  //   } else {
  //     // For payments, show expense and payable accounts
  //     return chartAccounts.accounts.filter((acc: any) =>
  //       ['EXPENSES', 'COST_OF_SALES', 'TRADE_PAYABLES', 'CURRENT_LIABILITY'].includes(acc.accountType)
  //     );
  //   }
  // };

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
                Record Cash Transaction
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
                    Transaction Type *
                  </label>
                  <select
                    {...register("transactionType")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="RECEIPT">Cash Receipt</option>
                    <option value="PAYMENT">Cash Payment</option>
                  </select>
                  {errors.transactionType && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.transactionType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction Date *
                  </label>
                  <input
                    {...register("transactionDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.transactionDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.transactionDate.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cash Account *
                  </label>
                  <select
                    {...register("cashAccountId")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select cash account</option>
                    {cashAccounts?.accounts?.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name} (₦
                        {Number(account.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {errors.cashAccountId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.cashAccountId.message}
                    </p>
                  )}

                  {hasInsufficientBalance && (
                    <p className="mt-1 text-xs text-red-500">
                      Insufficient balance (Available Balance: ₦
                      {Number(selectedCashAccount?.balance).toLocaleString()})
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reference
                  </label>
                  <input
                    {...register("reference")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Check number, transfer reference, etc."
                  />
                </div>
              </div>

              {/* payment lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={() =>
                      append({
                        glAccountId: "",
                        lineAmount: 0,
                        description: "",
                      })
                    }
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </button>
                </div>
                {errors.transactionLines && (
                  <p className="mb-4 text-sm text-red-600">
                    {errors.transactionLines.message}
                  </p>
                )}
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            GL Account * (
                            {watchedType === "RECEIPT"
                              ? "Credit Account"
                              : "Debit Account"}
                            )
                          </label>
                          <ChartAccountSelect
                            accounts={chartAccounts?.accounts || []}
                            value={watch(
                              `transactionLines.${index}.glAccountId`,
                            )}
                            onChange={(val) =>
                              setValue(
                                `transactionLines.${index}.glAccountId`,
                                val,
                              )
                            }
                            // error={errors.accountId?.message}
                          />

                          {errors.transactionLines?.[index]?.glAccountId && (
                            <p className="mt-1 text-sm text-red-600">
                              {
                                errors.transactionLines[index]?.glAccountId
                                  ?.message
                              }
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            {watchedType === "RECEIPT"
                              ? "This account will be credited (source of funds)"
                              : "This account will be debited (use of funds)"}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            lineAmount *
                          </label>
                          <input
                            {...register(
                              `transactionLines.${index}.lineAmount`,
                              { valueAsNumber: true },
                            )}
                            type="number"
                            step="0.001"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="1.00"
                          />
                          {errors.transactionLines?.[index]?.lineAmount && (
                            <p className="mt-1 text-sm text-red-600">
                              {
                                errors.transactionLines[index]?.lineAmount
                                  ?.message
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Description *
                          </label>
                          <input
                            {...register(
                              `transactionLines.${index}.description`,
                            )}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder={`Enter ${watchedType === "RECEIPT" ? "receipt" : "payment"} description`}
                          />
                          {errors.transactionLines?.[index]?.description && (
                            <p className="mt-1 text-sm text-red-600">
                              {
                                errors.transactionLines[index]?.description
                                  ?.message
                              }
                            </p>
                          )}

                          {/* {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="ml-2 inline-flex items-end px-3 py-2 border border-gray-300 bg-white text-gray-500 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )} */}
                        </div>

                        <div className="py-6">
                          {/* <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Line Total
                  </label>
                  <div className="mt-1 block w-full py-2 px-3 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-900">
                    ₦{((watchedLines[index]?.qty || 0) * (watchedLines[index]?.unitPrice || 0)).toLocaleString()}
                  </div>
                </div> */}
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="ml-2 inline-flex items-center px-3 py-3 border border-gray-300 bg-white text-gray-500 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                Total
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
              {/* <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contra Account (Optional)
                </label>
                <select
                  {...register('contraAccountId')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">No contra account</option>
                  {chartAccounts?.accounts?.map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  For contra entries (e.g., bank transfers between accounts)
                </p>
              </div> */}

              {/* <div>
                <label className="block text-sm font-medium text-gray-700">
                  lineAmount *
                </label>
                <input
                  {...register('lineAmount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
                {errors.lineAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.lineAmount.message}</p>
                )}
              </div> */}

              {/* <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={`Enter ${watchedType === 'RECEIPT' ? 'receipt' : 'payment'} description`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div> */}

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
                  disabled={isSubmitting || hasInsufficientBalance}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    watchedType === "RECEIPT"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  }`}
                >
                  {isSubmitting
                    ? "Recording..."
                    : `Record ${watchedType === "RECEIPT" ? "Receipt" : "Payment"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCashTransactionModal;
