import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import {
  defineResource,
  text as adminText,
  email as adminEmail,
  badge as adminBadge,
  datetime as adminDatetime,
  input as adminInput,
  select as adminSelect,
  image as adminImage,
  fileUpload as adminFileUpload,
  numberField as adminNumberField,
  DrizzleAdapter,
} from '@cape/core';
import { createAdminApi } from '@cape/hono';

// 1. Initialize LibSQL database in-memory
const client = createClient({ url: 'file::memory:' });
const db = drizzle(client);

// 2. Define Drizzle Table Schemas
const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  createdAt: text('created_at').default(new Date().toISOString()),
});

const productsTable = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  price: real('price').notNull(),
  status: text('status').notNull(), // 'draft', 'published', 'scheduled'
  description: text('description'),
  image: text('image'),
});

const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull(),
  customerEmail: text('customer_email').notNull(),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'cancelled'
  totalPrice: real('total_price').notNull(),
  notes: text('notes'),
});

const orderItemsTable = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull(),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  price: real('price').notNull(),
});

const categoriesTable = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  isVisible: integer('is_visible').notNull(), // 1 (true) or 0 (false)
});

// Setup schema in the SQLite database and seed mock data
async function setupDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL,
      description TEXT,
      image TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      status TEXT NOT NULL,
      total_price REAL NOT NULL,
      notes TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_visible INTEGER NOT NULL
    )
  `);

  // Seed database
  await db.insert(usersTable).values([
    { name: 'Alice Smith', email: 'alice@example.com', role: 'admin' },
    { name: 'Bob Jones', email: 'bob@example.com', role: 'member' },
    { name: 'Charlie Brown', email: 'charlie@example.com', role: 'member' },
    { name: 'David Miller', email: 'david@example.com', role: 'member' },
    { name: 'Emma Wilson', email: 'emma@example.com', role: 'admin' },
    { name: 'Frank Thomas', email: 'frank@example.com', role: 'member' },
    { name: 'Grace Hopper', email: 'grace@example.com', role: 'admin' },
  ]);

  await db.insert(productsTable).values([
    {
      name: 'Carbon Fiber Road Bike',
      sku: 'BIKE-CF-09',
      price: 2499.0,
      status: 'published',
      description: 'Professional grade carbon fiber frame racing bike.',
      image: 'https://placehold.co/400?text=Road+Bike',
    },
    {
      name: 'Ultralight Mountain Tent',
      sku: 'TENT-UL-02',
      price: 349.99,
      status: 'published',
      description: '2-person 3-season double wall ultralight tent.',
      image: 'https://placehold.co/400?text=Mountain+Tent',
    },
    {
      name: 'Ergonomic Office Chair',
      sku: 'FURN-OC-88',
      price: 450.0,
      status: 'published',
      description: 'High-back mesh chair with adjustable armrests and lumbar support.',
      image: 'https://placehold.co/400?text=Office+Chair',
    },
    {
      name: 'Organic Dark Roast Coffee',
      sku: 'FOOD-COF-01',
      price: 18.99,
      status: 'published',
      description: 'Fair trade organic single origin dark roast beans.',
      image: 'https://placehold.co/400?text=Coffee+Beans',
    },
    {
      name: 'Smart Fitness Watch',
      sku: 'TECH-FW-77',
      price: 199.99,
      status: 'published',
      description: 'Waterproof fitness tracker with heart rate monitor.',
      image: 'https://placehold.co/400?text=Fitness+Watch',
    },
    {
      name: 'Leather Crossbody Bag',
      sku: 'BAG-LX-03',
      price: 85.0,
      status: 'draft',
      description: 'Handcrafted genuine leather crossbody shoulder bag.',
      image: 'https://placehold.co/400?text=Leather+Bag',
    },
    {
      name: 'Portable Bluetooth Speaker',
      sku: 'TECH-BS-12',
      price: 59.99,
      status: 'draft',
      description: 'Dustproof outdoor speaker with 20h playtime.',
      image: 'https://placehold.co/400?text=Speaker',
    },
    {
      name: 'Mechanical Gaming Keyboard',
      sku: 'TECH-KB-90',
      price: 129.99,
      status: 'published',
      description: 'RGB mechanical keyboard with red switches.',
      image: 'https://placehold.co/400?text=Keyboard',
    },
  ]);

  await db.insert(ordersTable).values([
    {
      orderNumber: 'ORD-2026-001',
      customerEmail: 'alice@example.com',
      status: 'completed',
      totalPrice: 2848.99,
      notes: 'Deliver to front porch.',
    },
    {
      orderNumber: 'ORD-2026-002',
      customerEmail: 'bob@example.com',
      status: 'processing',
      totalPrice: 89.5,
      notes: 'Leave with receptionist.',
    },
    {
      orderNumber: 'ORD-2026-003',
      customerEmail: 'charlie@example.com',
      status: 'pending',
      totalPrice: 349.99,
      notes: 'Call before delivery.',
    },
    {
      orderNumber: 'ORD-2026-004',
      customerEmail: 'david@example.com',
      status: 'completed',
      totalPrice: 450.0,
      notes: '',
    },
    {
      orderNumber: 'ORD-2026-005',
      customerEmail: 'emma@example.com',
      status: 'cancelled',
      totalPrice: 18.99,
      notes: 'Customer cancelled before shipping.',
    },
    {
      orderNumber: 'ORD-2026-006',
      customerEmail: 'frank@example.com',
      status: 'processing',
      totalPrice: 258.98,
      notes: 'Gift wrapping requested.',
    },
    {
      orderNumber: 'ORD-2026-007',
      customerEmail: 'grace@example.com',
      status: 'completed',
      totalPrice: 59.99,
      notes: '',
    },
  ]);

  await db.insert(orderItemsTable).values([
    { orderId: 1, productName: 'Carbon Fiber Road Bike', quantity: 1, price: 2499.0 },
    { orderId: 1, productName: 'Ultralight Mountain Tent', quantity: 1, price: 349.99 },
    { orderId: 2, productName: 'Ergonomic Office Chair', quantity: 2, price: 450.0 },
    { orderId: 3, productName: 'Smart Fitness Watch', quantity: 1, price: 199.99 },
    { orderId: 4, productName: 'Mechanical Gaming Keyboard', quantity: 1, price: 129.99 },
  ]);

  await db.insert(categoriesTable).values([
    { name: 'Outdoors', description: 'Camping, hiking, biking gear and equipment.', isVisible: 1 },
    { name: 'Home & Living', description: 'Furniture, kitchenware, decor and lighting.', isVisible: 1 },
    { name: 'Electronics', description: 'Gadgets, accessories, smart devices and audio.', isVisible: 1 },
    { name: 'Food & Beverage', description: 'Gourmet coffees, teas, snacks and pantry items.', isVisible: 1 },
    { name: 'Apparel', description: 'Clothing, outerwear, bags and accessories.', isVisible: 1 },
    { name: 'Footwear', description: 'Athletic shoes, casual boots and sandals.', isVisible: 0 },
  ]);
}

// 3. Define Admin Resource Metadata
const usersResource = defineResource({
  name: 'users',
  model: usersTable,
  primaryKey: 'id',
  table: {
    columns: [
      adminText('name').sortable().searchable(),
      adminEmail('email').searchable(),
      adminBadge('role'),
      adminDatetime('createdAt').sortable(),
    ],
  },
  form: {
    fields: [
      adminInput('name').required(),
      adminInput('email')
        .email()
        .required()
        .unique()
        .helperTextAbove({ text: 'Please enter a valid email address where we can contact you.', icon: 'Info' })
        .helperTextBelow({
          text: 'Email addresses must be unique and cannot be shared across multiple accounts.',
          icon: 'AlertCircle',
        }),
      adminSelect('role', {
        options: ['admin', 'member'],
      }),
    ],
  },
});

const productsResource = defineResource({
  name: 'products',
  model: productsTable,
  primaryKey: 'id',
  table: {
    columns: [
      adminImage('image'),
      adminText('name').sortable().searchable(),
      adminText('sku').sortable().searchable(),
      adminText('price').sortable(),
      adminBadge('status'),
    ],
  },
  form: {
    fields: [
      adminFileUpload('image'),
      adminInput('name').required(),
      adminInput('sku').required(),
      adminNumberField('price').required(),
      adminSelect('status', {
        options: ['draft', 'published', 'scheduled'],
      }),
      adminInput('description'),
    ],
  },
});

const ordersResource = defineResource({
  name: 'orders',
  model: ordersTable,
  primaryKey: 'id',
  table: {
    columns: [
      adminText('orderNumber').sortable().searchable(),
      adminEmail('customerEmail').searchable(),
      adminBadge('status'),
      adminText('totalPrice').sortable(),
    ],
  },
  form: {
    fields: [
      adminInput('orderNumber').required(),
      adminInput('customerEmail').email().required(),
      adminSelect('status', {
        options: ['pending', 'processing', 'completed', 'cancelled'],
      }),
      adminNumberField('totalPrice').required(),
      adminInput('notes'),
    ],
  },
});

const orderItemsResource = defineResource({
  name: 'order-items',
  label: 'Items',
  parent: 'orders',
  foreignKey: 'orderId',
  model: orderItemsTable,
  primaryKey: 'id',
  table: {
    columns: [adminText('productName').sortable().searchable(), adminText('quantity'), adminText('price')],
  },
  form: {
    fields: [
      adminInput('productName').required(),
      adminNumberField('quantity').required(),
      adminNumberField('price').required(),
    ],
  },
});

const categoriesResource = defineResource({
  name: 'categories',
  model: categoriesTable,
  primaryKey: 'id',
  table: {
    columns: [adminText('name').sortable().searchable(), adminText('description')],
  },
  form: {
    fields: [adminInput('name').required(), adminInput('description')],
  },
});

// 4. Initialize Hono Backend App
const app = new Hono();

// Mount Admin API routes using DrizzleAdapter!
app.route(
  '/admin/api',
  createAdminApi({
    db: new DrizzleAdapter(db),
    resources: [usersResource, productsResource, ordersResource, orderItemsResource, categoriesResource],
  })
);

serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`Drizzle Server is running on http://localhost:${info.port}`);
    setupDb()
      .then(() => {
        console.log('Database setup and seed completed!');
      })
      .catch((err) => {
        console.error('Failed to setup database:', err);
      });
  }
);
