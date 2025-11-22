// app/page.tsx

import { redirect } from "next/navigation";

export default function HomePage() {
  // For Beta, always send users to the main Dashboard.
  // The /dashboard route is responsible for handling auth
  // (showing login or the app as appropriate).
  redirect("/dashboard");
}
