import { AuthExperience } from "./auth-experience";

/** Route boundary: no authentication provider or database is wired in this phase. */
export function AuthPage({ route }: { route: string }) {
  return <AuthExperience route={route} previewEnabled={process.env.NODE_ENV !== "production"} />;
}
