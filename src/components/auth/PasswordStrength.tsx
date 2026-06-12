/**
 * Lightweight zero-dep password strength meter. Heuristic — not a substitute
 * for server-side checks like Have-I-Been-Pwned (enable via Lovable Cloud
 * Auth settings). Used by Reset Password and Profile → Security flows.
 */
export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function scorePassword(password: string): StrengthResult {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return { score: clamped, label: labels[clamped] };
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = scorePassword(password);
  const colors = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];
  return (
    <div className="space-y-1.5 pt-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? colors[score] : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Strength: <span className="font-medium">{label}</span></p>
    </div>
  );
}
