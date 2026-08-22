import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }> | { slug: string };
};

/** Legacy /u/:slug → /:slug (hexacards.com/CardName45 style) */
export default async function LegacyPublicCardRedirect({ params }: Props) {
  const resolved = await Promise.resolve(params);
  redirect(`/${resolved.slug}`);
}
