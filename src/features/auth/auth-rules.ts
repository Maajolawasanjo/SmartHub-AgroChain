/** Public, side-effect-free validation. All security checks must be repeated server-side. */
export type PublicRole = "buyer" | "farmer";
export type FormErrors = Record<string, string>;

export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 254;
}

export function normalizeNigeriaPhone(value: string): string | null {
  const compact = value.replace(/[\s()\-]/g, "");
  const normalized = compact.startsWith("0") ? `+234${compact.slice(1)}` : compact.startsWith("234") ? `+${compact}` : compact;
  return /^\+234[789]\d{9}$/.test(normalized) ? normalized : null;
}

export function validPassword(value: string): boolean {
  // UX baseline only; final password policy must be approved and enforced by Supabase on the server.
  return value.length >= 8 && value.length <= 128;
}

export interface SignupData {
  role: PublicRole;
  fullName: string;
  farmName: string;
  state: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
}

export function validateSignup(data: SignupData): FormErrors {
  const errors: FormErrors = {};
  if (data.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (!validEmail(data.email)) errors.email = "Enter a valid email address.";
  if (!normalizeNigeriaPhone(data.phone)) errors.phone = "Use a Nigerian mobile number, e.g. 08012345678.";
  if (!validPassword(data.password)) errors.password = "Use at least 8 characters (maximum 128).";
  if (data.password !== data.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!data.agree) errors.agree = "Please read and accept the Terms and Privacy Notice.";
  if (data.role === "farmer") {
    if (!data.farmName.trim()) errors.farmName = "Enter your farm name.";
    if (!NIGERIA_STATES.some((s) => s === data.state)) errors.state = "Choose a valid Nigerian state or FCT.";
  }
  return errors;
}

export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const target = new URL(value, "https://smarthub.invalid");
    return target.origin === "https://smarthub.invalid" ? target.pathname + target.search + target.hash : null;
  } catch {
    return null;
  }
}
