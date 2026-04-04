import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing tasks (follow-ups, reminders, action items)
 */
export function useTasks(contactId, leadId, customerId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('tasks')
          .select('*')
          .order('due_date', { ascending: true });

        if (contactId) {
          query = query.eq('contact_id', contactId);
        } else if (leadId) {
          query = query.eq('lead_id', leadId);
        } else if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setTasks(data || []);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (contactId || leadId || customerId) {
      fetchTasks();
    }
  }, [contactId, leadId, customerId]);

  // Create task
  const create = useCallback(async (taskData) => {
    try {
      const { data, error: createError } = await supabase
        .from('tasks')
        .insert([
          {
            contact_id: contactId,
            lead_id: leadId,
            customer_id: customerId,
            ...taskData,
          },
        ])
        .select();

      if (createError) throw createError;

      // Update local state
      setTasks([...tasks, data[0]].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      }));
      return data[0];
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.message);
      throw err;
    }
  }, [contactId, leadId, customerId, tasks]);

  // Update task
  const update = useCallback(async (taskId, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select();

      if (updateError) throw updateError;

      // Update local state
      setTasks(tasks.map(t => t.id === taskId ? data[0] : t));
      return data[0];
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err.message);
      throw err;
    }
  }, [tasks]);

  // Complete task
  const complete = useCallback(async (taskId) => {
    return update(taskId, { status: 'completed', completed_at: new Date().toISOString() });
  }, [update]);

  // Delete task
  const remove = useCallback(async (taskId) => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) throw deleteError;

      // Update local state
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err.message);
      throw err;
    }
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    create,
    update,
    complete,
    remove,
  };
}
