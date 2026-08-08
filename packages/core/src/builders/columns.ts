export type ColumnType = 'text' | 'email' | 'badge' | 'datetime' | 'number' | 'boolean' | 'date' | 'relation' | 'image';

export interface ColumnMetadata {
  readonly name: string;
  readonly type: ColumnType;
  readonly label?: string;
  readonly isSortable: boolean;
  readonly isSearchable: boolean;
  readonly isFilterable: boolean;
  readonly isTruncated?: boolean;
}

export class ColumnBuilder {
  constructor(readonly metadata: ColumnMetadata) {}

  label(label: string): ColumnBuilder {
    return new ColumnBuilder({ ...this.metadata, label });
  }

  truncate(): ColumnBuilder {
    return new ColumnBuilder({ ...this.metadata, isTruncated: true });
  }

  sortable(): ColumnBuilder {
    return new ColumnBuilder({ ...this.metadata, isSortable: true });
  }

  searchable(): ColumnBuilder {
    return new ColumnBuilder({ ...this.metadata, isSearchable: true });
  }

  filterable(): ColumnBuilder {
    return new ColumnBuilder({ ...this.metadata, isFilterable: true });
  }
}

export const text = (name: string) =>
  new ColumnBuilder({ name, type: 'text', isSortable: false, isSearchable: false, isFilterable: false });
export const email = (name: string) =>
  new ColumnBuilder({ name, type: 'email', isSortable: false, isSearchable: false, isFilterable: false });
export const badge = (name: string) =>
  new ColumnBuilder({ name, type: 'badge', isSortable: false, isSearchable: false, isFilterable: false });
export const datetime = (name: string) =>
  new ColumnBuilder({ name, type: 'datetime', isSortable: false, isSearchable: false, isFilterable: false });
export const number = (name: string) =>
  new ColumnBuilder({ name, type: 'number', isSortable: false, isSearchable: false, isFilterable: false });
export const boolean = (name: string) =>
  new ColumnBuilder({ name, type: 'boolean', isSortable: false, isSearchable: false, isFilterable: false });
export const date = (name: string) =>
  new ColumnBuilder({ name, type: 'date', isSortable: false, isSearchable: false, isFilterable: false });
export const relation = (name: string) =>
  new ColumnBuilder({ name, type: 'relation', isSortable: false, isSearchable: false, isFilterable: false });
export const image = (name: string) =>
  new ColumnBuilder({ name, type: 'image', isSortable: false, isSearchable: false, isFilterable: false });
