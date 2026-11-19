// The seam pages import. Talks to the FastAPI backend by default; set VITE_USE_MOCK=true to
// use the in-browser mock instead (see dashboard/.env.example).
import * as historyHttp from './http/historyHttp.js';
import * as historyMock from './mock/historyMock.js';
import { USE_MOCK } from './config.js';

const implementation = USE_MOCK ? historyMock : historyHttp;

export const listHistory = (filters) => implementation.listHistory(filters);
export const getAnalysis = (id) => implementation.getAnalysis(id);
export const getDiet = (options) => implementation.getDiet(options);
