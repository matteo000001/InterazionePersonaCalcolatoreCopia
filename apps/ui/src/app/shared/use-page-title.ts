import { useEffect } from 'react';

export function usePageTitle(section: string) {
  useEffect(() => {
    document.title = `${section} | Pianificatore appelli`;
  }, [section]);
}
