import { z } from 'zod';
import { FieldBuilder, FieldMetadata } from './builders/fields.js';
import { ColumnBuilder, ColumnMetadata } from './builders/columns.js';

export interface ActionMetadata {
  name: string;
  label?: string;
  handler?: (record: any) => Promise<any>;
}

export function action(
  name: string,
  config?: { label?: string; handler?: (record: any) => Promise<any> }
): ActionMetadata {
  const meta: ActionMetadata = { name };
  if (config?.label) meta.label = config.label;
  if (config?.handler) meta.handler = config.handler;
  return meta;
}

export interface ResourceAuthorization<TContext = any, TRecord = any> {
  canList?: (ctx: TContext) => boolean | Promise<boolean>;
  canCreate?: (ctx: TContext) => boolean | Promise<boolean>;
  canUpdate?: (ctx: TContext, record: TRecord) => boolean | Promise<boolean>;
  canDelete?: (ctx: TContext, record: TRecord) => boolean | Promise<boolean>;
}

export interface ResourceHooks<TRecord = any> {
  beforeCreate?: (record: any) => void | Promise<void>;
  afterCreate?: (record: TRecord) => void | Promise<void>;
  beforeUpdate?: (id: any, record: any) => void | Promise<void>;
  afterUpdate?: (record: TRecord) => void | Promise<void>;
  beforeDelete?: (id: any) => void | Promise<void>;
  afterDelete?: (id: any) => void | Promise<void>;
}

export interface ResourceConfig<TModel = any, TRecord = any, TContext = any> {
  name: string;
  label?: string;
  model: TModel;
  primaryKey?: string;
  table: {
    columns: (ColumnBuilder | ColumnMetadata)[];
  };
  form: {
    fields: (FieldBuilder | FieldMetadata)[];
  };
  actions?: ActionMetadata[];
  authorization?: ResourceAuthorization<TContext, TRecord>;
  hooks?: ResourceHooks<TRecord>;
  parent?: string;
  foreignKey?: string;
}

export interface ResourceMetadata {
  name: string;
  label: string;
  model: any;
  primaryKey: string;
  table: {
    columns: ColumnMetadata[];
  };
  form: {
    fields: FieldMetadata[];
  };
  actions: ActionMetadata[];
  authorization: ResourceAuthorization;
  hooks: ResourceHooks;
  validationSchema: z.ZodObject<any>;
  parent?: string;
  foreignKey?: string;
}

export interface Resource {
  readonly metadata: ResourceMetadata;
}

export function generateZodSchema(fields: FieldMetadata[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case 'number':
        schema = z.preprocess((val) => {
          if (val === '' || val === null || val === undefined) return undefined;
          const num = Number(val);
          return isNaN(num) ? val : num;
        }, z.number());
        break;
      case 'boolean':
        schema = z.preprocess((val) => {
          if (typeof val === 'string') {
            if (val.toLowerCase() === 'true') return true;
            if (val.toLowerCase() === 'false') return false;
          }
          return val;
        }, z.boolean());
        break;
      case 'date':
      case 'datetime':
        schema = z.preprocess((val) => {
          if (typeof val === 'string' && val !== '') {
            return new Date(val);
          }
          return val;
        }, z.date());
        break;
      case 'select':
        if (field.options && field.options.length > 0) {
          schema = z.enum(field.options as [string, ...string[]]);
        } else {
          schema = z.string();
        }
        break;
      case 'email':
        schema = z.string().email();
        break;
      case 'text':
      case 'textarea':
      case 'badge':
      case 'relation':
      case 'fileUpload':
      default:
        schema = z.string();
        break;
    }

    if (!field.isRequired) {
      schema = schema.optional().nullable();
    }
    shape[field.name] = schema;
  }
  return z.object(shape);
}

export function defineResource<TModel = any, TRecord = any, TContext = any>(
  config: ResourceConfig<TModel, TRecord, TContext>
): Resource {
  const columns = config.table.columns.map((c) => (c instanceof ColumnBuilder ? c.metadata : c));
  const fields = config.form.fields.map((f) => (f instanceof FieldBuilder ? f.metadata : f));

  const label = config.label || config.name.charAt(0).toUpperCase() + config.name.slice(1);
  const primaryKey = config.primaryKey || 'id';

  const metadata: ResourceMetadata = {
    name: config.name,
    label,
    model: config.model,
    primaryKey,
    table: { columns },
    form: { fields },
    actions: config.actions || [],
    authorization: config.authorization || {},
    hooks: config.hooks || {},
    validationSchema: generateZodSchema(fields),
    parent: config.parent,
    foreignKey: config.foreignKey,
  };

  return {
    metadata,
  };
}
