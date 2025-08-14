// Router utility to bridge React Router and Next.js routing
import { useRouter as useNextRouter } from 'next/router';
import { useCallback } from 'react';

export const useNavigate = () => {
  const router = useNextRouter();
  
  return useCallback((path: string) => {
    if (typeof path === 'string') {
      router.push(path);
    } else if (typeof path === 'number') {
      // Handle navigate(-1) for going back
      router.back();
    }
  }, [router]);
};

export const useParams = () => {
  const router = useNextRouter();
  return router.query;
};

export const useLocation = () => {
  const router = useNextRouter();
  return {
    pathname: router.pathname,
    search: router.asPath.includes('?') ? router.asPath.substring(router.asPath.indexOf('?')) : '',
    state: router.query,
  };
};

// Export Next.js Link directly
export { default as Link } from 'next/link';