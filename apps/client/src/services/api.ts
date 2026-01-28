import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Schedules
  getSchedules: async (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    
    const response = await apiClient.get(`/schedules?${params.toString()}`);
    return response.data;
  },

  getSchedule: async (id: string) => {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  },

  createSchedule: async (data: any) => {
    const response = await apiClient.post('/schedules', data);
    return response.data;
  },

  updateSchedule: async (id: string, data: any) => {
    const response = await apiClient.put(`/schedules/${id}`, data);
    return response.data;
  },

  deleteSchedule: async (id: string) => {
    await apiClient.delete(`/schedules/${id}`);
  },

  getScheduleChanges: async (id: string) => {
    const response = await apiClient.get(`/schedules/${id}/changes`);
    return response.data;
  },

  // Companies
  getCompanies: async () => {
    const response = await apiClient.get('/companies');
    return response.data;
  },

  createCompany: async (data: any) => {
    const response = await apiClient.post('/companies', data);
    return response.data;
  },

  // Products
  getProducts: async () => {
    const response = await apiClient.get('/products');
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (data: any) => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  // 제품 검색 (자동완성용)
  searchProducts: async (searchTerm: string, limit: number = 10) => {
    const params = new URLSearchParams();
    params.append('q', searchTerm);
    params.append('limit', limit.toString());
    
    const response = await apiClient.get(`/products/search?${params.toString()}`);
    return response.data;
  },

  // Materials & Inventory
  getMaterials: async () => {
    const response = await apiClient.get('/materials');
    return response.data;
  },

  getInventory: async () => {
    const response = await apiClient.get('/inventory');
    return response.data;
  },

  updateInventory: async (materialId: string, data: any) => {
    const response = await apiClient.put(`/inventory/${materialId}`, data);
    return response.data;
  },

  // BOM
  getBOM: async (productId: string) => {
    const response = await apiClient.get(`/bom/product/${productId}`);
    return response.data;
  },

  createBOM: async (data: any) => {
    const response = await apiClient.post('/bom', data);
    return response.data;
  },

  // Production Requests
  getRequests: async () => {
    const response = await apiClient.get('/requests');
    return response.data;
  },

  createRequest: async (data: any) => {
    const response = await apiClient.post('/requests', data);
    return response.data;
  },

  // Approvals
  getApprovals: async () => {
    const response = await apiClient.get('/approvals');
    return response.data;
  },

  createApproval: async (data: any) => {
    const response = await apiClient.post('/approvals', data);
    return response.data;
  },

  approveRequest: async (id: string, approverId: string) => {
    const response = await apiClient.put(`/approvals/${id}/approve`, { approverId });
    return response.data;
  },

  // File Upload
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/uploads/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  validateImport: async (importId: string, mapping: any) => {
    const response = await apiClient.post('/uploads/validate', {
      importId,
      mapping,
    });
    return response.data;
  },

  setMainFile: async (importId: string) => {
    const response = await apiClient.put(`/uploads/${importId}/main`);
    return response.data;
  },

  // Users
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  // Notifications
  getNotifications: async (userId: string) => {
    const response = await apiClient.get(`/notifications/user/${userId}`);
    return response.data;
  },

  markNotificationRead: async (id: string) => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  // Health Check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // AI Excel Parsing
  parseExcelWithAI: async (data: { excelData: any[][], fileName: string }) => {
    const response = await apiClient.post('/uploads/ai-parse-data', data);
    return response.data;
  },

  // Generic post method for flexibility
  post: async (url: string, data: any) => {
    const response = await apiClient.post(url, data);
    return response.data;
  },

  // Generic get method for flexibility  
  get: async (url: string) => {
    const response = await apiClient.get(url);
    return response.data;
  },

  // ECOUNT API calls
  getPurchaseOrders: async (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    const response = await apiClient.get(`/ecount-python/purchase-orders?${params.toString()}`);
    return response.data;
  },

  getInventoryByLocation: async () => {
    const response = await apiClient.get('/ecount-python/inventory-by-location');
    return response.data;
  },

  getProductBasic: async (prodCd?: string, prodType?: string) => {
    const params = new URLSearchParams();
    if (prodCd) params.append('prodCd', prodCd);
    if (prodType) params.append('prodType', prodType);
    
    const response = await apiClient.get(`/ecount-python/product-basic?${params.toString()}`);
    return response.data;
  },

  getInventoryBalance: async (baseDate?: string, whCd?: string, prodCd?: string) => {
    const params = new URLSearchParams();
    if (baseDate) params.append('baseDate', baseDate);
    if (whCd) params.append('whCd', whCd);
    if (prodCd) params.append('prodCd', prodCd);
    
    const response = await apiClient.get(`/ecount-python/inventory-balance?${params.toString()}`);
    return response.data;
  },

  getMaterialsManagement: async (baseDate?: string, whCd?: string, prodCd?: string) => {
    const params = new URLSearchParams();
    if (baseDate) params.append('baseDate', baseDate);
    if (whCd) params.append('whCd', whCd);
    if (prodCd) params.append('prodCd', prodCd);
    
    const response = await apiClient.get(`/ecount-python/materials-management?${params.toString()}`);
    return response.data;
  },

  // Order Plans
  getOrderPlans: async (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    
    const response = await apiClient.get(`/order-plans?${params.toString()}`);
    return response.data;
  },

  getOrderPlan: async (id: string) => {
    const response = await apiClient.get(`/order-plans/${id}`);
    return response.data;
  },

  getNextOrderNumber: async () => {
    const response = await apiClient.get('/order-plans/next-order-number');
    return response.data;
  },

  createOrderPlan: async (data: any) => {
    const response = await apiClient.post('/order-plans', data);
    return response.data;
  },

  updateOrderPlan: async (id: string, data: any) => {
    const response = await apiClient.put(`/order-plans/${id}`, data);
    return response.data;
  },

  deleteOrderPlan: async (id: string) => {
    await apiClient.delete(`/order-plans/${id}`);
  },

  // Activity Logs
  getActivityLogs: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    
    const response = await apiClient.get(`/activity-logs?${searchParams.toString()}`);
    return response.data;
  },

  getActivityLogStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get(`/activity-logs/stats/summary?${params.toString()}`);
    return response.data;
  },

  createActivityLog: async (data: any) => {
    const response = await apiClient.post('/activity-logs', data);
    return response.data;
  },

  // Changes Buffer
  getChanges: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const response = await apiClient.get(`/changes?${searchParams.toString()}`);
    return response.data;
  },

  getChangesForEntity: async (entityId: string) => {
    const response = await apiClient.get(`/changes/entity/${entityId}`);
    return response.data;
  },

  getChangeById: async (changeId: string) => {
    const response = await apiClient.get(`/changes/${changeId}`);
    return response.data;
  },

  getChangeStats: async () => {
    const response = await apiClient.get('/changes/stats/summary');
    return response.data;
  },

  // 읽지 않은 변경사항 개수 조회
  getUnreadChangesCount: async () => {
    const response = await apiClient.get('/changes/unread/count');
    return response.data;
  },

  // 모든 변경사항을 읽음으로 표시
  markAllChangesAsRead: async () => {
    const response = await apiClient.post('/changes/mark-all-read');
    return response.data;
  },
};

export default api;