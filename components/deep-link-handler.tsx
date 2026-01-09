'use client';

import { useDeepLinks } from '@/hooks/use-deep-links';

export function DeepLinkHandler() {
  useDeepLinks();
  return null;
}
