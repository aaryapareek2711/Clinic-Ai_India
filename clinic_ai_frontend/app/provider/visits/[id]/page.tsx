import { redirect } from 'next/navigation';

type ProviderVisitRedirectPageProps = {
  params: {
    id: string;
  };
};

export default function ProviderVisitRedirectPage({ params }: ProviderVisitRedirectPageProps) {
  redirect(`/en/provider/visits/${params.id}`);
}
