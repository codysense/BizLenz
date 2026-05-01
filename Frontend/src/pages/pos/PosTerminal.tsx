import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  Calculator,
  Printer,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { posApi, inventoryApi, managementApi, cashApi } from "../../lib/api";
import { PosSession } from "../../types/api";
// import { ReportExporter } from "../../utils/reportExport";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";
import { CustomerSelect } from "../../components/CustomerSelect";

// const posSaleSchema = z.object({
//   customerId: z.string().optional(),
//   cashAccountId: z.string().cuid(),
//   saleLines: z
//     .array(
//       z.object({
//         itemId: z.string().min(1, "Item is required"),
//         qty: z.number().positive("Quantity must be positive"),
//         unitPrice: z.number().positive("Unit price must be positive"),
//         discountPercent: z.number().min(0).max(100).default(0),
//       }),
//     )
//     .min(1, "At least one item is required"),
//   paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
//   amountPaid: z.number().positive("Amount paid must be positive"),
//   notes: z.string().optional(),
// });

const paymentSchema = z.object({
  method: z.enum(["CASH", "TRANSFER", "CARD"]),
  cashAccountId: z.string().cuid(),
  amount: z.number().positive("Amount must be positive"),
});

const posSaleSchema = z.object({
  customerId: z.string().optional(),
  saleLines: z.array(
    z.object({
      itemId: z.string().min(1),
      qty: z.number().positive(),
      unitPrice: z.number().positive(),
      discountPercent: z.number().min(0).max(100).default(0),
    }),
  ),
  payments: z.array(paymentSchema).min(1, "At least one payment is required"),
  notes: z.string().optional(),
});

type PosSaleFormData = z.infer<typeof posSaleSchema>;

interface PosTerminalProps {
  session: PosSession;
  onClose: () => void;
  onSaleComplete: () => void;
}

