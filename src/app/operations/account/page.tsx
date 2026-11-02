export const metadata = { robots: { index: false, follow: false } };
import { AuthPage } from "@/features/auth/components/auth-page";

export default function Page() {
  return <AuthPage route="/operations/account" />;
}
