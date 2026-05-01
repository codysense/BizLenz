import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cashApi, managementApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { ChartAccountSelect } from '../../components/ChartAccountSelect';

const editCashTransactionSchema = z.object({
  cashAccountId: z.string(),
  transactionType: z.enum(['RECEIPT', 'PAYMENT']),
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
        description: z.string().optional()
      })
    )
    .min(1, 'At least one transaction line is required')
});

type EditCashTransactionFormData = z.infer<typeof editCashTransactionSchema>;

interface EditCashTransactionModalProps {
  transaction: any; // transaction to edit
  onClose: () => void;
  onSuccess: () => void;
}

const EditCashTransactionModal = ({
  transaction,
  onClose,
  onSuccess
}: EditCashTransactionModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EditCashTransactionFormData>({
    resolver: zodResolver(editCashTransactionSchema),
    defaultValues: {
      transactionDate: transaction.transactionDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      transactionType: transaction.transactionType || 'RECEIPT',
      cashAccountId: transaction.cashAccountId || '',
      reference: transaction.reference || '',
      refType: transaction.refType || '',
      refId: transaction.refId || '',
      transactionLines:
        transaction.transactionLines?.map((line: any) => ({
          glAccountId: line.glAccountId,
          contraAccountId: line.contraAccountId || '',
          lineAmount: line.lineAmount,
          description: line.description || ''
        })) || [{ glAccountId: '', lineAmount: 0, description: '' }]
    }
  });

  // refetch chart accounts and cash accounts
  const { data: cashAccounts } = useQuery({
    queryKey: ['cash-accounts-for-transaction'],
    queryFn: () => cashApi.getCashAccounts()
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ['chart-accounts-for-transaction'],
    queryFn: () => managementApi.getChartOfAccounts()
  });

  const watchedType = watch('transactionType');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'transactionLines'
  });

  const watchedLines = watch('transactionLines');

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => sum + (line.lineAmount || 0), 0);
  };

  const onSubmit = async (data: EditCashTransactionFormData) => {
    try {
      await cashApi.updateCashTransaction(transaction.id, data);
      toast.success('Cash transaction updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Update cash transaction error:', error);
      toast.error('Failed to update transaction');
    }
  };

  useEffect(() => {
    if (transaction) {
      reset({
        transactionDate: transaction.transactionDate?.split('T')[0],
        transactionType: transaction.transactionType,
        cashAccountId: transaction.cashAccountId,
        reference: transaction.reference || '',
        refType: transaction.refType || '',
        refId: transaction.refId || '',
        transactionLines:
          transaction.transactionLines?.map((line: any) => ({
            glAccountId: line.glAccountId,
            contraAccountId: line.contraAccountId || '',
            lineAmount: line.lineAmount,
            description: line.description || ''
          })) || []
      });
    }
  }, [transaction, reset]);

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
                Edit Cash Transaction
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
                    {...register('transactionType')}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 cursor-not-allowed sm:text-sm"
                  >
                    <option value="RECEIPT">Cash Receipt</option>
                    <option value="PAYMENT">Cash Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction Date *
                  </label>
                  <input
                    {...register('transactionDate')}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cash Account *
                  </label>
                  <select
                    {...register('cashAccountId')}
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reference
                  </label>
                  <input
                    {...register('reference')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                    placeholder="Check number, transfer reference, etc."
                  />
                </div>
              </div>

              {/* Transaction lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={() =>
                      append({ glAccountId: '', lineAmount: 0, description: '' })
                    }
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                          GL Account *
                        </label>
                        <ChartAccountSelect
                          accounts={chartAccounts?.accounts || []}
                          value={watch(`transactionLines.${index}.glAccountId`)}
                          onChange={(val) =>
                            setValue(`transactionLines.${index}.glAccountId`, val)
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Line Amount *
                        </label>
                        <input
                          {...register(
                            `transactionLines.${index}.lineAmount`,
                            { valueAsNumber: true }
                          )}
                          type="number"
                          step="0.01"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <input
                          {...register(`transactionLines.${index}.description`)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                        />
                      </div>

                      <div className="py-6">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="ml-2 inline-flex items-center px-3 py-3 border border-gray-300 bg-white text-gray-500 rounded-md hover:bg-gray-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

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

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    watchedType === 'RECEIPT'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {isSubmitting ? 'Updating...' : 'Update Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCashTransactionModal;
