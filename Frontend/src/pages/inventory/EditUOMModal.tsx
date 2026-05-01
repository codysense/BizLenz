import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { uomApi } from "../../lib/api";
// import { updateUOMSchema } from "../../schemas/uom.schema";

const updateUOMSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .optional(),
  name: z.string().min(1, "Name is required").optional(),
});

type UpdateUOMFormData = z.infer<typeof updateUOMSchema>;

interface EditUOMModalProps {
  uom: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUOMModal = ({ uom, onClose, onSuccess }: EditUOMModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUOMFormData>({
    resolver: zodResolver(updateUOMSchema),
    defaultValues: {
      code: uom.code,
      name: uom.name,
    },
  });

  const onSubmit = async (data: UpdateUOMFormData) => {
    try {
      await uomApi.updateUOM(uom.id, data);
      toast.success("UOM updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update UOM error:", error);
      toast.error("Failed to update UOM");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left
            overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Edit UOM
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CODE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Code *
                  </label>
                  <input
                    {...register("code")}
                    placeholder="e.g., KG"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm
                      py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.code && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                {/* NAME */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    {...register("name")}
                    placeholder="Kilogram"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm
                      py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm
                    font-medium text-gray-700 hover:bg-gray-50 focus:outline-none
                    focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm
                    text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUOMModal;
