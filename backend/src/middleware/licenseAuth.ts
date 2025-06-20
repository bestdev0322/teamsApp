import { Request, Response, NextFunction } from 'express';
import { licenseService } from '../services/licenseService';
import { CompanyModel } from '../models/company';

export const checkLicenseAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const tenantId = req.headers['tenant-id'] as string;
        const licenseKeyFromHeader = req.headers['license-key'] as string;

        if (!tenantId) {
            res.status(403).json({
                error: 'Tenant ID missing in request header',
                licenseError: true
            });
            return;
        }

        if (!licenseKeyFromHeader) {
            res.status(403).json({
                error: 'License key missing in request header',
                licenseError: true
            });
            return;
        }

        const company = await CompanyModel.findOne({ tenantId });
        if (!company) {
            res.status(403).json({
                error: 'License check failed: Company not found',
                licenseError: true
            });
            return;
        }

        const license = await licenseService.getByCompanyId(company._id.toString());
        if (!license) {
            res.status(403).json({
                error: 'License check failed: No license found',
                licenseError: true
            });
            return;
        }

        if (license.licenseKey !== licenseKeyFromHeader) {
            res.status(403).json({
                error: 'Invalid license key',
                licenseError: true
            });
            return;
        }

        // License is valid, continue
        next();
    } catch (error) {
        console.error('Error checking license from customer api call:', error);
        res.status(500).json({
            error: 'License check failed, please check your license'
        });
    }
}; 