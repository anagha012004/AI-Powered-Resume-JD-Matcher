import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import AuthForm from "@/components/AuthForm";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();

  async function handleRegister(values: Record<string, string>) {
    await register(values.name, values.email, values.password);
    router.push("/app");
  }

  return (
    <AuthForm
      title="Create your account"
      subtitle="Start matching resumes to jobs in seconds — free forever"
      fields={[
        { name: "name",     label: "Full name",     type: "text",     placeholder: "Jane Doe" },
        { name: "email",    label: "Email address", type: "email",    placeholder: "you@example.com" },
        { name: "password", label: "Password",       type: "password", placeholder: "Min. 8 characters" },
      ]}
      submitLabel="Create account →"
      onSubmit={handleRegister}
      footer={
        <>Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
        </>
      }
    />
  );
}
