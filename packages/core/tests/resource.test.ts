import { describe, expect, it } from 'vitest';
import { defineResource, text, email, badge, input, select, hiddenField, customField } from '../src/index.js';

describe('Resource Builders and Metadata', () => {
  it('should create immutable column metadata', () => {
    const col = text('name');
    const sortedCol = col.sortable();
    const searchedCol = sortedCol.searchable();

    expect(col.metadata.isSortable).toBe(false);
    expect(col.metadata.isSearchable).toBe(false);

    expect(sortedCol.metadata.isSortable).toBe(true);
    expect(sortedCol.metadata.isSearchable).toBe(false);

    expect(searchedCol.metadata.isSortable).toBe(true);
    expect(searchedCol.metadata.isSearchable).toBe(true);
  });

  it('should create immutable field metadata', () => {
    const field = input('name');
    const reqField = field.required();

    expect(field.metadata.isRequired).toBe(false);
    expect(reqField.metadata.isRequired).toBe(true);
  });

  it('should define a resource with correct properties', () => {
    const resource = defineResource({
      name: 'users',
      model: {},
      table: {
        columns: [text('name').sortable().searchable(), email('email')],
      },
      form: {
        fields: [input('name').required(), select('role', { options: ['admin', 'member'] })],
      },
    });

    expect(resource.metadata.name).toBe('users');
    expect(resource.metadata.table.columns).toHaveLength(2);
    expect(resource.metadata.form.fields).toHaveLength(2);
    expect(resource.metadata.table.columns[0].isSortable).toBe(true);
    expect(resource.metadata.table.columns[0].isSearchable).toBe(true);
    expect(resource.metadata.form.fields[0].isRequired).toBe(true);
    expect(resource.metadata.form.fields[1].options).toContain('admin');
  });

  it('should validate inputs using the generated zod schema', () => {
    const resource = defineResource({
      name: 'users',
      model: {},
      table: {
        columns: [text('name')],
      },
      form: {
        fields: [input('name').required(), input('email').email().required()],
      },
    });

    const schema = resource.metadata.validationSchema;

    // Valid data
    const validResult = schema.safeParse({ name: 'John Doe', email: 'john@example.com' });
    expect(validResult.success).toBe(true);

    // Missing fields
    const invalidResult = schema.safeParse({ name: 'John Doe' });
    expect(invalidResult.success).toBe(false);

    // Invalid email
    const invalidEmailResult = schema.safeParse({ name: 'John Doe', email: 'not-an-email' });
    expect(invalidEmailResult.success).toBe(false);
  });

  it('should support helperTextAbove and helperTextBelow metadata', () => {
    const field = input('email').helperTextAbove('Above text').helperTextBelow({ text: 'Below text', icon: 'Info' });

    expect(field.metadata.helperTextAbove).toBe('Above text');
    expect(field.metadata.helperTextAboveIcon).toBeUndefined();
    expect(field.metadata.helperTextBelow).toBe('Below text');
    expect(field.metadata.helperTextBelowIcon).toBe('Info');
  });

  it('should strip readonly, disabled, hidden, and custom fields from write validation schema', () => {
    const resource = defineResource({
      name: 'settings',
      model: {},
      table: {
        columns: [text('name'), badge('status')],
      },
      form: {
        fields: [
          input('name').required(),
          input('status').readonly(),
          input('role').disabled(),
          hiddenField('secretToken'),
          customField('signature', { render: 'signature' }),
        ],
      },
    });

    const result = resource.metadata.writeValidationSchema.safeParse({
      name: 'Visible',
      status: 'admin',
      role: 'owner',
      secretToken: 'secret',
      signature: 'tampered',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'Visible' });
  });
});
