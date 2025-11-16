"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRolesExceptAdmin = exports.isValidRole = exports.VALID_ROLES = exports.ROLES = void 0;
exports.ROLES = {
    ADMIN: 'ADMIN',
    ORGANIZER: 'ORGANIZER',
    BOARD: 'BOARD',
    JUDGE: 'JUDGE',
    CONTESTANT: 'CONTESTANT',
    EMCEE: 'EMCEE',
    TALLY_MASTER: 'TALLY_MASTER',
    AUDITOR: 'AUDITOR'
};
exports.VALID_ROLES = Object.values(exports.ROLES);
const isValidRole = (role) => {
    return exports.VALID_ROLES.includes(role);
};
exports.isValidRole = isValidRole;
const getAllRolesExceptAdmin = () => {
    return exports.VALID_ROLES.filter(role => role !== exports.ROLES.ADMIN);
};
exports.getAllRolesExceptAdmin = getAllRolesExceptAdmin;
exports.default = exports.ROLES;
//# sourceMappingURL=roles.js.map