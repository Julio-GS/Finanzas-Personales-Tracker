import { describe, it, expect } from 'vitest';
import { validateCredentials, constantTimeEqual } from '@/lib/auth-core';

describe('lib/auth-core - Credential Comparison & Validation', () => {
  const configured = {
    username: 'admin',
    password: 'supersecretpassword123',
  };

  it('validates matching username and password credentials', () => {
    const result = validateCredentials(
      { username: 'admin', password: 'supersecretpassword123' },
      configured
    );
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('is case-sensitive for credentials', () => {
    expect(
      validateCredentials({ username: 'Admin', password: 'supersecretpassword123' }, configured).success
    ).toBe(false);
    expect(
      validateCredentials({ username: 'admin', password: 'Supersecretpassword123' }, configured).success
    ).toBe(false);
  });

  it('rejects prefix/suffix partial matches', () => {
    expect(
      validateCredentials({ username: 'admi', password: 'supersecretpassword123' }, configured).success
    ).toBe(false);
    expect(
      validateCredentials({ username: 'administrator', password: 'supersecretpassword123' }, configured).success
    ).toBe(false);
    expect(
      validateCredentials({ username: 'admin', password: 'supersecretpassword12' }, configured).success
    ).toBe(false);
    expect(
      validateCredentials({ username: 'admin', password: 'supersecretpassword1234' }, configured).success
    ).toBe(false);
  });

  it('rejects wrong username with generic invalid_credentials error', () => {
    const result = validateCredentials(
      { username: 'wronguser', password: 'supersecretpassword123' },
      configured
    );
    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'invalid_credentials',
      message: 'Invalid credentials',
    });
  });

  it('rejects wrong password with identical generic invalid_credentials error', () => {
    const result = validateCredentials(
      { username: 'admin', password: 'wrongpassword' },
      configured
    );
    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'invalid_credentials',
      message: 'Invalid credentials',
    });
  });

  it('rejects both wrong username and password with identical generic error', () => {
    const result = validateCredentials(
      { username: 'wronguser', password: 'wrongpassword' },
      configured
    );
    expect(result.success).toBe(false);
    expect(result.error).toEqual({
      code: 'invalid_credentials',
      message: 'Invalid credentials',
    });
  });

  it('rejects missing or empty credentials with identical generic error', () => {
    expect(validateCredentials({}, configured).success).toBe(false);
    expect(validateCredentials({ username: 'admin' }, configured).success).toBe(false);
    expect(validateCredentials({ password: 'supersecretpassword123' }, configured).success).toBe(false);
    expect(validateCredentials({ username: '', password: '' }, configured).success).toBe(false);
    expect(validateCredentials({ username: '   ', password: '   ' }, configured).success).toBe(false);
  });

  it('constantTimeEqual correctly compares strings of equal and unequal lengths, and handles unicode', () => {
    expect(constantTimeEqual('hello', 'hello')).toBe(true);
    expect(constantTimeEqual('hello', 'world')).toBe(false);
    expect(constantTimeEqual('hello', 'hell')).toBe(false);
    expect(constantTimeEqual('hell', 'hello')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
    expect(constantTimeEqual('', 'a')).toBe(false);
    expect(constantTimeEqual('contraseña123!', 'contraseña123!')).toBe(true);
    expect(constantTimeEqual('contraseña123!', 'contrasena123!')).toBe(false);
  });
});
