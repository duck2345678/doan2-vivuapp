import { AuthGuard } from '@/features/auth';

export default function Index() {
  // Check auth state and redirect accordingly
  return <AuthGuard />;
}
