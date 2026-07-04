import React from 'react';
import type { Control, UseFormRegister } from 'react-hook-form';
import type { SerializedField, FieldInputProps, FieldDisplayProps } from './types.js';

import { TextareaInput, TextareaDisplay } from './TextareaField.js';
import { FileUploadInput, FileUploadDisplay } from './FileUploadField.js';
import { SelectInput, SelectDisplay } from './SelectField.js';
import { BooleanInput, BooleanDisplay } from './BooleanField.js';
import { ToggleInput, ToggleDisplay } from './ToggleField.js';
import { CheckboxListInput, CheckboxListDisplay } from './CheckboxListField.js';
import { RadioInput, RadioDisplay } from './RadioField.js';
import { RepeaterInput, RepeaterDisplay } from './RepeaterField.js';
import { TagsInput, TagsDisplay } from './TagsField.js';
import { KeyValueInput, KeyValueDisplay } from './KeyValueField.js';
import { ColorPickerInput, ColorPickerDisplay } from './ColorPickerField.js';
import { ToggleButtonsInput, ToggleButtonsDisplay } from './ToggleButtonsField.js';
import { CodeEditorInput, CodeEditorDisplay } from './CodeEditorField.js';
import { HiddenInput, HiddenDisplay } from './HiddenField.js';
import { CustomInput, CustomDisplay } from './CustomField.js';
import { DateTimeInput, DateTimeDisplay } from './DateTimeField.js';
import { DefaultInput, DefaultDisplay } from './DefaultField.js';

export type { SerializedField, FieldInputProps, FieldDisplayProps };

// ─── Field Input Registry ───────────────────────────────────────────────────

type FieldInputComponent = React.FC<FieldInputProps>;

const fieldInputRegistry: Record<string, FieldInputComponent> = {
  textarea: TextareaInput,
  fileUpload: FileUploadInput,
  select: SelectInput,
  boolean: BooleanInput,
  toggle: ToggleInput,
  checkboxList: CheckboxListInput,
  radio: RadioInput,
  repeater: RepeaterInput,
  tags: TagsInput,
  keyValue: KeyValueInput,
  colorPicker: ColorPickerInput,
  toggleButtons: ToggleButtonsInput,
  codeEditor: CodeEditorInput,
  hidden: HiddenInput,
  custom: CustomInput,
  date: DateTimeInput,
  datetime: DateTimeInput,
};

/**
 * Renders the appropriate form input for a given field type.
 */
export function renderFieldInput(
  field: SerializedField,
  register: UseFormRegister<any>,
  control: Control<any>,
  isLoading?: boolean
): React.ReactNode {
  const Component = fieldInputRegistry[field.type] || DefaultInput;
  return <Component field={field} register={register} control={control} isLoading={isLoading} />;
}

// ─── Field Display Registry ─────────────────────────────────────────────────

type FieldDisplayComponent = React.FC<FieldDisplayProps>;

const fieldDisplayRegistry: Record<string, FieldDisplayComponent> = {
  boolean: BooleanDisplay,
  toggle: ToggleDisplay,
  date: DateTimeDisplay,
  datetime: DateTimeDisplay,
  fileUpload: FileUploadDisplay,
  checkboxList: CheckboxListDisplay,
  tags: TagsDisplay,
  colorPicker: ColorPickerDisplay,
  keyValue: KeyValueDisplay,
  repeater: RepeaterDisplay,
  hidden: HiddenDisplay,
};

/**
 * Renders the appropriate display value for a given field type.
 */
export function renderFieldDisplay(field: SerializedField, value: any): React.ReactNode {
  const Component = fieldDisplayRegistry[field.type] || DefaultDisplay;
  return <Component field={field} value={value} />;
}
