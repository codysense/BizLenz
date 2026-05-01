import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../lib/api';
import { Bom } from '../../types/api';
import toast from 'react-hot-toast';

const editBomSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  bomLines: z.array(z.object({
    componentItemId: z.string().min(1, 'Component is required'),
    qtyPer: z.number().positive('Quantity must be positive'),
    scrapPercent: z.number().min(0).max(100).default(0),
  })).min(1, 'At least one component is required'),
});

type EditBomFormData = z.infer<typeof editBomSchema>;

interface EditBomModalProps {
  bom: Bom;
  onClose: () => void;
  onSuccess: () => void;
}

const EditBomModal = ({ bom, onClose, onSuccess }: EditBomModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<EditBomFormData>({
    resolver: zodResolver(editBomSchema),
    defaultValues: {
      version: bom.version,
      bomLines: bom.bomLines.map(line => ({
        componentItemId: line.componentItemId,
        qtyPer: line.qtyPer,
        scrapPercent: line.scrapPercent
      }))
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bomLines'
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ['raw-materials-for-edit'],
    queryFn: () => inventoryApi.getItems({ type: 'RAW_MATERIAL' , limit: 100 })
  });

  // Reset form when bom changes
  useEffect(() => {
    reset({
      version: bom.version,
      bomLines: bom.bomLines.map(line => ({
        componentItemId: line.componentItemId,
        qtyPer: line.qtyPer,
        scrapPercent: line.scrapPercent
      }))
    });
  }, [bom, reset]);

  const onSubmit = async (data: EditBomFormData) => {
    try {
      // Create a new BOM version with updated data
      await inventoryApi.createBom({
        itemId: bom.itemId,
        version: data.version,
        bomLines: data.bomLines
      });
      toast.success('BOM updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Edit BOM error:', error);
    }
  };

  const createNewVersion = () => {
    const currentVersion = parseFloat(bom.version);
    const newVersion = (currentVersion + 0.1).toFixed(1);
    reset({
      version: newVersion,
      bomLines: bom.bomLines.map(line => ({
        componentItemId: line.componentItemId,
        qtyPer: line.qtyPer,
        scrapPercent: line.scrapPercent
      }))
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Bill of Materials
                </h3>
                <p className="text-sm text-gray-600">
                  {bom.item.sku} - {bom.item.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Version Management */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Version
                    </label>
                    <input
                      {...register('version')}
                      className="mt-1 block w-32 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="1.0"
                    />
                    {errors.version && (
                      <p className="mt-1 text-sm text-red-600">{errors.version.message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={createNewVersion}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create New Version
                  </button>
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  Editing will create a new BOM version and deactivate the current one.
                </p>
              </div>

              {/* BOM Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Components</h4>
                  <button
                    type="button"
                    onClick={() => append({ componentItemId: '', qtyPer: 1, scrapPercent: 0 })}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                  </button>
                </div>

                {errors.bomLines && (
                  <p className="mb-4 text-sm text-red-600">{errors.bomLines.message}</p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const originalLine = bom.bomLines[index];
                    const isNewLine = !originalLine;
                    
                    return (
                      <div key={field.id} className={`p-4 rounded-lg border-2 ${
                        isNewLine ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        {isNewLine && (
                          <div className="mb-2 text-xs text-green-700 font-medium">
                            NEW COMPONENT
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Component Item *
                            </label>
                            <select
                              {...register(`bomLines.${index}.componentItemId`)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select component</option>
                              {rawMaterials?.items?.map((item: any) => (
                                <option key={item.id} value={item.id}>
                                  {item.sku} - {item.name} ({item.uom})
                                  {item.standardCost && ` - ₦${item.standardCost}`}
                                </option>
                              ))}
                            </select>
                            {errors.bomLines?.[index]?.componentItemId && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.bomLines[index]?.componentItemId?.message}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Qty Per Unit *
                            </label>
                            <input
                              {...register(`bomLines.${index}.qtyPer`, { valueAsNumber: true })}
                              type="number"
                              step="0.001"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="1.00"
                            />
                            {errors.bomLines?.[index]?.qtyPer && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.bomLines[index]?.qtyPer?.message}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Scrap %
                            </label>
                            <div className="flex">
                              <input
                                {...register(`bomLines.${index}.scrapPercent`, { valueAsNumber: true })}
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                className="flex-1 mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="0.00"
                              />
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="mt-1 inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            {errors.bomLines?.[index]?.scrapPercent && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.bomLines[index]?.scrapPercent?.message}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Show changes indicator */}
                        {originalLine && (
                          <div className="mt-2 text-xs text-gray-500">
                            Original: {originalLine.qtyPer} per unit, {originalLine.scrapPercent}% scrap
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Change Summary */}
              {isDirty && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Changes Summary:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• A new BOM version will be created</li>
                    <li>• The current version will be marked as inactive</li>
                    <li>• Existing production orders will continue using the old version</li>
                    <li>• New production orders will use the updated version</li>
                  </ul>
                </div>
              )}
              
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
                  disabled={isSubmitting || !isDirty}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save BOM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBomModal;