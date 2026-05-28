import { APIRequestContext } from '@playwright/test';

export async function post<T>(ctx: APIRequestContext, path: string, data: unknown): Promise<T> {
  const res = await ctx.post(path, { data });
  if (!res.ok()) throw new Error(`POST ${path} → ${res.status()}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function get<T>(ctx: APIRequestContext, path: string): Promise<T> {
  const res = await ctx.get(path);
  if (!res.ok()) throw new Error(`GET ${path} → ${res.status()}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
