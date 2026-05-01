import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cashApi, salesApi, managementApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { CustomerSelect } from '../../components/CustomerSelect';
import { ChartAccountSelect } from '../../components/ChartAccountSelect';

/* ------------------------- ZOD SCHEMA ------------------------- */
const createCustomerPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  cashAccountId: z.string().min(1, 'Cash account is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        saleId: z.string().optional().nullable(),
        glAccountId: z.string().min(1, 'GL Account is required'),
        lineAmount: z.coerce.number().positive('Amount must be positive'),
        description: z.string().optional(),
      })
    )
    .min(1, 'At least one payment line is required'),
});

type FormData = z.infer<typeof createCustomerPaymentSchema>;

interface Props {
  payment: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditCustomerPaymentModal = ({ payment, onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createCustomerPaymentSchema),
    defaultValues: {
      paymentDate: payment.paymentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      customerId: payment.customerId || '',
      cashAccountId: payment.cashAccountId || '',
      reference: payment.reference || '',
      notes: payment.notes || '',
      lines:
        payment.lines?.map((line: any) => ({
          saleId: line.saleId || null,
          glAccountId: line.glAccountId,
          lineAmount: Number(line.lineAmount),
          description: line.description || '',
        })) || [{ saleId: null, glAccountId: '', lineAmount: 0, description: '' }],
    },
  });

  const selectedCustomerId = watch('customerId');
  const watchedLines = watch('lines');

  /* ------------------------- QUERIES -------------------------- */
  const { data: customers } = useQuery({
    queryKey: ['customers-for-payment'],
    queryFn: () => salesApi.getCustomers({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ['cash-accounts-for-payment'],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: customerSales } = useQuery({
    queryKey: ['customer-sales', selectedCustomerId],
    queryFn: () =>
      selectedCustomerId ? salesApi.getSales({ customerId: selectedCustomerId, status: 'INVOICED', limit: 100 }) : null,
    enabled: !!selectedCustomerId,
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ['chart-accounts-for-transaction'],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  /* ------------------------- FIELD ARRAY ------------------------ */
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  /* --------------------- AUTO-FILL AMOUNT ---------------------- */
  useEffect(() => {
    if (!customerSales?.sales) return;

    watchedLines.forEach((line, index) => {
      if (!line.saleId) return;

      const sale = customerSales.sales.find((s: any) => String(s.id) === String(line.saleId));
      if (sale) {
        setValue(`lines.${index}.lineAmount`, Number(sale.totalAmount), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    });
  }, [watchedLines, customerSales, setValue]);

  /* ----------------------- TOTAL CALC -------------------------- */
  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => sum + (line.lineAmount || 0), 0);
  };

  /* ----------------------- SUBMIT ----------------------------- */
  const onSubmit = async (data: FormData) => {
    try {
      await cashApi.updateCustomerPayment(payment.id, data);
      toast.success('Customer payment updated successfully!');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block bg-white rounded-lg shadow-xl transform transition-all sm:max-w-5xl sm:w-full sm:my-8">
          <div className="bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Customer Payment</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Customer + Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Customer *</label>
                  <CustomerSelect
                    customers={customers?.customers || []}
                    value={watch('customerId')}
                    onChange={(v) => setValue('customerId', v)}
                  />
                  {errors.customerId && <p className="text-red-600 text-sm">{errors.customerId.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium">Payment Date *</label>
                  <input {...register('paymentDate')} type="date" className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>

              {/* Cash Account + Reference */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Cash Account *</label>
                  <select {...register('cashAccountId')} className="mt-1 w-full border rounded-md px-3 py-2">
                    <option value="">Select cash account</option>
                    {cashAccounts?.accounts?.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name} (₦{Number(a.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">Reference</label>
                  <input {...register('reference')} className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
              </div>

              {/* Payment Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium">Payment Lines</h4>
                  <button
                    type="button"
                    onClick={() => append({ saleId: null, glAccountId: '', lineAmount: 0, description: '' })}
                    className="px-3 py-2 border rounded-md bg-white"
                  >
                    <Plus className="h-4 w-4 mr-1 inline" /> Add Line
                  </button>
                </div>

                {errors.lines && <p className="text-red-600 text-sm mb-2">{errors.lines.message}</p>}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-8 gap-4">
                        {/* Sale */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium">Sale (optional)</label>
                          <select {...register(`lines.${index}.saleId`)} className="mt-1 w-full border rounded-md px-3 py-2" >
                            <option value="">Select sale</option>
                            {customerSales?.sales?.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                #{s.orderNo} — ₦{Number(s.totalAmount).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* GL Account */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium">GL Account *</label>
                          <ChartAccountSelect
                            accounts={chartAccounts?.accounts || []}
                            value={watch(`lines.${index}.glAccountId`)}
                            onChange={(v) => setValue(`lines.${index}.glAccountId`, v)}
                          />
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="block text-sm font-medium">Amount *</label>
                          <input
                            {...register(`lines.${index}.lineAmount`, { valueAsNumber: true })}
                            type="number"
                            step="0.01"
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          />
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                          <label className="block text-sm font-medium">Description</label>
                          <input {...register(`lines.${index}.description`)} className="mt-1 w-full border rounded-md px-3 py-2" />
                        </div>

                        {/* Remove */}
                        <div className="py-6">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(index)} className="p-3 border rounded-md bg-white">
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
                  <span className="text-2xl font-bold text-blue-600">₦{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              {/* FOOTER BUTTONS */}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md bg-white">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-green-600 text-white disabled:opacity-50">
                  {isSubmitting ? 'Updating...' : 'Update Payment'}
                </button>
              </div>
            </form>

            {/* DEBUG ERRORS */}
            {Object.keys(errors).length > 0 && (
              <pre className="text-red-600 text-xs mt-2">{JSON.stringify(errors, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCustomerPaymentModal;



