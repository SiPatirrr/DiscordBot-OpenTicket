const { STAFF_ROLE_NAME } = require('../config');

function getStaffRole(guild) {
  return guild.roles.cache.find(r => r.name.toLowerCase() === STAFF_ROLE_NAME);
}

function isStaff(member, guild) {
  const role = getStaffRole(guild);
  return role && member.roles.cache.has(role.id);
}

module.exports = { getStaffRole, isStaff };