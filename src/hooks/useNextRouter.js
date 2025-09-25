// Bridge hook for migrating from React Router to Next.js
import { useRouter } from 'next/router';
import { useCallback } from 'react';

export const useNavigate = () => {
  const router = useRouter();
  
  const navigate = useCallback((path) => {
    if (typeof path === 'string') {
      router.push(path);
    } else if (typeof path === 'number' && path === -1) {
      router.back();
    }
  }, [router]);
  
  return navigate;
};

export const useParams = () => {
  const router = useRouter();
  // Map Next.js route params to expected names
  const params = { ...router.query };

  // Map 'id' to 'identityId' for identity routes
  if (router.pathname.includes('/identities/[id]') && params.id) {
    params.identityId = params.id;
  }

  return params;
};

export const useLocation = () => {
  const router = useRouter();
  return {
    pathname: router.pathname,
    search: router.asPath.includes('?') ? router.asPath.substring(router.asPath.indexOf('?')) : '',
    state: router.query
  };
};

export default useNavigate;