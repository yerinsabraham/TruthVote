// src/components/admin/content/GeneralSettings.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { 
  Save,
  RefreshCw,
  Globe,
  Bell,
  Shield,
  Database,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react';
import { logAdminAction } from '@/lib/firebase/adminActions';
import { useAuth } from '@/context/AuthContext';

interface PlatformSettings {
  // General
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  
  // Predictions
  allowNewPredictions: boolean;
  requireApproval: boolean;
  minVotesForResolution: number;
  autoResolveAfterDays: number;
  
  // Users
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  defaultUserRole: string;
  
  // Notifications
  sendEmailNotifications: boolean;
  sendPushNotifications: boolean;
  
  // RSS & News
  enableRssFeed: boolean;
  rssFetchIntervalHours: number;
  maxTrendingTopics: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  siteName: 'TruthVote',
  siteDescription: 'A prediction voting platform',
  maintenanceMode: false,
  allowNewPredictions: true,
  requireApproval: false,
  minVotesForResolution: 10,
  autoResolveAfterDays: 30,
  allowNewRegistrations: true,
  requireEmailVerification: false,
  defaultUserRole: 'user',
  sendEmailNotifications: true,
  sendPushNotifications: false,
  enableRssFeed: true,
  rssFetchIntervalHours: 1,
  maxTrendingTopics: 10,
};

