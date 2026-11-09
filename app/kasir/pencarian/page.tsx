import { Suspense } from "react";
import { KasirSearchPage } from "../KasirClient";
export default function Page() {
  return (
    <Suspense>
      <KasirSearchPage />
    </Suspense>
  );
}
