import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';

/**
 * Hook for fetching emails from Gmail for a contact/lead/customer
 * This would integrate with Gmail API via a backend service.
 * For now, it reads from activity_logs with type='email'
 */
export function useGmail(contactEmail) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch email activity logs
  const fetchEmailsForContact = useCallback(async () => {
    if (!contactEmail) return;

    try {
      setLoading(true);
      setError(null);

      // For now, fetch email activities from activity_logs
      // In production, this would call a backend service that syncs with Gmail API
      const { data, error: fetchError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'email')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setEmails(data || []);
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contactEmail]);

  useEffect(() => {
    if (contactEmail) {
      fetchEmailsForContact();
    }
  }, [contactEmail, fetchEmailsForContact]);

  // Log an email interaction
  const logEmail = useCallback(async (contactId, emailData) => {
    try {
      const { data, error: logError } = await supabase
        .from('activity_logs')
        .insert([
          {
            contact_id: contactId,
            activity_type: 'email',
            subject: emailData.subject,
            description: emailData.body || emailData.description,
            email_thread_id: emailData.threadId,
            metadata: {
              from: emailData.from,
              to: emailData.to,
              cc: emailData.cc,
              gmail_id: emailData.id,
            },
          },
        ])
        .select();

      if (logError) throw logError;

      setEmails([data[0], ...emails]);
      return data[0];
    } catch (err) {
      console.error('Error logging email:', err);
      setError(err.message);
      throw err;
    }
  }, [emails]);

  return {
    emails,
    loading,
    error,
    logEmail,
    refetch: fetchEmailsForContact,
  };
}
