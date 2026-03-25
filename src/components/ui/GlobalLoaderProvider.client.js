"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AppLoader from "@/components/ui/AppLoader.client";

const GlobalLoaderContext = createContext(null);

function RouteLoaderBridge({ show, hide }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstRenderRef = useRef(true);
  const routeTimerRef = useRef(null);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    show();

    clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(() => {
      hide();
    }, 350);

    return () => clearTimeout(routeTimerRef.current);
  }, [pathname, searchParams, show, hide]);

  return null;
}

export function GlobalLoaderProvider({ children }) {
  const [count, setCount] = useState(0);

  const show = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const hide = useCallback(() => {
    setCount((prev) => Math.max(0, prev - 1));
  }, []);

  const withLoader = useCallback(
    async (fn) => {
      show();
      try {
        return await fn();
      } finally {
        hide();
      }
    },
    [show, hide],
  );

  const value = useMemo(
    () => ({
      show,
      hide,
      withLoader,
      loading: count > 0,
    }),
    [show, hide, withLoader, count],
  );

  return (
    <GlobalLoaderContext.Provider value={value}>
      <Suspense fallback={null}>
        <RouteLoaderBridge show={show} hide={hide} />
      </Suspense>

      {children}
      <AppLoader visible={count > 0} />
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const ctx = useContext(GlobalLoaderContext);

  if (!ctx) {
    throw new Error(
      "useGlobalLoader must be used within a GlobalLoaderProvider",
    );
  }

  return ctx;
}
