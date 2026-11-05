import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiDealDraft = {
  title_lv: string; title_en: string; title_ru: string;
  description_lv: string; description_en: string; description_ru: string;
  discount_pct: number | null; price_original: number | null; price_sale: number | null;
};

const str = { type: "string" };
const num = { type: ["number", "null"] };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title_lv", "title_en", "title_ru", "description_lv", "description_en", "description_ru", "discount_pct", "price_original", "price_sale"],
  properties: {
    title_lv: str, title_en: str, title_ru: str,
    description_lv: str, description_en: str, description_ru: str,
    discount_pct: num, price_original: num, price_sale: num,
  },
};

const INSTRUCTIONS = `You write promotional deal listings for a Latvian discount platform from a photo of a product, flyer, menu or price tag.
Read any visible discount terms, prices, percentages and conditions. Produce:
- title_lv / title_en / title_ru: catchy title, max 70 chars, each strictly in its own language (Latvian, English, Russian). Never mix languages.
- description_lv / description_en / description_ru: 2-4 sentences describing the offer and its conditions, strictly in its own language.
- discount_pct: integer percent if visible or computable from prices, else null.
- price_original, price_sale: numbers in EUR if visible, else null.
Do not invent prices or conditions that are not visible.`;

export const generateDealFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageUrl: string }) => {
    if (!input?.imageUrl || !/^https:\/\//.test(input.imageUrl)) throw new Error("Invalid image");
    return input;
  })
  .handler(async ({ data }): Promise<{ draft: AiDealDraft | null; error: string | null }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { draft: null, error: "AI is not configured" };

    let imageData: string;
    try {
      const img = await fetch(data.imageUrl);
      if (!img.ok) throw new Error(String(img.status));
      const type = img.headers.get("content-type") || "image/jpeg";
      if (!type.startsWith("image/")) throw new Error("not image");
      const bytes = new Uint8Array(await img.arrayBuffer());
      if (bytes.length > 15 * 1024 * 1024) return { draft: null, error: "too_large" };
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      imageData = `data:${type};base64,${btoa(bin)}`;
    } catch (e) {
      console.error("AI deal image fetch failed", e);
      return { draft: null, error: "failed" };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: INSTRUCTIONS,
        input: [{ role: "user", content: [
          { type: "input_text", text: "Create the deal listing from this image." },
          { type: "input_image", image_url: imageData },
        ] }],
        text: { format: { type: "json_schema", name: "deal", strict: true, schema: SCHEMA } },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("AI deal generation failed", res.status, body.slice(0, 500));
      if (res.status === 429) return { draft: null, error: "rate_limited" };
      if (res.status === 402) return { draft: null, error: "no_credits" };
      return { draft: null, error: "failed" };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", refused = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta") refused = true;
          else if (ev.type === "error" || ev.type === "response.failed") {
            console.error("AI stream error", payload.slice(0, 500));
            return { draft: null, error: "failed" };
          }
        } catch { /* partial */ }
      }
    }
    if (refused || !text) return { draft: null, error: "failed" };
    try {
      return { draft: JSON.parse(text) as AiDealDraft, error: null };
    } catch {
      return { draft: null, error: "failed" };
    }
  });
