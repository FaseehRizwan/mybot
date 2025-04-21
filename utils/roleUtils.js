const { roles } = require("../config");
const fs = require('fs');
const path = require('path');

// Cache for user roles
const roleCache = new Map();

// Load role mappings from role.json
function loadRoleMappings() {
    try {
        const roleData = fs.readFileSync(path.join(__dirname, '../role.json'));
        return JSON.parse(roleData);
    } catch (err) {
        console.error('Error loading role.json:', err);
        return {};
    }
}

// Get a user's role with proper lookup
function getRole(userId) {
    try {
        // Check cache first
        if (roleCache.has(userId)) {
            return roleCache.get(userId);
        }

        // Normalize userId
        const normalizedId = userId.includes('@') ? userId : `${userId}@s.whatsapp.net`;

        // Load role mappings
        const roleMappings = loadRoleMappings();

        // Check for user-specific role
        if (roleMappings[normalizedId]) {
            const role = roleMappings[normalizedId];
            roleCache.set(userId, role);
            return role;
        }

        // Default to member role
        roleCache.set(userId, 'member');
        return 'member';
    } catch (error) {
        console.error('Error in getRole:', error);
        return 'member'; // Default to member role on error
    }
}

// Enhanced permission check with hierarchy
function hasPermission(userId, command) {
    try {
        const role = getRole(userId);
        console.log(`Checking permission for user ${userId} with role ${role} for command ${command}`);
        const roleData = roles[role];
        
        // Check if the user's role explicitly allows the command
        if (roleData?.allowedCommands?.includes(command)) {
            console.log(`Permission granted for ${userId} to use ${command}`);
            return true;
        }

        console.log(`Permission denied for ${userId} to use ${command}`);
        return false;
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
}

module.exports = { hasPermission, getRole };
