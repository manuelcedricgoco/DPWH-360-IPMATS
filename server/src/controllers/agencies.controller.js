import { makeCrud } from './crud.js';

const agencies = makeCrud({
  table: 'implementing_agencies',
  idColumn: 'agency_id',
  label: 'Agency',
  searchColumns: ['name', 'acronym'],
});

export const listAgencies = agencies.list;
export const getAgency = agencies.get;
export const createAgency = agencies.create;
export const updateAgency = agencies.update;
export const deleteAgency = agencies.remove;
