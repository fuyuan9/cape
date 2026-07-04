import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import {
  defineResource,
  text,
  email,
  badge,
  datetime,
  input,
  select,
  image,
  fileUpload,
  numberField,
  DbAdapter,
  ResourceMetadata,
  ListParams,
  PaginatedResult,
} from '@cape/core';
import { createAdminApi } from '@cape/hono';

// 1. Define InMemory Database Adapter
class InMemoryAdapter implements DbAdapter {
  private db: Record<string, any[]> = {};

  constructor(initialData: Record<string, any[]>) {
    this.db = initialData;
  }

  async list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult> {
    const list = this.db[resource.name] || [];
    let data = [...list];

    // Search
    if (params.search) {
      const s = params.search.toLowerCase();
      data = data.filter((item) => Object.entries(item).some(([key, val]) => String(val).toLowerCase().includes(s)));
    }

    // Filter
    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (value !== undefined && value !== null && value !== '') {
          data = data.filter((item) => String(item[key]) === String(value));
        }
      }
    }

    // Sort
    if (params.sortField) {
      const order = params.sortOrder === 'desc' ? -1 : 1;
      data.sort((a, b) => {
        const valA = a[params.sortField!];
        const valB = b[params.sortField!];
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    }

    const total = data.length;
    const offset = (params.page - 1) * params.pageSize;
    const paginatedData = data.slice(offset, offset + params.pageSize);

    return {
      data: paginatedData,
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(resource: ResourceMetadata, data: any): Promise<any> {
    if (!this.db[resource.name]) this.db[resource.name] = [];
    const id = (this.db[resource.name].length + 1).toString();
    const record = { ...data, [resource.primaryKey]: id, createdAt: new Date() };
    this.db[resource.name].push(record);
    return record;
  }

  async read(resource: ResourceMetadata, id: any): Promise<any> {
    const list = this.db[resource.name] || [];
    return list.find((item) => String(item[resource.primaryKey]) === String(id)) || null;
  }

  async update(resource: ResourceMetadata, id: any, data: any): Promise<any> {
    const list = this.db[resource.name] || [];
    const idx = list.findIndex((item) => String(item[resource.primaryKey]) === String(id));
    if (idx === -1) throw new Error('Record not found');
    const updated = { ...list[idx], ...data };
    list[idx] = updated;
    return updated;
  }

  async delete(resource: ResourceMetadata, id: any): Promise<void> {
    if (!this.db[resource.name]) return;
    this.db[resource.name] = this.db[resource.name].filter((item) => String(item[resource.primaryKey]) !== String(id));
  }

  async bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void> {
    if (!this.db[resource.name]) return;
    const idStrings = ids.map(String);
    this.db[resource.name] = this.db[resource.name].filter(
      (item) => !idStrings.includes(String(item[resource.primaryKey]))
    );
  }
}

// 2. Define Admin Resources
const usersResource = defineResource({
  name: 'users',
  model: {},
  table: {
    columns: [
      text('name').sortable().searchable(),
      email('email').searchable(),
      badge('role'),
      datetime('createdAt').sortable(),
    ],
  },
  form: {
    fields: [
      input('name').required(),
      input('email')
        .email()
        .required()
        .unique()
        .helperTextAbove({ text: 'Please enter a valid email address where we can contact you.', icon: 'Info' })
        .helperTextBelow({
          text: 'Email addresses must be unique and cannot be shared across multiple accounts.',
          icon: 'AlertCircle',
        }),
      select('role', {
        options: ['admin', 'member'],
      }),
    ],
  },
});

const productsResource = defineResource({
  name: 'products',
  model: {},
  table: {
    columns: [
      image('image'),
      text('name').sortable().searchable(),
      text('sku').sortable().searchable(),
      text('price').sortable(),
      badge('status'),
    ],
  },
  form: {
    fields: [
      fileUpload('image'),
      input('name').required(),
      input('sku').required(),
      numberField('price').required(),
      select('status', {
        options: ['draft', 'published', 'scheduled'],
      }),
      input('description'),
    ],
  },
});

const ordersResource = defineResource({
  name: 'orders',
  model: {},
  table: {
    columns: [
      text('orderNumber').sortable().searchable(),
      email('customerEmail').searchable(),
      badge('status'),
      text('totalPrice').sortable(),
    ],
  },
  form: {
    fields: [
      input('orderNumber').required(),
      input('customerEmail').email().required(),
      select('status', {
        options: ['pending', 'processing', 'completed', 'cancelled'],
      }),
      numberField('totalPrice').required(),
      input('notes'),
    ],
  },
});

const orderItemsResource = defineResource({
  name: 'order-items',
  label: 'Items',
  parent: 'orders',
  foreignKey: 'orderId',
  model: {},
  primaryKey: 'id',
  table: {
    columns: [text('productName').sortable().searchable(), text('quantity'), text('price')],
  },
  form: {
    fields: [input('productName').required(), numberField('quantity').required(), numberField('price').required()],
  },
});

const categoriesResource = defineResource({
  name: 'categories',
  model: {},
  table: {
    columns: [text('name').sortable().searchable(), text('description')],
  },
  form: {
    fields: [input('name').required(), input('description')],
  },
});

// Seed data
const dbAdapter = new InMemoryAdapter({
  users: [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', role: 'admin', createdAt: new Date() },
    { id: '2', name: 'Bob Jones', email: 'bob@example.com', role: 'member', createdAt: new Date() },
    { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'member', createdAt: new Date() },
    { id: '4', name: 'David Miller', email: 'david@example.com', role: 'member', createdAt: new Date() },
    { id: '5', name: 'Emma Wilson', email: 'emma@example.com', role: 'admin', createdAt: new Date() },
    { id: '6', name: 'Frank Thomas', email: 'frank@example.com', role: 'member', createdAt: new Date() },
    { id: '7', name: 'Grace Hopper', email: 'grace@example.com', role: 'admin', createdAt: new Date() },
  ],
  products: [
    {
      id: '1',
      name: 'Carbon Fiber Road Bike',
      sku: 'BIKE-CF-09',
      price: 2499.0,
      status: 'published',
      description: 'Professional grade carbon fiber frame racing bike.',
      image: 'https://placehold.co/400?text=Road+Bike',
    },
    {
      id: '2',
      name: 'Ultralight Mountain Tent',
      sku: 'TENT-UL-02',
      price: 349.99,
      status: 'published',
      description: '2-person 3-season double wall ultralight tent.',
      image: 'https://placehold.co/400?text=Mountain+Tent',
    },
    {
      id: '3',
      name: 'Ergonomic Office Chair',
      sku: 'FURN-OC-88',
      price: 450.0,
      status: 'published',
      description: 'High-back mesh chair with adjustable armrests and lumbar support.',
      image: 'https://placehold.co/400?text=Office+Chair',
    },
    {
      id: '4',
      name: 'Organic Dark Roast Coffee',
      sku: 'FOOD-COF-01',
      price: 18.99,
      status: 'published',
      description: 'Fair trade organic single origin dark roast beans.',
      image: 'https://placehold.co/400?text=Coffee+Beans',
    },
    {
      id: '5',
      name: 'Smart Fitness Watch',
      sku: 'TECH-FW-77',
      price: 199.99,
      status: 'published',
      description: 'Waterproof fitness tracker with heart rate monitor.',
      image: 'https://placehold.co/400?text=Fitness+Watch',
    },
    {
      id: '6',
      name: 'Leather Crossbody Bag',
      sku: 'BAG-LX-03',
      price: 85.0,
      status: 'draft',
      description: 'Handcrafted genuine leather crossbody shoulder bag.',
      image: 'https://placehold.co/400?text=Leather+Bag',
    },
    {
      id: '7',
      name: 'Portable Bluetooth Speaker',
      sku: 'TECH-BS-12',
      price: 59.99,
      status: 'draft',
      description: 'Dustproof outdoor speaker with 20h playtime.',
      image: 'https://placehold.co/400?text=Speaker',
    },
    {
      id: '8',
      name: 'Mechanical Gaming Keyboard',
      sku: 'TECH-KB-90',
      price: 129.99,
      status: 'published',
      description: 'RGB mechanical keyboard with red switches.',
      image: 'https://placehold.co/400?text=Keyboard',
    },
  ],
  orders: [
    {
      id: '1',
      orderNumber: 'ORD-2026-001',
      customerEmail: 'alice@example.com',
      status: 'completed',
      totalPrice: 2848.99,
      notes: 'Deliver to front porch.',
    },
    {
      id: '2',
      orderNumber: 'ORD-2026-002',
      customerEmail: 'bob@example.com',
      status: 'processing',
      totalPrice: 89.5,
      notes: 'Leave with receptionist.',
    },
    {
      id: '3',
      orderNumber: 'ORD-2026-003',
      customerEmail: 'charlie@example.com',
      status: 'pending',
      totalPrice: 349.99,
      notes: 'Call before delivery.',
    },
    {
      id: '4',
      orderNumber: 'ORD-2026-004',
      customerEmail: 'david@example.com',
      status: 'completed',
      totalPrice: 450.0,
      notes: '',
    },
    {
      id: '5',
      orderNumber: 'ORD-2026-005',
      customerEmail: 'emma@example.com',
      status: 'cancelled',
      totalPrice: 18.99,
      notes: 'Customer cancelled before shipping.',
    },
    {
      id: '6',
      orderNumber: 'ORD-2026-006',
      customerEmail: 'frank@example.com',
      status: 'processing',
      totalPrice: 258.98,
      notes: 'Gift wrapping requested.',
    },
    {
      id: '7',
      orderNumber: 'ORD-2026-007',
      customerEmail: 'grace@example.com',
      status: 'completed',
      totalPrice: 59.99,
      notes: '',
    },
  ],
  categories: [
    { id: '1', name: 'Outdoors', description: 'Camping, hiking, biking gear and equipment.', isVisible: 1 },
    { id: '2', name: 'Home & Living', description: 'Furniture, kitchenware, decor and lighting.', isVisible: 1 },
    { id: '3', name: 'Electronics', description: 'Gadgets, accessories, smart devices and audio.', isVisible: 1 },
    { id: '4', name: 'Food & Beverage', description: 'Gourmet coffees, teas, snacks and pantry items.', isVisible: 1 },
    { id: '5', name: 'Apparel', description: 'Clothing, outerwear, bags and accessories.', isVisible: 1 },
    { id: '6', name: 'Footwear', description: 'Athletic shoes, casual boots and sandals.', isVisible: 0 },
  ],
  'order-items': [
    { id: '1', orderId: '1', productName: 'Carbon Fiber Road Bike', quantity: 1, price: 2499.0 },
    { id: '2', orderId: '1', productName: 'Ultralight Mountain Tent', quantity: 1, price: 349.99 },
    { id: '3', orderId: '2', productName: 'Ergonomic Office Chair', quantity: 2, price: 450.0 },
    { id: '4', orderId: '3', productName: 'Smart Fitness Watch', quantity: 1, price: 199.99 },
    { id: '5', orderId: '4', productName: 'Mechanical Gaming Keyboard', quantity: 1, price: 129.99 },
  ],
});

// 3. Initialize Hono Backend App
const app = new Hono();

// Mount Admin API routes
app.route(
  '/admin/api',
  createAdminApi({
    db: dbAdapter,
    resources: [usersResource, productsResource, ordersResource, orderItemsResource, categoriesResource],
  })
);

console.log('Server is running on http://localhost:3000');
serve({
  fetch: app.fetch,
  port: 3000,
});
