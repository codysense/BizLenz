import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, managementApi, purchaseApi } from "../../lib/api";
import toast from "react-hot-toast";
import { VendorSelect } from "../../components/VendorSelect";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

/* ------------------------- ZOD SCHEMA ------------------------- */
const createVendorPaymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),

  lines: z
    .array(
      z.object({
        purchaseId: z.string().optional().nullable(),
        glAccountId: z.string().min(1, "GL Account is required"),
        lineAmount: z.coerce.number().positive("Amount must be positive"),
        description: z.string().optional(),
      }),
    )
    .min(1, "At least one payment line is required"),
});

type FormData = z.infer<typeof createVendorPaymentSchema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateVendorPaymentModal = ({ onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createVendorPaymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
      lines: [
        { purchaseId: null, glAccountId: "", lineAmount: 0, description: "" },
      ],
    },
  });

  const selectedVendorId = watch("vendorId");
  const watchedLines = watch("lines");
  const selectedCashAccountId = watch("cashAccountId");

  /* ------------------------- QUERIES -------------------------- */
  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-payment"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-payment"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: vendorPurchases } = useQuery({
    queryKey: ["vendor-purchases", selectedVendorId],
    queryFn: () =>
      selectedVendorId
        ? purchaseApi.getPurchases({
            vendorId: selectedVendorId,
            paymentStatus: "OUTSTANDING",
            limit: 100,
          })
        : null,
    enabled: !!selectedVendorId,
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-transaction"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  /* ------------------------- FIELD ARRAY ------------------------ */
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  /* --------------------- AUTO-FILL AMOUNT ---------------------- */
  //   useEffect(() => {
  //   if (!vendorPurchases?.purchases) return;

  //   watchedLines.forEach((line, index) => {
  //     if (!line.purchaseId) return;
  //     console.log("Looking for sale with ID:", line.purchaseId);
  //     const sale = vendorPurchases.purchases.find(
  //       (s: any) => String(s.id) === String(line.purchaseId)
  //     );
  //     console.log("Found sale for line:", sale);

  //     if (sale) {
  //       setValue(`lines.${index}.lineAmount`, Number(sale.totalAmount), {
  //         shouldValidate: true,
  //         shouldDirty: true,
  //       });
  //     }
  //   });
  // }, [watchedLines, vendorPurchases?.purchases, setValue]);

  /* ----------------------- TOTAL CALC -------------------------- */
  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => sum + (line.lineAmount || 0), 0);
  };

  // const totalAmount = watchedLines.reduce(
  //   (sum, line) => sum + (line.lineAmount || 0),
  //   0
  // );

  //Get selected cash account balance
  const selectedCashAccount = cashAccounts?.accounts.find(
    (acc: any) => String(acc.id) === String(selectedCashAccountId),
  );

  const hasInsufficientBalance =
    selectedCashAccount &&
    calculateTotal() > Number(selectedCashAccount.balance);

  /* ------------------------ SUBMIT ---------------------------- */

  const onSubmit = async (data: FormData) => {
    try {
      const normalized = {
        ...data,
        lines: data.lines.map((line) => ({
          ...line,
          purchaseId: line.purchaseId?.trim() || null,
        })),
      };

      await cashApi.createVendorPayment(normalized);
      toast.success("Vendor payment recorded successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block bg-white rounded-lg shadow-xl transform transition-all sm:max-w-5xl sm:w-full sm:my-8">
          <div className="bg-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Record vendor Payment
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1 - Vendor + Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Vendor *</label>
                  <VendorSelect
                    vendors={vendors?.vendors || []}
                    value={watch("vendorId")}
                    onChange={(v) => setValue("vendorId", v)}
                  />
                  {errors.vendorId && (
                    <p className="text-red-600 text-sm">
                      {errors.vendorId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">
                    Payment Date *
                  </label>
                  <input
                    {...register("paymentDate")}
                    type="date"
                    className="mt-1 w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Row 2 - Cash Account + Reference */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Cash Account *
                  </label>
                  <select
                    {...register("cashAccountId")}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                  >
                    <option value="">Select cash account</option>
                    {cashAccounts?.accounts?.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name} (₦
                        {Number(a.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {/* Zod error */}
                  {errors.cashAccountId && (
                    <p className="text-red-600 text-sm">
                      {errors.cashAccountId.message}
                    </p>
                  )}

                  {/* Insufficient balance error */}
                  {hasInsufficientBalance && (
                    <p className="text-red-600 text-sm mt-1">
                      Insufficient balance. Available: ₦
                      {Number(selectedCashAccount.balance).toLocaleString()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium">Reference</label>
                  <input
                    {...register("reference")}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* MULTILINE SECTION */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium">Payment Lines</h4>

                  <button
                    type="button"
                    onClick={() =>
                      append({
                        purchaseId: null,
                        glAccountId: "",
                        lineAmount: 0,
                        description: "",
                      })
                    }
                    className="px-3 py-2 border rounded-md bg-white"
                  >
                    <Plus className="h-4 w-4 mr-1 inline" /> Add Line
                  </button>
                </div>

                {errors.lines && (
                  <p className="text-red-600 text-sm mb-2">
                    {errors.lines.message}
                  </p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-8 gap-4">
                        {/* saleId (optional) */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium ">
                            Purchase (optional)
                          </label>

                          <select
                            {...register(`lines.${index}.purchaseId`)}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                            onChange={(e) => {
                              const purchaseId = e.target.value;

                              setValue(
                                `lines.${index}.purchaseId`,
                                purchaseId,
                                {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                },
                              );

                              const purchase = vendorPurchases?.purchases?.find(
                                (p: any) => String(p.id) === String(purchaseId),
                              );

                              if (purchase) {
                                setValue(
                                  `lines.${index}.lineAmount`,
                                  Number(purchase.balanceAmount) === 0
                                    ? Number(purchase.totalAmount)
                                    : Number(purchase.balanceAmount),
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  },
                                );
                              } else {
                                // Optional: reset amount if no purchase selected
                                setValue(`lines.${index}.lineAmount`, 0);
                              }
                            }}
                          >
                            <option value="">Select Purchase</option>
                            {vendorPurchases?.purchases?.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                #{p.orderNo} — ₦
                                {Number(p.balanceAmount).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* glAccount */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium ">
                            GL Account *
                          </label>
                          <ChartAccountSelect
                            accounts={chartAccounts?.accounts || []}
                            value={watch(`lines.${index}.glAccountId`)}
                            onChange={(v) =>
                              setValue(`lines.${index}.glAccountId`, v)
                            }
                          />
                        </div>

                        {/* lineAmount */}
                        <div>
                          <label className="block text-sm font-medium">
                            Amount *
                          </label>
                          <input
                            {...register(`lines.${index}.lineAmount`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          />
                        </div>

                        {/* description */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium">
                            Description
                          </label>
                          <input
                            {...register(`lines.${index}.description`)}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          />
                        </div>

                        {/* remove button */}
                        <div className="py-6">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-3 border rounded-md bg-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTAL */}
              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₦{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* FOOTER BUTTONS */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded-md bg-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || hasInsufficientBalance}
                  className="px-4 py-2 rounded-md bg-red-600 text-white disabled:opacity-50"
                >
                  {isSubmitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVendorPaymentModal;

// import React from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { X } from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
// import { cashApi, purchaseApi } from '../../lib/api';
// import StatusBadge from '../../components/StatusBadge';
// import toast from 'react-hot-toast';
// import { VendorSelect } from '../../components/VendorSelect';

// const createVendorPaymentSchema = z.object({
//   vendorId: z.string().min(1, 'Vendor is required'),
//   cashAccountId: z.string().min(1, 'Cash account is required'),
//   amount: z.number().positive('Amount must be positive'),
//   paymentDate: z.string().min(1, 'Payment date is required'),
//   reference: z.string().optional(),
//   notes: z.string().optional(),
//   purchaseId: z.string().optional(),
// });

// type CreateVendorPaymentFormData = z.infer<typeof createVendorPaymentSchema>;

// interface CreateVendorPaymentModalProps {
//   onClose: () => void;
//   onSuccess: () => void;
// }

// const CreateVendorPaymentModal = ({ onClose, onSuccess }: CreateVendorPaymentModalProps) => {
//   const {
//     register,
//     handleSubmit,
//     watch,
//     setValue,
//     formState: { errors, isSubmitting }
//   } = useForm<CreateVendorPaymentFormData>({
//     resolver: zodResolver(createVendorPaymentSchema),
//     defaultValues: {
//       paymentDate: new Date().toISOString().split('T')[0]
//     }
//   });

//   const selectedVendorId = watch('vendorId');
//   const selectedPurchaseId = watch('purchaseId');

// const { data: vendors } = useQuery({
//   queryKey: ['vendors-for-payment'],
//   queryFn: () => purchaseApi.getVendors({ limit: 100 })
// });

//   const { data: cashAccounts } = useQuery({
//     queryKey: ['cash-accounts-for-payment'],
//     queryFn: () => cashApi.getCashAccounts()
//   });

// const { data: vendorPurchases } = useQuery({
//   queryKey: ['vendor-purchases', selectedVendorId],
//   queryFn: () => selectedVendorId ?
//     purchaseApi.getPurchases({ vendorId: selectedVendorId, status: 'INVOICED', limit: 100 }) : null,
//   enabled: !!selectedVendorId
// });

//   // Auto-populate amount when purchase is selected
//   React.useEffect(() => {
//     if (selectedPurchaseId && vendorPurchases?.purchases) {
//       const selectedPurchase = vendorPurchases.purchases.find((purchase: any) => purchase.id === selectedPurchaseId);
//       if (selectedPurchase) {
//         setValue('amount', selectedPurchase.totalAmount);
//       }
//     }
//   }, [selectedPurchaseId, vendorPurchases, setValue]);

//   const onSubmit = async (data: CreateVendorPaymentFormData) => {
//     try {
//       await cashApi.createVendorPayment(data);
//       toast.success('Vendor payment recorded successfully');
//       onSuccess();
//     } catch (error) {
//       console.error('Create vendor payment error:', error);
//     }
//   };

//   const selectedVendor = vendors?.vendors?.find((vendor: any) => vendor.id === selectedVendorId);
//   const selectedPurchase = vendorPurchases?.purchases?.find((purchase: any) => purchase.id === selectedPurchaseId);

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
//         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

//         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
//           <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg leading-6 font-medium text-gray-900">
//                 Record Vendor Payment
//               </h3>
//               <button
//                 onClick={onClose}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <X className="h-6 w-6" />
//               </button>
//             </div>

//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Vendor *
//                 </label>
//                 <VendorSelect
//                 vendors={vendors?.vendors || []}
//                 value={watch("vendorId")}
//                 onChange={(val) => setValue("vendorId", val, { shouldDirty: true })}
//                 // error={errors.vendorId?.message}
//                 />

//                 {/* <select
//                   {...register('vendorId')}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 >
//                   <option value="">Select vendor</option>
//                   {vendors?.vendors?.map((vendor: any) => (
//                     <option key={vendor.id} value={vendor.id}>
//                       {vendor.code} - {vendor.name}
//                     </option>
//                   ))}
//                 </select> */}
//                 {errors.vendorId && (
//                   <p className="mt-1 text-sm text-red-600">{errors.vendorId.message}</p>
//                 )}
//               </div>

//               {selectedVendorId && vendorPurchases?.purchases && vendorPurchases.purchases.length > 0 && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Purchase Order (Optional)
//                   </label>
//                   <select
//                     {...register('purchaseId')}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   >
//                     <option value="">General payment (not against specific order)</option>
//                     {vendorPurchases.purchases.map((purchase: any) => (
//                       <option key={purchase.id} value={purchase.id}>
//                         {purchase.orderNo} - ₦{purchase.totalAmount.toLocaleString()} ({purchase.status})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               )}

//               {selectedPurchase && (
//                 <div className="bg-blue-50 p-4 rounded-lg">
//                   <div className="grid grid-cols-2 gap-4 text-sm">
//                     <div>
//                       <span className="text-gray-500">Order No:</span>
//                       <div className="font-medium">{selectedPurchase.orderNo}</div>
//                     </div>
//                     <div>
//                       <span className="text-gray-500">Invoice Amount:</span>
//                       <div className="font-medium">₦{selectedPurchase.totalAmount.toLocaleString()}</div>
//                     </div>
//                     <div>
//                       <span className="text-gray-500">Order Date:</span>
//                       <div className="font-medium">{new Date(selectedPurchase.orderDate).toLocaleDateString()}</div>
//                     </div>
//                     <div>
//                       <span className="text-gray-500">Status:</span>
//                       <div><StatusBadge status={selectedPurchase.status} /></div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Cash Account *
//                   </label>
//                   <select
//                     {...register('cashAccountId')}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   >
//                     <option value="">Select cash account</option>
//                     {cashAccounts?.accounts?.map((account: any) => (
//                       <option key={account.id} value={account.id}>
//                         {account.code} - {account.name} (₦{Number(account.balance).toLocaleString()})
//                       </option>
//                     ))}
//                   </select>
//                   {errors.cashAccountId && (
//                     <p className="mt-1 text-sm text-red-600">{errors.cashAccountId.message}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Payment Date *
//                   </label>
//                   <input
//                     {...register('paymentDate')}
//                     type="date"
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   />
//                   {errors.paymentDate && (
//                     <p className="mt-1 text-sm text-red-600">{errors.paymentDate.message}</p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Amount Paid *
//                   </label>
//                   <input
//                     {...register('amount', { valueAsNumber: true })}
//                     type="number"
//                     step="0.01"
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                     placeholder="0.00"
//                   />
//                   {errors.amount && (
//                     <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Reference
//                   </label>
//                   <input
//                     {...register('reference')}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                     placeholder="Check number, transfer ref, etc."
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Notes
//                 </label>
//                 <textarea
//                   {...register('notes')}
//                   rows={3}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   placeholder="Payment notes or additional details"
//                 />
//               </div>

//               <div className="bg-red-50 p-4 rounded-lg">
//                 <h4 className="text-sm font-medium text-red-900 mb-2">Accounting Impact:</h4>
//                 <div className="text-sm text-red-800 space-y-1">
//                   <div>• Trade Payables will be <strong>debited</strong> (decreased)</div>
//                   <div>• Cash Account will be <strong>credited</strong> (decreased)</div>
//                   <div>• Vendor balance will be reduced</div>
//                 </div>
//               </div>

//               <div className="flex justify-end space-x-3 pt-4">
//                 <button
//                   type="button"
//                   onClick={onClose}
//                   className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={isSubmitting}
//                   className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {isSubmitting ? 'Recording...' : 'Record Payment'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CreateVendorPaymentModal;
