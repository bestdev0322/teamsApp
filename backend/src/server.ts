import { createServer } from 'http';
import app from './app';
import SocketService from './services/socketService';
import { schedulerService } from './services/schedulerService';
import { config } from './config';

// Create HTTP server
const httpServer = createServer(app);

// Initialize socket service
const socketService = new SocketService(httpServer);

// Initialize scheduler service
schedulerService.startComplianceReminderScheduler();

// Start server
httpServer.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});

export { socketService };