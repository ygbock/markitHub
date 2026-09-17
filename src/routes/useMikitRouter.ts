import { useState, useEffect, useCallback } from 'react';
import { 
  parseCanonicalRoute, 
  CanonicalRouteMatch, 
  CanonicalRouteDomain 
} from './canonicalRoutes';

export interface UseMikitRouterReturn {
  currentRoute: CanonicalRouteMatch;
  activeDomain: CanonicalRouteDomain;
  pathname: string;
  navigate: (toPath: string, replace?: boolean) => void;
  goBack: () => void;
}

export function useMikitRouter(initialPath?: string): UseMikitRouterReturn {
  const [pathname, setPathname] = useState<string>(() => {
    if (initialPath) return initialPath;
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search;
    }
    return '/';
  });

  const [currentRoute, setCurrentRoute] = useState<CanonicalRouteMatch>(() => {
    return parseCanonicalRoute(pathname);
  });

  const navigate = useCallback((toPath: string, replace: boolean = false) => {
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState(null, '', toPath);
      } else {
        window.history.pushState(null, '', toPath);
      }
    }
    setPathname(toPath);
    setCurrentRoute(parseCanonicalRoute(toPath));
  }, []);

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const current = window.location.pathname + window.location.search;
      setPathname(current);
      setCurrentRoute(parseCanonicalRoute(current));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    currentRoute,
    activeDomain: currentRoute.definition.domain,
    pathname,
    navigate,
    goBack,
  };
}
