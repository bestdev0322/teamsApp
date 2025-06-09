import { License, LicenseStatus } from '../types';
import LicenseModel from '../models/license';
import { Types } from 'mongoose';

interface PopulatedLicense extends Omit<License, 'companyId'> {
  companyId: {
    _id: Types.ObjectId;
    name: string;
  };
}

export class LicenseService {
  private calculateStatus(license: { startDate?: string | null; endDate?: string | null }): LicenseStatus {
    const now = new Date();
    const startDate = license.startDate ? new Date(license.startDate) : null;
    const endDate = license.endDate ? new Date(license.endDate) : null;

    if (!startDate || !endDate) {
      return 'inactive';
    }

    if (now < startDate) {
      return 'pending';
    }

    if (now > endDate) {
      return 'expired';
    }

    return 'active';
  }

  private async updateStatus(license: License): Promise<License> {
    const status = this.calculateStatus(license);
    if (status !== license.status) {
      await LicenseModel.findByIdAndUpdate(license._id, { status });
      license.status = status;
    }
    return license;
  }

  async getAll(): Promise<PopulatedLicense[]> {
    const licenses = await LicenseModel.find()
      .populate('companyId', 'name')
      .lean();

    // Update status for each license
    const updatedLicenses = await Promise.all(
      licenses.map(async (license) => {
        const status = this.calculateStatus(license);
        if (status !== license.status) {
          await LicenseModel.findByIdAndUpdate(license._id, { status });
        }
        return {
          ...license,
          status,
          companyId: license.companyId as unknown as PopulatedLicense['companyId']
        };
      })
    );

    return updatedLicenses;
  }

  // Create blank license for a new company
  async createBlankLicense(companyId: string): Promise<License> {
    const license = new LicenseModel({
      companyId,
      licenseKey: '',
      startDate: null,
      endDate: null,
      status: 'inactive'
    });
    await license.save();
    const populatedLicense = await license.populate('companyId', 'name');
    return this.updateStatus(populatedLicense);
  }

  // Update license when company is updated
  async handleCompanyUpdate(companyId: string): Promise<License | null> {
    const license = await this.getByCompanyId(companyId);
    if (!license) {
      return this.createBlankLicense(companyId);
    }
    return license;
  }

  // Delete license when company is deleted
  async handleCompanyDelete(companyId: string): Promise<void> {
    await LicenseModel.findOneAndDelete({ companyId });
  }

  async getById(id: string): Promise<License | null> {
    const license = await LicenseModel.findById(id).populate('companyId', 'name');
    if (!license) return null;
    return this.updateStatus(license);
  }

  async getByCompanyId(companyId: string): Promise<License | null> {
    const license = await LicenseModel.findOne({ companyId }).populate('companyId', 'name');
    if (!license) return null;
    return this.updateStatus(license);
  }

  async update(id: string, data: Partial<Omit<License, '_id' | '__v' | 'companyId'>>): Promise<License | null> {
    const license = await LicenseModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    ).populate('companyId', 'name');
    
    if (!license) return null;
    return this.updateStatus(license);
  }

  // Update license by company ID
  async updateByCompanyId(companyId: string, data: Partial<Omit<License, '_id' | '__v' | 'companyId'>>): Promise<License | null> {
    const license = await LicenseModel.findOneAndUpdate(
      { companyId },
      { $set: data },
      { new: true }
    ).populate('companyId', 'name');
    
    if (!license) return null;
    return this.updateStatus(license);
  }
}

export const licenseService = new LicenseService(); 