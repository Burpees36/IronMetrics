import React from "react";
import { useLocation } from "wouter";

export function Login() {
  const [, setLocation] = useLocation();
  React.useEffect(() => setLocation("/sign-in"), [setLocation]);
  return null;
}
