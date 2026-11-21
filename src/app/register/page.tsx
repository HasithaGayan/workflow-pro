
import type { Metadata } from "next";
import AuthForm from "../_components/AuthForm";

export const metadata: Metadata = {
  title: "Create account | WorkFlow Pro",
  description: "Register a WorkFlow Pro account.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
