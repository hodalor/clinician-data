import { requestJson } from './http';
import type {
  DeletePayload,
  DeviceListResponse,
  DeviceRequestListResponse,
} from './types';

export function listDevices() {
  return requestJson<DeviceListResponse>('/devices', { withAuth: true });
}

export function deactivateDevice(id: string) {
  return requestJson(`/devices/${id}/deactivate`, {
    method: 'POST',
    withAuth: true,
  });
}

export function listDeviceRequests(status = 'pending') {
  const query = new URLSearchParams({ status }).toString();
  return requestJson<DeviceRequestListResponse>(`/devices/requests?${query}`, {
    withAuth: true,
  });
}

export function approveDeviceRequest(id: string) {
  return requestJson(`/devices/requests/${id}/approve`, {
    method: 'POST',
    withAuth: true,
  });
}

export function rejectDeviceRequest(id: string) {
  return requestJson(`/devices/requests/${id}/reject`, {
    method: 'POST',
    withAuth: true,
  });
}

export function deleteDevice(id: string, payload: DeletePayload) {
  return requestJson(`/devices/${id}/delete`, {
    method: 'POST',
    body: payload,
    withAuth: true,
  });
}
