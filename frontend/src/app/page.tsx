"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from 'react-redux';
import { RootState } from "./store";

export default function HomeRedirect() {
  const router = useRouter();
  const access = useSelector((state: RootState) => state.auth.access);
  useEffect(() => {
    if (access) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router, access]);
  return null;
}
