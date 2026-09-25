import { NextRequest, NextResponse } from "next/server";

type NovaOption = { value: string; ref: string };

const apiUrl = process.env.NOVA_POSHTA_API_URL ?? "https://api.novaposhta.ua/v2.0/json/";

function option(value: unknown, ref: unknown): NovaOption | null {
  if (typeof value !== "string" || !value.trim() || typeof ref !== "string" || !ref.trim()) return null;
  return { value: value.trim(), ref: ref.trim() };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  if (!apiKey) return NextResponse.json({ configured: false, items: [] satisfies NovaOption[] }, { status: 503 });

  const type = request.nextUrl.searchParams.get("type");
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const cityRef = request.nextUrl.searchParams.get("cityRef")?.trim() ?? "";
  if (!["city", "branch", "street"].includes(type ?? "") || (type === "city" && query.length < 2) || (type === "street" && query.length < 2)) {
    return NextResponse.json({ configured: true, items: [] satisfies NovaOption[] });
  }
  if ((type === "branch" || type === "street") && !cityRef) {
    return NextResponse.json({ configured: true, items: [] satisfies NovaOption[] });
  }

  const requestBody = type === "city"
    ? { apiKey, modelName: "Address", calledMethod: "searchSettlements", methodProperties: { CityName: query, Limit: "10", Page: "1" } }
    : { apiKey, modelName: "Address", calledMethod: type === "branch" ? "getWarehouses" : "getStreet", methodProperties: { CityRef: cityRef, FindByString: query, Limit: "20", Page: "1", Language: "UA" } };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Nova Poshta responded ${response.status}`);
    const payload = await response.json() as { success?: boolean; data?: Array<Record<string, unknown>> };
    if (!payload.success) throw new Error("Nova Poshta rejected the request");

    const items = type === "city"
      ? (payload.data?.[0]?.Addresses as Array<Record<string, unknown>> | undefined)?.map((city) => option(city.Present ?? city.MainDescription, city.DeliveryCity ?? city.Ref)).filter((item): item is NovaOption => Boolean(item)) ?? []
      : (payload.data ?? []).map((item) => option(type === "branch" ? item.Description : item.Description, item.Ref)).filter((item): item is NovaOption => Boolean(item));
    return NextResponse.json({ configured: true, items });
  } catch {
    return NextResponse.json({ configured: true, items: [] satisfies NovaOption[] }, { status: 502 });
  }
}
