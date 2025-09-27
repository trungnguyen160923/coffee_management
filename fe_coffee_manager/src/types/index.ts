export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    branchId?: string;
    avatar?: string;
  }
  
  export interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    managerId: string;
    revenue: number;
    orders: number;
    status: 'active' | 'inactive';
  }
  
  export interface Product {
    id: string;
    name: string;
    category: string;
    basePrice: number;
    description: string;
    image: string;
    status: 'active' | 'inactive';
  }
  
  export interface Recipe {
    id: string;
    productId: string;
    size: 'S' | 'M' | 'L';
    ingredients: Ingredient[];
    instructions: string;
    prepTime: number;
  }
  
  export interface Ingredient {
    name: string;
    quantity: number;
    unit: string;
  }
  
  export interface Order {
    id: string;
    customerId?: string;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    type: 'dine-in' | 'takeaway' | 'online';
    branchId: string;
    staffId: string;
    createdAt: string;
  }
  
  export interface OrderItem {
    productId: string;
    productName: string;
    size: 'S' | 'M' | 'L';
    quantity: number;
    price: number;
    notes?: string;
  }
  
  export interface Reservation {
    id: string;
    customerName: string;
    customerPhone: string;
    tableNumber: number;
    guestCount: number;
    date: string;
    time: string;
    status: 'confirmed' | 'seated' | 'completed' | 'cancelled';
    branchId: string;
  }
  
  export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    minStock: number;
    unit: string;
    lastUpdated: string;
    branchId: string;
  }