import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { UserProfile } from '../types/index';
import { roleService } from '../services/roleService';
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided in request');
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  
  const user = await authService.verifyToken(token);
  if (!user) {
    console.log('Token verification failed');
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  const duser = {
    _id: user._id,
    id: user.MicrosoftId,
    email: user.email,
    displayName: user.name,
    role: user.role,
    tenantId: user.tenantId,
    jobTitle: user?.jobTitle,
    teamId: user?.teamId,
    isDevMember: user?.isDevMember,
    isPerformanceCalibrationMember: user?.isPerformanceCalibrationMember,
    isTeamOwner: await roleService.isTeamOwner(user?.teamId?.toString() || null, user.MicrosoftId),
    isComplianceSuperUser: user?.isComplianceSuperUser,
    isComplianceChampion: user?.isComplianceChampion,
    isRiskSuperUser: user?.isRiskSuperUser,
    isRiskChampion: user?.isRiskChampion,
    status: user.status || 'inactive'
  }
  req.user = duser as UserProfile;
  next();
}; 
