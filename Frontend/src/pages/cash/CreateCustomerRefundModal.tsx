import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, salesApi } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";
import { CustomerSelect } from "../../components/CustomerSelect";

const createCustomerRefundSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  amount: z.number().positive("Amount must be positive"),
  refundDate: z.string().min(1, "Refund date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  saleId: z.string().optional(),
  originalReceiptId: z.string().optional(),
});

type CreateCustomerRefundFormData = z.infer<typeof createCustomerRefundSchema>;

interface CreateCustomerRefundModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCustomerRefundModal = ({
  onClose,
  onSuccess,
}: CreateCustomerRefundModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerRefundFormData>({
    resolver: zodResolver(createCustomerRefundSchema),
    defaultValues: {
      refundDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedCustomerId = watch("customerId");
  const selectedSaleId = watch("saleId");
  const selectedCashAccountId = watch("cashAccountId");
  const refundAmount = watch("amount");

  /* ------------------------- QUERIES -------------------------- */
  const { data: customers } = useQuery({
    queryKey: ["customers-for-refund"],
    queryFn: () => salesApi.getCustomers({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-Refund"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: customerSales } = useQuery({
    queryKey: ["customer-sales", selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? salesApi.getSales({
            customerId: selectedCustomerId,
            status: "PAID",
            limit: 100,
          })
        : null,
    enabled: !!selectedCustomerId,
  });
  const { data: customerReceipts } = useQuery({
    queryKey: ["customer-receipts", selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? cashApi.getSalesReceipts({
            customerId: selectedCustomerId,
            limit: 100,
          })
        : null,
    enabled: !!selectedCustomerId,
  });

  // Auto-populate amount when sale is selected
  React.useEffect(() => {
    if (selectedSaleId && customerSales?.sales) {
      const selectedSale = customerSales.sales.find(
        (sale: any) => sale.id === selectedSaleId,
      );
      if (selectedSale) {
        setValue("amount", selectedSale.totalAmount);
      }
    }
  }, [selectedSaleId, customerSales, setValue]);

  //Get Selected Cash Account
  const selectedCashAccount = cashAccounts?.accounts?.find(
    (account: any) => account.id === selectedCashAccountId,
  );

  const hasInsufficientBalance =
    selectedCashAccount && refundAmount
      ? refundAmount > Number(selectedCashAccount.balance)
      : false;

  const onSubmit = async (data: CreateCustomerRefundFormData) => {
    try {
      await cashApi.createCustomerRefund(data);

      toast.success("Customer refund recorded successfully");
      onSuccess();
    } catch (error) {
      console.error("Create customer refund error:", error);
    }
  };

  const selectedCustomer = customers?.customers?.find(
    (customer: any) => customer.id === selectedCustomerId,
  );
  const selectedSale = customerSales?.sales?.find(
    (sale: any) => sale.id === selectedSaleId,
  );

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
                Record Customer Refund
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
                  Customer *
                </label>
                <CustomerSelect
                  customers={customers?.customers || []}
                  value={watch("customerId")}
                  onChange={(val) => reset({ ...getValues(), customerId: val })}
                  error={errors.customerId?.message}
                />
                {/* <select
                  {...register('customerId')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select customer</option>
                  {customers?.customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.code} - {customer.name}
                    </option>
                  ))}
                </select> */}
                {errors.customerId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.customerId.message}
                  </p>
                )}
              </div>

              {selectedCustomerId &&
                customerSales?.sales &&
                customerSales.sales.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sales Order
                    </label>
                    <select
                      {...register("saleId")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">
                        General refund (not against specific order)
                      </option>
                      {customerSales.sales.map((sale: any) => (
                        <option key={sale.id} value={sale.id}>
                          {sale.orderNo} - ₦{sale.totalAmount.toLocaleString()}{" "}
                          ({sale.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              {selectedCustomerId && customerReceipts?.sales && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Receipt Number (Optional)
                  </label>
                  <select
                    {...register("originalReceiptId")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">
                      General refund (not against specific order)
                    </option>
                    {customerReceipts.sales.map((sale: any) => (
                      <option key={sale.ReceiptNo} value={sale.ReceiptNo}>
                        {sale.ReceiptNo} - ₦
                        {sale.amountReceived.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedSale && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Order No:</span>
                      <div className="font-medium">{selectedSale.orderNo}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Invoice Amount:</span>
                      <div className="font-medium">
                        ₦{selectedSale.totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Order Date:</span>
                      <div className="font-medium">
                        {new Date(selectedSale.orderDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <div>
                        <StatusBadge status={selectedSale.status} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                    <p className="mt-1 text-sm text-red-600">
                      Insufficient balance (Available Balance: ₦
                      {Number(selectedCashAccount?.balance).toLocaleString()})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Refund Date *
                  </label>
                  <input
                    {...register("refundDate")}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.refundDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.refundDate.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Refund Amount *
                  </label>
                  <input
                    {...register("amount", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.amount.message}
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
                    placeholder="Check number, transfer ref, etc."
                  />
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
                  placeholder="Refund notes or additional details"
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-2">
                  Accounting Impact:
                </h4>
                <div className="text-sm text-green-800 space-y-1">
                  <div>
                    • Cash Account will be <strong>credited</strong> (decreased)
                  </div>
                  <div>
                    • Trade Receivables will be <strong>debited</strong>{" "}
                    (increased)
                  </div>
                  <div>• Customer balance will be increased</div>
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
                  disabled={isSubmitting || hasInsufficientBalance}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Recording..." : "Record Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomerRefundModal;
