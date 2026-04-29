import { redirect } from 'next/navigation';

export default async function ClinicBookAppointmentRedirectPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  redirect(`/en/clinic/book-appointment/${encodeURIComponent(visitId)}`);
}
