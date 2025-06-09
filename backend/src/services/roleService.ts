import { UserRole, dUser } from '../types/user';
import User from '../models/User';
import { ApiError } from '../utils/apiError';
import { SuperUserModel } from '../models/superUser';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { config } from '../config';

export class RoleService {
  async createUser(
    MicrosoftId: string,
    name: string,
    email: string,
    role: UserRole,
    tenantId?: string,
    teamId?: string,
    jobTitle?: string
  ): Promise<dUser> {
    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      throw new ApiError('Invalid role', 400);
    }

    const existingUser = await User.findOne({ MicrosoftId });
    if (existingUser) {
      throw new ApiError('User already exists', 400);
    }

    // Validate tenant ID for Super User
    if (role === UserRole.SUPER_USER && !tenantId) {
      throw new ApiError('Tenant ID is required for Super User role', 400);
    }

    const user = await User.create({
      MicrosoftId,
      name,
      email,
      role,
      tenantId,
      teamId,
      jobTitle
    });

    return user;
  }

  async updateUser(microsoftId: string, user: dUser): Promise<dUser> {
    const updatedUser = await User.findOneAndUpdate({ MicrosoftId: microsoftId }, user, { new: true });
    if (!updatedUser) {
      throw new ApiError('User not found', 404);
    }
    return updatedUser;
  }

  async getUser(MicrosoftId: string): Promise<dUser | null> {
    const user = await User.findOne({ MicrosoftId });
    if (!user) {
      return null;
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<dUser | null> {
    const user = await User.findOne({ email });
    if (!user) {
      return null;
    }
    return user;
  }

  async getAllUsersWithRole(role: UserRole): Promise<dUser[]> {
    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      throw new ApiError('Invalid role', 400);
    }

    return User.find({ role });
  }

  async getAllUsersWithTenantID(tenantId: string): Promise<dUser[]> {
    try {
      if (!tenantId) {
        throw new ApiError('Tenant ID is required', 400);
      }

      console.log(`Fetching users for tenant: ${tenantId}`);
      const users = await User.find({ tenantId });
      console.log(`Found ${users.length} users for tenant ${tenantId}`);
      return users;
    } catch (error) {
      console.error('Error in getAllUsersWithTenantID:', error);
      throw error;
    }
  }

  async getRoleByEmail(email: string): Promise<UserRole | null> {
    if(email===config.app_owner_email){
      return UserRole.APP_OWNER;
    }
    const superUser = await SuperUserModel.findOne({ email });
    if (superUser) {
      return UserRole.SUPER_USER;
    }
    const user = await User.findOne({ email });
    if (!user) {
      return null;
    } else {
      return UserRole.USER;
    }
  }

  async getTeamIdByEmail(email: string): Promise<ObjectId | null> {
    const user = await User.findOne({ email });
    if (!user) {
      return null;
    }
    return user.teamId as ObjectId | null;
  }

  async addUsersToTeam(teamId: string, userIds: string[]): Promise<void> {
    const Team = mongoose.model('Team');
    const team = await Team.findById(teamId);

    // Get the current owner's MicrosoftId
    const currentOwnerId = team?.owner;

    for (const userId of userIds) {
      // Add user to team
      await User.findOneAndUpdate(
        { MicrosoftId: userId }, 
        { $set: { teamId: teamId } }
      );

      // If this user was previously the owner but is being re-added,
      // make sure they don't retain owner status
      if (userId === currentOwnerId) {
        await this.setTeamOwner(teamId, null);
      }
    }
  }

  async removeUsersFromTeam(userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await User.findOneAndUpdate(
        { MicrosoftId: userId },
        { $set: { teamId: null } }
      );
    }
  }

  async removeUserFromTeam(teamId: string, userId: string): Promise<void> {
    // First, check if the user is the team owner
    const Team = mongoose.model('Team');
    const team = await Team.findById(teamId);
    
    // If the user being removed is the owner, remove owner status
    if (team?.owner === userId) {
      await this.setTeamOwner(teamId, null);
    }

    // Remove user from the team
    await User.findOneAndUpdate(
      { MicrosoftId: userId, teamId: teamId },
      { $set: { teamId: null } }
    );
  }

  // Set a user as the owner of a team
  async setTeamOwner(teamId: string, ownerId: string | null): Promise<void> {
    const Team = mongoose.model('Team');
    await Team.findByIdAndUpdate(
      teamId,
      { $set: { owner: ownerId } }
    );
  }
  
  // Check if a user is the owner of a team
  async isTeamOwner(teamId: string | null, userId: string): Promise<boolean> {
    const Team = mongoose.model('Team');
    if(teamId) {
      const team = await Team.findById(teamId);
      return team?.owner === userId;
    } else {
      return false;
    } 
  }
}

export const roleService = new RoleService(); 