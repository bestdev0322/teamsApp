import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserProfile } from '../types';
import { roleService } from './roleService';
import { dUser, UserRole } from '../types/user';
import { tokenPayload } from '../types';

export class AuthService {
  async getLoginUrl(state?: string): Promise<string> {
    const authUrl = `https://login.microsoftonline.com/${config.azure.tenantId}/oauth2/v2.0/authorize`;
    const params = new URLSearchParams({
      client_id: config.azure.clientId!,
      response_type: 'code',
      redirect_uri: config.azure.redirectUri,
      scope: 'openid profile email User.Read Organization.Read.All Mail.Send Mail.Read Mail.ReadBasic Mail.ReadWrite',
      response_mode: 'query',
      prompt: 'consent',
      ...(state && { state })
    });

    return `${authUrl}?${params.toString()}`;
  }

  async handleCallback(code: string, redirectUri: string): Promise<{ token: string; user: UserProfile }> {
    try {
      // Get the full token directly using the tenant ID from the code
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/organizations/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: config.azure.clientId!,
          scope: 'openid profile email User.Read',
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          client_secret: config.azure.clientSecret!
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (!tokenResponse.data.access_token) {
        console.error('No access token received:', tokenResponse.data);
        throw new Error('No access token received from token exchange');
      }

      console.log('Token exchange successful');
      const accessToken = tokenResponse.data.access_token;
      
      // Decode the token to get the tenant ID
      const decodedToken = jwt.decode(accessToken) as any;
      const tenantId = decodedToken?.tid;
      console.log('Tenant ID from token:', tenantId);

      if (!tenantId) {
        console.error('No tenant ID found in token');
        throw new Error('No tenant ID found in token');
      }

      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      console.log('User data retrieved from Graph API');
      const userData = userResponse.data;
      const userProfile: UserProfile = {
        id: userData.id,
        email: userData.mail || userData.userPrincipalName,
        displayName: userData.displayName,
        jobTitle: userData.jobTitle || '',
        department: userData.department || '',
        organization: userData.companyName || '',
        role: UserRole.USER,
        status: 'active',
        tenantId: tenantId,
        organizationName: userData.companyName || '',
        isDevMember: false,
        isPerformanceCalibrationMember: false,
        isTeamOwner: false,
        isComplianceSuperUser: false,
        isComplianceChampion: false,
        isRiskSuperUser: false,
        isRiskChampion: false,
      };

      if (userProfile) {
        const user = await roleService.getUser(userProfile.id);
        const role = await roleService.getRoleByEmail(userProfile.email);
        userProfile.role = role || UserRole.USER;
        if (!user) {
          await roleService.createUser(
            userProfile.id,
            userProfile.displayName,
            userProfile.email,
            role || UserRole.USER,
            userProfile.tenantId,
            undefined,
            userProfile.jobTitle
          );
        } else {
          await roleService.updateUser(
            userProfile.id,
            {
              MicrosoftId: userProfile.id,
              name: userProfile.displayName,
              email: userProfile.email,
              role: role || UserRole.USER,
              tenantId: userProfile.tenantId,
              jobTitle: userProfile.jobTitle
            }
          );
        }
      }
      
      // Get the latest user data from database
      const dbUser = await roleService.getUser(userProfile.id);
      if (!dbUser) {
        throw new Error('Failed to create or retrieve user from database');
      }

      // Create token using database user data
      const UserProfile: UserProfile = {
        _id: dbUser._id,
        id: dbUser.MicrosoftId,
        email: dbUser.email,
        displayName: dbUser.name,
        jobTitle: dbUser.jobTitle || '',
        department: '',
        organization: '',
        role: dbUser.role,
        status: 'active',
        tenantId: dbUser.tenantId || '',
        organizationName: '',
        isDevMember: !!dbUser.isDevMember,
        isPerformanceCalibrationMember: !!dbUser.isPerformanceCalibrationMember,
        isTeamOwner: await roleService.isTeamOwner(dbUser.teamId?.toString() || '', dbUser.MicrosoftId),
        teamId: dbUser?.teamId?.toString(),
        isComplianceSuperUser: !!dbUser.isComplianceSuperUser,
        isComplianceChampion: !!dbUser.isComplianceChampion,
        isRiskSuperUser: !!dbUser.isRiskSuperUser,
        isRiskChampion: !!dbUser.isRiskChampion
      };

      const token = await this.createAppToken({id: dbUser.MicrosoftId, email: dbUser.email, name: dbUser.name});

      return { token, user: UserProfile };
    } catch (error: any) {
      console.error('Authentication error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  // verifyToken(token: string): UserProfile | null {
  async verifyToken(token: string): Promise<Promise<dUser | null> | null> {
    try {
      // Verify the JWT token using the secret
      const decoded = jwt.verify(token, config.jwtSecret) as tokenPayload;
      
      // Ensure the token has the necessary fields
      if (!decoded.id || !decoded.email) {
        console.error('Token missing required fields:', decoded);
        return null;
      }
      
      const dbUser = await roleService.getUser(decoded.id);
      // Check if token has expired - not needed as jwt.verify already checks this
      // but we could add custom expiration logic here if needed

      // return decoded;
      return dbUser;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  async getProfile(token: string): Promise<UserProfile> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as tokenPayload;
      
      // Get the user from database to ensure we have the latest data
      const dbUser = await roleService.getUser(decoded.id);
      if (!dbUser) {
        throw new Error('User not found in database');
      }

      // Create a complete user profile with all necessary fields
      const userProfile: UserProfile = {
        _id: dbUser._id?.toString() || '',
        id: dbUser.MicrosoftId,
        email: dbUser.email,
        displayName: dbUser.name,
        jobTitle: dbUser.jobTitle || '',
        department: '',
        organization: '',
        role: dbUser.role,
        status: 'active',
        tenantId: dbUser.tenantId || '',
        organizationName: '',
        isDevMember: !!dbUser.isDevMember,
        isPerformanceCalibrationMember: !!dbUser.isPerformanceCalibrationMember,
        isTeamOwner: await roleService.isTeamOwner(dbUser.teamId?.toString() || '', dbUser.MicrosoftId),
        teamId: dbUser?.teamId?.toString(),
        isComplianceSuperUser: !!dbUser.isComplianceSuperUser,
        isComplianceChampion: !!dbUser.isComplianceChampion,
        isRiskSuperUser: !!dbUser.isRiskSuperUser,
        isRiskChampion: !!dbUser.isRiskChampion
      };

      return userProfile;
    } catch (error) {
      console.error('Profile error:', error);
      throw new Error('Invalid token');
    }
  }

  async logout(token: string): Promise<void> {
    try {
      jwt.verify(token, config.jwtSecret);
      // You could implement token blacklisting here if needed
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async getTeamsConsentUrl(tenantId: string, redirectUri: string, state?: string): Promise<string> {
    const authUrl = `https://login.microsoftonline.com/${tenantId}/adminconsent`;
    const params = new URLSearchParams({
      client_id: config.azure.clientId!,
      redirect_uri: redirectUri,
      ...(state && { state })
    });

    return `${authUrl}?${params.toString()}`;
  }

  async verifyTeamsToken(token: string): Promise<UserProfile | null> {
    try {
      console.log('Starting Teams token verification...');
      
      // Decode the Teams token to get the tenant ID
      const decodedToken = jwt.decode(token) as any;
      if (!decodedToken?.tid) {
        console.error('No tenant ID found in Teams token');
        return null;
      }
      const tenantId = decodedToken.tid;
      console.log('Tenant ID from Teams token:', tenantId);
      
      // First, exchange the Teams token for a Graph API token
      try {
        const tokenResponse = await axios.post(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          new URLSearchParams({
            client_id: config.azure.clientId!,
            client_secret: config.azure.clientSecret!,
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: token,
            scope: 'https://graph.microsoft.com/.default',
            requested_token_use: 'on_behalf_of'
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        if (!tokenResponse.data.access_token) {
          console.error('No access token received from token exchange');
          return null;
        }

        const graphToken = tokenResponse.data.access_token;
        console.log('Graph token received successfully');

        // Now use the Graph token to get user profile
        const graphRes = await axios.get('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,jobTitle,department,companyName', {
          headers: {
            Authorization: `Bearer ${graphToken}`
          }
        });

        if (!graphRes.data) {
          console.error('No user data received from Graph API');
          return null;
        }

        const userData = graphRes.data;
        console.log('User data from Graph:', userData);

        // Create a complete user profile
        const userProfile: UserProfile = {
          id: userData.id,
          email: userData.mail || userData.userPrincipalName,
          displayName: userData.displayName,
          jobTitle: userData.jobTitle || '',
          department: userData.department || '',
          organization: userData.companyName || '',
          role: UserRole.USER,
          status: 'active',
          tenantId: tenantId, // Use the tenant ID from the Teams token
          organizationName: userData.companyName || '',
          isDevMember: false,
          isPerformanceCalibrationMember: false,
          isTeamOwner: false,
          isComplianceSuperUser: false,
          isComplianceChampion: false,
          isRiskSuperUser: false,
          isRiskChampion: false
        };

        if (!userProfile.id || !userProfile.email) {
          console.error('Invalid user profile: missing required fields', userProfile);
          return null;
        }

        // Save or update user in database
        const user = await roleService.getUser(userProfile.id);
        const role = await roleService.getRoleByEmail(userProfile.email);
        userProfile.role = role || UserRole.USER;
        
        if (!user) {
          const newUser = await roleService.createUser(
            userProfile.id,
            userProfile.email,
            userProfile.displayName,
            role || UserRole.USER,
            userProfile.tenantId,
            undefined,
            userProfile.jobTitle
          );
          userProfile._id = newUser._id;
        } else {
          await roleService.updateUser(
            userProfile.id,
            {
              MicrosoftId: userProfile.id,
              name: userProfile.displayName,
              email: userProfile.email,
              role: role || UserRole.USER,
              tenantId: userProfile.tenantId,
              jobTitle: userProfile.jobTitle
            }
          );
          userProfile._id = user._id;
        }

        // Get the latest user data to ensure we have all fields
        const dbUser = await roleService.getUser(userProfile.id);
        if (!dbUser) {
          throw new Error('Failed to retrieve updated user data');
        }

        // Update the user profile with complete data
        userProfile._id = dbUser._id;
        userProfile.isDevMember = !!dbUser.isDevMember;
        userProfile.isPerformanceCalibrationMember = !!dbUser.isPerformanceCalibrationMember;
        userProfile.isTeamOwner = await roleService.isTeamOwner(dbUser.teamId?.toString() || '', dbUser.MicrosoftId);
        userProfile.teamId = dbUser.teamId?.toString();

        console.log('Created user profile:', userProfile);
        return userProfile;
      } catch (tokenError: any) {
        // Check for consent_required error
        if (tokenError.response?.data?.error === 'invalid_grant' && 
            (tokenError.response?.data?.suberror === 'consent_required' || 
             tokenError.response?.data?.error_description?.includes('consent'))) {
          console.log('Consent required for the application');
          // Store the tenant ID in the error for the route handler to use
          const error: any = new Error('Consent required');
          error.consentRequired = true;
          error.tenantId = tenantId;
          throw error;
        }
        // Re-throw for other errors
        throw tokenError;
      }
    } catch (error: any) {
      console.error('Error verifying Teams token:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      // Pass through the consent error
      if (error.consentRequired) {
        throw error;
      }
      
      return null;
    }
  }

  async createAppToken(tokenPayload: tokenPayload): Promise<string> {
    if (!tokenPayload.id || !tokenPayload.email) {
      throw new Error('Invalid user profile: missing required fields');
    }

    return jwt.sign(
      tokenPayload,
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  }
}

export const authService = new AuthService(); 
