import { redirect } from 'next/navigation';

export default async function ClinicVisitRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/en/clinic/visits/${encodeURIComponent(id)}`);
}

