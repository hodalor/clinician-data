import { requestJson } from './http';
import type { DeviceListResponse } from './types';

export function listDevices() {
  return requestJson<DeviceListResponse>('/devices', { withAuth: true });
}

export function deactivateDevice(id: string) {
  return requestJson(`/devices/${id}/deactivate`, {
    method: 'POST',
    withAuth: true,
  });
}

export function authoriseReplacement(payload: { user_id: string; device_id: string }) {
  return requestJson('/devices/authorise-replacement', {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}
