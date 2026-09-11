import { requestJson } from './http';
import type {
  InitialDestinationCodesResponse,
  StudyConfigurationValue,
} from './types';

export function getInitialDestinationCodes() {
  return requestJson<InitialDestinationCodesResponse>(
    '/config/initial-destination-codes',
    {
      withAuth: true,
    },
  );
}

export function updateInitialDestinationCodes(values: StudyConfigurationValue[]) {
  return requestJson<InitialDestinationCodesResponse>(
    '/config/initial-destination-codes',
    {
      method: 'PUT',
      body: { values },
      withAuth: true,
    },
  );
}
