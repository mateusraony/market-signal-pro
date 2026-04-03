export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  errors: string[];
}

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Uma letra maiúscula');
  if (!/[a-z]/.test(password)) errors.push('Uma letra minúscula');
  if (!/[0-9]/.test(password)) errors.push('Um número');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Um caractere especial (!@#$...)');

  const score = 5 - errors.length;

  const labels: Record<number, { label: string; color: string }> = {
    0: { label: 'Muito fraca', color: 'bg-destructive' },
    1: { label: 'Fraca', color: 'bg-destructive' },
    2: { label: 'Razoável', color: 'bg-orange-500' },
    3: { label: 'Boa', color: 'bg-yellow-500' },
    4: { label: 'Forte', color: 'bg-green-500' },
    5: { label: 'Muito forte', color: 'bg-green-600' },
  };

  const info = labels[score] || labels[0];

  return { score, label: info.label, color: info.color, errors };
}
