
import { IUserJWTPayload } from '../users/users.interface';
import UserService from '../users/users.service';
import { ICategoriesQuery, ICreateCategory } from './categories.interface';
import { Role } from '../../../generated/prisma/enums';
import { ApiError } from '../../errors/ApiError';
import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';
class CategoriesService{
    async getAllCategory() {
        const categories = await prisma.category.findMany();
        
        if(categories.length === 0) {
            throw new ApiError(
                httpStatus.OK,
                "No categories exist in the database."
            );
        }

        return categories;
    }
    async getSingleCategoryByID(id: ICategoriesQuery["id"]) {
        const categories = await prisma.category.findFirstOrThrow({
            where: { id }
        });
        
        if(!categories) {
            throw new ApiError(
                httpStatus.OK,
                "No category exist in the database."
            );
        }

        return categories;
    }

    async isAdminRoleCheck(userId: string) {
        const user = await UserService.getUserById(userId);
        if (user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only Admin can modify categories!");
        }
    }
    async createCategory(userId: IUserJWTPayload["id"], payload: ICreateCategory[]) {
        const user = await UserService.getUserById(userId);

        if(user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only Admin can add category!");
        }

        const categoryNames = payload.map(item => item.name.trim());

        const existingCategories = await prisma.category.findMany({
            where: {
                name: { in: categoryNames }
            },
            select: { name: true }
        });

        const existingNames = existingCategories.map(c => c.name);

        const newCategoriesData = payload
            .map(item => ({ name: item.name.trim() }))
            .filter(item => !existingNames.includes(item.name));

        if (newCategoriesData.length === 0) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "All provided categories already exist in the database."
            );
        }

        const createdCategories = await prisma.category.createManyAndReturn({
            data: newCategoriesData,
            skipDuplicates: true 
        });

        return createdCategories;
    }

    async updateCategory(userId: IUserJWTPayload["id"], id: ICategoriesQuery["id"], payload: Partial<ICreateCategory>) {
        const user = await UserService.getUserById(userId);

        if (user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only Admin can modify categories!");
        }

        const newName = payload.name?.trim();
        
        if (payload.name && !newName) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Category name is required.");
        }

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
        }

        if (newName && newName !== existing.name) {
            const conflict = await prisma.category.findFirst({ where: { name: newName } });
            if (conflict && conflict.id !== id) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Another category with this name already exists.");
            }
        }

        const updated = await prisma.category.update({
            where: { id },
            data: { ...(newName ? { name: newName } : {}) }
        });

        return updated;
    }

    async deleteCategory(userId: IUserJWTPayload["id"], id: ICategoriesQuery["id"]) {
        const user = await UserService.getUserById(userId);

        if (user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only Admin can delete category!");
        }

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
        }

        try {
            const deleted = await prisma.category.delete({ where: { id } });
            return deleted;
        } catch (err: any) {
            if (err?.code === 'P2003') {
                throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete category because it is referenced by other records.");
            }
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete category.");
        }
    }
}
export default new CategoriesService();