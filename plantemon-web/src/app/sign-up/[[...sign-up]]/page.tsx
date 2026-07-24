import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="screen flex items-center justify-center p-6">
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/home" />
    </main>
  );
}
