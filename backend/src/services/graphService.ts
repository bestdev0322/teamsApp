import axios from 'axios';
import * as msal from '@azure/msal-node';
import { ApiError } from '../utils/apiError';
import { config } from '../config';

interface GraphResponse {
  value: any[];
  '@odata.nextLink'?: string;
}

export class GraphService {
  private tokenCache: { [tenantId: string]: { token: string, expiresAt: number } } = {};

  private async getAppAccessToken(tenantId: string): Promise<string> {
    const cache = this.tokenCache[tenantId];
    const now = Math.floor(Date.now() / 1000);

    // If token exists and is not expired (with a 2 min buffer), use it
    if (cache && cache.token && cache.expiresAt - 120 > now) {
      return cache.token;
    }

    // Fetch new token
      const msal_config = new msal.ConfidentialClientApplication({
        auth: {
          clientId: config.azure.clientId!,
          clientSecret: config.azure.clientSecret!,
          authority: `https://login.microsoftonline.com/${tenantId}`
        }
      });

      const result = await msal_config.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default']
      });

      if (!result?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

    // Cache the token and its expiry
    this.tokenCache[tenantId] = {
      token: result.accessToken,
      expiresAt: result.expiresOn?.getTime
        ? Math.floor(result.expiresOn.getTime() / 1000)
        : now + 3500 // fallback: 1 hour minus buffer
    };

      return result.accessToken;
  }

  async getOrganizationUsers(tenantId: string, pageSize: number = 20, nextLink?: string, searchQuery?: string): Promise<GraphResponse> {
    try {
      if (!tenantId) {
        throw new ApiError('Tenant ID is required', 400);
      }

      console.log('Getting access token for tenant:', tenantId);
      const accessToken = await this.getAppAccessToken(tenantId);
      console.log(accessToken, 'accessToken');
      console.log('Successfully got access token');
      
      console.log('Fetching users from Graph API');
      try {
        let url = 'https://graph.microsoft.com/v1.0/users';
        let params: any = {
          '$select': 'id,displayName,mail,jobTitle,department,userPrincipalName',
          '$top': pageSize
        };
        if (nextLink) {
          url = decodeURIComponent(nextLink);
          params = undefined;
        } else if (searchQuery) {
          const safeQuery = searchQuery.replace(/'/g, "''");
          params['$filter'] = `startsWith(displayName,'${safeQuery}') or startsWith(mail,'${safeQuery}') or startsWith(userPrincipalName,'${safeQuery}')`;
        } else {
          params['$orderby'] = 'displayName';
        }

        // Build URL with parameters
        if (params) {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            searchParams.append(key, value as string);
          });
          url = `${url}?${searchParams.toString()}`;
        }

        console.log('Fetching users from Graph API:', url);
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ConsistencyLevel: 'eventual'
          }
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: { message?: string } };
          if (response.status === 403) {
            if (errorData.error?.message?.includes('terms of use')) {
              throw new ApiError(
                'Terms of Use acceptance required. Please contact your administrator to set up Terms of Use in Azure AD.',
                403
              );
            }
            throw new ApiError(
              'Insufficient permissions to access user data. Please ensure the application has User.Read.All and Directory.Read.All permissions.',
              403
            );
          }
          throw new Error(`Graph API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json() as GraphResponse;
        console.log('Successfully fetched users from Graph API');
        return {
          value: data.value,
          '@odata.nextLink': data['@odata.nextLink']
        };
      } catch (error: any) {
        if (error.response?.status === 403) {
          // Check if it's a terms of use issue
          if (error.response?.data?.error?.message?.includes('terms of use')) {
            throw new ApiError(
              'Terms of Use acceptance required. Please contact your administrator to set up Terms of Use in Azure AD.',
              403
            );
          }
          throw new ApiError(
            'Insufficient permissions to access user data. Please ensure the application has User.Read.All and Directory.Read.All permissions.',
            403
          );
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Error fetching organization users:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch organization users', 500);
    }
  }

  getConsentUrl(tenantId: string): string {
    // Include state parameter to handle the redirect back to the app
    const state = Buffer.from(JSON.stringify({
      tenantId,
      returnUrl: config.frontend
    })).toString('base64');

    const baseUrl = `https://login.microsoftonline.com/${tenantId}/adminconsent`;
    const params = new URLSearchParams({
      client_id: config.azure.clientId!,
      redirect_uri: process.env.REDIRECT_URI || 'http://localhost:3001/api/auth/consent-callback',
      state,
      scope: 'https://graph.microsoft.com/.default'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  async sendMail(tenantId: string, fromUserId: string, toEmail: string, subject: string, body: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new ApiError('Tenant ID is required', 400);
      }

      if (!fromUserId) {
        throw new ApiError('Sender user ID is required', 400);
      }

      console.log('Getting access token for tenant:', tenantId);
      const accessToken = await this.getAppAccessToken(tenantId);
      console.log('Successfully got access token');

      const message = {
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: body
          },
          toRecipients: [
            {
              emailAddress: {
                address: toEmail
              }
            }
          ]
        },
        saveToSentItems: true
      };

      try {
        await axios.post(
          `https://graph.microsoft.com/v1.0/users/${fromUserId}/sendMail`,
          message,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('Email sent successfully');
      } catch (error: any) {
        console.error('Graph API error:', error.response?.data);
        if (error.response?.status === 403) {
          throw new ApiError(
            'Insufficient permissions to send email. Please ensure the application has Mail.Send permissions.',
            403
          );
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to send email', 500);
    }
  }
}

export const graphService = new GraphService(); 
