// Simulated RBAC permissions
const rolePermissions = {
  ADMIN: ['EmployeeDetails', 'PayrollData', 'ProjectInfo'],
  EMPLOYEE: ['ProjectInfo'],
  MANAGER: ['ProjectInfo', 'EmployeeDetails'],
};

export function isAccessAllowed(role, table) {
  const allowedTables = rolePermissions[role.toUpperCase()] || [];
  return allowedTables.includes(table);
}
