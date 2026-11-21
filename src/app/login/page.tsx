
import type { Metadata } from "next";
import AuthForm from "../_components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in | WorkFlow Pro",
  description: "Sign in to your WorkFlow Pro account.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
