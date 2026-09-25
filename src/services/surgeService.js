/**
 * Surge pricing service — /api/v1/admin/surge/*
 */
import { apiClient } from './apiClient';

function unwrap(res) {
  return res?.data ?? res;
}

export const surgeService = {
  // Rules
  async listRules() { return unwrap(await apiClient.get('/admin/surge/rules')); },
  async updateRule(tier, body) { return unwrap(await apiClient.patch(`/admin/surge/rules/${tier}`, body)); },

  // Areas
  async listAreas() { return unwrap(await apiClient.get('/admin/surge/areas')); },
  async createArea(body) { return unwrap(await apiClient.post('/admin/surge/areas', body)); },
  async updateArea(id, body) { return unwrap(await apiClient.patch(`/admin/surge/areas/${id}`, body)); },
  async deactivateArea(id) { return unwrap(await apiClient.delete(`/admin/surge/areas/${id}`)); },

  // Classify
  async classify(lat, lng) { return unwrap(await apiClient.get('/admin/surge/areas/classify', { params: { lat, lng } })); },
};
