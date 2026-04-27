import { redirect } from 'next/navigation';

export default function ProviderLegacyLandingRedirectPage() {
  redirect('/en/clinic/dashboard');
}
