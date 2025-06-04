import express, { Request, Response } from 'express';
import { authService } from '../services/authService';
import { roleService } from '../services/roleService';
import { UserRole } from '../types/user';
import { UserProfile } from '../types';

const router = express.Router();

router.get('/login', async (_req: Request, res: Response) => {
  try {
    const loginUrl = await authService.getLoginUrl();
    return res.json({ url: loginUrl });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to generate login URL' });
  }
});

router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, token, redirect_uri } = req.body;
    console.log(token, 'token');

    // Handle Teams SSO token
    if (token) {
      console.log('Processing Teams SSO token...');
      try {
        const userProfile = await authService.verifyTeamsToken(token);

        if (!userProfile) {
          console.error('Teams token verification failed');
          return res.status(401).json({ error: 'Invalid Teams token' });
        } else {
          const user = await roleService.getUser(userProfile.id);
          const role = await roleService.getRoleByEmail(userProfile.email);
          userProfile.role = role || UserRole.USER;
          if (!user) {
            await roleService.createUser(userProfile.id, userProfile.email, userProfile.displayName, role || UserRole.USER, userProfile.tenantId, userProfile.jobTitle);
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

          // Get the latest user data from database
          const dbUser = await roleService.getUser(userProfile.id);
          if (!dbUser) {
            throw new Error('Failed to create or retrieve user from database');
          }

          // Create token using database user data
          const tokenUserProfile: UserProfile = {
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
            teamId: dbUser.teamId?.toString(),
            isComplianceSuperUser: !!dbUser.isComplianceSuperUser,
            isComplianceChampion: !!dbUser.isComplianceChampion,
            isRiskSuperUser: !!dbUser.isRiskSuperUser,
          };
          const appToken = await authService.createAppToken({ id: dbUser.MicrosoftId, email: dbUser.email, name: dbUser.name });
          console.log('App token created successfully');
          console.log(appToken, 'appToken');
          return res.json({
            token: appToken,
            user: tokenUserProfile
          });
        }
      } catch (error: any) {
        // Check if this is a consent required error
        if (error.consentRequired && error.tenantId) {
          // Generate and return a consent URL
          const consentUrl = await authService.getTeamsConsentUrl(
            error.tenantId,
            redirect_uri || `${req.protocol}://${req.get('host')}/api/auth/consent-callback`
          );

          return res.status(403).json({
            error: 'consent_required',
            consentUrl,
            message: 'Admin consent is required for this application',
            tenantId: error.tenantId
          });
        }

        console.error('Teams token verification failed with error:', error);
        return res.status(401).json({ error: 'Token verification failed' });
      }
    }

    // Handle standard login code
    if (code) {
      console.log('Processing standard login code...');
      const result = await authService.handleCallback(code, redirect_uri);

      return res.json(result);
    }

    console.error('No token or code provided in request');
    return res.status(400).json({ error: 'Either code or token is required' });
  } catch (error: any) {
    console.error('Authentication error:', error.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const profile = await authService.getProfile(token);
    return res.json(profile);
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    await authService.logout(token);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ message: 'Unauthorized' });
//     }
//     return res.json(req.user);
//   } catch (error) {
//     console.error('Error in /me endpoint:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });

// Add a token verification endpoint
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the token and get the user profile
    const userProfile = await authService.getProfile(token);

    if (!userProfile) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Return the user information for the client to update state
    return res.json({
      status: 'success',
      data: {
        user: userProfile,
        token: token // Return the same token since it's still valid
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Handle admin consent callback
router.get('/consent-callback', async (req, res) => {
  try {
    const { error, admin_consent, state } = req.query;

    if (error) {
      console.error('Consent error:', error);
      res.redirect('/auth/error?message=consent_failed');
      return;
    }

    if (!admin_consent) {
      res.redirect('/auth/error?message=consent_denied');
      return;
    }

    // Decode the state parameter
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { returnUrl } = stateData;

    // Redirect back to the app
    res.redirect(returnUrl);
  } catch (error) {
    console.error('Error handling consent callback:', error);
    res.redirect('/auth/error?message=unknown_error');
  }
});

export default router; 