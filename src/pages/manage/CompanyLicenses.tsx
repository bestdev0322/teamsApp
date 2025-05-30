import React, { useState, useEffect } from 'react';
import { SearchRegular } from '@fluentui/react-icons';
import { Table, type Column } from '../../components/Table';
import { StatusBadge } from '../../components/StatusBadge';
import { createSearchFilter } from '../../utils/search';
import { License, Company, LicenseStatus } from '../../types';
import { licenseAPI, companyAPI } from '../../services/api';
import { EditLicenseModal } from '../../components/Modal/EditLicenseModal';
import { DeleteModal } from '../../components/Modal/DeleteModal';

interface CompanyRef {
  _id: string;
  name: string;
}

interface LicenseWithCompany extends Omit<License, 'companyId'> {
  company?: Company;
  companyId: string | CompanyRef;
}

const SEARCH_FIELDS: (keyof LicenseWithCompany)[] = ['company', 'licenseKey', 'status'];

const CompanyLicenses: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [licenses, setLicenses] = useState<LicenseWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithCompany | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [licensesResponse, companiesResponse] = await Promise.all([
          licenseAPI.getAll(),
          companyAPI.getAll()
        ]);

        const companiesData = companiesResponse.data.data;
        setCompanies(companiesData);
        
        const licensesWithCompanies = licensesResponse.data.data.map(license => ({
          ...license,
          company: companiesData.find(company => 
            company._id === (typeof license.companyId === 'object' ? (license.companyId as CompanyRef)._id : license.companyId)
          )
        }));

        setLicenses(licensesWithCompanies as LicenseWithCompany[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load licenses. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (license: LicenseWithCompany) => {
    setSelectedLicense(license);
    setIsModalOpen(true);
  };

  const handleDelete = (license: LicenseWithCompany) => {
    setSelectedLicense(license);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedLicense?._id) return;

    try {
      setError(null);
      await licenseAPI.delete(selectedLicense._id);
      setLicenses(licenses.filter(license => license._id !== selectedLicense._id));
      setIsDeleteModalOpen(false);
      setSelectedLicense(null);
    } catch (error) {
      console.error('Error deleting license:', error);
      setError('Failed to delete license. Please try again later.');
    }
  };

  const handleSubmit = async (licenseData: Partial<Omit<License, '_id' | '__v' | 'status'>>) => {
    if (!selectedLicense?._id) return;

    try {
      setError(null);
      const response = await licenseAPI.update(selectedLicense._id, licenseData);
      
      setLicenses(licenses.map(license => 
        license._id === selectedLicense._id 
          ? { ...response.data.data, company: license.company } 
          : license
      ));
      
      setIsModalOpen(false);
      setSelectedLicense(null);
    } catch (error) {
      console.error('Error updating license:', error);
      setError('Failed to update license. Please try again later.');
    }
  };

  const columns: Column<LicenseWithCompany>[] = [
    {
      key: 'company',
      header: 'Company',
      sortable: true,
      width: 'w-[25%]',
      render: (license) => {
        if (license.company?.name) return license.company.name;
        if (typeof license.companyId === 'string') return license.companyId;
        if (typeof license.companyId === 'object' && license.companyId !== null) {
          return (license.companyId as any).name || '-';
        }
        return '-';
      }
    },
    {
      key: 'licenseKey',
      header: 'License Key',
      sortable: true,
      width: 'w-[25%]',
      render: (license) => license.licenseKey || '-'
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      width: 'w-[15%]',
      render: (license) => license.startDate ? new Date(license.startDate).toLocaleDateString() : '-'
    },
    {
      key: 'endDate',
      header: 'End Date',
      sortable: true,
      width: 'w-[15%]',
      render: (license) => license.endDate ? new Date(license.endDate).toLocaleDateString() : '-'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: 'w-[20%]',
      render: (license) => <StatusBadge status={license.status} />
    }
  ];

  const filteredLicenses = licenses.filter(createSearchFilter(searchQuery, SEARCH_FIELDS));

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
        <div className="relative w-64">
          <SearchRegular className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search licenses..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Table 
        columns={columns} 
        data={filteredLicenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {selectedLicense && (
        <>
          <EditLicenseModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedLicense(null);
            }}
            onSubmit={handleSubmit}
            license={{
              ...selectedLicense,
              companyId: typeof selectedLicense.companyId === 'object' ? selectedLicense.companyId._id : selectedLicense.companyId
            } as License}
            selectedCompany={selectedLicense.company || companies.find(c => c._id === (typeof selectedLicense.companyId === 'object' ? selectedLicense.companyId._id : selectedLicense.companyId)) as Company}
            companies={companies}
          />

          <DeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedLicense(null);
            }}
            onConfirm={handleConfirmDelete}
            title="Delete License"
            itemName={`license for ${selectedLicense.company?.name || 'Unknown Company'}`}
          />
        </>
      )}
    </div>
  );
};

export default CompanyLicenses; 