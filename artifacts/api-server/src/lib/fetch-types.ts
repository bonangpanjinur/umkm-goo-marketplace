type JsonValue = unknown;

type FetchHeaders = {
  get(name: string): string | null;
};

export type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};

export type FetchResponse<TJson = JsonValue> = {
  ok: boolean;
  status: number;
  headers: FetchHeaders;
  text(): Promise<string>;
  json(): Promise<TJson>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

const rawFetch = fetch as unknown as <TJson = JsonValue>(
  url: string,
  init?: FetchInit,
) => Promise<FetchResponse<TJson>>;

export function httpFetch<TJson = JsonValue>(
  url: string,
  init?: FetchInit,
): Promise<FetchResponse<TJson>> {
  return rawFetch<TJson>(url, init);
}