const PosTerminal = ({
  session,
  onClose,
  onSaleComplete,
}: PosTerminalProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [itemStocks, setItemStocks] = useState<Record<string, number>>({});

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PosSaleFormData>({
    resolver: zodResolver(posSaleSchema),
    defaultValues: {
      saleLines: [{ itemId: "", qty: 1, unitPrice: 0, discountPercent: 0 }],
      payments: [{ method: "CASH", cashAccountId: "", amount: 0 }],
    },

    // defaultValues: {
    //   saleLines: [{ itemId: "", qty: 1, unitPrice: 0, discountPercent: 0 }],
    // },
  });

  // const { fields, append, remove } = useFieldArray({
  //   control,
  //   name: "payments",
  //   // name: "saleLines",
  // });

  const { fields, append, remove } = useFieldArray({
    control,

    name: "saleLines",
  });

  const {
    fields: paymentFields,
    append: appendPayment,
    remove: removePayment,
  } = useFieldArray({
    control,
    name: "payments",
  });

  // const watchedLines = watch("saleLines");
  const watchedCustomerId = watch("customerId");
  // const watchedAmountPaid = watch("amountPaid") || 0;
  const watchedLines = watch("saleLines");
  const watchedPayments = watch("payments") || [];
  const watchedItemIds = watchedLines.map((line) => line.itemId);

  // const { data: items } = useQuery({
  //   queryKey: ["pos-itemss", "FINISHED_GOODS"],
  //   queryFn: () =>
  //     inventoryApi.getItems({ type: "FINISHED_GOODS", limit: 100 }),
  // });

  const { data: customersWithBalances } = useQuery({
    queryKey: ["customers-with-balances"],
    queryFn: () => posApi.getCustomersWithBalances(),
  });

  const { data: companyInformations } = useQuery({
    queryKey: ["company-info-for-receipt"],
    queryFn: () => managementApi.getCompanySettings(),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-pos"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const filteredAccounts = cashAccounts?.accounts?.filter(
    (account: any) => account.name !== "Memo Clearing",
  );

  useEffect(() => {
    const setPrices = async () => {
      //if (!selectedCustomer) return;

      for (let index = 0; index < watchedLines.length; index++) {
        const line = watchedLines[index];
        if (!line.itemId) continue;

        try {
          const selectedItem = await inventoryApi.getItemById(line.itemId);

          // Save stockQty
          setItemStocks((prev) => ({
            ...prev,
            [line.itemId]: selectedItem.stockQty || 0,
          }));

          if (selectedCustomer && selectedItem) {
            const customerGroup = selectedCustomer.customerGroupName;

            const groupPrice = selectedItem.priceList?.find(
              (p: any) => p.customerGroup === customerGroup,
            );

            const unitPrice = groupPrice
              ? groupPrice.price
              : selectedItem.defaultPrice || 0;

            setValue(`saleLines.${index}.unitPrice`, unitPrice, {
              shouldDirty: true,
              shouldValidate: true,
            });
          } else {
            setValue(`saleLines.${index}.unitPrice`, 0);
          }
        } catch (err) {
          console.error("Failed to fetch item price", err);
        }
      }
    };

    setPrices();
  }, [
    watchedCustomerId,
    watchedLines.map((l) => l.itemId).join(","),
    selectedCustomer,
  ]);

  useEffect(() => {
    if (watchedCustomerId) {
      const customer = customersWithBalances?.customers?.find(
        (c: any) => c.id === watchedCustomerId,
      );
      setSelectedCustomer(customer);
    } else {
      setSelectedCustomer(null);
    }
  }, [watchedCustomerId, customersWithBalances]);

  const subtotal = watchedLines.reduce((sum, l) => {
    const total = l.qty * l.unitPrice;
    const discount = (total * (l.discountPercent || 0)) / 100;
    return sum + (total - discount);
  }, 0);

  const totalPaid = watchedPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );

  const changeAmount = Math.max(0, totalPaid - subtotal);

  const calculateTotals = () => {
    const subtotal = watchedLines.reduce((sum, line) => {
      const lineTotal = (line.qty || 0) * (line.unitPrice || 0);
      const discount = (lineTotal * (line.discountPercent || 0)) / 100;
      return sum + (lineTotal - discount);
    }, 0);

    const taxAmount = 0; // Can be configured later
    const discountAmount = watchedLines.reduce((sum, line) => {
      const lineTotal = (line.qty || 0) * (line.unitPrice || 0);
      return sum + (lineTotal * (line.discountPercent || 0)) / 100;
    }, 0);

    const totalAmount = subtotal + taxAmount;
    const changeAmount = Math.max(0, watchedPayments - totalAmount);

    return { subtotal, taxAmount, discountAmount, totalAmount, changeAmount };
  };

  // const { subtotal, taxAmount, discountAmount, totalAmount, changeAmount } =
  //   calculateTotals();
  const { discountAmount, totalAmount } = calculateTotals();

  const onSubmit = async (data: PosSaleFormData) => {
    try {
      const result = await posApi.createSale({
        sessionId: session.id,
        customerId: data.customerId,
        saleLines: data.saleLines,
        subtotal,
        totalAmount: totalAmount,
        payments: data.payments,
        totalPaid,
        changeAmount,
        notes: data.notes,
      });
      // console.log("POS Sale result:", result.id);

      await handlePrintReceipt(result.id);

      toast.success("Sale completed");
      onSaleComplete();
    } catch (err) {
      console.error("POS Sale error:", err);
      toast.error("Failed to complete sale");
    }
  };

  const handlePrintReceipt = async (saleId: string) => {
    try {
      const printData = await posApi.printReceipt(saleId);
      console.log("Print data:", printData);
      const printerWidth = localStorage.getItem("printerWidth") || "80"; // default to 80mm
      const paperWidth = `${printerWidth}mm`;

      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) throw new Error("Unable to open print window");

      const receiptHTML = `
      <html>
        <head>
          <title>Receipt - ${printData.documentNo}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }

            body {
              font-family: Arial, sans-serif;
              width: ${paperWidth};
              padding: 5mm;
              margin: 0;
            }

            h1, h2 {
              margin: 5px 0;
              font-size: 14px;
              text-align: center;
            }

            table {
              width: 100%;
              font-size: 11px;
              border-collapse: collapse;
              margin-bottom: 10px;
            }

            th, td {
              padding: 2px;
            }

            th {
              border-bottom: 1px solid #000;
              text-align: left;
            }

            td {
              text-align: right;
            }

            td:first-child {
              text-align: left;
            }

            .totals {
              border-top: 1px solid #000;
              padding-top: 5px;
              font-size: 12px;
            }

            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div>
            <h1>${companyInformations.name} </h1>
            <h2>${companyInformations.address}</h2>
            <h2>${companyInformations.phone}</h2>
          </div>
          <div style="text-align: center; margin-bottom: 15px;">
            <h1>SALES RECEIPT</h1>
            <h2>${printData.documentNo}</h2>
            <p>${new Date(printData.date).toLocaleString()}</p>
          </div>

          ${
            printData.customer
              ? `
            <div style="margin-bottom: 10px; font-size: 12px;">
              <strong>Customer:</strong> ${printData.customer.name}<br>
              <strong>Code:</strong> ${printData.customer.code}
            </div>
          `
              : ""
          }

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${printData.items
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.qty}</td>
                  <td>₦${item.unitPrice.toLocaleString()}</td>
                  <td>₦${item.lineTotal.toLocaleString()}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span> <span>₦${printData.totals.subtotal.toLocaleString()}</span>
            </div>
            ${
              printData.totals.discountAmount > 0
                ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Discount:</span> <span>-₦${printData.totals.discountAmount.toLocaleString()}</span>
              </div>
            `
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Total:</span> <span>₦${printData.totals.totalAmount.toLocaleString()}</span>
            </div>
             ${
               printData.payments
                 ?.map(
                   (payment: any) => `
              <div style="display: flex; justify-content: space-between;">
                <span>Paid (${payment.method}):</span>
                <span>₦${payment.amount.toLocaleString()}</span>
              </div>
            `,
                 )
                 .join("") || ""
             }
            <div style="display: flex; justify-content: space-between;">
              <span>Change:</span>
              <span>₦${printData.totals.changeAmount.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            Cashier: ${printData.cashier.name}<br>
            Thank you for your business!<br>
            ProfitPilot ERP System
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `;

      printWindow.document.open();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } catch (error) {
      console.error("Print receipt error:", error);
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
                POS Terminal - {session.sessionNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Selection */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer (Optional)
                  </label>
                  <CustomerSelect
                    customers={customersWithBalances?.customers || []}
                    value={watch("customerId")}
                    onChange={(val) =>
                      reset({ ...getValues(), customerId: val })
                    }
                    error={errors.customerId?.message}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Sale notes"
                  />
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-green-900 mb-3">
                  Payments
                </h4>

                <div className="space-y-4">
                  {paymentFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-3"
                    >
                      {/* Method */}
                      <select
                        {...register(`payments.${index}.method`)}
                        className="border rounded px-2 py-2 focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="CASH">Cash</option>
                        <option value="TRANSFER">Transfer</option>
                        <option value="CARD">Card</option>
                      </select>

                      {/* Account */}
                      <select
                        {...register(`payments.${index}.cashAccountId`)}
                        className="border rounded px-2 py-2 focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select Account</option>
                        {filteredAccounts?.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>

                      {/* Amount */}
                      <input
                        {...register(`payments.${index}.amount`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.01"
                        className="border rounded px-2 py-2 focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Amount"
                      />

                      {/* Remove */}
                      {paymentFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePayment(index)}
                          className="text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      appendPayment({
                        method: "CASH",
                        cashAccountId: "",
                        amount: 0,
                      })
                    }
                    className="flex items-center text-sm text-blue-600"
                  >
                    <Plus className="mr-1" size={16} /> Add Payment Method
                  </button>
                </div>
              </div>

              {/* Customer Outstanding Balance */}
              {selectedCustomer && selectedCustomer.outstandingBalance > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-yellow-500 mr-2" />
                    <div>
                      <div className="font-medium text-yellow-900">
                        Customer Outstanding Balance
                      </div>
                      <div className="text-sm text-yellow-700">
                        {selectedCustomer.name} owes ₦
                        {selectedCustomer.outstandingBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sale Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={() =>
                      append({
                        itemId: "",
                        qty: 1,
                        unitPrice: 0,
                        discountPercent: 0,
                      })
                    }
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Item *
                          </label>
                          <ItemSelect
                            noZeroItem={true}
                            value={watch(`saleLines.${index}.itemId`)}
                            typeFilter="FINISHED_GOODS"
                            onChange={(val) =>
                              setValue(`saleLines.${index}.itemId`, val)
                            }
                            error={errors.saleLines?.[index]?.itemId?.message}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Qty *
                          </label>
                          <input
                            {...register(`saleLines.${index}.qty`, {
                              valueAsNumber: true,
                              validate: (value) => {
                                const itemId = watchedLines[index]?.itemId;
                                if (!itemId) return true;

                                const stock = itemStocks[itemId] ?? 0;

                                if (value > stock) {
                                  return `Only ${stock} in stock`;
                                }

                                return true;
                              },
                            })}
                            type="number"
                            step="0.1"
                            min="0"
                            max={
                              watchedLines[index]?.itemId
                                ? (itemStocks[watchedLines[index]?.itemId] ??
                                  undefined)
                                : undefined
                            }
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="1"
                          />
                          {errors.saleLines?.[index]?.qty && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.saleLines[index]?.qty?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Price *
                          </label>
                          <input
                            {...register(`saleLines.${index}.unitPrice`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            disabled
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Discount %
                          </label>
                          <input
                            {...register(`saleLines.${index}.discountPercent`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0"
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Line Total
                            </label>
                            <div className="mt-1 block w-full py-2 px-3 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-900">
                              ₦
                              {(() => {
                                const lineTotal =
                                  (watchedLines[index]?.qty || 0) *
                                  (watchedLines[index]?.unitPrice || 0);
                                const discount =
                                  (lineTotal *
                                    (watchedLines[index]?.discountPercent ||
                                      0)) /
                                  100;
                                return (lineTotal - discount).toLocaleString();
                              })()}
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
              </div>

              {/* Totals and Payment */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-blue-900 mb-3">
                    Order Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₦{subtotal.toLocaleString()}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span>-₦{discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>₦{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-green-900 mb-3">
                    Payment
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Total Paid *
                      </label>
                      <input
                        // {...register("amountPaid", { valueAsNumber: true })}
                        disabled
                        //value={`₦${totalPaid.toLocaleString()}`}
                        type="number"
                        step="0.01"
                        min={totalPaid}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={totalPaid.toFixed(2).toLocaleString()}
                      />
                      {/* {errors.totalPaid && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.totalPaid.message}
                        </p>
                      )} */}
                    </div>

                    {changeAmount > 0 && (
                      <div className="bg-yellow-100 p-3 rounded-md">
                        <div className="flex justify-between font-bold">
                          <span>Change Due:</span>
                          <span className="text-yellow-800">
                            ₦{changeAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
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
                  disabled={isSubmitting || totalPaid < totalAmount}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Processing..." : "Complete Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosTerminal;
