import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { journalApi, managementApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { ChartAccountSelect } from '../../components/ChartAccountSelect';


const createJournalSchema = z.object({
 
  journalDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  note: z.string().optional(),
  journalLines: z.array(z.object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.number(),
    credit:z.number()
  })),
});

type CreateJournalFormData = z.infer<typeof createJournalSchema>;

interface CreateJournalModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateJournalModal = ({ onClose, onSuccess }: CreateJournalModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    // getValues,
    // reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateJournalFormData>({
    resolver: zodResolver(createJournalSchema),
    defaultValues: {
      journalDate: new Date().toISOString().split('T')[0],
      journalLines: [{ accountId: '', debit: 0, credit: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'journalLines'
  });

  const watchedLines = watch('journalLines');

  const { data: chartAccounts } = useQuery({
    queryKey: ['chartAccounts-for-Journal'],
    queryFn: () => managementApi.getChartOfAccounts()
  });

//   const { data: items } = useQuery({
//     queryKey: ['items-for-Journals'],
//     queryFn: () => inventoryApi.getItems({  limit: 100 })
//   });

  const calculateDebitTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.debit || 0) ;
    }, 0);
  };
  const calculateCreditTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.credit || 0) ;
    }, 0);
  };

  const onSubmit = async (data: CreateJournalFormData) => {
    try {
      await journalApi.createJournal(data);
      toast.success('Journal order created successfully');
      onSuccess();
    } catch (error) {
      console.error('Create Journal error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create Journal
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
                    Date *
                  </label>                 
                    <input
                    {...register('journalDate')}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.journalDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.journalDate.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Journal Note *
                  </label>
                  <input
                    {...register('note')}
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.note && (
                    <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
                  )}
                </div>
              </div>

              

              {/* Journal Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Journal Entries</h4>
                  <button
                    type="button"
                    
                    onClick={() => append({ accountId: '', debit: 0, credit: 0  })}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Journal Entery
                  </button>
                
                 </div>

                {errors.journalLines && (
                  <p className="mb-4 text-sm text-red-600">{errors.journalLines.message}</p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Chart of Account *
                          </label>
                          <ChartAccountSelect
                            accounts={chartAccounts?.accounts || []}
                             value={watch(`journalLines.${index}.accountId`)}
                            onChange={(val) => setValue(`journalLines.${index}.accountId`, val, { shouldDirty: true })}
                             error={errors.journalLines?.[index]?.accountId?.message}
                        />

                          {errors.journalLines?.[index]?.accountId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.journalLines[index]?.accountId?.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Debit *
                          </label>
                          <input
                            {...register(`journalLines.${index}.debit`, { valueAsNumber: true })}
                            type="number"
                            step="0.001"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0.00"
                          />
                          {errors.journalLines?.[index]?.debit && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.journalLines[index]?.debit?.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Credit *
                          </label>
                          <input
                            {...register(`journalLines.${index}.credit`, { valueAsNumber: true })}
                            type="number"
                            step="0.01"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0.00"
                          />
                          {errors.journalLines?.[index]?.credit && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.journalLines[index]?.credit?.message}
                            </p>
                          )}
                        </div>
                       
                        {fields.length > 1 && (
                        <button
                        type="button"
                        onClick={() => remove(index)}
                        className="ml-2 inline-flex items-center px-3 py-2  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Debit:</span>
                    <span className="text-2xl font-bold text-red-600">
                      ₦{calculateDebitTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Credit:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₦{calculateCreditTotal().toLocaleString()}
                    </span>
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
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Posting...' : 'Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateJournalModal;