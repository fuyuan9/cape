import { describe, it, expect } from 'vitest';
import { recordsToCsv, csvToRecords, buildCsvFilename } from '../src/csv.js';

describe('csv utilities', () => {
  describe('recordsToCsv', () => {
    it('should serialise records with a header row', () => {
      const csv = recordsToCsv(['name', 'email'], [{ name: 'Alice', email: 'alice@example.com' }]);
      const lines = csv.trim().split('\n');
      // csv-stringify quotes fields by default; check both columns are present in header
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('email');
      expect(lines[1]).toContain('Alice');
      expect(lines[1]).toContain('alice@example.com');
    });

    it('should escape CSV injection characters with a single quote prefix', () => {
      const csv = recordsToCsv(['formula'], [{ formula: '=SUM(A1)' }]);
      expect(csv).toContain("'=SUM(A1)");
    });

    it('should escape + - @ prefixed values', () => {
      const data = [{ v: '+1234' }, { v: '-5678' }, { v: '@user' }];
      const csv = recordsToCsv(['v'], data);
      expect(csv).toContain("'+1234");
      expect(csv).toContain("'-5678");
      expect(csv).toContain("'@user");
    });

    it('should handle null and undefined values as empty string', () => {
      const csv = recordsToCsv(['a', 'b'], [{ a: null, b: undefined }]);
      expect(csv).toContain('a'); // header present
      const dataLine = csv.trim().split('\n')[1];
      // Both values should be empty (quoted empty strings)
      expect(dataLine.replace(/"/g, '').trim()).toBe(',');
    });

    it('should only include specified columns in order', () => {
      const csv = recordsToCsv(['name'], [{ name: 'Bob', secret: 'hidden' }]);
      expect(csv).not.toContain('secret');
      expect(csv).not.toContain('hidden');
    });
  });

  describe('csvToRecords', () => {
    it('should parse a simple CSV with header', () => {
      const csvText = 'name,email\nAlice,alice@example.com\nBob,bob@example.com';
      const { records, errors } = csvToRecords(csvText, ['name', 'email']);
      expect(errors).toHaveLength(0);
      expect(records).toHaveLength(2);
      expect(records[0]).toEqual({ name: 'Alice', email: 'alice@example.com' });
      expect(records[1]).toEqual({ name: 'Bob', email: 'bob@example.com' });
    });

    it('should filter out columns not in the whitelist', () => {
      const csvText = 'name,secret,email\nAlice,password123,alice@example.com';
      const { records, errors } = csvToRecords(csvText, ['name', 'email']);
      expect(errors).toHaveLength(0);
      expect(records[0]).toEqual({ name: 'Alice', email: 'alice@example.com' });
      expect(records[0]).not.toHaveProperty('secret');
    });

    it('should return error when CSV has no data rows', () => {
      const csvText = 'name,email';
      const { records, errors } = csvToRecords(csvText, ['name', 'email']);
      expect(records).toHaveLength(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error on completely invalid CSV', () => {
      const { records, errors } = csvToRecords('', ['name']);
      expect(records).toHaveLength(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle quoted fields with commas inside', () => {
      const csvText = 'name,description\n"Smith, John","A manager, not a developer"';
      const { records, errors } = csvToRecords(csvText, ['name', 'description']);
      expect(errors).toHaveLength(0);
      expect(records[0].name).toBe('Smith, John');
      expect(records[0].description).toBe('A manager, not a developer');
    });
  });

  describe('buildCsvFilename', () => {
    it('should produce a filename with date and .csv extension', () => {
      const filename = buildCsvFilename('users');
      expect(filename).toMatch(/^users-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should sanitise resource names with special characters', () => {
      const filename = buildCsvFilename('my resource!');
      expect(filename).not.toContain('!');
      expect(filename).not.toContain(' ');
    });
  });
});
