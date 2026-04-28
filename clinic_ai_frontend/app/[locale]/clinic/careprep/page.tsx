import { redirect } from 'next/navigation';

export default async function ClinicCarePrepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${encodeURIComponent(locale)}/careprep`);
}
