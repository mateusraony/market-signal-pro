import { validatePassword } from '@/lib/passwordValidation';

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;

  const { score, label, color, errors } = validatePassword(password);
  const percentage = (score / 5) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      {errors.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {errors.map((e) => (
            <li key={e} className="flex items-center gap-1">
              <span className="text-destructive">✕</span> {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
