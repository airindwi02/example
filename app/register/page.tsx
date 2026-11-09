import { Suspense } from "react";
import AuthForm from "../_auth/AuthForm";
export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
