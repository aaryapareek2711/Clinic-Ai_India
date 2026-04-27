import { redirect } from 'next/navigation';

type Props = { params: { locale: string } };

export default function ClinicIndexPage({ params }: Props) {
  redirect(`/${params.locale}/clinic/dashboard`);
}
