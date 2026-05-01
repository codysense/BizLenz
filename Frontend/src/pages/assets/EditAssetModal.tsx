import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, inventoryApi } from '../../lib/api';
import { Asset } from '../../types/api';
import toast from 'react-hot-toast';

const updateAssetSchema = z.object({
  name: z.string().min(1, 'Asset name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  locationId: z.string().optional(),
  serialNumber: z.string().optional(),
  supplier: z.string().optional(),
});

type UpdateAssetFormData = z.infer<typeof updateAssetSchema>;

interface EditAssetModalProps {
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAssetModal = ({ asset, onClose, onSuccess }: EditAssetModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<UpdateAssetFormData>({
    resolver: zodResolver(updateAssetSchema),
    defaultValues: {
      name: asset.name,
      description: asset.description || '',
      categoryId: asset.categoryId,
      locationId: asset.locationId || '',
      serialNumber: asset.serialNumber || '',
      supplier: asset.supplier || ''
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['asset-categories-for-edit'],
    queryFn: () => assetsApi.getAssetCategories()
  });

  const { data: locations } = useQuery({
    queryKey: ['locations-for-edit-asset'],
    queryFn: () => inventoryApi.getLocations({ limit: 100 })
  });

  useEffect(() => {
    reset({
      name: asset.name,
      description: asset.description || '',
      categoryId: asset.categoryId,
      locationId: asset.locationId || '',
      serialNumber: asset.serialNumber || '',
      supplier: asset.supplier || ''
    });
  }, [asset, reset]);

  const onSubmit = async (data: UpdateAssetFormData) => {
    try {
      await assetsApi.updateAsset(asset.id, data);
      toast.success('Asset updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Update asset error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Asset
                </h3>
                <p className="text-sm text-gray-600">
                  {asset.assetNo} - {asset.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Asset No:</strong> {asset.assetNo} (cannot be changed)
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Name *
                </label>
                <input
                  {...register('name')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Category *
                </label>
                <select
                  {...register('categoryId')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select category</option>
                  {categories?.categories?.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.code} - {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <select
                    {...register('locationId')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select location</option>
                    {locations?.locations?.map((location: any) => (
                      <option key={location.id} value={location.id}>
                        {location.code} - {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Serial Number
                  </label>
                  <input
                    {...register('serialNumber')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supplier
                </label>
                <input
                  {...register('supplier')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Asset Financial Details (Read-only):</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Acquisition Cost: ₦{asset.acquisitionCost.toLocaleString()}</div>
                  <div>• Acquisition Date: {new Date(asset.acquisitionDate).toLocaleDateString()}</div>
                  <div>• Depreciation Method: {asset.depreciationMethod.replace('_', ' ')}</div>
                  <div>• Useful Life: {asset.usefulLife} years</div>
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
                  disabled={isSubmitting || !isDirty}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;