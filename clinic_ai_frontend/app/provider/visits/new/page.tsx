import { redirect } from 'next/navigation';

export default function ProviderNewVisitRedirectPage() {
  redirect('/en/provider/registered-patients');
}
