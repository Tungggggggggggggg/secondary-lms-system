export type Pagination = { skip: number; take: number };

export function parsePagination(searchParams: URLSearchParams, opts?: { maxTake?: number; defaultTake?: number }): Pagination {
  const maxTake = opts?.maxTake ?? 50;
  const defaultTake = opts?.defaultTake ?? 20;
  let take = Number(searchParams.get("take") || defaultTake);
  if (!Number.isFinite(take) || take <= 0) take = defaultTake;
  take = Math.min(take, maxTake);

  let page = Number(searchParams.get("page") || 1);
  if (!Number.isFinite(page) || page <= 0) page = 1;
  const skip = (page - 1) * take;

  return { skip, take };
}


