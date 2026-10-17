import { notFound, redirect } from 'next/navigation';
import { getCurrentProfile } from '@/actions/auth';
import { getMyCompany } from '@/actions/companies';
import { CompanyProfileForm } from '@/components/companies/company-profile-form';

export default async function EmployerCompanyPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== 'EMPLOYER') redirect('/account');
  const company = await getMyCompany();
  if (!company) notFound();

  return (
    <main className="page-shell company-profile-page">
      <CompanyProfileForm initialCompany={company} />
    </main>
  );
}
