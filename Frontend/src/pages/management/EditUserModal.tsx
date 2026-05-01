import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Eye, EyeOff } from "lucide-react";
import { userApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../lib/api";

const editUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    roleId: z.string().min(1, "Please select a role"),
    warehouseId: z.string().optional(),
    password: z.string().min(6).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type EditUserFormData = z.infer<typeof editUserSchema>;

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface EditUserModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    warehouseId?: string | null;
  };
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal = ({
  user,
  roles,
  onClose,
  onSuccess,
}: EditUserModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      warehouseId: user.warehouseId ?? "",
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-user"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const watchedRoleId = watch("roleId");
  const selectedRole = roles.find((r) => r.id === watchedRoleId)?.name || "";

  //  Warehouse visibility rules
  const isPosUser = selectedRole.includes("POS");
  const hideWarehouse =
    selectedRole.includes("Accountant") ||
    selectedRole.includes("General Manager");

  const showWarehouse = isPosUser && !hideWarehouse;

  const onSubmit = async (data: EditUserFormData) => {
    try {
      await userApi.updateUser(user.id, {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        warehouseId: showWarehouse ? data.warehouseId : null,
        ...(data.password && { password: data.password }),
      });

      toast.success("User updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update user error:", error);
      toast.error("Failed to update user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl sm:max-w-lg sm:w-full p-6">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">Edit User</h3>
            <button onClick={onClose}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium">Full Name</label>
              <input
                {...register("name")}
                className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                {...register("email")}
                type="email"
                className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium">Role</label>
              <select
                {...register("roleId")}
                className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse (POS ONLY) */}
            {showWarehouse && (
              <div>
                <label className="block text-sm font-medium">
                  Assigned Warehouse
                </label>
                <select
                  {...register("warehouseId")}
                  className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select warehouse</option>
                  {warehouses?.warehouses?.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Password (Optional) */}
            <div>
              <label className="block text-sm font-medium">
                New Password (optional)
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-md border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
