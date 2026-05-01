import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Clock } from 'lucide-react';
import { productionApi } from '../../lib/api';
import { ProductionOrder } from '../../types/api';
import toast from 'react-hot-toast';

const addLaborSchema = z.object({
  hours: z.number().positive('Hours must be positive'),
  rate: z.number().positive('Rate must be positive'),
  employeeName: z.string().optional(),
});

type AddLaborFormData = z.infer<typeof addLaborSchema>;

interface AddLaborModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const AddLaborModal = ({ order, onClose, onSuccess }: AddLaborModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<AddLaborFormData>({
    resolver: zodResolver(addLaborSchema)
  });

  const watchedHours = watch('hours') || 0;
  const watchedRate = watch('rate') || 0;
  const totalAmount = watchedHours * watchedRate;

  const onSubmit = async (data: AddLaborFormData) => {
    try {
      await productionApi.addLabor(order.id, data);
      toast.success('Labor cost added successfully');
      onSuccess();
    } catch (error) {
      console.error('Add labor error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Add Labor Cost: {order.orderNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Order Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <div className="font-medium">{order.item.name}</div>
                    <div className="text-sm text-gray-600">Target: {order.qtyTarget} units</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Hours Worked *
                  </label>
                  <input
                    {...register('hours', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="8.00"
                  />
                  {errors.hours && (
                    <p className="mt-1 text-sm text-red-600">{errors.hours.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Hourly Rate (₦) *
                  </label>
                  <input
                    {...register('rate', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="500.00"
                  />
                  {errors.rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.rate.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employee Name
                </label>
                <input
                  {...register('employeeName')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Employee name (optional)"
                />
              </div>

              {/* Total Calculation */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Labor Cost:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₦{totalAmount.toLocaleString()}
                  </span>
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
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Labor Cost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLaborModal;