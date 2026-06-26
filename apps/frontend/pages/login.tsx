import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import AuthForm from "@/components/AuthForm";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin(values: Record<string, string>) {
    await login(values.email, values.password);
    router.push("/app");
  }

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to your ResumeMatch AI account"
      fields={[
        { name: "email",    label: "Email address", type: "email",    placeholder: "you@example.com" },
        { name: "password", label: "Password",       type: "password", placeholder: "••••••••" },
      ]}
      submitLabel="Sign in →"
      onSubmit={handleLogin}
      footer={
        <>Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300">Create one free</Link>
        </>
      }
    />
  );
}
