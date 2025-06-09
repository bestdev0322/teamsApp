import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });


export const config = {
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET as string,
  mongoUri: process.env.MONGODB_URI as string,
  azure: {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI as string,
    allowedGroupIds: (process.env.ALLOWED_GROUP_IDS || '').split(',').filter(Boolean)
  },
  frontend: process.env.FRONTEND_URL as string,
  api_url: process.env.API_URL as string,
  app_owner_email: process.env.APP_OWNER_EMAIL
}; 

console.log(config, 'config')