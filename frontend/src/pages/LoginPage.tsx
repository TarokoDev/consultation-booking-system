import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

export function LoginPage() {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true)

    try {
      const user = await login(email, password);

      if (user && user.role) {
        navigate("/" + user.role);
      } else {
        setError("Login succeeeded, but no role was found for this account.") //TODO should i rewrite this more generic error to not let hacker have any idea?
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200">
      <form onSubmit={handleSubmit} className="card w-96 bg-base-100 shadow-xl p-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold">RapidDr Login</h1>
        {
          error && (
            <div className="alert alert-error">
              {error}
            </div>
          )
        }

        <label className="form-control">
          <span className="label-text">Email</span>
          <input type="email" onChange={handleEmail} className="input input-bordered"/>
        </label>

        <label className="form-control">
          <span className="label-text">Password</span>
          <input type="password" onChange={handlePassword} className="input input-bordered"/>
        </label>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}