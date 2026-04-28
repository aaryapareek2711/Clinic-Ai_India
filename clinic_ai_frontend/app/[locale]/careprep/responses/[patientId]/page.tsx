import { redirect } from 'next/navigation';

export default async function CarePrepPatientResponsesLegacyPage({
  params,
}: {
  params: Promise<{ locale: string; patientId: string }>;
}) {
  const { locale, patientId } = await params;
  redirect(`/${encodeURIComponent(locale)}/careprep/patient/${encodeURIComponent(patientId)}`);
}
