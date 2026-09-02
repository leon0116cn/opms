import AppLayout from './components/AppLayout';
import AnnualPlanPage from './pages/AnnualPlanPage';
import SchemeTemplatePage from './pages/SchemeTemplatePage';
import OrganizationPage from './pages/OrganizationPage';
import PerformancePlanPage from './pages/PerformancePlanPage';
import { useState } from 'react';

const pages = {
  'annual-plan': AnnualPlanPage,
  'scheme-template': SchemeTemplatePage,
  'organization': OrganizationPage,
  'performance-plan': PerformancePlanPage,
};

export default function App() {
  const [route, setRoute] = useState<keyof typeof pages>('annual-plan');
  const Page = pages[route];

  return (
    <AppLayout route={route} onNavigate={setRoute}>
      <Page />
    </AppLayout>
  );
}
