export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'boolean'
  | 'select'
  | 'date'
  | 'datetime'
  | 'badge'
  | 'relation'
  | 'fileUpload'
  | 'toggle'
  | 'checkboxList'
  | 'radio'
  | 'repeater'
  | 'tags'
  | 'keyValue'
  | 'colorPicker'
  | 'toggleButtons'
  | 'codeEditor'
  | 'hidden'
  | 'custom';

export interface FieldMetadata {
  readonly name: string;
  readonly type: FieldType;
  readonly label?: string;
  readonly isRequired: boolean;
  readonly isEmail: boolean;
  readonly isReadonly: boolean;
  readonly isDisabled: boolean;
  readonly description?: string;
  readonly defaultValue?: any;
  readonly options?: string[];
  readonly relationTable?: any;
  readonly isUnique?: boolean;
  readonly helperTextAbove?: string;
  readonly helperTextAboveIcon?: string;
  readonly helperTextBelow?: string;
  readonly helperTextBelowIcon?: string;
  readonly repeaterFields?: FieldMetadata[];
  readonly language?: string;
  readonly customRender?: string;
}

export class FieldBuilder {
  constructor(readonly metadata: FieldMetadata) {}

  required(): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, isRequired: true });
  }

  email(): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, isEmail: true, type: 'email' });
  }

  readonly(): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, isReadonly: true });
  }

  disabled(): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, isDisabled: true });
  }

  description(description: string): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, description });
  }

  label(label: string): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, label });
  }

  defaultValue(defaultValue: any): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, defaultValue });
  }

  unique(): FieldBuilder {
    return new FieldBuilder({ ...this.metadata, isUnique: true });
  }

  helperTextAbove(config: string | { text: string; icon?: string }): FieldBuilder {
    const text = typeof config === 'string' ? config : config.text;
    const icon = typeof config === 'string' ? undefined : config.icon;
    return new FieldBuilder({
      ...this.metadata,
      helperTextAbove: text,
      helperTextAboveIcon: icon,
    });
  }

  helperTextBelow(config: string | { text: string; icon?: string }): FieldBuilder {
    const text = typeof config === 'string' ? config : config.text;
    const icon = typeof config === 'string' ? undefined : config.icon;
    return new FieldBuilder({
      ...this.metadata,
      helperTextBelow: text,
      helperTextBelowIcon: icon,
    });
  }
}

export const input = (name: string) =>
  new FieldBuilder({
    name,
    type: 'text',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const emailField = (name: string) =>
  new FieldBuilder({
    name,
    type: 'email',
    isRequired: false,
    isEmail: true,
    isReadonly: false,
    isDisabled: false,
  });

export const textareaField = (name: string) =>
  new FieldBuilder({
    name,
    type: 'textarea',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const select = (name: string, config: { options: string[] }) =>
  new FieldBuilder({
    name,
    type: 'select',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    options: config.options,
  });

export const booleanField = (name: string) =>
  new FieldBuilder({
    name,
    type: 'boolean',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const dateField = (name: string) =>
  new FieldBuilder({
    name,
    type: 'date',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const datetimeField = (name: string) =>
  new FieldBuilder({
    name,
    type: 'datetime',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const numberField = (name: string) =>
  new FieldBuilder({
    name,
    type: 'number',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const badgeField = (name: string, config?: { options: string[] }) => {
  const meta: FieldMetadata = {
    name,
    type: 'badge',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  };
  if (config?.options) {
    (meta as any).options = config.options;
  }
  return new FieldBuilder(meta);
};

export const relationField = (name: string, config: { model: any; labelField?: string }) =>
  new FieldBuilder({
    name,
    type: 'relation',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    relationTable: config.model,
  });

export const fileUpload = (name: string) =>
  new FieldBuilder({
    name,
    type: 'fileUpload',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const toggle = (name: string) =>
  new FieldBuilder({
    name,
    type: 'toggle',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const checkboxList = (name: string, config: { options: string[] }) =>
  new FieldBuilder({
    name,
    type: 'checkboxList',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    options: config.options,
  });

export const radio = (name: string, config: { options: string[] }) =>
  new FieldBuilder({
    name,
    type: 'radio',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    options: config.options,
  });

export const repeater = (name: string, config: { fields: (FieldBuilder | FieldMetadata)[] }) =>
  new FieldBuilder({
    name,
    type: 'repeater',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    repeaterFields: config.fields.map((f) => (f instanceof FieldBuilder ? f.metadata : f)),
  });

export const tagsInput = (name: string) =>
  new FieldBuilder({
    name,
    type: 'tags',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const keyValue = (name: string) =>
  new FieldBuilder({
    name,
    type: 'keyValue',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const colorPicker = (name: string) =>
  new FieldBuilder({
    name,
    type: 'colorPicker',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const toggleButtons = (name: string, config: { options: string[] }) =>
  new FieldBuilder({
    name,
    type: 'toggleButtons',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    options: config.options,
  });

export const codeEditor = (name: string, config?: { language?: string }) =>
  new FieldBuilder({
    name,
    type: 'codeEditor',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    language: config?.language,
  });

export const hiddenField = (name: string) =>
  new FieldBuilder({
    name,
    type: 'hidden',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
  });

export const customField = (name: string, config: { render: string }) =>
  new FieldBuilder({
    name,
    type: 'custom',
    isRequired: false,
    isEmail: false,
    isReadonly: false,
    isDisabled: false,
    customRender: config.render,
  });
