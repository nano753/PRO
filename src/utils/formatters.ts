/**
 * Helper formatting and validation utilities for CNPJ, CPF, Phone, and documents
 */

/**
 * Validates a Brazilian CNPJ using the official modulo 11 algorithm
 * and verification digits calculation.
 */
export function isValidCNPJ(value: string | null | undefined): boolean {
  if (!value) return false;

  const cnpj = value.replace(/\D/g, '');

  // Must have exactly 14 digits
  if (cnpj.length !== 14) {
    return false;
  }

  // Reject sequence of identical digits (e.g. 00000000000000, 11111111111111)
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  // Validate 1st verifying digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(cnpj.charAt(i), 10) * weights1[i];
  }
  const remainder1 = sum1 % 11;
  const expectedDigit1 = remainder1 < 2 ? 0 : 11 - remainder1;

  if (expectedDigit1 !== parseInt(cnpj.charAt(12), 10)) {
    return false;
  }

  // Validate 2nd verifying digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(cnpj.charAt(i), 10) * weights2[i];
  }
  const remainder2 = sum2 % 11;
  const expectedDigit2 = remainder2 < 2 ? 0 : 11 - remainder2;

  if (expectedDigit2 !== parseInt(cnpj.charAt(13), 10)) {
    return false;
  }

  return true;
}

/**
 * Validates a Brazilian CPF using the official modulo 11 algorithm.
 */
export function isValidCPF(value: string | null | undefined): boolean {
  if (!value) return false;

  const cpf = value.replace(/\D/g, '');

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  const remainder1 = (sum1 * 10) % 11;
  const digit1 = remainder1 === 10 || remainder1 === 11 ? 0 : remainder1;
  if (digit1 !== parseInt(cpf.charAt(9), 10)) return false;

  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  const remainder2 = (sum2 * 10) % 11;
  const digit2 = remainder2 === 10 || remainder2 === 11 ? 0 : remainder2;
  if (digit2 !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Validates whether the document is either a valid CNPJ (14 digits) or CPF (11 digits, for MEI / individual).
 */
export function isValidCNPJOrCPF(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 14) return isValidCNPJ(digits);
  if (digits.length === 11) return isValidCPF(digits);
  return false;
}

/**
 * Detailed validation feedback for CNPJ input fields
 */
export function validateCNPJ(value: string | null | undefined): {
  isValid: boolean;
  message: string;
} {
  if (!value || !value.trim()) {
    return { isValid: false, message: 'CNPJ é obrigatório' };
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length < 14) {
    return {
      isValid: false,
      message: `CNPJ incompleto (${digits.length}/14 dígitos)`,
    };
  }

  if (digits.length > 14) {
    return {
      isValid: false,
      message: 'CNPJ contém mais de 14 dígitos',
    };
  }

  if (/^(\d)\1{13}$/.test(digits)) {
    return {
      isValid: false,
      message: 'CNPJ inválido (dígitos repetidos)',
    };
  }

  if (!isValidCNPJ(digits)) {
    return {
      isValid: false,
      message: 'CNPJ inválido (dígitos verificadores incorretos)',
    };
  }

  return {
    isValid: true,
    message: 'CNPJ válido',
  };
}

/**
 * Progressive formatter for CNPJ (00.000.000/0000-00)
 */
export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Formats either a CPF (up to 11 digits) or CNPJ (12 to 14 digits)
 */
export function formatCNPJOrCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);

  if (digits.length <= 11) {
    // CPF formatting for up to 11 digits
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  // CNPJ formatting for 12 to 14 digits
  return formatCNPJ(digits);
}

/**
 * Progressive formatter for Brazilian phones (Landline or Mobile)
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    // (11) 4321-1234
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // (11) 98765-4321
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
