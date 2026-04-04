import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing activity logs (emails, calls, meetings, notes)
 */
export function useActivityLog(contactId, leadId, customerId) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (contactId) {
          query = query.eq('contact_id', contactId);
        } else if (leadId) {
          query = query.eq('lead_id', leadId);
        } else if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setActivities(data || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (contactId || leadId || customerId) {
      fetchActivities();
    }
  }, [contactId, leadId, customerId]);

  // Create activity
  const create = useCallback(async (activityData) => {
    try {
      const { data, error: createError } = await supabase
        .from('activity_logs')
        .insert([
          {
            contact_id: contactId,
            lead_id: leadId,
            customer_id: customerId,
            ...activityData,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (createError) throw createError;

      // Update local state
      setActivities([data[0], ...activities]);
      return data[0];
    } catch (err) {
      console.error('Error creating activity:', err);
      setError(err.message);
      throw err;
    }
  }, [contactId, leadId, customerId, activities]);

  return {
    activities,
    loading,
    error,
    create,
  };
}
