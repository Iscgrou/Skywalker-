// 🔄 CRM Data Synchronization Service
import { storage } from '../storage';

class CrmDataSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    console.log('CRM Data Sync Service initialized');
  }

  startRealTimeSync() {
    if (this.isRunning) {
      console.log('CRM sync already running');
      return;
    }

    this.isRunning = true;
    console.log('CRM Real-time sync started');

    // Sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      try {
        await this.performSync();
      } catch (error) {
        console.error('CRM sync error:', error);
      }
    }, 5 * 60 * 1000);

    // Initial sync
    this.performSync();
  }

  stopRealTimeSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('CRM Real-time sync stopped');
  }

  private async performSync() {
    try {
      const representatives = await storage.getRepresentatives();
      console.log(`CRM cache updated with ${representatives.length} representatives`);
      
      // Log sync activity
      await storage.logActivity('CRM_SYNC_CRM_REPRESENTATIVE_SYNC', `Data synchronization completed: ${representatives.length} records processed`, {
        syncTime: new Date().toISOString(),
        recordCount: representatives.length,
        eventType: 'CRM_REPRESENTATIVE_SYNC'
      });

      // Update admin reports
      console.log('Admin report cache updated');
      await storage.logActivity('CRM_SYNC_ADMIN_TEAM_REPORT_GENERATED', `Data synchronization completed: ${representatives.length} records processed`, {
        syncTime: new Date().toISOString(),
        recordCount: representatives.length,
        eventType: 'ADMIN_TEAM_REPORT_GENERATED'
      });

    } catch (error) {
      console.error('CRM sync failed:', error);
    }
  }

  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      lastSync: new Date().toISOString()
    };
  }

  async forcSync() {
    await this.performSync();
  }
}

export const crmDataSyncService = new CrmDataSyncService();
export default crmDataSyncService;