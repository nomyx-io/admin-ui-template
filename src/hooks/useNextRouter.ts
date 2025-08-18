import { useRouter } from 'next/router';
import { usePathname, useSearchParams } from 'next/navigation';

export function useNavigate() {
  const router = useRouter();
  return (path: string) => router.push(path);
}

export function useParams() {
  const router = useRouter();
  return router.query;
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  return {
    pathname,
    search: searchParams ? searchParams.toString() : '',
    state: null
  };
}

export { useRouter };