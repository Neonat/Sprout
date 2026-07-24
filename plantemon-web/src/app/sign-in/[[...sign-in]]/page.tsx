import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="screen flex items-center justify-center p-6">
      {/*
        fallbackRedirectUrl is what resolves the OAuth (sso-callback) hang: once
        the social sign-in completes, Clerk needs a destination or it parks on
        /sign-in/sso-callback. "fallback" means it still honours a ?redirect_url
        when one is present.
      */}
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/home" />
    </main>
  );
}
