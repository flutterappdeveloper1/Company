/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'bn';

export type UserRole = 'admin' | 'dealer';

export interface Dealer {
  id: string;
  name: string;
  phone: string;
  email: string;
  area: string;
}

export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  dealerId: string; // Shop is under a specific dealer
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;    // Buying price for the company
  sellingPrice: number; // Price at which dealer sells to shop
  stock: number;
  unit: string;         // 'Kg', 'Piece', 'Liter', 'Pack'
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;    // captured at order time
  sellingPrice: number; // captured at order time
  totalPrice: number;   // quantity * sellingPrice
}

export interface Order {
  id: string;
  shopId: string;
  shopName: string;
  dealerId: string;
  dealerName: string;
  items: OrderItem[];
  totalCostPrice: number;
  totalSellingPrice: number;
  profit: number; // totalSellingPrice - totalCostPrice
  status: 'Pending' | 'Ready' | 'Delivered' | 'Cancelled';
  date: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string; // e.g., 'Transport', 'Rent', 'Salaries', 'Utilities', 'Others'
  date: string;
  description?: string;
}

export interface Investment {
  id: string;
  title: string;
  amount: number;
  date: string;
  description?: string;
}
