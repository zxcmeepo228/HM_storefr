import { apiClient } from "./client";

export type Product = {
  id: string | number;
  name: string;
  price?: number;
};

/** Очікує GET {NEXT_PUBLIC_API_URL}/products -> Product[] */
export async function getProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>("/products");
  return data;
}
