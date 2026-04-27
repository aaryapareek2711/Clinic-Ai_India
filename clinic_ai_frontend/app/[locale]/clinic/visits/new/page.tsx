import { redirect } from 'next/navigation';

export default function ClinicNewVisitRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/clinic/registered-patients`);
}
