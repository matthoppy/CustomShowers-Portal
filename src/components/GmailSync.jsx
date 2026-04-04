import React, { useState, useEffect } from 'react';
import { Mail, Loader, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Button from './ui/Button';

const GmailSync = ({ contactId, contactEmail, onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState('');
  const [synced, setSynced] = useState(0);

  // Check if Gmail is connected on mount
  useEffect(() => {
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const response = await fetch('/api/gmail/status');
      const data = await response.json();
      setConnected(data.connected);
      if (data.last_sync) {
        setLastSync(new Date(data.last_sync));
      }
    } catch (err) {
      console.error('Error checking Gmail status:', err);
    }
  };

  const handleConnectGmail = () => {
    // Redirect to OAuth flow
    window.location.href = '/api/gmail/auth';
  };

  const handleSyncEmails = async () => {
    if (!contactId || !contactEmail) {
      setError('Missing contact information');
      return;
    }

    try {
      setSyncing(true);
      setError('');

      const response = await fetch(`/api/gmail/sync?contact_id=${contactId}&email=${contactEmail}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Sync failed');
        return;
      }

      setSynced(data.synced);
      setLastSync(new Date());
      onSyncComplete?.(data.activities);
    } catch (err) {
      console.error('Error syncing emails:', err);
      setError('Failed to sync emails: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (!connected) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Connect Gmail</h3>
            <p className="text-sm text-blue-800 mb-3">
              Connect your Gmail account to automatically sync emails with this contact.
            </p>
            <Button
              size="sm"
              onClick={handleConnectGmail}
              disabled={syncing}
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Authorize Gmail Access
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-900">Gmail Connected</p>
            {lastSync && (
              <p className="text-xs text-green-700">
                Last synced: {lastSync.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSyncEmails}
          disabled={syncing}
          icon={syncing ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
        >
          {syncing ? 'Syncing...' : 'Sync Emails'}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {synced > 0 && !syncing && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            ✅ Successfully synced {synced} email{synced !== 1 ? 's' : ''} from Gmail
          </p>
        </div>
      )}
    </div>
  );
};

export default GmailSync;
