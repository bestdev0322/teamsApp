import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { config } from '../config';
import { SocketEvent } from '../types/socket';
import { authService } from './authService';

class SocketService {
  private io: SocketServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // microsoftId -> Set of socketIds

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: [
          config.frontend,
          'https://app.teamscorecards.online'
        ],
        credentials: true
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {

      console.log('Client connected:', socket.id);

      // Handle user authentication
      socket.on('authenticate', async (token: string) => {
        console.log('Server received authenticate event. Token status:', token ? 'Received Token' : 'No Token');
        const dbUser = await authService.verifyToken(token);
        if (!dbUser) {
          console.error('Server: Authentication failed for socket', socket.id, ': Invalid token.');
          // Optionally emit an 'unauthorized' event back to the client before disconnecting
          socket.emit('unauthorized', { message: 'Invalid token' });
          socket.disconnect();
          return;
        }
        const microsoftId = dbUser.MicrosoftId;
        console.log('Server: User authenticated successfully:', microsoftId, 'for socket', socket.id);
        this.handleUserConnection(socket, microsoftId);

        // Optionally emit an 'authenticated' event back to the client
        socket.emit('authenticated');
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle performance agreement events
      socket.on(SocketEvent.PERFORMANCE_AGREEMENT_UPDATE, (data) => {
        this.handlePerformanceAgreement(socket, data);
      });

      // Handle assessment events
      socket.on(SocketEvent.PERFORMANCE_ASSESSMENT_UPDATE, (data) => {
        this.handleAssessment(socket, data);
      });

      // Handle assessment events
      socket.on(SocketEvent.APPROVE_PERFORMANCE_AGREEMENT, (data) => {
        this.handleAssessment(socket, data);
      });

      socket.on(SocketEvent.APPROVE_PERFORMANCE_ASSESSMENT, (data) => {
        this.handleAssessment(socket, data);
      });

      socket.on(SocketEvent.SEND_BACK_PERFORMANCE_AGREEMENT, (data) => {
        this.handleAssessment(socket, data);
      });

      socket.on(SocketEvent.SEND_BACK_PERFORMANCE_ASSESSMENT, (data) => {
        this.handleAssessment(socket, data);
      });

      // Handle risk treatment update events
      socket.on(SocketEvent.RISK_TREATMENT_UPDATED, async (data) => {
        try {
          const { teamId } = data.data;
          if (!teamId) {
            console.log('Server RISK_TREATMENT_UPDATED handler: teamId is missing, returning.');
            return;
          }
          // Dynamically import User model to avoid circular deps
          const User = require('../models/User').default;
          const superUsers = await User.find({ isRiskSuperUser: true });
          superUsers.forEach((superUser: any) => {
            console.log('Server forwarding SocketEvent.RISK_TREATMENT_UPDATED to super user:', superUser.MicrosoftId);
            this.emitToUser(superUser.MicrosoftId, SocketEvent.RISK_TREATMENT_UPDATED, {
              updatedBy: socket.data?.microsoftId,
              timestamp: new Date().toISOString()
            });
          });
        } catch (err) {
          console.error('Error handling RISK_TREATMENT_UPDATED socket event:', err);
        }
      });

      // Handle risk validation events
      socket.on(SocketEvent.RISK_VALIDATED, async (data) => {
        try {
          const { teamId } = data.data;
          if (!teamId) {
            console.log('Server RISK_VALIDATED handler: teamId is missing, returning.');
            return;
          }
          // Dynamically import User model to avoid circular deps
          const User = require('../models/User').default;
          const champions = await User.find({ isRiskChampion: true, teamId });
          champions.forEach((champion: any) => {
            console.log('Server forwarding SocketEvent.RISK_VALIDATED to champion:', champion.MicrosoftId);
            this.emitToUser(champion.MicrosoftId, SocketEvent.RISK_VALIDATED, {
              validatedBy: socket.data?.microsoftId,
              timestamp: new Date().toISOString()
            });
          });
        } catch (err) {
          console.error('Error handling RISK_VALIDATED socket event:', err);
        }
      });

      // Handle obligation submission events
      socket.on(SocketEvent.OBLIGATION_SUBMITTED, async (data) => {
        try {
          const { tenantId, year, quarter, submittedBy } = data.data;
          if (!tenantId) {
            console.log('Server OBLIGATION_SUBMITTED handler: tenantId is missing, returning.');
            return;
          }
          // Dynamically import User model to avoid circular deps
          const User = require('../models/User').default;
          const superUsers = await User.find({ tenantId, isComplianceSuperUser: true });
          superUsers.forEach((superUser: any) => {
            console.log('Server forwarding SocketEvent.OBLIGATION_SUBMITTED to super user:', superUser.MicrosoftId);
            this.emitToUser(superUser.MicrosoftId, SocketEvent.OBLIGATION_SUBMITTED, {
              year,
              quarter,
              submittedBy
            });
          });
        } catch (err) {
          console.error('Error handling OBLIGATION_SUBMITTED socket event:', err);
        }
      });
      
    });
  }

  private handleUserConnection(socket: Socket, microsoftId: string): void {
    // Add socket to user's room
    socket.join(`user:${microsoftId}`);
    socket.data = { microsoftId };

    // Track connected socket
    if (!this.connectedUsers.has(microsoftId)) {
      this.connectedUsers.set(microsoftId, new Set());
    }
    this.connectedUsers.get(microsoftId)?.add(socket.id);

    console.log(`User authenticated: ${microsoftId}, Socket: ${socket.id}`);
  }

  private handleDisconnect(socket: Socket): void {
    const microsoftId = socket.data?.microsoftId;
    if (microsoftId) {
      this.connectedUsers.get(microsoftId)?.delete(socket.id);
      if (this.connectedUsers.get(microsoftId)?.size === 0) {
        this.connectedUsers.delete(microsoftId);
      }
      console.log(`User disconnected: ${microsoftId}, Socket: ${socket.id}`);
    }
  }

  private handlePerformanceAgreement(socket: Socket, data: any): void {
    const { recipientId, status } = data;
    if (recipientId) {
      this.emitToUser(recipientId, SocketEvent.PERFORMANCE_AGREEMENT_UPDATE, {
        senderId: socket.data?.microsoftId,
        status,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleAssessment(socket: Socket, data: any): void {
    const { recipientId, status } = data;
    if (recipientId) {
      this.emitToUser(recipientId, SocketEvent.PERFORMANCE_ASSESSMENT_UPDATE, {
        senderId: socket.data?.microsoftId,
        status,
        timestamp: new Date().toISOString()
      });
    }
  }

  public emitToUser(microsoftId: string, event: string, data: any): void {
    this.io.to(`user:${microsoftId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public isUserConnected(microsoftId: string): boolean {
    return this.connectedUsers.has(microsoftId);
  }
}

export default SocketService; 
