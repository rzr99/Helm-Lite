// "Alex/blake" and "Blake / Alex" are the same client: compare the set of words.
export function clientKey(name: string) {
  return name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export type OpenSale = {
  id: string;
  client_name: string;
  deal_size: number;
  revenue_received: number;
  balance: number;
  service: string | null;
  service_category: string | null;
  payment_method: string | null;
  merchant_name: string | null;
  social_platform: string | null;
  conversation: string | null;
  date_closed: string;
  agent_name?: string | null;
};
