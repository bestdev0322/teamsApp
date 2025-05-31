import express from 'express';
import { roleService } from '../services/roleService';
import { graphService } from '../services/graphService';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import type { AuthenticatedRequest } from '../middleware/roleAuth';
import { UserRole } from '../types/user';
import { ApiError } from '../utils/apiError';
import User from '../models/User';
import Team from '../models/Team';

const router = express.Router();

// Get all compliance champions in the tenant
router.get(
  '/champions',
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.tenantId) {
        throw new ApiError('User not authenticated or missing tenant ID', 401);
      }

      const champions = await User.find({
        tenantId: user.tenantId,
        isComplianceChampion: true,
        status: 'active'
      }).select('name email');

      res.json({
        status: 'success',
        data: champions
      });
    } catch (error) {
      next(error);
    }
  }
);


// Get user's role
router.get(
  '/:microsoftId',
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = await roleService.getUser(req.params.microsoftId);
      res.json({
        status: 'success',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create initial role assignment
router.post(
  '/create',
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { MicrosoftId, email, name, role, tenantId } = req.body;

      // Validate required fields
      if (!MicrosoftId || !email || !role) {
        throw new ApiError('Missing required fields', 400);
      }

      // Validate role value
      if (!Object.values(UserRole).includes(role)) {
        throw new ApiError('Invalid role value', 400);
      }

      const user = req.user;
      if (!user) {
        throw new ApiError('User not authenticated', 401);
      }

      const result = await roleService.createUser(
        MicrosoftId,
        name,
        email,
        role as UserRole,
        tenantId
      );

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user
router.put(
  '/status/:userId',
  authenticateToken,
  requireRole([UserRole.APP_OWNER, UserRole.SUPER_USER]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { userId } = req.params;
      const { microsoftId, name, email, role, tenantId } = req.body;

      // Validate userId
      if (!userId) {
        throw new ApiError('User ID is required', 400);
      }
      const result = await roleService.updateUser(microsoftId, { MicrosoftId: microsoftId, name, email, role, tenantId });
      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all users with specific role
router.get(
  '/:role',
  authenticateToken,
  requireRole([UserRole.APP_OWNER]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const roleParam = req.params.role;

      // Validate role parameter
      if (!roleParam || !Object.values(UserRole).includes(roleParam as UserRole)) {
        throw new ApiError('Invalid role', 400);
      }

      const users = await roleService.getAllUsersWithRole(roleParam as UserRole);
      res.json({
        status: 'success',
        data: users
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all users with specific tenantId
router.get(
  '/tenant/:tenantId',
  authenticateToken,
  requireRole([UserRole.APP_OWNER, UserRole.SUPER_USER, UserRole.USER]),  
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        throw new ApiError('Tenant ID is required', 400);
      }

      console.log(`Processing request for tenant: ${tenantId}`);
      const users = await roleService.getAllUsersWithTenantID(tenantId);
      
      res.json({
        status: 'success',
        data: users
      });
    } catch (error) {
      console.error('Error in /tenant/:tenantId endpoint:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      } else {
        next(error);
      }
    }
  }
);  

router.get(
  '/team/:teamId',
  authenticateToken,
  requireRole([UserRole.APP_OWNER, UserRole.SUPER_USER, UserRole.USER]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { teamId } = req.params;
      const users = await User.find({ teamId });
      res.json({
        status: 'success',
        data: users
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/is_team_owner/:userId', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
    try {
        const {userId} = req.params;
        if (!userId) {
            throw new ApiError('User not authenticated', 401);
        }
        // Find team where current user is the owner
        const team = await Team.findOne({ owner: userId });
        
        if (!team) {
            return res.json({
                status: 'success',
                data: {
                    isTeamOwner: false,
                    team: null
                }
            });
        }

        return res.json({
            status: 'success',
            data: {
                isTeamOwner: true,
                team: {
                    _id: team._id,
                    name: team.name
                }
            }
        });
    } catch (error) {
        return next(error);
    }
});

// Get all users in the organization using Graph API
router.get(
  '/organization/users',
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { pageSize, nextLink, searchQuery } = req.query;
      const user = req.user;
      if (!user?.tenantId) {
        throw new ApiError('User tenant ID not found', 400);
      }

      try {
        const result = await graphService.getOrganizationUsers(
          user?.tenantId,
          pageSize ? Number(pageSize) : 20,
          nextLink as string,
          searchQuery as string
        );
        res.json({
          status: 'success',
          data: result.value,
          nextLink: result['@odata.nextLink']
        });
      } catch (error: any) {
        if (error instanceof ApiError && error.statusCode === 403) {
          const consentUrl = graphService.getConsentUrl(user.tenantId);
          res.status(403).json({
            status: 'error',
            message: error.message,
            consentRequired: true,
            consentUrl
          });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error in /organization/users endpoint:', error);
      next(error);
    }
  }
);

// Bulk create or update users
router.post(
  '/bulk-create',
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { users } = req.body;
      const currentUser = req.user;

      if (!Array.isArray(users)) {
        throw new ApiError('Invalid users data', 400);
      }

      if (!currentUser?.tenantId) {
        throw new ApiError('Tenant ID not found', 400);
      }

      const results = await Promise.all(
        users.map(async (userData) => {
          try {
            // Check if user already exists
            const existingUser = await User.findOne({ MicrosoftId: userData.MicrosoftId });
            
            if (existingUser) {
              // Update existing user if needed
              if (!existingUser.tenantId || !existingUser.jobTitle) {
                existingUser.tenantId = userData.tenantId || currentUser.tenantId;
                existingUser.jobTitle = userData.jobTitle || existingUser.jobTitle;
                await existingUser.save();
              }
              return existingUser;
            } else {
              // Create new user with tenant ID and job title
              const newUser = await roleService.createUser(
                userData.MicrosoftId,
                userData.displayName,
                userData.email,
                UserRole.USER,
                userData.tenantId || currentUser.tenantId,
                undefined,
                userData.jobTitle
              );
              return newUser;
            }
          } catch (error) {
            console.error('Error processing user:', userData, error);
            return null;
          }
        })
      );

      const successfulResults = results.filter(result => result !== null);

      res.json({
        status: 'success',
        data: successfulResults
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 