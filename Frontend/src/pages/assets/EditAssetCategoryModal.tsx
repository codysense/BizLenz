import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, managementApi } from '../../lib/api';
import toast from 'react-hot-toast';

/* ---------------- Schema ---------------- */

const editAssetCategorySchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  depreciationMethod: z.enum(['STRAIGHT_LINE', 'REDUCING_BALANCE']),
  usefulLife: z.number().int().positive(),
  residualValue: z.number().min(0).max(100),
  glAssetAccountId: z.string().min(1),
  glDepreciationAccountId: z.string().min(1),
  glAccumulatedDepreciationAccountId: z.string().min(1),
});

type EditAssetCategoryFormData = z.infer<typeof editAssetCategorySchema>;

interface EditAssetCategoryModalProps {
  assetCategory: any;
  onClose: () => void;
  onSuccess: () => void;
}

/* ---------------- Component ---------------- */

const EditAssetCategoryModal = ({
  assetCategory,
  onClose,
  onSuccess,
}: EditAssetCategoryModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditAssetCategoryFormData>({
    resolver: zodResolver(editAssetCategorySchema),
  });

  /* -------- Prefill form -------- */
  useEffect(() => {
    if (assetCategory) {
      reset({
        code: assetCategory.code,
        name: assetCategory.name,
        description: assetCategory.description ?? '',
        depreciationMethod: assetCategory.depreciationMethod,
        usefulLife: assetCategory.usefulLife,
        residualValue: Number(assetCategory.residualValue),
        glAssetAccountId: assetCategory.glAssetAccountId,
        glDepreciationAccountId: assetCategory.glDepreciationAccountId,
        glAccumulatedDepreciationAccountId:
          assetCategory.glAccumulatedDepreciationAccountId,
      });
    }
  }, [assetCategory, reset]);

  /* -------- Chart of accounts -------- */
  const { data: chartAccounts } = useQuery({
    queryKey: ['chart-accounts-for-assets'],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const assetAccounts =
    chartAccounts?.accounts?.filter(
      (acc: any) =>
        acc.accountType === 'NON_CURRENT_ASSETS' &&
        !acc.name.toLowerCase().includes('depreciation')
    ) || [];

  const depreciationAccounts =
    chartAccounts?.accounts?.filter(
      (acc: any) =>
        acc.accountType === 'EXPENSES' &&
        acc.name.toLowerCase().includes('depreciation')
    ) || [];

  const accumulatedDepreciationAccounts =
    chartAccounts?.accounts?.filter(
      (acc: any) =>
        acc.accountType === 'NON_CURRENT_ASSETS' &&
        acc.name.toLowerCase().includes('accumulated')
    ) || [];

  /* -------- Submit -------- */
  const onSubmit = async (data: EditAssetCategoryFormData) => {
    try {
      await assetsApi.updateAssetCategory(assetCategory.id, data);
      toast.success('Asset category updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Unable to update asset category'
      );
      console.error('Update asset category error:', error);
    }
  };

  /* ---------------- UI ---------------- */

  return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Asset Category
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
                      Code *
                    </label>
                    <input
                      {...register('code')}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., PLANT"
                    />
                    {errors.code && (
                      <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                    )}
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      {...register('name')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Plant and Equipment"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Category description"
                  />
                </div>
  
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Depreciation Method*
                    </label>
                    <select
                      {...register('depreciationMethod')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="STRAIGHT_LINE">Straight Line</option>
                      <option value="REDUCING_BALANCE">Reducing Balance</option>
                    </select>
                    {errors.depreciationMethod && (
                      <p className="mt-1 text-sm text-red-600">{errors.depreciationMethod.message}</p>
                    )}
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Useful Life (Years) *
                    </label>
                    <input
                      {...register('usefulLife', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="50"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.usefulLife && (
                      <p className="mt-1 text-sm text-red-600">{errors.usefulLife.message}</p>
                    )}
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Residual Value (%) *
                    </label>
                    <input
                      {...register('residualValue', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.residualValue && (
                      <p className="mt-1 text-sm text-red-600">{errors.residualValue.message}</p>
                    )}
                  </div>
                </div>
  
                {/* GL Account Mappings */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">GL Account Mappings</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Asset Account *
                    </label>
                    <select
                      {...register('glAssetAccountId')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select asset account</option>
                      {assetAccounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                    {errors.glAssetAccountId && (
                      <p className="mt-1 text-sm text-red-600">{errors.glAssetAccountId.message}</p>
                    )}
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Depreciation Expense Account *
                    </label>
                    <select
                      {...register('glDepreciationAccountId')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select depreciation expense account</option>
                      {depreciationAccounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                    {errors.glDepreciationAccountId && (
                      <p className="mt-1 text-sm text-red-600">{errors.glDepreciationAccountId.message}</p>
                    )}
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Accumulated Depreciation Account *
                    </label>
                    <select
                      {...register('glAccumulatedDepreciationAccountId')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select accumulated depreciation account</option>
                      {accumulatedDepreciationAccounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                    {errors.glAccumulatedDepreciationAccountId && (
                      <p className="mt-1 text-sm text-red-600">{errors.glAccumulatedDepreciationAccountId.message}</p>
                    )}
                  </div>
                </div>
  
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-2">GL Account Setup:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Asset Account: Records the cost of assets</li>
                    <li>• Depreciation Expense: Monthly/yearly depreciation charges</li>
                    <li>• Accumulated Depreciation: Total depreciation to date</li>
                  </ul>
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
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Editing...' : 'Edit Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
};

export default EditAssetCategoryModal;