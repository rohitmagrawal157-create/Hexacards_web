import { renderCardOgImage } from "@/lib/server/card-og-image";

export const runtime = "nodejs";
export const alt = "Digital business card profile";
export const size = { width: 1200, height: 1200 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ cardSlug: string }> };

export default async function CardTwitterImage({ params }: Props) {
  const { cardSlug } = await params;
  return renderCardOgImage(cardSlug);
}
