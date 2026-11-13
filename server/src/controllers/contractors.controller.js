import { makeCrud } from './crud.js';

const contractors = makeCrud({
  table: 'contractors',
  idColumn: 'contractor_id',
  label: 'Contractor',
  searchColumns: ['name', 'license_number'],
});

export const listContractors = contractors.list;
export const getContractor = contractors.get;
export const createContractor = contractors.create;
export const updateContractor = contractors.update;
export const deleteContractor = contractors.remove;
