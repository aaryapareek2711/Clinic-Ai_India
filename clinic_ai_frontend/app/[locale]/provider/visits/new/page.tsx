import { redirect } from 'next/navigation';

export default function LegacyNewVisitRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/provider/registered-patients`);
}
