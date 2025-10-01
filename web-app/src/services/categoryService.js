import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

export const categoryService = {
    getAllCategories: async () => {
        try {
            const response = await httpClient.get(API.GET_CATEGORIES);
            return response.data?.result || [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },
};

export default categoryService;


