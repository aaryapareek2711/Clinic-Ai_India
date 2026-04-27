import { redirect } from 'next/navigation';

export default async function ClinicFixAppointmentRedirectPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  redirect(`/en/clinic/fix-appointment/${encodeURIComponent(visitId)}`);
}

