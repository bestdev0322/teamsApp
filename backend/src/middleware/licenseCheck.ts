import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { licenseService } from '../services/licenseService';
import { CompanyModel } from '../models/company';
import { UserRole } from '../types/user';
import { config } from '../config'

export const checkLicenseStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip for app owners or system routes
    if (req.user?.role === UserRole.APP_OWNER || req.user?.email === config.app_owner_email) {
      return next();
    }

    // Get the tenant ID from the authenticated user
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      console.log('No tenant ID found for user');
      res.status(403).json({ 
        error: 'License check failed: No tenant ID found',
        licenseError: true
      });
      return;
    }

    // Find the company by tenant ID
    const company = await CompanyModel.findOne({ tenantId });
    
    if (!company) {
      console.log(`No company found for tenant ID: ${tenantId}`);
      res.status(403).json({ 
        error: 'License check failed: Company not found',
        licenseError: true
      });
      return;
    }

    // Check the license status
    const license = await licenseService.getByCompanyId(company._id.toString());
    
    if (!license) {
      console.log(`No license found for company ID: ${company._id}`);
      res.status(403).json({ 
        error: 'License check failed: No license found',
        licenseError: true
      });
      return;
    }

    // Check if license is active
    if (license.status !== 'active') {
      console.log(`License not active for company ID: ${company._id}. Status: ${license.status}`);
      res.status(403).json({ 
        error: `License check failed: License is ${license.status}`,
        licenseError: true,
        licenseStatus: license.status
      });
      return;
    }

    // License is active, continue
    next();
  } catch (error) {
    console.error('Error checking license:', error);
    res.status(500).json({ 
      error: 'License check failed: Internal server error',
      licenseError: true
    });
  }
}; 