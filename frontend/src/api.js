import axios from 'axios';
import { API } from './constants';

axios.interceptors.request.use(cfg => {
  const t = localStorage.getItem('mb-token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export async function apiGet(path) { return (await axios.get(`${API}${path}`)).data; }
export async function apiPut(path, data) { return (await axios.put(`${API}${path}`, data)).data; }
export async function apiPost(path, data) { return (await axios.post(`${API}${path}`, data)).data; }
export async function apiDelete(path) { return axios.delete(`${API}${path}`); }