export default function GeneralSettings() {
  const { user: adminUser } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'settings', 'platform');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const loadedSettings = { ...DEFAULT_SETTINGS, ...docSnap.data() } as PlatformSettings;
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
  }, [settings, originalSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await setDoc(doc(db, 'settings', 'platform'), {
        ...settings,
        updatedAt: new Date(),
        updatedBy: adminUser?.uid
      });
      
      if (adminUser) {
        await logAdminAction({
          type: 'settings_changed',
          description: 'Updated platform settings',
          adminId: adminUser.uid
        });
      }
      
      setOriginalSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const ToggleSwitch = ({ enabled, onChange, label, description }: { 
    enabled: boolean; 
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-[var(--admin-text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--admin-text-tertiary)] mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-[var(--admin-primary)]' : 'bg-[var(--admin-bg-tertiary)]'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">General Settings</h1>
            <p className="admin-content-subtitle">Configure platform settings</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={24} />
            <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">General Settings</h1>
          <p className="admin-content-subtitle">Configure platform behavior</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`admin-btn ${hasChanges ? 'admin-btn-primary' : 'admin-btn-secondary opacity-50 cursor-not-allowed'}`}
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">You have unsaved changes</p>
        </div>
      )}

      {/* Site Settings */}
      <div className="admin-card">
        <div className="admin-card-header">
          <Globe size={16} className="text-[var(--admin-text-secondary)]" />
          <h3 className="font-medium text-[var(--admin-text-primary)]">Site Settings</h3>
        </div>
        <div className="admin-card-body space-y-4">
          <div>
            <label className="block text-sm text-[var(--admin-text-secondary)] mb-1">Site Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => updateSetting('siteName', e.target.value)}
              className="admin-input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--admin-text-secondary)] mb-1">Site Description</label>
            <textarea
              value={settings.siteDescription}
              onChange={(e) => updateSetting('siteDescription', e.target.value)}
              rows={2}
              className="admin-input w-full resize-none"
            />
          </div>
          <div className="border-t border-[var(--admin-border)] pt-4">
            <ToggleSwitch
              enabled={settings.maintenanceMode}
              onChange={(value) => updateSetting('maintenanceMode', value)}
              label="Maintenance Mode"
              description="When enabled, only admins can access the site"
            />
          </div>
        </div>
      </div>

      {/* Prediction Settings */}
      <div className="admin-card">
        <div className="admin-card-header">
          <Database size={16} className="text-[var(--admin-text-secondary)]" />
          <h3 className="font-medium text-[var(--admin-text-primary)]">Prediction Settings</h3>
        </div>
        <div className="admin-card-body">
          <ToggleSwitch
            enabled={settings.allowNewPredictions}
            onChange={(value) => updateSetting('allowNewPredictions', value)}
            label="Allow New Predictions"
            description="Users can create new predictions"
          />
          <div className="border-t border-[var(--admin-border)]" />
          <ToggleSwitch
            enabled={settings.requireApproval}
            onChange={(value) => updateSetting('requireApproval', value)}
            label="Require Admin Approval"
            description="New predictions must be approved by admin"
          />
          <div className="border-t border-[var(--admin-border)] pt-4" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--admin-text-secondary)] mb-1">
                Min Votes for Resolution
              </label>
              <input
                type="number"
                min={1}
                value={settings.minVotesForResolution}
                onChange={(e) => updateSetting('minVotesForResolution', Number(e.target.value))}
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--admin-text-secondary)] mb-1">
                Auto-Resolve After (Days)
              </label>
              <input
                type="number"
                min={1}
                value={settings.autoResolveAfterDays}
                onChange={(e) => updateSetting('autoResolveAfterDays', Number(e.target.value))}
                className="admin-input w-full"
              />
              <p className="text-xs text-[var(--admin-text-tertiary)] mt-1">
                Set to 0 to disable auto-resolution
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Settings */}
      <div className="admin-card">
        <div className="admin-card-header">
          <Shield size={16} className="text-[var(--admin-text-secondary)]" />
          <h3 className="font-medium text-[var(--admin-text-primary)]">User Settings</h3>
        </div>
        <div className="admin-card-body">
          <ToggleSwitch
            enabled={settings.allowNewRegistrations}
            onChange={(value) => updateSetting('allowNewRegistrations', value)}
            label="Allow New Registrations"
            description="New users can sign up for accounts"
          />
          <div className="border-t border-[var(--admin-border)]" />
          <ToggleSwitch
            enabled={settings.requireEmailVerification}
            onChange={(value) => updateSetting('requireEmailVerification', value)}
            label="Require Email Verification"
            description="Users must verify email before voting"
          />
        </div>
      </div>

      {/* Notification Settings */}
      <div className="admin-card">
        <div className="admin-card-header">
          <Bell size={16} className="text-[var(--admin-text-secondary)]" />
          <h3 className="font-medium text-[var(--admin-text-primary)]">Notifications</h3>
        </div>
        <div className="admin-card-body">
          <ToggleSwitch
            enabled={settings.sendEmailNotifications}
            onChange={(value) => updateSetting('sendEmailNotifications', value)}
            label="Email Notifications"
            description="Send email notifications to users"
          />
          <div className="border-t border-[var(--admin-border)]" />
          <ToggleSwitch
            enabled={settings.sendPushNotifications}
            onChange={(value) => updateSetting('sendPushNotifications', value)}
            label="Push Notifications"
            description="Send browser push notifications"
          />
        </div>
      </div>

      {/* RSS & News Settings */}
      <div className="admin-card">
        <div className="admin-card-header">
          <Clock size={16} className="text-[var(--admin-text-secondary)]" />
          <h3 className="font-medium text-[var(--admin-text-primary)]">RSS & News Feed</h3>
        </div>
        <div className="admin-card-body">
          <ToggleSwitch
            enabled={settings.enableRssFeed}
            onChange={(value) => updateSetting('enableRssFeed', value)}
            label="Enable RSS Feed"
            description="Fetch trending topics from news sources"
          />
          <div className="border-t border-[var(--admin-border)] pt-4" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--admin-text-secondary)] mb-1">
                Fetch Interval (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={settings.rssFetchIntervalHours}
                onChange={(e) => updateSetting('rssFetchIntervalHours', Number(e.target.value))}
                className="admin-input w-full"
                disabled={!settings.enableRssFeed}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--admin-text-secondary)] mb-1">
                Max Trending Topics
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={settings.maxTrendingTopics}
                onChange={(e) => updateSetting('maxTrendingTopics', Number(e.target.value))}
                className="admin-input w-full"
                disabled={!settings.enableRssFeed}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Settings are saved to Firestore</p>
          <p className="mt-1 text-blue-700">
            Changes will take effect immediately after saving. Some settings may require users to refresh their browsers.
          </p>
        </div>
      </div>
    </div>
  );
}
