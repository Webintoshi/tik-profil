import { useEffect, useMemo, useState } from "react";

type AsyncStatus = "idle" | "loading" | "success" | "error";

interface AsyncResourceOptions<T> {
  enabled?: boolean;
  initialData: T;
  deps: unknown[];
  load: () => Promise<T>;
}

export function useAsyncResource<T>({
  enabled = true,
  initialData,
  deps,
  load,
}: AsyncResourceOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>(enabled ? "loading" : "idle");
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setError(null);
      setData(initialData);
      return;
    }

    let isActive = true;

    setStatus("loading");
    setError(null);

    load()
      .then((value) => {
        if (!isActive) {
          return;
        }

        setData(value);
        setStatus("success");
      })
      .catch((reason: unknown) => {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setError(reason instanceof Error ? reason.message : "Bir hata oluştu.");
      });

    return () => {
      isActive = false;
    };
  }, [enabled, reloadNonce, ...deps]);

  return useMemo(
    () => ({
      data,
      error,
      isIdle: status === "idle",
      isLoading: status === "loading",
      isSuccess: status === "success",
      isError: status === "error",
      reload: () => {
        setReloadNonce((value) => value + 1);
      },
    }),
    [data, error, status],
  );
}
