import { useEffect } from "react";

type PageSetter = (value: number | ((current: number) => number)) => void;

interface UseClampPageToTotalOptions {
  page: number;
  totalPages: number;
  setPage: PageSetter;
  disabled?: boolean;
}

export function useClampPageToTotal({
  page,
  totalPages,
  setPage,
  disabled = false,
}: UseClampPageToTotalOptions) {
  useEffect(() => {
    if (disabled) return;

    const safeTotalPages = Math.max(1, totalPages);
    if (page <= safeTotalPages) return;

    setPage((current) => (current > safeTotalPages ? safeTotalPages : current));
  }, [disabled, page, setPage, totalPages]);
}
