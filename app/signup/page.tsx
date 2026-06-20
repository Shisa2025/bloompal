"use client";

import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    alert(data.message);
  }

  return (
    <section className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-96"
      >
        <h1>Create Account</h1>

        <input
          type="text"
          placeholder="Name"
          className="login-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="login-button"
        >
          Create Account
        </button>
      </form>
    </section>
  );
}