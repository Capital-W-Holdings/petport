import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateId,
  generatePetportId,
  isValidEmail,
  isValidDate,
  formatDate,
  daysBetween,
  ok,
  err,
} from '../utils/index.js';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from '../errors/index.js';
import { SPECIES, SEX, VACCINATION_TYPES } from '../constants/index.js';

describe('Utils', () => {
  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      assert.notStrictEqual(id1, id2);
    });

    it('should include prefix when provided', () => {
      const id = generateId('user');
      assert.ok(id.startsWith('user_'));
    });
  });

  describe('generatePetportId', () => {
    it('should generate valid petport id format', () => {
      const id = generatePetportId();
      assert.ok(/^PP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id));
    });

    it('should generate unique ids', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generatePetportId()));
      assert.strictEqual(ids.size, 100);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      assert.strictEqual(isValidEmail('test@example.com'), true);
      assert.strictEqual(isValidEmail('user.name@domain.co.uk'), true);
    });

    it('should reject invalid emails', () => {
      assert.strictEqual(isValidEmail('invalid'), false);
      assert.strictEqual(isValidEmail('no@domain'), false);
      assert.strictEqual(isValidEmail('@domain.com'), false);
    });
  });

  describe('isValidDate', () => {
    it('should validate correct dates', () => {
      assert.strictEqual(isValidDate('2024-01-15'), true);
      assert.strictEqual(isValidDate('2024-12-31T23:59:59Z'), true);
    });

    it('should reject invalid dates', () => {
      assert.strictEqual(isValidDate('invalid'), false);
      assert.strictEqual(isValidDate('2024-13-01'), false);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      assert.strictEqual(formatDate('2024-01-15T12:00:00Z'), '2024-01-15');
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      const days = daysBetween('2024-01-01', '2024-01-10');
      assert.strictEqual(days, 9);
    });
  });

  describe('Result type', () => {
    it('should create ok result', () => {
      const result = ok(42);
      assert.strictEqual(result.ok, true);
      if (result.ok) assert.strictEqual(result.value, 42);
    });

    it('should create err result', () => {
      const result = err(new Error('fail'));
      assert.strictEqual(result.ok, false);
      if (!result.ok) assert.strictEqual(result.error.message, 'fail');
    });
  });
});

describe('Errors', () => {
  describe('AppError', () => {
    it('should create error with code and status', () => {
      const error = new AppError('TEST_ERROR', 'Test message', 400);
      assert.strictEqual(error.code, 'TEST_ERROR');
      assert.strictEqual(error.message, 'Test message');
      assert.strictEqual(error.statusCode, 400);
    });

    it('should serialize to JSON', () => {
      const error = new AppError('TEST', 'msg', 400, { field: 'name' });
      const json = error.toJSON();
      assert.deepStrictEqual(json, { code: 'TEST', message: 'msg', details: { field: 'name' } });
    });
  });

  describe('ValidationError', () => {
    it('should have correct defaults', () => {
      const error = new ValidationError('Invalid input');
      assert.strictEqual(error.code, 'VALIDATION_ERROR');
      assert.strictEqual(error.statusCode, 400);
    });
  });

  describe('AuthenticationError', () => {
    it('should have correct defaults', () => {
      const error = new AuthenticationError();
      assert.strictEqual(error.code, 'AUTHENTICATION_ERROR');
      assert.strictEqual(error.statusCode, 401);
    });
  });

  describe('NotFoundError', () => {
    it('should format message correctly', () => {
      const error = new NotFoundError('Pet', '123');
      assert.strictEqual(error.message, "Pet with id '123' not found");
      assert.strictEqual(error.statusCode, 404);
    });
  });
});

describe('Constants', () => {
  it('should have valid species', () => {
    assert.ok(SPECIES.includes('DOG'));
    assert.ok(SPECIES.includes('CAT'));
    assert.strictEqual(SPECIES.length, 6);
  });

  it('should have valid sex options', () => {
    assert.ok(SEX.includes('MALE'));
    assert.ok(SEX.includes('FEMALE'));
    assert.strictEqual(SEX.length, 3);
  });

  it('should have valid vaccination types', () => {
    assert.ok(VACCINATION_TYPES.includes('RABIES'));
    assert.strictEqual(VACCINATION_TYPES.length, 8);
  });
});
